import { Injectable } from '@nestjs/common';
import type { TxClient } from '../../common/db/pg.service';

// Goods-receipt persistence. A GRN is created as a draft (manual or OCR) and
// later posted; posting is where stock actually moves (in the service, via the
// inventory chokepoint). This repo only reads/writes the GRN tables.
@Injectable()
export class GoodsReceiptsRepository {
  async insertHeader(tx: TxClient, h: {
    id: string; tenantId: string; supplierId: string; purchaseOrderId: string | null;
    deliveryNoteRef: string | null; source: string; ocrAttachmentId: string | null;
    ocrConfidence: number | null; receivedBy: string | null; notes: string | null;
  }): Promise<any> {
    const res = await tx.query<any>(
      `INSERT INTO app.goods_receipts
         (id, tenant_id, supplier_id, purchase_order_id, delivery_note_ref, source,
          ocr_attachment_id, ocr_confidence, received_by, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft') RETURNING *`,
      [h.id, h.tenantId, h.supplierId, h.purchaseOrderId, h.deliveryNoteRef, h.source,
       h.ocrAttachmentId, h.ocrConfidence, h.receivedBy, h.notes],
    );
    return res.rows[0];
  }

  async insertLine(tx: TxClient, l: {
    id: string; tenantId: string; goodsReceiptId: string; lineNo: number;
    purchaseOrderLineId: string | null; itemId: string; locationId: string; qty: number;
    unitCostMinor: string; ocrRawText: string | null; ocrConfidence: number | null; matchStatus: string;
  }): Promise<any> {
    const res = await tx.query<any>(
      `INSERT INTO app.goods_receipt_lines
         (id, tenant_id, goods_receipt_id, line_no, purchase_order_line_id, item_id,
          location_id, qty, unit_cost_minor, ocr_raw_text, ocr_confidence, match_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [l.id, l.tenantId, l.goodsReceiptId, l.lineNo, l.purchaseOrderLineId, l.itemId,
       l.locationId, l.qty, l.unitCostMinor, l.ocrRawText, l.ocrConfidence, l.matchStatus],
    );
    return res.rows[0];
  }

  async header(tx: TxClient, id: string): Promise<any | null> {
    const res = await tx.query<any>(`SELECT * FROM app.goods_receipts WHERE id = $1 FOR UPDATE`, [id]);
    return res.rowCount > 0 ? res.rows[0] : null;
  }

  async lines(tx: TxClient, grnId: string): Promise<any[]> {
    const res = await tx.query<any>(
      `SELECT * FROM app.goods_receipt_lines WHERE goods_receipt_id = $1 ORDER BY line_no`, [grnId]);
    return res.rows;
  }

  async setLineMovement(tx: TxClient, lineId: string, movementId: string): Promise<void> {
    await tx.query(`UPDATE app.goods_receipt_lines SET movement_id = $2 WHERE id = $1`, [lineId, movementId]);
  }

  async setStatus(tx: TxClient, id: string, status: string, number: string | null): Promise<any> {
    const res = await tx.query<any>(
      `UPDATE app.goods_receipts SET status = $2, number = COALESCE($3, number) WHERE id = $1 RETURNING *`,
      [id, status, number]);
    return res.rows[0];
  }

  async list(tx: TxClient, opts: { status?: string; limit: number }): Promise<any[]> {
    const res = await tx.query<any>(
      `SELECT g.*, s.name AS supplier_name FROM app.goods_receipts g
         JOIN app.suppliers s ON s.id = g.supplier_id
        WHERE ($1::text IS NULL OR g.status = $1)
        ORDER BY g.created_at DESC LIMIT $2`,
      [opts.status ?? null, opts.limit]);
    return res.rows;
  }
}
