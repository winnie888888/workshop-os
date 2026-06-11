import { Injectable } from '@nestjs/common';
import type { TxClient } from '../../common/db/pg.service';

export interface InvoiceHeader {
  id: string; kind: string; number: string | null; status: string;
  workOrderId: string | null; customerId: string; correctsInvoiceId: string | null;
  currency: string; vatTreatment: string | null; reverseCharge: boolean; vatNote: string | null;
  totalNetMinor: string; totalVatMinor: string; totalGrossMinor: string; paidMinor: string;
  issueDate: string | null; dueDate: string | null; minimaxInvoiceId: string | null; version: number;
}

function toHeader(r: any): InvoiceHeader {
  return {
    id: r.id, kind: r.kind, number: r.number, status: r.status,
    workOrderId: r.work_order_id, customerId: r.customer_id, correctsInvoiceId: r.corrects_invoice_id,
    currency: r.currency, vatTreatment: r.vat_treatment, reverseCharge: r.reverse_charge, vatNote: r.vat_note,
    totalNetMinor: String(r.total_net_minor), totalVatMinor: String(r.total_vat_minor),
    totalGrossMinor: String(r.total_gross_minor), paidMinor: String(r.paid_minor),
    issueDate: r.issue_date ? toDate(r.issue_date) : null, dueDate: r.due_date ? toDate(r.due_date) : null,
    minimaxInvoiceId: r.minimax_invoice_id, version: r.version,
  };
}

@Injectable()
export class InvoicesRepository {
  async insertHeader(tx: TxClient, h: {
    id: string; tenantId: string; kind: string; number: string; workOrderId: string | null;
    customerId: string; correctsInvoiceId: string | null; currency: string;
    vatTreatment: string | null; reverseCharge: boolean; vatNote: string | null;
    netMinor: bigint; vatMinor: bigint; grossMinor: bigint;
    issueDate: string; dueDate: string; createdBy: string | null;
  }): Promise<InvoiceHeader> {
    const res = await tx.query<any>(
      `INSERT INTO app.invoices
         (id, tenant_id, kind, number, status, work_order_id, customer_id, corrects_invoice_id,
          currency, vat_treatment, reverse_charge, vat_note,
          total_net_minor, total_vat_minor, total_gross_minor,
          issue_date, due_date, issued_at, issued_by, created_by)
       VALUES ($1,$2,$3,$4,'issued',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now(),$17,$17)
       RETURNING *`,
      [
        h.id, h.tenantId, h.kind, h.number, h.workOrderId, h.customerId, h.correctsInvoiceId,
        h.currency, h.vatTreatment, h.reverseCharge, h.vatNote,
        h.netMinor.toString(), h.vatMinor.toString(), h.grossMinor.toString(),
        h.issueDate, h.dueDate, h.createdBy,
      ],
    );
    return toHeader(res.rows[0]);
  }

  async insertLine(tx: TxClient, l: {
    id: string; tenantId: string; invoiceId: string; lineNo: number; type: string; description: string;
    quantity: string; unitPriceMinor: bigint; discountPct: string; vatRatePct: string; reverseCharge: boolean;
    netMinor: bigint; vatMinor: bigint; grossMinor: bigint;
    /** Zbirni račun: izvorni delovni nalog te vrstice (0029); enojni tok pušča NULL. */
    workOrderId?: string | null;
  }): Promise<void> {
    await tx.query(
      `INSERT INTO app.invoice_lines
         (id, tenant_id, invoice_id, line_no, type, description, quantity, unit_price_minor,
          discount_pct, vat_rate_pct, reverse_charge, net_minor, vat_minor, gross_minor, work_order_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        l.id, l.tenantId, l.invoiceId, l.lineNo, l.type, l.description, l.quantity,
        l.unitPriceMinor.toString(), l.discountPct, l.vatRatePct, l.reverseCharge,
        l.netMinor.toString(), l.vatMinor.toString(), l.grossMinor.toString(),
        l.workOrderId ?? null,
      ],
    );
  }

  async insertVatGroup(tx: TxClient, g: {
    tenantId: string; invoiceId: string; ratePct: string; reverseCharge: boolean; netMinor: bigint; vatMinor: bigint;
  }): Promise<void> {
    await tx.query(
      `INSERT INTO app.invoice_vat_breakdown (id, tenant_id, invoice_id, rate_pct, reverse_charge, net_minor, vat_minor)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6)`,
      [g.tenantId, g.invoiceId, g.ratePct, g.reverseCharge, g.netMinor.toString(), g.vatMinor.toString()],
    );
  }

  async findHeader(tx: TxClient, id: string): Promise<InvoiceHeader | null> {
    const res = await tx.query<any>(`SELECT * FROM app.invoices WHERE id = $1`, [id]);
    return res.rowCount > 0 ? toHeader(res.rows[0]) : null;
  }

  async findHeaderForUpdate(tx: TxClient, id: string): Promise<InvoiceHeader | null> {
    const res = await tx.query<any>(`SELECT * FROM app.invoices WHERE id = $1 FOR UPDATE`, [id]);
    return res.rowCount > 0 ? toHeader(res.rows[0]) : null;
  }

  async listByCustomer(tx: TxClient, customerId: string, limit = 100): Promise<InvoiceHeader[]> {
    const res = await tx.query<any>(
      `SELECT * FROM app.invoices
        WHERE customer_id = $1
        ORDER BY issue_date DESC NULLS LAST, id DESC
        LIMIT $2`,
      [customerId, limit],
    );
    return res.rows.map(toHeader);
  }

  async listLines(tx: TxClient, invoiceId: string): Promise<any[]> {
    const res = await tx.query<any>(
      `SELECT * FROM app.invoice_lines WHERE invoice_id = $1 ORDER BY line_no`, [invoiceId]);
    return res.rows;
  }

  async listVatBreakdown(tx: TxClient, invoiceId: string): Promise<any[]> {
    const res = await tx.query<any>(
      `SELECT rate_pct, reverse_charge, net_minor, vat_minor
         FROM app.invoice_vat_breakdown WHERE invoice_id = $1 ORDER BY rate_pct DESC`, [invoiceId]);
    return res.rows;
  }

  /** Open invoices for a customer (issued and not fully paid). */
  async openForCustomer(tx: TxClient, customerId: string): Promise<Array<{
    invoiceId: string; issuedAt: string; dueAt: string; outstandingMinor: bigint;
  }>> {
    const res = await tx.query<any>(
      `SELECT id, issue_date, due_date, (total_gross_minor - paid_minor) AS outstanding
         FROM app.invoices
        WHERE customer_id = $1 AND kind = 'invoice'
          AND status IN ('issued','sent','partly_paid','overdue')
          AND (total_gross_minor - paid_minor) > 0
        ORDER BY due_date`,
      [customerId],
    );
    return res.rows.map((r: any) => ({
      invoiceId: r.id, issuedAt: toDate(r.issue_date), dueAt: toDate(r.due_date),
      outstandingMinor: BigInt(r.outstanding),
    }));
  }

  async applyPayment(tx: TxClient, invoiceId: string, appliedMinor: bigint): Promise<void> {
    // Advance paid_minor and recompute status. Immutability trigger allows
    // status/paid changes (only financial/number/date fields are frozen).
    await tx.query(
      `UPDATE app.invoices
          SET paid_minor = paid_minor + $2,
              status = CASE
                         WHEN paid_minor + $2 >= total_gross_minor THEN 'paid'
                         ELSE 'partly_paid'
                       END,
              version = version + 1,
              updated_at = now()
        WHERE id = $1`,
      [invoiceId, appliedMinor.toString()],
    );
  }

  async markStatus(tx: TxClient, id: string, status: string): Promise<void> {
    await tx.query(
      `UPDATE app.invoices SET status = $2, version = version + 1, updated_at = now() WHERE id = $1`,
      [id, status],
    );
  }

  async setMinimaxId(tx: TxClient, id: string, minimaxInvoiceId: string): Promise<void> {
    await tx.query(`UPDATE app.invoices SET minimax_invoice_id = $2 WHERE id = $1`, [id, minimaxInvoiceId]);
  }
}

function toDate(v: any): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}
