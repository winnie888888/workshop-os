import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  // The tested, deterministic plate core.
  PlateRecognition, PlateMatch,
  WorkOrderState, WorkOrderStatus,
} from '@workshop/shared';
import { getContext } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { AiGatewayService } from '../../ai/ai-gateway.service';
import { AttachmentsRepository } from '../attachments/attachments.repository';
import { WorkOrdersService } from '../workorders/work-orders.service';

/**
 * Plate recognition orchestration (Phase 8) — the upstream half of the SAME
 * airlock the OCR phase established, applied to vehicle identification.
 *
 * recognize() flow, each stage isolated and auditable:
 *   1. Resolve the uploaded plate photo to a storage reference (tenant-guarded).
 *   2. Ask the AI gateway to recognize the plate (residency + provenance inside).
 *   3. Normalize the read + infer the country through the TESTED shared core.
 *   4. Load the tenant's vehicles and run the TESTED plate matcher.
 *   5. For matched vehicles, attach the customer and detect OPEN work orders.
 *   6. Return a review payload. NEVER creates or opens a work order here.
 *
 * confirmExisting()/confirmNew() are the human-confirmed actions. confirmExisting
 * merely returns the work order to open (no mutation). confirmNew creates a work
 * order through the EXISTING work-orders service — the same validated path manual
 * intake uses — so plate recognition adds a new caller, never a new bypass.
 */
@Injectable()
export class PlateRecognitionService {
  private readonly logger = new Logger('PlateRecognition');

  constructor(
    private readonly pg: PgService,
    private readonly audit: AuditService,
    private readonly ai: AiGatewayService,
    private readonly attachments: AttachmentsRepository,
    @Inject(WorkOrdersService) private readonly workOrders: WorkOrdersService,
  ) {}

  /** Recognize a plate from a photo and return the review payload (no mutation). */
  async recognize(input: { attachmentId: string }): Promise<any> {
    const ctx = getContext();

    // --- 1) Resolve the attachment (tenant-guarded). ----------------------
    const attachment = await this.pg.withTenant(ctx.tenantId, (tx) =>
      this.attachments.get(tx, input.attachmentId));
    if (!attachment) throw new NotFoundException('Attachment not found');
    if (attachment.status !== 'stored') throw new BadRequestException('Photo upload is not complete yet');

    // --- 2) Recognize via the gateway. ------------------------------------
    let read: { interactionId: string; plate: string; country: string | null; confidence: number | null };
    try {
      read = await this.ai.recognizePlate({
        tenantId: ctx.tenantId, userId: ctx.userId, feature: 'plate_recognition',
        document: { storageKey: attachment.storageKey, mimeType: attachment.contentType ?? 'image/jpeg', attachmentId: attachment.id },
        prompt: PLATE_PROMPT, containsPii: true,
      });
    } catch (e) {
      this.logger.warn(`plate recognition unavailable: ${(e as Error).message}`);
      throw new BadRequestException('Plate recognition is unavailable; enter the plate manually.');
    }

    // --- 3) Normalize + infer country (tested shared core). ---------------
    const canonical = PlateRecognition.canonicalPlate(read.plate);
    const countryGuesses = PlateRecognition.inferCountry(read.plate, read.country);
    const effectiveCountry = read.country ?? countryGuesses[0]?.country ?? null;

    // --- 4) Load vehicles and run the tested matcher. ---------------------
    const vehicles = await this.loadVehicles();
    const match = PlateMatch.matchPlate(read.plate, effectiveCountry, vehicles);

    // --- 5) Enrich the candidates with customer + open work orders. -------
    const enriched = await Promise.all(match.candidates.map(async (c) => {
      const customer = await this.customerOf(c.vehicle.customerId);
      const openWorkOrders = await this.openWorkOrdersFor(c.vehicle.id);
      return {
        vehicle: c.vehicle, customer, openWorkOrders,
        confidence: c.confidence, method: c.method, reason: c.reason,
      };
    }));

    // --- Audit the recognition (always), pointing at the photo. -----------
    const outcome = match.singleConfident ? 'single' : match.ambiguous ? 'ambiguous' : 'none';
    const reviewPayload = {
      read: { plate: read.plate, canonical, confidence: read.confidence },
      country: { effective: effectiveCountry, guesses: countryGuesses },
      candidates: enriched,
      singleConfident: match.singleConfident, ambiguous: match.ambiguous, noMatch: match.noMatch,
    };

    await this.pg.withTenant(ctx.tenantId, async (tx) => {
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'plate.recognized',
        entityType: 'asset', entityId: enriched[0]?.vehicle.id ?? null, before: null,
        after: {
          attachmentId: input.attachmentId, interactionId: read.interactionId,
          readPlate: read.plate, canonical, country: effectiveCountry, confidence: read.confidence,
          candidateCount: enriched.length,
        },
      });
      // Persist the recognition for re-review and accuracy analysis (no mutation
      // of vehicle or work-order state happens here).
      await tx.query(
        `INSERT INTO app.plate_recognitions
           (tenant_id, attachment_id, interaction_id, read_plate, canonical_plate,
            country, confidence, outcome, review_payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          ctx.tenantId, input.attachmentId, read.interactionId, read.plate, canonical,
          effectiveCountry, read.confidence ?? null, outcome, JSON.stringify(reviewPayload),
        ],
      );
    });

    return {
      read: { plate: read.plate, canonical, confidence: read.confidence },
      country: { effective: effectiveCountry, guesses: countryGuesses },
      candidates: enriched,
      singleConfident: match.singleConfident,
      ambiguous: match.ambiguous,
      noMatch: match.noMatch,
      // The UI uses these to decide its next screen: fast-confirm, chooser, or
      // "create a new vehicle". Recognition itself changed nothing.
    };
  }

  /**
   * Confirm opening an EXISTING work order for a recognized vehicle. This does
   * not mutate anything — it verifies the work order belongs to the vehicle and
   * returns it for the UI to open. The human has confirmed; we just audit it.
   */
  async confirmExisting(input: { workOrderId: string; assetId: string }): Promise<any> {
    const ctx = getContext();
    const wo = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT id, number, status, asset_id, customer_id FROM app.work_orders WHERE id = $1`,
        [input.workOrderId]);
      return r.rows[0] ?? null;
    });
    if (!wo) throw new NotFoundException('Work order not found');
    if (wo.asset_id !== input.assetId) throw new BadRequestException('Work order does not belong to this vehicle');

    await this.pg.withTenant(ctx.tenantId, (tx) =>
      this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'plate.opened_work_order',
        entityType: 'work_order', entityId: wo.id, before: null,
        after: { via: 'plate_recognition', assetId: input.assetId },
      }));
    return { workOrderId: wo.id, number: wo.number, status: wo.status, created: false };
  }

  /**
   * Confirm creating a NEW work order for a recognized vehicle. Delegates to the
   * existing work-orders service (the same validated create path manual intake
   * uses), then audits that it came from plate recognition. Human-confirmed.
   */
  async confirmNew(input: { customerId: string; assetId: string; complaint?: string; odometer?: number; clientId?: string }): Promise<any> {
    const ctx = getContext();
    const created = await this.workOrders.create({
      customerId: input.customerId,
      assetId: input.assetId,
      complaint: input.complaint,
      odometer: input.odometer,
      clientId: input.clientId,
    } as any);

    await this.pg.withTenant(ctx.tenantId, (tx) =>
      this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'plate.created_work_order',
        entityType: 'work_order', entityId: created.id, before: null,
        after: { via: 'plate_recognition', assetId: input.assetId, customerId: input.customerId },
      }));
    return { workOrderId: created.id, number: created.number, status: created.status, created: true };
  }

  // ---- candidate loading (tenant-scoped reads) ---------------------------

  private async loadVehicles(): Promise<PlateMatch.VehicleCandidate[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT id, plate, country_of_plate, customer_id, make, model, vin
           FROM app.assets WHERE status = 'active'`);
      return r.rows.map((v) => ({
        id: v.id, plate: v.plate, countryOfPlate: v.country_of_plate, customerId: v.customer_id,
        make: v.make, model: v.model, vin: v.vin,
      }));
    });
  }

  private async customerOf(customerId: string): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT id, name, country, city, phone, email FROM app.customers WHERE id = $1`, [customerId]);
      const c = r.rows[0];
      return c ? { id: c.id, name: c.name, country: c.country, city: c.city, phone: c.phone, email: c.email } : null;
    });
  }

  /**
   * Open work orders for a vehicle. "Open" = not terminal AND not invoiced — an
   * invoiced job is effectively finished for the advisor at the desk, so we do
   * not offer it as something to resume. We use the shared state machine's
   * isTerminal as the source of truth for terminality and add the invoiced
   * exclusion as an advisor-facing refinement.
   */
  private async openWorkOrdersFor(assetId: string): Promise<any[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT id, number, status, complaint, created_at
           FROM app.work_orders WHERE asset_id = $1 ORDER BY created_at DESC`, [assetId]);
      return r.rows
        .filter((w) => !WorkOrderState.isTerminal(w.status as any) && w.status !== WorkOrderStatus.Invoiced)
        .map((w) => ({ id: w.id, number: w.number, status: w.status, complaint: w.complaint, createdAt: w.created_at }));
    });
  }
}

const PLATE_PROMPT =
  'Read the single most prominent vehicle license plate in this photo. Return the plate '
  + 'text exactly as shown and, if the country band or flag is visible, the ISO country '
  + 'code. Report your confidence 0..1.';
