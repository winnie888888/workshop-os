/**
 * Time tracking (PRD §4.4 time entries, Master Blueprint §19 productivity).
 *
 * A "time entry" is one continuous stretch where a single mechanic was clocked
 * onto a single work order. Two things must always hold, and both are easy to
 * get subtly wrong, so we make them pure and test them:
 *
 *   1. A mechanic can only be clocked onto ONE job at a time. If they are still
 *      clocked in somewhere, you must clock them out before starting a new
 *      entry — otherwise their hours get double-counted and both labour cost
 *      and productivity numbers become fiction.
 *
 *   2. Labour cost is duration x hourly rate, computed in exact money (never
 *      floating-point minutes-to-money). We round once, at the end.
 *
 * Durations are handled in whole seconds (integers) so there is no float drift;
 * money uses the bigint Money type.
 */

import * as Money from "../money";

export interface TimeEntry {
  id: string;
  workOrderId: string;
  mechanicId: string;
  startedAt: string; // ISO 8601 UTC
  endedAt: string | null; // null while still clocked in
}

/** Duration of a (closed) entry in whole seconds. Open entries throw. */
export function durationSeconds(entry: TimeEntry): number {
  if (entry.endedAt === null) {
    throw new Error("Cannot measure an open time entry");
  }
  const start = Date.parse(entry.startedAt);
  const end = Date.parse(entry.endedAt);
  if (Number.isNaN(start) || Number.isNaN(end)) throw new Error("Invalid timestamp");
  if (end < start) throw new Error("Time entry ends before it starts");
  return Math.round((end - start) / 1000);
}

/**
 * Guard for clock-on: given a mechanic's currently open entries, refuse to open
 * a second one. We pass in the open entries rather than querying here so the
 * function stays pure and the DB stays the single source of truth.
 */
export function assertCanClockOn(openEntriesForMechanic: TimeEntry[]): void {
  if (openEntriesForMechanic.length > 0) {
    throw new Error("Mechanic is already clocked in on another job");
  }
}

/**
 * Labour cost of a closed entry at a given hourly rate.
 * cost = rate * (seconds / 3600), computed exactly: we multiply the money rate
 * by the decimal-hours quantity and let Money round once, half-away.
 */
export function labourCost(entry: TimeEntry, hourlyRate: Money.Money): Money.Money {
  const seconds = durationSeconds(entry);
  // Convert seconds to a decimal-hours string with enough precision that the
  // single rounding happens in Money, not here. 1 second = 1/3600 h.
  const hours = secondsToHoursDecimal(seconds);
  return Money.multiplyByQuantity(hourlyRate, hours);
}

/** Sum labour cost across many closed entries at one rate (e.g. a whole WO). */
export function totalLabourCost(entries: TimeEntry[], hourlyRate: Money.Money): Money.Money {
  return entries.reduce<Money.Money>(
    (acc, e) => Money.add(acc, labourCost(e, hourlyRate)),
    Money.zero(hourlyRate.currency),
  );
}

/**
 * Billed vs clocked vs standard is the core of productivity (Master Blueprint
 * §19). Efficiency = standard hours / clocked hours. >1 means faster than the
 * book time; <1 means slower. Returned as a ratio; callers format as a %.
 */
export function efficiencyRatio(clockedSeconds: number, standardSeconds: number): number | null {
  if (clockedSeconds <= 0) return null;
  return standardSeconds / clockedSeconds;
}

/** Seconds -> hours as a decimal string with 6 dp (plenty for cent precision). */
function secondsToHoursDecimal(seconds: number): string {
  // Use integer arithmetic to build the string and avoid float artefacts.
  const scaled = Math.round((seconds / 3600) * 1_000_000); // micro-hours
  const sign = scaled < 0 ? "-" : "";
  const abs = Math.abs(scaled);
  const whole = Math.floor(abs / 1_000_000);
  const frac = (abs % 1_000_000).toString().padStart(6, "0");
  return `${sign}${whole}.${frac}`;
}
