/**
 * Labour variance & profitability (Phase 3 business rule).
 *
 * The shop tracks three different "hours" for the same job, and the gap between
 * them is where money and information hide:
 *
 *   - CLOCKED hours: what the mechanic actually spent (from time entries). Used
 *     for payroll, productivity and performance — NOT normally for billing.
 *   - STANDARD/BOOK hours: what the job *should* take per the labour catalogue.
 *     This is what the customer is normally invoiced on.
 *   - BILLED hours: what actually went onto the invoice (usually = standard, but
 *     an advisor may have discounted or padded it).
 *
 * The owner must always see all three plus profitability. This module computes
 * the comparison deterministically and raises flags. AI later *explains* and
 * prioritises these flags, but the flags themselves are arithmetic, not a guess,
 * so they are auditable and testable.
 *
 * Profitability for labour = revenue billed − labour cost actually incurred
 * (clocked hours × internal cost rate). A job can be "efficient" (fast vs book)
 * yet unprofitable if it was billed below book, and vice-versa — which is why we
 * surface both efficiency and margin, not one number.
 */

import * as Money from "../money";

export interface LabourFacts {
  currency: string;
  clockedSeconds: number; // actual time on the clock
  standardSeconds: number; // book time for the work performed
  billedSeconds: number; // labour hours actually invoiced
  /** What the customer was charged for labour, in minor units. */
  billedRevenueMinor: bigint;
  /** Internal cost of a clocked hour (wage + overhead), in minor units. */
  internalCostRateMinorPerHour: bigint;
}

export interface VarianceThresholds {
  /** Billed below standard by more than this fraction => underbilling. */
  underbillFraction: number; // e.g. 0.10 = 10%
  /** Billed above standard by more than this fraction => overbilling. */
  overbillFraction: number; // e.g. 0.10
  /** Efficiency (standard/clocked) below this => low productivity. */
  lowProductivityRatio: number; // e.g. 0.75
  /** |clocked-billed|/standard beyond this => unusual deviation. */
  deviationFraction: number; // e.g. 0.25
}

export const DEFAULT_THRESHOLDS: VarianceThresholds = {
  underbillFraction: 0.1,
  overbillFraction: 0.1,
  lowProductivityRatio: 0.75,
  deviationFraction: 0.25,
};

export type FlagKind =
  | "underbilling"
  | "overbilling"
  | "low_productivity"
  | "unusual_deviation";

export interface VarianceFlag {
  kind: FlagKind;
  severity: "info" | "warn" | "alert";
  detail: string;
}

export interface LabourAnalysis {
  clockedHours: number;
  standardHours: number;
  billedHours: number;
  /** standard / clocked; >1 faster than book, <1 slower. null if no clocked time. */
  efficiency: number | null;
  labourCostMinor: bigint; // clocked hours × internal rate (payroll cost)
  billedRevenueMinor: bigint;
  /** revenue − cost, in minor units. */
  marginMinor: bigint;
  /** margin / revenue as a fraction; null if no revenue. */
  marginPct: number | null;
  flags: VarianceFlag[];
}

const SECONDS_PER_HOUR = 3600;

export function analyzeLabour(
  facts: LabourFacts,
  thresholds: VarianceThresholds = DEFAULT_THRESHOLDS,
): LabourAnalysis {
  const clockedHours = facts.clockedSeconds / SECONDS_PER_HOUR;
  const standardHours = facts.standardSeconds / SECONDS_PER_HOUR;
  const billedHours = facts.billedSeconds / SECONDS_PER_HOUR;

  const efficiency = facts.clockedSeconds > 0 ? facts.standardSeconds / facts.clockedSeconds : null;

  // Labour cost = clocked hours × internal cost rate, computed in exact Money.
  const rate = Money.money(facts.currency, facts.internalCostRateMinorPerHour);
  const labourCost = Money.multiplyByQuantity(rate, hoursDecimal(facts.clockedSeconds));
  const marginMinor = facts.billedRevenueMinor - labourCost.minor;
  const marginPct =
    facts.billedRevenueMinor > 0n
      ? Number(marginMinor) / Number(facts.billedRevenueMinor)
      : null;

  const flags: VarianceFlag[] = [];

  // Underbilling / overbilling: billed vs standard.
  if (facts.standardSeconds > 0) {
    const ratio = facts.billedSeconds / facts.standardSeconds;
    if (ratio < 1 - thresholds.underbillFraction) {
      flags.push({
        kind: "underbilling",
        severity: ratio < 1 - thresholds.underbillFraction * 2 ? "alert" : "warn",
        detail: `Billed ${billedHours.toFixed(2)}h vs standard ${standardHours.toFixed(2)}h (${pct(ratio - 1)}).`,
      });
    } else if (ratio > 1 + thresholds.overbillFraction) {
      flags.push({
        kind: "overbilling",
        severity: ratio > 1 + thresholds.overbillFraction * 2 ? "alert" : "warn",
        detail: `Billed ${billedHours.toFixed(2)}h vs standard ${standardHours.toFixed(2)}h (+${pct(ratio - 1)}). Confirm this is justified.`,
      });
    }
  }

  // Low productivity: standard/clocked below the threshold.
  if (efficiency !== null && efficiency < thresholds.lowProductivityRatio) {
    flags.push({
      kind: "low_productivity",
      severity: efficiency < thresholds.lowProductivityRatio / 1.5 ? "alert" : "warn",
      detail: `Efficiency ${pct(efficiency - 1)} (standard ${standardHours.toFixed(2)}h vs clocked ${clockedHours.toFixed(2)}h).`,
    });
  }

  // Unusual deviation between what was clocked and what was billed.
  if (facts.standardSeconds > 0) {
    const dev = Math.abs(facts.clockedSeconds - facts.billedSeconds) / facts.standardSeconds;
    if (dev > thresholds.deviationFraction) {
      flags.push({
        kind: "unusual_deviation",
        severity: dev > thresholds.deviationFraction * 2 ? "alert" : "info",
        detail: `Clocked ${clockedHours.toFixed(2)}h vs billed ${billedHours.toFixed(2)}h deviate by ${pct(dev)} of standard.`,
      });
    }
  }

  return {
    clockedHours, standardHours, billedHours, efficiency,
    labourCostMinor: labourCost.minor,
    billedRevenueMinor: facts.billedRevenueMinor,
    marginMinor, marginPct, flags,
  };
}

function hoursDecimal(seconds: number): string {
  const microHours = Math.round((seconds / SECONDS_PER_HOUR) * 1_000_000);
  const whole = Math.floor(microHours / 1_000_000);
  const frac = (microHours % 1_000_000).toString().padStart(6, "0");
  return `${whole}.${frac}`;
}

function pct(fraction: number): string {
  return `${(fraction * 100).toFixed(0)}%`;
}
