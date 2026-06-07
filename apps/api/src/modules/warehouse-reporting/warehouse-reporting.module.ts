import { Controller, Get, Module, UseGuards, Injectable } from '@nestjs/common';
import { getContext, Permission } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

/**
 * Warehouse reporting: what is stock worth, what is running low, and what should
 * we buy next. All three are read-only queries over data the chokepoint already
 * maintains — stock valuation reads the moving-average cost that goods receipt
 * keeps current, and the reorder views read the reorder columns added in 0007.
 * Nothing here mutates stock.
 */
@Injectable()
export class WarehouseReportingService {
  constructor(private readonly pg: PgService) {}

  /** Stock valuation: on_hand × moving-average cost, per item and in total. */
  async valuation(): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const rows = (await tx.query<any>(
        `SELECT i.id, i.name, i.sku, i.unit, i.avg_cost_minor,
                COALESCE(SUM(sl.on_hand), 0) AS on_hand,
                (i.avg_cost_minor * COALESCE(SUM(sl.on_hand), 0)) AS value_minor
           FROM app.inventory_items i
           LEFT JOIN app.stock_levels sl ON sl.item_id = i.id
          GROUP BY i.id
         HAVING COALESCE(SUM(sl.on_hand), 0) > 0
          ORDER BY value_minor DESC`,
      )).rows;
      const totalMinor = rows.reduce((s: bigint, r: any) => s + BigInt(r.value_minor), 0n);
      return {
        items: rows.map((r: any) => ({
          itemId: r.id, name: r.name, sku: r.sku, unit: r.unit,
          onHand: Number(r.on_hand), avgCostMinor: r.avg_cost_minor, valueMinor: r.value_minor,
        })),
        totalValueMinor: totalMinor.toString(),
      };
    });
  }

  /** Items at or below their reorder point (available = on_hand − reserved). */
  async lowStock(): Promise<any[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      return (await tx.query<any>(
        `SELECT sl.item_id, sl.location_id, i.name, i.sku,
                sl.on_hand, sl.reserved, (sl.on_hand - sl.reserved) AS available,
                sl.reorder_point, sl.reorder_qty, i.preferred_supplier_id
           FROM app.stock_levels sl
           JOIN app.inventory_items i ON i.id = sl.item_id
          WHERE sl.reorder_point > 0
            AND (sl.on_hand - sl.reserved) <= sl.reorder_point
          ORDER BY (sl.on_hand - sl.reserved) ASC`,
      )).rows.map((r: any) => ({
        itemId: r.item_id, locationId: r.location_id, name: r.name, sku: r.sku,
        onHand: r.on_hand, reserved: r.reserved, available: r.available,
        reorderPoint: r.reorder_point, reorderQty: r.reorder_qty,
        preferredSupplierId: r.preferred_supplier_id,
      }));
    });
  }

  /**
   * Suggested purchase orders: take the low-stock items, group them by their
   * preferred supplier, and suggest a top-up quantity (reorder_qty, or enough to
   * reach the reorder point if no target is set). This is a *suggestion* — the
   * buyer reviews it and the purchasing module creates the actual draft PO.
   */
  async suggestedPurchaseOrders(): Promise<any[]> {
    const ctx = getContext();
    const low = await this.lowStock();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const bySupplier = new Map<string, any>();
      for (const item of low) {
        if (!item.preferredSupplierId) continue; // can't suggest without a source
        const suggestQty = item.reorderQty > 0
          ? item.reorderQty
          : Math.max(item.reorderPoint - item.available, 1);
        if (!bySupplier.has(item.preferredSupplierId)) {
          bySupplier.set(item.preferredSupplierId, { supplierId: item.preferredSupplierId, lines: [] });
        }
        bySupplier.get(item.preferredSupplierId).lines.push({
          itemId: item.itemId, name: item.name, sku: item.sku, suggestQty,
          available: item.available, reorderPoint: item.reorderPoint,
        });
      }
      // Decorate each group with the supplier name.
      const groups = [...bySupplier.values()];
      for (const g of groups) {
        const s = await tx.query<any>(`SELECT name FROM app.suppliers WHERE id = $1`, [g.supplierId]);
        g.supplierName = s.rowCount > 0 ? s.rows[0].name : null;
      }
      return groups;
    });
  }
}

@Controller('warehouse-reports')
@UseGuards(PermissionsGuard)
export class WarehouseReportingController {
  constructor(private readonly svc: WarehouseReportingService) {}

  // Valuation is a financial figure -> the financial-view permission.
  @Get('valuation')
  @RequirePermissions(Permission.AnalyticsFinancialView)
  valuation() {
    return this.svc.valuation();
  }

  // Low-stock and suggestions are operational -> the receive permission suffices.
  @Get('low-stock')
  @RequirePermissions(Permission.StockReceive)
  lowStock() {
    return this.svc.lowStock();
  }

  @Get('suggested-pos')
  @RequirePermissions(Permission.PurchaseManage)
  suggested() {
    return this.svc.suggestedPurchaseOrders();
  }
}

@Module({
  controllers: [WarehouseReportingController],
  providers: [WarehouseReportingService],
  exports: [WarehouseReportingService],
})
export class WarehouseReportingModule {}
