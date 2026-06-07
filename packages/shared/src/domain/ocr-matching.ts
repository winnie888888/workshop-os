/**
 * OCR matching engine (Phase 7) — the second half of the airlock.
 *
 * Normalization gave us clean values from ONE document. Matching now answers the
 * questions that relate the document to OUR records: which supplier sent this,
 * which catalogue item is each line, and does this correspond to an open purchase
 * order? Every answer comes with an explicit confidence and a reason, because the
 * whole point of OCR-assisted (not OCR-automated) receiving is that a human sees
 * *why* the machine proposed a match and can overrule it. Pure, deterministic,
 * dependency-free, tested by execution. It never decides anything irreversible —
 * it only ranks candidates and labels confidence.
 *
 * Design principle: prefer EXACT identifiers over fuzzy text, always. A VAT id or
 * a supplier part number that matches exactly is worth far more than a name that
 * looks similar, so the scoring is tiered, not blended into one mushy number.
 */

// ---------------------------------------------------------------------------
// String similarity — a normalized Levenshtein ratio, written from scratch so
// the shared core stays dependency-free. Used ONLY as the weakest matching
// signal (descriptions); identifiers are compared exactly.
// ---------------------------------------------------------------------------

/** Lower-case, collapse whitespace, strip punctuation — for fair text compare. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')   // punctuation -> space
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip everything but alphanumerics and upper-case — for comparing part codes. */
export function normalizeCode(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Levenshtein edit distance between two strings (iterative, O(n·m) space O(m)). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Similarity ratio in 0..1 (1 = identical) based on normalized edit distance. */
export function similarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na.length === 0 && nb.length === 0) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 0;
  return 1 - editDistance(na, nb) / maxLen;
}

// ---------------------------------------------------------------------------
// Match results — every match says how confident it is and WHY, in words a
// reviewer can read ("exact VAT id", "OEM reference", "description 82% similar").
// ---------------------------------------------------------------------------

export const MatchMethod = {
  ExactVatId: 'exact_vat_id',
  ExactSupplierSku: 'exact_supplier_sku',
  ExactOemRef: 'exact_oem_ref',
  ExactSku: 'exact_sku',
  FuzzyName: 'fuzzy_name',
  FuzzyDescription: 'fuzzy_description',
  None: 'none',
} as const;
export type MatchMethod = (typeof MatchMethod)[keyof typeof MatchMethod];

export interface SupplierMatch {
  supplierId: string | null;
  confidence: number;        // 0..1
  method: MatchMethod;
  reason: string;            // human-readable
}

/** matched = confident enough to pre-fill; new_item = nothing close; unmatched = ambiguous. */
export type LineMatchStatus = 'matched' | 'unmatched' | 'new_item';

export interface ItemMatch {
  itemId: string | null;
  confidence: number;
  method: MatchMethod;
  status: LineMatchStatus;
  reason: string;
}

export interface PoMatch {
  purchaseOrderId: string | null;
  confidence: number;
  method: MatchMethod;
  reason: string;
}

// Candidate record shapes the caller supplies (read from our DB, kept minimal).
export interface SupplierCandidate { id: string; name: string; vatId: string | null; }
export interface ItemCandidate {
  id: string; name: string; sku: string | null; oemRef: string | null;
  /** This supplier's own SKUs for the item, if known (from supplier_items). */
  supplierSkus?: string[];
}
export interface PoCandidate {
  id: string; number: string | null; supplierId: string;
}

// ---------------------------------------------------------------------------
// Supplier matching: VAT id exact beats everything; otherwise best name match,
// and only above a floor (so a 40%-similar name is reported as "no match",
// not a bad guess).
// ---------------------------------------------------------------------------

const NAME_MATCH_FLOOR = 0.6;       // below this, a name match is not proposed
const DESC_MATCH_FLOOR = 0.55;      // weakest signal for catalogue items
const DESC_STRONG = 0.82;           // strong enough to pre-fill without flag

export function matchSupplier(
  extractedName: string | null,
  extractedVatId: string | null,
  candidates: SupplierCandidate[],
): SupplierMatch {
  // 1) Exact VAT id (normalized) — near-certain.
  if (extractedVatId) {
    const want = normalizeCode(extractedVatId);
    const hit = candidates.find((c) => c.vatId && normalizeCode(c.vatId) === want);
    if (hit) {
      return { supplierId: hit.id, confidence: 0.99, method: MatchMethod.ExactVatId,
        reason: `VAT id ${hit.vatId} matches exactly` };
    }
  }
  // 2) Best fuzzy name match above the floor.
  if (extractedName) {
    let best: SupplierCandidate | null = null;
    let bestScore = 0;
    for (const c of candidates) {
      const score = similarity(extractedName, c.name);
      if (score > bestScore) { bestScore = score; best = c; }
    }
    if (best && bestScore >= NAME_MATCH_FLOOR) {
      return { supplierId: best.id, confidence: round2(bestScore), method: MatchMethod.FuzzyName,
        reason: `Name "${best.name}" ${Math.round(bestScore * 100)}% similar` };
    }
  }
  return { supplierId: null, confidence: 0, method: MatchMethod.None,
    reason: 'No supplier matched — choose one or create a new supplier' };
}

// ---------------------------------------------------------------------------
// Catalogue item matching: try exact identifiers in priority order, then fall
// back to description similarity. The STATUS encodes what the reviewer must do:
//   matched   -> identifier or strong description hit; pre-filled, low effort
//   unmatched -> a weak description hit exists; reviewer should confirm/choose
//   new_item  -> nothing close; reviewer creates a catalogue item or skips
// ---------------------------------------------------------------------------

export function matchItem(
  line: { supplierSku: string | null; oemRef: string | null; description: string | null },
  candidates: ItemCandidate[],
): ItemMatch {
  // 1) This supplier's own SKU printed on the note (strongest real-world signal).
  if (line.supplierSku) {
    const want = normalizeCode(line.supplierSku);
    const hit = candidates.find((c) => (c.supplierSkus ?? []).some((s) => normalizeCode(s) === want));
    if (hit) return { itemId: hit.id, confidence: 0.98, method: MatchMethod.ExactSupplierSku,
      status: 'matched', reason: `Supplier SKU ${line.supplierSku} matches` };
  }
  // 2) Exact OEM reference.
  if (line.oemRef) {
    const want = normalizeCode(line.oemRef);
    const hit = candidates.find((c) => c.oemRef && normalizeCode(c.oemRef) === want);
    if (hit) return { itemId: hit.id, confidence: 0.96, method: MatchMethod.ExactOemRef,
      status: 'matched', reason: `OEM ref ${line.oemRef} matches` };
  }
  // 3) Exact our-SKU (sometimes the supplier prints our code).
  if (line.supplierSku) {
    const want = normalizeCode(line.supplierSku);
    const hit = candidates.find((c) => c.sku && normalizeCode(c.sku) === want);
    if (hit) return { itemId: hit.id, confidence: 0.9, method: MatchMethod.ExactSku,
      status: 'matched', reason: `Stock code ${hit.sku} matches` };
  }
  // 4) Description similarity.
  if (line.description) {
    let best: ItemCandidate | null = null;
    let bestScore = 0;
    for (const c of candidates) {
      const score = similarity(line.description, c.name);
      if (score > bestScore) { bestScore = score; best = c; }
    }
    if (best && bestScore >= DESC_STRONG) {
      return { itemId: best.id, confidence: round2(bestScore), method: MatchMethod.FuzzyDescription,
        status: 'matched', reason: `Description ${Math.round(bestScore * 100)}% similar to "${best.name}"` };
    }
    if (best && bestScore >= DESC_MATCH_FLOOR) {
      return { itemId: best.id, confidence: round2(bestScore), method: MatchMethod.FuzzyDescription,
        status: 'unmatched', reason: `Possible match "${best.name}" (${Math.round(bestScore * 100)}%) — confirm` };
    }
  }
  return { itemId: null, confidence: 0, method: MatchMethod.None,
    status: 'new_item', reason: 'No catalogue item matched — create new or skip' };
}

// ---------------------------------------------------------------------------
// Purchase-order matching: the supplier sometimes prints our PO number on their
// note. An exact number match (for the right supplier) is strong; otherwise, if
// there is exactly one open PO for the matched supplier, propose it weakly.
// ---------------------------------------------------------------------------

export function matchPurchaseOrder(
  poRef: string | null,
  matchedSupplierId: string | null,
  openPos: PoCandidate[],
): PoMatch {
  if (poRef) {
    const want = normalizeCode(poRef);
    const hit = openPos.find((p) => p.number && normalizeCode(p.number) === want);
    if (hit) return { purchaseOrderId: hit.id, confidence: 0.97, method: MatchMethod.ExactSku,
      reason: `Purchase order ${hit.number} referenced on the document` };
  }
  if (matchedSupplierId) {
    const forSupplier = openPos.filter((p) => p.supplierId === matchedSupplierId);
    if (forSupplier.length === 1) {
      return { purchaseOrderId: forSupplier[0].id, confidence: 0.5, method: MatchMethod.FuzzyName,
        reason: `Only one open order for this supplier (${forSupplier[0].number ?? 'draft'}) — confirm` };
    }
  }
  return { purchaseOrderId: null, confidence: 0, method: MatchMethod.None,
    reason: 'No purchase order matched — receive without a PO or pick one' };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
