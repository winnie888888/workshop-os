/**
 * Rental charges (Phase 12) — the deterministic money of a rental, and the
 * provable heart of this module.
 *
 * When a vehicle comes back, the desk must turn a handful of readings (return
 * mileage, return fuel, when it came back, any new damage) plus the agreed terms
 * into a precise set of charges. Getting this right — to the cent, at the
 * boundaries — is exactly the kind of correctness-critical arithmetic that must
 * live in the tested shared core, not in a service method. So this module takes
 * the terms and the return readings and produces NET charge lines in minor units
 * that the existing invoicing engine then applies VAT to. It computes; it never
 * persists, prices VAT, or touches a record.
 *
 * Money is integer minor units (cents). Fuel is in EIGHTHS (0..8), the way a
 * fuel gauge reads and the way a handover protocol records it. Distances are
 * whole kilometres. Time is epoch milliseconds.
 */

// ---------------------------------------------------------------------------
// The agreed terms (from the contract) and the readings (from handover/return).
// ---------------------------------------------------------------------------

export interface RentalTerms {
  /** Daily rental rate, minor units. */
  dailyRateMinor: number;
  /** Kilometres included PER DAY (0 = unlimited not assumed; 0 means none included). */
  includedKmPerDay: number;
  /** Charge per kilometre over the included allowance, minor units. */
  perKmRateMinor: number;
  /** Charge per missing eighth of fuel at return (incl. refuel service), minor units. */
  perFuelEighthMinor: number;
  /** Flat cleaning fee if the vehicle returns dirty, minor units. */
  cleaningFeeMinor: number;
  /** Late return fee per started day beyond the agreed end, minor units. */
  lateFeePerDayMinor: number;
  /** Deposit held, minor units (applied against charges, remainder refunded). */
  depositMinor: number;
  /** Whether comprehensive (casco) cover was taken. */
  casco: boolean;
  /** The customer's damage liability cap when casco applies, minor units. */
  deductibleMinor: number;
}

export interface HandoverReadings {
  startMs: number;       // agreed/actual pickup time
  endMs: number;         // agreed return time
  startMileageKm: number;
  startFuelEighths: number; // 0..8
}

export interface ReturnReadings {
  returnedMs: number;       // actual return time
  returnMileageKm: number;
  returnFuelEighths: number; // 0..8
  /** Whether the desk recorded the vehicle as returned dirty. */
  dirty: boolean;
  /**
   * Assessed cost of NEW damage at return, minor units (0 if none). The shared
   * core does not decide whether damage exists — a human assesses it; we only
   * apply the casco/deductible rule to the assessed amount.
   */
  newDamageCostMinor: number;
}

// ---------------------------------------------------------------------------
// The result: a set of net charge lines plus a deposit reconciliation.
// ---------------------------------------------------------------------------

export const ChargeCode = {
  Base: 'base_rental',
  ExtraKm: 'extra_km',
  MissingFuel: 'missing_fuel',
  LateReturn: 'late_return',
  Cleaning: 'cleaning',
  Damage: 'damage',
} as const;
export type ChargeCode = (typeof ChargeCode)[keyof typeof ChargeCode];

export interface ChargeLine {
  code: ChargeCode;
  description: string;
  /** Quantity (days, km, eighths) for transparency; 1 for flat fees. */
  quantity: number;
  unitMinor: number;
  amountMinor: number; // quantity * unitMinor (always >= 0)
}

export interface RentalChargeResult {
  lines: ChargeLine[];
  /** Sum of all charge lines, net of VAT, minor units. */
  subtotalMinor: number;
  /** Days the vehicle was actually out (for the base charge). */
  rentalDays: number;
  /** Kilometres driven and how many exceeded the allowance. */
  kmDriven: number;
  includedKm: number;
  extraKm: number;
  /** Eighths of fuel missing at return (0 if returned full-enough). */
  missingFuelEighths: number;
  /** Days late (0 if on time). */
  daysLate: number;
  /** Deposit reconciliation. */
  depositMinor: number;
  /** Charges applied against the deposit (min of subtotal and deposit). */
  depositAppliedMinor: number;
  /** Deposit returned to the customer (deposit - applied, never negative). */
  depositRefundMinor: number;
  /** Amount still owed beyond the deposit (subtotal - deposit, never negative). */
  balanceDueMinor: number;
}

function days(startMs: number, endMs: number): number {
  if (!(endMs > startMs)) return 1;
  return Math.max(1, Math.ceil((endMs - startMs) / (24 * 3600 * 1000)));
}
function eur(minor: number): string { return `€${(minor / 100).toFixed(2)}`; }

/**
 * Compute all rental charges from the terms and readings. Each component is its
 * own line so the customer can see exactly what they are paying for, and the
 * deposit is reconciled at the end. Every amount is clamped to be non-negative —
 * a vehicle returned with MORE fuel or fewer km than allowed is never a credit
 * here (that is a goodwill decision a human makes, not an automatic refund).
 */
export function computeRentalCharges(
  terms: RentalTerms,
  handover: HandoverReadings,
  ret: ReturnReadings,
): RentalChargeResult {
  const lines: ChargeLine[] = [];

  // --- Base rental: actual days out (return time, not just agreed end). ----
  const billedDays = days(handover.startMs, ret.returnedMs);
  if (terms.dailyRateMinor > 0) {
    lines.push({
      code: ChargeCode.Base, description: `Rental ${billedDays} day${billedDays === 1 ? '' : 's'}`,
      quantity: billedDays, unitMinor: terms.dailyRateMinor, amountMinor: billedDays * terms.dailyRateMinor,
    });
  }

  // --- Extra kilometres beyond the allowance (included per day * days). ----
  const kmDriven = Math.max(0, ret.returnMileageKm - handover.startMileageKm);
  const includedKm = terms.includedKmPerDay * billedDays;
  const extraKm = Math.max(0, kmDriven - includedKm);
  if (extraKm > 0 && terms.perKmRateMinor > 0) {
    lines.push({
      code: ChargeCode.ExtraKm, description: `Extra ${extraKm} km over ${includedKm} km included`,
      quantity: extraKm, unitMinor: terms.perKmRateMinor, amountMinor: extraKm * terms.perKmRateMinor,
    });
  }

  // --- Missing fuel: returned with less than picked up (full-to-equal). ----
  const missingFuelEighths = Math.max(0, handover.startFuelEighths - ret.returnFuelEighths);
  if (missingFuelEighths > 0 && terms.perFuelEighthMinor > 0) {
    lines.push({
      code: ChargeCode.MissingFuel, description: `Missing fuel ${missingFuelEighths}/8`,
      quantity: missingFuelEighths, unitMinor: terms.perFuelEighthMinor,
      amountMinor: missingFuelEighths * terms.perFuelEighthMinor,
    });
  }

  // --- Late return: started days beyond the agreed end. --------------------
  const daysLate = ret.returnedMs > handover.endMs ? days(handover.endMs, ret.returnedMs) : 0;
  if (daysLate > 0 && terms.lateFeePerDayMinor > 0) {
    lines.push({
      code: ChargeCode.LateReturn, description: `Late return ${daysLate} day${daysLate === 1 ? '' : 's'}`,
      quantity: daysLate, unitMinor: terms.lateFeePerDayMinor, amountMinor: daysLate * terms.lateFeePerDayMinor,
    });
  }

  // --- Cleaning fee (flat). -----------------------------------------------
  if (ret.dirty && terms.cleaningFeeMinor > 0) {
    lines.push({
      code: ChargeCode.Cleaning, description: 'Cleaning fee',
      quantity: 1, unitMinor: terms.cleaningFeeMinor, amountMinor: terms.cleaningFeeMinor,
    });
  }

  // --- Damage: with casco, the customer pays up to the deductible; without
  // casco, they are liable for the full assessed cost. ---------------------
  if (ret.newDamageCostMinor > 0) {
    const damageCharge = terms.casco
      ? Math.min(ret.newDamageCostMinor, terms.deductibleMinor)
      : ret.newDamageCostMinor;
    if (damageCharge > 0) {
      lines.push({
        code: ChargeCode.Damage,
        description: terms.casco
          ? `Damage liability (deductible, assessed ${eur(ret.newDamageCostMinor)})`
          : `Damage liability (no comprehensive cover, assessed ${eur(ret.newDamageCostMinor)})`,
        quantity: 1, unitMinor: damageCharge, amountMinor: damageCharge,
      });
    }
  }

  const subtotalMinor = lines.reduce((s, l) => s + l.amountMinor, 0);

  // --- Deposit reconciliation. --------------------------------------------
  const depositMinor = Math.max(0, terms.depositMinor);
  const depositAppliedMinor = Math.min(subtotalMinor, depositMinor);
  const depositRefundMinor = Math.max(0, depositMinor - subtotalMinor);
  const balanceDueMinor = Math.max(0, subtotalMinor - depositMinor);

  return {
    lines, subtotalMinor, rentalDays: billedDays,
    kmDriven, includedKm, extraKm, missingFuelEighths, daysLate,
    depositMinor, depositAppliedMinor, depositRefundMinor, balanceDueMinor,
  };
}
