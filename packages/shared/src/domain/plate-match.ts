/**
 * Plate matching (Phase 8) — relate a recognized plate to OUR vehicles.
 *
 * Given what the model read (a raw plate, an optional reported country, and a
 * confidence) and the tenant's vehicles, rank the candidates and label each with
 * a confidence and a human-readable reason. The tiers mirror the OCR matcher's
 * philosophy — prefer exact identity over fuzzy reasoning — adapted to plates:
 *
 *   exact      — canonical plates identical (and country agrees if both known):
 *                near-certain; the advisor will usually just confirm.
 *   confusion  — plates identical only after folding confusable glyphs (O↔0,
 *                I↔1, …): strong, but the advisor should confirm because the
 *                read may have flipped a real character.
 *   none       — nothing close: offer to create a new vehicle.
 *
 * When more than one vehicle matches at the top tier, we return them all so the
 * UI shows a chooser. Pure, deterministic, dependency-free, tested by execution.
 */

import { canonicalPlate, confusionKey } from './plate-recognition';

export const PlateMatchMethod = {
  Exact: 'exact',
  Confusion: 'confusion',
  None: 'none',
} as const;
export type PlateMatchMethod = (typeof PlateMatchMethod)[keyof typeof PlateMatchMethod];

/** The minimal vehicle shape the matcher needs (read from app.assets). */
export interface VehicleCandidate {
  id: string;
  plate: string;            // stored, already canonical-ish
  countryOfPlate: string;   // e.g. 'SI'
  customerId: string;
  make?: string | null;
  model?: string | null;
  vin?: string | null;
}

export interface PlateCandidateMatch {
  vehicle: VehicleCandidate;
  confidence: number;       // 0..1
  method: PlateMatchMethod;
  reason: string;
}

export interface PlateMatchResult {
  /** All candidates worth showing, strongest first. */
  candidates: PlateCandidateMatch[];
  /** True when exactly one strong candidate exists (advisor can fast-confirm). */
  singleConfident: boolean;
  /** True when more than one candidate matched and the advisor must choose. */
  ambiguous: boolean;
  /** True when nothing matched and a new vehicle should be offered. */
  noMatch: boolean;
}

/**
 * Match a recognized plate against the tenant's vehicles.
 *
 * @param recognizedPlate  the raw plate the model read
 * @param reportedCountry  the country the model/flag suggested, or null
 * @param vehicles         the tenant's vehicles (already tenant-scoped by caller)
 */
export function matchPlate(
  recognizedPlate: string,
  reportedCountry: string | null,
  vehicles: VehicleCandidate[],
): PlateMatchResult {
  const wantCanon = canonicalPlate(recognizedPlate);
  const wantKey = confusionKey(recognizedPlate);
  const wantCountry = reportedCountry ? reportedCountry.toUpperCase() : null;

  const matches: PlateCandidateMatch[] = [];

  for (const v of vehicles) {
    const vCanon = canonicalPlate(v.plate);
    const vKey = confusionKey(v.plate);
    const countryAgrees = !wantCountry || v.countryOfPlate.toUpperCase() === wantCountry;

    if (vCanon === wantCanon) {
      // Exact character match. Country agreement nudges confidence; a country
      // mismatch (same characters, different country) is still a strong match
      // but slightly lower, because two countries can reuse a plate string.
      const confidence = countryAgrees ? 0.98 : 0.85;
      matches.push({
        vehicle: v, confidence, method: PlateMatchMethod.Exact,
        reason: countryAgrees
          ? `Plate ${v.plate} (${v.countryOfPlate}) matches exactly`
          : `Plate ${v.plate} matches, but country differs (${v.countryOfPlate} vs ${wantCountry})`,
      });
    } else if (vKey === wantKey) {
      // Match only after folding confusable glyphs — the read may have flipped
      // a character (e.g. 4↔A). Strong enough to propose, must be confirmed.
      const confidence = countryAgrees ? 0.78 : 0.7;
      matches.push({
        vehicle: v, confidence, method: PlateMatchMethod.Confusion,
        reason: `Plate ${v.plate} matches if a look-alike character was misread — please confirm`,
      });
    }
  }

  // Sort strongest first; exact above confusion by virtue of confidence.
  matches.sort((a, b) => b.confidence - a.confidence);

  // Decide the shape of the result for the UI.
  const exactCount = matches.filter((m) => m.method === PlateMatchMethod.Exact).length;
  const singleConfident = exactCount === 1 && matches[0]?.method === PlateMatchMethod.Exact;
  const ambiguous = matches.length > 1 && !singleConfident;
  const noMatch = matches.length === 0;

  return { candidates: matches, singleConfident, ambiguous, noMatch };
}
