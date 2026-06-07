import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  newId, getContext, RentalAvailability, RentalCharges, Sequence,
} from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { CounterService } from '../../common/numbering/counter.service';
import { InvoicesService } from '../invoices/invoices.service';

/**
 * Vehicle rental management (Phase 12). One service owns three related concerns —
 * the rental fleet, the reservations that fill the availability calendar, and the
 * contracts that move through draft → handed_over → returned → invoiced — because
 * they are tightly coupled (a contract is created from a reservation for a fleet
 * vehicle). The interesting methods are `returnVehicle`, which runs the TESTED
 * charge calculator over the return readings, and `generateInvoice`, which turns
 * the computed charges into lines for the EXISTING invoicing engine. Everything
 * is tenant-scoped and audited; rental billing flows through the real invoice
 * path, so it reaches Minimax and e-invoicing like any other invoice.
 */
@Injectable()
export class RentalService {
  constructor(
    private readonly pg: PgService,
    private readonly audit: AuditService,
    private readonly counter: CounterService,
    @Inject(InvoicesService) private readonly invoices: InvoicesService,
  ) {}

  // ===================== Fleet (rental vehicles) =========================

  async createVehicle(dto: any): Promise<any> {
    const ctx = getContext();
    const id = newId();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `INSERT INTO app.rental_vehicles
           (id, tenant_id, category, make, model, plate, vin, year,
            daily_rate_minor, included_km_per_day, per_km_rate_minor, per_fuel_eighth_minor,
            cleaning_fee_minor, late_fee_per_day_minor, deposit_minor, deductible_minor,
            fuel_tank_eighths, currency, current_mileage_km, current_fuel_eighths, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'available',$21)
         RETURNING *`,
        [
          id, ctx.tenantId, dto.category ?? 'car', dto.make ?? null, dto.model ?? null, dto.plate,
          dto.vin ?? null, dto.year ?? null,
          dto.dailyRateMinor ?? 0, dto.includedKmPerDay ?? 0, dto.perKmRateMinor ?? 0, dto.perFuelEighthMinor ?? 0,
          dto.cleaningFeeMinor ?? 0, dto.lateFeePerDayMinor ?? 0, dto.depositMinor ?? 0, dto.deductibleMinor ?? 0,
          dto.fuelTankEighths ?? 8, dto.currency ?? 'EUR', dto.currentMileageKm ?? 0, dto.currentFuelEighths ?? 8,
          dto.notes ?? null,
        ]);
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'rental.vehicle_created',
        entityType: 'rental_vehicle', entityId: id, before: null,
        after: { plate: dto.plate, category: dto.category ?? 'car' },
      });
      return r.rows[0];
    });
  }

  async listVehicles(): Promise<any[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) =>
      (await tx.query<any>(`SELECT * FROM app.rental_vehicles WHERE status <> 'retired' ORDER BY make, model`)).rows);
  }

  // ===================== Reservations (calendar) =========================

  /**
   * Reserve a vehicle for a date range. Availability is decided by the TESTED
   * shared checker against the vehicle's existing (non-cancelled) reservations —
   * if it conflicts, we refuse and name the conflicts rather than double-book.
   */
  async reserve(dto: { rentalVehicleId: string; customerId: string; startAt: string; endAt: string; pickupLocation?: string; returnLocation?: string; notes?: string }): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const existing = (await tx.query<any>(
        `SELECT id, start_at, end_at, status FROM app.rental_reservations
           WHERE rental_vehicle_id = $1 AND status <> 'cancelled'`, [dto.rentalVehicleId])).rows;
      const windows = existing.map((e) => ({
        reservationId: e.id, startMs: Date.parse(e.start_at), endMs: Date.parse(e.end_at), blocks: true,
      }));
      const requested = { startMs: Date.parse(dto.startAt), endMs: Date.parse(dto.endAt) };
      const avail = RentalAvailability.checkAvailability(requested, windows);
      if (!avail.available) {
        throw new ConflictException(`Vehicle not available for those dates (conflicts: ${avail.conflicts.join(', ')})`);
      }
      const id = newId();
      const r = await tx.query<any>(
        `INSERT INTO app.rental_reservations
           (id, tenant_id, rental_vehicle_id, customer_id, start_at, end_at, pickup_location, return_location, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'reserved',$9) RETURNING *`,
        [id, ctx.tenantId, dto.rentalVehicleId, dto.customerId, dto.startAt, dto.endAt,
         dto.pickupLocation ?? null, dto.returnLocation ?? null, dto.notes ?? null]);
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'rental.reserved',
        entityType: 'rental_reservation', entityId: id, before: null,
        after: { rentalVehicleId: dto.rentalVehicleId, customerId: dto.customerId, startAt: dto.startAt, endAt: dto.endAt },
      });
      return r.rows[0];
    });
  }

  /** The availability calendar: reservations in a window, for the UI to render. */
  async calendar(fromIso: string, toIso: string): Promise<any[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) =>
      (await tx.query<any>(
        `SELECT r.*, v.make, v.model, v.plate, c.name AS customer_name
           FROM app.rental_reservations r
           JOIN app.rental_vehicles v ON v.id = r.rental_vehicle_id
           JOIN app.customers c ON c.id = r.customer_id
           WHERE r.status <> 'cancelled' AND r.start_at < $2 AND r.end_at > $1
           ORDER BY r.start_at`, [fromIso, toIso])).rows);
  }

  // ===================== Contracts =======================================

  /**
   * Create a contract from a reservation. The commercial terms are COPIED from
   * the vehicle at this moment, so later changes to the fleet default never
   * rewrite an existing agreement. Draws a gapless RA-… number.
   */
  async createContract(dto: { reservationId: string; casco?: boolean; fuelPolicy?: string; mileagePolicy?: string; latePolicy?: string }): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const res = (await tx.query<any>(`SELECT * FROM app.rental_reservations WHERE id = $1`, [dto.reservationId])).rows[0];
      if (!res) throw new NotFoundException('Reservation not found');
      const v = (await tx.query<any>(`SELECT * FROM app.rental_vehicles WHERE id = $1`, [res.rental_vehicle_id])).rows[0];
      if (!v) throw new NotFoundException('Rental vehicle not found');

      const number = await this.counter.next(tx, ctx.tenantId, Sequence.DocumentType.RentalContract);
      const id = newId();
      const r = await tx.query<any>(
        `INSERT INTO app.rental_contracts
           (id, tenant_id, number, reservation_id, rental_vehicle_id, customer_id, start_at, end_at,
            pickup_location, return_location, daily_rate_minor, included_km_per_day, per_km_rate_minor,
            per_fuel_eighth_minor, cleaning_fee_minor, late_fee_per_day_minor, deposit_minor, deductible_minor,
            casco, fuel_policy, mileage_policy, late_policy, currency, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,'draft')
         RETURNING *`,
        [id, ctx.tenantId, number, res.id, v.id, res.customer_id, res.start_at, res.end_at,
         res.pickup_location, res.return_location, v.daily_rate_minor, v.included_km_per_day, v.per_km_rate_minor,
         v.per_fuel_eighth_minor, v.cleaning_fee_minor, v.late_fee_per_day_minor, v.deposit_minor, v.deductible_minor,
         dto.casco ?? false, dto.fuelPolicy ?? 'full_to_full', dto.mileagePolicy ?? null, dto.latePolicy ?? null, v.currency]);
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'rental.contract_created',
        entityType: 'rental_contract', entityId: id, before: null, after: { number, reservationId: res.id },
      });
      return r.rows[0];
    });
  }

  /**
   * Handover: record the starting mileage and fuel and the customer's signature,
   * mark the contract handed_over, the reservation active, and the vehicle rented.
   */
  async handover(contractId: string, dto: { startMileageKm: number; startFuelEighths: number; signatureAttachmentId?: string }): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const c = (await tx.query<any>(`SELECT * FROM app.rental_contracts WHERE id = $1`, [contractId])).rows[0];
      if (!c) throw new NotFoundException('Contract not found');
      if (c.status !== 'draft') throw new ConflictException(`Cannot hand over a contract in status '${c.status}'`);
      const r = await tx.query<any>(
        `UPDATE app.rental_contracts
           SET start_mileage_km = $2, start_fuel_eighths = $3, handover_at = now(),
               handover_signature_attachment_id = $4, status = 'handed_over'
         WHERE id = $1 RETURNING *`,
        [contractId, dto.startMileageKm, dto.startFuelEighths, dto.signatureAttachmentId ?? null]);
      await tx.query(`UPDATE app.rental_vehicles SET status = 'rented' WHERE id = $1`, [c.rental_vehicle_id]);
      if (c.reservation_id) await tx.query(`UPDATE app.rental_reservations SET status = 'active' WHERE id = $1`, [c.reservation_id]);
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'rental.handover',
        entityType: 'rental_contract', entityId: contractId, before: null,
        after: { startMileageKm: dto.startMileageKm, startFuelEighths: dto.startFuelEighths },
      });
      return r.rows[0];
    });
  }

  /**
   * Return: record the return readings and any new damage, then run the TESTED
   * charge calculator over the agreed terms and the readings. The computed
   * charges are stored on the contract for the desk to review BEFORE invoicing —
   * the calculation is deterministic, but issuing the invoice is a separate,
   * deliberate step (generateInvoice), so a human always confirms the money.
   */
  async returnVehicle(contractId: string, dto: {
    returnMileageKm: number; returnFuelEighths: number; dirty?: boolean;
    signatureAttachmentId?: string;
    damages?: Array<{ description: string; severity?: string; estimatedCostMinor?: number; photoAttachmentIds?: string[] }>;
  }): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const c = (await tx.query<any>(`SELECT * FROM app.rental_contracts WHERE id = $1`, [contractId])).rows[0];
      if (!c) throw new NotFoundException('Contract not found');
      if (c.status !== 'handed_over') throw new ConflictException(`Cannot return a contract in status '${c.status}'`);

      // Persist any new damage records (with their photo attachment ids).
      let damageCostMinor = 0;
      for (const d of dto.damages ?? []) {
        damageCostMinor += Math.max(0, Number(d.estimatedCostMinor ?? 0));
        await tx.query(
          `INSERT INTO app.rental_damages
             (id, tenant_id, contract_id, recorded_at_stage, description, severity, estimated_cost_minor, photo_attachment_ids)
           VALUES ($1,$2,$3,'return',$4,$5,$6,$7)`,
          [newId(), ctx.tenantId, contractId, d.description, d.severity ?? 'minor',
           Math.max(0, Number(d.estimatedCostMinor ?? 0)), JSON.stringify(d.photoAttachmentIds ?? [])]);
      }

      // Run the tested, deterministic charge calculator.
      const terms: RentalCharges.RentalTerms = {
        dailyRateMinor: Number(c.daily_rate_minor), includedKmPerDay: Number(c.included_km_per_day),
        perKmRateMinor: Number(c.per_km_rate_minor), perFuelEighthMinor: Number(c.per_fuel_eighth_minor),
        cleaningFeeMinor: Number(c.cleaning_fee_minor), lateFeePerDayMinor: Number(c.late_fee_per_day_minor),
        depositMinor: Number(c.deposit_minor), casco: c.casco === true, deductibleMinor: Number(c.deductible_minor),
      };
      const handoverReadings: RentalCharges.HandoverReadings = {
        startMs: Date.parse(c.start_at), endMs: Date.parse(c.end_at),
        startMileageKm: Number(c.start_mileage_km ?? 0), startFuelEighths: Number(c.start_fuel_eighths ?? 8),
      };
      const returnReadings: RentalCharges.ReturnReadings = {
        returnedMs: Date.now(), returnMileageKm: dto.returnMileageKm, returnFuelEighths: dto.returnFuelEighths,
        dirty: dto.dirty === true, newDamageCostMinor: damageCostMinor,
      };
      const charges = RentalCharges.computeRentalCharges(terms, handoverReadings, returnReadings);

      const r = await tx.query<any>(
        `UPDATE app.rental_contracts
           SET return_mileage_km = $2, return_fuel_eighths = $3, returned_dirty = $4,
               return_at = now(), return_signature_attachment_id = $5, charges = $6, status = 'returned'
         WHERE id = $1 RETURNING *`,
        [contractId, dto.returnMileageKm, dto.returnFuelEighths, dto.dirty === true,
         dto.signatureAttachmentId ?? null, JSON.stringify(charges)]);
      // The vehicle returns to the fleet at its new readings.
      await tx.query(
        `UPDATE app.rental_vehicles SET status = 'available', current_mileage_km = $2, current_fuel_eighths = $3 WHERE id = $1`,
        [c.rental_vehicle_id, dto.returnMileageKm, dto.returnFuelEighths]);
      if (c.reservation_id) await tx.query(`UPDATE app.rental_reservations SET status = 'completed' WHERE id = $1`, [c.reservation_id]);

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'rental.return',
        entityType: 'rental_contract', entityId: contractId, before: null,
        after: { returnMileageKm: dto.returnMileageKm, returnFuelEighths: dto.returnFuelEighths,
                 subtotalMinor: charges.subtotalMinor, balanceDueMinor: charges.balanceDueMinor },
      });
      return { contract: r.rows[0], charges };
    });
  }

  /**
   * Generate the final rental invoice from the computed charges, through the
   * EXISTING invoicing engine (issueFromLines): same VAT treatment, same
   * Minimax/e-invoice outbox. The deposit is shown as an applied credit line so
   * the invoice reflects what the customer actually owes beyond the deposit.
   */
  async generateInvoice(contractId: string): Promise<any> {
    const ctx = getContext();
    const contract = await this.pg.withTenant(ctx.tenantId, async (tx) =>
      (await tx.query<any>(`SELECT * FROM app.rental_contracts WHERE id = $1`, [contractId])).rows[0]);
    if (!contract) throw new NotFoundException('Contract not found');
    if (contract.status !== 'returned') throw new ConflictException(`Contract must be returned before invoicing (status '${contract.status}')`);
    if (contract.invoice_id) throw new ConflictException('This contract is already invoiced');
    const charges = contract.charges as RentalCharges.RentalChargeResult;
    if (!charges || !charges.lines?.length) throw new BadRequestException('No charges to invoice');

    // Map computed charge lines to invoice lines (all services for VAT purposes).
    const lines = charges.lines.map((l) => ({ description: l.description, netMinor: l.amountMinor, kind: 'service' as const }));
    // Show the deposit as a negative credit line if it offsets charges.
    if (charges.depositAppliedMinor > 0) {
      lines.push({ description: `Deposit applied (€${(charges.depositMinor / 100).toFixed(2)} held)`, netMinor: -charges.depositAppliedMinor, kind: 'service' as const });
    }

    const invoice = await this.invoices.issueFromLines({
      customerId: contract.customer_id, currency: contract.currency, lines,
    });

    await this.pg.withTenant(ctx.tenantId, async (tx) => {
      await tx.query(`UPDATE app.rental_contracts SET invoice_id = $2, status = 'invoiced' WHERE id = $1`, [contractId, invoice.id]);
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'rental.invoiced',
        entityType: 'rental_contract', entityId: contractId, before: null,
        after: { invoiceId: invoice.id, number: (invoice as any).number },
      });
    });
    return { contractId, invoiceId: invoice.id, invoice };
  }

  /** Read a contract with its vehicle, customer, and damages, for review/PDF. */
  async getContract(contractId: string): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const c = (await tx.query<any>(`SELECT * FROM app.rental_contracts WHERE id = $1`, [contractId])).rows[0];
      if (!c) throw new NotFoundException('Contract not found');
      const v = (await tx.query<any>(`SELECT * FROM app.rental_vehicles WHERE id = $1`, [c.rental_vehicle_id])).rows[0];
      const cust = (await tx.query<any>(`SELECT id, name, country, city, vat_id FROM app.customers WHERE id = $1`, [c.customer_id])).rows[0];
      const damages = (await tx.query<any>(`SELECT * FROM app.rental_damages WHERE contract_id = $1 ORDER BY created_at`, [contractId])).rows;
      return { contract: c, vehicle: v, customer: cust, damages };
    });
  }
}
