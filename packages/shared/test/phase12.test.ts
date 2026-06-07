import { test, assert, assertEqual } from './harness.ts';
import {
  rangesOverlap, checkAvailability, rentalDays, isValidRange,
  type BookingWindow,
} from '../src/domain/rental-availability.ts';
import {
  computeRentalCharges, ChargeCode,
  type RentalTerms, type HandoverReadings, type ReturnReadings,
} from '../src/domain/rental-charges.ts';

const DAY = 24 * 3600 * 1000;
const ms = (iso: string) => Date.parse(iso);

// ===========================================================================
// Availability — overlap at the boundaries.
// ===========================================================================

test('rangesOverlap: clearly overlapping ranges overlap', () => {
  assert(rangesOverlap({ startMs: 0, endMs: 10 }, { startMs: 5, endMs: 15 }), 'should overlap');
});
test('rangesOverlap: touching at a single instant does NOT overlap (return == pickup)', () => {
  assert(!rangesOverlap({ startMs: 0, endMs: 10 }, { startMs: 10, endMs: 20 }), 'touching is not overlapping');
});
test('rangesOverlap: disjoint ranges do not overlap', () => {
  assert(!rangesOverlap({ startMs: 0, endMs: 5 }, { startMs: 10, endMs: 15 }), 'disjoint');
});

test('checkAvailability: free when no booking conflicts', () => {
  const existing: BookingWindow[] = [
    { reservationId: 'r1', startMs: ms('2026-07-01'), endMs: ms('2026-07-05'), blocks: true },
  ];
  const r = checkAvailability({ startMs: ms('2026-07-05'), endMs: ms('2026-07-08') }, existing);
  assert(r.available, 'pickup exactly when previous returns is free');
  assertEqual(r.conflicts.length, 0);
});
test('checkAvailability: blocked, names the conflicting reservation', () => {
  const existing: BookingWindow[] = [
    { reservationId: 'r1', startMs: ms('2026-07-01'), endMs: ms('2026-07-10'), blocks: true },
  ];
  const r = checkAvailability({ startMs: ms('2026-07-05'), endMs: ms('2026-07-08') }, existing);
  assert(!r.available, 'overlapping booking blocks');
  assertEqual(r.conflicts[0], 'r1');
});
test('checkAvailability: a cancelled window does not block', () => {
  const existing: BookingWindow[] = [
    { reservationId: 'r1', startMs: ms('2026-07-01'), endMs: ms('2026-07-10'), blocks: false },
  ];
  const r = checkAvailability({ startMs: ms('2026-07-05'), endMs: ms('2026-07-08') }, existing);
  assert(r.available, 'cancelled booking ignored');
});
test('isValidRange / rentalDays conventions', () => {
  assert(!isValidRange({ startMs: 10, endMs: 10 }), 'zero-length invalid');
  assertEqual(rentalDays(ms('2026-07-01T08:00:00Z'), ms('2026-07-01T20:00:00Z')), 1); // part of a day = 1
  assertEqual(rentalDays(ms('2026-07-01T08:00:00Z'), ms('2026-07-02T09:00:00Z')), 2); // 25h = 2 days
});

// ===========================================================================
// Charges — the deterministic money.
// ===========================================================================

const terms: RentalTerms = {
  dailyRateMinor: 8000,        // €80/day
  includedKmPerDay: 200,
  perKmRateMinor: 25,          // €0.25/km
  perFuelEighthMinor: 1500,    // €15 per missing eighth
  cleaningFeeMinor: 3000,      // €30
  lateFeePerDayMinor: 12000,   // €120/day late
  depositMinor: 50000,         // €500 deposit
  casco: true,
  deductibleMinor: 30000,      // €300 deductible
};
const handover: HandoverReadings = {
  startMs: ms('2026-07-01T08:00:00Z'), endMs: ms('2026-07-04T08:00:00Z'),
  startMileageKm: 50000, startFuelEighths: 8,
};

test('charges: clean on-time return within allowance = base only', () => {
  const ret: ReturnReadings = {
    returnedMs: ms('2026-07-04T08:00:00Z'), returnMileageKm: 50500, // 500 km, allowance 600
    returnFuelEighths: 8, dirty: false, newDamageCostMinor: 0,
  };
  const r = computeRentalCharges(terms, handover, ret);
  assertEqual(r.lines.length, 1);
  assertEqual(r.lines[0].code, ChargeCode.Base);
  assertEqual(r.rentalDays, 3);
  assertEqual(r.subtotalMinor, 24000); // 3 * €80
  // Deposit fully refunded, nothing owed beyond it.
  assertEqual(r.depositRefundMinor, 50000 - 24000); // €260
  assertEqual(r.balanceDueMinor, 0);
});

test('charges: extra km billed over the day-scaled allowance', () => {
  const ret: ReturnReadings = {
    returnedMs: ms('2026-07-04T08:00:00Z'), returnMileageKm: 50800, // 800 km, allowance 600 -> 200 extra
    returnFuelEighths: 8, dirty: false, newDamageCostMinor: 0,
  };
  const r = computeRentalCharges(terms, handover, ret);
  const km = r.lines.find((l) => l.code === ChargeCode.ExtraKm);
  assertEqual(r.extraKm, 200);
  assertEqual(km?.amountMinor, 200 * 25); // €50
});

test('charges: missing fuel billed per eighth', () => {
  const ret: ReturnReadings = {
    returnedMs: ms('2026-07-04T08:00:00Z'), returnMileageKm: 50100,
    returnFuelEighths: 5, dirty: false, newDamageCostMinor: 0, // 3 eighths missing
  };
  const r = computeRentalCharges(terms, handover, ret);
  assertEqual(r.missingFuelEighths, 3);
  const fuel = r.lines.find((l) => l.code === ChargeCode.MissingFuel);
  assertEqual(fuel?.amountMinor, 3 * 1500); // €45
});

test('charges: late return billed per started day', () => {
  const ret: ReturnReadings = {
    returnedMs: ms('2026-07-05T09:00:00Z'), returnMileageKm: 50100, // ~1 day + 1h late = 2 days late
    returnFuelEighths: 8, dirty: false, newDamageCostMinor: 0,
  };
  const r = computeRentalCharges(terms, handover, ret);
  assertEqual(r.daysLate, 2);
  const late = r.lines.find((l) => l.code === ChargeCode.LateReturn);
  assertEqual(late?.amountMinor, 2 * 12000); // €240
});

test('charges: with casco, damage is capped at the deductible', () => {
  const ret: ReturnReadings = {
    returnedMs: ms('2026-07-04T08:00:00Z'), returnMileageKm: 50100,
    returnFuelEighths: 8, dirty: false, newDamageCostMinor: 120000, // €1200 assessed
  };
  const r = computeRentalCharges(terms, handover, ret);
  const dmg = r.lines.find((l) => l.code === ChargeCode.Damage);
  assertEqual(dmg?.amountMinor, 30000); // capped at €300 deductible
});

test('charges: without casco, customer pays the full assessed damage', () => {
  const noCasco: RentalTerms = { ...terms, casco: false };
  const ret: ReturnReadings = {
    returnedMs: ms('2026-07-04T08:00:00Z'), returnMileageKm: 50100,
    returnFuelEighths: 8, dirty: false, newDamageCostMinor: 120000,
  };
  const r = computeRentalCharges(noCasco, handover, ret);
  const dmg = r.lines.find((l) => l.code === ChargeCode.Damage);
  assertEqual(dmg?.amountMinor, 120000); // full €1200
});

test('charges: everything at once, deposit applied and balance due computed', () => {
  const ret: ReturnReadings = {
    returnedMs: ms('2026-07-05T09:00:00Z'),   // 4 days 1 hour out -> 5 BILLED days; 1 day 1h late -> 2 days late
    returnMileageKm: 51200,                    // 1200 km driven
    returnFuelEighths: 6, dirty: true, newDamageCostMinor: 50000,
  };
  const r = computeRentalCharges(terms, handover, ret);
  assertEqual(r.rentalDays, 5);
  // included km = 200/day * 5 days = 1000; driven 1200 -> 200 extra.
  assertEqual(r.extraKm, 200);
  assertEqual(r.daysLate, 2);
  // base 5*80=400; extra km 200*0.25=50; fuel 2*15=30; late 2*120=240; cleaning 30; damage min(500,300)=300.
  assertEqual(r.subtotalMinor, 40000 + 5000 + 3000 + 24000 + 3000 + 30000); // €1050
  assertEqual(r.depositAppliedMinor, 50000);      // full €500 deposit applied
  assertEqual(r.balanceDueMinor, r.subtotalMinor - 50000); // €550 still owed
  assertEqual(r.depositRefundMinor, 0);
});

test('charges: returning with MORE fuel is never an automatic credit', () => {
  const ret: ReturnReadings = {
    returnedMs: ms('2026-07-04T08:00:00Z'), returnMileageKm: 50100,
    returnFuelEighths: 8, dirty: false, newDamageCostMinor: 0,
  };
  const less: HandoverReadings = { ...handover, startFuelEighths: 6 };
  const r = computeRentalCharges(terms, less, ret); // returned fuller than taken
  assertEqual(r.missingFuelEighths, 0);
  assert(!r.lines.some((l) => l.code === ChargeCode.MissingFuel), 'no fuel credit line');
});
