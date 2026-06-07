import { test, assert, assertEqual, assertThrows } from "./harness.ts";
import * as Vat from "../src/domain/vat.ts";
import * as Inv from "../src/domain/invoice.ts";
import * as AR from "../src/domain/receivables.ts";
import * as LA from "../src/domain/labour-analysis.ts";

/* ---------- VAT engine ---------- */

const SI = "SI";

test("vat: domestic SI customer pays standard rate", () => {
  const d = Vat.decideLineVat(
    { supplierCountry: SI, customerCountry: "SI", customerIsBusiness: true, customerVatId: "SI123", customerVatIdValidated: true },
    { kind: "service", domesticRatePct: "22" },
  );
  assertEqual(d.effectiveRatePct, "22");
  assert(!d.reverseCharge, "domestic is not reverse charge");
});

test("vat: EU B2B with validated VAT id is reverse charge at 0", () => {
  const d = Vat.decideLineVat(
    { supplierCountry: SI, customerCountry: "HR", customerIsBusiness: true, customerVatId: "HR999", customerVatIdValidated: true },
    { kind: "service", domesticRatePct: "22" },
  );
  assertEqual(d.treatment, "reverse_charge_eu");
  assertEqual(d.effectiveRatePct, "0");
  assert(d.reverseCharge && d.note !== null, "reverse charge with a legal note");
});

test("vat: EU B2B with UNVALIDATED id withholds reverse charge and flags", () => {
  const d = Vat.decideLineVat(
    { supplierCountry: SI, customerCountry: "DE", customerIsBusiness: true, customerVatId: "DE111", customerVatIdValidated: false },
    { kind: "service", domesticRatePct: "22" },
  );
  assertEqual(d.effectiveRatePct, "22"); // safe default
  assert(!d.reverseCharge, "must not self-apply reverse charge");
  assert(d.requiresHumanConfirmation, "should flag for human confirmation");
});

test("vat: non-EU B2B customer is outside scope (export, 0)", () => {
  const d = Vat.decideLineVat(
    { supplierCountry: SI, customerCountry: "RS", customerIsBusiness: true, customerVatId: null, customerVatIdValidated: false },
    { kind: "service", domesticRatePct: "22" },
  );
  assertEqual(d.treatment, "export_zero");
  assertEqual(d.effectiveRatePct, "0");
});

test("vat: EU consumer (B2C) pays SI VAT", () => {
  const d = Vat.decideLineVat(
    { supplierCountry: SI, customerCountry: "AT", customerIsBusiness: false, customerVatId: null, customerVatIdValidated: false },
    { kind: "service", domesticRatePct: "22" },
  );
  assertEqual(d.effectiveRatePct, "22");
  assert(!d.reverseCharge, "B2C work performed in SI is SI VAT");
});

/* ---------- invoice totals ---------- */

test("invoice: groups VAT per rate and rounds once per rate", () => {
  // Two 22% lines + one 9.5% line. VAT rounded per rate, not per line.
  const totals = Inv.composeInvoiceTotals("EUR", [
    { description: "labour", netMinor: 14625n, effectiveRatePct: "22", reverseCharge: false },
    { description: "part", netMinor: 5000n, effectiveRatePct: "22", reverseCharge: false },
    { description: "consumable", netMinor: 999n, effectiveRatePct: "9.5", reverseCharge: false },
  ]);
  // 22% group net = 19625 -> vat = round(19625*0.22)=4318 (4317.5 -> 4318)
  // 9.5% group net = 999 -> vat = round(999*0.095)=95 (94.905 -> 95)
  assertEqual(totals.netMinor, 20624n);
  assertEqual(totals.vatMinor, 4413n);
  assertEqual(totals.grossMinor, 25037n);
  assertEqual(totals.vatBreakdown.length, 2);
  assertEqual(totals.vatBreakdown[0].ratePct, "22"); // highest rate first
});

test("invoice: reverse-charge lines contribute 0 VAT but appear in breakdown", () => {
  const totals = Inv.composeInvoiceTotals("EUR", [
    { description: "labour", netMinor: 10000n, effectiveRatePct: "0", reverseCharge: true },
  ]);
  assertEqual(totals.vatMinor, 0n);
  assertEqual(totals.grossMinor, 10000n);
  assert(totals.vatBreakdown[0].reverseCharge, "RC group flagged");
});

test("invoice: credit note negates a set of totals", () => {
  const totals = Inv.composeInvoiceTotals("EUR", [
    { description: "labour", netMinor: 10000n, effectiveRatePct: "22", reverseCharge: false },
  ]);
  const credit = Inv.creditOf(totals);
  assertEqual(credit.netMinor, -10000n);
  assertEqual(credit.grossMinor, -(totals.grossMinor));
});

/* ---------- accounts receivable ---------- */

test("ar: payment allocates oldest-due first with remainder", () => {
  const open: AR.OpenInvoice[] = [
    { invoiceId: "B", issuedAt: "2026-02-01", dueAt: "2026-03-03", outstandingMinor: 5000n },
    { invoiceId: "A", issuedAt: "2026-01-01", dueAt: "2026-01-31", outstandingMinor: 3000n },
  ];
  const { allocations, unappliedMinor } = AR.allocatePayment(10000n, open);
  assertEqual(allocations[0].invoiceId, "A"); // oldest due first
  assertEqual(allocations[0].appliedMinor, 3000n);
  assertEqual(allocations[1].appliedMinor, 5000n);
  assertEqual(unappliedMinor, 2000n); // overpayment becomes credit on account
});

test("ar: rejects non-positive payment", () => {
  assertThrows(() => AR.allocatePayment(0n, []));
});

test("ar: ages receivables into buckets", () => {
  const open: AR.OpenInvoice[] = [
    { invoiceId: "current", issuedAt: "2026-05-20", dueAt: "2026-06-19", outstandingMinor: 1000n },
    { invoiceId: "d1_30", issuedAt: "2026-04-20", dueAt: "2026-05-20", outstandingMinor: 2000n },
    { invoiceId: "d90", issuedAt: "2026-01-01", dueAt: "2026-02-01", outstandingMinor: 4000n },
  ];
  const b = AR.ageReceivables("EUR", open, "2026-06-06");
  assertEqual(b.current, 1000n);
  assertEqual(b.d1_30, 2000n);
  assertEqual(b.d90_plus, 4000n);
  assertEqual(b.totalMinor, 7000n);
});

/* ---------- labour variance & profitability ---------- */

test("labour: flags underbilling when billed well below standard", () => {
  const a = LA.analyzeLabour({
    currency: "EUR", clockedSeconds: 3600, standardSeconds: 7200, billedSeconds: 3600,
    billedRevenueMinor: 6500n, internalCostRateMinorPerHour: 3000n,
  });
  assert(a.flags.some((f) => f.kind === "underbilling"), "should flag underbilling");
});

test("labour: flags low productivity when clocked far exceeds standard", () => {
  const a = LA.analyzeLabour({
    currency: "EUR", clockedSeconds: 14400, standardSeconds: 7200, billedSeconds: 7200,
    billedRevenueMinor: 13000n, internalCostRateMinorPerHour: 3000n,
  });
  assert(a.efficiency !== null && a.efficiency < 0.75, "efficiency below threshold");
  assert(a.flags.some((f) => f.kind === "low_productivity"), "should flag low productivity");
});

test("labour: computes margin from billed revenue minus clocked cost", () => {
  // 2h clocked at 30.00/h internal cost = 60.00 cost; billed 130.00 => margin 70.00
  const a = LA.analyzeLabour({
    currency: "EUR", clockedSeconds: 7200, standardSeconds: 7200, billedSeconds: 7200,
    billedRevenueMinor: 13000n, internalCostRateMinorPerHour: 3000n,
  });
  assertEqual(a.labourCostMinor, 6000n);
  assertEqual(a.marginMinor, 7000n);
  assert(a.flags.length === 0, "balanced job raises no flags");
});
