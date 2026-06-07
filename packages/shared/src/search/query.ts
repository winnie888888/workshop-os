/**
 * Search query intelligence — the pure logic behind the advisor's global
 * command bar. The backend search endpoint runs the database queries, but the
 * decisions that make search feel instant live here and are tested:
 *
 *  1. Normalising the raw input (trimming, casing, stripping plate separators).
 *  2. Classifying what the advisor is most likely looking for — a VIN, a
 *     vehicle plate, a work-order number, a VAT id, or free text — so the
 *     backend can target the right columns first instead of scanning everything.
 *  3. Ranking heterogeneous results (customers, vehicles, work orders) into one
 *     list, with exact-identifier matches floating above fuzzy name matches.
 *
 * Keeping this deterministic and dependency-free means "why did the wrong thing
 * come first" is answerable by a test, not by guesswork.
 */

export type QueryIntent = "vin" | "plate" | "work_order" | "vat_id" | "text";

/** Collapse whitespace; preserve case for display, l-case a normalized copy. */
export function normalizeQuery(raw: string): { display: string; normalized: string } {
  const display = raw.trim().replace(/\s+/g, " ");
  const normalized = display.toLowerCase();
  return { display, normalized };
}

/** A plate stripped of spaces/dashes and upper-cased, for column matching. */
export function normalizePlate(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, "");
}

/**
 * Classify the query. The heuristics are intentionally conservative: a 17-char
 * alphanumeric string with no I/O/Q is almost certainly a VIN; a leading WO or
 * a pure document-number shape signals a work order; a country-prefixed digit
 * run looks like a VAT id; an alnum token of plate length is treated as a plate;
 * everything else is free text (name search).
 */
export function classifyQuery(raw: string): QueryIntent {
  const q = raw.trim();
  if (q.length === 0) return "text";

  const compact = q.replace(/[\s-]/g, "");

  // VIN: 17 chars, alphanumeric, excluding I, O, Q (ISO 3779).
  if (/^[A-HJ-NPR-Z0-9]{17}$/i.test(compact)) return "vin";

  // Work order: explicit WO prefix, or a year-sequence document number.
  if (/^wo[-_ ]?\d+/i.test(q) || /^\d{4}-\d{3,}$/.test(q)) return "work_order";

  // VAT id: 2-letter country code followed by 8–12 digits/letters.
  if (/^[A-Z]{2}[A-Z0-9]{8,12}$/i.test(compact)) return "vat_id";

  // Plate: short alphanumeric token (with optional separators), not all digits.
  if (/^[A-Z0-9-\s]{4,10}$/i.test(q) && /[A-Z]/i.test(compact) && /\d/.test(compact)) {
    return "plate";
  }

  return "text";
}

export interface SearchHit {
  type: "customer" | "vehicle" | "work_order";
  id: string;
  /** Primary label (customer name, plate, or WO number). */
  label: string;
  /** Secondary line (town, make/model, customer name). */
  sublabel?: string;
  /** True when an identifier column matched exactly (vs a partial name match). */
  exact: boolean;
}

/**
 * Rank merged results. Exact identifier hits come first; within a tier we order
 * by how well the hit type matches the detected intent (a plate query prefers
 * vehicles), then alphabetically for stability.
 */
export function rankHits(hits: SearchHit[], intent: QueryIntent): SearchHit[] {
  const intentType =
    intent === "vin" || intent === "plate" ? "vehicle"
    : intent === "work_order" ? "work_order"
    : intent === "vat_id" ? "customer"
    : null;

  return [...hits].sort((a, b) => {
    if (a.exact !== b.exact) return a.exact ? -1 : 1;
    const aMatch = intentType && a.type === intentType ? 0 : 1;
    const bMatch = intentType && b.type === intentType ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return a.label.localeCompare(b.label);
  });
}
