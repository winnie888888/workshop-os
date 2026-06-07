/**
 * Stock valuation — moving weighted-average cost (MAC), Phase 5.0.
 *
 * When the same part is bought at different prices over time, "what is a unit
 * worth?" has no single obvious answer. We answer it with the moving weighted
 * average: after each costed receipt the unit value becomes the blend of the
 * stock we already held (at its old average) and the stock just received (at its
 * purchase price), weighted by quantity. MAC is chosen over FIFO cost layers
 * because it is far simpler to hold correct, it produces stable and explainable
 * margins, and it matches how a Slovenian accountant and Minimax think about
 * stock. All amounts are integer minor units; this module never uses floats for
 * money and rounds the blended average to the nearest minor unit.
 *
 * Pure and transport-independent: the repository persists whatever this returns
 * inside the same transaction as the receipt movement.
 */

import { InventoryError } from "./inventory";

export interface MacInput {
  /** Units already on hand BEFORE this receipt (>= 0). */
  onHandBefore: number;
  /** Current average cost per unit, in minor units (>= 0). */
  avgCostMinorBefore: bigint;
  /** Units being received now (> 0). */
  receivedQty: number;
  /** Purchase cost per received unit, in minor units (>= 0). */
  receiptUnitCostMinor: bigint;
}

/**
 * Compute the new moving-average unit cost after a costed receipt.
 *
 * new_avg = round( (onHandBefore·oldAvg + receivedQty·receiptUnitCost)
 *                  / (onHandBefore + receivedQty) )
 *
 * Edge cases handled explicitly:
 *  - first stock (onHandBefore = 0): the average simply becomes the receipt
 *    unit cost — there is nothing to blend with.
 *  - a free receipt (receiptUnitCost = 0) correctly dilutes the average down.
 */
export function movingAverage(input: MacInput): bigint {
  const { onHandBefore, avgCostMinorBefore, receivedQty, receiptUnitCostMinor } = input;

  if (!Number.isInteger(onHandBefore) || onHandBefore < 0) {
    throw new InventoryError("onHandBefore must be a non-negative integer");
  }
  if (!Number.isInteger(receivedQty) || receivedQty <= 0) {
    throw new InventoryError("receivedQty must be a positive integer");
  }
  if (avgCostMinorBefore < 0n || receiptUnitCostMinor < 0n) {
    throw new InventoryError("costs must be non-negative");
  }

  // First stock: nothing to blend with.
  if (onHandBefore === 0) return receiptUnitCostMinor;

  const totalValue =
    avgCostMinorBefore * BigInt(onHandBefore) +
    receiptUnitCostMinor * BigInt(receivedQty);
  const totalQty = BigInt(onHandBefore + receivedQty);

  return roundedDivide(totalValue, totalQty);
}

/**
 * Total value of stock on hand at a given average cost, in minor units.
 * Used by stock-valuation reporting (on_hand × MAC, summed).
 */
export function stockValueMinor(onHand: number, avgCostMinor: bigint): bigint {
  if (!Number.isInteger(onHand) || onHand < 0) {
    throw new InventoryError("onHand must be a non-negative integer");
  }
  return avgCostMinor * BigInt(onHand);
}

/** Divide two bigints and round half-up to the nearest integer (minor unit). */
function roundedDivide(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new InventoryError("denominator must be positive");
  const q = numerator / denominator;
  const r = numerator % denominator;
  // Round half-up: if twice the remainder reaches the denominator, round up.
  return r * 2n >= denominator ? q + 1n : q;
}
