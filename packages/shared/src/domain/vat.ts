/**
 * VAT engine (PRD §6, Master Blueprint §10).
 *
 * Deciding how much VAT to charge is the part of invoicing that is both legally
 * load-bearing and easy to get wrong, so it is a *deterministic* engine here —
 * never an AI guess. The engine answers one question per line: given who the
 * supplier is, who the customer is, and what we are supplying, what VAT
 * treatment applies and therefore what rate actually lands on the invoice?
 *
 * The cases that matter for a Slovenian commercial-vehicle workshop serving
 * cross-border hauliers (the A-SPRINT reality) are:
 *
 *   1. Domestic (customer in SI): normal Slovenian VAT at the line's rate
 *      (22% standard, 9.5% reduced for the few qualifying items).
 *
 *   2. B2B customer in another EU country with a VALID VAT ID: a repair service
 *      on a vehicle for a taxable person falls under the general place-of-supply
 *      rule (Art 44 VAT Directive) — supplied where the customer belongs — so SI
 *      charges 0 and the customer self-accounts. This is "reverse charge", and
 *      it is the common case for A-SPRINT's foreign hauliers.
 *
 *   3. EU customer who is NOT a taxable person (B2C): work physically carried
 *      out on movable tangible property is taxed where performed (Art 54) — i.e.
 *      Slovenian VAT applies.
 *
 *   4. Customer outside the EU, B2B: general rule places supply outside the EU,
 *      so the supply is outside the scope of SI VAT (0). Goods exported are
 *      zero-rated.
 *
 *   5. Reverse charge requires a *validated* VAT ID (VIES). If we only have a
 *      structurally plausible id we have not yet validated, the engine refuses
 *      to apply reverse charge on its own authority and asks a human to confirm,
 *      defaulting to the safe choice of charging domestic VAT meanwhile.
 *
 * The engine returns the treatment, the rate that actually applies, whether it
 * is a reverse charge, a legal note for the invoice, and — crucially — whether
 * a human must confirm before issuing.
 */

import { VatTreatment, isEuCountry } from "./enums";

export type SupplyKind = "service" | "goods";

export interface VatContext {
  supplierCountry: string; // the tenant's country (e.g. "SI")
  customerCountry: string; // ISO 3166-1 alpha-2
  customerIsBusiness: boolean; // taxable person?
  customerVatId: string | null; // as held
  customerVatIdValidated: boolean; // confirmed via VIES?
}

export interface LineVatInput {
  kind: SupplyKind;
  /** The line's domestic rate as a decimal string, e.g. "22", "9.5". */
  domesticRatePct: string;
}

export interface VatDecision {
  treatment: VatTreatment;
  /** The rate that actually lands on the invoice line (0 for RC/export). */
  effectiveRatePct: string;
  reverseCharge: boolean;
  /** Legal note to print on the invoice for this treatment (or null). */
  note: string | null;
  /** True when a human must confirm before issuing (e.g. unvalidated VAT ID). */
  requiresHumanConfirmation: boolean;
  reason: string;
}

const RC_NOTE =
  "Reverse charge — VAT to be accounted for by the recipient (Art 44 / Art 196 Directive 2006/112/EC).";
const EXPORT_NOTE = "Outside the scope of Slovenian VAT (supply to a non-EU recipient).";

export function decideLineVat(ctx: VatContext, line: LineVatInput): VatDecision {
  const supplier = ctx.supplierCountry.toUpperCase();
  const customer = ctx.customerCountry.toUpperCase();

  // Case 1 — domestic supply: normal SI VAT at the line's own rate.
  if (customer === supplier) {
    return {
      treatment: VatTreatment.StandardSiVat,
      effectiveRatePct: line.domesticRatePct,
      reverseCharge: false,
      note: null,
      requiresHumanConfirmation: false,
      reason: "Domestic supply taxed at the standard/reduced national rate.",
    };
  }

  const customerInEu = isEuCountry(customer);

  // Case 4 — customer outside the EU.
  if (!customerInEu) {
    if (ctx.customerIsBusiness) {
      return {
        treatment: VatTreatment.ExportZero,
        effectiveRatePct: "0",
        reverseCharge: false,
        note: EXPORT_NOTE,
        requiresHumanConfirmation: false,
        reason: "B2B supply to a non-EU recipient is outside the scope of SI VAT.",
      };
    }
    // Non-EU consumer, service physically performed in SI: SI VAT applies.
    return {
      treatment: VatTreatment.StandardSiVat,
      effectiveRatePct: line.domesticRatePct,
      reverseCharge: false,
      note: null,
      requiresHumanConfirmation: true,
      reason:
        "Non-EU private customer; place of supply may vary by service — confirm treatment.",
    };
  }

  // Cases 2/3 — customer in another EU member state.
  if (ctx.customerIsBusiness) {
    const hasId = !!ctx.customerVatId;
    if (hasId && ctx.customerVatIdValidated) {
      return {
        treatment: VatTreatment.ReverseChargeEu,
        effectiveRatePct: "0",
        reverseCharge: true,
        note: RC_NOTE,
        requiresHumanConfirmation: false,
        reason:
          "Intra-EU B2B supply to a VAT-registered customer; general place-of-supply rule shifts VAT to the recipient.",
      };
    }
    // Business customer but we have not validated the VAT ID: do NOT apply
    // reverse charge on our own authority. Charge domestic VAT and flag.
    return {
      treatment: VatTreatment.StandardSiVat,
      effectiveRatePct: line.domesticRatePct,
      reverseCharge: false,
      note: null,
      requiresHumanConfirmation: true,
      reason: hasId
        ? "EU business VAT ID is not yet VIES-validated; reverse charge withheld pending confirmation."
        : "EU business customer without a VAT ID on file; cannot apply reverse charge.",
    };
  }

  // Case 3 — EU consumer (B2C): work on movable property taxed where performed.
  return {
    treatment: VatTreatment.StandardSiVat,
    effectiveRatePct: line.domesticRatePct,
    reverseCharge: false,
    note: null,
    requiresHumanConfirmation: false,
    reason: "EU private customer; work on movable property taxed where physically carried out (SI).",
  };
}

/**
 * A whole work order/invoice often mixes lines, but for one customer the
 * treatment is the same across lines (it depends on the parties, not the line).
 * This convenience decides once and returns whether the document as a whole
 * needs human confirmation.
 */
export function decideDocumentVat(
  ctx: VatContext,
  lines: LineVatInput[],
): { perLine: VatDecision[]; requiresHumanConfirmation: boolean; anyReverseCharge: boolean } {
  const perLine = lines.map((l) => decideLineVat(ctx, l));
  return {
    perLine,
    requiresHumanConfirmation: perLine.some((d) => d.requiresHumanConfirmation),
    anyReverseCharge: perLine.some((d) => d.reverseCharge),
  };
}

/* ----------------------------------------------------------------------------
 * VAT-ID parsing (Phase 4C). A VAT id carries its own country prefix; before we
 * validate one (via VIES or a manual attestation) we split it and check that
 * the prefix is consistent with the customer's country, because a mismatch
 * (e.g. an HR customer carrying an SI id) is a data error that would otherwise
 * silently drive the wrong VAT treatment. Pure and tested — no I/O here.
 * -------------------------------------------------------------------------- */

export interface ParsedVatId {
  /** Two-letter country prefix, uppercased (e.g. "HR"). */
  country: string;
  /** The numeric/alphanumeric body after the prefix (e.g. "47263849152"). */
  number: string;
}

/**
 * Split a VAT id into its country prefix and body, or return null if it is not
 * structurally a VAT id. Whitespace and dots are stripped first, since people
 * write "HR 4726 3849 152" and "SI-5896 2317".
 */
export function parseVatId(raw: string | null | undefined): ParsedVatId | null {
  if (!raw) return null;
  const cleaned = raw.toUpperCase().replace(/[\s.\-]/g, "");
  if (!/^[A-Z]{2}[0-9A-Z]{2,12}$/.test(cleaned)) return null;
  return { country: cleaned.slice(0, 2), number: cleaned.slice(2) };
}

/**
 * Does a VAT id's country prefix match the customer's country? Greece is the
 * one well-known wrinkle (ISO "GR" vs VAT prefix "EL"); we accept that pairing.
 * Returns false for a malformed id.
 */
export function vatIdCountryMatches(vatId: string | null | undefined, customerCountry: string): boolean {
  const parsed = parseVatId(vatId);
  if (!parsed) return false;
  const c = customerCountry.toUpperCase();
  if (parsed.country === c) return true;
  // Greece: ISO 3166 "GR" is written "EL" in VAT ids.
  if (c === "GR" && parsed.country === "EL") return true;
  return false;
}
