/**
 * Inventory movement rules (PRD §4.5, Master Blueprint §18 workflow).
 *
 * Stock is deceptively hard because two numbers must stay consistent at all
 * times: how many units we physically have (on_hand) and how many are already
 * promised to open jobs (reserved). The amount you can still promise to a new
 * job is `available = on_hand - reserved`. If these ever drift, you either
 * promise parts you don't have (and a truck waits) or hoard parts you do have
 * (and cash is tied up). So we model every movement as a pure reducer over the
 * current stock state and forbid any move that would break the invariants.
 *
 * The lifecycle of a part on a work order:
 *   RECEIVE  (+on_hand)              goods arrive from a supplier
 *   RESERVE  (+reserved)            a work order line claims stock
 *   ISSUE    (-on_hand, -reserved)  the mechanic actually fits the part
 *   RELEASE  (-reserved)            the line is removed before issue
 *   ADJUST   (+/-on_hand)           stocktake correction
 *
 * Quantities are integers in the item's stocking unit (we do not allow
 * fractional pieces here; fractional consumables are modelled as smaller units).
 */

export const MovementType = {
  Receive: "receive",
  Reserve: "reserve",
  Issue: "issue",
  Release: "release",
  Adjust: "adjust",
  // Transfers between locations (Phase 5.0). A transfer is an atomic PAIR of
  // movements in one transaction: a TransferOut at the source and a TransferIn
  // at the destination, sharing a transfer id. Modelling both halves keeps the
  // ledger honest — it can never show a half-completed move.
  TransferOut: "transfer_out",
  TransferIn: "transfer_in",
} as const;
export type MovementType = (typeof MovementType)[keyof typeof MovementType];

export interface StockState {
  onHand: number;
  reserved: number;
}

export function available(state: StockState): number {
  return state.onHand - state.reserved;
}

export class InventoryError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "InventoryError";
  }
}

function assertValidState(s: StockState): void {
  if (!Number.isInteger(s.onHand) || !Number.isInteger(s.reserved)) {
    throw new InventoryError("Stock quantities must be integers");
  }
  if (s.onHand < 0) throw new InventoryError("on_hand cannot be negative");
  if (s.reserved < 0) throw new InventoryError("reserved cannot be negative");
  if (s.reserved > s.onHand) {
    throw new InventoryError("reserved cannot exceed on_hand");
  }
}

/**
 * Apply one movement to the current state and return the new state. Pure: it
 * does not touch the database; the repository persists whatever this returns,
 * inside the same transaction as the work order change.
 */
export function applyMovement(state: StockState, type: MovementType, qty: number): StockState {
  assertValidState(state);
  if (!Number.isInteger(qty) || qty <= 0) {
    if (type === MovementType.Adjust && Number.isInteger(qty)) {
      // adjustments may be negative (corrections) but not zero
      if (qty === 0) throw new InventoryError("Adjustment quantity cannot be zero");
    } else {
      throw new InventoryError("Movement quantity must be a positive integer");
    }
  }

  switch (type) {
    case MovementType.Receive:
      return finalize({ onHand: state.onHand + qty, reserved: state.reserved });

    case MovementType.Reserve: {
      if (qty > available(state)) {
        throw new InventoryError(
          `Cannot reserve ${qty}: only ${available(state)} available`,
        );
      }
      return finalize({ onHand: state.onHand, reserved: state.reserved + qty });
    }

    case MovementType.Release: {
      if (qty > state.reserved) {
        throw new InventoryError(`Cannot release ${qty}: only ${state.reserved} reserved`);
      }
      return finalize({ onHand: state.onHand, reserved: state.reserved - qty });
    }

    case MovementType.Issue: {
      // Issuing a part consumes both a reservation and physical stock.
      if (qty > state.reserved) {
        throw new InventoryError(`Cannot issue ${qty}: only ${state.reserved} reserved`);
      }
      if (qty > state.onHand) {
        throw new InventoryError(`Cannot issue ${qty}: only ${state.onHand} on hand`);
      }
      return finalize({ onHand: state.onHand - qty, reserved: state.reserved - qty });
    }

    case MovementType.Adjust:
      return finalize({ onHand: state.onHand + qty, reserved: state.reserved });

    case MovementType.TransferOut: {
      // Leaving this location: physical stock decreases. We do not touch
      // reserved — a transfer moves only free (unreserved) stock, and the
      // caller is responsible for not transferring reserved units. Guard
      // against transferring more than is free to avoid stranding reservations.
      if (qty > available(state)) {
        throw new InventoryError(
          `Cannot transfer out ${qty}: only ${available(state)} available (unreserved) here`,
        );
      }
      return finalize({ onHand: state.onHand - qty, reserved: state.reserved });
    }

    case MovementType.TransferIn:
      // Arriving at this location: physical stock increases, like a receipt.
      return finalize({ onHand: state.onHand + qty, reserved: state.reserved });

    default: {
      const _exhaustive: never = type;
      throw new InventoryError(`Unknown movement type: ${String(_exhaustive)}`);
    }
  }
}

function finalize(s: StockState): StockState {
  assertValidState(s);
  return s;
}
