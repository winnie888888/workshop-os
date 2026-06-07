/**
 * Travel orders & attendance consistency checks (Phase 9).
 *
 * Two pure concerns that round out the attendance core:
 *
 *   1. Travel order (Slovenian "potni nalog") computation — the time breakdown
 *      and the mileage reimbursement, which feed payroll, accounting, mileage
 *      reimbursement and customer billing. Money is in MINOR units throughout to
 *      avoid rounding drift, since the same figure may be both reimbursed to the
 *      employee and billed to the customer.
 *
 *   2. The consistency check — the reconciliation the spec describes by example:
 *      present 10h, work orders 5h, field service 3h, travel 1h => 1h unaccounted.
 *      This is the bridge between the ATTENDANCE ledger and the WORK ledger. It
 *      only ever COMPUTES A DIFFERENCE and labels it; per both specs, it must
 *      never modify an official record. The AI gateway later wraps a narrative
 *      around these numbers, but the numbers are computed here, deterministically.
 *
 * Pure, dependency-free, tested by execution.
 */

import * as Money from '../money';

const HOUR = 3600;

// ---------------------------------------------------------------------------
// Travel orders.
// ---------------------------------------------------------------------------

/** Categories of trip the spec enumerates, for reporting/profitability. */
export const TripPurpose = {
  FieldRepair: 'field_repair',
  FieldRepairAbroad: 'field_repair_abroad',
  RoadAssistance: 'road_assistance',
  Towing: 'towing',
  PartsPickup: 'parts_pickup',
  CustomerVisit: 'customer_visit',
} as const;
export type TripPurpose = (typeof TripPurpose)[keyof typeof TripPurpose];

export interface TravelOrderInput {
  startSec: number;
  endSec: number | null;
  /** Of the elapsed time, how much was travel / work / waiting (seconds). */
  travelSeconds: number;
  workSeconds: number;
  waitingSeconds: number;
  /** Kilometres driven (decimal allowed), and the per-km rate in MINOR units. */
  km: number;
  perKmRateMinor: number;
  /** Extra expenses already in minor units (tolls, parking…). */
  expensesMinor?: number;
  currency: string;
}

export interface TravelOrderComputed {
  elapsedSeconds: number;
  /** Sum of the three categorised times (should be <= elapsed; gap = unclassified). */
  classifiedSeconds: number;
  /** elapsed - classified; surfaced so the reviewer sees unclassified time. */
  unclassifiedSeconds: number;
  mileageReimbursementMinor: number;
  expensesMinor: number;
  totalReimbursementMinor: number;
  open: boolean;
  flags: string[];
}

/**
 * Compute a travel order. Mileage reimbursement = km * per-km rate, rounded
 * half-up to the minor unit. We deliberately do NOT invent a clock-out; an open
 * order reports elapsed 0 and is flagged, exactly like attendance.
 */
export function computeTravelOrder(input: TravelOrderInput): TravelOrderComputed {
  const flags: string[] = [];
  const open = input.endSec == null;

  let elapsedSeconds = 0;
  if (!open) {
    elapsedSeconds = (input.endSec as number) - input.startSec;
    if (elapsedSeconds < 0) { flags.push('negative_duration'); elapsedSeconds = 0; }
  } else {
    flags.push('open_travel_order');
  }

  const classifiedSeconds = input.travelSeconds + input.workSeconds + input.waitingSeconds;
  if (!open && classifiedSeconds > elapsedSeconds) flags.push('classified_exceeds_elapsed');
  const unclassifiedSeconds = open ? 0 : Math.max(0, elapsedSeconds - classifiedSeconds);

  if (input.km < 0) flags.push('negative_mileage');
  const km = Math.max(0, input.km);

  // km (possibly decimal) * minor-unit rate, half-up. We compute in a float and
  // round once, which is safe because km has at most 1 decimal in practice and
  // the rate is a small integer of cents.
  const mileageReimbursementMinor = Math.round(km * input.perKmRateMinor);
  const expensesMinor = Math.max(0, input.expensesMinor ?? 0);
  const totalReimbursementMinor = mileageReimbursementMinor + expensesMinor;

  return {
    elapsedSeconds, classifiedSeconds, unclassifiedSeconds,
    mileageReimbursementMinor, expensesMinor, totalReimbursementMinor,
    open, flags,
  };
}

/** Format a travel order's total reimbursement as Money, for export/display. */
export function reimbursementMoney(computed: TravelOrderComputed, currency: string): Money.Money {
  return Money.money(currency as Money.CurrencyCode, BigInt(computed.totalReimbursementMinor));
}

// ---------------------------------------------------------------------------
// Consistency check — reconcile attendance against the work ledgers.
// ---------------------------------------------------------------------------

export interface ConsistencyInput {
  /** Net worked seconds from ATTENDANCE (the person was present this much). */
  attendanceSeconds: number;
  /** Seconds booked to work orders (the existing work-order time ledger). */
  workOrderSeconds: number;
  /** Seconds booked to field-service events. */
  fieldServiceSeconds: number;
  /** Seconds booked to travel orders. */
  travelSeconds: number;
}

export const ConsistencySeverity = {
  Ok: 'ok',
  Info: 'info',
  Warn: 'warn',
  Alert: 'alert',
} as const;
export type ConsistencySeverity = (typeof ConsistencySeverity)[keyof typeof ConsistencySeverity];

export interface ConsistencyResult {
  accountedSeconds: number;
  /** attendance - accounted. Positive = time present but not booked anywhere. */
  unaccountedSeconds: number;
  /** Negative unaccounted means MORE was booked than present — also suspicious. */
  overbookedSeconds: number;
  severity: ConsistencySeverity;
  /** A neutral, factual description of the gap (NOT a decision or an edit). */
  summary: string;
}

/**
 * Reconcile a day (or any period). Returns the gap and a severity, NEVER an
 * edit. Thresholds: a small gap (<= ~30 min) is informational rounding; up to
 * ~2h is a warning; beyond that, an alert. Overbooking (more booked than
 * present) is always at least a warning because it cannot be legitimate.
 */
export function checkConsistency(input: ConsistencyInput): ConsistencyResult {
  const accountedSeconds = input.workOrderSeconds + input.fieldServiceSeconds + input.travelSeconds;
  const diff = input.attendanceSeconds - accountedSeconds;
  const unaccountedSeconds = Math.max(0, diff);
  const overbookedSeconds = Math.max(0, -diff);

  let severity: ConsistencySeverity = ConsistencySeverity.Ok;
  if (overbookedSeconds > 30 * 60) severity = ConsistencySeverity.Alert;
  else if (overbookedSeconds > 0) severity = ConsistencySeverity.Warn;
  else if (unaccountedSeconds > 2 * HOUR) severity = ConsistencySeverity.Alert;
  else if (unaccountedSeconds > 30 * 60) severity = ConsistencySeverity.Warn;
  else if (unaccountedSeconds > 0) severity = ConsistencySeverity.Info;

  const h = (s: number) => (Math.round((s / HOUR) * 100) / 100).toString();
  let summary: string;
  if (overbookedSeconds > 0) {
    summary = `Booked ${h(accountedSeconds)}h against ${h(input.attendanceSeconds)}h present `
      + `— ${h(overbookedSeconds)}h more booked than attended. Review for clock or booking error.`;
  } else if (unaccountedSeconds > 0) {
    summary = `Present ${h(input.attendanceSeconds)}h, accounted ${h(accountedSeconds)}h `
      + `(work orders, field service, travel) — ${h(unaccountedSeconds)}h unaccounted.`;
  } else {
    summary = `Attendance and booked work reconcile (${h(input.attendanceSeconds)}h).`;
  }

  return { accountedSeconds, unaccountedSeconds, overbookedSeconds, severity, summary };
}
