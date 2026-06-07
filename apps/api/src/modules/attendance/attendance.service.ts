import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { newId, getContext, Attendance } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { AttendanceRepository } from './attendance.repository';

/**
 * Attendance & leave service — the spine of the module. It records the raw clock
 * and break events and derives every figure through the TESTED shared core
 * (Attendance.computeAttendanceDay), so a timesheet is reproducible and a
 * correction is transparent. Clocking is self-service (any member clocks
 * themselves); corrections and leave decisions are gated by permissions on the
 * controller. Every state change is appended to the hash-chain audit, which is
 * the ZEPDSV "audit log for corrections" the compliance spec requires.
 *
 * Crucially, this never touches work-order time — it is a separate ledger.
 */
@Injectable()
export class AttendanceService {
  constructor(
    private readonly pg: PgService,
    private readonly repo: AttendanceRepository,
    private readonly audit: AuditService,
  ) {}

  private now(): string { return new Date().toISOString(); }
  private today(): string { return new Date().toISOString().slice(0, 10); }

  /** Clock in. Refuses a second open day; one presence period at a time. */
  async clockIn(): Promise<any> {
    const ctx = getContext();
    const userId = this.requireUser(ctx.userId);
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const open = await this.repo.findOpenDay(tx, userId);
      if (open) throw new BadRequestException('Already clocked in — clock out first');
      const id = newId();
      const at = this.now();
      await this.repo.insertDay(tx, { id, tenantId: ctx.tenantId, userId, workDate: this.today(), clockInAt: at });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: userId, action: 'attendance.clock_in',
        entityType: 'attendance_day', entityId: id, before: null, after: { clockInAt: at },
      });
      return this.dayView(tx, id);
    });
  }

  /** Clock out the currently open day (auto-ends any open break). */
  async clockOut(): Promise<any> {
    const ctx = getContext();
    const userId = this.requireUser(ctx.userId);
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const open = await this.repo.findOpenDay(tx, userId);
      if (!open) throw new BadRequestException('Not clocked in');
      const at = this.now();
      const openBreak = await this.repo.openBreak(tx, open.id);
      if (openBreak) await this.repo.endBreak(tx, openBreak.id, at);
      await this.repo.setClockOut(tx, open.id, at);
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: userId, action: 'attendance.clock_out',
        entityType: 'attendance_day', entityId: open.id, before: { clockOutAt: null }, after: { clockOutAt: at },
      });
      return this.dayView(tx, open.id);
    });
  }

  /** Start a break on the open day. */
  async startBreak(): Promise<any> {
    const ctx = getContext();
    const userId = this.requireUser(ctx.userId);
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const open = await this.repo.findOpenDay(tx, userId);
      if (!open) throw new BadRequestException('Clock in before taking a break');
      if (await this.repo.openBreak(tx, open.id)) throw new BadRequestException('A break is already running');
      const id = newId();
      await this.repo.insertBreak(tx, { id, tenantId: ctx.tenantId, dayId: open.id, startAt: this.now() });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: userId, action: 'attendance.break_start',
        entityType: 'attendance_day', entityId: open.id, before: null, after: { breakId: id },
      });
      return this.dayView(tx, open.id);
    });
  }

  /** End the running break. */
  async endBreak(): Promise<any> {
    const ctx = getContext();
    const userId = this.requireUser(ctx.userId);
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const open = await this.repo.findOpenDay(tx, userId);
      if (!open) throw new BadRequestException('Not clocked in');
      const br = await this.repo.openBreak(tx, open.id);
      if (!br) throw new BadRequestException('No break is running');
      await this.repo.endBreak(tx, br.id, this.now());
      return this.dayView(tx, open.id);
    });
  }

  /** The caller's current open day (or null), for the mobile clock screen. */
  async currentDay(): Promise<any | null> {
    const ctx = getContext();
    const userId = this.requireUser(ctx.userId);
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const open = await this.repo.findOpenDay(tx, userId);
      return open ? this.dayView(tx, open.id) : null;
    });
  }

  /**
   * Audited manual correction of a day's clock times (ZEPDSV requires that
   * corrections to official records are logged). Gated by AttendanceManage on
   * the controller. The before/after both go into the hash-chain audit.
   */
  async correctDay(dayId: string, input: { clockInAt: string | null; clockOutAt: string | null; note: string }): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const day = await this.repo.findDay(tx, dayId);
      if (!day) throw new NotFoundException('Attendance day not found');
      const before = { clockInAt: day.clock_in_at, clockOutAt: day.clock_out_at };
      await this.repo.correctDay(tx, dayId, {
        clockInAt: input.clockInAt, clockOutAt: input.clockOutAt, correctedBy: ctx.userId, note: input.note,
      });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'attendance.corrected',
        entityType: 'attendance_day', entityId: dayId,
        before, after: { clockInAt: input.clockInAt, clockOutAt: input.clockOutAt, note: input.note },
      });
      return this.dayView(tx, dayId);
    });
  }

  // ---- leave ----

  async requestLeave(input: { leaveType: string; startDate: string; endDate: string; hoursPerDay?: number; reason?: string }): Promise<any> {
    const ctx = getContext();
    const userId = this.requireUser(ctx.userId);
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const id = newId();
      await this.repo.insertLeave(tx, { id, tenantId: ctx.tenantId, userId, ...input });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: userId, action: 'leave.requested',
        entityType: 'leave_request', entityId: id, before: null,
        after: { leaveType: input.leaveType, startDate: input.startDate, endDate: input.endDate },
      });
      const l = await this.repo.findLeave(tx, id);
      return this.leaveView(l);
    });
  }

  async decideLeave(id: string, decision: 'approved' | 'rejected', note?: string): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const l = await this.repo.findLeave(tx, id);
      if (!l) throw new NotFoundException('Leave request not found');
      if (l.status !== 'pending') throw new BadRequestException(`Leave is already ${l.status}`);
      await this.repo.decideLeave(tx, id, { status: decision, decidedBy: ctx.userId, note: note ?? null });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: `leave.${decision}`,
        entityType: 'leave_request', entityId: id, before: { status: 'pending' }, after: { status: decision },
      });
      return this.leaveView(await this.repo.findLeave(tx, id));
    });
  }

  async myLeave(status?: string): Promise<any[]> {
    const ctx = getContext();
    const userId = this.requireUser(ctx.userId);
    return this.pg.withTenant(ctx.tenantId, async (tx) =>
      (await this.repo.leaveForUser(tx, userId, { status })).map((l) => this.leaveView(l)));
  }

  async pendingLeave(): Promise<any[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) =>
      (await this.repo.pendingLeave(tx)).map((l) => this.leaveView(l)));
  }

  // ---- views ----

  /** Build the computed view of a day via the shared core. */
  private async dayView(tx: any, dayId: string): Promise<any> {
    const day = await this.repo.findDay(tx, dayId);
    const breaks = await this.repo.breaksForDay(tx, dayId);
    const computed = Attendance.computeAttendanceDay({
      clockInSec: toSec(day.clock_in_at),
      clockOutSec: day.clock_out_at ? toSec(day.clock_out_at) : null,
      breaks: breaks.map((b) => ({ startSec: toSec(b.start_at), endSec: b.end_at ? toSec(b.end_at) : null })),
    });
    return {
      id: day.id, userId: day.user_id, workDate: day.work_date,
      clockInAt: day.clock_in_at, clockOutAt: day.clock_out_at,
      breaks: breaks.map((b) => ({ id: b.id, startAt: b.start_at, endAt: b.end_at })),
      grossSeconds: computed.grossSeconds, breakSeconds: computed.breakSeconds,
      netWorkedSeconds: computed.netWorkedSeconds, open: computed.open, flags: computed.flags,
      corrected: !!day.corrected_at,
    };
  }

  private leaveView(l: any): any {
    return {
      id: l.id, userId: l.user_id, leaveType: l.leave_type, startDate: l.start_date, endDate: l.end_date,
      hoursPerDay: Number(l.hours_per_day), status: l.status, reason: l.reason,
      decidedBy: l.decided_by, decidedAt: l.decided_at, decisionNote: l.decision_note,
    };
  }

  private requireUser(userId: string | null): string {
    if (!userId) throw new BadRequestException('No employee identity on this request');
    return userId;
  }
}

/** ISO timestamp -> epoch seconds (the unit the shared core works in). */
function toSec(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}
