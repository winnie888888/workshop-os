import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { getContext, newId } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';

/**
 * Appointments — the advisor's calendar. A booking is WALL-CLOCK shop time
 * ("Friday 08:00 in the workshop"), so start/end are stored as `timestamp`
 * without time zone and read back with to_char: the string the advisor saved
 * is byte-for-byte the string every screen shows, on any server or device
 * timezone. The calendar is the front door of the operational chain
 * (appointment → work order), so customer/vehicle/work-order links are
 * first-class columns, not free text.
 */

export type AppointmentStatus = 'scheduled' | 'done' | 'cancelled';
const STATUSES: AppointmentStatus[] = ['scheduled', 'done', 'cancelled'];
// Accept 'YYYY-MM-DDTHH:MM' or with ':SS' — exactly what the calendar sends.
const LOCAL_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

export interface AppointmentView {
  id: string;
  customerId?: string;
  vehicleId?: string;
  workOrderId?: string;
  title: string;
  start: string;
  end?: string;
  durationMin?: number;
  note?: string;
  status: AppointmentStatus;
  createdAt: string;
}

const SELECT = `SELECT id, customer_id, asset_id, work_order_id, title,
                       to_char(start_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS start_str,
                       to_char(end_at,   'YYYY-MM-DD"T"HH24:MI:SS') AS end_str,
                       duration_min, note, status, created_at
                  FROM app.appointments`;

const tsIso = (v: any): string => (v instanceof Date ? v.toISOString() : String(v));

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly pg: PgService,
    private readonly audit: AuditService,
  ) {}

  private map(r: any): AppointmentView {
    return {
      id: r.id,
      customerId: r.customer_id ?? undefined,
      vehicleId: r.asset_id ?? undefined,
      workOrderId: r.work_order_id ?? undefined,
      title: r.title,
      start: r.start_str,
      end: r.end_str ?? undefined,
      durationMin: r.duration_min ?? undefined,
      note: r.note ?? undefined,
      status: r.status,
      createdAt: tsIso(r.created_at),
    };
  }

  private assertLocalTs(value: string, field: string): void {
    if (!LOCAL_TS.test(value)) {
      throw new BadRequestException(`${field} must be a local timestamp like 2026-06-12T08:00`);
    }
  }

  async list(customerId?: string): Promise<AppointmentView[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const res = customerId
        ? await tx.query<any>(`${SELECT} WHERE customer_id = $1 ORDER BY start_at ASC LIMIT 1000`, [customerId])
        : await tx.query<any>(`${SELECT} ORDER BY start_at ASC LIMIT 1000`);
      return res.rows.map((r: any) => this.map(r));
    });
  }

  async get(id: string): Promise<AppointmentView> {
    const ctx = getContext();
    const row = await this.pg.withTenant(ctx.tenantId, async (tx) =>
      (await tx.query<any>(`${SELECT} WHERE id = $1`, [id])).rows[0]);
    if (!row) throw new NotFoundException('Appointment not found');
    return this.map(row);
  }

  async create(dto: {
    title: string; start: string; end?: string; durationMin?: number;
    customerId?: string; vehicleId?: string; workOrderId?: string;
    note?: string; status?: string;
  }): Promise<AppointmentView> {
    const ctx = getContext();
    this.assertLocalTs(dto.start, 'start');
    if (dto.end !== undefined) this.assertLocalTs(dto.end, 'end');
    const status = dto.status ?? 'scheduled';
    if (!STATUSES.includes(status as AppointmentStatus)) {
      throw new BadRequestException(`status must be one of ${STATUSES.join(', ')}`);
    }
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const id = newId();
      const row = (await tx.query<any>(
        `INSERT INTO app.appointments
           (id, tenant_id, customer_id, asset_id, work_order_id, title, start_at, end_at, duration_min, note, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7::timestamp,$8::timestamp,$9,$10,$11,$12)
         RETURNING id`,
        [id, ctx.tenantId, dto.customerId ?? null, dto.vehicleId ?? null, dto.workOrderId ?? null,
         dto.title, dto.start, dto.end ?? null, dto.durationMin ?? null, dto.note ?? null, status, ctx.userId],
      )).rows[0];

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'appointment.created',
        entityType: 'appointment', entityId: row.id, before: null,
        after: { title: dto.title, start: dto.start, customerId: dto.customerId ?? null },
      });
      const full = (await tx.query<any>(`${SELECT} WHERE id = $1`, [row.id])).rows[0];
      return this.map(full);
    });
  }

  async update(id: string, dto: {
    title?: string; start?: string; end?: string | null; durationMin?: number | null;
    customerId?: string | null; vehicleId?: string | null; workOrderId?: string | null;
    note?: string | null; status?: string;
  }): Promise<AppointmentView> {
    const ctx = getContext();
    if (dto.start !== undefined) this.assertLocalTs(String(dto.start), 'start');
    if (dto.end != null) this.assertLocalTs(String(dto.end), 'end');
    if (dto.status !== undefined && !STATUSES.includes(dto.status as AppointmentStatus)) {
      throw new BadRequestException(`status must be one of ${STATUSES.join(', ')}`);
    }
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const before = (await tx.query<any>(`${SELECT} WHERE id = $1 FOR UPDATE`, [id])).rows[0];
      if (!before) throw new NotFoundException('Appointment not found');

      const sets: string[] = [];
      const vals: any[] = [];
      const add = (frag: string, val: any) => { vals.push(val); sets.push(frag.replace('?', `$${vals.length}`)); };
      if (dto.title !== undefined) add('title = ?', dto.title);
      if (dto.start !== undefined) add('start_at = ?::timestamp', dto.start);
      if (dto.end !== undefined) add('end_at = ?::timestamp', dto.end || null);
      if (dto.durationMin !== undefined) add('duration_min = ?', dto.durationMin ?? null);
      if (dto.customerId !== undefined) add('customer_id = ?', dto.customerId || null);
      if (dto.vehicleId !== undefined) add('asset_id = ?', dto.vehicleId || null);
      if (dto.workOrderId !== undefined) add('work_order_id = ?', dto.workOrderId || null);
      if (dto.note !== undefined) add('note = ?', dto.note ?? null);
      if (dto.status !== undefined) add('status = ?', dto.status);
      if (sets.length === 0) return this.map(before);

      vals.push(id);
      await tx.query(`UPDATE app.appointments SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'appointment.updated',
        entityType: 'appointment', entityId: id,
        before: { title: before.title, start: before.start_str, status: before.status },
        after: { title: dto.title ?? before.title, start: dto.start ?? before.start_str, status: dto.status ?? before.status },
      });
      const full = (await tx.query<any>(`${SELECT} WHERE id = $1`, [id])).rows[0];
      return this.map(full);
    });
  }

  async remove(id: string): Promise<{ ok: true }> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const before = (await tx.query<any>(`${SELECT} WHERE id = $1`, [id])).rows[0];
      if (!before) throw new NotFoundException('Appointment not found');
      await tx.query(`DELETE FROM app.appointments WHERE id = $1`, [id]);
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'appointment.deleted',
        entityType: 'appointment', entityId: id,
        before: { title: before.title, start: before.start_str, status: before.status },
        after: null,
      });
      return { ok: true as const };
    });
  }
}
