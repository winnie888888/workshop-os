'use client';

import { createLocalCollection, newId } from './local-store';

/*
 * Plate scan — domain types, plate normalization, an OFFLINE mock recognizer,
 * and persistence. The page only calls `mockRecognize`, `normalizePlate`,
 * `matchPlate`, and `plateStore`. To go live:
 *   - replace `mockRecognize` with api.plate.recognize(attachmentId),
 *   - replace `matchPlate` with a real lookup (api.search / assets),
 *   - back `plateStore` with API endpoints (POST/GET /plate-scans).
 * The shape below IS the proposed API contract.
 */

export type PlateSource = 'camera' | 'upload' | 'manual' | 'demo';

export interface PlateScan {
  id: string;
  createdAt: string;
  plateRaw: string;
  plateNormalized: string;
  country: string;
  confidence: number; // 0..1
  imagePreview?: string; // dataURL for camera/upload captures
  matchedAssetId?: string;
  matchedCustomerId?: string;
  createdWorkOrderId?: string;
  source: PlateSource;
  status: 'recognized' | 'matched' | 'not_found' | 'saved';
}

export const plateStore = createLocalCollection<PlateScan>('wos.plate.scans.v1');

export const PLATE_DEMO_SET = ['LJ MB-123', 'NM AB-456', 'KP CK-789', 'MB GH-321'];

/** Uppercase, collapse internal whitespace, trim. */
export function normalizePlate(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9ČŠŽ -]/g, '').replace(/\s+/g, ' ').trim();
}

const SI_PREFIXES = ['LJ', 'MB', 'CE', 'KR', 'KP', 'NM', 'MS', 'SG', 'PO', 'KK', 'GO'];

/** Guess country from a Slovenian region prefix (demo heuristic; default SI). */
export function guessCountry(plate: string): string {
  const code = normalizePlate(plate).slice(0, 2);
  return SI_PREFIXES.includes(code) ? 'SI' : 'SI';
}

/*
 * OFFLINE mock recognizer. No OCR keys required: returns a plausible plate from
 * the demo set with a realistic confidence. A real OCR call replaces this.
 */
export async function mockRecognize(): Promise<{ plate: string; confidence: number }> {
  await new Promise((r) => setTimeout(r, 900));
  const plate = PLATE_DEMO_SET[Math.floor(Math.random() * PLATE_DEMO_SET.length)];
  const confidence = Math.round((0.78 + Math.random() * 0.2) * 100) / 100;
  return { plate, confidence };
}

export interface PlateMatch {
  matchedAssetId?: string;
  matchedCustomerId?: string;
  vehicleLabel?: string;
  customerLabel?: string;
}

/*
 * Best-effort match against existing data. Tries the app's global search; on any
 * failure (no endpoint in pure demo) it resolves to "no match" so the UI offers
 * to create a new vehicle. Swap with a dedicated plate lookup when available.
 */
export async function matchPlate(
  search: (q: string) => Promise<{ hits: Array<{ type: string; id: string; label: string; sublabel?: string }> }>,
  plate: string,
): Promise<PlateMatch> {
  try {
    const res = await search(normalizePlate(plate));
    const hits = res?.hits ?? [];
    const asset = hits.find((h) => h.type === 'asset' || h.type === 'vehicle');
    const customer = hits.find((h) => h.type === 'customer');
    return {
      matchedAssetId: asset?.id,
      vehicleLabel: asset?.label,
      matchedCustomerId: customer?.id,
      customerLabel: customer?.label ?? asset?.sublabel,
    };
  } catch {
    return {};
  }
}

export function makePlateScan(input: {
  plateRaw: string;
  confidence: number;
  source: PlateSource;
  imagePreview?: string;
  match?: PlateMatch;
}): PlateScan {
  const plateNormalized = normalizePlate(input.plateRaw);
  return {
    id: newId('plate'),
    createdAt: new Date().toISOString(),
    plateRaw: input.plateRaw,
    plateNormalized,
    country: guessCountry(plateNormalized),
    confidence: input.confidence,
    imagePreview: input.imagePreview,
    matchedAssetId: input.match?.matchedAssetId,
    matchedCustomerId: input.match?.matchedCustomerId,
    source: input.source,
    status: input.match?.matchedAssetId ? 'matched' : 'recognized',
  };
}
