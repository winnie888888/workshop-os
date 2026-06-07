/**
 * OCR extraction — normalization (Phase 7).
 *
 * The AI gateway hands back whatever a multimodal model read off a photograph,
 * as a JSON string. That JSON is *untrusted and messy*: numbers come in mixed
 * European and English conventions ("1.234,56" vs "1,234.56" vs "1234.56"),
 * dates arrive in half a dozen layouts, quantities trail their units, and any
 * field may be missing. This module is the first half of the airlock: it turns
 * that messy raw text into clean, typed, range-checked values — and, critically,
 * it NEVER guesses silently. When a value cannot be parsed with confidence, it
 * says so, so the human-review step can flag it. Nothing here touches the
 * database, money ledger, or network; it is pure, deterministic, and tested by
 * execution.
 *
 * Why a separate module from matching: normalization reasons about ONE document
 * in isolation ("what number is this string?"); matching reasons about how that
 * document relates to OUR records ("which supplier is this?"). Different concerns,
 * separately testable.
 */

// ---------------------------------------------------------------------------
// The canonical shape a raw extraction is normalized INTO. Every field carries
// the model's confidence (0..1) so low-confidence values can be flagged. The
// raw string is always retained beside the parsed value, so a human reviewing
// the draft can see exactly what the model read, not just our interpretation.
// ---------------------------------------------------------------------------

export type DocumentKind = 'delivery_note' | 'supplier_invoice';

/** A single parsed value with provenance: what was read, what we made of it. */
export interface Field<T> {
  /** The exact text the model reported (for the reviewer to see). */
  raw: string | null;
  /** Our parsed interpretation, or null if it could not be parsed. */
  value: T | null;
  /** Model confidence 0..1, or null if the model gave none. */
  confidence: number | null;
}

/** One line item read off the document, before any catalogue matching. */
export interface ExtractedLine {
  /** The supplier's own part code printed on the note, if any. */
  supplierSku: Field<string>;
  /** A manufacturer/OEM reference, if printed. */
  oemRef: Field<string>;
  /** Free-text description of the part. */
  description: Field<string>;
  /** Quantity received (pieces, litres…). */
  quantity: Field<number>;
  /** Unit price in MINOR units (cents), net of VAT, if shown. */
  unitPriceMinor: Field<number>;
  /** Line total in MINOR units, if shown (used as a cross-check). */
  lineTotalMinor: Field<number>;
  /** VAT rate percent as a string ("22"), if visible. */
  vatRatePct: Field<string>;
}

/** A whole document, normalized. */
export interface ExtractedDocument {
  kind: DocumentKind;
  supplierName: Field<string>;
  supplierVatId: Field<string>;
  /** Generic document number (whatever the model called the main number). */
  documentNumber: Field<string>;
  /** Delivery-note-specific number, when distinct. */
  deliveryNoteNumber: Field<string>;
  /** Invoice-specific number, when distinct. */
  invoiceNumber: Field<string>;
  /** Referenced purchase-order number, if the supplier printed ours. */
  purchaseOrderRef: Field<string>;
  /** Document date as ISO yyyy-mm-dd. */
  date: Field<string>;
  /** Grand total in MINOR units, if shown (cross-check against line sum). */
  totalGrossMinor: Field<number>;
  totalNetMinor: Field<number>;
  lines: ExtractedLine[];
  /** Overall extraction confidence the gateway reported (0..1) or null. */
  overallConfidence: number | null;
}

// ---------------------------------------------------------------------------
// Number parsing — the trickiest part, because European and English decimal
// conventions collide. We decide the decimal separator by INSPECTING the
// string rather than assuming a locale, which is the only robust approach when
// suppliers span SI/HR/DE/AT/PL and each prints differently.
// ---------------------------------------------------------------------------

/**
 * Parse a human-written amount into a Number (major units, e.g. 1234.56).
 * Returns null when the string is not a confident number.
 *
 * Strategy: strip currency symbols and spaces, then look at the last separator.
 * - "1.234,56"  -> last sep is ',' => ',' is decimal, '.' is thousands -> 1234.56
 * - "1,234.56"  -> last sep is '.' => '.' is decimal, ',' is thousands -> 1234.56
 * - "1234,56"   -> only ',' present, 2 trailing digits => decimal      -> 1234.56
 * - "1.234"     -> only '.' present, 3 trailing digits => thousands     -> 1234
 * - "1234"      -> no separators                                        -> 1234
 * The "3 trailing digits with a single dot and no comma" case is the classic
 * European thousands trap ("1.234" means 1234, not 1.234), handled explicitly.
 */
export function parseAmount(input: string | null | undefined): number | null {
  if (input == null) return null;
  // Keep digits, separators, and a leading minus; drop currency words/symbols.
  let s = String(input).trim().replace(/[^\d.,-]/g, '');
  if (s.length === 0) return null;
  const negative = s.startsWith('-');
  s = s.replace(/-/g, '');
  if (s.length === 0) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  let normalized: string;
  if (lastComma === -1 && lastDot === -1) {
    normalized = s; // pure integer
  } else if (lastComma > -1 && lastDot > -1) {
    // Both present: the LAST one is the decimal separator, the other is grouping.
    if (lastComma > lastDot) {
      normalized = s.replace(/\./g, '').replace(',', '.'); // European
    } else {
      normalized = s.replace(/,/g, ''); // English
    }
  } else if (lastComma > -1) {
    // Only commas. If exactly one comma with 1-2 trailing digits => decimal.
    const after = s.length - lastComma - 1;
    const commaCount = (s.match(/,/g) || []).length;
    if (commaCount === 1 && after >= 1 && after <= 2) normalized = s.replace(',', '.');
    else normalized = s.replace(/,/g, ''); // grouping only ("1,234,567")
  } else {
    // Only dots. One dot with exactly 3 trailing digits and a leading group is
    // the European thousands case ("1.234" => 1234). One dot with 1-2 trailing
    // digits is a decimal ("12.5"). Multiple dots => grouping.
    const after = s.length - lastDot - 1;
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount === 1 && after === 3 && lastDot > 0) normalized = s.replace('.', '');
    else if (dotCount === 1 && after >= 1 && after <= 2) normalized = s;
    else normalized = s.replace(/\./g, ''); // grouping only ("1.234.567")
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/** Parse an amount straight into MINOR units (cents), rounded half-up. */
export function parseAmountMinor(input: string | null | undefined): number | null {
  const major = parseAmount(input);
  if (major == null) return null;
  // Round half-up at the cent, avoiding binary-float surprises.
  return Math.round((major + Number.EPSILON) * 100);
}

/** Parse a quantity (allows decimals like 3.5 hours/litres). Null if unparseable. */
export function parseQuantity(input: string | null | undefined): number | null {
  if (input == null) return null;
  // Quantities sometimes trail a unit ("4 kos", "2,5 l"); strip trailing letters.
  const cleaned = String(input).replace(/[a-zA-Zčćžšđ.]+\s*$/u, '').trim();
  const n = parseAmount(cleaned);
  if (n == null || n < 0) return null;
  return n;
}

// ---------------------------------------------------------------------------
// Date parsing — accept the common European layouts and a few ISO/▒ variants,
// always emitting ISO yyyy-mm-dd. Reject impossible dates rather than coercing.
// ---------------------------------------------------------------------------

/** Parse a date string into ISO yyyy-mm-dd, or null if not a confident date. */
export function parseDate(input: string | null | undefined): string | null {
  if (input == null) return null;
  const s = String(input).trim();
  if (s.length === 0) return null;

  // ISO first: 2026-03-15
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return isoOrNull(+m[1], +m[2], +m[3]);

  // European with . / - separators: 15.03.2026, 15/03/2026, 15-03-2026, 1.3.26
  m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
  if (m) {
    let year = +m[3];
    if (year < 100) year += year < 70 ? 2000 : 1900; // 26 -> 2026, 98 -> 1998
    return isoOrNull(year, +m[2], +m[1]); // day-first (European)
  }
  return null;
}

function isoOrNull(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Validate the day-of-month against the actual month length.
  const dim = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > dim) return null;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// VAT rate normalization — turn "22 %", "22,0", "0.22" into a clean "22".
// ---------------------------------------------------------------------------

/** Normalize a VAT rate to a plain percent string ("22"), or null. */
export function parseVatRate(input: string | null | undefined): string | null {
  if (input == null) return null;
  const n = parseAmount(String(input).replace('%', ''));
  if (n == null || n < 0) return null;
  // A value like 0.22 almost certainly means 22%, not 0.22%.
  const pct = n > 0 && n < 1 ? n * 100 : n;
  if (pct > 100) return null;
  // Drop a trailing ".0"; keep one decimal if genuinely fractional (e.g. 9.5).
  const rounded = Math.round(pct * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

// ---------------------------------------------------------------------------
// Confidence helpers — a single place to decide what counts as "needs review".
// ---------------------------------------------------------------------------

export const ConfidenceTier = {
  High: 'high',
  Medium: 'medium',
  Low: 'low',
} as const;
export type ConfidenceTier = (typeof ConfidenceTier)[keyof typeof ConfidenceTier];

/**
 * Map a 0..1 confidence to a tier. Thresholds chosen so that anything the model
 * is less than 90% sure of is at least surfaced ("medium"), and below 70% is
 * loudly flagged ("low"). A null confidence is treated as low — unknown is not
 * the same as fine.
 */
export function confidenceTier(confidence: number | null): ConfidenceTier {
  if (confidence == null) return ConfidenceTier.Low;
  if (confidence >= 0.9) return ConfidenceTier.High;
  if (confidence >= 0.7) return ConfidenceTier.Medium;
  return ConfidenceTier.Low;
}

/** True when a field should be highlighted for human review. */
export function needsReview<T>(field: Field<T>): boolean {
  // Flag if we could not parse it at all, or the model's confidence is not High.
  if (field.value == null && field.raw != null) return true;
  return confidenceTier(field.confidence) !== ConfidenceTier.High;
}
