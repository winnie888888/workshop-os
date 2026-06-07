import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { newId, getContext, Inventory, Sequence } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { CounterService } from '../../common/numbering/counter.service';
import { InventoryService } from '../inventory/inventory.service';
import { StockOpsRepository } from './stock-ops.repository';
import { AdjustStockDto, OpenCountDto, RecordCountDto } from './dto/stock-ops.dto';

/**
 * Standalone adjustments and stocktake counting. Both ultimately do the same
 * thing — post an `adjust` movement through the existing InventoryService.move()
 * chokepoint — but they wrap it with the accountability stock corrections demand:
 * a reason and a hash-chain audit entry. The valuation (moving-average cost) is
 * intentionally NOT changed by an adjustment, because a count correction is a
 * quantity fact, not a repricing; the value simply follows the corrected
 * quantity at the existing average. This module never writes stock_levels
 * directly — it always goes through move().
 */
@Injectable()
export class StockOpsService {
  constructor(
    private readonly pg: PgService,
    private readonly repo: StockOpsRepository,
    private readonly inventory: InventoryService,
    private readonly audit: AuditService,
    private readonly counter: CounterService,
  ) {}

  /** A standalone inventory adjustment (damage, loss, found, correction). */
  async adjust(dto: AdjustStockDto): Promise<Inventory.StockState> {
    const ctx = getContext();
    if (!Number.isInteger(dto.qty) || dto.qty === 0) {
      throw new BadRequestException('Adjustment quantity must be a non-zero whole number (negative to remove)');
    }
    if (!dto.reason || dto.reason.trim().length < 3) {
      throw new BadRequestException('An adjustment requires a reason');
    }
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const state = await this.inventory.move(tx, {
        itemId: dto.itemId, locationId: dto.locationId, type: Inventory.MovementType.Adjust,
        qty: dto.qty, reason: dto.reason.trim(), createdBy: ctx.userId, workOrderLineId: null,
        sourceRef: 'manual-adjustment',
      });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'stock.adjusted',
        entityType: 'inventory_item', entityId: dto.itemId,
        before: null, after: { locationId: dto.locationId, qty: dto.qty, reason: dto.reason.trim() },
      });
      return state;
    });
  }

  // --- Counting -------------------------------------------------------------

  /** Open a stocktake: create the count and snapshot system quantities. */
  async openCount(dto: OpenCountDto): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const id = newId();
      await this.repo.insertCount(tx, {
        id, tenantId: ctx.tenantId, scope: dto.scope ?? 'location',
        locationId: dto.locationId ?? null, startedBy: ctx.userId, notes: dto.notes ?? null,
      });
      const n = await this.repo.snapshotLines(tx, id, ctx.tenantId, dto.locationId ?? null);
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'stock_count.opened',
        entityType: 'stock_count', entityId: id, before: null,
        after: { scope: dto.scope ?? 'location', locationId: dto.locationId ?? null, lineCount: n },
      });
      return this.detail(id);
    });
  }

  /** Record counted quantities for some lines (idempotent per line). */
  async recordCount(countId: string, dto: RecordCountDto): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const count = await this.repo.count(tx, countId);
      if (!count) throw new NotFoundException('Stock count not found');
      if (count.status !== 'counting') throw new BadRequestException(`Count is ${count.status}, not counting`);
      for (const l of dto.lines) {
        await this.repo.setCounted(tx, countId, l.itemId, l.locationId, l.countedQty);
      }
      return this.detail(countId);
    });
  }

  /**
   * Close a count: post one adjust movement per non-zero variance through the
   * chokepoint, link each movement to its count line, and audit the close as a
   * single accountable action. Done inside one transaction so the count and all
   * its corrections commit together.
   */
  async closeCount(countId: string): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const count = await this.repo.count(tx, countId);
      if (!count) throw new NotFoundException('Stock count not found');
      if (count.status !== 'counting') throw new BadRequestException(`Count is ${count.status}, cannot close`);

      const variances = await this.repo.linesWithVariance(tx, countId);
      const number = count.number ?? await this.counter.next(tx, ctx.tenantId, Sequence.DocumentType.StockCount);

      for (const line of variances) {
        // variance = counted - system; post that signed delta as an adjustment.
        await this.inventory.move(tx, {
          itemId: line.item_id, locationId: line.location_id, type: Inventory.MovementType.Adjust,
          qty: line.variance, reason: `stocktake ${number}`, createdBy: ctx.userId,
          workOrderLineId: null, sourceRef: countId,
        });
        const mv = await tx.query<{ id: string }>(
          `SELECT id FROM app.stock_movements
            WHERE item_id = $1 AND location_id = $2 AND type = 'adjust' AND source_ref = $3
            ORDER BY created_at DESC LIMIT 1`,
          [line.item_id, line.location_id, countId]);
        if (mv.rowCount > 0) await this.repo.setLineAdjustment(tx, line.id, mv.rows[0].id);
      }

      await tx.query(`UPDATE app.stock_counts SET number = COALESCE(number, $2) WHERE id = $1`, [countId, number]);
      const closed = await this.repo.closeCount(tx, countId, ctx.userId);
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'stock_count.closed',
        entityType: 'stock_count', entityId: countId,
        before: { status: 'counting' }, after: { status: 'closed', number, adjustments: variances.length },
      });
      return { ...closed, adjustmentsPosted: variances.length };
    });
  }

  async detail(id: string): Promise<any> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const header = await this.repo.count(tx, id);
      if (!header) throw new NotFoundException('Stock count not found');
      return { ...header, lines: await this.repo.lines(tx, id) };
    });
  }

  async listCounts(limit?: number): Promise<any[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, (tx) => this.repo.list(tx, Math.min(limit ?? 50, 200)));
  }
}
