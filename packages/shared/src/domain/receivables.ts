/**
 * Accounts receivable (PRD §7, Master Blueprint §11).
 *
 * Once an invoice is issued, the money is owed but not yet paid. AR tracks what
 * is outstanding, applies payments to invoices, and ages the debt so the owner
 * knows what is overdue and by how much — the difference between a healthy shop
 * and one that is quietly financing its customers.
 *
 * Two pure pieces live here: how a payment is allocated across open invoices
 * (oldest first, the standard convention), and how outstanding balances are
 * bucketed by age relative to their due dates.
 */

export interface OpenInvoice {
  invoiceId: string;
  issuedAt: string; // ISO date
  dueAt: string; // ISO date
  outstandingMinor: bigint; // remaining unpaid, > 0
}

export interface Allocation {
  invoiceId: string;
  appliedMinor: bigint;
}

/**
 * Allocate a payment across open invoices, oldest due date first. Returns the
 * per-invoice application and any unapplied remainder (an overpayment / credit
 * on account). Never applies more than an invoice's outstanding balance.
 */
export function allocatePayment(
  amountMinor: bigint,
  openInvoices: OpenInvoice[],
): { allocations: Allocation[]; unappliedMinor: bigint } {
  if (amountMinor <= 0n) throw new Error("Payment amount must be positive");
  const ordered = [...openInvoices].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  let remaining = amountMinor;
  const allocations: Allocation[] = [];
  for (const inv of ordered) {
    if (remaining <= 0n) break;
    if (inv.outstandingMinor <= 0n) continue;
    const applied = remaining < inv.outstandingMinor ? remaining : inv.outstandingMinor;
    allocations.push({ invoiceId: inv.invoiceId, appliedMinor: applied });
    remaining -= applied;
  }
  return { allocations, unappliedMinor: remaining };
}

export interface AgingBuckets {
  currency: string;
  current: bigint; // not yet due
  d1_30: bigint;
  d31_60: bigint;
  d61_90: bigint;
  d90_plus: bigint;
  totalMinor: bigint;
}

/**
 * Bucket outstanding balances by how overdue they are at `asOf`. "current" is
 * anything not yet past its due date; the rest are overdue by the named ranges.
 */
export function ageReceivables(
  currency: string,
  openInvoices: OpenInvoice[],
  asOf: string,
): AgingBuckets {
  const asOfMs = Date.parse(asOf);
  const buckets: AgingBuckets = {
    currency, current: 0n, d1_30: 0n, d31_60: 0n, d61_90: 0n, d90_plus: 0n, totalMinor: 0n,
  };
  for (const inv of openInvoices) {
    if (inv.outstandingMinor <= 0n) continue;
    const dueMs = Date.parse(inv.dueAt);
    const overdueDays = Math.floor((asOfMs - dueMs) / 86_400_000);
    if (overdueDays <= 0) buckets.current += inv.outstandingMinor;
    else if (overdueDays <= 30) buckets.d1_30 += inv.outstandingMinor;
    else if (overdueDays <= 60) buckets.d31_60 += inv.outstandingMinor;
    else if (overdueDays <= 90) buckets.d61_90 += inv.outstandingMinor;
    else buckets.d90_plus += inv.outstandingMinor;
    buckets.totalMinor += inv.outstandingMinor;
  }
  return buckets;
}
