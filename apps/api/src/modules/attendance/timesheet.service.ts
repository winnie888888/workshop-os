import { Injectable } from '@nestjs/common';
import { getContext, Attendance, TravelConsistency } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AiGatewayService } from '../../ai/ai-gateway.service';
import { AttendanceRepository } from './attendance.repository';

/**
 * Timesheets, accountant exports, and the AI consistency check.
 *
 * The monthly timesheet rolls up a month of attendance days and approved leave
 * through the TESTED shared core (Attendance.rollUpMonth). The accountant export
 * renders that roll-up (and the travel orders) as CSV — a real, dependency-free
 * export an accountant can open in Excel or import to Minimax. The consistency
 * check reconciles the ATTENDANCE ledger against the WORK ledgers (work orders,
 * field service, travel) using the shared TravelConsistency.checkConsistency,
 * which COMPUTES a gap and a severity but NEVER edits a record. The AI gateway is
 * asked only to phrase a human-readable narrative around those computed numbers;
 * per both specs, AI may flag but must never modify official records.
 */
@Injectable()
export class TimesheetService {
  constructor(
    private readonly pg: PgService,
    private readonly repo: AttendanceRepository,
    private readonly ai: AiGatewayService,
  ) {}

  /** Build the monthly timesheet for a user (yyyy-mm). */
  async monthly(userId: string, month: string): Promise<any> {
    const ctx = getContext();
    const { from, to } = monthBounds(month);
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const days = await this.repo.daysInRange(tx, userId, from, to);
      const leave = await this.repo.leaveInRange(tx, userId, from, to);

      // Build per-day timesheet inputs: worked seconds (computed by shared core)
      // and any approved leave overlapping that day.
      const dayInputs: any[] = [];
      for (const d of days) {
        const breaks = await this.repo.breaksForDay(tx, d.id);
        const computed = Attendance.computeAttendanceDay({
          clockInSec: toSec(d.clock_in_at),
          clockOutSec: d.clock_out_at ? toSec(d.clock_out_at) : null,
          breaks: breaks.map((b) => ({ startSec: toSec(b.start_at), endSec: b.end_at ? toSec(b.end_at) : null })),
        });
        dayInputs.push({ date: d.work_date, netWorkedSeconds: computed.netWorkedSeconds });
      }
      // Expand approved leave into per-day entries.
      for (const l of leave) {
        for (const date of eachDate(l.start_date, l.end_date, from, to)) {
          dayInputs.push({ date, netWorkedSeconds: 0, leaveType: l.leave_type, leaveHours: Number(l.hours_per_day) });
        }
      }

      const summary = Attendance.rollUpMonth(dayInputs);
      return {
        userId, month,
        workedHours: Attendance.secondsToHours(summary.workedSeconds),
        regularHours: Attendance.secondsToHours(summary.regularSeconds),
        overtimeHours: Attendance.secondsToHours(summary.overtimeSeconds),
        leaveHoursByType: Object.fromEntries(Object.entries(summary.leaveByType).map(([k, v]) => [k, Attendance.secondsToHours(v as number)])),
        totalLeaveHours: Attendance.secondsToHours(summary.totalLeaveSeconds),
        paidHours: Attendance.secondsToHours(summary.paidSeconds),
        daysWorked: summary.daysWorked, daysOnLeave: summary.daysOnLeave,
      };
    });
  }

  /** Accountant export (CSV). Monthly summary line plus per-travel-order lines. */
  async exportCsv(userId: string, month: string): Promise<string> {
    const ts = await this.monthly(userId, month);
    const ctx = getContext();
    const { from, to } = monthBounds(month);
    const travel = await this.pg.withTenant(ctx.tenantId, (tx) => this.repo.travelOrdersInRange(tx, userId, from, to));

    const rows: string[][] = [];
    rows.push(['Section', 'Field', 'Value']);
    rows.push(['Timesheet', 'Employee', userId]);
    rows.push(['Timesheet', 'Month', month]);
    rows.push(['Timesheet', 'Worked hours', String(ts.workedHours)]);
    rows.push(['Timesheet', 'Regular hours', String(ts.regularHours)]);
    rows.push(['Timesheet', 'Overtime hours', String(ts.overtimeHours)]);
    rows.push(['Timesheet', 'Total leave hours', String(ts.totalLeaveHours)]);
    rows.push(['Timesheet', 'Paid hours', String(ts.paidHours)]);
    rows.push(['Timesheet', 'Days worked', String(ts.daysWorked)]);
    rows.push(['Timesheet', 'Days on leave', String(ts.daysOnLeave)]);
    for (const [type, hours] of Object.entries(ts.leaveHoursByType)) {
      rows.push(['Leave', type, String(hours)]);
    }
    // Travel orders (for mileage reimbursement + accounting).
    rows.push(['Travel', 'Number', 'Purpose|Km|Reimbursement(EUR)']);
    for (const t of travel) {
      const reimb = (Math.round(Number(t.km) * t.per_km_rate_minor) + (t.expenses_minor ?? 0)) / 100;
      rows.push(['Travel', t.number ?? t.id, `${t.purpose}|${Number(t.km)}|${reimb.toFixed(2)}`]);
    }
    return toCsv(rows);
  }

  /**
   * The AI consistency check for a user/period. The reconciliation itself is
   * DETERMINISTIC (shared core); the AI gateway is consulted only to phrase a
   * narrative, and even that is best-effort — if it is unavailable, the computed
   * result still stands. Nothing here writes to any official record.
   */
  async consistency(userId: string, from: string, to: string): Promise<any> {
    const ctx = getContext();
    const computed = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      // Attendance net worked seconds across the range.
      const days = await this.repo.daysInRange(tx, userId, from, to);
      let attendanceSeconds = 0;
      for (const d of days) {
        const breaks = await this.repo.breaksForDay(tx, d.id);
        const c = Attendance.computeAttendanceDay({
          clockInSec: toSec(d.clock_in_at),
          clockOutSec: d.clock_out_at ? toSec(d.clock_out_at) : null,
          breaks: breaks.map((b) => ({ startSec: toSec(b.start_at), endSec: b.end_at ? toSec(b.end_at) : null })),
        });
        attendanceSeconds += c.netWorkedSeconds;
      }
      const workOrderSeconds = await this.repo.workOrderSecondsInRange(tx, userId, from, to);
      const fieldService = await this.repo.fieldServiceInRange(tx, userId, from, to);
      const fieldServiceSeconds = fieldService.reduce((s, f) => s + f.work_seconds + f.travel_seconds + f.waiting_seconds, 0);
      const travelOrders = await this.repo.travelOrdersInRange(tx, userId, from, to);
      const travelSeconds = travelOrders.reduce((s, t) => s + t.travel_seconds + t.work_seconds + t.waiting_seconds, 0);

      return TravelConsistency.checkConsistency({
        attendanceSeconds, workOrderSeconds, fieldServiceSeconds, travelSeconds,
      });
    });

    // Best-effort AI narrative around the COMPUTED numbers. Flag-only by design.
    let narrative = computed.summary;
    try {
      const res = await this.ai.run<unknown>({
        tenantId: ctx.tenantId, userId: ctx.userId, feature: 'attendance_consistency',
        prompt: `Rephrase this attendance reconciliation for a manager in one neutral sentence, `
          + `without proposing any change to records: ${computed.summary}`,
        containsPii: false,
      });
      if (typeof (res.output as any)?.narrative === 'string') narrative = (res.output as any).narrative;
      else if (typeof res.output === 'string' && res.output.trim()) narrative = res.output.trim();
    } catch { /* AI optional — the computed result stands on its own */ }

    return {
      userId, from, to,
      accountedHours: Attendance.secondsToHours(computed.accountedSeconds),
      unaccountedHours: Attendance.secondsToHours(computed.unaccountedSeconds),
      overbookedHours: Attendance.secondsToHours(computed.overbookedSeconds),
      severity: computed.severity,
      summary: computed.summary,
      narrative,
      // Explicit reminder in the payload that this is advisory only.
      advisoryOnly: true,
    };
  }
}

// ---- helpers ----

function toSec(iso: string): number { return Math.floor(new Date(iso).getTime() / 1000); }

function monthBounds(month: string): { from: string; to: string } {
  // month = 'yyyy-mm'
  const [y, m] = month.split('-').map(Number);
  const from = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function eachDate(start: string, end: string, clampFrom: string, clampTo: string): string[] {
  const out: string[] = [];
  let d = new Date(start < clampFrom ? clampFrom : start);
  const last = new Date(end > clampTo ? clampTo : end);
  while (d <= last) {
    out.push(d.toISOString().slice(0, 10));
    d = new Date(d.getTime() + 24 * 3600 * 1000);
  }
  return out;
}

function toCsv(rows: string[][]): string {
  const esc = (s: string) => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  return rows.map((r) => r.map(esc).join(',')).join('\n') + '\n';
}
