/**
 * Invoice composition (PRD §6, Master Blueprint §10).
 *
 * An invoice is not just "sum the lines". For VAT it must group the net amounts
 * by the rate that actually applies and compute the tax once per rate, because
 * that per-rate breakdown is exactly what the invoice must show and what the VAT
 * return aggregates. Rounding VAT per rate (not per line) is the convention that
 * keeps the printed tax total reconcilable with the authority's expectation.
 *
 * Each input line has already been priced (net) and already had its VAT
 * treatment decided by the VAT engine, which gives us the *effective* rate
 * (0 for reverse charge / export). We group by effective rate, sum nets, apply
 * the rate once, and total.
 */

import * as Money from "../money";

export interface InvoiceLineInput {
  description: string;
  netMinor: bigint; // already net of discount, in minor units
  effectiveRatePct: string; // decimal string from the VAT engine, e.g. "22", "0"
  reverseCharge: boolean;
}

export interface VatGroup {
  ratePct: string;
  reverseCharge: boolean;
  netMinor: bigint;
  vatMinor: bigint;
}

export interface InvoiceTotals {
  currency: string;
  netMinor: bigint;
  vatMinor: bigint;
  grossMinor: bigint;
  /** One entry per distinct effective rate; the invoice prints this breakdown. */
  vatBreakdown: VatGroup[];
}

export function composeInvoiceTotals(currency: string, lines: InvoiceLineInput[]): InvoiceTotals {
  // Group nets by (rate, reverseCharge). A 0% reverse-charge group is reported
  // separately from a genuine 0% export group because the legal note differs.
  const groups = new Map<string, { ratePct: string; reverseCharge: boolean; net: bigint }>();
  for (const l of lines) {
    const key = `${l.effectiveRatePct}|${l.reverseCharge ? "rc" : "std"}`;
    const g = groups.get(key) ?? { ratePct: l.effectiveRatePct, reverseCharge: l.reverseCharge, net: 0n };
    g.net += l.netMinor;
    groups.set(key, g);
  }

  const vatBreakdown: VatGroup[] = [];
  let netTotal = 0n;
  let vatTotal = 0n;
  // Stable, deterministic ordering: highest rate first, std before rc.
  const ordered = [...groups.values()].sort((a, b) => {
    const ra = Number(a.ratePct);
    const rb = Number(b.ratePct);
    if (rb !== ra) return rb - ra;
    return Number(a.reverseCharge) - Number(b.reverseCharge);
  });
  for (const g of ordered) {
    const net = Money.money(currency, g.net);
    const vat = Money.percentage(net, g.ratePct); // rounded once per rate
    netTotal += g.net;
    vatTotal += vat.minor;
    vatBreakdown.push({ ratePct: g.ratePct, reverseCharge: g.reverseCharge, netMinor: g.net, vatMinor: vat.minor });
  }

  return {
    currency,
    netMinor: netTotal,
    vatMinor: vatTotal,
    grossMinor: netTotal + vatTotal,
    vatBreakdown,
  };
}

/**
 * A credit note reverses (all or part of) an invoice. Amounts are the negatives
 * of what is being credited; the structure is identical so it prints and posts
 * the same way. We never mutate the original invoice — corrections always flow
 * through a credit note (PRD §6, immutability of issued documents).
 */
export function creditOf(totals: InvoiceTotals): InvoiceTotals {
  return {
    currency: totals.currency,
    netMinor: -totals.netMinor,
    vatMinor: -totals.vatMinor,
    grossMinor: -totals.grossMinor,
    vatBreakdown: totals.vatBreakdown.map((g) => ({
      ratePct: g.ratePct,
      reverseCharge: g.reverseCharge,
      netMinor: -g.netMinor,
      vatMinor: -g.vatMinor,
    })),
  };
}
