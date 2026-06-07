import { test, assert, assertEqual } from './harness.ts';
import {
  computeAttendanceDay, splitRegularOvertime, rollUpMonth, dailyRestSufficient,
  isPaidLeave, LeaveType, AttendanceFlag, SI_LABOUR, secondsToHours,
} from '../src/domain/attendance.ts';
import {
  computeTravelOrder, checkConsistency, ConsistencySeverity, TripPurpose,
} from '../src/domain/travel-consistency.ts';

// Helper: build an epoch second from "hours since a base".
const T0 = 1_700_000_000; // arbitrary base
const at = (h: number) => T0 + Math.round(h * 3600);

// ===========================================================================
// Attendance day computation.
// ===========================================================================

test('attendance: a clean 8h day with a 30-min break nets 7.5h', () => {
  const d = computeAttendanceDay({
    clockInSec: at(8), clockOutSec: at(16), // 8h gross
    breaks: [{ startSec: at(12), endSec: at(12.5) }], // 30 min
  });
  assertEqual(d.grossSeconds, 8 * 3600);
  assertEqual(d.breakSeconds, 30 * 60);
  assertEqual(d.netWorkedSeconds, 8 * 3600 - 30 * 60);
  assertEqual(d.open, false);
  assert(!d.flags.includes(AttendanceFlag.BreakTooShort), 'a 30-min break satisfies the entitlement');
});

test('attendance: >6h day with too-short break is flagged (ZDR-1 Art. 154)', () => {
  const d = computeAttendanceDay({
    clockInSec: at(8), clockOutSec: at(15), // 7h gross
    breaks: [{ startSec: at(12), endSec: at(12.1) }], // 6 min only
  });
  assert(d.flags.includes(AttendanceFlag.BreakTooShort), 'short break on a >6h day must be flagged');
});

test('attendance: still clocked in is open and flagged missing clock-out', () => {
  const d = computeAttendanceDay({ clockInSec: at(8), clockOutSec: null, breaks: [] });
  assertEqual(d.open, true);
  assertEqual(d.grossSeconds, 0);
  assert(d.flags.includes(AttendanceFlag.MissingClockOut), 'open day flagged');
});

test('attendance: a long day (>10h) is flagged', () => {
  const d = computeAttendanceDay({
    clockInSec: at(6), clockOutSec: at(17), breaks: [{ startSec: at(12), endSec: at(12.5) }],
  });
  assert(d.flags.includes(AttendanceFlag.LongDay), '11h present should be flagged');
});

test('attendance: overlapping breaks are flagged', () => {
  const d = computeAttendanceDay({
    clockInSec: at(8), clockOutSec: at(16),
    breaks: [{ startSec: at(12), endSec: at(12.5) }, { startSec: at(12.25), endSec: at(12.75) }],
  });
  assert(d.flags.includes(AttendanceFlag.OverlappingBreak), 'overlapping breaks flagged');
});

test('attendance: break outside the shift is flagged', () => {
  const d = computeAttendanceDay({
    clockInSec: at(8), clockOutSec: at(16),
    breaks: [{ startSec: at(17), endSec: at(17.5) }], // after clock-out
  });
  assert(d.flags.includes(AttendanceFlag.BreakOutsideShift), 'break outside shift flagged');
});

test('attendance: negative duration (clock-out before clock-in) is flagged and zeroed', () => {
  const d = computeAttendanceDay({ clockInSec: at(16), clockOutSec: at(8), breaks: [] });
  assert(d.flags.includes(AttendanceFlag.NegativeDuration), 'negative duration flagged');
  assertEqual(d.grossSeconds, 0);
});

// ===========================================================================
// Overtime split.
// ===========================================================================

test('overtime: 8h net is all regular', () => {
  const s = splitRegularOvertime(8 * 3600);
  assertEqual(s.regularSeconds, 8 * 3600);
  assertEqual(s.overtimeSeconds, 0);
});
test('overtime: 10h net is 8 regular + 2 overtime', () => {
  const s = splitRegularOvertime(10 * 3600);
  assertEqual(s.regularSeconds, 8 * 3600);
  assertEqual(s.overtimeSeconds, 2 * 3600);
});

// ===========================================================================
// Daily rest (ZDR-1 Art. 155).
// ===========================================================================

test('daily rest: 12h between clock-out and next clock-in is sufficient', () => {
  assert(dailyRestSufficient(at(18), at(30)), '12h rest is sufficient'); // 30-18 = 12h
});
test('daily rest: 10h between is insufficient', () => {
  assert(!dailyRestSufficient(at(20), at(30)), '10h rest is insufficient');
});

// ===========================================================================
// Leave classification + monthly roll-up.
// ===========================================================================

test('leave: vacation and sick are paid; planned absence is not', () => {
  assert(isPaidLeave(LeaveType.Vacation), 'vacation paid');
  assert(isPaidLeave(LeaveType.SickLeave), 'sick paid');
  assert(!isPaidLeave(LeaveType.PlannedAbsence), 'planned absence not paid-equivalent');
});

test('monthly roll-up: worked days + a vacation day combine correctly', () => {
  const m = rollUpMonth([
    { date: '2026-06-01', netWorkedSeconds: 8 * 3600 },
    { date: '2026-06-02', netWorkedSeconds: 9 * 3600 }, // 1h overtime
    { date: '2026-06-03', netWorkedSeconds: 0, leaveType: LeaveType.Vacation, leaveHours: 8 },
  ]);
  assertEqual(m.daysWorked, 2);
  assertEqual(m.daysOnLeave, 1);
  assertEqual(m.workedSeconds, 17 * 3600);
  assertEqual(m.overtimeSeconds, 1 * 3600);
  assertEqual(m.regularSeconds, 16 * 3600);
  assertEqual(m.totalLeaveSeconds, 8 * 3600);
  assertEqual(m.paidSeconds, 25 * 3600); // 17 worked + 8 vacation
  assertEqual(m.leaveByType[LeaveType.Vacation], 8 * 3600);
});

test('secondsToHours rounds to 2 places', () => {
  assertEqual(secondsToHours(27000), 7.5);
});

// ===========================================================================
// Travel orders.
// ===========================================================================

test('travel order: mileage reimbursement = km * per-km rate (minor units)', () => {
  // 120 km at €0.43/km = €51.60 = 5160 minor units.
  const t = computeTravelOrder({
    startSec: at(8), endSec: at(13),
    travelSeconds: 2 * 3600, workSeconds: 2 * 3600, waitingSeconds: 1 * 3600,
    km: 120, perKmRateMinor: 43, currency: 'EUR',
  });
  assertEqual(t.mileageReimbursementMinor, 5160);
  assertEqual(t.elapsedSeconds, 5 * 3600);
  assertEqual(t.classifiedSeconds, 5 * 3600);
  assertEqual(t.unclassifiedSeconds, 0);
  assertEqual(t.open, false);
});

test('travel order: expenses add to the mileage reimbursement', () => {
  const t = computeTravelOrder({
    startSec: at(8), endSec: at(10), travelSeconds: 3600, workSeconds: 3600, waitingSeconds: 0,
    km: 50, perKmRateMinor: 40, expensesMinor: 1200, currency: 'EUR',
  });
  assertEqual(t.mileageReimbursementMinor, 2000); // 50*40
  assertEqual(t.totalReimbursementMinor, 3200);   // + 12.00 tolls
});

test('travel order: unclassified time surfaces a gap', () => {
  const t = computeTravelOrder({
    startSec: at(8), endSec: at(16), // 8h elapsed
    travelSeconds: 2 * 3600, workSeconds: 3 * 3600, waitingSeconds: 0, // 5h classified
    km: 0, perKmRateMinor: 43, currency: 'EUR',
  });
  assertEqual(t.unclassifiedSeconds, 3 * 3600);
});

test('travel order: open order is flagged, not guessed', () => {
  const t = computeTravelOrder({
    startSec: at(8), endSec: null, travelSeconds: 0, workSeconds: 0, waitingSeconds: 0,
    km: 0, perKmRateMinor: 43, currency: 'EUR',
  });
  assert(t.open, 'open order');
  assert(t.flags.includes('open_travel_order'), 'flagged open');
});

// ===========================================================================
// Consistency check — the spec's worked example and the severity bands.
// ===========================================================================

test('consistency: spec example — 10h present, 9h accounted => 1h unaccounted (warn)', () => {
  const r = checkConsistency({
    attendanceSeconds: 10 * 3600, workOrderSeconds: 5 * 3600,
    fieldServiceSeconds: 3 * 3600, travelSeconds: 1 * 3600,
  });
  assertEqual(r.unaccountedSeconds, 1 * 3600);
  // 1h unaccounted is below the 2h alert threshold => warn.
  assertEqual(r.severity, ConsistencySeverity.Warn);
});

test('consistency: fully reconciled => ok', () => {
  const r = checkConsistency({
    attendanceSeconds: 8 * 3600, workOrderSeconds: 6 * 3600,
    fieldServiceSeconds: 1 * 3600, travelSeconds: 1 * 3600,
  });
  assertEqual(r.unaccountedSeconds, 0);
  assertEqual(r.severity, ConsistencySeverity.Ok);
});

test('consistency: small rounding gap is only info', () => {
  const r = checkConsistency({
    attendanceSeconds: 8 * 3600, workOrderSeconds: 7 * 3600 + 50 * 60, // 7h50
    fieldServiceSeconds: 0, travelSeconds: 0,
  });
  assertEqual(r.severity, ConsistencySeverity.Info); // 10 min gap
});

test('consistency: overbooking (more booked than present) is at least a warning', () => {
  const r = checkConsistency({
    attendanceSeconds: 6 * 3600, workOrderSeconds: 5 * 3600,
    fieldServiceSeconds: 2 * 3600, travelSeconds: 0, // 7h booked vs 6h present
  });
  assert(r.overbookedSeconds === 1 * 3600, '1h overbooked');
  assertEqual(r.severity, ConsistencySeverity.Alert); // >30min overbook => alert
});

test('consistency: never claims to edit — summary is descriptive only', () => {
  const r = checkConsistency({
    attendanceSeconds: 10 * 3600, workOrderSeconds: 5 * 3600, fieldServiceSeconds: 0, travelSeconds: 0,
  });
  assert(r.summary.includes('unaccounted'), 'summary states the gap');
  assert(!/adjust|corrected|changed|updated/i.test(r.summary), 'summary must not claim a mutation');
});

// Reference the labour constants so a drift in them is visible in tests.
test('SI labour constants are the expected statutory values', () => {
  assertEqual(SI_LABOUR.breakEntitlementThresholdHours, 6);
  assertEqual(SI_LABOUR.minBreakMinutes, 30);
  assertEqual(SI_LABOUR.minDailyRestHours, 12);
  assertEqual(SI_LABOUR.standardDayHours, 8);
});

// Touch TripPurpose so its presence is covered.
test('trip purposes include towing and road assistance', () => {
  assertEqual(TripPurpose.Towing, 'towing');
  assertEqual(TripPurpose.RoadAssistance, 'road_assistance');
});
