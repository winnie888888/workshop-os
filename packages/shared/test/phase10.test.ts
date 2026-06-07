import { test, assert, assertEqual } from './harness.ts';
import {
  detectIntent, normalizeVehicleHint, assembleDraft, VoiceIntent,
  type VoiceExtraction,
} from '../src/domain/voice-workorder.ts';

// ===========================================================================
// Intent detection — new job vs work on an existing one, EN + SL.
// ===========================================================================

test('detectIntent: "create a new job, customer says brakes squeal" -> create', () => {
  assertEqual(detectIntent('Create a new job, customer says the brakes squeal'), VoiceIntent.CreateNew);
});
test('detectIntent: "I finished and replaced the pads" -> update', () => {
  assertEqual(detectIntent('I finished the rear brakes and replaced the pads'), VoiceIntent.UpdateExisting);
});
test('detectIntent: Slovenian "zamenjal sem zavore" -> update', () => {
  assertEqual(detectIntent('Zamenjal sem zavorne ploščice'), VoiceIntent.UpdateExisting);
});
test('detectIntent: Slovenian "odpri nov nalog, stranka pravi" -> create', () => {
  assertEqual(detectIntent('Odpri nov nalog, stranka pravi da zavore škripijo'), VoiceIntent.CreateNew);
});
test('detectIntent: ambiguous text -> unclear', () => {
  assertEqual(detectIntent('the truck and the weather today'), VoiceIntent.Unclear);
});

// ===========================================================================
// Vehicle hint normalisation — a spoken plate becomes canonical; a description
// stays a description (null plate).
// ===========================================================================

test('normalizeVehicleHint: "NM CK 418" -> canonical NMCK418', () => {
  assertEqual(normalizeVehicleHint('NM CK 418'), 'NMCK418');
});
test('normalizeVehicleHint: "ZG 7421 CD" -> canonical ZG7421CD', () => {
  assertEqual(normalizeVehicleHint('ZG 7421 CD'), 'ZG7421CD');
});
test('normalizeVehicleHint: descriptive "the white MAN truck" -> null (not a plate)', () => {
  assertEqual(normalizeVehicleHint('the white MAN truck'), null);
});
test('normalizeVehicleHint: empty/undefined -> null', () => {
  assertEqual(normalizeVehicleHint(null), null);
  assertEqual(normalizeVehicleHint(''), null);
});

// ===========================================================================
// Draft assembly — completeness scoring, missing fields, suggested lines.
// ===========================================================================

test('assembleDraft: full new-job extraction is complete and fast-confirmable', () => {
  const ex: VoiceExtraction = {
    customerHint: 'Prevozi Kralj', vehicleHint: 'NM CK 418',
    complaint: 'Rear brakes squeal when stopping', workPerformed: null,
    recommendations: ['Check front discs next service'], followUps: ['Call about tyres'],
  };
  const d = assembleDraft(ex, 'Create a new job, customer says rear brakes squeal');
  assertEqual(d.intent, VoiceIntent.CreateNew);
  assertEqual(d.plateCanonical, 'NMCK418');
  assert(d.completeness >= 0.9, `expected complete, got ${d.completeness}`);
  assert(!d.needsReview, 'a full new-job draft should be fast-confirmable');
  assertEqual(d.missing.length, 0);
  assertEqual(d.recommendations.length, 1);
  assertEqual(d.followUps.length, 1);
});

test('assembleDraft: update draft scored on work performed, not complaint', () => {
  const ex: VoiceExtraction = {
    customerHint: 'Prevozi Kralj', vehicleHint: 'NM CK 418',
    workPerformed: 'Replaced rear brake pads and bled the system', complaint: null,
  };
  const d = assembleDraft(ex, 'I finished and replaced the rear pads');
  assertEqual(d.intent, VoiceIntent.UpdateExisting);
  assert(d.completeness >= 0.9, `update with work performed should be complete, got ${d.completeness}`);
  assert(d.suggestedLines.some((l) => l.source === 'work_performed'), 'work performed -> a labour line');
});

test('assembleDraft: missing customer and vehicle are named, draft needs review', () => {
  const ex: VoiceExtraction = { complaint: 'Engine warning light on' };
  const d = assembleDraft(ex, 'customer says the engine light is on');
  assert(d.needsReview, 'thin draft must need review');
  assert(d.missing.includes('customer'), 'missing customer named');
  assert(d.missing.includes('vehicle'), 'missing vehicle named');
  assert(d.completeness < 0.9, 'thin draft is not complete');
});

test('assembleDraft: recommendations become suggested lines tagged by source', () => {
  const ex: VoiceExtraction = {
    customerHint: 'Alpe', vehicleHint: 'LJ G 123', workPerformed: 'Oil and filter service',
    recommendations: ['Replace air filter soon', 'Check brake fluid'],
  };
  const d = assembleDraft(ex, 'I did the oil service');
  const recLines = d.suggestedLines.filter((l) => l.source === 'recommendation');
  assertEqual(recLines.length, 2);
});

test('assembleDraft: never throws on an empty extraction', () => {
  const d = assembleDraft({}, '');
  assertEqual(d.intent, VoiceIntent.Unclear);
  assert(d.needsReview, 'empty extraction needs review');
  assert(d.missing.length >= 2, 'empty extraction is missing core fields');
});
