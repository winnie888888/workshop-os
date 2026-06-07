import { Injectable } from '@nestjs/common';
import { WorkshopInsights, TravelConsistency } from '@workshop/shared';
import { getContext, newId } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { AiGatewayService } from '../../ai/ai-gateway.service';

/**
 * AI Workshop Manager (Phase 11) — an ADVISORY-ONLY analyst.
 *
 * The defining property of this service is what it CANNOT do. It has no method
 * that writes to any official record: it only runs SELECT queries (read-only),
 * feeds the data to the deterministic detectors in the shared core, optionally
 * asks the AI gateway to phrase a summary, records a read-only snapshot for
 * history/audit, and returns insights. There is no path here to issue an
 * invoice, alter attendance, or change stock — by construction, not by promise.
 *
 * The numbers come from the shared detectors (reproducible, auditable); the AI
 * only rephrases the already-computed summary into a neutral narrative. So every
 * figure an owner sees traces back to arithmetic, and the AI cannot invent a
 * financial fact.
 */
@Injectable()
export class WorkshopManagerService {

  constructor(
    private readonly pg: PgService,
    private readonly audit: AuditService,
    private readonly ai: AiGatewayService,
  ) {}

  /** The owner dashboard: every analysis over a window (default last 30 days). */
  async dashboard(windowDays = 30): Promise<any> {
    return this.runAnalyses(`Last ${windowDays} days`, windowDays);
  }

  /** Daily digest (last 1 day). */
  async daily(): Promise<any> {
    return this.runAnalyses('Today', 1);
  }

  /** Weekly digest (last 7 days). */
  async weekly(): Promise<any> {
    return this.runAnalyses('This week', 7);
  }

  // -----------------------------------------------------------------------
  // Orchestration: read → detect → prioritise → (AI narrate) → snapshot.
  // -----------------------------------------------------------------------

  private async runAnalyses(periodLabel: string, windowDays: number): Promise<any> {
    const ctx = getContext();
    const sinceIso = new Date(Date.now() - windowDays * 24 * 3600 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    // Assemble every detector's input with read-only, tenant-scoped queries.
    const jobs = await this.loadJobFinancials(sinceIso);
    const techs = await this.loadTechnicianStats(sinceIso);
    const customers = await this.loadCustomerProfitability(jobs);
    const inventory = await this.loadInventorySnapshots();
    const invoices = await this.loadInvoiceSnapshots(sinceIso);

    // Run the deterministic detectors (pure shared core).
    const insights: WorkshopInsights.Insight[] = [
      ...WorkshopInsights.analyzeLabourProfitability(jobs),
      ...WorkshopInsights.detectBillingMismatch(jobs),
      ...WorkshopInsights.analyzePartsMargin(jobs),
      ...WorkshopInsights.analyzeTechnicians(techs),
      ...WorkshopInsights.analyzeEntityProfitability(customers),
      ...WorkshopInsights.detectInventoryAnomalies(inventory),
      ...WorkshopInsights.detectSlowMoving(inventory),
      ...WorkshopInsights.recommendReorders(inventory),
      ...WorkshopInsights.detectInvoiceRisk(invoices),
      ...WorkshopInsights.detectArRisk(invoices, nowIso),
      ...(await this.attendanceConsistencyInsights(techs)),
    ];

    const summary = WorkshopInsights.buildSummary(insights, periodLabel);

    // Optional AI narrative around the COMPUTED summary. Flag-only by design: it
    // rephrases, it never changes a number or proposes an automatic action.
    let narrative = summary.headline;
    try {
      const res = await this.ai.run<unknown>({
        tenantId: ctx.tenantId, userId: ctx.userId, feature: 'workshop_manager_summary',
        prompt: `You are a workshop analyst. In two or three neutral sentences, summarise this for the owner. `
          + `Do NOT propose any automatic action; recommendations require human approval. `
          + `Findings: ${JSON.stringify({ headline: summary.headline, top: summary.top.map((t) => t.title) })}`,
        containsPii: false,
      });
      if (typeof (res.output as any)?.narrative === 'string') narrative = (res.output as any).narrative;
      else if (typeof res.output === 'string' && res.output.trim()) narrative = res.output.trim();
    } catch {
      /* AI optional — the deterministic headline stands on its own */
    }

    // Record a read-only snapshot for history/audit. This logs that insights were
    // GENERATED; it changes no official record.
    const snapshotId = newId();
    await this.pg.withTenant(ctx.tenantId, async (tx) => {
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'manager.insights_generated',
        entityType: 'insight_snapshot', entityId: snapshotId, before: null,
        after: { periodLabel, windowDays, total: summary.total, bySeverity: summary.bySeverity },
      });
      await tx.query(
        `INSERT INTO app.insight_snapshots
           (id, tenant_id, period_label, window_days, total, by_severity, by_category, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          snapshotId, ctx.tenantId, periodLabel, windowDays, summary.total,
          JSON.stringify(summary.bySeverity), JSON.stringify(summary.byCategory),
          JSON.stringify({ insights: WorkshopInsights.prioritize(insights), summary }),
        ],
      );
    });

    return {
      periodLabel,
      generatedAt: nowIso,
      summary: { ...summary, narrative },
      insights: WorkshopInsights.prioritize(insights),
      advisoryOnly: true, // explicit: nothing here was changed; all items need human action
    };
  }

  // -----------------------------------------------------------------------
  // Read-only data assembly. Every query is tenant-scoped via withTenant; none
  // writes. Costs/figures are computed in SQL where cheap, in JS where clearer.
  // -----------------------------------------------------------------------

  /** One row per work order in the window, with billed/cost figures. */
  private async loadJobFinancials(sinceIso: string): Promise<WorkshopInsights.JobFinancials[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT
           w.id, w.number, w.customer_id, w.asset_id, w.status,
           c.name AS customer_name,
           COALESCE(lab.billed, 0)      AS labour_billed,
           COALESCE(lab.hours, 0)       AS billed_labour_hours,
           COALESCE(prt.billed, 0)      AS parts_billed,
           COALESCE(prt.cost, 0)        AS parts_cost,
           COALESCE(te.cost, 0)         AS labour_cost,
           COALESCE(te.secs, 0)         AS clocked_seconds
         FROM app.work_orders w
         JOIN app.customers c ON c.id = w.customer_id
         LEFT JOIN (
           SELECT work_order_id, SUM(net_minor) billed, SUM(quantity) hours
           FROM app.work_order_lines WHERE type = 'labour' GROUP BY work_order_id
         ) lab ON lab.work_order_id = w.id
         LEFT JOIN (
           SELECT l.work_order_id,
                  SUM(l.net_minor) billed,
                  SUM(l.quantity * COALESCE(i.cost_minor, 0)) cost
           FROM app.work_order_lines l
           LEFT JOIN app.inventory_items i ON i.id = l.inventory_item_id
           WHERE l.type = 'part' GROUP BY l.work_order_id
         ) prt ON prt.work_order_id = w.id
         LEFT JOIN (
           SELECT work_order_id, SUM(cost_minor) cost, SUM(duration_seconds) secs
           FROM app.time_entries GROUP BY work_order_id
         ) te ON te.work_order_id = w.id
         WHERE w.created_at >= $1`,
        [sinceIso]);
      return r.rows.map((j) => ({
        workOrderId: j.id, number: j.number, customerId: j.customer_id, customerName: j.customer_name,
        assetId: j.asset_id, status: j.status,
        labourBilledMinor: Number(j.labour_billed), labourCostMinor: Number(j.labour_cost),
        partsBilledMinor: Number(j.parts_billed), partsCostMinor: Number(j.parts_cost),
        clockedSeconds: Number(j.clocked_seconds), billedLabourHours: Number(j.billed_labour_hours),
      }));
    });
  }

  /** Per-technician presence vs clocked-on-jobs over the window. */
  private async loadTechnicianStats(sinceIso: string): Promise<WorkshopInsights.TechnicianStats[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT u.id, u.name AS name,
           COALESCE(att.secs, 0)   AS attendance_seconds,
           COALESCE(te.secs, 0)    AS clocked_seconds,
           COALESCE(te.revenue, 0) AS labour_revenue
         FROM app.users u
         LEFT JOIN (
           SELECT user_id,
                  SUM(EXTRACT(EPOCH FROM (COALESCE(clock_out_at, clock_in_at) - clock_in_at)))::bigint secs
           FROM app.attendance_days WHERE clock_in_at >= $1 GROUP BY user_id
         ) att ON att.user_id = u.id
         LEFT JOIN (
           SELECT t.mechanic_id,
                  SUM(t.duration_seconds) secs,
                  SUM(COALESCE(lab.rev, 0)) revenue
           FROM app.time_entries t
           LEFT JOIN (
             SELECT work_order_id, SUM(net_minor) rev FROM app.work_order_lines
             WHERE type = 'labour' GROUP BY work_order_id
           ) lab ON lab.work_order_id = t.work_order_id
           WHERE t.started_at >= $1 GROUP BY t.mechanic_id
         ) te ON te.mechanic_id = u.id
         WHERE att.secs IS NOT NULL OR te.secs IS NOT NULL`,
        [sinceIso]);
      return r.rows.map((t) => ({
        mechanicId: t.id, name: t.name ?? 'Technician',
        attendanceSeconds: Number(t.attendance_seconds), clockedSeconds: Number(t.clocked_seconds),
        labourRevenueMinor: Number(t.labour_revenue),
      }));
    });
  }

  /** Customer profitability rolled up from the per-job figures we already have. */
  private async loadCustomerProfitability(jobs: WorkshopInsights.JobFinancials[]): Promise<WorkshopInsights.EntityProfitability[]> {
    const byCustomer = new Map<string, WorkshopInsights.EntityProfitability>();
    for (const j of jobs) {
      const cur = byCustomer.get(j.customerId) ?? {
        entityId: j.customerId, name: j.customerName, kind: 'customer' as const, revenueMinor: 0, costMinor: 0,
      };
      cur.revenueMinor += j.labourBilledMinor + j.partsBilledMinor;
      cur.costMinor += j.labourCostMinor + j.partsCostMinor;
      byCustomer.set(j.customerId, cur);
    }
    return [...byCustomer.values()];
  }

  /** One row per inventory item with on-hand, reorder point, cost, last movement. */
  private async loadInventorySnapshots(): Promise<WorkshopInsights.InventorySnapshot[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT i.id, i.sku, i.name, i.cost_minor,
                COALESCE(SUM(sl.on_hand), 0)        AS on_hand,
                MAX(sl.reorder_point)               AS reorder_point,
                EXTRACT(DAY FROM (now() - MAX(sm.created_at)))::int AS last_move_days
         FROM app.inventory_items i
         LEFT JOIN app.stock_levels sl ON sl.item_id = i.id
         LEFT JOIN app.stock_movements sm ON sm.item_id = i.id
         GROUP BY i.id, i.sku, i.name, i.cost_minor`);
      return r.rows.map((it) => ({
        itemId: it.id, sku: it.sku ?? '(no sku)', name: it.name,
        onHand: Number(it.on_hand), reorderPoint: it.reorder_point === null ? null : Number(it.reorder_point),
        costMinor: Number(it.cost_minor),
        lastMovementDaysAgo: it.last_move_days === null ? null : Number(it.last_move_days),
      }));
    });
  }

  /** Invoices in the window (plus their customer's VAT id) for risk + AR. */
  private async loadInvoiceSnapshots(sinceIso: string): Promise<WorkshopInsights.InvoiceSnapshot[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT inv.id, inv.number, inv.customer_id, c.name AS customer_name, c.vat_id AS customer_vat_id,
                inv.status, inv.total_gross_minor, inv.paid_minor,
                inv.issue_date, inv.due_date, inv.reverse_charge
         FROM app.invoices inv
         JOIN app.customers c ON c.id = inv.customer_id
         WHERE inv.created_at >= $1 OR inv.status IN ('issued','sent','partly_paid','overdue')`,
        [sinceIso]);
      return r.rows.map((inv) => ({
        invoiceId: inv.id, number: inv.number, customerId: inv.customer_id, customerName: inv.customer_name,
        status: inv.status, totalGrossMinor: Number(inv.total_gross_minor), paidMinor: Number(inv.paid_minor),
        issueDate: inv.issue_date ? new Date(inv.issue_date).toISOString() : null,
        dueDate: inv.due_date ? new Date(inv.due_date).toISOString() : null,
        reverseCharge: inv.reverse_charge, customerVatId: inv.customer_vat_id,
      }));
    });
  }

  /**
   * 12. Attendance consistency, surfaced as insights. For each technician we
   * reconcile presence (attendance) against booked work (clocked) using the SAME
   * tested shared check the attendance phase uses — flag-only, never modifying.
   */
  private async attendanceConsistencyInsights(techs: WorkshopInsights.TechnicianStats[]): Promise<WorkshopInsights.Insight[]> {
    const out: WorkshopInsights.Insight[] = [];
    for (const t of techs) {
      if (t.attendanceSeconds < 3600) continue;
      const check = TravelConsistency.checkConsistency({
        attendanceSeconds: t.attendanceSeconds, workOrderSeconds: t.clockedSeconds,
        fieldServiceSeconds: 0, travelSeconds: 0,
      });
      if (check.severity === TravelConsistency.ConsistencySeverity.Ok) continue;
      const sev = check.severity === TravelConsistency.ConsistencySeverity.Alert
        ? WorkshopInsights.InsightSeverity.Alert
        : check.severity === TravelConsistency.ConsistencySeverity.Warn
          ? WorkshopInsights.InsightSeverity.Warn : WorkshopInsights.InsightSeverity.Info;
      out.push({
        key: `attendance_consistency:${t.mechanicId}`, category: WorkshopInsights.InsightCategory.Attendance,
        severity: sev, title: `Attendance vs booked work: ${t.name}`,
        detail: check.summary,
        metric: { unaccountedSeconds: check.unaccountedSeconds, overbookedSeconds: check.overbookedSeconds },
        entityType: 'mechanic', entityId: t.mechanicId,
        recommendation: 'Review the timesheet against booked jobs; this is a flag for a human, not a correction.',
      });
    }
    return out;
  }
}
