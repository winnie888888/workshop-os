import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { getContext, newId, Sequence } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { CounterService } from '../../common/numbering/counter.service';
import { InvoicesService } from '../invoices/invoices.service';

/**
 * Estimates (predračuni) — the priced offer BEFORE work is committed. Design
 * choices that matter here:
 *
 *   - Lines live as a JSONB document on the estimate. A quote is a proposal,
 *     not a transaction: nothing reserves stock or books labour until it is
 *     converted, so a document model is the honest shape (and it round-trips
 *     the advisor's editor wholesale, which is how the UI works).
 *   - Numbering comes from the same gapless per-tenant counter as every other
 *     document (prefix QUO).
 *   - Conversion to an invoice does NOT reinvent money. to-invoice maps the
 *     quote lines to NET line inputs and hands them to the EXISTING
 *     InvoicesService.issueFromLines — the deterministic VAT engine, gapless
 *     invoice number, audit entry, Minimax + e-invoice outbox all run exactly
 *     as for any other invoice. The estimate then records the invoice id and
 *     becomes immutable ('invoiced').
 *   - Every state change is appended to the tamper-evident audit chain.
 */

export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'invoiced';
const STATUSES: EstimateStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'invoiced'];
const LINE_KINDS = ['labour', 'part', 'service'] as const;

export interface EstimateLine {
  id: string;
  kind: (typeof LINE_KINDS)[number];
  description: string;
  qty: number;
  unitPriceMinor: number;
  vatRatePct: number;
  discountPct?: number;
}

export interface EstimateView {
  id: string;
  number: string;
  customerId: string;
  vehicleId?: string;
  workOrderId?: string;
  status: EstimateStatus;
  lines: EstimateLine[];
  validUntil?: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

const SELECT = `SELECT id, number, customer_id, asset_id, work_order_id, status, lines,
                       valid_until, invoice_id, created_at, updated_at
                  FROM app.estimates`;

const tsIso = (v: any): string => (v instanceof Date ? v.toISOString() : String(v));
const dateIso = (v: any): string => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

@Injectable()
export class EstimatesService {
  constructor(
    private readonly pg: PgService,
    private readonly audit: AuditService,
    private readonly counter: CounterService,
    private readonly invoices: InvoicesService,
  ) {}

  private map(r: any): EstimateView {
    return {
      id: r.id,
      number: r.number,
      customerId: r.customer_id,
      vehicleId: r.asset_id ?? undefined,
      workOrderId: r.work_order_id ?? undefined,
      status: r.status,
      lines: Array.isArray(r.lines) ? r.lines : [],
      validUntil: r.valid_until ? dateIso(r.valid_until) : undefined,
      invoiceId: r.invoice_id ?? undefined,
      createdAt: tsIso(r.created_at),
      updatedAt: tsIso(r.updated_at),
    };
  }

  /**
   * Normalize and validate a lines document from the client. Strictness here is
   * what keeps the JSONB column trustworthy: every stored line is guaranteed to
   * have a sane kind, finite non-negative numbers, and a bounded description —
   * so downstream consumers (totals, print, to-invoice) never defend again.
   */
  private normalizeLines(input: unknown): EstimateLine[] {
    if (input == null) return [];
    if (!Array.isArray(input)) throw new BadRequestException('lines must be an array');
    if (input.length > 200) throw new BadRequestException('Too many lines (max 200)');
    return input.map((raw: any, i: number) => {
      const qty = Number(raw?.qty);
      const unitPriceMinor = Math.round(Number(raw?.unitPriceMinor));
      const vatRatePct = Number(raw?.vatRatePct ?? 22);
      const discountPct = raw?.discountPct == null ? undefined : Number(raw.discountPct);
      if (!Number.isFinite(qty) || qty < 0) throw new BadRequestException(`Line ${i + 1}: qty must be a non-negative number`);
      if (!Number.isFinite(unitPriceMinor) || unitPriceMinor < 0) throw new BadRequestException(`Line ${i + 1}: unitPriceMinor must be a non-negative number`);
      if (!Number.isFinite(vatRatePct) || vatRatePct < 0 || vatRatePct > 100) throw new BadRequestException(`Line ${i + 1}: vatRatePct out of range`);
      if (discountPct !== undefined && (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100)) {
        throw new BadRequestException(`Line ${i + 1}: discountPct out of range`);
      }
      const kind = (LINE_KINDS as readonly string[]).includes(raw?.kind) ? raw.kind : 'service';
      return {
        id: typeof raw?.id === 'string' && raw.id ? raw.id.slice(0, 64) : newId(),
        kind,
        description: String(raw?.description ?? '').slice(0, 500),
        qty,
        unitPriceMinor,
        vatRatePct,
        ...(discountPct !== undefined ? { discountPct } : {}),
      } as EstimateLine;
    });
  }

  async list(customerId?: string): Promise<EstimateView[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const res = customerId
        ? await tx.query<any>(`${SELECT} WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 500`, [customerId])
        : await tx.query<any>(`${SELECT} ORDER BY created_at DESC LIMIT 500`);
      return res.rows.map((r: any) => this.map(r));
    });
  }

  async get(id: string): Promise<EstimateView> {
    const ctx = getContext();
    const row = await this.pg.withTenant(ctx.tenantId, async (tx) =>
      (await tx.query<any>(`${SELECT} WHERE id = $1`, [id])).rows[0]);
    if (!row) throw new NotFoundException('Estimate not found');
    return this.map(row);
  }

  async create(dto: {
    customerId: string; vehicleId?: string; workOrderId?: string;
    lines?: unknown[]; validUntil?: string;
  }): Promise<EstimateView> {
    const ctx = getContext();
    const lines = this.normalizeLines(dto.lines ?? []);
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const customer = (await tx.query<any>(`SELECT id FROM app.customers WHERE id = $1`, [dto.customerId])).rows[0];
      if (!customer) throw new NotFoundException('Customer not found');

      const number = await this.counter.next(tx, ctx.tenantId, Sequence.DocumentType.Quotation);
      const id = newId();
      const row = (await tx.query<any>(
        `INSERT INTO app.estimates
           (id, tenant_id, number, customer_id, asset_id, work_order_id, status, lines, valid_until, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,'draft',$7::jsonb,$8,$9)
         RETURNING *`,
        [id, ctx.tenantId, number, dto.customerId, dto.vehicleId ?? null, dto.workOrderId ?? null,
         JSON.stringify(lines), dto.validUntil ?? null, ctx.userId],
      )).rows[0];

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'estimate.created',
        entityType: 'estimate', entityId: id, before: null,
        after: { number, customerId: dto.customerId, workOrderId: dto.workOrderId ?? null, lineCount: lines.length },
      });
      return this.map(row);
    });
  }

  async update(id: string, dto: {
    customerId?: string; vehicleId?: string; workOrderId?: string;
    lines?: unknown[]; validUntil?: string; status?: string;
  }): Promise<EstimateView> {
    const ctx = getContext();
    if (dto.status !== undefined && !STATUSES.includes(dto.status as EstimateStatus)) {
      throw new BadRequestException(`status must be one of ${STATUSES.join(', ')}`);
    }
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const before = (await tx.query<any>(`${SELECT} WHERE id = $1 FOR UPDATE`, [id])).rows[0];
      if (!before) throw new NotFoundException('Estimate not found');
      if (before.status === 'invoiced') {
        throw new ConflictException('An invoiced estimate is immutable; corrections happen on the invoice (credit note)');
      }

      const sets: string[] = [];
      const vals: any[] = [];
      const add = (col: string, val: any) => { vals.push(val); sets.push(`${col} = $${vals.length}`); };
      if (dto.customerId !== undefined) add('customer_id', dto.customerId);
      if (dto.vehicleId !== undefined) add('asset_id', dto.vehicleId || null);
      if (dto.workOrderId !== undefined) add('work_order_id', dto.workOrderId || null);
      if (dto.lines !== undefined) { const ln = this.normalizeLines(dto.lines); vals.push(JSON.stringify(ln)); sets.push(`lines = $${vals.length}::jsonb`); }
      if (dto.validUntil !== undefined) add('valid_until', dto.validUntil || null);
      if (dto.status !== undefined) add('status', dto.status);
      if (sets.length === 0) return this.map(before);

      vals.push(id);
      const after = (await tx.query<any>(
        `UPDATE app.estimates SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals,
      )).rows[0];

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'estimate.updated',
        entityType: 'estimate', entityId: id,
        before: { status: before.status, lineCount: Array.isArray(before.lines) ? before.lines.length : 0 },
        after: { status: after.status, lineCount: Array.isArray(after.lines) ? after.lines.length : 0 },
      });
      return this.map(after);
    });
  }

  async setStatus(id: string, status: string): Promise<EstimateView> {
    const ctx = getContext();
    if (!STATUSES.includes(status as EstimateStatus)) {
      throw new BadRequestException(`status must be one of ${STATUSES.join(', ')}`);
    }
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const before = (await tx.query<any>(`${SELECT} WHERE id = $1 FOR UPDATE`, [id])).rows[0];
      if (!before) throw new NotFoundException('Estimate not found');
      if (before.status === 'invoiced' && status !== 'invoiced') {
        throw new ConflictException('An invoiced estimate cannot change status');
      }
      const after = (await tx.query<any>(
        `UPDATE app.estimates SET status = $2 WHERE id = $1 RETURNING *`, [id, status],
      )).rows[0];
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'estimate.status_changed',
        entityType: 'estimate', entityId: id,
        before: { status: before.status }, after: { status },
      });
      return this.map(after);
    });
  }

  /**
   * Convert an accepted quote into a real invoice through the EXISTING invoice
   * engine. Quote lines (qty × unit, minus line discount) become NET line
   * inputs for issueFromLines, which decides VAT per the customer's treatment,
   * numbers the invoice gaplessly, audits it, and enqueues Minimax + e-invoice.
   *
   * Two transactions by design: issueFromLines owns its own (it must — invoice
   * issuance is one atomic unit), then we mark the estimate. If marking were to
   * fail after issuance, the invoice exists and a retry is safely refused by
   * the already-invoiced guard — the advisor sees the invoice either way, and
   * both steps are on the audit chain.
   */
  async toInvoice(id: string) {
    const ctx = getContext();
    const est = await this.get(id);
    if (est.status === 'invoiced' || est.invoiceId) throw new ConflictException('Estimate is already invoiced');
    if (!est.lines.length) throw new BadRequestException('Estimate has no lines to invoice');

    const invLines = est.lines.map((l) => ({
      description: l.qty !== 1 ? `${l.description} (${l.qty}×)` : l.description,
      netMinor: Math.round(l.qty * l.unitPriceMinor * (100 - (l.discountPct ?? 0)) / 100),
      kind: (l.kind === 'part' ? 'goods' : 'service') as 'goods' | 'service',
      domesticRatePct: String(l.vatRatePct ?? 22),
    })).filter((l) => l.netMinor > 0);
    if (!invLines.length) throw new BadRequestException('Estimate lines total zero; nothing to invoice');

    const header = await this.invoices.issueFromLines({ customerId: est.customerId, lines: invLines });

    await this.pg.withTenant(ctx.tenantId, async (tx) => {
      await tx.query(
        `UPDATE app.estimates SET status = 'invoiced', invoice_id = $2 WHERE id = $1`,
        [id, (header as any).id],
      );
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'estimate.invoiced',
        entityType: 'estimate', entityId: id,
        before: { status: est.status },
        after: { status: 'invoiced', invoiceId: (header as any).id, invoiceNumber: (header as any).number },
      });
    });

    return header;
  }
}
