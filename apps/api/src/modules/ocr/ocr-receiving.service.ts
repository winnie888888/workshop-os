import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  // Shared OCR core — the tested, deterministic airlock logic. Both the
  // functions and the candidate types live inside these namespaces.
  OcrExtraction, OcrMatching,
} from '@workshop/shared';
import { getContext } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { AiGatewayService } from '../../ai/ai-gateway.service';
import { AttachmentsRepository } from '../attachments/attachments.repository';
import { GoodsReceiptsService } from '../receiving/goods-receipts.service';

/**
 * OCR receiving orchestration (Phase 7) — the upstream half of the airlock.
 *
 * Flow, each stage isolated and auditable:
 *   1. Resolve the uploaded attachment to a storage reference (tenant-guarded).
 *   2. Ask the AI gateway to extract structured data (residency + provenance
 *      handled inside the gateway).
 *   3. Normalize the raw model JSON through the TESTED shared core — never trust
 *      raw strings; parse European numbers/dates, flag low confidence.
 *   4. Load OUR records (suppliers, catalogue items with their supplier SKUs,
 *      open POs) and run the TESTED matchers.
 *   5. Assemble a draft containing ONLY confidently-resolved lines; hand back
 *      everything ambiguous as explicit review items.
 *   6. Create a DRAFT through the EXISTING goods-receipt workflow. NEVER post.
 *
 * What this service deliberately does NOT do: move stock, recompute cost, post a
 * receipt, or invent a price/quantity it could not read. Those are the human's
 * to confirm. A line we cannot resolve to a catalogue item with a quantity and a
 * cost is returned for review, not forced into the draft (the draft must be a
 * valid goods receipt, not a scratchpad).
 */
@Injectable()
export class OcrReceivingService {
  private readonly logger = new Logger('OcrReceiving');

  constructor(
    private readonly pg: PgService,
    private readonly audit: AuditService,
    private readonly ai: AiGatewayService,
    private readonly attachments: AttachmentsRepository,
    @Inject(GoodsReceiptsService) private readonly receiving: GoodsReceiptsService,
  ) {}

  /**
   * Extract a supplier document and create a DRAFT goods receipt from it.
   * Returns the created draft plus the review payload (what matched, what needs
   * attention). If the configured AI provider cannot extract, this throws a
   * clear error and the UI falls back to manual receiving.
   */
  async draftFromDocument(input: {
    attachmentId: string;
    documentType: 'delivery_note' | 'supplier_invoice';
    /** Where received stock should land if the reviewer does not change it. */
    defaultLocationId: string;
  }): Promise<any> {
    const ctx = getContext();

    // --- 1) Resolve the attachment (tenant-guarded read). ------------------
    const attachment = await this.pg.withTenant(ctx.tenantId, (tx) =>
      this.attachments.get(tx, input.attachmentId));
    if (!attachment) throw new NotFoundException('Attachment not found');
    if (attachment.status !== 'stored') {
      throw new BadRequestException('Attachment upload is not complete yet');
    }

    // --- 2) Extract via the gateway (residency + provenance inside). -------
    let extraction: { interactionId: string; json: string; confidence: number | null };
    try {
      extraction = await this.ai.extractFromDocument({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        feature: 'ocr_receiving',
        documentType: input.documentType,
        document: { storageKey: attachment.storageKey, mimeType: attachment.contentType ?? 'image/jpeg', attachmentId: attachment.id },
        prompt: EXTRACTION_PROMPT,
        outputSchema: 'supplier_document_v1',
        containsPii: true,
      });
    } catch (e) {
      this.logger.warn(`extraction unavailable: ${(e as Error).message}`);
      throw new BadRequestException('Document extraction is unavailable; receive this delivery manually.');
    }

    // --- 3) Normalize the raw JSON through the tested shared core. ---------
    const raw = safeJson(extraction.json);
    const norm = normalizeExtraction(raw);

    // --- 4) Load candidates and run the tested matchers. -------------------
    const { suppliers, items, openPos } = await this.loadCandidates();

    const supplierMatch = OcrMatching.matchSupplier(norm.supplierName, norm.supplierVatId, suppliers);
    const poMatch = OcrMatching.matchPurchaseOrder(norm.purchaseOrderRef, supplierMatch.supplierId, openPos);

    // Build review lines: every extracted line gets a match verdict and review
    // flags. A line is "draftable" only if it resolved to a catalogue item AND
    // we have a whole-number quantity AND a unit cost — the draft's invariants.
    const reviewLines = norm.lines.map((l, idx) => {
      const itemMatch = OcrMatching.matchItem(
        { supplierSku: l.supplierSku, oemRef: l.oemRef, description: l.description },
        items,
      );
      const qtyWhole = l.quantity != null && Number.isInteger(l.quantity) ? l.quantity : null;
      const draftable = itemMatch.itemId != null && qtyWhole != null && l.unitPriceMinor != null
        && itemMatch.status === 'matched';
      return {
        index: idx,
        raw: l.rawText,
        description: l.description,
        supplierSku: l.supplierSku,
        oemRef: l.oemRef,
        quantity: l.quantity,
        quantityWhole: qtyWhole,
        unitPriceMinor: l.unitPriceMinor,
        vatRatePct: l.vatRatePct,
        confidence: l.confidence,
        match: itemMatch,
        draftable,
        // Reasons the reviewer should look: low confidence, no clean quantity,
        // missing price, or an unresolved/ambiguous item.
        reviewFlags: buildLineFlags(l, itemMatch, qtyWhole),
      };
    });

    const draftableLines = reviewLines.filter((r) => r.draftable);

    // --- 5/6) If the supplier matched and at least one line is draftable, ---
    // create the DRAFT via the existing workflow. Otherwise return a review-
    // only payload so the clerk resolves the supplier/lines first. We never
    // post; we never move stock.
    let draft: any = null;
    if (supplierMatch.supplierId && draftableLines.length > 0) {
      draft = await this.receiving.createDraft({
        supplierId: supplierMatch.supplierId,
        purchaseOrderId: poMatch.purchaseOrderId ?? undefined,
        deliveryNoteRef: norm.deliveryNoteNumber ?? norm.documentNumber ?? undefined,
        source: 'ocr',
        ocrAttachmentId: input.attachmentId,
        ocrConfidence: extraction.confidence ?? undefined,
        lines: draftableLines.map((r) => ({
          itemId: r.match.itemId as string,
          locationId: input.defaultLocationId,
          qty: r.quantityWhole as number,
          unitCostMinor: r.unitPriceMinor as number,
          ocrRawText: r.raw ?? undefined,
          ocrConfidence: r.confidence ?? undefined,
          matchStatus: r.match.status,
        })),
      });
    }

    // --- Audit the OCR result (always), pointing at the extraction. --------
    // Two records are written, for two different readers: the hash-chain audit
    // entry (tamper-evident, for compliance) and the ocr_extractions row (the
    // full review payload, for the reviewer to revisit unresolved lines later).
    const reviewPayload = {
      extraction: {
        interactionId: extraction.interactionId,
        overallConfidence: extraction.confidence,
        documentNumber: norm.documentNumber,
        deliveryNoteNumber: norm.deliveryNoteNumber,
        invoiceNumber: norm.invoiceNumber,
        purchaseOrderRef: norm.purchaseOrderRef,
        date: norm.date,
        totalNetMinor: norm.totalNetMinor,
        totalGrossMinor: norm.totalGrossMinor,
      },
      supplierMatch, poMatch, lines: reviewLines,
    };

    await this.pg.withTenant(ctx.tenantId, async (tx) => {
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'ocr.extracted',
        entityType: 'goods_receipt', entityId: draft?.id ?? null, before: null,
        after: {
          attachmentId: input.attachmentId, interactionId: extraction.interactionId,
          documentType: input.documentType, supplierMatch, poMatch,
          lineCount: norm.lines.length, draftableCount: draftableLines.length,
          draftId: draft?.id ?? null,
        },
      });
      // Persist the complete extraction for audit + re-review (never drives stock).
      await tx.query(
        `INSERT INTO app.ocr_extractions
           (tenant_id, attachment_id, interaction_id, document_type, goods_receipt_id,
            matched_supplier_id, overall_confidence, review_payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          ctx.tenantId, input.attachmentId, extraction.interactionId, input.documentType,
          draft?.id ?? null, supplierMatch.supplierId, extraction.confidence ?? null,
          JSON.stringify(reviewPayload),
        ],
      );
    });

    // The full review payload: the draft (if created) plus everything the clerk
    // needs to correct and confirm. Low-confidence fields are flagged for review.
    return {
      draft,
      extraction: reviewPayload.extraction,
      supplierMatch,
      poMatch,
      lines: reviewLines,
      needsReview: !supplierMatch.supplierId
        || reviewLines.some((r) => r.reviewFlags.length > 0)
        || draftableLines.length < reviewLines.length,
    };
  }

  /** Load the matcher's candidate sets from our own records (tenant-scoped). */
  private async loadCandidates(): Promise<{
    suppliers: OcrMatching.SupplierCandidate[]; items: OcrMatching.ItemCandidate[]; openPos: OcrMatching.PoCandidate[];
  }> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const sup = await tx.query<any>(`SELECT id, name, vat_id FROM app.suppliers WHERE status <> 'archived'`);
      const items = await tx.query<any>(
        `SELECT i.id, i.name, i.sku, i.oem_ref,
                COALESCE(array_agg(si.supplier_sku) FILTER (WHERE si.supplier_sku IS NOT NULL), '{}') AS supplier_skus
           FROM app.inventory_items i
           LEFT JOIN app.supplier_items si ON si.item_id = i.id
          GROUP BY i.id, i.name, i.sku, i.oem_ref`);
      const pos = await tx.query<any>(
        `SELECT id, number, supplier_id FROM app.purchase_orders
          WHERE status IN ('sent','partially_received')`);
      return {
        suppliers: sup.rows.map((r) => ({ id: r.id, name: r.name, vatId: r.vat_id })),
        items: items.rows.map((r) => ({
          id: r.id, name: r.name, sku: r.sku, oemRef: r.oem_ref, supplierSkus: r.supplier_skus ?? [],
        })),
        openPos: pos.rows.map((r) => ({ id: r.id, number: r.number, supplierId: r.supplier_id })),
      };
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers (pure) — bridge the model's loose JSON into the shared core's inputs.
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPT =
  'Read this supplier delivery note or invoice. Extract the supplier name and VAT id, '
  + 'the document number, delivery-note and invoice numbers, any referenced purchase-order '
  + 'number, the date, and every line item with its supplier part code, OEM reference, '
  + 'description, quantity, unit price (net), line total, and VAT rate. Report each value '
  + 'with the exact text you read and a confidence 0..1. Respond ONLY with JSON conforming '
  + 'to schema "supplier_document_v1".';

function safeJson(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}

/** Pull a {raw, confidence} field's raw string, tolerating missing shapes. */
function rawOf(field: any): string | null {
  if (field == null) return null;
  if (typeof field === 'string') return field;
  return field.raw ?? null;
}
function confOf(field: any): number | null {
  if (field == null || typeof field === 'string') return null;
  return typeof field.confidence === 'number' ? field.confidence : null;
}
/** A line's confidence is the weakest of its key fields (price, qty, item id). */
function weakest(...cs: Array<number | null>): number | null {
  const known = cs.filter((c): c is number => typeof c === 'number');
  return known.length === 0 ? null : Math.min(...known);
}

interface NormLine {
  rawText: string | null;
  supplierSku: string | null; oemRef: string | null; description: string | null;
  quantity: number | null; unitPriceMinor: number | null; vatRatePct: string | null;
  confidence: number | null;
}
interface Norm {
  supplierName: string | null; supplierVatId: string | null;
  documentNumber: string | null; deliveryNoteNumber: string | null; invoiceNumber: string | null;
  purchaseOrderRef: string | null; date: string | null;
  totalNetMinor: number | null; totalGrossMinor: number | null;
  lines: NormLine[];
}

/** Normalize the raw model JSON into clean, typed values via the shared core. */
function normalizeExtraction(raw: any): Norm {
  const lines: NormLine[] = Array.isArray(raw?.lines) ? raw.lines.map((l: any) => {
    const desc = rawOf(l?.description);
    const sku = rawOf(l?.supplierSku);
    const oem = rawOf(l?.oemRef);
    const qty = OcrExtraction.parseQuantity(rawOf(l?.quantity));
    const price = OcrExtraction.parseAmountMinor(rawOf(l?.unitPrice));
    return {
      rawText: [desc, sku, oem].filter(Boolean).join(' · ') || null,
      supplierSku: sku, oemRef: oem, description: desc,
      quantity: qty,
      unitPriceMinor: price,
      vatRatePct: OcrExtraction.parseVatRate(rawOf(l?.vatRate)),
      confidence: weakest(confOf(l?.unitPrice), confOf(l?.quantity), confOf(l?.description)),
    };
  }) : [];

  return {
    supplierName: rawOf(raw?.supplier?.name) ?? rawOf(raw?.supplierName),
    supplierVatId: rawOf(raw?.supplier?.vatId) ?? rawOf(raw?.supplierVatId),
    documentNumber: rawOf(raw?.documentNumber),
    deliveryNoteNumber: rawOf(raw?.deliveryNoteNumber),
    invoiceNumber: rawOf(raw?.invoiceNumber),
    purchaseOrderRef: rawOf(raw?.purchaseOrderRef),
    date: OcrExtraction.parseDate(rawOf(raw?.date)),
    totalNetMinor: OcrExtraction.parseAmountMinor(rawOf(raw?.totals?.net)),
    totalGrossMinor: OcrExtraction.parseAmountMinor(rawOf(raw?.totals?.gross)),
    lines,
  };
}

/** Build the human-readable review flags for one line. */
function buildLineFlags(l: NormLine, itemMatch: { status: string }, qtyWhole: number | null): string[] {
  const flags: string[] = [];
  if (itemMatch.status === 'new_item') flags.push('No catalogue item matched');
  if (itemMatch.status === 'unmatched') flags.push('Item match needs confirmation');
  if (qtyWhole == null) flags.push('Quantity could not be read as a whole number');
  if (l.unitPriceMinor == null) flags.push('Unit price could not be read');
  if (OcrExtraction.confidenceTier(l.confidence) === 'low') flags.push('Low extraction confidence');
  return flags;
}
