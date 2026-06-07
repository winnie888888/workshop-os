import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { newId, getContext, Inventory, Valuation } from '@workshop/shared';
import { PgService, type TxClient } from '../../common/db/pg.service';
import { CreateItemDto, ReceiveStockDto } from './dto/inventory.dto';

export interface InventoryItem {
  id: string; name: string; sku: string | null; oemRef: string | null;
  unit: string; costMinor: string; priceMinor: string; currency: string;
  vatRatePct: string; isCore: boolean;
}
export interface StockLevel {
  itemId: string; locationId: string; onHand: number; reserved: number; available: number;
}

/**
 * Inventory service. The public methods manage their own transaction; the
 * `move` method runs inside a CALLER's transaction so work-order reservations
 * happen atomically with the line that triggers them. All quantity arithmetic
 * is delegated to the shared Inventory reducer, which enforces the invariants
 * (available >= 0, reserved <= on_hand) that keep stock honest.
 */
@Injectable()
export class InventoryService {
  constructor(private readonly pg: PgService) {}

  async createItem(dto: CreateItemDto): Promise<InventoryItem> {
    const ctx = getContext();
    const id = newId();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const res = await tx.query<any>(
        `INSERT INTO app.inventory_items
           (id, tenant_id, sku, oem_ref, name, unit, cost_minor, price_minor, currency, vat_rate_pct, is_core)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [
          id, ctx.tenantId, dto.sku ?? null, dto.oemRef ?? null, dto.name, dto.unit ?? 'pcs',
          dto.costMinor ?? 0, dto.priceMinor ?? 0, (dto.currency ?? 'EUR').toUpperCase(),
          dto.vatRatePct ?? '22', dto.isCore ?? false,
        ],
      );
      return this.itemToDomain(res.rows[0]);
    });
  }

  async receive(dto: ReceiveStockDto): Promise<StockLevel> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      if (dto.unitCostMinor != null) {
        // Costed receive: move stock AND recompute the moving-average cost.
        await this.applyCostedReceipt(tx, {
          itemId: dto.itemId, locationId: dto.locationId, qty: dto.quantity,
          unitCostMinor: BigInt(dto.unitCostMinor),
          reason: dto.reason ?? 'goods receipt', sourceRef: null, createdBy: ctx.userId,
        });
      } else {
        // Uncosted receive (e.g. opening balance): move only, average unchanged.
        await this.move(tx, {
          itemId: dto.itemId, locationId: dto.locationId,
          type: Inventory.MovementType.Receive, qty: dto.quantity,
          reason: dto.reason ?? 'goods receipt', createdBy: ctx.userId, workOrderLineId: null,
        });
      }
      return this.readLevel(tx, dto.itemId, dto.locationId);
    });
  }

  async stockForItem(itemId: string): Promise<StockLevel[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const res = await tx.query<any>(
        `SELECT item_id, location_id, on_hand, reserved
           FROM app.stock_levels WHERE item_id = $1`,
        [itemId],
      );
      return res.rows.map((r: any) => ({
        itemId: r.item_id, locationId: r.location_id, onHand: r.on_hand,
        reserved: r.reserved, available: r.on_hand - r.reserved,
      }));
    });
  }

  /**
   * Apply one stock movement inside the caller's transaction. Locks the stock
   * level row FOR UPDATE, computes the new state with the shared reducer (which
   * throws on any invariant breach), persists it, and appends the immutable
   * movement ledger row.
   */
  async move(
    tx: TxClient,
    p: {
      itemId: string; locationId: string; type: Inventory.MovementType; qty: number;
      reason: string | null; createdBy: string | null; workOrderLineId: string | null;
      // Phase 5.0 ledger provenance (all optional; older callers omit them).
      unitCostMinor?: bigint | null; transferId?: string | null; sourceRef?: string | null;
    },
  ): Promise<Inventory.StockState> {
    const ctx = getContext();
    // Ensure a level row exists, then lock it.
    await tx.query(
      `INSERT INTO app.stock_levels (id, tenant_id, item_id, location_id, on_hand, reserved)
       VALUES ($1,$2,$3,$4,0,0)
       ON CONFLICT (tenant_id, item_id, location_id) DO NOTHING`,
      [newId(), ctx.tenantId, p.itemId, p.locationId],
    );
    const locked = await tx.query<{ on_hand: number; reserved: number }>(
      `SELECT on_hand, reserved FROM app.stock_levels
        WHERE item_id = $1 AND location_id = $2 FOR UPDATE`,
      [p.itemId, p.locationId],
    );
    if (locked.rowCount === 0) throw new NotFoundException('Stock level not found');

    const state: Inventory.StockState = {
      onHand: locked.rows[0].on_hand, reserved: locked.rows[0].reserved,
    };
    let next: Inventory.StockState;
    try {
      next = Inventory.applyMovement(state, p.type, p.qty);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    await tx.query(
      `UPDATE app.stock_levels SET on_hand = $3, reserved = $4, updated_at = now()
        WHERE item_id = $1 AND location_id = $2`,
      [p.itemId, p.locationId, next.onHand, next.reserved],
    );
    await tx.query(
      `INSERT INTO app.stock_movements
         (id, tenant_id, item_id, location_id, type, quantity, work_order_line_id, reason, created_by,
          unit_cost_minor, transfer_id, source_ref)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        newId(), ctx.tenantId, p.itemId, p.locationId, p.type, p.qty, p.workOrderLineId, p.reason, p.createdBy,
        p.unitCostMinor != null ? p.unitCostMinor.toString() : null, p.transferId ?? null, p.sourceRef ?? null,
      ],
    );
    return next;
  }

  /**
   * Apply a COSTED receipt and recompute the item's moving-average cost (Phase
   * 5.0). Runs inside the caller's transaction so a goods-receipt posting moves
   * stock and updates valuation atomically. The average is an ITEM-wide figure,
   * so the blend uses the item's TOTAL on-hand across all locations before this
   * receipt — not just this location's. cost_minor is updated to the last cost.
   */
  async applyCostedReceipt(
    tx: TxClient,
    p: {
      itemId: string; locationId: string; qty: number; unitCostMinor: bigint;
      reason: string | null; sourceRef: string | null; createdBy: string | null;
    },
  ): Promise<Inventory.StockState> {
    // Read the item's average and its total on-hand BEFORE the receipt.
    const before = await tx.query<{ avg_cost_minor: string; total_on_hand: string }>(
      `SELECT i.avg_cost_minor,
              COALESCE((SELECT SUM(on_hand) FROM app.stock_levels s WHERE s.item_id = i.id), 0) AS total_on_hand
         FROM app.inventory_items i WHERE i.id = $1`,
      [p.itemId],
    );
    if (before.rowCount === 0) throw new NotFoundException('Inventory item not found');
    const onHandBefore = Number(before.rows[0].total_on_hand);
    const avgBefore = BigInt(before.rows[0].avg_cost_minor);

    const next = await this.move(tx, {
      itemId: p.itemId, locationId: p.locationId, type: Inventory.MovementType.Receive, qty: p.qty,
      reason: p.reason, createdBy: p.createdBy, workOrderLineId: null,
      unitCostMinor: p.unitCostMinor, sourceRef: p.sourceRef,
    });

    const newAvg = Valuation.movingAverage({
      onHandBefore, avgCostMinorBefore: avgBefore, receivedQty: p.qty, receiptUnitCostMinor: p.unitCostMinor,
    });
    await tx.query(
      `UPDATE app.inventory_items SET avg_cost_minor = $2, cost_minor = $3, updated_at = now() WHERE id = $1`,
      [p.itemId, newAvg.toString(), p.unitCostMinor.toString()],
    );
    return next;
  }

  /**
   * Transfer stock between two locations as an atomic PAIR of movements sharing
   * a transfer id (Phase 5.0). Valuation is unaffected — moving-average cost is
   * an item-wide figure, so relocating units never changes it — but each half
   * records the current average as its unit cost for a complete ledger. Locks
   * are taken in a deterministic location order to avoid deadlocks.
   */
  async transfer(p: {
    itemId: string; fromLocationId: string; toLocationId: string; qty: number; reason: string | null;
  }): Promise<{ from: Inventory.StockState; to: Inventory.StockState; transferId: string }> {
    if (p.fromLocationId === p.toLocationId) {
      throw new BadRequestException('Source and destination locations must differ');
    }
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const transferId = newId();
      const item = await tx.query<{ avg_cost_minor: string }>(
        `SELECT avg_cost_minor FROM app.inventory_items WHERE id = $1`, [p.itemId]);
      if (item.rowCount === 0) throw new NotFoundException('Inventory item not found');
      const unitCost = BigInt(item.rows[0].avg_cost_minor);

      // Deterministic lock order (by location id) prevents deadlocks when two
      // transfers touch the same pair of locations in opposite directions.
      const [firstLoc] = [p.fromLocationId, p.toLocationId].sort();
      const doOut = () => this.move(tx, {
        itemId: p.itemId, locationId: p.fromLocationId, type: Inventory.MovementType.TransferOut, qty: p.qty,
        reason: p.reason ?? 'transfer', createdBy: ctx.userId, workOrderLineId: null,
        unitCostMinor: unitCost, transferId, sourceRef: transferId,
      });
      const doIn = () => this.move(tx, {
        itemId: p.itemId, locationId: p.toLocationId, type: Inventory.MovementType.TransferIn, qty: p.qty,
        reason: p.reason ?? 'transfer', createdBy: ctx.userId, workOrderLineId: null,
        unitCostMinor: unitCost, transferId, sourceRef: transferId,
      });
      // Apply in lock order, but the out leg must validate availability first;
      // since both run in one tx the order of effects is consistent either way.
      let from: Inventory.StockState; let to: Inventory.StockState;
      if (firstLoc === p.fromLocationId) { from = await doOut(); to = await doIn(); }
      else { to = await doIn(); from = await doOut(); }
      return { from, to, transferId };
    });
  }

  /**
   * Search the parts catalogue for the advisor's picker (Warehouse 5.1). Matches
   * the query against name, SKU and OEM reference, case-insensitively, and
   * returns priced catalogue items. Read-only; RLS-scoped like everything else.
   * An empty query returns the first page of items so the picker opens populated.
   */
  async searchItems(q: string | undefined, limit = 25): Promise<InventoryItem[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const term = (q ?? '').trim();
      const res = term.length === 0
        ? await tx.query<any>(`SELECT * FROM app.inventory_items ORDER BY lower(name) LIMIT $1`, [limit])
        : await tx.query<any>(
            `SELECT * FROM app.inventory_items
              WHERE lower(name) LIKE lower($1) OR lower(sku) LIKE lower($1) OR lower(oem_ref) LIKE lower($1)
              ORDER BY lower(name) LIMIT $2`,
            [`%${term}%`, limit]);
      return res.rows.map((r: any) => this.itemToDomain(r));
    });
  }

  private async readLevel(tx: TxClient, itemId: string, locationId: string): Promise<StockLevel> {
    const res = await tx.query<{ on_hand: number; reserved: number }>(
      `SELECT on_hand, reserved FROM app.stock_levels WHERE item_id = $1 AND location_id = $2`,
      [itemId, locationId],
    );
    const r = res.rows[0] ?? { on_hand: 0, reserved: 0 };
    return { itemId, locationId, onHand: r.on_hand, reserved: r.reserved, available: r.on_hand - r.reserved };
  }

  private itemToDomain(r: any): InventoryItem {
    return {
      id: r.id, name: r.name, sku: r.sku, oemRef: r.oem_ref, unit: r.unit,
      costMinor: String(r.cost_minor), priceMinor: String(r.price_minor),
      currency: r.currency, vatRatePct: String(r.vat_rate_pct), isCore: r.is_core,
    };
  }
}
