/**
 * Purchase-order lifecycle (Warehouse 5.2). A PO moves through a deliberately
 * small set of states, and only some transitions are legal. Keeping this as a
 * pure, tested reducer — exactly like the work-order state machine — means the
 * rules live in one place and the service cannot accidentally allow an illegal
 * jump (e.g. receiving against a cancelled PO).
 *
 *   draft              being built; lines can still be edited freely
 *   sent               issued to the supplier; awaiting delivery
 *   partially_received some lines received, others outstanding
 *   received           every ordered quantity received
 *   cancelled          abandoned; no further receiving
 *
 * The received/partially_received states are driven by goods receipts: the
 * receiving service computes whether all lines are fully received and asks this
 * module for the resulting status, rather than setting it by hand.
 */

export type PurchaseOrderStatus =
  | "draft"
  | "sent"
  | "partially_received"
  | "received"
  | "cancelled";

export class PurchaseOrderError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "PurchaseOrderError";
  }
}

// Legal manual transitions (the buyer's actions). Receiving-driven moves
// (sent/partially_received -> partially_received/received) are handled by
// receivedStatusFor below, not here.
const MANUAL_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["cancelled"],
  partially_received: ["cancelled"],
  received: [],
  cancelled: [],
};

/** Assert a manual status change is legal; throws otherwise. */
export function assertPoTransition(from: PurchaseOrderStatus, to: PurchaseOrderStatus): void {
  if (!MANUAL_TRANSITIONS[from].includes(to)) {
    throw new PurchaseOrderError(`Illegal purchase-order transition: ${from} -> ${to}`);
  }
}

/** Can lines still be edited? Only while the PO is a draft. */
export function poLinesEditable(status: PurchaseOrderStatus): boolean {
  return status === "draft";
}

/** May we receive against this PO? Not when draft, received, or cancelled. */
export function poCanReceive(status: PurchaseOrderStatus): boolean {
  return status === "sent" || status === "partially_received";
}

/**
 * Given the per-line ordered/received quantities AFTER a goods receipt has been
 * applied, decide the PO's receiving status. Used by the receiving service to
 * advance the PO without hand-setting the status.
 */
export function receivedStatusFor(
  lines: Array<{ qtyOrdered: number; qtyReceived: number }>,
  current: PurchaseOrderStatus,
): PurchaseOrderStatus {
  if (current === "cancelled") return "cancelled"; // never resurrect a cancelled PO
  const anyReceived = lines.some((l) => l.qtyReceived > 0);
  const allReceived = lines.length > 0 && lines.every((l) => l.qtyReceived >= l.qtyOrdered);
  if (allReceived) return "received";
  if (anyReceived) return "partially_received";
  return current; // nothing received yet; leave as-is (e.g. 'sent')
}
