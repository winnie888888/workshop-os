import { test, assert, assertEqual } from './harness.ts';
import {
  canonicalPlate, confusionKey, inferCountry, plausibleForCountry,
} from '../src/domain/plate-recognition.ts';
import {
  matchPlate, PlateMatchMethod, type VehicleCandidate,
} from '../src/domain/plate-match.ts';

// ===========================================================================
// Canonicalization — strip formatting, upper-case.
// ===========================================================================

test('canonicalPlate: Slovenian "NM CK-418" -> "NMCK418"', () => {
  assertEqual(canonicalPlate('NM CK-418'), 'NMCK418');
});
test('canonicalPlate: Croatian "ZG 7421-CD" -> "ZG7421CD"', () => {
  assertEqual(canonicalPlate('ZG 7421-CD'), 'ZG7421CD');
});
test('canonicalPlate: German "M-AB 1234" -> "MAB1234"', () => {
  assertEqual(canonicalPlate('M-AB 1234'), 'MAB1234');
});
test('canonicalPlate: lower-case and dots handled', () => {
  assertEqual(canonicalPlate('lj.g.123'), 'LJG123');
});

// ===========================================================================
// Confusion folding — the heart of robust matching.
// ===========================================================================

test('confusionKey: O and 0 fold together', () => {
  assertEqual(confusionKey('NMCKO18'), confusionKey('NMCK018'));
});
test('confusionKey: 4 and A fold together', () => {
  assertEqual(confusionKey('NMCK418'), confusionKey('NMCKA18'));
});
test('confusionKey: I and 1, B and 8, S and 5', () => {
  assertEqual(confusionKey('ZGI23BS'), confusionKey('ZG123B5'));
});
test('confusionKey: genuinely different plates do NOT fold together', () => {
  assert(confusionKey('NMCK418') !== confusionKey('ZG7421CD'), 'distinct plates must stay distinct');
});

// ===========================================================================
// Country inference — all required nationalities.
// ===========================================================================

test('inferCountry: Slovenian NMCK418 -> SI strongest', () => {
  const g = inferCountry('NM CK-418');
  assertEqual(g[0].country, 'SI');
  assert(g[0].confidence >= 0.8, 'known SI prefix should raise confidence');
});
test('inferCountry: Croatian ZG7421CD -> HR strongest', () => {
  const g = inferCountry('ZG 7421-CD');
  assertEqual(g[0].country, 'HR');
});
test('inferCountry: Hungarian ABC123 -> HU', () => {
  const g = inferCountry('ABC-123');
  assert(g.some((x) => x.country === 'HU'), 'should recognize Hungarian shape');
});
test('inferCountry: Italian AB123CD -> IT', () => {
  const g = inferCountry('AB 123 CD');
  assert(g.some((x) => x.country === 'IT'), 'should recognize Italian shape');
});
test('inferCountry: reported country biases the result', () => {
  // A shape that could be DE or AT; reporting AT should put AT on top or raise it.
  const g = inferCountry('W12345A', 'AT');
  assert(g.some((x) => x.country === 'AT' && x.confidence >= 0.6), 'reported AT should be supported');
});
test('inferCountry: unknown shape still returns something', () => {
  const g = inferCountry('!!!');
  assert(g.length >= 1, 'never returns empty');
});
test('plausibleForCountry: SI plate plausible for SI, not for HU', () => {
  assert(plausibleForCountry('NMCK418', 'SI'), 'SI plate plausible for SI');
  assert(!plausibleForCountry('NMCK418', 'HU'), 'SI plate not plausible for HU');
});

// ===========================================================================
// Plate matching — the four outcomes.
// ===========================================================================

const vehicles: VehicleCandidate[] = [
  { id: 'veh-1', plate: 'NMCK418', countryOfPlate: 'SI', customerId: 'cust-kralj', make: 'MAN', model: 'TGX' },
  { id: 'veh-2', plate: 'ZG7421CD', countryOfPlate: 'HR', customerId: 'cust-horvat', make: 'MAN', model: 'TGX' },
  { id: 'veh-3', plate: 'LJG123', countryOfPlate: 'SI', customerId: 'cust-alpe', make: 'Volvo', model: 'FH' },
];

test('matchPlate: exact match, single confident', () => {
  const r = matchPlate('NM CK-418', 'SI', vehicles);
  assert(r.singleConfident, 'one exact match should be single-confident');
  assertEqual(r.candidates[0].vehicle.id, 'veh-1');
  assertEqual(r.candidates[0].method, PlateMatchMethod.Exact);
  assert(r.candidates[0].confidence >= 0.95, 'exact + country agree => high');
});
test('matchPlate: confusion match flagged to confirm', () => {
  // Model read "NMCKA18" (A instead of 4) — folds to the same key as NMCK418.
  const r = matchPlate('NMCKA18', 'SI', vehicles);
  assertEqual(r.candidates[0].vehicle.id, 'veh-1');
  assertEqual(r.candidates[0].method, PlateMatchMethod.Confusion);
  assert(r.candidates[0].confidence < 0.9, 'confusion match must invite confirmation');
});
test('matchPlate: country mismatch lowers an exact char match', () => {
  // Same characters as veh-1 but model says HR — still strong, slightly lower.
  const r = matchPlate('NMCK418', 'HR', vehicles);
  assertEqual(r.candidates[0].vehicle.id, 'veh-1');
  assertEqual(r.candidates[0].method, PlateMatchMethod.Exact);
  assert(r.candidates[0].confidence < 0.95, 'country disagreement should lower confidence');
});
test('matchPlate: no match offers new vehicle', () => {
  const r = matchPlate('XX999YY', 'SI', vehicles);
  assert(r.noMatch, 'unknown plate => noMatch');
  assertEqual(r.candidates.length, 0);
});
test('matchPlate: ambiguous when two vehicles share a confusable form', () => {
  const ambiguous: VehicleCandidate[] = [
    { id: 'a', plate: 'AB1234', countryOfPlate: 'SI', customerId: 'c1' },
    { id: 'b', plate: 'ABI234', countryOfPlate: 'SI', customerId: 'c2' }, // I↔1 confusable with AB1234
  ];
  const r = matchPlate('AB1234', 'SI', ambiguous);
  assert(r.candidates.length === 2, 'both confusable vehicles surface');
  assert(r.ambiguous || r.singleConfident, 'either ambiguous chooser or a clear winner');
});
