import { Injectable } from '@nestjs/common';
import type { TxClient } from '../../common/db/pg.service';

// Persistence for stocktake counts. Adjustments are ledger-only (they have no
// table of their own beyond the movement), so this repo is about counts.
@Injectable()
export class StockOpsRepository {
  async insertCount(tx: TxClient, c: {
    id: string; tenantId: string; scope: string; locationId: string | null; startedBy: string | null; notes: string | null;
  }): Promise<any> {
    const res = await tx.query<any>(
      `INSERT INTO app.stock_counts (id, tenant_id, scope, location_id, status, started_by, notes)
       VALUES ($1,$2,$3,$4,'counting',$5,$6) RETURNING *`,
      [c.id, c.tenantId, c.scope, c.locationId, c.startedBy, c.notes]);
    return res.rows[0];
  }

  // Snapshot the current system quantities into count lines. This freezes what
  // the system believes at count time, so variance is measured against a stable
  // baseline even if stock moves during a long count.
  async snapshotLines(tx: TxClient, countId: string, tenantId: string, locationId: string | null): Promise<number> {
    const res = await tx.query(
      `INSERT INTO app.stock_count_lines (id, tenant_id, stock_count_id, item_id, location_id, system_qty)
       SELECT gen_random_uuid(), $2, $1, sl.item_id, sl.location_id, sl.on_hand
         FROM app.stock_levels sl
        WHERE ($3::uuid IS NULL OR sl.location_id = $3)`,
      [countId, tenantId, locationId]);
    return res.rowCount ?? 0;
  }

  async count(tx: TxClient, id: string): Promise<any | null> {
    const res = await tx.query<any>(`SELECT * FROM app.stock_counts WHERE id = $1 FOR UPDATE`, [id]);
    return res.rowCount > 0 ? res.rows[0] : null;
  }

  async lines(tx: TxClient, countId: string): Promise<any[]> {
    const res = await tx.query<any>(
      `SELECT cl.*, i.name AS item_name FROM app.stock_count_lines cl
         JOIN app.inventory_items i ON i.id = cl.item_id
        WHERE cl.stock_count_id = $1 ORDER BY i.name`, [countId]);
    return res.rows;
  }

  async setCounted(tx: TxClient, countId: string, itemId: string, locationId: string, countedQty: number): Promise<void> {
    await tx.query(
      `UPDATE app.stock_count_lines SET counted_qty = $4
        WHERE stock_count_id = $1 AND item_id = $2 AND location_id = $3`,
      [countId, itemId, locationId, countedQty]);
  }

  async linesWithVariance(tx: TxClient, countId: string): Promise<any[]> {
    const res = await tx.query<any>(
      `SELECT * FROM app.stock_count_lines
        WHERE stock_count_id = $1 AND counted_qty IS NOT NULL AND variance <> 0`, [countId]);
    return res.rows;
  }

  async setLineAdjustment(tx: TxClient, lineId: string, movementId: string): Promise<void> {
    await tx.query(`UPDATE app.stock_count_lines SET adjustment_movement_id = $2 WHERE id = $1`, [lineId, movementId]);
  }

  async closeCount(tx: TxClient, id: string, closedBy: string | null): Promise<any> {
    const res = await tx.query<any>(
      `UPDATE app.stock_counts SET status = 'closed', closed_by = $2, closed_at = now() WHERE id = $1 RETURNING *`,
      [id, closedBy]);
    return res.rows[0];
  }

  async list(tx: TxClient, limit: number): Promise<any[]> {
    const res = await tx.query<any>(
      `SELECT * FROM app.stock_counts ORDER BY started_at DESC LIMIT $1`, [limit]);
    return res.rows;
  }
}
