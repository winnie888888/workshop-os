import { Injectable } from '@nestjs/common';
import { getContext, LabourAnalysis, Money } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AiGatewayService } from '../../ai/ai-gateway.service';
import { AppConfig } from '../../config/configuration';

/**
 * Owner insights (Phase 3 business rule).
 *
 * This is the screen the owner must always be able to see: for a work order (or
 * a period), the three different "hours" — actual (clocked), standard (book),
 * and billed — side by side, plus profitability, plus the deterministic flags
 * for underbilling, overbilling, low productivity and unusual deviations.
 *
 * The flags are computed by the tested LabourAnalysis core (arithmetic, not a
 * guess) so they are auditable. AI is layered ON TOP only to *explain and
 * prioritise* the flags in plain language — its output is recorded as a
 * suggestion the owner can accept or dismiss, never an automatic action. If the
 * AI provider is not configured we still return the full deterministic picture;
 * the narrative is simply absent.
 */
@Injectable()
export class InsightsService {
  constructor(
    private readonly pg: PgService,
    private readonly ai: AiGatewayService,
    private readonly config: AppConfig,
  ) {}

  /** The clocked/standard/billed/profitability picture for one work order. */
  async workOrderLabour(workOrderId: string) {
    const ctx = getContext();
    const facts = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      const wo = (await tx.query<any>(`SELECT id, number, currency, status FROM app.work_orders WHERE id = $1`, [workOrderId])).rows[0];
      if (!wo) return null;

      // Clocked: sum of actual time on the clock for this work order.
      const clocked = (await tx.query<any>(
        `SELECT COALESCE(SUM(duration_seconds),0) s FROM app.time_entries WHERE work_order_id = $1 AND duration_seconds IS NOT NULL`,
        [workOrderId],
      )).rows[0].s;

      // Standard + billed come from the labour lines: standard_minutes is the
      // book time; the line quantity (hours) is what the customer is billed.
      const labour = (await tx.query<any>(
        `SELECT COALESCE(SUM(standard_minutes),0) std_min,
                COALESCE(SUM(quantity),0) billed_hours,
                COALESCE(SUM(net_minor),0) billed_net
           FROM app.work_order_lines
          WHERE work_order_id = $1 AND type = 'labour'`,
        [workOrderId],
      )).rows[0];

      return {
        wo,
        clockedSeconds: Number(clocked),
        standardSeconds: Number(labour.std_min) * 60,
        billedSeconds: Math.round(Number(labour.billed_hours) * 3600),
        billedRevenueMinor: BigInt(labour.billed_net),
      };
    });
    if (!facts) return null;

    const analysis = LabourAnalysis.analyzeLabour({
      currency: facts.wo.currency,
      clockedSeconds: facts.clockedSeconds,
      standardSeconds: facts.standardSeconds,
      billedSeconds: facts.billedSeconds,
      billedRevenueMinor: facts.billedRevenueMinor,
      internalCostRateMinorPerHour: this.config.internalCostRateMinorPerHour,
    });

    return {
      workOrder: { id: facts.wo.id, number: facts.wo.number, status: facts.wo.status },
      hours: {
        actual: round2(analysis.clockedHours),
        standard: round2(analysis.standardHours),
        billed: round2(analysis.billedHours),
      },
      efficiency: analysis.efficiency,
      profitability: {
        labourCost: Money.format(Money.money(facts.wo.currency, analysis.labourCostMinor)),
        billedRevenue: Money.format(Money.money(facts.wo.currency, analysis.billedRevenueMinor)),
        margin: Money.format(Money.money(facts.wo.currency, analysis.marginMinor)),
        marginPct: analysis.marginPct,
        labourCostMinor: analysis.labourCostMinor.toString(),
        marginMinor: analysis.marginMinor.toString(),
      },
      flags: analysis.flags,
    };
  }

  /**
   * Ask the AI to explain and prioritise the deterministic flags for a work
   * order, recorded as a human-in-the-loop suggestion. Returns the same
   * deterministic picture plus a narrative (when the provider is configured).
   */
  async explainWorkOrder(workOrderId: string): Promise<any> {
    const ctx = getContext();
    const picture = await this.workOrderLabour(workOrderId);
    if (!picture) return null;
    if (picture.flags.length === 0) {
      return { ...picture, narrative: null, note: 'No anomalies detected.' };
    }

    try {
      const prompt = buildPrompt(picture);
      const result = await this.ai.run<{ summary: string; priority: string }>({
        feature: 'billing.anomaly',
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        prompt,
        containsPii: false, // aggregate hours/money only, no personal data
        outputSchema: '{ "summary": string, "priority": "low"|"medium"|"high" }',
      });

      // Record the explanation as a suggestion the owner can accept/dismiss.
      await this.pg.withTenant(ctx.tenantId, (tx) =>
        this.ai.recordSuggestion(tx, {
          tenantId: ctx.tenantId,
          interactionId: result.interactionId,
          targetEntityType: 'work_order',
          targetEntityId: workOrderId,
          suggestedPayload: { flags: picture.flags, narrative: result.output },
        }),
      );

      return { ...picture, narrative: result.output, interactionId: result.interactionId };
    } catch {
      // AI unavailable/unconfigured: the deterministic picture still stands.
      return { ...picture, narrative: null, note: 'AI narrative unavailable; deterministic flags shown.' };
    }
  }
}

function buildPrompt(picture: any): string {
  return [
    'You are assisting a commercial-vehicle workshop owner. Below are the labour',
    'figures for one job. Explain the flagged anomalies in one short paragraph and',
    'assign an overall priority. Do not invent numbers; use only those given.',
    '',
    `Actual (clocked) hours: ${picture.hours.actual}`,
    `Standard (book) hours: ${picture.hours.standard}`,
    `Billed hours: ${picture.hours.billed}`,
    `Margin: ${picture.profitability.margin} (${picture.profitability.marginPct ?? 'n/a'})`,
    `Flags: ${picture.flags.map((f: any) => `${f.kind}/${f.severity}`).join(', ')}`,
    '',
    'Respond as JSON only: { "summary": string, "priority": "low"|"medium"|"high" }',
  ].join('\n');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
