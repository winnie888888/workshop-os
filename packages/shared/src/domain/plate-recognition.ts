/**
 * Plate recognition — normalization & country inference (Phase 8).
 *
 * IMPORTANT distinction from the existing `normalizePlate` helpers (in
 * customer.ts and search/query.ts): those handle the EASY case — a human typed a
 * plate and we strip spaces/dashes and upper-case it for storage and column
 * matching. They are correct for that and we do NOT change them.
 *
 * This module handles the HARD case — a plate read from a PHOTOGRAPH by a model.
 * That input carries two kinds of noise the storage normalizer never sees:
 *
 *   1. Character confusion. A model reading a dirty or angled plate confuses
 *      visually near-identical glyphs: O↔0, I↔1, B↔8, S↔5, Z↔2, G↔6, etc. So a
 *      recognized "NMCKA18" might really be "NMCK418". We cannot just compare
 *      strings; we must compare allowing for these confusions.
 *   2. Country ambiguity. The same recognition must work for SI, HR, AT, DE, HU
 *      and other EU plates, which have genuinely different shapes. Inferring the
 *      likely country helps validate the read and disambiguate confusions.
 *
 * Everything here is pure, deterministic, dependency-free, and tested by
 * execution. It NEVER touches the database or creates anything — it only reasons
 * about strings so the matching step (and ultimately a human) can decide.
 */

// ---------------------------------------------------------------------------
// Canonical form — the comparable shape we reduce every plate to. Same rule as
// the storage normalizer (upper-case, strip non-alphanumerics) so a recognized
// plate and a stored plate are compared on equal footing.
// ---------------------------------------------------------------------------

/** Reduce a plate to bare upper-case alphanumerics: "NM CK-418" -> "NMCK418". */
export function canonicalPlate(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// ---------------------------------------------------------------------------
// Character-confusion model. We model the SYMMETRIC confusions an OCR/vision
// model makes between letters and digits. The key insight for plates: confusion
// is CONTEXT-DEPENDENT. In a position that should be a digit, a reported 'O' is
// almost certainly '0'; in a letter position, a reported '0' is almost certainly
// 'O'. We expose both the raw confusion pairs and a canonicalization that folds
// each character to a single representative, so two plates that differ only by
// confusable characters fold to the same key.
// ---------------------------------------------------------------------------

/** Pairs of glyphs a vision model commonly confuses on a plate. */
export const CONFUSION_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['0', 'O'], ['1', 'I'], ['1', 'L'], ['8', 'B'], ['5', 'S'],
  ['2', 'Z'], ['6', 'G'], ['4', 'A'], ['7', 'T'], ['9', 'g'.toUpperCase()],
];

/**
 * Fold confusable glyphs to a single representative, so "NMCK418" and "NMCKA18"
 * (4↔A confusion) fold to the same key. We fold LETTERS to their digit
 * lookalike, because on European plates ambiguous trailing groups are usually
 * numeric — but the fold is only used to GENERATE candidate matches, never to
 * decide one; the human always sees the real characters.
 */
const FOLD_MAP: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [digit, letter] of CONFUSION_PAIRS) {
    m[letter] = digit; // fold the letter to its digit lookalike
  }
  return m;
})();

/** A confusion-insensitive key: confusable letters folded to their digit twin. */
export function confusionKey(raw: string): string {
  const c = canonicalPlate(raw);
  let out = '';
  for (const ch of c) out += FOLD_MAP[ch] ?? ch;
  return out;
}

// ---------------------------------------------------------------------------
// Country inference. Each supported country has a recognizable plate shape. We
// test the canonical plate against per-country patterns and return the best
// guesses. This is a HINT (used to validate a read and to fill the country when
// the model did not report one), never a hard gate — unusual plates exist.
// ---------------------------------------------------------------------------

export type PlateCountry = 'SI' | 'HR' | 'AT' | 'DE' | 'HU' | 'IT' | 'UNKNOWN';

interface CountryPattern {
  country: PlateCountry;
  /** Matches against the CANONICAL (space/dash-stripped) plate. */
  pattern: RegExp;
  /** Known two-letter regional prefixes, to raise confidence when present. */
  prefixes?: ReadonlyArray<string>;
}

// Patterns are deliberately broad — plate systems have many series and we would
// rather under-claim a country than wrongly reject a real plate. Order matters
// only for tie-breaking; we score all and pick the strongest.
const COUNTRY_PATTERNS: ReadonlyArray<CountryPattern> = [
  // Slovenia: 2-letter region + 2-letter series + 3 digits, e.g. NMCK418, LJG123.
  { country: 'SI', pattern: /^[A-Z]{2}[A-Z0-9]{2}\d{2,3}$/,
    prefixes: ['LJ', 'MB', 'CE', 'KR', 'KP', 'NM', 'MS', 'GO', 'PO', 'SG', 'KK', 'TZ', 'NA', 'KA'] },
  // Croatia: 2-letter region + 3-4 digits + 1-2 letters, e.g. ZG7421CD, ST123AB.
  { country: 'HR', pattern: /^[A-Z]{2}\d{3,4}[A-Z]{1,2}$/,
    prefixes: ['ZG', 'ST', 'RI', 'OS', 'ZD', 'VZ', 'KA', 'PU', 'SB', 'DU', 'VT', 'BJ', 'CK', 'GS'] },
  // Germany: 1-3 letter region + 1-2 letters + up to 4 digits, e.g. MAB1234, BAB12.
  { country: 'DE', pattern: /^[A-Z]{1,3}[A-Z]{1,2}\d{1,4}$/,
    prefixes: ['M', 'B', 'K', 'F', 'S', 'H', 'HH', 'HB', 'D', 'L', 'DD', 'N', 'MA'] },
  // Austria: 1-2 letter region + mixed letters/digits, e.g. W12345A, GU123AB.
  { country: 'AT', pattern: /^[A-Z]{1,2}\d{1,5}[A-Z]{0,2}$/,
    prefixes: ['W', 'G', 'L', 'S', 'I', 'K', 'B', 'GU', 'BL', 'KO', 'VB'] },
  // Hungary: old ABC123, new AABB123 / AABB-123, e.g. ABC123, AAGH123.
  { country: 'HU', pattern: /^[A-Z]{3,4}\d{3}$/ },
  // Italy: 2 letters + 3 digits + 2 letters, e.g. AB123CD.
  { country: 'IT', pattern: /^[A-Z]{2}\d{3}[A-Z]{2}$/ },
];

export interface CountryGuess {
  country: PlateCountry;
  confidence: number; // 0..1
}

/**
 * Infer the likely country/countries from a plate's shape. Returns guesses
 * sorted strongest first. A shape match alone is ~0.6; a known regional prefix
 * raises it. If a country was already reported (by the model or a flag image),
 * pass it as `reported` to bias the result toward agreement.
 */
export function inferCountry(rawPlate: string, reported?: string | null): CountryGuess[] {
  const plate = canonicalPlate(rawPlate);
  const guesses: CountryGuess[] = [];
  for (const cp of COUNTRY_PATTERNS) {
    if (!cp.pattern.test(plate)) continue;
    let score = 0.6;
    if (cp.prefixes && cp.prefixes.some((p) => plate.startsWith(p))) score += 0.25;
    if (reported && reported.toUpperCase() === cp.country) score += 0.15;
    guesses.push({ country: cp.country, confidence: Math.min(1, round2(score)) });
  }
  // If the model reported a country we don't have a pattern hit for, surface it
  // weakly rather than dropping it — real plates outrun our patterns.
  if (reported && !guesses.some((g) => g.country === reported.toUpperCase())) {
    const c = reported.toUpperCase();
    const known: PlateCountry[] = ['SI', 'HR', 'AT', 'DE', 'HU', 'IT'];
    guesses.push({ country: (known.includes(c as PlateCountry) ? c : 'UNKNOWN') as PlateCountry, confidence: 0.4 });
  }
  if (guesses.length === 0) guesses.push({ country: 'UNKNOWN', confidence: 0.2 });
  return guesses.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Is the given country the STRONGEST shape-guess for this plate? We deliberately
 * do NOT treat "matches the shape at all" as plausible, because European plate
 * shapes genuinely overlap (a 4-letter + 3-digit string fits several countries).
 * "Plausible" here means: this country is the top guess, or tied within a small
 * margin of it. That makes a Slovenian plate plausible for SI (its top guess,
 * boosted by the regional prefix) but not for HU (only a weak secondary guess).
 */
export function plausibleForCountry(rawPlate: string, country: string): boolean {
  const guesses = inferCountry(rawPlate);
  if (guesses.length === 0) return false;
  const want = country.toUpperCase();
  const top = guesses[0];
  const forWant = guesses.find((g) => g.country === want);
  if (!forWant) return false;
  // Plausible only if it is the top guess, or within 0.1 of the top.
  return top.confidence - forWant.confidence <= 0.1;
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
