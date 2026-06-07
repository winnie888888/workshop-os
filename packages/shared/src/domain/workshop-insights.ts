/**
 * Workshop insights (Phase 11) — the deterministic engine behind the AI Manager.
 *
 * The single most important design decision in this phase lives here, so let me
 * state it plainly. The AI Workshop Manager must be ADVISORY ONLY: it may
 * analyze, recommend, prioritize, explain, and flag, but it must never compute a
 * financial fact that an owner then trusts blindly, and it must never modify a
 * record. We honour both halves by splitting the work:
 *
 *   - The SYSTEM computes every number here, deterministically, with ordinary
 *     arithmetic over data the backend has read. These functions are pure: data
 *     in, findings out, no database, no side effects, no model. So every figure
 *     an owner sees ("billed €180 against €240 labour cost") is reproducible and
 *     auditable, and the eighteen analyses are eighteen testable detectors.
 *   - The AI (in the backend, over the gateway) only PHRASES and PRIORITIZES the
 *     findings these functions produce. It cannot invent a margin or decide an
 *     invoice is overdue, because it is never asked to; it is handed the computed
 *     findings and asked for a readable narrative.
 *
 * Money is in integer minor units throughout (cents). Times are epoch seconds or
 * ISO dates as noted. Nothing here can alter an official record — there is no
 * write path in this file, by construction.
 */

// ---------------------------------------------------------------------------
// The common Insight shape every detector emits. `metric` carries the raw
// numbers behind the finding so the UI and the audit trail can show the
// working; `recommendation` is advisory text only and is NEVER executed.
// ---------------------------------------------------------------------------

export const InsightSeverity = {
  Info: 'info',
  Warn: 'warn',
  Alert: 'alert',
} as const;
export type InsightSeverity = (typeof InsightSeverity)[keyof typeof InsightSeverity];

export const InsightCategory = {
  Profitability: 'profitability',
  Productivity: 'productivity',
  Inventory: 'inventory',
  Attendance: 'attendance',
  Receivables: 'receivables',
  Invoice: 'invoice',
  Summary: 'summary',
} as const;
export type InsightCategory = (typeof InsightCategory)[keyof typeof InsightCategory];

export interface Insight {
  /** Stable key (category + entity) so repeated runs dedupe rather than pile up. */
  key: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  /** Plain-language explanation, INCLUDING the numbers, so it is self-auditing. */
  detail: string;
  /** The raw numbers behind the finding (minor units / counts / ratios). */
  metric: Record<string, number>;
  entityType?: string;
  entityId?: string;
  /** Advisory next step — shown to a human, never executed automatically. */
  recommendation?: string;
}

// Severity ranking for deterministic prioritisation.
const SEVERITY_RANK: Record<InsightSeverity, number> = { alert: 3, warn: 2, info: 1 };

function eur(minor: number): string {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  return `${sign}€${(abs / 100).toFixed(2)}`;
}
function pct(ratio: number): string { return `${(ratio * 100).toFixed(1)}%`; }
function round2(n: number): number { return Math.round(n * 100) / 100; }

// ===========================================================================
// PROFITABILITY & PRODUCTIVITY
// ===========================================================================

/** One work order's billed/cost figures, assembled by the backend from lines + time. */
export interface JobFinancials {
  workOrderId: string;
  number: string | null;
  customerId: string;
  customerName: string;
  assetId: string | null;
  /** Billed labour (sum of labour line net), minor units. */
  labourBilledMinor: number;
  /** Labour cost (sum of time-entry cost_minor), minor units. */
  labourCostMinor: number;
  /** Billed parts (sum of part line net), minor units. */
  partsBilledMinor: number;
  /** Parts cost (sum of issued part cost), minor units. */
  partsCostMinor: number;
  /** Clocked seconds against the job (for productivity). */
  clockedSeconds: number;
  /** Billed labour hours (sum of labour line quantity, hours). */
  billedLabourHours: number;
  status: string;
}

/**
 * 1. Labour profitability. Flags jobs where billed labour fails to cover labour
 * cost (a loss), or where margin is thin. Healthy jobs produce no finding —
 * insights should be exceptions worth an owner's attention, not noise.
 */
export function analyzeLabourProfitability(jobs: JobFinancials[]): Insight[] {
  const out: Insight[] = [];
  for (const j of jobs) {
    if (j.labourCostMinor <= 0 && j.labourBilledMinor <= 0) continue;
    const marginMinor = j.labourBilledMinor - j.labourCostMinor;
    const marginRatio = j.labourBilledMinor > 0 ? marginMinor / j.labourBilledMinor : -1;
    if (marginMinor < 0) {
      out.push({
        key: `labour_loss:${j.workOrderId}`, category: InsightCategory.Profitability, severity: InsightSeverity.Alert,
        title: `Labour billed below cost on ${j.number ?? j.workOrderId}`,
        detail: `Job ${j.number ?? j.workOrderId} (${j.customerName}) billed ${eur(j.labourBilledMinor)} of labour `
          + `against ${eur(j.labourCostMinor)} of labour cost — a loss of ${eur(-marginMinor)}.`,
        metric: { labourBilledMinor: j.labourBilledMinor, labourCostMinor: j.labourCostMinor, marginMinor },
        entityType: 'work_order', entityId: j.workOrderId,
        recommendation: 'Review the labour pricing or time booked on this job.',
      });
    } else if (j.labourBilledMinor > 0 && marginRatio < 0.2) {
      out.push({
        key: `labour_thin:${j.workOrderId}`, category: InsightCategory.Profitability, severity: InsightSeverity.Warn,
        title: `Thin labour margin on ${j.number ?? j.workOrderId}`,
        detail: `Job ${j.number ?? j.workOrderId} (${j.customerName}) has a labour margin of only ${pct(marginRatio)} `
          + `(${eur(marginMinor)} on ${eur(j.labourBilledMinor)} billed).`,
        metric: { labourBilledMinor: j.labourBilledMinor, labourCostMinor: j.labourCostMinor, marginRatio: round2(marginRatio) },
        entityType: 'work_order', entityId: j.workOrderId,
        recommendation: 'Check whether the labour rate matches the time this job actually takes.',
      });
    }
  }
  return out;
}

/**
 * 2 & 3. Under/over-billing. Compares billed labour hours to clocked hours.
 * Substantially MORE clocked than billed suggests work was done but not charged
 * (underbilling); substantially more BILLED than clocked suggests an entry error
 * or a customer-relations risk (overbilling). Both are flags for human review,
 * never automatic corrections.
 */
export function detectBillingMismatch(jobs: JobFinancials[]): Insight[] {
  const out: Insight[] = [];
  for (const j of jobs) {
    const clockedHours = j.clockedSeconds / 3600;
    if (clockedHours < 0.25 && j.billedLabourHours < 0.25) continue; // nothing meaningful
    const diff = j.billedLabourHours - clockedHours;
    // Underbilled: clocked at least 1h more than billed.
    if (-diff >= 1) {
      out.push({
        key: `underbilled:${j.workOrderId}`, category: InsightCategory.Profitability, severity: InsightSeverity.Warn,
        title: `Possible underbilling on ${j.number ?? j.workOrderId}`,
        detail: `Job ${j.number ?? j.workOrderId} (${j.customerName}) clocked ${round2(clockedHours)}h of labour `
          + `but billed only ${round2(j.billedLabourHours)}h — ${round2(-diff)}h appears uncharged.`,
        metric: { clockedHours: round2(clockedHours), billedLabourHours: round2(j.billedLabourHours), gapHours: round2(-diff) },
        entityType: 'work_order', entityId: j.workOrderId,
        recommendation: 'Confirm whether the uncharged time should be added to the invoice.',
      });
    } else if (diff >= 1) {
      out.push({
        key: `overbilled:${j.workOrderId}`, category: InsightCategory.Invoice, severity: InsightSeverity.Warn,
        title: `Billed hours exceed clocked hours on ${j.number ?? j.workOrderId}`,
        detail: `Job ${j.number ?? j.workOrderId} (${j.customerName}) billed ${round2(j.billedLabourHours)}h `
          + `but only ${round2(clockedHours)}h was clocked — ${round2(diff)}h more billed than recorded.`,
        metric: { clockedHours: round2(clockedHours), billedLabourHours: round2(j.billedLabourHours), gapHours: round2(diff) },
        entityType: 'work_order', entityId: j.workOrderId,
        recommendation: 'Verify the billed hours against the work performed before the invoice is sent.',
      });
    }
  }
  return out;
}

/**
 * 5. Parts margin. Flags part lines (aggregated per job) sold at or below cost.
 */
export function analyzePartsMargin(jobs: JobFinancials[]): Insight[] {
  const out: Insight[] = [];
  for (const j of jobs) {
    if (j.partsBilledMinor <= 0 && j.partsCostMinor <= 0) continue;
    const marginMinor = j.partsBilledMinor - j.partsCostMinor;
    const marginRatio = j.partsBilledMinor > 0 ? marginMinor / j.partsBilledMinor : -1;
    if (marginMinor < 0) {
      out.push({
        key: `parts_loss:${j.workOrderId}`, category: InsightCategory.Profitability, severity: InsightSeverity.Alert,
        title: `Parts sold below cost on ${j.number ?? j.workOrderId}`,
        detail: `Job ${j.number ?? j.workOrderId} (${j.customerName}) billed ${eur(j.partsBilledMinor)} of parts `
          + `against ${eur(j.partsCostMinor)} cost — a loss of ${eur(-marginMinor)}.`,
        metric: { partsBilledMinor: j.partsBilledMinor, partsCostMinor: j.partsCostMinor, marginMinor },
        entityType: 'work_order', entityId: j.workOrderId,
        recommendation: 'Check the parts markup; the sale price is below the purchase cost.',
      });
    } else if (j.partsBilledMinor > 0 && marginRatio < 0.1) {
      out.push({
        key: `parts_thin:${j.workOrderId}`, category: InsightCategory.Profitability, severity: InsightSeverity.Info,
        title: `Low parts margin on ${j.number ?? j.workOrderId}`,
        detail: `Job ${j.number ?? j.workOrderId} has a parts margin of ${pct(marginRatio)} (${eur(marginMinor)}).`,
        metric: { partsBilledMinor: j.partsBilledMinor, partsCostMinor: j.partsCostMinor, marginRatio: round2(marginRatio) },
        entityType: 'work_order', entityId: j.workOrderId,
      });
    }
  }
  return out;
}

/** Per-technician aggregates assembled by the backend. */
export interface TechnicianStats {
  mechanicId: string;
  name: string;
  attendanceSeconds: number;  // present at work (attendance ledger)
  clockedSeconds: number;     // clocked onto jobs (work-order ledger)
  labourRevenueMinor: number; // labour billed on their jobs
}

/**
 * 4 & 11. Low productivity & technician performance. Productivity = clocked job
 * time / attendance time. Persistently low utilisation is flagged (a capacity or
 * booking problem), and per-tech revenue is reported. This NEVER judges a person
 * punitively — it flags a pattern for a manager to understand.
 */
export function analyzeTechnicians(techs: TechnicianStats[]): Insight[] {
  const out: Insight[] = [];
  for (const t of techs) {
    if (t.attendanceSeconds < 3600) continue; // need a meaningful presence to judge
    const utilisation = t.clockedSeconds / t.attendanceSeconds;
    if (utilisation < 0.5) {
      out.push({
        key: `low_util:${t.mechanicId}`, category: InsightCategory.Productivity,
        severity: utilisation < 0.3 ? InsightSeverity.Alert : InsightSeverity.Warn,
        title: `Low job utilisation for ${t.name}`,
        detail: `${t.name} was present ${round2(t.attendanceSeconds / 3600)}h but clocked only `
          + `${round2(t.clockedSeconds / 3600)}h onto jobs — ${pct(utilisation)} utilisation.`,
        metric: { attendanceHours: round2(t.attendanceSeconds / 3600), clockedHours: round2(t.clockedSeconds / 3600), utilisation: round2(utilisation) },
        entityType: 'mechanic', entityId: t.mechanicId,
        recommendation: 'Look at scheduling, parts waiting time, or unbooked work — not necessarily effort.',
      });
    }
  }
  return out;
}

/** Per-customer or per-vehicle revenue/cost aggregate. */
export interface EntityProfitability {
  entityId: string;
  name: string;
  kind: 'customer' | 'vehicle';
  revenueMinor: number;
  costMinor: number;
}

/**
 * 9 & 10. Customer & vehicle profitability. Flags an entity whose total billed
 * revenue does not cover its cost over the period — a relationship or a vehicle
 * that is losing money and deserves a pricing conversation.
 */
export function analyzeEntityProfitability(entities: EntityProfitability[]): Insight[] {
  const out: Insight[] = [];
  for (const e of entities) {
    if (e.revenueMinor <= 0 && e.costMinor <= 0) continue;
    const marginMinor = e.revenueMinor - e.costMinor;
    if (marginMinor < 0) {
      out.push({
        key: `${e.kind}_loss:${e.entityId}`, category: InsightCategory.Profitability, severity: InsightSeverity.Warn,
        title: `${e.kind === 'customer' ? 'Customer' : 'Vehicle'} ${e.name} is unprofitable`,
        detail: `${e.name} generated ${eur(e.revenueMinor)} of revenue against ${eur(e.costMinor)} of cost `
          + `over the period — a net loss of ${eur(-marginMinor)}.`,
        metric: { revenueMinor: e.revenueMinor, costMinor: e.costMinor, marginMinor },
        entityType: e.kind, entityId: e.entityId,
        recommendation: e.kind === 'customer'
          ? 'Review pricing or terms for this customer.'
          : 'Review whether work on this vehicle is being fully captured and priced.',
      });
    }
  }
  return out;
}

// ===========================================================================
// INVENTORY
// ===========================================================================

/** Inventory item snapshot assembled by the backend. */
export interface InventorySnapshot {
  itemId: string;
  sku: string;
  name: string;
  onHand: number;
  reorderPoint: number | null;
  costMinor: number;             // unit cost
  lastMovementDaysAgo: number | null; // days since last issue/receive, null if never
}

/**
 * 6. Inventory anomalies. Negative on-hand (impossible physically — a data or
 * process error) and items with on-hand value but no cost recorded.
 */
export function detectInventoryAnomalies(items: InventorySnapshot[]): Insight[] {
  const out: Insight[] = [];
  for (const it of items) {
    if (it.onHand < 0) {
      out.push({
        key: `neg_stock:${it.itemId}`, category: InsightCategory.Inventory, severity: InsightSeverity.Alert,
        title: `Negative stock for ${it.sku}`,
        detail: `${it.name} (${it.sku}) shows ${it.onHand} on hand — negative stock indicates a missed receipt or a double issue.`,
        metric: { onHand: it.onHand },
        entityType: 'inventory_item', entityId: it.itemId,
        recommendation: 'Reconcile the stock movements for this item; on-hand cannot be negative.',
      });
    } else if (it.onHand > 0 && it.costMinor <= 0) {
      out.push({
        key: `no_cost:${it.itemId}`, category: InsightCategory.Inventory, severity: InsightSeverity.Warn,
        title: `Missing cost for ${it.sku}`,
        detail: `${it.name} (${it.sku}) has ${it.onHand} on hand but no unit cost — margin on this part cannot be measured.`,
        metric: { onHand: it.onHand, costMinor: it.costMinor },
        entityType: 'inventory_item', entityId: it.itemId,
        recommendation: 'Record a purchase cost so parts margin can be tracked.',
      });
    }
  }
  return out;
}

/**
 * 7. Slow-moving inventory. Items not moved for a long time tie up capital. We
 * flag items with on-hand value untouched beyond a threshold (default 180 days).
 */
export function detectSlowMoving(items: InventorySnapshot[], thresholdDays = 180): Insight[] {
  const out: Insight[] = [];
  for (const it of items) {
    if (it.onHand <= 0) continue;
    const days = it.lastMovementDaysAgo;
    if (days === null || days >= thresholdDays) {
      const tiedUp = it.onHand * it.costMinor;
      out.push({
        key: `slow_moving:${it.itemId}`, category: InsightCategory.Inventory, severity: InsightSeverity.Info,
        title: `Slow-moving stock: ${it.sku}`,
        detail: `${it.name} (${it.sku}) has ${it.onHand} on hand `
          + `${days === null ? 'with no recorded movement' : `unmoved for ${days} days`}, tying up about ${eur(tiedUp)}.`,
        metric: { onHand: it.onHand, lastMovementDaysAgo: days ?? -1, tiedUpMinor: tiedUp },
        entityType: 'inventory_item', entityId: it.itemId,
        recommendation: 'Consider returning, discounting, or de-stocking this item.',
      });
    }
  }
  return out;
}

/**
 * 8. Reorder recommendations. Items at or below their reorder point risk a
 * stockout. Advisory only — it recommends, it does not raise a purchase order.
 */
export function recommendReorders(items: InventorySnapshot[]): Insight[] {
  const out: Insight[] = [];
  for (const it of items) {
    if (it.reorderPoint === null) continue;
    if (it.onHand <= it.reorderPoint) {
      out.push({
        key: `reorder:${it.itemId}`, category: InsightCategory.Inventory,
        severity: it.onHand <= 0 ? InsightSeverity.Alert : InsightSeverity.Warn,
        title: `Reorder ${it.sku}`,
        detail: `${it.name} (${it.sku}) is at ${it.onHand} on hand, at or below its reorder point of ${it.reorderPoint}.`,
        metric: { onHand: it.onHand, reorderPoint: it.reorderPoint },
        entityType: 'inventory_item', entityId: it.itemId,
        recommendation: 'Raise a purchase order for this item (requires your approval).',
      });
    }
  }
  return out;
}

// ===========================================================================
// RECEIVABLES & INVOICE RISK
// ===========================================================================

/** Invoice snapshot assembled by the backend. */
export interface InvoiceSnapshot {
  invoiceId: string;
  number: string | null;
  customerId: string;
  customerName: string;
  status: string;
  totalGrossMinor: number;
  paidMinor: number;
  issueDate: string | null;  // ISO
  dueDate: string | null;    // ISO
  reverseCharge: boolean;
  customerVatId: string | null;
}

/**
 * 14. Invoice risk. Structural problems that should be caught before money moves:
 * a reverse-charge invoice missing the customer VAT id (a compliance error), and
 * an invoice issued with a zero or negative total.
 */
export function detectInvoiceRisk(invoices: InvoiceSnapshot[]): Insight[] {
  const out: Insight[] = [];
  for (const inv of invoices) {
    if (inv.reverseCharge && !inv.customerVatId) {
      out.push({
        key: `rc_no_vat:${inv.invoiceId}`, category: InsightCategory.Invoice, severity: InsightSeverity.Alert,
        title: `Reverse-charge invoice ${inv.number ?? ''} missing VAT id`,
        detail: `Invoice ${inv.number ?? inv.invoiceId} (${inv.customerName}) is marked reverse-charge but the customer `
          + `has no VAT id recorded — an EU reverse-charge invoice requires a valid VAT id.`,
        metric: {},
        entityType: 'invoice', entityId: inv.invoiceId,
        recommendation: 'Add and validate the customer VAT id before sending this invoice.',
      });
    }
    if ((inv.status === 'issued' || inv.status === 'sent') && inv.totalGrossMinor <= 0) {
      out.push({
        key: `zero_total:${inv.invoiceId}`, category: InsightCategory.Invoice, severity: InsightSeverity.Warn,
        title: `Invoice ${inv.number ?? ''} has a zero total`,
        detail: `Invoice ${inv.number ?? inv.invoiceId} (${inv.customerName}) was issued with a total of ${eur(inv.totalGrossMinor)}.`,
        metric: { totalGrossMinor: inv.totalGrossMinor },
        entityType: 'invoice', entityId: inv.invoiceId,
        recommendation: 'Check whether lines are missing from this invoice.',
      });
    }
  }
  return out;
}

/**
 * 15. Accounts-receivable risk. Overdue invoices, bucketed by how late, with the
 * outstanding amount. The later and larger, the higher the severity.
 */
export function detectArRisk(invoices: InvoiceSnapshot[], asOfIso: string): Insight[] {
  const out: Insight[] = [];
  const asOf = Date.parse(asOfIso);
  for (const inv of invoices) {
    const outstanding = inv.totalGrossMinor - inv.paidMinor;
    if (outstanding <= 0) continue;
    if (!['issued', 'sent', 'partly_paid', 'overdue'].includes(inv.status)) continue;
    if (!inv.dueDate) continue;
    const daysOverdue = Math.floor((asOf - Date.parse(inv.dueDate)) / (24 * 3600 * 1000));
    if (daysOverdue <= 0) continue;
    let severity: InsightSeverity = InsightSeverity.Info;
    if (daysOverdue > 60) severity = InsightSeverity.Alert;
    else if (daysOverdue > 30) severity = InsightSeverity.Warn;
    out.push({
      key: `ar_overdue:${inv.invoiceId}`, category: InsightCategory.Receivables, severity,
      title: `${inv.customerName}: ${eur(outstanding)} overdue ${daysOverdue}d`,
      detail: `Invoice ${inv.number ?? inv.invoiceId} for ${inv.customerName} has ${eur(outstanding)} outstanding, `
        + `${daysOverdue} days past its due date of ${inv.dueDate}.`,
      metric: { outstandingMinor: outstanding, daysOverdue },
      entityType: 'invoice', entityId: inv.invoiceId,
      recommendation: daysOverdue > 60
        ? 'Escalate collection; consider pausing further credit for this customer.'
        : 'Send a payment reminder for this invoice.',
    });
  }
  return out;
}

// ===========================================================================
// PRIORITISATION & SUMMARY
// ===========================================================================

/**
 * Deterministic prioritisation. The AI "prioritises" capability is grounded in a
 * reproducible ordering: by severity, then by financial magnitude (whichever
 * money figure the finding carries), then by category. This is explainable — an
 * owner can see WHY one item is above another — and stable across runs.
 */
export function prioritize(insights: Insight[]): Insight[] {
  const magnitude = (i: Insight): number => {
    const m = i.metric;
    return Math.abs(m.marginMinor ?? m.outstandingMinor ?? m.tiedUpMinor ?? m.totalGrossMinor ?? 0);
  };
  return [...insights].sort((a, b) => {
    const s = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (s !== 0) return s;
    const mag = magnitude(b) - magnitude(a);
    if (mag !== 0) return mag;
    return a.category.localeCompare(b.category);
  });
}

export interface InsightSummary {
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  /** The few findings that most deserve attention, already prioritised. */
  top: Insight[];
  /** A plain, deterministic one-paragraph summary (the AI may rephrase it). */
  headline: string;
}

/**
 * 16/17/18. Build a deterministic summary for a daily/weekly digest and the owner
 * dashboard. The headline counts what matters; the AI narrative layer (in the
 * backend) may rephrase it, but the counts and the top list are computed here so
 * they are always accurate.
 */
export function buildSummary(insights: Insight[], periodLabel: string, topN = 5): InsightSummary {
  const prioritised = prioritize(insights);
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const i of insights) {
    byCategory[i.category] = (byCategory[i.category] ?? 0) + 1;
    bySeverity[i.severity] = (bySeverity[i.severity] ?? 0) + 1;
  }
  const alerts = bySeverity[InsightSeverity.Alert] ?? 0;
  const warns = bySeverity[InsightSeverity.Warn] ?? 0;
  const headline = insights.length === 0
    ? `${periodLabel}: nothing needs attention — no anomalies or profitability issues detected.`
    : `${periodLabel}: ${insights.length} item${insights.length === 1 ? '' : 's'} flagged `
      + `(${alerts} alert${alerts === 1 ? '' : 's'}, ${warns} warning${warns === 1 ? '' : 's'}). `
      + `Top concern: ${prioritised[0].title}.`;
  return { total: insights.length, byCategory, bySeverity, top: prioritised.slice(0, topN), headline };
}
