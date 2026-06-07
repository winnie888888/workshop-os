import { test, assert, assertEqual } from './harness.ts';
import {
  analyzeLabourProfitability, detectBillingMismatch, analyzePartsMargin,
  analyzeTechnicians, analyzeEntityProfitability,
  detectInventoryAnomalies, detectSlowMoving, recommendReorders,
  detectInvoiceRisk, detectArRisk, prioritize, buildSummary,
  InsightSeverity, InsightCategory,
  type JobFinancials, type TechnicianStats, type EntityProfitability,
  type InventorySnapshot, type InvoiceSnapshot,
} from '../src/domain/workshop-insights.ts';

// Reusable healthy + unhealthy job fixtures.
function job(p: Partial<JobFinancials>): JobFinancials {
  return {
    workOrderId: 'wo', number: '2026-1', customerId: 'c', customerName: 'Kralj', assetId: 'v',
    labourBilledMinor: 0, labourCostMinor: 0, partsBilledMinor: 0, partsCostMinor: 0,
    clockedSeconds: 0, billedLabourHours: 0, status: 'closed', ...p,
  };
}

// ===========================================================================
// Profitability & productivity
// ===========================================================================

test('labour profitability: a healthy job produces NO finding (no noise)', () => {
  const out = analyzeLabourProfitability([job({ labourBilledMinor: 30000, labourCostMinor: 15000 })]);
  assertEqual(out.length, 0);
});
test('labour profitability: billed below cost is an alert (loss)', () => {
  const out = analyzeLabourProfitability([job({ workOrderId: 'wo1', labourBilledMinor: 18000, labourCostMinor: 24000 })]);
  assertEqual(out.length, 1);
  assertEqual(out[0].severity, InsightSeverity.Alert);
  assertEqual(out[0].metric.marginMinor, -6000);
});
test('labour profitability: thin margin (<20%) is a warning', () => {
  const out = analyzeLabourProfitability([job({ labourBilledMinor: 10000, labourCostMinor: 8500 })]);
  assertEqual(out[0].severity, InsightSeverity.Warn);
});

test('billing mismatch: clocked >> billed flags underbilling', () => {
  const out = detectBillingMismatch([job({ clockedSeconds: 3 * 3600, billedLabourHours: 1 })]);
  assert(out.some((i) => i.key.startsWith('underbilled')), 'should flag underbilling');
  assertEqual(out[0].metric.gapHours, 2);
});
test('billing mismatch: billed >> clocked flags overbilling (invoice risk)', () => {
  const out = detectBillingMismatch([job({ clockedSeconds: 1 * 3600, billedLabourHours: 3 })]);
  assert(out.some((i) => i.key.startsWith('overbilled')), 'should flag overbilling');
  assertEqual(out[0].category, InsightCategory.Invoice);
});
test('billing mismatch: matched hours produce no finding', () => {
  const out = detectBillingMismatch([job({ clockedSeconds: 2 * 3600, billedLabourHours: 2 })]);
  assertEqual(out.length, 0);
});

test('parts margin: sold below cost is an alert', () => {
  const out = analyzePartsMargin([job({ partsBilledMinor: 5000, partsCostMinor: 6000 })]);
  assertEqual(out[0].severity, InsightSeverity.Alert);
});

test('technicians: low utilisation flagged, healthy not', () => {
  const techs: TechnicianStats[] = [
    { mechanicId: 'm1', name: 'Marko', attendanceSeconds: 8 * 3600, clockedSeconds: 2 * 3600, labourRevenueMinor: 20000 },
    { mechanicId: 'm2', name: 'Ana', attendanceSeconds: 8 * 3600, clockedSeconds: 7 * 3600, labourRevenueMinor: 90000 },
  ];
  const out = analyzeTechnicians(techs);
  assertEqual(out.length, 1);
  assertEqual(out[0].entityId, 'm1');
  assert(out[0].metric.utilisation === 0.25, 'utilisation 25%');
});

test('entity profitability: unprofitable customer flagged', () => {
  const ents: EntityProfitability[] = [
    { entityId: 'c1', name: 'Horvat', kind: 'customer', revenueMinor: 10000, costMinor: 14000 },
    { entityId: 'c2', name: 'Alpe', kind: 'customer', revenueMinor: 50000, costMinor: 30000 },
  ];
  const out = analyzeEntityProfitability(ents);
  assertEqual(out.length, 1);
  assertEqual(out[0].entityId, 'c1');
});

// ===========================================================================
// Inventory
// ===========================================================================

function item(p: Partial<InventorySnapshot>): InventorySnapshot {
  return { itemId: 'i', sku: 'SKU', name: 'Part', onHand: 0, reorderPoint: null, costMinor: 0, lastMovementDaysAgo: 0, ...p };
}

test('inventory anomaly: negative stock is an alert', () => {
  const out = detectInventoryAnomalies([item({ onHand: -2 })]);
  assertEqual(out[0].severity, InsightSeverity.Alert);
  assert(out[0].key.startsWith('neg_stock'), 'negative stock key');
});
test('inventory anomaly: stock with no cost is a warning', () => {
  const out = detectInventoryAnomalies([item({ onHand: 5, costMinor: 0 })]);
  assert(out.some((i) => i.key.startsWith('no_cost')), 'no-cost warning');
});
test('slow-moving: untouched beyond threshold flagged with tied-up capital', () => {
  const out = detectSlowMoving([item({ onHand: 10, costMinor: 2000, lastMovementDaysAgo: 200 })], 180);
  assertEqual(out.length, 1);
  assertEqual(out[0].metric.tiedUpMinor, 20000);
});
test('slow-moving: recently moved item not flagged', () => {
  const out = detectSlowMoving([item({ onHand: 10, costMinor: 2000, lastMovementDaysAgo: 10 })], 180);
  assertEqual(out.length, 0);
});
test('reorder: at/below reorder point flagged; stockout is an alert', () => {
  const out = recommendReorders([
    item({ itemId: 'a', onHand: 1, reorderPoint: 3 }),
    item({ itemId: 'b', onHand: 0, reorderPoint: 2 }),
    item({ itemId: 'c', onHand: 9, reorderPoint: 3 }),
  ]);
  assertEqual(out.length, 2);
  const stockout = out.find((i) => i.entityId === 'b');
  assertEqual(stockout?.severity, InsightSeverity.Alert);
});

// ===========================================================================
// Receivables & invoice risk
// ===========================================================================

function inv(p: Partial<InvoiceSnapshot>): InvoiceSnapshot {
  return {
    invoiceId: 'inv', number: '2026-1', customerId: 'c', customerName: 'Kralj', status: 'issued',
    totalGrossMinor: 12200, paidMinor: 0, issueDate: '2026-01-01', dueDate: '2026-02-01',
    reverseCharge: false, customerVatId: 'SI12345678', ...p,
  };
}

test('invoice risk: reverse-charge without VAT id is an alert', () => {
  const out = detectInvoiceRisk([inv({ reverseCharge: true, customerVatId: null })]);
  assert(out.some((i) => i.key.startsWith('rc_no_vat')), 'reverse-charge missing VAT flagged');
  assertEqual(out[0].severity, InsightSeverity.Alert);
});
test('invoice risk: a clean invoice produces no finding', () => {
  const out = detectInvoiceRisk([inv({})]);
  assertEqual(out.length, 0);
});
test('AR risk: 90 days overdue is an alert, 10 days is info, not-yet-due nothing', () => {
  const invoices: InvoiceSnapshot[] = [
    inv({ invoiceId: 'a', dueDate: '2026-03-01', totalGrossMinor: 100000, paidMinor: 0 }),
    inv({ invoiceId: 'b', dueDate: '2026-05-20', totalGrossMinor: 50000, paidMinor: 0 }),
    inv({ invoiceId: 'c', dueDate: '2026-09-01', totalGrossMinor: 50000, paidMinor: 0 }),
  ];
  const out = detectArRisk(invoices, '2026-06-01');
  const a = out.find((i) => i.entityId === 'a');
  const b = out.find((i) => i.entityId === 'b');
  const c = out.find((i) => i.entityId === 'c');
  assertEqual(a?.severity, InsightSeverity.Alert);
  assertEqual(b?.severity, InsightSeverity.Info);
  assertEqual(c, undefined); // not yet due
});
test('AR risk: fully paid invoice produces no finding', () => {
  const out = detectArRisk([inv({ totalGrossMinor: 12200, paidMinor: 12200, dueDate: '2026-01-01' })], '2026-06-01');
  assertEqual(out.length, 0);
});

// ===========================================================================
// Prioritisation & summary
// ===========================================================================

test('prioritize: alerts before warnings before info; bigger money first', () => {
  const ins = [
    ...detectArRisk([inv({ invoiceId: 'small', dueDate: '2026-05-20', totalGrossMinor: 50000 })], '2026-06-01'),
    ...analyzeLabourProfitability([job({ workOrderId: 'big', labourBilledMinor: 10000, labourCostMinor: 100000 })]),
  ];
  const sorted = prioritize(ins);
  assertEqual(sorted[0].severity, InsightSeverity.Alert); // the labour loss alert outranks the info AR item
});

test('buildSummary: counts, top list, and a headline', () => {
  const ins = [
    ...analyzeLabourProfitability([job({ workOrderId: 'l', labourBilledMinor: 10000, labourCostMinor: 30000 })]),
    ...recommendReorders([item({ itemId: 'r', onHand: 0, reorderPoint: 2 })]),
  ];
  const s = buildSummary(ins, 'Today');
  assertEqual(s.total, 2);
  assert(s.top.length === 2, 'top includes both');
  assert(s.headline.includes('Today'), 'headline labelled');
  assert(s.headline.toLowerCase().includes('alert'), 'headline mentions alerts');
});

test('buildSummary: clean day yields a reassuring headline, no items', () => {
  const s = buildSummary([], 'Today');
  assertEqual(s.total, 0);
  assert(s.headline.toLowerCase().includes('nothing needs attention'), 'reassuring headline');
});
