import { Injectable } from '@nestjs/common';
import { PgService, type TxClient } from '../../common/db/pg.service';

/**
 * Data access for the attendance module's six tables. Thin and tenant-scoped:
 * every query runs inside a withTenant transaction supplied by the caller, so
 * row-level security is always in force. No business logic lives here — the
 * shared core computes durations/flags and the services orchestrate.
 */
@Injectable()
export class AttendanceRepository {
  constructor(pg: PgService) {}

  // ---- attendance days + breaks ----

  async findOpenDay(tx: TxClient, userId: string): Promise<any | null> {
    const r = await tx.query<any>(
      `SELECT * FROM app.attendance_days
        WHERE user_id = $1 AND clock_out_at IS NULL
        ORDER BY clock_in_at DESC LIMIT 1`, [userId]);
    return r.rows[0] ?? null;
  }

  async findDay(tx: TxClient, id: string): Promise<any | null> {
    const r = await tx.query<any>(`SELECT * FROM app.attendance_days WHERE id = $1`, [id]);
    return r.rows[0] ?? null;
  }

  async insertDay(tx: TxClient, d: { id: string; tenantId: string; userId: string; workDate: string; clockInAt: string }): Promise<void> {
    await tx.query(
      `INSERT INTO app.attendance_days (id, tenant_id, user_id, work_date, clock_in_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [d.id, d.tenantId, d.userId, d.workDate, d.clockInAt]);
  }

  async setClockOut(tx: TxClient, id: string, clockOutAt: string): Promise<void> {
    await tx.query(`UPDATE app.attendance_days SET clock_out_at = $2 WHERE id = $1`, [id, clockOutAt]);
  }

  async correctDay(tx: TxClient, id: string, p: { clockInAt: string | null; clockOutAt: string | null; correctedBy: string | null; note: string | null }): Promise<void> {
    await tx.query(
      `UPDATE app.attendance_days
          SET clock_in_at = $2, clock_out_at = $3, corrected_by = $4, corrected_at = now(), note = $5
        WHERE id = $1`,
      [id, p.clockInAt, p.clockOutAt, p.correctedBy, p.note]);
  }

  async breaksForDay(tx: TxClient, dayId: string): Promise<any[]> {
    const r = await tx.query<any>(`SELECT * FROM app.attendance_breaks WHERE attendance_day_id = $1 ORDER BY start_at`, [dayId]);
    return r.rows;
  }

  async openBreak(tx: TxClient, dayId: string): Promise<any | null> {
    const r = await tx.query<any>(
      `SELECT * FROM app.attendance_breaks WHERE attendance_day_id = $1 AND end_at IS NULL ORDER BY start_at DESC LIMIT 1`, [dayId]);
    return r.rows[0] ?? null;
  }

  async insertBreak(tx: TxClient, b: { id: string; tenantId: string; dayId: string; startAt: string }): Promise<void> {
    await tx.query(
      `INSERT INTO app.attendance_breaks (id, tenant_id, attendance_day_id, start_at) VALUES ($1,$2,$3,$4)`,
      [b.id, b.tenantId, b.dayId, b.startAt]);
  }

  async endBreak(tx: TxClient, id: string, endAt: string): Promise<void> {
    await tx.query(`UPDATE app.attendance_breaks SET end_at = $2 WHERE id = $1`, [id, endAt]);
  }

  async daysInRange(tx: TxClient, userId: string, from: string, to: string): Promise<any[]> {
    const r = await tx.query<any>(
      `SELECT * FROM app.attendance_days WHERE user_id = $1 AND work_date >= $2 AND work_date <= $3 ORDER BY work_date`,
      [userId, from, to]);
    return r.rows;
  }

  // ---- leave ----

  async insertLeave(tx: TxClient, l: any): Promise<void> {
    await tx.query(
      `INSERT INTO app.leave_requests (id, tenant_id, user_id, leave_type, start_date, end_date, hours_per_day, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [l.id, l.tenantId, l.userId, l.leaveType, l.startDate, l.endDate, l.hoursPerDay ?? 8, l.reason ?? null]);
  }

  async findLeave(tx: TxClient, id: string): Promise<any | null> {
    const r = await tx.query<any>(`SELECT * FROM app.leave_requests WHERE id = $1`, [id]);
    return r.rows[0] ?? null;
  }

  async decideLeave(tx: TxClient, id: string, p: { status: string; decidedBy: string | null; note: string | null }): Promise<void> {
    await tx.query(
      `UPDATE app.leave_requests SET status = $2, decided_by = $3, decided_at = now(), decision_note = $4 WHERE id = $1`,
      [id, p.status, p.decidedBy, p.note]);
  }

  async leaveForUser(tx: TxClient, userId: string, opts: { status?: string } = {}): Promise<any[]> {
    const r = await tx.query<any>(
      `SELECT * FROM app.leave_requests WHERE user_id = $1 ${opts.status ? 'AND status = $2' : ''} ORDER BY start_date DESC`,
      opts.status ? [userId, opts.status] : [userId]);
    return r.rows;
  }

  async leaveInRange(tx: TxClient, userId: string, from: string, to: string): Promise<any[]> {
    const r = await tx.query<any>(
      `SELECT * FROM app.leave_requests
        WHERE user_id = $1 AND status = 'approved' AND start_date <= $3 AND end_date >= $2
        ORDER BY start_date`, [userId, from, to]);
    return r.rows;
  }

  async pendingLeave(tx: TxClient): Promise<any[]> {
    const r = await tx.query<any>(`SELECT * FROM app.leave_requests WHERE status = 'pending' ORDER BY start_date`);
    return r.rows;
  }

  // ---- service vehicles ----

  async insertVehicle(tx: TxClient, v: any): Promise<void> {
    await tx.query(
      `INSERT INTO app.service_vehicles
         (id, tenant_id, registration_number, vin, make, model, fuel_type, current_mileage_km, assigned_user_id, insurance_note, registration_expiry)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [v.id, v.tenantId, v.registrationNumber, v.vin ?? null, v.make ?? null, v.model ?? null, v.fuelType ?? null,
       v.currentMileageKm ?? 0, v.assignedUserId ?? null, v.insuranceNote ?? null, v.registrationExpiry ?? null]);
  }

  async listVehicles(tx: TxClient): Promise<any[]> {
    const r = await tx.query<any>(`SELECT * FROM app.service_vehicles ORDER BY registration_number`);
    return r.rows;
  }

  async findVehicleForUser(tx: TxClient, userId: string): Promise<any | null> {
    const r = await tx.query<any>(`SELECT * FROM app.service_vehicles WHERE assigned_user_id = $1 AND status = 'active' LIMIT 1`, [userId]);
    return r.rows[0] ?? null;
  }

  async assignVehicle(tx: TxClient, id: string, userId: string | null): Promise<void> {
    await tx.query(`UPDATE app.service_vehicles SET assigned_user_id = $2 WHERE id = $1`, [id, userId]);
  }

  async setVehicleMileage(tx: TxClient, id: string, km: number): Promise<void> {
    await tx.query(`UPDATE app.service_vehicles SET current_mileage_km = $2 WHERE id = $1`, [id, km]);
  }

  // ---- travel orders ----

  async insertTravelOrder(tx: TxClient, t: any): Promise<void> {
    await tx.query(
      `INSERT INTO app.travel_orders
         (id, tenant_id, number, user_id, service_vehicle_id, customer_id, work_order_id, purpose, destination, country, per_km_rate_minor, currency, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [t.id, t.tenantId, t.number, t.userId, t.serviceVehicleId ?? null, t.customerId ?? null, t.workOrderId ?? null,
       t.purpose, t.destination ?? null, t.country ?? null, t.perKmRateMinor ?? 0, t.currency ?? 'EUR', t.status ?? 'draft']);
  }

  async findTravelOrder(tx: TxClient, id: string): Promise<any | null> {
    const r = await tx.query<any>(`SELECT * FROM app.travel_orders WHERE id = $1`, [id]);
    return r.rows[0] ?? null;
  }

  async updateTravelOrder(tx: TxClient, id: string, fields: Record<string, any>): Promise<void> {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    await tx.query(`UPDATE app.travel_orders SET ${sets} WHERE id = $1`, [id, ...keys.map((k) => fields[k])]);
  }

  async travelOrdersForUser(tx: TxClient, userId: string): Promise<any[]> {
    const r = await tx.query<any>(`SELECT * FROM app.travel_orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [userId]);
    return r.rows;
  }

  async travelOrdersInRange(tx: TxClient, userId: string, from: string, to: string): Promise<any[]> {
    const r = await tx.query<any>(
      `SELECT * FROM app.travel_orders
        WHERE user_id = $1 AND status IN ('completed','exported')
          AND started_at >= $2 AND started_at < ($3::date + interval '1 day')
        ORDER BY started_at`, [userId, from, to]);
    return r.rows;
  }

  // ---- field service ----

  async insertFieldService(tx: TxClient, f: any): Promise<void> {
    await tx.query(
      `INSERT INTO app.field_service_events
         (id, tenant_id, user_id, customer_id, kind, location, country, started_at, ended_at, travel_seconds, work_seconds, waiting_seconds, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [f.id, f.tenantId, f.userId, f.customerId ?? null, f.kind, f.location ?? null, f.country ?? null,
       f.startedAt ?? null, f.endedAt ?? null, f.travelSeconds ?? 0, f.workSeconds ?? 0, f.waitingSeconds ?? 0, f.notes ?? null]);
  }

  async fieldServiceInRange(tx: TxClient, userId: string, from: string, to: string): Promise<any[]> {
    const r = await tx.query<any>(
      `SELECT * FROM app.field_service_events
        WHERE user_id = $1 AND started_at >= $2 AND started_at < ($3::date + interval '1 day')
        ORDER BY started_at`, [userId, from, to]);
    return r.rows;
  }

  // ---- work-order time (READ ONLY) for the consistency check ----

  async workOrderSecondsInRange(tx: TxClient, userId: string, from: string, to: string): Promise<number> {
    // The existing work-order time ledger (app.time_entries) — we only READ it to
    // reconcile attendance against booked work; the consistency check never edits.
    const r = await tx.query<any>(
      `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - started_at)))::bigint, 0) AS secs
         FROM app.time_entries
        WHERE mechanic_id = $1 AND ended_at IS NOT NULL
          AND started_at >= $2 AND started_at < ($3::date + interval '1 day')`,
      [userId, from, to]);
    return Number(r.rows[0]?.secs ?? 0);
  }
}
