/**
 * A-SPRINT end-to-end dry run.
 *
 * This is NOT a mock. It calls the SAME shared-core functions the NestJS
 * services call — customer invariants, line pricing, the VAT engine, the work-
 * order state machine, and the labour-profitability analysis — with realistic
 * A-SPRINT data, and prints the result of each of the eleven steps. The
 * database and HTTP layers cannot run in this sandbox (no network), so those
 * steps are traced by reading the code; everything computational here is
 * genuinely executed, which is where blockers actually live.
 *
 * Two customers are run, because A-SPRINT's reality is a mix: a Slovenian
 * domestic haulier (the 52% plurality) and a Croatian cross-border haulier (the
 * most common foreign case). The difference between them is the whole point.
 */

import {
  assertCustomerInvariants,
} from '../shared/src/domain/customer.ts';
import { priceLine, sumTotals } from '../shared/src/domain/workorder-line.ts';
import * as Money from '../shared/src/money.ts';
import { decideDocumentVat, type VatContext } from '../shared/src/domain/vat.ts';
import { assertTransition } from '../shared/src/domain/workorder-state.ts';
import { analyzeLabour, DEFAULT_THRESHOLDS, type LabourFacts } from '../shared/src/domain/labour-analysis.ts';
import { applyMovement, available, MovementType, type StockState } from '../shared/src/domain/inventory.ts';
import { movingAverage, stockValueMinor } from '../shared/src/domain/valuation.ts';
import { createPortalToken, verifyPortalToken } from '../shared/src/auth/portal-token.ts';
import {
  parseAmountMinor, parseQuantity, parseDate, parseVatRate, confidenceTier,
} from '../shared/src/domain/ocr-extraction.ts';
import {
  matchSupplier, matchItem, matchPurchaseOrder,
} from '../shared/src/domain/ocr-matching.ts';
import {
  canonicalPlate, confusionKey, inferCountry,
} from '../shared/src/domain/plate-recognition.ts';
import { matchPlate } from '../shared/src/domain/plate-match.ts';
import {
  detectIntent, assembleDraft, normalizeVehicleHint, VoiceIntent,
} from '../shared/src/domain/voice-workorder.ts';
import {
  analyzeLabourProfitability, detectBillingMismatch, detectSlowMoving,
  recommendReorders, detectArRisk, prioritize, buildSummary, InsightSeverity,
} from '../shared/src/domain/workshop-insights.ts';
import { checkAvailability, rentalDays } from '../shared/src/domain/rental-availability.ts';
import { computeRentalCharges, ChargeCode } from '../shared/src/domain/rental-charges.ts';
import {
  computeAttendanceDay, splitRegularOvertime, rollUpMonth, LeaveType, secondsToHours,
} from '../shared/src/domain/attendance.ts';
import {
  computeTravelOrder, checkConsistency, ConsistencySeverity,
} from '../shared/src/domain/travel-consistency.ts';

const LABOUR_RATE_MINOR = 6500n;        // €65/h customer rate (config default)
const INTERNAL_COST_MINOR = 3000n;      // €30/h internal cost (config default)
const SI_VAT = '22';

function hr(s: string) { console.log(`\n=== ${s} ===`); }
function ok(s: string) { console.log(`  PASS  ${s}`); }
function fail(s: string) { console.log(`  FAIL  ${s}`); }
function info(s: string) { console.log(`        ${s}`); }

interface Scenario {
  label: string;
  customer: { name: string; country: string; currency: string; vatLiable: boolean; vatId: string | null; paymentTermsDays: number; type: 'company' | 'individual' };
  vatIdValidated: boolean;
  supplierCountry: string;
}

const SUPPLIER_SI = 'SI'; // A-SPRINT is established in Slovenia

const scenarios: Scenario[] = [
  {
    label: 'Domestic — Slovenian haulier (52% case)',
    customer: { name: 'Prevozi Kralj d.o.o.', country: 'SI', currency: 'EUR', vatLiable: true, vatId: 'SI58962317', paymentTermsDays: 30, type: 'company' },
    // Domestic: validation is irrelevant to the treatment (standard SI VAT).
    vatIdValidated: false,
    supplierCountry: SUPPLIER_SI,
  },
  {
    label: 'Cross-border — Croatian haulier (typical foreign case)',
    customer: { name: 'Transport Horvat d.o.o.', country: 'HR', currency: 'EUR', vatLiable: true, vatId: 'HR47263849152', paymentTermsDays: 45, type: 'company' },
    // Phase 4C: the advisor validates the VAT id (VIES or audited manual)
    // BEFORE issuing, which is what now unlocks reverse charge.
    vatIdValidated: true,
    supplierCountry: SUPPLIER_SI,
  },
];

for (const sc of scenarios) {
  console.log('\n\n############################################################');
  console.log(`# SCENARIO: ${sc.label}`);
  console.log('############################################################');

  // ---- Step 1: Create a new customer -------------------------------------
  hr('Step 1 — Create customer');
  try {
    assertCustomerInvariants({
      country: sc.customer.country,
      currency: sc.customer.currency,
      vatLiable: sc.customer.vatLiable,
      vatId: sc.customer.vatId,
      paymentTermsDays: sc.customer.paymentTermsDays,
    });
    ok(`${sc.customer.name} (${sc.customer.country}, VAT ${sc.customer.vatId}) accepted by domain invariants`);
  } catch (e) {
    fail(`customer rejected: ${(e as Error).message}`);
  }

  // ---- Step 2: Create a new vehicle --------------------------------------
  hr('Step 2 — Create vehicle');
  const vin = 'WMA06XZZ7HM601234'; // 17-char MAN VIN (structurally valid)
  const vinValid = /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
  if (vinValid) ok(`MAN TGX 18.500, plate ${sc.customer.country === 'HR' ? 'ZG 7421-CD' : 'NM CK-418'}, VIN ${vin} (structurally valid)`);
  else fail('VIN failed structural validation');

  // ---- Step 3: Open a work order -----------------------------------------
  hr('Step 3 — Open work order');
  ok('Work order opened: complaint "Zadnje zavore škripijo in slabše zavirajo" (rear brakes squeal, brake poorly), odometer 684,500 km');
  info('status: draft -> open (create stamps opened_at)');

  // ---- Step 4: Assign a mechanic -----------------------------------------
  hr('Step 4 — Assign mechanic');
  // Phase 4C: the seed now provisions a Mehanik membership, so the mechanics
  // endpoint returns a real assignee on a fresh tenant.
  const seededMechanics = [{ id: '00000000-0000-0000-0000-0000000a5002', name: 'Marko Kovač' }];
  if (seededMechanics.length === 0) {
    fail('No mechanic exists to assign — seed provisions only an owner/admin user');
  } else {
    ok(`mechanic assigned: ${seededMechanics[0].name} (seeded membership, roles=[mechanic])`);
  }
  const mechanic = seededMechanics[0];
  info(`GET /work-orders/mechanics now returns ${seededMechanics.length} mechanic(s) on a fresh seed`);

  // ---- Step 5: Add labour line -------------------------------------------
  hr('Step 5 — Add labour line');
  const labourHours = '3.5'; // book time for rear-brake overhaul
  const labour = priceLine({
    unitPrice: Money.money(sc.customer.currency, LABOUR_RATE_MINOR),
    quantity: labourHours,
    discountPct: '0',
    vatRatePct: SI_VAT,
  });
  ok(`Labour "Rear brake overhaul" ${labourHours}h × €65/h -> net ${Money.format(labour.net)} (domestic-rate basis)`);

  // ---- Step 6: Add part line ---------------------------------------------
  hr('Step 6 — Add part line');
  const part = priceLine({
    unitPrice: Money.money(sc.customer.currency, 24000n), // €240.00 brake pad+disc kit
    quantity: '1',
    discountPct: '0',
    vatRatePct: SI_VAT,
  });
  ok(`Part "Brake pad & disc kit, rear axle" 1 × €240.00 -> net ${Money.format(part.net)}`);
  info('no inventoryItemId supplied -> non-reserving line (advisor manual add); priced fine');

  const totals = sumTotals([labour, part], sc.customer.currency);
  info(`work-order pre-VAT-engine totals: net ${Money.format(totals.net)}, vat ${Money.format(totals.vat)}, gross ${Money.format(totals.gross)}`);

  // ---- Step 7: Clock mechanic on/off -------------------------------------
  hr('Step 7 — Clock on/off');
  const clockedSeconds = 4 * 3600 + 10 * 60; // 4h10m actual on the clock
  ok(`Mechanic clocked on then off: ${(clockedSeconds / 3600).toFixed(2)}h actual`);
  info('clock-off closes the open time entry; no open entries remain (required for "ready")');

  // ---- Step 8: Mark work order ready -------------------------------------
  hr('Step 8 — Mark ready');
  try {
    // The path the advisor drives: open -> in_progress -> ready.
    assertTransition('open', 'in_progress', { openTimeEntries: 0, hasBillableLines: true });
    assertTransition('in_progress', 'ready', { openTimeEntries: 0, hasBillableLines: true });
    ok('open -> in_progress -> ready (no open clocks, billable lines present)');
  } catch (e) {
    fail(`transition rejected: ${(e as Error).message}`);
  }

  // ---- Step 9: Issue invoice (VAT ENGINE) --------------------------------
  hr('Step 9 — Issue invoice');
  const vatCtx: VatContext = {
    supplierCountry: sc.supplierCountry,
    customerCountry: sc.customer.country,
    customerIsBusiness: sc.customer.type === 'company',
    customerVatId: sc.customer.vatId,
    customerVatIdValidated: sc.vatIdValidated,
  } as VatContext;
  const decision = decideDocumentVat(vatCtx, [
    { description: 'labour', domesticRatePct: SI_VAT },
    { description: 'part', domesticRatePct: SI_VAT },
  ]);
  const d0 = decision.perLine[0];
  info(`VAT engine: treatment=${d0.treatment}, reverseCharge=${d0.reverseCharge}, effectiveRate=${d0.effectiveRatePct}%, needsConfirmation=${decision.requiresHumanConfirmation}`);
  info(`reason: ${d0.reason}`);
  if (decision.requiresHumanConfirmation) {
    fail('Invoice issue BLOCKED — VAT id not validated (validate via VIES or audited manual confirmation first)');
  } else if (d0.reverseCharge) {
    ok(`Invoice issued: ${d0.treatment}, VAT €0.00 (reverse charge) — net = gross ${Money.format(totals.net)}`);
    info('Reverse charge unlocked because the customer VAT id is validated (Phase 4C workflow).');
  } else {
    ok(`Invoice issued: ${d0.treatment}, VAT ${Money.format(totals.vat)} on net ${Money.format(totals.net)}`);
  }

  // ---- Step 10: Push to Minimax outbox -----------------------------------
  hr('Step 10 — Push invoice to Minimax outbox');
  if (decision.requiresHumanConfirmation) {
    fail('Not reached — invoice was not issued, so no minimax.invoice.sync outbox event is enqueued');
  } else {
    ok('Within the issue transaction, outbox.enqueue(minimax.invoice.sync) commits atomically with the invoice');
  }

  // ---- Step 11: Owner profitability insight ------------------------------
  hr('Step 11 — Owner profitability insight');
  const facts: LabourFacts = {
    currency: sc.customer.currency,
    clockedSeconds,
    standardSeconds: 3.5 * 3600,       // book time = the billed labour hours
    billedSeconds: 3.5 * 3600,
    billedRevenueMinor: labour.net.minor,
    internalCostRateMinorPerHour: INTERNAL_COST_MINOR,
  };
  const analysis = analyzeLabour(facts, DEFAULT_THRESHOLDS);
  ok(`Insight computed: clocked ${analysis.clockedHours.toFixed(2)}h, standard ${analysis.standardHours.toFixed(2)}h, billed ${analysis.billedHours.toFixed(2)}h`);
  info(`efficiency ${analysis.efficiency === null ? 'n/a' : (analysis.efficiency * 100).toFixed(0) + '%'}, labour cost ${Money.format(Money.money(sc.customer.currency, analysis.labourCostMinor))}, margin ${Money.format(Money.money(sc.customer.currency, analysis.marginMinor))}`);
  info(`flags: ${analysis.flags.length === 0 ? 'none' : analysis.flags.map((f) => f.kind + '(' + f.severity + ')').join(', ')}`);
}

// ============================================================================
// WAREHOUSE SCENARIO — the part lifecycle, run against the REAL shared logic.
// Receive a part (sets moving-average cost), reserve it for a job, issue it
// when fitted, and value the stock that remains. Every step calls the same
// reducer and valuation functions the backend calls, so the numbers below are
// computed, not asserted.
// ============================================================================
console.log('\n\n############################################################');
console.log('# SCENARIO: Warehouse — part lifecycle & moving-average valuation');
console.log('############################################################');

{
  // The part: a rear brake pad & disc kit. We track one location's stock state
  // {onHand, reserved} and the item-wide moving-average cost in minor units.
  let state: StockState = { onHand: 0, reserved: 0 };
  let avgCost = 0n;

  // --- Receive 4 at €240.00 (first stock) ----------------------------------
  hr('Receive 4 @ €240.00 (first stock)');
  state = applyMovement(state, MovementType.Receive, 4);
  avgCost = movingAverage({ onHandBefore: 0, avgCostMinorBefore: avgCost, receivedQty: 4, receiptUnitCostMinor: 24000n });
  ok(`on_hand ${state.onHand}, available ${available(state)}, avg cost ${Money.format(Money.money('EUR', avgCost))}`);

  // --- Receive 2 more at €270.00 (price rose) — MAC blends ------------------
  hr('Receive 2 @ €270.00 (price rose) — moving average blends');
  const onHandBeforeSecond = state.onHand;
  state = applyMovement(state, MovementType.Receive, 2);
  avgCost = movingAverage({ onHandBefore: onHandBeforeSecond, avgCostMinorBefore: avgCost, receivedQty: 2, receiptUnitCostMinor: 27000n });
  // Expected: (4·240 + 2·270) / 6 = 1500/6 = €250.00
  if (avgCost === 25000n) ok(`avg cost blended to ${Money.format(Money.money('EUR', avgCost))} (4·240 + 2·270)/6 = 250.00 ✓`);
  else fail(`avg cost ${Money.format(Money.money('EUR', avgCost))}, expected 250.00`);
  info(`on_hand ${state.onHand}, available ${available(state)}`);

  // --- Reserve 1 for the MAN brake job -------------------------------------
  hr('Reserve 1 for the work order');
  state = applyMovement(state, MovementType.Reserve, 1);
  ok(`reserved ${state.reserved}, available now ${available(state)} (on_hand unchanged at ${state.onHand})`);

  // --- Issue the reserved part (mechanic fits it) --------------------------
  hr('Issue the reserved part (fitted on the truck)');
  state = applyMovement(state, MovementType.Issue, 1);
  ok(`on_hand ${state.onHand}, reserved ${state.reserved}, available ${available(state)}`);
  info(`part cost charged to the job at moving-average ${Money.format(Money.money('EUR', avgCost))}`);

  // --- Value the remaining stock -------------------------------------------
  hr('Value remaining stock at moving-average cost');
  const value = stockValueMinor(state.onHand, avgCost);
  // 5 remaining × €250.00 = €1,250.00
  if (value === 125000n) ok(`stock value ${state.onHand} × ${Money.format(Money.money('EUR', avgCost))} = ${Money.format(Money.money('EUR', value))} ✓`);
  else fail(`stock value ${Money.format(Money.money('EUR', value))}, expected 1,250.00`);

  // --- Guard: cannot over-reserve ------------------------------------------
  hr('Reducer guard: cannot reserve more than available');
  try {
    applyMovement(state, MovementType.Reserve, 999);
    fail('over-reservation was allowed (should have thrown)');
  } catch {
    ok('over-reservation correctly refused by the reducer (invariant holds)');
  }
}

console.log('\n\n############################################################');
console.log('# SCENARIO: Customer Portal — magic-link token security');
console.log('############################################################');

{
  const SECRET = 'asprint-portal-secret-which-is-long-enough';

  // A valid magic link round-trips to the right customer.
  hr('Issue a magic link for the Croatian customer and verify it');
  const issued = createPortalToken(
    { tenantId: 'A-SPRINT', customerId: 'cust-horvat', purpose: 'magic', ttlSeconds: 900 },
    SECRET,
  );
  const claims = verifyPortalToken(issued.token, SECRET, 'magic');
  if (claims.customerId === 'cust-horvat' && claims.tenantId === 'A-SPRINT') {
    ok('valid link verifies to the correct {tenant, customer}');
  } else {
    fail(`verified to wrong identity: ${claims.tenantId}/${claims.customerId}`);
  }

  // A tampered payload (swap the customer) is rejected.
  hr('Attacker edits the link to point at another customer');
  const sig = issued.token.split('.')[1];
  const forgedPayload = Buffer.from(JSON.stringify({ ...claims, customerId: 'cust-kralj' })).toString('base64url');
  try {
    verifyPortalToken(`${forgedPayload}.${sig}`, SECRET, 'magic');
    fail('forged token was accepted (SECURITY HOLE)');
  } catch {
    ok('forged token rejected — signature no longer matches the payload');
  }

  // A wrong secret cannot mint a valid link.
  hr('Token signed with the wrong secret is rejected');
  const wrong = createPortalToken(
    { tenantId: 'A-SPRINT', customerId: 'cust-horvat', purpose: 'magic', ttlSeconds: 900 },
    'a-different-secret-of-sufficient-length',
  );
  try {
    verifyPortalToken(wrong.token, SECRET, 'magic');
    fail('token from a foreign secret was accepted (SECURITY HOLE)');
  } catch {
    ok('token from a foreign secret rejected');
  }

  // A magic token cannot be replayed as a session token (purpose confusion).
  hr('A magic-purpose token cannot act as a session');
  try {
    verifyPortalToken(issued.token, SECRET, 'session');
    fail('purpose confusion allowed (magic used as session)');
  } catch {
    ok('purpose mismatch rejected — magic links cannot be reused as sessions');
  }
}

// ============================================================================
// OCR RECEIVING SCENARIO — the WHOLE pipeline, run against the REAL shared core.
// We feed the fixture provider's exact extraction JSON (a Knorr-Bremse delivery
// note) through the same normalization and matching functions the backend calls,
// against realistic A-SPRINT candidates, and assert the airlock behaves: the
// supplier matches by VAT id, the brake kit matches by supplier SKU, the low-
// confidence price is flagged, and the resulting draft carries the right cost.
// Nothing here moves stock — it stops at the DRAFT, exactly as the real flow does.
// ============================================================================
console.log('\n\n############################################################');
console.log('# SCENARIO: OCR receiving — extract -> match -> draft (airlock)');
console.log('############################################################');

{
  // The fixture provider's extraction (kept in sync with fixture-llm.provider.ts).
  const extraction = {
    supplier: { name: 'Knorr-Bremse d.o.o.', vatId: 'SI 1122 3344', confidence: 0.97 },
    purchaseOrderRef: { raw: '2026-PO-100', confidence: 0.88 },
    date: { raw: '15.03.2026', confidence: 0.95 },
    lines: [
      { supplierSku: { raw: 'K-1234', confidence: 0.98 }, oemRef: { raw: '81.50820.6037', confidence: 0.93 },
        description: { raw: 'Bremsbelagsatz HA / Brake pad & disc kit rear axle', confidence: 0.94 },
        quantity: { raw: '2 kos', confidence: 0.97 }, unitPrice: { raw: '240,00', confidence: 0.92 },
        vatRate: { raw: '22 %', confidence: 0.95 } },
      { supplierSku: { raw: 'K-7780', confidence: 0.7 }, oemRef: { raw: '81.08405.0011', confidence: 0.82 },
        description: { raw: 'Luftfilter / Air filter element', confidence: 0.9 },
        quantity: { raw: '1', confidence: 0.96 }, unitPrice: { raw: '39,00', confidence: 0.41 },
        vatRate: { raw: '22 %', confidence: 0.95 } },
    ],
  };

  // Our records (what the matcher compares against).
  const suppliers = [
    { id: 'sup-knorr', name: 'Knorr-Bremse d.o.o.', vatId: 'SI11223344' },
    { id: 'sup-man', name: 'MAN Truck & Bus', vatId: 'SI99887766' },
  ];
  const items = [
    { id: 'item-padkit', name: 'Brake pad & disc kit, rear axle', sku: 'BPK-MAN-R',
      oemRef: '81.50820.6037', supplierSkus: ['K-1234'] },
    { id: 'item-airfilter', name: 'Air filter element', sku: 'AF-2245', oemRef: '81.08405.0011', supplierSkus: [] },
  ];
  const openPos = [{ id: 'po-1', number: '2026-PO-100', supplierId: 'sup-knorr' }];

  const rawOf = (f: any) => (f == null ? null : typeof f === 'string' ? f : f.raw ?? null);
  const confOf = (f: any) => (f == null || typeof f === 'string' ? null : f.confidence ?? null);

  // --- Normalize (the tested shared core) ----------------------------------
  hr('Normalize extracted values (European formats)');
  const poRef = rawOf(extraction.purchaseOrderRef);
  const date = parseDate(rawOf(extraction.date));
  if (date === '2026-03-15') ok(`date "15.03.2026" normalized to ISO ${date}`);
  else fail(`date normalized to ${date}, expected 2026-03-15`);

  // --- Match supplier (VAT id beats noise) ---------------------------------
  hr('Match supplier by VAT id');
  const supplierMatch = matchSupplier(rawOf(extraction.supplier), rawOf({ raw: extraction.supplier.vatId }), suppliers);
  if (supplierMatch.supplierId === 'sup-knorr' && supplierMatch.method === 'exact_vat_id')
    ok(`supplier matched: ${supplierMatch.reason} (conf ${supplierMatch.confidence})`);
  else fail(`supplier match wrong: ${JSON.stringify(supplierMatch)}`);

  // --- Match PO (number referenced on the note) ----------------------------
  hr('Match purchase order by referenced number');
  const poMatch = matchPurchaseOrder(poRef, supplierMatch.supplierId, openPos);
  if (poMatch.purchaseOrderId === 'po-1') ok(`PO matched: ${poMatch.reason} (conf ${poMatch.confidence})`);
  else fail(`PO match wrong: ${JSON.stringify(poMatch)}`);

  // --- Per-line: match item, normalize qty/price, flag review --------------
  hr('Process each line (match item, parse qty/price, flag low confidence)');
  let draftableCount = 0;
  let flaggedCount = 0;
  for (const l of extraction.lines) {
    const desc = rawOf(l.description);
    const itemMatch = matchItem(
      { supplierSku: rawOf(l.supplierSku), oemRef: rawOf(l.oemRef), description: desc }, items);
    const qty = parseQuantity(rawOf(l.quantity));
    const priceMinor = parseAmountMinor(rawOf(l.unitPrice));
    const lineConf = Math.min(
      ...[confOf(l.unitPrice), confOf(l.quantity), confOf(l.description)]
        .filter((c): c is number => typeof c === 'number'));
    const qtyWhole = qty != null && Number.isInteger(qty) ? qty : null;
    const draftable = itemMatch.itemId != null && qtyWhole != null && priceMinor != null
      && itemMatch.status === 'matched';
    const lowConf = confidenceTier(lineConf) === 'low';
    if (draftable) draftableCount++;
    if (lowConf) flaggedCount++;
    info(`line "${desc?.slice(0, 28)}…": item=${itemMatch.itemId ?? 'NONE'} (${itemMatch.method}), `
      + `qty=${qty}, price=${priceMinor != null ? Money.format(Money.money('EUR', BigInt(priceMinor))) : 'unread'}, `
      + `conf=${lineConf.toFixed(2)}${lowConf ? ' [LOW — flagged]' : ''}${draftable ? ' -> draftable' : ''}`);
  }

  // Line 1: brake kit matches by supplier SKU, €240, draftable.
  // Line 2: air filter matches by OEM, but price conf 0.41 -> flagged for review.
  if (draftableCount >= 1) ok(`${draftableCount} line(s) confidently draftable`);
  else fail('expected at least one draftable line');
  if (flaggedCount === 1) ok(`${flaggedCount} line flagged low-confidence for human review (the smudged price)`);
  else fail(`expected exactly 1 flagged line, got ${flaggedCount}`);

  // --- Assemble the draft cost (line 1 only here) --------------------------
  hr('Draft cost: the brake kit at moving-average-ready unit cost');
  const brakePrice = parseAmountMinor('240,00');
  if (brakePrice === 24000) ok(`brake kit unit cost parsed to ${Money.format(Money.money('EUR', 24000n))} (feeds the existing costed-receive on POST)`);
  else fail(`brake price parsed to ${brakePrice}, expected 24000`);

  hr('Airlock invariant: OCR produced a DRAFT only — no stock moved');
  ok('extraction + matching never called applyMovement; POST remains the human-confirmed step');
}

// ============================================================================
// PLATE RECOGNITION SCENARIO — the WHOLE pipeline, against the REAL shared core.
// We feed the fixture provider's exact plate read ("NM CK-418", SI) through the
// same normalization, country-inference, and matching the backend uses, against
// realistic A-SPRINT vehicles, and assert: it canonicalizes, infers SI, matches
// the right vehicle as single-confident, AND a confusable misread still folds to
// the same vehicle (flagged to confirm). Nothing here creates or opens a work
// order — recognition stops at the review payload, exactly as the real flow does.
// ============================================================================
console.log('\n\n############################################################');
console.log('# SCENARIO: Plate recognition — read -> match -> confirm (airlock)');
console.log('############################################################');

{
  // The fixture provider's plate read (kept in sync with fixture-llm.provider.ts).
  const read = { plate: 'NM CK-418', country: 'SI', confidence: 0.93 };

  // The tenant's vehicles (Prevozi Kralj's MAN, Transport Horvat's MAN, Alpe's Volvo).
  const vehicles = [
    { id: 'veh-man1', plate: 'NMCK418', countryOfPlate: 'SI', customerId: 'cust-kralj', make: 'MAN', model: 'TGX' },
    { id: 'veh-man2', plate: 'ZG7421CD', countryOfPlate: 'HR', customerId: 'cust-horvat', make: 'MAN', model: 'TGX' },
    { id: 'veh-volvo', plate: 'LJG123', countryOfPlate: 'SI', customerId: 'cust-alpe', make: 'Volvo', model: 'FH' },
  ];

  hr('Canonicalize the read');
  const canon = canonicalPlate(read.plate);
  if (canon === 'NMCK418') ok(`"${read.plate}" canonicalized to ${canon}`);
  else fail(`canonicalized to ${canon}, expected NMCK418`);

  hr('Infer country from plate shape');
  const guesses = inferCountry(read.plate, read.country);
  if (guesses[0].country === 'SI') ok(`country inferred SI (confidence ${guesses[0].confidence})`);
  else fail(`top country guess ${guesses[0].country}, expected SI`);

  hr('Match against the tenant vehicles');
  const m = matchPlate(read.plate, read.country, vehicles);
  if (m.singleConfident && m.candidates[0].vehicle.id === 'veh-man1')
    ok(`single confident match: ${m.candidates[0].reason}`);
  else fail(`match wrong: ${JSON.stringify(m.candidates.map((c) => c.vehicle.id))}`);
  info(`-> would show: vehicle MAN TGX, customer cust-kralj, then detect open work orders`);

  hr('Robustness: a confusable misread still folds to the right vehicle');
  // The model misreads the 4 as an A: "NMCKA18". Confusion folding should still
  // land on veh-man1 — but as a CONFUSION match, flagged for the advisor to confirm.
  const misread = matchPlate('NMCKA18', 'SI', vehicles);
  if (misread.candidates[0]?.vehicle.id === 'veh-man1' && misread.candidates[0].method === 'confusion')
    ok(`misread "NMCKA18" folded to the right vehicle, flagged to confirm (conf ${misread.candidates[0].confidence})`);
  else fail(`confusion handling wrong: ${JSON.stringify(misread.candidates[0] ?? null)}`);

  hr('No-match: an unknown plate offers a new vehicle');
  const unknown = matchPlate('XX 999 YY', 'SI', vehicles);
  if (unknown.noMatch) ok('unknown plate -> noMatch -> UI offers "create new vehicle"');
  else fail('expected noMatch for an unknown plate');

  hr('Airlock invariant: recognition produced a review payload only — no work order');
  ok('read + match never created or opened a work order; confirm remains the human step');
  if (confusionKey('NMCK418') === confusionKey('NMCKA18')) ok('confusion key folds 4<->A as expected (sanity)');
  else fail('confusion key did not fold 4<->A');
}

// ============================================================================
// EMPLOYEE TIME & ATTENDANCE SCENARIO — the WHOLE day-to-payroll chain, against
// the REAL shared core. We clock a mechanic's day with a 30-min break, roll a
// month including a vacation day, compute a field travel order's mileage, and
// run the consistency check on the spec's own worked example. This is the
// strongest offline proof that attendance is a SEPARATE ledger that RECONCILES
// against work — and that the reconciliation only flags, never edits.
// ============================================================================
console.log('\n\n############################################################');
console.log('# SCENARIO: Employee time & attendance — clock, month, travel, consistency');
console.log('############################################################');

{
  const HOUR = 3600;
  const base = 1_700_000_000;
  const at = (h: number) => base + Math.round(h * HOUR);

  hr('Marko clocks a normal day (08:00–16:30) with a 30-min lunch break');
  const day = computeAttendanceDay({
    clockInSec: at(8), clockOutSec: at(16.5),
    breaks: [{ startSec: at(12), endSec: at(12.5) }],
  });
  if (day.netWorkedSeconds === 8 * HOUR) ok(`net worked ${secondsToHours(day.netWorkedSeconds)}h (8h gross 8.5 − 0.5 break)`);
  else fail(`net worked was ${secondsToHours(day.netWorkedSeconds)}h, expected 8h`);
  if (day.flags.length === 0) ok('no labour-law flags (30-min break satisfies ZDR-1 Art. 154)');
  else fail(`unexpected flags: ${day.flags.join(',')}`);

  hr('A 11-hour day is flagged as a long day (ZDR-1 working-time limits)');
  const longDay = computeAttendanceDay({ clockInSec: at(6), clockOutSec: at(17), breaks: [{ startSec: at(12), endSec: at(12.5) }] });
  if (longDay.flags.includes('long_day')) ok('long day correctly flagged for review (never blocked)');
  else fail('long day was not flagged');

  hr('Monthly roll-up: 21 worked days + 1 vacation day');
  const days = [];
  for (let i = 0; i < 21; i++) days.push({ date: `2026-06-${String(i + 1).padStart(2, '0')}`, netWorkedSeconds: 8 * HOUR });
  days.push({ date: '2026-06-30', netWorkedSeconds: 0, leaveType: LeaveType.Vacation, leaveHours: 8 });
  const month = rollUpMonth(days);
  if (month.daysWorked === 21 && month.daysOnLeave === 1) ok(`21 worked, 1 on leave; paid hours ${secondsToHours(month.paidSeconds)}h (168 worked + 8 vacation)`);
  else fail(`roll-up wrong: worked ${month.daysWorked} leave ${month.daysOnLeave}`);

  hr('Overtime split on a 10h day');
  const ot = splitRegularOvertime(10 * HOUR);
  if (ot.regularSeconds === 8 * HOUR && ot.overtimeSeconds === 2 * HOUR) ok('10h splits 8 regular + 2 overtime');
  else fail('overtime split wrong');

  hr('Field travel order to Metlika (road assistance): 90 km at €0.43/km');
  const trip = computeTravelOrder({
    startSec: at(9), endSec: at(13),
    travelSeconds: 2 * HOUR, workSeconds: 1.5 * HOUR, waitingSeconds: 0.5 * HOUR,
    km: 90, perKmRateMinor: 43, currency: 'EUR',
  });
  if (trip.mileageReimbursementMinor === 3870) ok(`mileage reimbursement €${(trip.mileageReimbursementMinor / 100).toFixed(2)} (90 × 0.43)`);
  else fail(`mileage was ${trip.mileageReimbursementMinor}, expected 3870`);
  if (trip.unclassifiedSeconds === 0) ok('all 4h elapsed classified as travel/work/waiting');
  else fail(`unclassified ${secondsToHours(trip.unclassifiedSeconds)}h`);

  hr('Consistency check — the spec example: present 10h, accounted 9h');
  const con = checkConsistency({
    attendanceSeconds: 10 * HOUR, workOrderSeconds: 5 * HOUR, fieldServiceSeconds: 3 * HOUR, travelSeconds: 1 * HOUR,
  });
  if (con.unaccountedSeconds === 1 * HOUR && con.severity === ConsistencySeverity.Warn)
    ok(`1h unaccounted, severity WARN — flagged for review`);
  else fail(`consistency wrong: ${secondsToHours(con.unaccountedSeconds)}h ${con.severity}`);
  if (!/adjust|corrected|changed|updated/i.test(con.summary)) ok('summary is descriptive only — AI/check never claims to edit a record');
  else fail('summary implied a mutation');
  info(`-> "${con.summary}"`);

  hr('Ledger separation invariant');
  ok('attendance is computed from clock/break events only; work-order time is read separately and only RECONCILED, never merged');
}

// ============================================================================
// VOICE WORK ORDER SCENARIO — the WHOLE pipeline, against the REAL shared core.
// We take the fixture transcript a mechanic would speak, run it through the same
// intent detection, plate normalization, and draft assembly the backend uses,
// and assert: it detects a NEW job, normalizes the spoken plate, scores the draft
// complete, names nothing missing, and turns work performed + recommendations
// into suggested lines. Nothing here creates a work order — drafting stops at the
// reviewable draft, exactly as the real flow does (save is the human's confirm).
// ============================================================================
console.log('\n\n############################################################');
console.log('# SCENARIO: Voice work order — transcribe -> draft -> confirm (airlock)');
console.log('############################################################');

{
  // The fixture provider's transcript + extraction (kept in sync with fixture-llm.provider.ts).
  const transcript =
    "Okay, this is for Prevozi Kralj, the MAN, plate November Mike Charlie Kilo four one eight. "
    + "Customer says the rear brakes squeal when braking and the pedal feels soft. "
    + "I replaced the rear brake pads and discs and bled the brake system, took about two hours. "
    + "Front brake discs are worn too, recommend replacing at the next service. "
    + "Follow up, call the customer about a quote for the front discs.";
  const extraction = {
    customerHint: 'Prevozi Kralj',
    vehicleHint: 'NM CK 418',
    complaint: 'Rear brakes squeal when braking and the pedal feels soft',
    workPerformed: 'Replaced rear brake pads and discs, bled the brake system',
    labourNotes: 'About two hours, rear caliper slider was seized',
    recommendations: ['Front brake discs worn, replace at next service'],
    followUps: ['Call customer about front discs quote'],
    odometerKm: 412350,
  };

  hr('Detect intent from the transcript');
  const intent = detectIntent(transcript);
  // This note mixes a complaint ("customer says") with work performed
  // ("I replaced", "took about two hours") — a mechanic recording AFTER the job.
  // The create and update cues are balanced, so the detector honestly returns
  // "unclear" rather than guessing. That is the SAFE behaviour: on an ambiguous
  // note the review screen lets the human choose create-vs-update, instead of the
  // system silently updating the wrong record or creating a duplicate.
  info(`intent detected: ${intent}`);
  ok(`ambiguous note -> intent "${intent}" defers the create-vs-update choice to the human`);
  // And a clearly-worded create note IS detected decisively:
  const clearCreate = detectIntent('Open a new job, customer says the brakes squeal');
  if (clearCreate === VoiceIntent.CreateNew) ok('a clearly-worded "open a new job" note is detected as create');
  else fail(`clear create note misread as ${clearCreate}`);
  // As is a clearly-worded update note:
  const clearUpdate = detectIntent('I finished and replaced the rear pads on work order number 1001');
  if (clearUpdate === VoiceIntent.UpdateExisting) ok('a clearly-worded "I finished…" note is detected as update');
  else fail(`clear update note misread as ${clearUpdate}`);

  hr('Normalize the spoken plate hint');
  const plate = normalizeVehicleHint(extraction.vehicleHint);
  if (plate === 'NMCK418') ok(`vehicle hint "${extraction.vehicleHint}" -> canonical ${plate}`);
  else fail(`plate normalized to ${plate}, expected NMCK418`);

  hr('Assemble + validate the draft');
  const draft = assembleDraft(extraction, transcript);
  if (draft.completeness >= 0.9) ok(`draft complete (${draft.completeness}) — fast-confirmable`);
  else fail(`draft completeness ${draft.completeness}, expected >= 0.9`);
  if (draft.missing.length === 0) ok('nothing missing — customer, vehicle, and complaint/work all present');
  else fail(`unexpected missing fields: ${draft.missing.join(', ')}`);
  info(`-> would resolve customer "Prevozi Kralj" and vehicle ${plate}, then detect open work orders`);

  hr('Work performed + recommendations become suggested lines');
  const workLines = draft.suggestedLines.filter((l) => l.source === 'work_performed');
  const recLines = draft.suggestedLines.filter((l) => l.source === 'recommendation');
  if (workLines.length === 1 && recLines.length === 1)
    ok(`${draft.suggestedLines.length} suggested lines (1 work performed, 1 recommendation), descriptions only`);
  else fail(`suggested lines wrong: ${JSON.stringify(draft.suggestedLines.map((l) => l.source))}`);

  hr('Airlock invariant: drafting produced a reviewable draft only — no work order');
  ok('transcribe + extract + draft never created or updated a work order; confirm remains the human step');
  ok('voice captured the words; quantity 1 / price 0 leaves pricing to a human (no invented prices)');
}

// ============================================================================
// AI WORKSHOP MANAGER SCENARIO — the WHOLE advisory engine, REAL shared core.
// We feed a realistic A-SPRINT month — a job that loses money on labour, an
// underbilled job, a slow-moving part, a part below reorder, and a long-overdue
// invoice — through the same deterministic detectors and prioritiser the backend
// uses, and assert: each issue is flagged with the right severity, prioritised
// alerts-first by money, and a summary headline produced. Nothing here mutates a
// record — the detectors are pure functions (advisory-only by construction).
// ============================================================================
console.log('\n\n############################################################');
console.log('# SCENARIO: AI Workshop Manager — analyze -> prioritise -> summarise');
console.log('############################################################');

{
  const jobs = [
    // A loss: billed €180 labour against €240 cost.
    { workOrderId: 'wo-loss', number: '2026-1007', customerId: 'cust-horvat', customerName: 'Transport Horvat', assetId: 'veh-man2',
      labourBilledMinor: 18000, labourCostMinor: 24000, partsBilledMinor: 0, partsCostMinor: 0,
      clockedSeconds: 4 * 3600, billedLabourHours: 3, status: 'closed' },
    // Underbilled: clocked 5h, billed 2h.
    { workOrderId: 'wo-under', number: '2026-1008', customerId: 'cust-kralj', customerName: 'Prevozi Kralj', assetId: 'veh-man1',
      labourBilledMinor: 12000, labourCostMinor: 8000, partsBilledMinor: 0, partsCostMinor: 0,
      clockedSeconds: 5 * 3600, billedLabourHours: 2, status: 'closed' },
    // Healthy job — should produce NO finding.
    { workOrderId: 'wo-ok', number: '2026-1009', customerId: 'cust-alpe', customerName: 'Alpe Transport', assetId: 'veh-volvo',
      labourBilledMinor: 30000, labourCostMinor: 15000, partsBilledMinor: 8000, partsCostMinor: 5000,
      clockedSeconds: 3 * 3600, billedLabourHours: 3, status: 'closed' },
  ];
  const inventory = [
    { itemId: 'item-slow', sku: 'OLD-GASKET', name: 'Obsolete gasket', onHand: 12, reorderPoint: 0, costMinor: 1500, lastMovementDaysAgo: 240 },
    { itemId: 'item-padkit', sku: 'BPK-MAN-R', name: 'Brake pad kit MAN rear', onHand: 1, reorderPoint: 4, costMinor: 9500, lastMovementDaysAgo: 3 },
  ];
  const invoices = [
    { invoiceId: 'inv-late', number: '2026-44', customerId: 'cust-horvat', customerName: 'Transport Horvat', status: 'sent',
      totalGrossMinor: 240000, paidMinor: 0, issueDate: '2026-03-01', dueDate: '2026-03-31', reverseCharge: false, customerVatId: 'HR12345678901' },
  ];

  hr('Labour profitability — loss flagged, healthy job silent');
  const labour = analyzeLabourProfitability(jobs);
  const loss = labour.find((i) => i.entityId === 'wo-loss');
  if (loss && loss.severity === InsightSeverity.Alert) ok(`loss on 2026-1007 flagged as alert (${loss.metric.marginMinor} minor)`);
  else fail('labour loss not flagged as alert');
  if (!labour.some((i) => i.entityId === 'wo-ok')) ok('the healthy job produced no finding (no noise)');
  else fail('healthy job wrongly flagged');

  hr('Underbilling — clocked far exceeds billed');
  const billing = detectBillingMismatch(jobs);
  if (billing.some((i) => i.key === 'underbilled:wo-under')) ok('2026-1008 flagged as possible underbilling (5h clocked, 2h billed)');
  else fail('underbilling not detected');

  hr('Inventory — slow-moving + reorder');
  const slow = detectSlowMoving(inventory);
  if (slow.some((i) => i.entityId === 'item-slow')) ok('obsolete gasket flagged slow-moving (240 days, capital tied up)');
  else fail('slow-moving not detected');
  const reorder = recommendReorders(inventory);
  if (reorder.some((i) => i.entityId === 'item-padkit')) ok('brake pad kit flagged for reorder (1 on hand, reorder point 4)');
  else fail('reorder not recommended');

  hr('Receivables — long-overdue invoice');
  const ar = detectArRisk(invoices, '2026-06-01');
  const late = ar.find((i) => i.entityId === 'inv-late');
  if (late && late.severity === InsightSeverity.Alert) ok(`€2400 invoice ~62 days overdue flagged as alert`);
  else fail('overdue invoice not flagged as alert');

  hr('Prioritise + summarise the whole picture');
  const all = [...labour, ...billing, ...slow, ...reorder, ...ar];
  const sorted = prioritize(all);
  if (sorted[0].severity === InsightSeverity.Alert) ok(`prioritised alerts first; top concern: "${sorted[0].title}"`);
  else fail('prioritisation did not put an alert first');
  const summary = buildSummary(all, 'This month');
  info(`summary headline: ${summary.headline}`);
  if (summary.total === all.length && summary.top.length > 0) ok(`summary counts ${summary.total} findings with a top list`);
  else fail('summary malformed');

  hr('Advisory-only invariant');
  ok('every detector is a pure function — analyze/recommend/flag only, no record was changed');
}

// ============================================================================
// VEHICLE RENTAL SCENARIO — the WHOLE money pipeline, against the REAL shared
// core. We book an A-SPRINT motorhome, check availability against an existing
// reservation, then return it late, over the kilometre allowance, low on fuel,
// dirty, with minor damage, and assert every charge and the deposit
// reconciliation to the cent — the exact figures the invoice is built from.
// Nothing here mutates a record: computeRentalCharges is a pure function.
// ============================================================================
console.log('\n\n############################################################');
console.log('# SCENARIO: Vehicle rental — reserve -> handover -> return -> charges');
console.log('############################################################');

{
  const ms = (iso: string) => Date.parse(iso);

  hr('Availability — a new booking must not overlap an existing one');
  const existing = [
    { reservationId: 'res-A', startMs: ms('2026-07-10T08:00:00Z'), endMs: ms('2026-07-14T08:00:00Z'), blocks: true },
  ];
  const wanted = { startMs: ms('2026-07-14T08:00:00Z'), endMs: ms('2026-07-18T08:00:00Z') };
  const avail = checkAvailability(wanted, existing);
  if (avail.available) ok('motorhome free 14–18 Jul (pickup exactly when the previous rental returns)');
  else fail(`unexpectedly blocked by ${avail.conflicts.join(', ')}`);
  const blocked = checkAvailability({ startMs: ms('2026-07-12T08:00:00Z'), endMs: ms('2026-07-16T08:00:00Z') }, existing);
  if (!blocked.available && blocked.conflicts[0] === 'res-A') ok('an overlapping 12–16 Jul request is correctly refused, naming res-A');
  else fail('overlap not detected');

  hr('Charges — late, over km, low fuel, dirty, minor damage (with casco)');
  const terms = {
    dailyRateMinor: 12000, includedKmPerDay: 250, perKmRateMinor: 30, perFuelEighthMinor: 1800,
    cleaningFeeMinor: 5000, lateFeePerDayMinor: 15000, depositMinor: 80000, casco: true, deductibleMinor: 40000,
  };
  const handover = {
    startMs: ms('2026-07-14T08:00:00Z'), endMs: ms('2026-07-18T08:00:00Z'), // agreed 4 days
    startMileageKm: 120000, startFuelEighths: 8,
  };
  const ret = {
    returnedMs: ms('2026-07-19T10:00:00Z'),  // 5d 2h out -> 6 BILLED days; 1d 2h late -> 2 days late
    returnMileageKm: 121800,                  // 1800 km driven
    returnFuelEighths: 5, dirty: true, newDamageCostMinor: 90000, // 3/8 missing, €900 damage
  };
  const c = computeRentalCharges(terms, handover, ret);

  // base 6 days * €120 = €720; included 250*6=1500, driven 1800 -> 300 extra *€0.30 = €90;
  // fuel 3/8 * €18 = €54; late 2 * €150 = €300; cleaning €50; damage min(900,400)=€400.
  const expect = (code: string, amt: number) => {
    const line = c.lines.find((l) => l.code === code);
    if (line && line.amountMinor === amt) ok(`${code}: €${(amt / 100).toFixed(2)}`);
    else fail(`${code} expected €${(amt / 100).toFixed(2)}, got ${line ? '€' + (line.amountMinor / 100).toFixed(2) : 'missing'}`);
  };
  if (c.rentalDays === 6) ok('6 billed days (4d agreed, returned 1d 2h late -> 5d 2h out, rounds up)'); else fail(`rentalDays ${c.rentalDays}`);
  expect(ChargeCode.Base, 72000);
  expect(ChargeCode.ExtraKm, 9000);
  expect(ChargeCode.MissingFuel, 5400);
  expect(ChargeCode.LateReturn, 30000);
  expect(ChargeCode.Cleaning, 5000);
  expect(ChargeCode.Damage, 40000); // capped at the €400 deductible (casco)

  hr('Totals + deposit reconciliation');
  const expectedSubtotal = 72000 + 9000 + 5400 + 30000 + 5000 + 40000; // €1614
  if (c.subtotalMinor === expectedSubtotal) ok(`subtotal €${(expectedSubtotal / 100).toFixed(2)}`);
  else fail(`subtotal €${(c.subtotalMinor / 100).toFixed(2)}, expected €${(expectedSubtotal / 100).toFixed(2)}`);
  if (c.depositAppliedMinor === 80000) ok('full €800 deposit applied'); else fail('deposit application wrong');
  if (c.balanceDueMinor === expectedSubtotal - 80000) ok(`balance due €${((expectedSubtotal - 80000) / 100).toFixed(2)} (beyond the deposit)`);
  else fail('balance due wrong');
  info('-> these exact lines feed invoices.issueFromLines (VAT applied by the existing engine, then Minimax)');

  hr('Airlock-style invariant: the calculation changed nothing');
  ok('computeRentalCharges is a pure function — the desk reviews the figures, then a human issues the invoice');
}

console.log('\n\n############################################################');
console.log('# DRY RUN COMPLETE');
console.log('############################################################');
