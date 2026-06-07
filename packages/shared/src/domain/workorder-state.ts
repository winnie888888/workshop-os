/**
 * Work Order state machine (PRD §4.4, Master Blueprint §18).
 *
 * The work order is the spine of the shop floor: every job, every clocked
 * minute, every part issued, and ultimately every invoice hangs off it. If the
 * rules about *which state can follow which* are wrong, the business bleeds in
 * ways that are hard to detect — a job gets invoiced before it is finished, or
 * a closed job is silently re-opened and re-billed. So we model the transitions
 * as a single, explicit, side-effect-free table and test every edge. The API
 * and the (future) offline bay client both import this exact logic, so the rule
 * cannot drift between server and device.
 *
 * Think of it as a board game: each square (status) lists exactly which squares
 * you may move to next. You can never teleport; you can only follow an arrow
 * that exists. Terminal squares (closed, cancelled) have no outgoing arrows.
 */

import { WorkOrderStatus } from "./enums";

/**
 * The allowed-transition table. Read it as: "from KEY you may move to any of
 * VALUES". Anything not listed is forbidden. We intentionally write it out in
 * full rather than deriving it, because the explicitness *is* the safety.
 */
const TRANSITIONS: Record<WorkOrderStatus, ReadonlyArray<WorkOrderStatus>> = {
  // A brand-new draft can be opened for work or abandoned.
  [WorkOrderStatus.Draft]: [WorkOrderStatus.Open, WorkOrderStatus.Cancelled],

  // Open: scheduled/accepted but not yet being worked. It can start, be put on
  // hold, wait for parts, or be cancelled before any work happens.
  [WorkOrderStatus.Open]: [
    WorkOrderStatus.InProgress,
    WorkOrderStatus.OnHold,
    WorkOrderStatus.AwaitingParts,
    WorkOrderStatus.Cancelled,
  ],

  // In progress: a mechanic is actually working. From here the job may need
  // customer approval for extra work, may stall waiting for parts, may be
  // paused, or may reach "ready" (work physically complete).
  [WorkOrderStatus.InProgress]: [
    WorkOrderStatus.AwaitingApproval,
    WorkOrderStatus.AwaitingParts,
    WorkOrderStatus.OnHold,
    WorkOrderStatus.Ready,
    WorkOrderStatus.Cancelled,
  ],

  // Waiting on the customer to approve additional work (the dispute-proofing
  // step from the Master Blueprint). They say yes -> back to work; the whole
  // job can still be cancelled if they decline everything.
  [WorkOrderStatus.AwaitingApproval]: [
    WorkOrderStatus.InProgress,
    WorkOrderStatus.OnHold,
    WorkOrderStatus.Cancelled,
  ],

  // Waiting on parts to arrive. Once they do, work resumes.
  [WorkOrderStatus.AwaitingParts]: [
    WorkOrderStatus.InProgress,
    WorkOrderStatus.OnHold,
    WorkOrderStatus.Cancelled,
  ],

  // Explicitly paused. Resume into progress, or cancel.
  [WorkOrderStatus.OnHold]: [
    WorkOrderStatus.InProgress,
    WorkOrderStatus.AwaitingParts,
    WorkOrderStatus.Cancelled,
  ],

  // Work is physically done and the vehicle is ready. The only money-making
  // exit is to invoice it; we also allow a controlled re-open back into
  // progress in case the advisor spots something before billing.
  [WorkOrderStatus.Ready]: [WorkOrderStatus.Invoiced, WorkOrderStatus.InProgress],

  // Once invoiced, the job can only be closed. It can never be re-opened or
  // re-billed — corrections happen via credit notes, never by mutating the WO.
  [WorkOrderStatus.Invoiced]: [WorkOrderStatus.Closed],

  // Terminal states: no outgoing arrows.
  [WorkOrderStatus.Closed]: [],
  [WorkOrderStatus.Cancelled]: [],
};

/** Is this a state from which no further transition is possible? */
export function isTerminal(status: WorkOrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/** Pure predicate: may we move from `from` to `to`? */
export function canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** The set of legal next states (useful for driving UI buttons). */
export function allowedNextStates(from: WorkOrderStatus): ReadonlyArray<WorkOrderStatus> {
  return TRANSITIONS[from];
}

export class IllegalTransitionError extends Error {
  readonly from: WorkOrderStatus;
  readonly to: WorkOrderStatus;
  constructor(from: WorkOrderStatus, to: WorkOrderStatus) {
    super(`Illegal work order transition: ${from} -> ${to}`);
    this.name = "IllegalTransitionError";
    this.from = from;
    this.to = to;
  }
}

/**
 * Guarded transition. In addition to the structural table above, some moves
 * carry *business* preconditions that the table alone cannot express — e.g. you
 * may not mark a job Ready while a mechanic is still clocked in, and you may not
 * invoice a job that has no billable lines. We surface those as guard inputs so
 * the caller (which knows the live aggregate) supplies the facts, and the rule
 * stays pure and testable.
 */
export interface TransitionGuards {
  /** Number of time entries still open (mechanic clocked in but not out). */
  openTimeEntries?: number;
  /** Whether the work order has at least one line to bill. */
  hasBillableLines?: boolean;
  /** Whether every "awaiting approval" item has been resolved by the customer. */
  approvalsResolved?: boolean;
}

export function assertTransition(
  from: WorkOrderStatus,
  to: WorkOrderStatus,
  guards: TransitionGuards = {},
): void {
  if (!canTransition(from, to)) {
    throw new IllegalTransitionError(from, to);
  }

  // You cannot declare the work physically finished while someone is still on
  // the clock against it — that would corrupt labour cost and productivity.
  if (to === WorkOrderStatus.Ready && (guards.openTimeEntries ?? 0) > 0) {
    throw new Error("Cannot mark Ready: mechanics are still clocked in");
  }

  // You cannot leave the approval gate for more work until the customer has
  // actually responded to the pending approval items.
  if (from === WorkOrderStatus.AwaitingApproval && to === WorkOrderStatus.InProgress
      && guards.approvalsResolved === false) {
    throw new Error("Cannot resume work: customer approval is still pending");
  }

  // You cannot invoice an empty job.
  if (to === WorkOrderStatus.Invoiced && guards.hasBillableLines === false) {
    throw new Error("Cannot invoice: work order has no billable lines");
  }
}
