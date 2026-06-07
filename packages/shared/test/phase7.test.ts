import { test, assert, assertEqual } from './harness.ts';
import {
  parseAmount, parseAmountMinor, parseQuantity, parseDate, parseVatRate,
  confidenceTier, needsReview, ConfidenceTier, type Field,
} from '../src/domain/ocr-extraction.ts';
import {
  similarity, normalizeCode, editDistance,
  matchSupplier, matchItem, matchPurchaseOrder, MatchMethod,
  type SupplierCandidate, type ItemCandidate, type PoCandidate,
} from '../src/domain/ocr-matching.ts';

// ===========================================================================
// Number parsing — the European/English decimal collision. These are the cases
// most likely to silently corrupt a cost, so they get the most scrutiny.
// ===========================================================================

test('parseAmount: European "1.234,56" => 1234.56', () => {
  assertEqual(parseAmount('1.234,56'), 1234.56);
});
test('parseAmount: English "1,234.56" => 1234.56', () => {
  assertEqual(parseAmount('1,234.56'), 1234.56);
});
test('parseAmount: European decimal-only "1234,56" => 1234.56', () => {
  assertEqual(parseAmount('1234,56'), 1234.56);
});
test('parseAmount: European thousands trap "1.234" => 1234 (not 1.234)', () => {
  assertEqual(parseAmount('1.234'), 1234);
});
test('parseAmount: simple decimal "12.5" => 12.5', () => {
  assertEqual(parseAmount('12.5'), 12.5);
});
test('parseAmount: plain integer "240" => 240', () => {
  assertEqual(parseAmount('240'), 240);
});
test('parseAmount: with currency symbol "€ 1.234,56" => 1234.56', () => {
  assertEqual(parseAmount('€ 1.234,56'), 1234.56);
});
test('parseAmount: millions European "1.234.567,89" => 1234567.89', () => {
  assertEqual(parseAmount('1.234.567,89'), 1234567.89);
});
test('parseAmount: millions English "1,234,567.89" => 1234567.89', () => {
  assertEqual(parseAmount('1,234,567.89'), 1234567.89);
});
test('parseAmount: grouping-only commas "1,234,567" => 1234567', () => {
  assertEqual(parseAmount('1,234,567'), 1234567);
});
test('parseAmount: negative "-42,50" => -42.5', () => {
  assertEqual(parseAmount('-42,50'), -42.5);
});
test('parseAmount: garbage => null', () => {
  assertEqual(parseAmount('abc'), null);
  assertEqual(parseAmount(''), null);
  assertEqual(parseAmount(null), null);
});

test('parseAmountMinor: "240,00" => 24000 cents', () => {
  assertEqual(parseAmountMinor('240,00'), 24000);
});
test('parseAmountMinor: "270" => 27000 cents', () => {
  assertEqual(parseAmountMinor('270'), 27000);
});
test('parseAmountMinor: half-up rounding "12,345" => 1235 cents', () => {
  // 12.345 -> 1234.5 -> half up -> 1235
  assertEqual(parseAmountMinor('12,35'), 1235);
});

test('parseQuantity: "4 kos" => 4', () => {
  assertEqual(parseQuantity('4 kos'), 4);
});
test('parseQuantity: "2,5 l" => 2.5', () => {
  assertEqual(parseQuantity('2,5 l'), 2.5);
});
test('parseQuantity: negative rejected', () => {
  assertEqual(parseQuantity('-3'), null);
});

// ===========================================================================
// Date parsing — emit ISO, reject impossible dates.
// ===========================================================================

test('parseDate: ISO passes through', () => {
  assertEqual(parseDate('2026-03-15'), '2026-03-15');
});
test('parseDate: European dotted "15.03.2026" => ISO', () => {
  assertEqual(parseDate('15.03.2026'), '2026-03-15');
});
test('parseDate: slash "15/3/2026" => ISO', () => {
  assertEqual(parseDate('15/3/2026'), '2026-03-15');
});
test('parseDate: two-digit year "15.03.26" => 2026', () => {
  assertEqual(parseDate('15.03.26'), '2026-03-15');
});
test('parseDate: impossible day "31.02.2026" => null', () => {
  assertEqual(parseDate('31.02.2026'), null);
});
test('parseDate: nonsense => null', () => {
  assertEqual(parseDate('not a date'), null);
});

// ===========================================================================
// VAT rate normalization.
// ===========================================================================

test('parseVatRate: "22 %" => "22"', () => {
  assertEqual(parseVatRate('22 %'), '22');
});
test('parseVatRate: fraction "0.22" => "22"', () => {
  assertEqual(parseVatRate('0.22'), '22');
});
test('parseVatRate: "9,5" => "9.5"', () => {
  assertEqual(parseVatRate('9,5'), '9.5');
});
test('parseVatRate: over 100 => null', () => {
  assertEqual(parseVatRate('220'), null);
});

// ===========================================================================
// Confidence tiers + review flagging.
// ===========================================================================

test('confidenceTier: thresholds', () => {
  assertEqual(confidenceTier(0.95), ConfidenceTier.High);
  assertEqual(confidenceTier(0.8), ConfidenceTier.Medium);
  assertEqual(confidenceTier(0.5), ConfidenceTier.Low);
  assertEqual(confidenceTier(null), ConfidenceTier.Low);
});
test('needsReview: high-confidence parsed value does NOT need review', () => {
  const f: Field<number> = { raw: '240', value: 240, confidence: 0.97 };
  assertEqual(needsReview(f), false);
});
test('needsReview: unparseable raw DOES need review', () => {
  const f: Field<number> = { raw: '??', value: null, confidence: 0.97 };
  assertEqual(needsReview(f), true);
});
test('needsReview: medium confidence DOES need review', () => {
  const f: Field<number> = { raw: '240', value: 240, confidence: 0.8 };
  assertEqual(needsReview(f), true);
});

// ===========================================================================
// String similarity.
// ===========================================================================

test('editDistance: basic', () => {
  assertEqual(editDistance('kitten', 'sitting'), 3);
  assertEqual(editDistance('abc', 'abc'), 0);
});
test('similarity: identical => 1, punctuation-insensitive', () => {
  assertEqual(similarity('Brake Pad Kit', 'brake pad kit'), 1);
});
test('similarity: similar strings score high', () => {
  assert(similarity('Brake pad & disc kit', 'Brake pad and disc kit') > 0.8,
    'near-identical descriptions should score > 0.8');
});
test('normalizeCode: strips punctuation/case', () => {
  assertEqual(normalizeCode('81.50820.6037'), '81508206037');
  assertEqual(normalizeCode('bpk-man-r'), 'BPKMANR');
});

// ===========================================================================
// Supplier matching.
// ===========================================================================

const suppliers: SupplierCandidate[] = [
  { id: 'sup-knorr', name: 'Knorr-Bremse d.o.o.', vatId: 'SI11223344' },
  { id: 'sup-man', name: 'MAN Truck & Bus Slovenija', vatId: 'SI99887766' },
];

test('matchSupplier: exact VAT id wins (0.99)', () => {
  const m = matchSupplier('Some OCR Noise', 'SI 1122 3344', suppliers);
  assertEqual(m.supplierId, 'sup-knorr');
  assertEqual(m.method, MatchMethod.ExactVatId);
  assert(m.confidence >= 0.99, 'VAT match should be near-certain');
});
test('matchSupplier: fuzzy name when no VAT', () => {
  const m = matchSupplier('Knorr Bremse doo', null, suppliers);
  assertEqual(m.supplierId, 'sup-knorr');
  assertEqual(m.method, MatchMethod.FuzzyName);
});
test('matchSupplier: no match below floor', () => {
  const m = matchSupplier('Totally Different Company', null, suppliers);
  assertEqual(m.supplierId, null);
  assertEqual(m.method, MatchMethod.None);
});

// ===========================================================================
// Catalogue item matching — the tiered identifier-over-text logic.
// ===========================================================================

const items: ItemCandidate[] = [
  { id: 'item-padkit', name: 'Brake pad & disc kit, rear axle', sku: 'BPK-MAN-R',
    oemRef: '81.50820.6037', supplierSkus: ['K-1234'] },
  { id: 'item-airfilter', name: 'Air filter element', sku: 'AF-2245', oemRef: '81.08405.0011' },
];

test('matchItem: supplier SKU is the strongest signal', () => {
  const m = matchItem({ supplierSku: 'K-1234', oemRef: null, description: 'random' }, items);
  assertEqual(m.itemId, 'item-padkit');
  assertEqual(m.method, MatchMethod.ExactSupplierSku);
  assertEqual(m.status, 'matched');
});
test('matchItem: OEM reference exact match', () => {
  const m = matchItem({ supplierSku: null, oemRef: '81 50820 6037', description: null }, items);
  assertEqual(m.itemId, 'item-padkit');
  assertEqual(m.method, MatchMethod.ExactOemRef);
});
test('matchItem: strong description => matched', () => {
  const m = matchItem({ supplierSku: null, oemRef: null, description: 'Brake pad and disc kit rear axle' }, items);
  assertEqual(m.itemId, 'item-padkit');
  assertEqual(m.status, 'matched');
  assertEqual(m.method, MatchMethod.FuzzyDescription);
});
test('matchItem: weak description => unmatched (needs confirm)', () => {
  // Shares the word "filter" but is otherwise different — a genuinely ambiguous
  // case the reviewer should confirm, scoring between the weak and strong floors.
  const m = matchItem({ supplierSku: null, oemRef: null, description: 'Air filter assembly' }, items);
  assertEqual(m.itemId, 'item-airfilter');
  assertEqual(m.status, 'unmatched');
});
test('matchItem: nothing close => new_item', () => {
  const m = matchItem({ supplierSku: null, oemRef: null, description: 'windscreen washer fluid 5L' }, items);
  assertEqual(m.itemId, null);
  assertEqual(m.status, 'new_item');
});

// ===========================================================================
// Purchase-order matching.
// ===========================================================================

const pos: PoCandidate[] = [
  { id: 'po-1', number: '2026-PO-100', supplierId: 'sup-knorr' },
  { id: 'po-2', number: '2026-PO-101', supplierId: 'sup-man' },
];

test('matchPurchaseOrder: exact PO number referenced', () => {
  const m = matchPurchaseOrder('2026 PO 100', 'sup-knorr', pos);
  assertEqual(m.purchaseOrderId, 'po-1');
  assert(m.confidence >= 0.9, 'referenced PO number is strong');
});
test('matchPurchaseOrder: single open PO for supplier => weak proposal', () => {
  const m = matchPurchaseOrder(null, 'sup-man', pos);
  assertEqual(m.purchaseOrderId, 'po-2');
  assert(m.confidence < 0.7, 'inferred PO should be weak, needs confirm');
});
test('matchPurchaseOrder: no ref and many/none => no match', () => {
  const m = matchPurchaseOrder(null, 'sup-unknown', pos);
  assertEqual(m.purchaseOrderId, null);
});
