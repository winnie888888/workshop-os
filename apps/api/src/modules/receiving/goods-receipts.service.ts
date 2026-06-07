import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { newId, getContext, PurchaseOrders, Sequence } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { CounterService } from '../../common/numbering/counter.service';
import { InventoryService } from '../inventory/inventory.service';
import { PurchaseOrdersRepository } from '../purchasing/purchase-orders.repository';
import { GoodsReceiptsRepository } from './goods-receipts.repository';
import { CreateGrnDto } from './dto/goods-receipt.dto';

/**
 * Goods receiving. This is the only place stock is RECEIVED, and it is the
 * payoff of the Step 5.0 work: a GRN is created as a DRAFT (manual today, OCR
 * tomorrow), and POSTING it is the single action that moves stock in. Posting
 * goes line-by-line through InventoryService.applyCostedReceipt — the existing
 * costed-receive chokepoint — so every receipt updates the immutable ledger and
 * recomputes moving-average cost. Nothing here writes stock_levels directly.
 *
 * Human-in-the-loop is structural, not optional: the OCR pipeline can only ever
 * create a DRAFT; a person must post it. AI never calls the chokepoint.
 */
@Injectable()
export class GoodsReceiptsService {
  constructor(
    private readonly pg: PgService,
    private readonly repo: GoodsReceiptsRepository,
    private readonly inventory: InventoryService,
    private readonly poRepo: PurchaseOrdersRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly counter: CounterService,
  ) {}

  /** Create a DRAFT goods receipt. No stock moves yet. */
  async createDraft(dto: CreateGrnDto): Promise<any> {
    const ctx = getContext();
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('A goods receipt needs at least one line');
    }
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const supplier = await tx.query(`SELECT id FROM app.suppliers WHERE id = $1`, [dto.supplierId]);
      if (supplier.rowCount === 0) throw new BadRequestException('Supplier not found');

      const grnId = newId();
      await this.repo.insertHeader(tx, {
        id: grnId, tenantId: ctx.tenantId, supplierId: dto.supplierId,
        purchaseOrderId: dto.purchaseOrderId ?? null, deliveryNoteRef: dto.deliveryNoteRef ?? null,
        source: dto.source === 'ocr' ? 'ocr' : 'manual', ocrAttachmentId: dto.ocrAttachmentId ?? null,
        ocrConfidence: dto.ocrConfidence ?? null, receivedBy: ctx.userId, notes: dto.notes ?? null,
      });

      let lineNo = 1;
      for (const l of dto.lines) {
        await this.repo.insertLine(tx, {
          id: newId(), tenantId: ctx.tenantId, goodsReceiptId: grnId, lineNo: lineNo++,
          purchaseOrderLineId: l.purchaseOrderLineId ?? null, itemId: l.itemId, locationId: l.locationId,
          qty: l.qty, unitCostMinor: String(l.unitCostMinor), ocrRawText: l.ocrRawText ?? null,
          ocrConfidence: l.ocrConfidence ?? null, matchStatus: l.matchStatus ?? 'matched',
        });
      }
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'goods_receipt.draft_created',
        entityType: 'goods_receipt', entityId: grnId, before: null,
        after: { supplierId: dto.supplierId, source: dto.source ?? 'manual', lineCount: dto.lines.length },
      });
      return this.detail(grnId);
    });
  }

  /**
   * POST a draft goods receipt: this is where stock moves. For each line we run
   * the costed-receive chokepoint (which moves stock AND recomputes MAC), record
   * the resulting movement on the GRN line, and — if the line came from a PO —
   * advance that PO line's received quantity. After all lines, we recompute the
   * PO's status via the shared state machine and assign the GRN its number.
   */
  async post(id: string): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const grn = await this.repo.header(tx, id); // FOR UPDATE
      if (!grn) throw new NotFoundException('Goods receipt not found');
      if (grn.status !== 'draft') throw new BadRequestException(`Goods receipt already ${grn.status}`);

      const lines = await this.repo.lines(tx, id);
      if (lines.length === 0) throw new BadRequestException('Goods receipt has no lines');

      // If this GRN is against a PO, make sure that PO can still be received.
      if (grn.purchase_order_id) {
        const po = await this.poRepo.header(tx, grn.purchase_order_id);
        if (!po) throw new BadRequestException('Linked purchase order not found');
        if (!PurchaseOrders.poCanReceive(po.status)) {
          throw new BadRequestException(`Cannot receive against a ${po.status} purchase order`);
        }
      }

      // Post each line through the costed-receive chokepoint.
      for (const line of lines) {
        const next = await this.inventory.applyCostedReceipt(tx, {
          itemId: line.item_id, locationId: line.location_id, qty: line.qty,
          unitCostMinor: BigInt(line.unit_cost_minor),
          reason: `GRN ${grn.number ?? grn.id}`, sourceRef: grn.id, createdBy: ctx.userId,
        });
        // Tie the GRN line to the movement it produced (the latest receive for
        // this item+location within this transaction is ours).
        const mv = await tx.query<{ id: string }>(
          `SELECT id FROM app.stock_movements
            WHERE item_id = $1 AND location_id = $2 AND type = 'receive' AND source_ref = $3
            ORDER BY created_at DESC LIMIT 1`,
          [line.item_id, line.location_id, grn.id]);
        if (mv.rowCount > 0) await this.repo.setLineMovement(tx, line.id, mv.rows[0].id);

        // Advance the PO line if this receipt line was against one.
        if (line.purchase_order_line_id) {
          await this.poRepo.addReceived(tx, line.purchase_order_line_id, line.qty);
        }
        void next;
      }

      // Recompute the PO status from its (now-advanced) lines.
      if (grn.purchase_order_id) {
        const po = await this.poRepo.header(tx, grn.purchase_order_id);
        const poLines = await this.poRepo.lines(tx, grn.purchase_order_id);
        const newStatus = PurchaseOrders.receivedStatusFor(
          poLines.map((l: any) => ({ qtyOrdered: l.qty_ordered, qtyReceived: l.qty_received })),
          po.status,
        );
        if (newStatus !== po.status) {
          await this.poRepo.setStatus(tx, grn.purchase_order_id, newStatus, null, ctx.userId);
        }
      }

      const number = grn.number ?? await this.counter.next(tx, ctx.tenantId, Sequence.DocumentType.GoodsReceipt);
      const posted = await this.repo.setStatus(tx, id, 'posted', number);

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'goods_receipt.posted',
        entityType: 'goods_receipt', entityId: id,
        before: { status: 'draft' }, after: { status: 'posted', number, lineCount: lines.length },
      });

      // Tell Minimax the article cost may have changed (drained by the worker;
      // a no-op stub until the cost-update handler is wired — reserved seam).
      await this.outbox.enqueue(tx, {
        tenantId: ctx.tenantId, eventType: 'minimax.article.cost_update',
        payload: { goodsReceiptId: id, itemIds: lines.map((l: any) => l.item_id) },
        idempotencyKey: `grn-cost-${id}`,
      });

      return { ...posted, lines: await this.repo.lines(tx, id) };
    });
  }

  async detail(id: string): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const header = await this.repo.header(tx, id);
      if (!header) throw new NotFoundException('Goods receipt not found');
      return { ...header, lines: await this.repo.lines(tx, id) };
    });
  }

  async list(opts: { status?: string; limit?: number }): Promise<any[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, (tx) =>
      this.repo.list(tx, { status: opts.status, limit: Math.min(opts.limit ?? 100, 500) }));
  }
}
