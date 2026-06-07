import { test, assertEqual, assertThrows, assert } from "./harness.ts";
import * as Seq from "../src/sequence.ts";
import * as A from "../src/audit-hash.ts";
import { Role, Permission, hasPermission, permissionsFor } from "../src/roles.ts";
import * as WorkOrderState from "../src/domain/workorder-state.ts";
import { WorkOrderStatus } from "../src/domain/enums.ts";

/* ---- numbering ---- */
test("sequence: gapless increment and format", () => {
  let s = Seq.initialCounter(Seq.DocumentType.Invoice, 2026);
  s = Seq.nextCounter(s, 2026); // 1
  assertEqual(Seq.formatNumber(s), "INV-2026-000001");
  s = Seq.nextCounter(s, 2026); // 2
  s = Seq.nextCounter(s, 2026); // 3
  assertEqual(Seq.formatNumber(s), "INV-2026-000003");
});

test("sequence: resets on new year when resetYearly", () => {
  let s = { docType: Seq.DocumentType.Invoice, year: 2026, value: 42 };
  s = Seq.nextCounter(s, 2027, true);
  assertEqual(Seq.formatNumber(s), "INV-2027-000001");
});

test("sequence: refuses to move backwards in time", () => {
  const s = { docType: Seq.DocumentType.Invoice, year: 2026, value: 5 };
  assertThrows(() => Seq.nextCounter(s, 2025));
});

/* ---- audit hash-chain ---- */
function entry(action: string): A.AuditEntryInput {
  return {
    tenantId: "t1", actorId: "u1", action, entityType: "customer",
    entityId: "c1", before: null, after: { name: "ACME" },
    occurredAt: "2026-06-06T10:00:00.000Z",
  };
}

test("audit: chain links and verifies intact", () => {
  const e1 = A.appendEntry(null, entry("customer.created"));
  const e2 = A.appendEntry(e1, entry("customer.updated"));
  const e3 = A.appendEntry(e2, entry("customer.updated"));
  assertEqual(e1.prevHash, A.GENESIS_HASH);
  assertEqual(e2.prevHash, e1.hash);
  assertEqual(A.verifyChain([e1, e2, e3]), -1);
});

test("audit: tampering is detected", () => {
  const e1 = A.appendEntry(null, entry("customer.created"));
  const e2 = A.appendEntry(e1, entry("customer.updated"));
  // tamper with e1's payload after the fact
  const tampered = { ...e1, after: { name: "EVIL CORP" } } as A.AuditEntry;
  const idx = A.verifyChain([tampered, e2]);
  assert(idx >= 0, "tampering should break the chain");
});

/* ---- RBAC ---- */
test("rbac: mechanic can add time but not issue invoices", () => {
  assert(hasPermission([Role.Mechanic], Permission.WorkOrderLineTime), "mechanic time");
  assert(!hasPermission([Role.Mechanic], Permission.InvoiceIssue), "mechanic no invoice");
});

test("rbac: accountant can issue invoices and approve AI financial", () => {
  assert(hasPermission([Role.Accountant], Permission.InvoiceIssue), "accountant invoice");
  assert(hasPermission([Role.Accountant], Permission.AiApproveFinancial), "accountant ai approve");
  assert(!hasPermission([Role.Accountant], Permission.PricingEdit), "accountant no pricing edit");
});

/* ---- Phase 2 review regression tests ---- */

test("review: no work-order state permits a self-transition (justifies idempotent no-op)", () => {
  // The service treats a transition to the current state as an idempotent
  // no-op. That is only safe because the machine itself never allows X -> X,
  // so a self-transition can only come from a replayed offline mutation.
  for (const s of Object.values(WorkOrderStatus)) {
    assert(!WorkOrderState.canTransition(s, s), `self-transition ${s}->${s} must be illegal`);
  }
});

test("review: audit hash-chain tolerates a bigint (Money) payload", () => {
  // Regression for the line-add crash: a Money minor value is a bigint, and
  // JSON.stringify rejects bigint. canonicalize must coerce it, not throw.
  const withMoney: A.AuditEntryInput = {
    tenantId: "t1", actorId: "u1", action: "workorder.line_added",
    entityType: "work_order_line", entityId: "l1",
    before: null, after: { netMinor: 14625n, currency: "EUR" },
    occurredAt: "2026-06-06T10:00:00.000Z",
  };
  const e1 = A.appendEntry(null, withMoney);
  const e2 = A.appendEntry(e1, withMoney);
  assertEqual(A.verifyChain([e1, e2]), -1);
});
