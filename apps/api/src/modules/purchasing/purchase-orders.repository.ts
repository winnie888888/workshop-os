import { Injectable } from '@nestjs/common';
import type { TxClient } from '../../common/db/pg.service';

// Purchasing reads/writes. Kept close to the SQL because POs are mostly
// orchestration; the interesting rules live in the shared PO state machine and
// the receiving service. All queries are RLS-scoped by the caller's withTenant.
@Injectable()
export class PurchaseOrdersRepository {
  async insertHeader(tx: TxClient, h: {
    id: string; tenantId: string; supplierId: string; currency: string;
    expectedDate: string | null; shipToLocationId: string | null; notes: string | null; createdBy: string | null;
  }): Promise<any> {
    const res = await tx.query<any>(
      `INSERT INTO app.purchase_orders
         (id, tenant_id, supplier_id, status, currency, expected_date, ship_to_location_id, notes, created_by, updated_by)
       VALUES ($1,$2,$3,'draft',$4,$5,$6,$7,$8,$8) RETURNING *`,
      [h.id, h.tenantId, h.supplierId, h.currency.toUpperCase(), h.expectedDate, h.shipToLocationId, h.notes, h.createdBy],
    );
    return res.rows[0];
  }

  async insertLine(tx: TxClient, l: {
    id: string; tenantId: string; purchaseOrderId: string; lineNo: number; itemId: string;
    supplierItemId: string | null; description: string; qtyOrdered: number; unitCostMinor: string;
    vatRatePct: string; netMinor: string; vatMinor: string; grossMinor: string;
  }): Promise<any> {
    const res = await tx.query<any>(
      `INSERT INTO app.purchase_order_lines
         (id, tenant_id, purchase_order_id, line_no, item_id, supplier_item_id, description,
          qty_ordered, unit_cost_minor, vat_rate_pct, net_minor, vat_minor, gross_minor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [l.id, l.tenantId, l.purchaseOrderId, l.lineNo, l.itemId, l.supplierItemId, l.description,
       l.qtyOrdered, l.unitCostMinor, l.vatRatePct, l.netMinor, l.vatMinor, l.grossMinor],
    );
    return res.rows[0];
  }

  async header(tx: TxClient, id: string): Promise<any | null> {
    const res = await tx.query<any>(`SELECT * FROM app.purchase_orders WHERE id = $1`, [id]);
    return res.rowCount > 0 ? res.rows[0] : null;
  }

  async lines(tx: TxClient, poId: string): Promise<any[]> {
    const res = await tx.query<any>(
      `SELECT * FROM app.purchase_order_lines WHERE purchase_order_id = $1 ORDER BY line_no`, [poId]);
    return res.rows;
  }

  async list(tx: TxClient, opts: { status?: string; supplierId?: string; limit: number }): Promise<any[]> {
    const res = await tx.query<any>(
      `SELECT po.*, s.name AS supplier_name
         FROM app.purchase_orders po JOIN app.suppliers s ON s.id = po.supplier_id
        WHERE ($1::text IS NULL OR po.status = $1)
          AND ($2::uuid IS NULL OR po.supplier_id = $2)
        ORDER BY po.created_at DESC LIMIT $3`,
      [opts.status ?? null, opts.supplierId ?? null, opts.limit],
    );
    return res.rows;
  }

  async setStatus(tx: TxClient, id: string, status: string, number: string | null, updatedBy: string | null): Promise<any> {
    const res = await tx.query<any>(
      `UPDATE app.purchase_orders
          SET status = $2, number = COALESCE($3, number), updated_by = $4, version = version + 1
        WHERE id = $1 RETURNING *`,
      [id, status, number, updatedBy],
    );
    return res.rows[0];
  }

  async setTotals(tx: TxClient, id: string, t: { net: string; vat: string; gross: string }): Promise<void> {
    await tx.query(
      `UPDATE app.purchase_orders SET total_net_minor=$2, total_vat_minor=$3, total_gross_minor=$4 WHERE id=$1`,
      [id, t.net, t.vat, t.gross]);
  }

  // Advance a PO line's received quantity (called by the receiving service).
  async addReceived(tx: TxClient, poLineId: string, qty: number): Promise<void> {
    await tx.query(`UPDATE app.purchase_order_lines SET qty_received = qty_received + $2 WHERE id = $1`,
      [poLineId, qty]);
  }
}
