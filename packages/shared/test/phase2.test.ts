import { test, assert, assertEqual, assertThrows } from "./harness.ts";
import {
  WorkOrderState as WS,
  TimeTracking as TT,
  Inventory as INV,
  Pricing as P,
  Money as M,
} from "../src/index.ts";
import { WorkOrderStatus } from "../src/domain/enums.ts";

/* ---------------- Work Order state machine ---------------- */

test("state: legal happy path transitions are allowed", () => {
  assert(WS.canTransition(WorkOrderStatus.Draft, WorkOrderStatus.Open), "draft->open");
  assert(WS.canTransition(WorkOrderStatus.Open, WorkOrderStatus.InProgress), "open->in_progress");
  assert(WS.canTransition(WorkOrderStatus.InProgress, WorkOrderStatus.Ready), "in_progress->ready");
  assert(WS.canTransition(WorkOrderStatus.Ready, WorkOrderStatus.Invoiced), "ready->invoiced");
  assert(WS.canTransition(WorkOrderStatus.Invoiced, WorkOrderStatus.Closed), "invoiced->closed");
});

test("state: illegal transitions are rejected", () => {
  assert(!WS.canTransition(WorkOrderStatus.Draft, WorkOrderStatus.Invoiced), "no draft->invoiced");
  assert(!WS.canTransition(WorkOrderStatus.Invoiced, WorkOrderStatus.InProgress), "no re-open after invoice");
  assert(!WS.canTransition(WorkOrderStatus.Closed, WorkOrderStatus.Open), "closed is terminal");
  assertThrows(() => WS.assertTransition(WorkOrderStatus.Closed, WorkOrderStatus.Open), "closed terminal throws");
});

test("state: terminal states have no successors", () => {
  assert(WS.isTerminal(WorkOrderStatus.Closed), "closed terminal");
  assert(WS.isTerminal(WorkOrderStatus.Cancelled), "cancelled terminal");
  assertEqual(WS.allowedNextStates(WorkOrderStatus.Closed).length, 0);
});

test("state: guard blocks Ready while a mechanic is clocked in", () => {
  assertThrows(
    () => WS.assertTransition(WorkOrderStatus.InProgress, WorkOrderStatus.Ready, { openTimeEntries: 1 }),
    "ready blocked with open entries",
  );
  // with no open entries it is allowed
  WS.assertTransition(WorkOrderStatus.InProgress, WorkOrderStatus.Ready, { openTimeEntries: 0 });
});

test("state: guard blocks invoicing an empty work order", () => {
  assertThrows(
    () => WS.assertTransition(WorkOrderStatus.Ready, WorkOrderStatus.Invoiced, { hasBillableLines: false }),
    "no invoice without lines",
  );
});

/* ---------------- Time tracking ---------------- */

const entry = (start: string, end: string | null): TT.TimeEntry => ({
  id: "te", workOrderId: "wo", mechanicId: "m1", startedAt: start, endedAt: end,
});

test("time: duration in seconds", () => {
  assertEqual(TT.durationSeconds(entry("2026-06-06T08:00:00Z", "2026-06-06T10:30:00Z")), 9000);
});

test("time: open entry cannot be measured", () => {
  assertThrows(() => TT.durationSeconds(entry("2026-06-06T08:00:00Z", null)));
});

test("time: cannot clock on while already clocked in", () => {
  assertThrows(() => TT.assertCanClockOn([entry("2026-06-06T08:00:00Z", null)]));
  TT.assertCanClockOn([]); // ok when none open
});

test("time: labour cost = 2.5h @ 65.00 = 162.50", () => {
  const e = entry("2026-06-06T08:00:00Z", "2026-06-06T10:30:00Z"); // 2.5h
  const cost = TT.labourCost(e, M.money("EUR", 6500n));
  assertEqual(cost.minor, 16250n);
});

test("time: efficiency ratio", () => {
  // standard 2h, clocked 2.5h -> 0.8 (slower than book)
  const r = TT.efficiencyRatio(9000, 7200);
  assert(r !== null && Math.abs(r - 0.8) < 1e-9, "0.8 efficiency");
});

/* ---------------- Inventory ---------------- */

test("inventory: receive then reserve then issue", () => {
  let s: INV.StockState = { onHand: 0, reserved: 0 };
  s = INV.applyMovement(s, INV.MovementType.Receive, 10);
  assertEqual(s, { onHand: 10, reserved: 0 });
  s = INV.applyMovement(s, INV.MovementType.Reserve, 4);
  assertEqual(s, { onHand: 10, reserved: 4 });
  assertEqual(INV.available(s), 6);
  s = INV.applyMovement(s, INV.MovementType.Issue, 4);
  assertEqual(s, { onHand: 6, reserved: 0 });
});

test("inventory: cannot reserve more than available", () => {
  const s: INV.StockState = { onHand: 5, reserved: 3 }; // available 2
  assertThrows(() => INV.applyMovement(s, INV.MovementType.Reserve, 3));
});

test("inventory: cannot issue more than reserved", () => {
  const s: INV.StockState = { onHand: 5, reserved: 1 };
  assertThrows(() => INV.applyMovement(s, INV.MovementType.Issue, 2));
});

test("inventory: release returns stock to available", () => {
  let s: INV.StockState = { onHand: 5, reserved: 5 };
  s = INV.applyMovement(s, INV.MovementType.Release, 2);
  assertEqual(s, { onHand: 5, reserved: 3 });
  assertEqual(INV.available(s), 2);
});

/* ---------------- Line pricing ---------------- */

test("pricing: worked example 2.5h @ 65, 10% disc, 22% VAT", () => {
  const lp = P.priceLine({
    unitPrice: M.money("EUR", 6500n),
    quantity: "2.5",
    discountPct: "10",
    vatRatePct: "22",
  });
  assertEqual(lp.base.minor, 16250n);    // 162.50
  assertEqual(lp.discount.minor, 1625n); // 16.25
  assertEqual(lp.net.minor, 14625n);     // 146.25
  assertEqual(lp.vat.minor, 3218n);      // 32.18 (rounded once)
  assertEqual(lp.gross.minor, 17843n);   // 178.43
});

test("pricing: totals roll up net and vat independently", () => {
  const a = P.priceLine({ unitPrice: M.money("EUR", 10000n), quantity: "1", discountPct: "0", vatRatePct: "22" });
  const b = P.priceLine({ unitPrice: M.money("EUR", 5000n), quantity: "2", discountPct: "0", vatRatePct: "22" });
  const totals = P.sumTotals([a, b], "EUR");
  assertEqual(totals.net.minor, 20000n);   // 100 + 100
  assertEqual(totals.vat.minor, 4400n);     // 22 + 22
  assertEqual(totals.gross.minor, 24400n);
});
