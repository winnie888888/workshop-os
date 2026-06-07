import { Injectable, NotFoundException } from '@nestjs/common';
import { newId, getContext, Sequence, TravelConsistency } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { CounterService } from '../../common/numbering/counter.service';
import { AttendanceRepository } from './attendance.repository';

/**
 * Service vehicles, travel orders (potni nalog) and field-service events — the
 * field-mechanic and towing-operator side of the module. A travel order is
 * created (drawing a gapless TO number), started and finished from mobile, and
 * its time breakdown and mileage reimbursement are computed by the TESTED shared
 * core (TravelConsistency.computeTravelOrder). When completed it is marked ready
 * for accounting export. Money is in minor units throughout.
 */
@Injectable()
export class TravelService {
  constructor(
    private readonly pg: PgService,
    private readonly repo: AttendanceRepository,
    private readonly audit: AuditService,
    private readonly counter: CounterService,
  ) {}

  private now(): string { return new Date().toISOString(); }

  // ---- service vehicles ----

  async createVehicle(dto: any): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const id = newId();
      await this.repo.insertVehicle(tx, { id, tenantId: ctx.tenantId, ...dto });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'service_vehicle.created',
        entityType: 'service_vehicle', entityId: id, before: null, after: { registrationNumber: dto.registrationNumber },
      });
      return this.vehicleView((await this.repo.listVehicles(tx)).find((v) => v.id === id));
    });
  }

  async listVehicles(): Promise<any[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) =>
      (await this.repo.listVehicles(tx)).map((v) => this.vehicleView(v)));
  }

  async assignVehicle(id: string, userId: string | null): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      await this.repo.assignVehicle(tx, id, userId);
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'service_vehicle.assigned',
        entityType: 'service_vehicle', entityId: id, before: null, after: { assignedUserId: userId },
      });
      return { ok: true };
    });
  }

  /** The vehicle assigned to the caller, for the "view assigned vehicle" action. */
  async myVehicle(): Promise<any | null> {
    const ctx = getContext();
    if (!ctx.userId) return null;
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const v = await this.repo.findVehicleForUser(tx, ctx.userId as string);
      return v ? this.vehicleView(v) : null;
    });
  }

  // ---- travel orders ----

  async createTravelOrder(dto: any): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const id = newId();
      const number = await this.counter.next(tx, ctx.tenantId, Sequence.DocumentType.TravelOrder);
      await this.repo.insertTravelOrder(tx, {
        id, tenantId: ctx.tenantId, number,
        userId: dto.userId ?? ctx.userId,
        serviceVehicleId: dto.serviceVehicleId, customerId: dto.customerId, workOrderId: dto.workOrderId,
        purpose: dto.purpose, destination: dto.destination, country: dto.country,
        perKmRateMinor: dto.perKmRateMinor ?? 0, currency: dto.currency ?? 'EUR', status: 'draft',
      });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'travel_order.created',
        entityType: 'travel_order', entityId: id, before: null, after: { number, purpose: dto.purpose },
      });
      return this.travelView(await this.repo.findTravelOrder(tx, id));
    });
  }

  /** Start a travel order from mobile (records the start time). */
  async startTravelOrder(id: string): Promise<any> {
    return this.transition(id, 'in_progress', { started_at: this.now() }, 'travel_order.started');
  }

  /**
   * Finish a travel order from mobile: record end time, the categorised seconds,
   * mileage, expenses, and mark it completed (ready for accounting export). The
   * shared core computes the reimbursement and surfaces any unclassified time.
   */
  async finishTravelOrder(id: string, dto: {
    travelSeconds?: number; workSeconds?: number; waitingSeconds?: number; km?: number; expensesMinor?: number;
  }): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const t = await this.repo.findTravelOrder(tx, id);
      if (!t) throw new NotFoundException('Travel order not found');
      const endedAt = this.now();
      await this.repo.updateTravelOrder(tx, id, {
        ended_at: endedAt,
        travel_seconds: dto.travelSeconds ?? 0, work_seconds: dto.workSeconds ?? 0, waiting_seconds: dto.waitingSeconds ?? 0,
        km: dto.km ?? 0, expenses_minor: dto.expensesMinor ?? 0, status: 'completed',
      });
      // If a vehicle is attached and km were driven, advance its odometer.
      if (t.service_vehicle_id && (dto.km ?? 0) > 0) {
        const v = (await this.repo.listVehicles(tx)).find((x) => x.id === t.service_vehicle_id);
        if (v) await this.repo.setVehicleMileage(tx, v.id, v.current_mileage_km + Math.round(dto.km ?? 0));
      }
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'travel_order.completed',
        entityType: 'travel_order', entityId: id, before: { status: t.status }, after: { status: 'completed' },
      });
      return this.travelView(await this.repo.findTravelOrder(tx, id));
    });
  }

  async myTravelOrders(): Promise<any[]> {
    const ctx = getContext();
    if (!ctx.userId) return [];
    return this.pg.withTenant(ctx.tenantId, async (tx) =>
      (await this.repo.travelOrdersForUser(tx, ctx.userId as string)).map((t) => this.travelView(t)));
  }

  // ---- field service ----

  async recordFieldService(dto: any): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const id = newId();
      await this.repo.insertFieldService(tx, { id, tenantId: ctx.tenantId, userId: dto.userId ?? ctx.userId, ...dto });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'field_service.recorded',
        entityType: 'field_service_event', entityId: id, before: null, after: { kind: dto.kind },
      });
      return { id, ok: true };
    });
  }

  // ---- internal ----

  private async transition(id: string, status: string, fields: Record<string, any>, action: string): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const t = await this.repo.findTravelOrder(tx, id);
      if (!t) throw new NotFoundException('Travel order not found');
      await this.repo.updateTravelOrder(tx, id, { status, ...fields });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action,
        entityType: 'travel_order', entityId: id, before: { status: t.status }, after: { status },
      });
      return this.travelView(await this.repo.findTravelOrder(tx, id));
    });
  }

  private vehicleView(v: any): any {
    if (!v) return null;
    return {
      id: v.id, registrationNumber: v.registration_number, vin: v.vin, make: v.make, model: v.model,
      fuelType: v.fuel_type, currentMileageKm: v.current_mileage_km, assignedUserId: v.assigned_user_id,
      insuranceNote: v.insurance_note, registrationExpiry: v.registration_expiry, status: v.status,
    };
  }

  private travelView(t: any): any {
    const computed = TravelConsistency.computeTravelOrder({
      startSec: t.started_at ? Math.floor(new Date(t.started_at).getTime() / 1000) : 0,
      endSec: t.ended_at ? Math.floor(new Date(t.ended_at).getTime() / 1000) : null,
      travelSeconds: t.travel_seconds, workSeconds: t.work_seconds, waitingSeconds: t.waiting_seconds,
      km: Number(t.km), perKmRateMinor: t.per_km_rate_minor, expensesMinor: t.expenses_minor, currency: t.currency,
    });
    return {
      id: t.id, number: t.number, userId: t.user_id, serviceVehicleId: t.service_vehicle_id,
      customerId: t.customer_id, workOrderId: t.work_order_id, purpose: t.purpose,
      destination: t.destination, country: t.country, startedAt: t.started_at, endedAt: t.ended_at,
      travelSeconds: t.travel_seconds, workSeconds: t.work_seconds, waitingSeconds: t.waiting_seconds,
      km: Number(t.km), perKmRateMinor: t.per_km_rate_minor, currency: t.currency, status: t.status,
      // Computed by the shared core:
      mileageReimbursementMinor: computed.mileageReimbursementMinor,
      totalReimbursementMinor: computed.totalReimbursementMinor,
      unclassifiedSeconds: computed.unclassifiedSeconds, flags: computed.flags,
    };
  }
}
