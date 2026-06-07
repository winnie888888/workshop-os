/**
 * Maps an issued invoice (header + lines + VAT breakdown) onto the Minimax
 * issued-invoice shape. Mirrors the A-SPRINT Minimax export: document number,
 * partner reference, dates, per-rate VAT, and the reverse-charge flag/note so
 * the accountant's ledger matches what we printed (Master Blueprint §9).
 */
export interface MinimaxInvoicePayload {
  externalRef: string;
  documentNumber: string;
  kind: 'invoice' | 'credit_note';
  partnerExternalRef: string;
  minimaxPartnerId: string | null;
  currency: string;
  issueDate: string;
  dueDate: string;
  reverseCharge: boolean;
  vatNote: string | null;
  netMinor: string;
  vatMinor: string;
  grossMinor: string;
  lines: Array<{
    description: string; quantity: string; unitPriceMinor: string;
    vatRatePct: string; netMinor: string; vatMinor: string;
  }>;
  vatBreakdown: Array<{ ratePct: string; reverseCharge: boolean; netMinor: string; vatMinor: string }>;
}

export function toMinimaxInvoice(
  header: any,
  customer: { id: string; minimaxPartnerId: string | null },
  lines: any[],
  breakdown: any[],
): MinimaxInvoicePayload {
  return {
    externalRef: header.id,
    documentNumber: header.number,
    kind: header.kind,
    partnerExternalRef: customer.id,
    minimaxPartnerId: customer.minimaxPartnerId,
    currency: header.currency,
    issueDate: header.issueDate,
    dueDate: header.dueDate,
    reverseCharge: header.reverseCharge,
    vatNote: header.vatNote,
    netMinor: header.totalNetMinor,
    vatMinor: header.totalVatMinor,
    grossMinor: header.totalGrossMinor,
    lines: lines.map((l) => ({
      description: l.description, quantity: String(l.quantity),
      unitPriceMinor: String(l.unit_price_minor), vatRatePct: String(l.vat_rate_pct),
      netMinor: String(l.net_minor), vatMinor: String(l.vat_minor),
    })),
    vatBreakdown: breakdown.map((g) => ({
      ratePct: String(g.rate_pct), reverseCharge: g.reverse_charge,
      netMinor: String(g.net_minor), vatMinor: String(g.vat_minor),
    })),
  };
}
