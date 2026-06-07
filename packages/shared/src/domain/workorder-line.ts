/**
 * Work-order line pricing (PRD §4.4 lines, §6 VAT).
 *
 * Every line on a work order — a labour entry, a part, a sublet, a fee — has to
 * resolve to four exact money figures: the gross-of-discount amount, the
 * discount, the net (taxable) amount, and the VAT portion. Getting this right
 * is what makes the eventual invoice both correct and auditable, so we compute
 * it here on top of the already-tested Money primitives and never with floats.
 *
 * Worked example to keep the intent concrete: 2.5 hours of labour at EUR 65.00,
 * with a 10% line discount, at 22% Slovenian VAT.
 *   base   = 65.00 * 2.5            = 162.50
 *   disc   = 10% of 162.50          =  16.25
 *   net    = 162.50 - 16.25         = 146.25
 *   vat    = 22% of 146.25          =  32.175 -> 32.18  (rounded once)
 *   gross  = 146.25 + 32.18         = 178.43
 *
 * The VAT *rate* applied here is supplied by the caller; deciding *which* rate
 * or treatment applies (domestic, reverse charge, export) is the job of the
 * deterministic VAT engine in a later phase, never of this arithmetic and never
 * of an AI model.
 */

import * as Money from "../money";

export interface LinePriceInput {
  unitPrice: Money.Money; // price per unit (e.g. per hour, per piece)
  quantity: string; // decimal string, e.g. "2.5", "1", "0.75"
  discountPct: string; // decimal string, e.g. "0", "10", "7.5"
  vatRatePct: string; // decimal string, e.g. "22", "9.5", "0"
}

export interface LinePrice {
  base: Money.Money; // unitPrice * quantity, before discount
  discount: Money.Money; // the discount amount
  net: Money.Money; // taxable amount = base - discount
  vat: Money.Money; // VAT portion on the net
  gross: Money.Money; // net + vat
}

export function priceLine(input: LinePriceInput): LinePrice {
  const base = Money.multiplyByQuantity(input.unitPrice, input.quantity);
  const discount = Money.percentage(base, input.discountPct);
  const net = Money.subtract(base, discount);
  const vat = Money.percentage(net, input.vatRatePct);
  const gross = Money.add(net, vat);
  return { base, discount, net, vat, gross };
}

/**
 * Roll up many lines into work-order totals. We sum net and VAT independently
 * and derive gross from those sums, which matches how the invoice must present
 * its tax breakdown (sum of nets, then VAT per rate). All lines must share a
 * currency; mixing currencies on one work order is a domain error caught by the
 * Money primitives.
 */
export interface OrderTotals {
  net: Money.Money;
  vat: Money.Money;
  gross: Money.Money;
}

export function sumTotals(lines: LinePrice[], currency: string): OrderTotals {
  let net = Money.zero(currency);
  let vat = Money.zero(currency);
  for (const l of lines) {
    net = Money.add(net, l.net);
    vat = Money.add(vat, l.vat);
  }
  return { net, vat, gross: Money.add(net, vat) };
}
