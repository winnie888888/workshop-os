import { Injectable } from '@nestjs/common';
import { getContext, Money, Receivables } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';

/**
 * Financial reporting (PRD §11, Master Blueprint §12).
 *
 * These are read-only aggregations the owner and accountant live in: the VAT
 * report (output VAT per rate for a period, the basis of the return), the AR
 * aging (who owes what and how overdue), and revenue/profitability. We reuse
 * the tested AR core for aging so the report and the dunning logic agree.
 */
@Injectable()
export class ReportingService {
  constructor(private readonly pg: PgService) {}

  /** Output VAT grouped per rate for issued documents in [from, to]. */
  async vatReport(from: string, to: string) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const res = await tx.query<any>(
        `SELECT b.rate_pct, b.reverse_charge,
                SUM(b.net_minor) AS net, SUM(b.vat_minor) AS vat
           FROM app.invoice_vat_breakdown b
           JOIN app.invoices i ON i.id = b.invoice_id
          WHERE i.issue_date BETWEEN $1 AND $2
            AND i.status <> 'draft'
            AND i.kind IN ('invoice','credit_note')
          GROUP BY b.rate_pct, b.reverse_charge
          ORDER BY b.rate_pct DESC`,
        [from, to],
      );
      const groups = res.rows.map((r: any) => ({
        ratePct: String(r.rate_pct), reverseCharge: r.reverse_charge,
        netMinor: String(r.net), vatMinor: String(r.vat),
        net: Money.format(Money.money('EUR', BigInt(r.net))),
        vat: Money.format(Money.money('EUR', BigInt(r.vat))),
      }));
      const totalVat = res.rows.reduce((a: bigint, r: any) => a + BigInt(r.vat), 0n);
      const totalNet = res.rows.reduce((a: bigint, r: any) => a + BigInt(r.net), 0n);
      return { from, to, groups, totalNetMinor: totalNet.toString(), totalVatMinor: totalVat.toString() };
    });
  }

  /** AR aging across all customers as of a date (defaults to today). */
  async arAging(asOf?: string) {
    const ctx = getContext();
    const at = asOf ?? new Date().toISOString().slice(0, 10);
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const res = await tx.query<any>(
        `SELECT id, issue_date, due_date, (total_gross_minor - paid_minor) AS outstanding
           FROM app.invoices
          WHERE kind = 'invoice'
            AND status IN ('issued','sent','partly_paid','overdue')
            AND (total_gross_minor - paid_minor) > 0`,
      );
      const open: Receivables.OpenInvoice[] = res.rows.map((r: any) => ({
        invoiceId: r.id, issuedAt: dateStr(r.issue_date), dueAt: dateStr(r.due_date),
        outstandingMinor: BigInt(r.outstanding),
      }));
      const b = Receivables.ageReceivables('EUR', open, at);
      return {
        asOf: at,
        buckets: {
          current: b.current.toString(), d1_30: b.d1_30.toString(), d31_60: b.d31_60.toString(),
          d61_90: b.d61_90.toString(), d90_plus: b.d90_plus.toString(), total: b.totalMinor.toString(),
        },
        formatted: {
          current: fmt(b.current), d1_30: fmt(b.d1_30), d31_60: fmt(b.d31_60),
          d61_90: fmt(b.d61_90), d90_plus: fmt(b.d90_plus), total: fmt(b.totalMinor),
        },
      };
    });
  }

  /** Revenue and gross margin over a period (invoiced revenue vs labour cost). */
  async revenue(from: string, to: string) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const rev = await tx.query<any>(
        `SELECT COALESCE(SUM(total_net_minor),0) net, COALESCE(SUM(total_vat_minor),0) vat,
                COALESCE(SUM(total_gross_minor),0) gross, COUNT(*) docs
           FROM app.invoices
          WHERE issue_date BETWEEN $1 AND $2 AND status <> 'draft'
            AND kind IN ('invoice','credit_note')`,
        [from, to],
      );
      const r = rev.rows[0];
      return {
        from, to, documents: Number(r.docs),
        netMinor: String(r.net), vatMinor: String(r.vat), grossMinor: String(r.gross),
        net: fmt(BigInt(r.net)), gross: fmt(BigInt(r.gross)),
      };
    });
  }
}

function dateStr(v: any): string { return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10); }
function fmt(minor: bigint): string { return Money.format(Money.money('EUR', minor)); }
