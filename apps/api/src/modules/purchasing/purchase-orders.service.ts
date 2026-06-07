import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { newId, getContext, Money, Pricing, PurchaseOrders, Sequence } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { CounterService } from '../../common/numbering/counter.service';
import { PurchaseOrdersRepository } from './purchase-orders.repository';
import { CreatePoDto } from './dto/purchase-order.dto';

/**
 * Purchasing. A PO is built as a draft with lines, then SENT to the supplier
 * (which assigns its gapless number — drafts that are abandoned therefore never
 * waste a number), and later received against by the goods-receipt service. The
 * legal status moves are decided by the shared PurchaseOrders state machine, not
 * by hand. Line money (net/VAT/gross) is computed server-side by the same
 * Pricing core the work-order lines use, so a PO and an invoice price the same
 * way. No stock moves here — a PO is an intention to buy, not a receipt.
 */
@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly pg: PgService,
    private readonly repo: PurchaseOrdersRepository,
    private readonly audit: AuditService,
    private readonly counter: CounterService,
  ) {}

  async create(dto: CreatePoDto): Promise<any> {
    const ctx = getContext();
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('A purchase order needs at least one line');
    }
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const supplier = await tx.query<any>(`SELECT currency FROM app.suppliers WHERE id = $1`, [dto.supplierId]);
      if (supplier.rowCount === 0) throw new BadRequestException('Supplier not found');
      const currency = (dto.currency ?? supplier.rows[0].currency ?? 'EUR').toUpperCase();

      const poId = newId();
      await this.repo.insertHeader(tx, {
        id: poId, tenantId: ctx.tenantId, supplierId: dto.supplierId, currency,
        expectedDate: dto.expectedDate ?? null, shipToLocationId: dto.shipToLocationId ?? null,
        notes: dto.notes ?? null, createdBy: ctx.userId,
      });

      // Price every line with the shared core and accumulate the header totals.
      let lineNo = 1;
      const priced: any[] = [];
      for (const l of dto.lines) {
        const price = Pricing.priceLine({
          unitPrice: Money.money(currency, BigInt(l.unitCostMinor)),
          quantity: String(l.qtyOrdered),
          discountPct: '0',
          vatRatePct: l.vatRatePct ?? '22',
        });
        priced.push(await this.repo.insertLine(tx, {
          id: newId(), tenantId: ctx.tenantId, purchaseOrderId: poId, lineNo: lineNo++,
          itemId: l.itemId, supplierItemId: l.supplierItemId ?? null, description: l.description,
          qtyOrdered: l.qtyOrdered, unitCostMinor: String(l.unitCostMinor), vatRatePct: l.vatRatePct ?? '22',
          netMinor: price.net.minor.toString(), vatMinor: price.vat.minor.toString(),
          grossMinor: price.gross.minor.toString(),
        }));
      }
      const totals = Pricing.sumTotals(
        priced.map((p) => ({
          base: Money.money(currency, BigInt(p.net_minor)), discount: Money.zero(currency),
          net: Money.money(currency, BigInt(p.net_minor)), vat: Money.money(currency, BigInt(p.vat_minor)),
          gross: Money.money(currency, BigInt(p.gross_minor)),
        })),
        currency,
      );
      await this.repo.setTotals(tx, poId, {
        net: totals.net.minor.toString(), vat: totals.vat.minor.toString(), gross: totals.gross.minor.toString(),
      });

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'purchase_order.created',
        entityType: 'purchase_order', entityId: poId, before: null,
        after: { supplierId: dto.supplierId, lineCount: priced.length, totalGrossMinor: totals.gross.minor.toString() },
      });
      return this.detail(poId);
    });
  }

  /** Send a draft PO to the supplier: assign its number and flip the status. */
  async send(id: string): Promise<any> {
    return this.transition(id, 'sent', /* assignNumber */ true);
  }

  /** Cancel a PO (only legal from draft/sent/partially_received). */
  async cancel(id: string): Promise<any> {
    return this.transition(id, 'cancelled', false);
  }

  private async transition(id: string, to: PurchaseOrders.PurchaseOrderStatus, assignNumber: boolean): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const po = await this.repo.header(tx, id);
      if (!po) throw new NotFoundException('Purchase order not found');
      // The shared state machine is the authority on legality.
      PurchaseOrders.assertPoTransition(po.status, to);

      let number: string | null = null;
      if (assignNumber && !po.number) {
        number = await this.counter.next(tx, ctx.tenantId, Sequence.DocumentType.PurchaseOrder);
      }
      const updated = await this.repo.setStatus(tx, id, to, number, ctx.userId);
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: `purchase_order.${to}`,
        entityType: 'purchase_order', entityId: id,
        before: { status: po.status }, after: { status: to, number: updated.number },
      });
      return this.detail(id);
    });
  }

  async detail(id: string): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const header = await this.repo.header(tx, id);
      if (!header) throw new NotFoundException('Purchase order not found');
      const lines = await this.repo.lines(tx, id);
      return { ...header, lines };
    });
  }

  async list(opts: { status?: string; supplierId?: string; limit?: number }): Promise<any[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, (tx) =>
      this.repo.list(tx, { status: opts.status, supplierId: opts.supplierId, limit: Math.min(opts.limit ?? 100, 500) }));
  }
}
