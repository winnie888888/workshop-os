import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  newId, getContext, Money, Vat, Invoicing, Receivables, Sequence,
} from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { CounterService } from '../../common/numbering/counter.service';
import { AppConfig } from '../../config/configuration';
import { InvoicesRepository, type InvoiceHeader } from './invoices.repository';
import { CreditNoteDto, IssueInvoiceDto, RecordPaymentDto } from './dto/invoice.dto';

/**
 * Invoicing is where the shop floor becomes money and a legal record. The
 * design choices that matter here:
 *
 *   - Customer invoicing uses BOOK/standard labour (the work-order line
 *     quantities the advisor set), never clocked time. Clocked time stays a
 *     productivity/payroll signal (see reporting + insights).
 *   - The VAT treatment is decided by the deterministic VAT engine at issue
 *     time and FROZEN onto the invoice; it is never an AI guess and never
 *     recomputed after issue.
 *   - An issued invoice is immutable (DB trigger enforces it). Corrections are
 *     credit notes. Numbers come from the gapless counter.
 *   - Issuing emits outbox events to push the invoice to Minimax and to the
 *     e-invoicing channel — the workshop never waits on either.
 */
@Injectable()
export class InvoicesService {
  constructor(
    private readonly pg: PgService,
    private readonly repo: InvoicesRepository,
    private readonly counter: CounterService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly config: AppConfig,
  ) {}

  async issueFromWorkOrder(dto: IssueInvoiceDto): Promise<InvoiceHeader> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      // Load the work order, its billable lines, the customer, and the tenant
      // (supplier) country — everything the VAT engine and the document need.
      const wo = await tx.query<any>(`SELECT * FROM app.work_orders WHERE id = $1 FOR UPDATE`, [dto.workOrderId]);
      if (wo.rowCount === 0) throw new NotFoundException('Work order not found');
      const order = wo.rows[0];
      if (order.status === 'invoiced' || order.status === 'closed') {
        throw new ConflictException(`Work order already ${order.status}`);
      }

      const lines = (await tx.query<any>(
        `SELECT * FROM app.work_order_lines WHERE work_order_id = $1 ORDER BY line_no`, [dto.workOrderId]
      )).rows;
      const billable = lines.filter((l: any) => l.type !== 'discount' && BigInt(l.net_minor) !== 0n);
      if (billable.length === 0) throw new BadRequestException('Work order has no billable lines');

      const customer = (await tx.query<any>(`SELECT * FROM app.customers WHERE id = $1`, [order.customer_id])).rows[0];
      const tenant = (await tx.query<any>(`SELECT country FROM app.tenants WHERE id = $1`, [ctx.tenantId])).rows[0];
      const currency = order.currency;

      // Decide VAT once for this customer (treatment depends on the parties).
      const vatCtx: Vat.VatContext = {
        supplierCountry: tenant.country,
        customerCountry: customer.country,
        customerIsBusiness: customer.type === 'company',
        customerVatId: customer.vat_id,
        customerVatIdValidated: customer.vat_id_validated === true,
      };

      // Build invoice lines from work-order lines, applying the engine's
      // effective rate per line. Labour is billed at its (book) line quantity.
      const invoiceLineInputs: Invoicing.InvoiceLineInput[] = [];
      const toInsert: Array<{
        type: string; description: string; quantity: string; unitPriceMinor: bigint;
        discountPct: string; vatRatePct: string; reverseCharge: boolean;
        netMinor: bigint; vatMinor: bigint; grossMinor: bigint;
      }> = [];

      let anyHumanConfirm = false;
      let treatment: string | null = null;
      let anyReverseCharge = false;
      let vatNote: string | null = null;

      for (const l of billable) {
        const decision = Vat.decideLineVat(vatCtx, {
          kind: l.type === 'part' ? 'goods' : 'service',
          domesticRatePct: String(l.vat_rate_pct),
        });
        anyHumanConfirm = anyHumanConfirm || decision.requiresHumanConfirmation;
        anyReverseCharge = anyReverseCharge || decision.reverseCharge;
        treatment = decision.treatment;
        if (decision.note) vatNote = decision.note;

        const net = Money.money(currency, BigInt(l.net_minor));
        const vat = Money.percentage(net, decision.effectiveRatePct);
        invoiceLineInputs.push({
          description: l.description, netMinor: net.minor,
          effectiveRatePct: decision.effectiveRatePct, reverseCharge: decision.reverseCharge,
        });
        toInsert.push({
          type: l.type, description: l.description, quantity: String(l.quantity),
          unitPriceMinor: BigInt(l.unit_price_minor), discountPct: String(l.discount_pct),
          vatRatePct: decision.effectiveRatePct, reverseCharge: decision.reverseCharge,
          netMinor: net.minor, vatMinor: vat.minor, grossMinor: net.minor + vat.minor,
        });
      }

      // A line that needs human confirmation (e.g. unvalidated EU VAT ID) must
      // not be auto-issued; the advisor resolves it (validate VIES or override).
      if (anyHumanConfirm) {
        throw new ConflictException(
          'VAT treatment needs confirmation (e.g. unvalidated EU VAT ID). Validate the customer VAT ID before issuing.',
        );
      }

      const totals = Invoicing.composeInvoiceTotals(currency, invoiceLineInputs);

      const number = await this.counter.next(tx, ctx.tenantId, Sequence.DocumentType.Invoice);
      const issueDate = (dto.issueDate ?? new Date().toISOString().slice(0, 10));
      const dueDays = dto.dueDays ?? customer.payment_terms_days ?? this.config.defaultPaymentTermsDays;
      const dueDate = addDays(issueDate, dueDays);

      const invoiceId = newId();
      const header = await this.repo.insertHeader(tx, {
        id: invoiceId, tenantId: ctx.tenantId, kind: 'invoice', number,
        workOrderId: order.id, customerId: customer.id, correctsInvoiceId: null,
        currency, vatTreatment: treatment, reverseCharge: anyReverseCharge, vatNote,
        netMinor: totals.netMinor, vatMinor: totals.vatMinor, grossMinor: totals.grossMinor,
        issueDate, dueDate, createdBy: ctx.userId,
      });

      let lineNo = 1;
      for (const li of toInsert) {
        await this.repo.insertLine(tx, { id: newId(), tenantId: ctx.tenantId, invoiceId, lineNo: lineNo++, ...li });
      }
      for (const g of totals.vatBreakdown) {
        await this.repo.insertVatGroup(tx, {
          tenantId: ctx.tenantId, invoiceId, ratePct: g.ratePct, reverseCharge: g.reverseCharge,
          netMinor: g.netMinor, vatMinor: g.vatMinor,
        });
      }

      // Move the work order to 'invoiced'.
      await tx.query(
        `UPDATE app.work_orders SET status='invoiced', invoiced_at=now(), version=version+1, updated_at=now() WHERE id=$1`,
        [order.id],
      );

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'invoice.issued',
        entityType: 'invoice', entityId: invoiceId,
        before: null,
        after: { number, treatment, reverseCharge: anyReverseCharge, grossMinor: totals.grossMinor.toString(), currency },
      });

      // Push to Minimax and to the e-invoicing channel (async, outbox).
      await this.outbox.enqueue(tx, {
        tenantId: ctx.tenantId, eventType: 'minimax.invoice.upsert',
        payload: { invoiceId }, idempotencyKey: `minimax.invoice:${invoiceId}`,
      });
      await this.outbox.enqueue(tx, {
        tenantId: ctx.tenantId, eventType: 'einvoice.issue',
        payload: { invoiceId }, idempotencyKey: `einvoice.issue:${invoiceId}`,
      });

      return header;
    });
  }

  /**
   * Issue an invoice from an EXPLICIT set of net lines (Phase 12, used by rental).
   *
   * This is the same engine the work-order path uses — the SAME VAT decision per
   * line, the SAME totals composition, the SAME repository, counter, audit, and
   * Minimax/e-invoice outbox — but the lines come from a caller (the rental charge
   * calculator) rather than a work order, and no work order is touched. So a
   * rental invoice is a first-class, VAT-correct, Minimax-bound invoice, not a
   * parallel invention. Lines are NET; this applies VAT per the customer's
   * treatment. Returns the issued header.
   */
  async issueFromLines(dto: {
    customerId: string;
    currency?: string;
    lines: Array<{ description: string; netMinor: number; kind?: 'goods' | 'service'; domesticRatePct?: string }>;
    issueDate?: string;
    dueDays?: number;
  }): Promise<InvoiceHeader> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      if (!dto.lines || dto.lines.length === 0) throw new BadRequestException('No invoice lines');
      const customer = (await tx.query<any>(`SELECT * FROM app.customers WHERE id = $1`, [dto.customerId])).rows[0];
      if (!customer) throw new NotFoundException('Customer not found');
      const tenant = (await tx.query<any>(`SELECT country FROM app.tenants WHERE id = $1`, [ctx.tenantId])).rows[0];
      const currency = dto.currency ?? 'EUR';

      const vatCtx: Vat.VatContext = {
        supplierCountry: tenant.country,
        customerCountry: customer.country,
        customerIsBusiness: customer.type === 'company',
        customerVatId: customer.vat_id,
        customerVatIdValidated: customer.vat_id_validated === true,
      };

      const invoiceLineInputs: Invoicing.InvoiceLineInput[] = [];
      const toInsert: Array<any> = [];
      let anyHumanConfirm = false;
      let treatment: string | null = null;
      let anyReverseCharge = false;
      let vatNote: string | null = null;

      for (const line of dto.lines) {
        const decision = Vat.decideLineVat(vatCtx, {
          kind: line.kind ?? 'service',
          domesticRatePct: line.domesticRatePct ?? '22',
        });
        anyHumanConfirm = anyHumanConfirm || decision.requiresHumanConfirmation;
        anyReverseCharge = anyReverseCharge || decision.reverseCharge;
        treatment = decision.treatment;
        if (decision.note) vatNote = decision.note;

        const net = Money.money(currency, BigInt(Math.round(line.netMinor)));
        const vat = Money.percentage(net, decision.effectiveRatePct);
        invoiceLineInputs.push({
          description: line.description, netMinor: net.minor,
          effectiveRatePct: decision.effectiveRatePct, reverseCharge: decision.reverseCharge,
        });
        toInsert.push({
          type: 'fee', description: line.description, quantity: '1',
          unitPriceMinor: net.minor, discountPct: '0',
          vatRatePct: decision.effectiveRatePct, reverseCharge: decision.reverseCharge,
          netMinor: net.minor, vatMinor: vat.minor, grossMinor: net.minor + vat.minor,
        });
      }

      if (anyHumanConfirm) {
        throw new ConflictException(
          'VAT treatment needs confirmation (e.g. unvalidated EU VAT ID). Validate the customer VAT ID before issuing.',
        );
      }

      const totals = Invoicing.composeInvoiceTotals(currency, invoiceLineInputs);
      const number = await this.counter.next(tx, ctx.tenantId, Sequence.DocumentType.Invoice);
      const issueDate = dto.issueDate ?? new Date().toISOString().slice(0, 10);
      const dueDays = dto.dueDays ?? customer.payment_terms_days ?? this.config.defaultPaymentTermsDays;
      const dueDate = addDays(issueDate, dueDays);

      const invoiceId = newId();
      const header = await this.repo.insertHeader(tx, {
        id: invoiceId, tenantId: ctx.tenantId, kind: 'invoice', number,
        workOrderId: null, customerId: customer.id, correctsInvoiceId: null,
        currency, vatTreatment: treatment, reverseCharge: anyReverseCharge, vatNote,
        netMinor: totals.netMinor, vatMinor: totals.vatMinor, grossMinor: totals.grossMinor,
        issueDate, dueDate, createdBy: ctx.userId,
      });

      let lineNo = 1;
      for (const li of toInsert) {
        await this.repo.insertLine(tx, { id: newId(), tenantId: ctx.tenantId, invoiceId, lineNo: lineNo++, ...li });
      }
      for (const g of totals.vatBreakdown) {
        await this.repo.insertVatGroup(tx, {
          tenantId: ctx.tenantId, invoiceId, ratePct: g.ratePct, reverseCharge: g.reverseCharge,
          netMinor: g.netMinor, vatMinor: g.vatMinor,
        });
      }

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'invoice.issued',
        entityType: 'invoice', entityId: invoiceId, before: null,
        after: { number, treatment, reverseCharge: anyReverseCharge, grossMinor: totals.grossMinor.toString(), currency, source: 'lines' },
      });
      await this.outbox.enqueue(tx, {
        tenantId: ctx.tenantId, eventType: 'minimax.invoice.upsert',
        payload: { invoiceId }, idempotencyKey: `minimax.invoice:${invoiceId}`,
      });
      await this.outbox.enqueue(tx, {
        tenantId: ctx.tenantId, eventType: 'einvoice.issue',
        payload: { invoiceId }, idempotencyKey: `einvoice.issue:${invoiceId}`,
      });

      return header;
    });
  }

  /** Issue a credit note that fully reverses an invoice (immutability-safe correction). */
  async createCreditNote(dto: CreditNoteDto): Promise<InvoiceHeader> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const original = await this.repo.findHeaderForUpdate(tx, dto.invoiceId);
      if (!original) throw new NotFoundException('Invoice not found');
      if (original.kind !== 'invoice') throw new BadRequestException('Can only credit an invoice');
      if (original.status === 'credited') throw new ConflictException('Invoice already credited');

      const lines = await this.repo.listLines(tx, original.id);
      const breakdown = await this.repo.listVatBreakdown(tx, original.id);

      const number = await this.counter.next(tx, ctx.tenantId, Sequence.DocumentType.CreditNote);
      const creditId = newId();
      const issueDate = new Date().toISOString().slice(0, 10);

      const credit = await this.repo.insertHeader(tx, {
        id: creditId, tenantId: ctx.tenantId, kind: 'credit_note', number,
        workOrderId: original.workOrderId, customerId: original.customerId, correctsInvoiceId: original.id,
        currency: original.currency, vatTreatment: original.vatTreatment,
        reverseCharge: original.reverseCharge, vatNote: original.vatNote,
        netMinor: -BigInt(original.totalNetMinor), vatMinor: -BigInt(original.totalVatMinor),
        grossMinor: -BigInt(original.totalGrossMinor),
        issueDate, dueDate: issueDate, createdBy: ctx.userId,
      });

      let lineNo = 1;
      for (const l of lines) {
        await this.repo.insertLine(tx, {
          id: newId(), tenantId: ctx.tenantId, invoiceId: creditId, lineNo: lineNo++,
          type: l.type, description: `Credit: ${l.description}`, quantity: String(l.quantity),
          unitPriceMinor: BigInt(l.unit_price_minor), discountPct: String(l.discount_pct),
          vatRatePct: String(l.vat_rate_pct), reverseCharge: l.reverse_charge,
          netMinor: -BigInt(l.net_minor), vatMinor: -BigInt(l.vat_minor), grossMinor: -BigInt(l.gross_minor),
        });
      }
      for (const g of breakdown) {
        await this.repo.insertVatGroup(tx, {
          tenantId: ctx.tenantId, invoiceId: creditId, ratePct: String(g.rate_pct),
          reverseCharge: g.reverse_charge, netMinor: -BigInt(g.net_minor), vatMinor: -BigInt(g.vat_minor),
        });
      }

      await this.repo.markStatus(tx, original.id, 'credited');

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'invoice.credited',
        entityType: 'invoice', entityId: creditId,
        before: { invoiceId: original.id, number: original.number },
        after: { creditNote: number, reason: dto.reason },
      });
      await this.outbox.enqueue(tx, {
        tenantId: ctx.tenantId, eventType: 'minimax.invoice.upsert',
        payload: { invoiceId: creditId }, idempotencyKey: `minimax.invoice:${creditId}`,
      });
      await this.outbox.enqueue(tx, {
        tenantId: ctx.tenantId, eventType: 'einvoice.issue',
        payload: { invoiceId: creditId }, idempotencyKey: `einvoice.issue:${creditId}`,
      });
      return credit;
    });
  }

  /** Record a customer payment and allocate it oldest-due-first across open invoices. */
  async recordPayment(dto: RecordPaymentDto) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const open = await this.repo.openForCustomer(tx, dto.customerId);
      const { allocations, unappliedMinor } = Receivables.allocatePayment(BigInt(dto.amountMinor), open);

      const paymentId = newId();
      await tx.query(
        `INSERT INTO app.payments (id, tenant_id, customer_id, currency, amount_minor, method, received_at, reference, unapplied_minor, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          paymentId, ctx.tenantId, dto.customerId, 'EUR', dto.amountMinor, dto.method,
          dto.receivedAt, dto.reference ?? null, unappliedMinor.toString(), ctx.userId,
        ],
      );
      for (const a of allocations) {
        await tx.query(
          `INSERT INTO app.payment_allocations (id, tenant_id, payment_id, invoice_id, applied_minor)
           VALUES (gen_random_uuid(),$1,$2,$3,$4)`,
          [ctx.tenantId, paymentId, a.invoiceId, a.appliedMinor.toString()],
        );
        await this.repo.applyPayment(tx, a.invoiceId, a.appliedMinor);
      }

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'payment.recorded',
        entityType: 'payment', entityId: paymentId,
        before: null,
        after: { amountMinor: String(dto.amountMinor), allocated: allocations.length, unappliedMinor: unappliedMinor.toString() },
      });
      return { paymentId, allocations: allocations.map((a) => ({ ...a, appliedMinor: a.appliedMinor.toString() })), unappliedMinor: unappliedMinor.toString() };
    });
  }

  async get(invoiceId: string) {
    const ctx = getContext();
    const result = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      const header = await this.repo.findHeader(tx, invoiceId);
      if (!header) return null;
      const lines = await this.repo.listLines(tx, invoiceId);
      const vat = await this.repo.listVatBreakdown(tx, invoiceId);
      return { ...header, lines, vatBreakdown: vat };
    });
    if (!result) throw new NotFoundException('Invoice not found');
    return result;
  }
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
