import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  VoiceWorkOrder, PlateMatch, WorkOrderState, WorkOrderStatus,
} from '@workshop/shared';
import { getContext, newId } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { AiGatewayService } from '../../ai/ai-gateway.service';
import { AttachmentsRepository } from '../attachments/attachments.repository';
import { WorkOrdersService } from '../workorders/work-orders.service';

/**
 * Voice work orders (Phase 10) — the same recognition airlock as plate scanning
 * and OCR, applied to a spoken note. The mechanic or advisor records audio; the
 * system transcribes it, extracts work-order fields, resolves the customer and
 * vehicle, and returns a DRAFT for review. Nothing is saved here. Two confirm
 * actions create or update a work order through the EXISTING work-orders service
 * — voice adds new callers of that workflow, never a new bypass.
 *
 * draft() flow, each stage isolated and auditable:
 *   1. Resolve the audio attachment (tenant-guarded).
 *   2. Transcribe via the gateway (residency + provenance inside).
 *   3. Extract structured fields via the gateway's `complete` (voice schema).
 *   4. Assemble + validate the draft through the TESTED shared core.
 *   5. Resolve the customer (name search) and vehicle (plate matcher), detect
 *      open work orders.
 *   6. Persist the draft for re-review and return it. NO mutation.
 */
@Injectable()
export class VoiceWorkOrderService {
  private readonly logger = new Logger('VoiceWorkOrder');

  constructor(
    private readonly pg: PgService,
    private readonly audit: AuditService,
    private readonly ai: AiGatewayService,
    private readonly attachments: AttachmentsRepository,
    @Inject(WorkOrdersService) private readonly workOrders: WorkOrdersService,
  ) {}

  /** Transcribe + extract + resolve, returning a reviewable draft (no mutation). */
  async draft(input: { attachmentId: string; languageHint?: string | null }): Promise<any> {
    const ctx = getContext();

    // --- 1) Resolve the audio attachment. ---------------------------------
    const attachment = await this.pg.withTenant(ctx.tenantId, (tx) =>
      this.attachments.get(tx, input.attachmentId));
    if (!attachment) throw new NotFoundException('Attachment not found');
    if (attachment.status !== 'stored') throw new BadRequestException('Audio upload is not complete yet');

    // --- 2) Transcribe. ---------------------------------------------------
    let transcript: { interactionId: string; text: string; language: string | null; confidence: number | null };
    try {
      transcript = await this.ai.transcribe({
        tenantId: ctx.tenantId, userId: ctx.userId, feature: 'voice_transcription',
        document: { storageKey: attachment.storageKey, mimeType: attachment.contentType ?? 'audio/m4a', attachmentId: attachment.id },
        languageHint: input.languageHint ?? null, containsPii: true,
      });
    } catch (e) {
      this.logger.warn(`transcription unavailable: ${(e as Error).message}`);
      throw new BadRequestException('Voice transcription is unavailable; type the work order instead.');
    }

    // --- 3) Extract structured fields from the transcript. ----------------
    // Field extraction is a `complete` call with the voice work-order schema —
    // speech-to-text and language-understanding are kept separate by design.
    let extraction: VoiceWorkOrder.VoiceExtraction = {};
    try {
      const res = await this.ai.run<any>({
        tenantId: ctx.tenantId, userId: ctx.userId, feature: 'voice_extraction',
        prompt: EXTRACTION_PROMPT(transcript.text), outputSchema: 'voice_work_order', containsPii: true,
      });
      extraction = parseExtraction(res.output);
    } catch (e) {
      this.logger.warn(`voice extraction failed, returning transcript only: ${(e as Error).message}`);
    }

    // --- 4) Assemble + validate the draft (tested shared core). -----------
    const draft = VoiceWorkOrder.assembleDraft(extraction, transcript.text);

    // --- 5) Resolve customer + vehicle, detect open work orders. ----------
    const customerCandidates = draft.customerHint ? await this.findCustomers(draft.customerHint) : [];
    const resolvedCustomerId = customerCandidates.length === 1 ? customerCandidates[0].id : null;

    let vehicleMatch: any = { candidates: [], noMatch: true, singleConfident: false, ambiguous: false };
    if (draft.plateCanonical) {
      const vehicles = await this.loadVehicles();
      vehicleMatch = PlateMatch.matchPlate(draft.plateCanonical, null, vehicles);
    }
    const resolvedVehicle = vehicleMatch.singleConfident ? vehicleMatch.candidates[0].vehicle : null;
    const openWorkOrders = resolvedVehicle ? await this.openWorkOrdersFor(resolvedVehicle.id) : [];

    // --- 6) Persist the draft (for re-review) + audit. No mutation. -------
    const payload = {
      transcript: { text: transcript.text, language: transcript.language, confidence: transcript.confidence },
      draft, customerCandidates, resolvedCustomerId,
      vehicleCandidates: vehicleMatch.candidates, resolvedVehicle, openWorkOrders,
    };

    const draftId = newId();
    await this.pg.withTenant(ctx.tenantId, async (tx) => {
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'voice.drafted',
        entityType: 'voice_draft', entityId: draftId, before: null,
        after: {
          attachmentId: input.attachmentId, interactionId: transcript.interactionId,
          intent: draft.intent, completeness: draft.completeness, missing: draft.missing,
          resolvedCustomerId, resolvedVehicleId: resolvedVehicle?.id ?? null,
        },
      });
      await tx.query(
        `INSERT INTO app.voice_drafts
           (id, tenant_id, attachment_id, interaction_id, transcript, language,
            intent, completeness, needs_review, draft_payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          draftId, ctx.tenantId, input.attachmentId, transcript.interactionId, transcript.text, transcript.language,
          draft.intent, draft.completeness, draft.needsReview, JSON.stringify(payload),
        ],
      );
    });

    return { draftId, ...payload };
  }

  /**
   * Confirm CREATING a new work order from a reviewed voice draft. Delegates to
   * the existing work-orders create, then appends the work-performed and
   * recommendation lines (description only, quantity 1, price 0 — voice captures
   * the words; a human prices them). Human-confirmed; audited.
   */
  async confirmCreate(input: {
    customerId: string; assetId?: string; complaint?: string; odometerKm?: number;
    lines?: Array<{ type: 'labour' | 'part' | 'fee'; description: string }>;
    clientId?: string;
  }): Promise<any> {
    const ctx = getContext();
    const created = await this.workOrders.create({
      customerId: input.customerId, assetId: input.assetId,
      complaint: input.complaint, odometer: input.odometerKm, clientId: input.clientId,
    } as any);

    const addedLines = await this.appendLines(created.id, input.lines ?? []);

    await this.pg.withTenant(ctx.tenantId, (tx) =>
      this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'voice.created_work_order',
        entityType: 'work_order', entityId: created.id, before: null,
        after: { via: 'voice', customerId: input.customerId, assetId: input.assetId ?? null, lines: addedLines },
      }));
    return { workOrderId: created.id, number: created.number, status: created.status, created: true, addedLines };
  }

  /**
   * Confirm UPDATING an existing work order from a reviewed voice draft —
   * appending the work-performed and recommendation lines through the existing
   * addLine workflow. Human-confirmed; audited.
   */
  async confirmUpdate(input: {
    workOrderId: string;
    lines: Array<{ type: 'labour' | 'part' | 'fee'; description: string }>;
  }): Promise<any> {
    const ctx = getContext();
    const wo = await this.workOrders.get(input.workOrderId);
    if (!wo) throw new NotFoundException('Work order not found');

    const addedLines = await this.appendLines(input.workOrderId, input.lines ?? []);

    await this.pg.withTenant(ctx.tenantId, (tx) =>
      this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'voice.updated_work_order',
        entityType: 'work_order', entityId: input.workOrderId, before: null,
        after: { via: 'voice', lines: addedLines },
      }));
    return { workOrderId: input.workOrderId, updated: true, addedLines };
  }

  // ---- helpers -----------------------------------------------------------

  /** Append voice-captured lines (description only; quantity 1, price 0). */
  private async appendLines(
    workOrderId: string,
    lines: Array<{ type: 'labour' | 'part' | 'fee'; description: string }>,
  ): Promise<number> {
    let count = 0;
    for (const line of lines) {
      if (!line.description || !line.description.trim()) continue;
      await this.workOrders.addLine(workOrderId, {
        type: line.type, description: line.description.trim().slice(0, 300),
        quantity: '1', unitPriceMinor: 0,
      } as any);
      count++;
    }
    return count;
  }

  private async findCustomers(hint: string): Promise<any[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT id, name, country, city FROM app.customers
           WHERE name ILIKE '%' || $1 || '%' ORDER BY name LIMIT 5`, [hint]);
      return r.rows.map((c) => ({ id: c.id, name: c.name, country: c.country, city: c.city }));
    });
  }

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

  /** Open (non-terminal, non-invoiced) work orders for a vehicle. */
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

/** Parse the model's extraction output (string JSON or object) defensively. */
function parseExtraction(output: unknown): VoiceWorkOrder.VoiceExtraction {
  try {
    if (typeof output === 'string') return JSON.parse(output);
    if (output && typeof output === 'object') return output as VoiceWorkOrder.VoiceExtraction;
  } catch { /* fall through to empty */ }
  return {};
}

const EXTRACTION_PROMPT = (transcript: string) =>
  'Extract work-order fields from this mechanic/advisor voice note. Return JSON with keys: '
  + 'customerHint, vehicleHint, complaint, workPerformed, labourNotes, recommendations (array), '
  + 'followUps (array), odometerKm (number). Use null/empty when not stated. Do not invent prices '
  + `or hours. Transcript: """${transcript}"""`;
