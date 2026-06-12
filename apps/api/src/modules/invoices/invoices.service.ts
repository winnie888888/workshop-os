import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  newId, getContext, Money, Vat, Invoicing, Receivables, Sequence,
} from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { NotifyService } from '../../common/notify/notify.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { CounterService } from '../../common/numbering/counter.service';
import { AppConfig } from '../../config/configuration';
import { InvoicesRepository, type InvoiceHeader } from './invoices.repository';
import { CreditNoteDto, IssueInvoiceDto, RecordPaymentDto } from './dto/invoice.dto';
import { normalizeSiPhone } from '../../integrations/notifications/phone.util';

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
    private readonly notify: NotifyService,
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
      const tenant = (await tx.query<any>(`SELECT name, country FROM app.tenants WHERE id = $1`, [ctx.tenantId])).rows[0];
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

      // SMS stranki "Račun je na voljo" (spec: invoice_available) — outbox v
      // ISTI transakciji; telefon je neobvezen, brez njega dogodka ni.
      if (customer.phone) {
        await this.outbox.enqueue(tx, {
          tenantId: ctx.tenantId, eventType: 'notification.send',
          payload: {
            channel: 'sms', to: normalizeSiPhone(customer.phone), kind: 'invoice_available',
            body: `Izdan je račun ${number} v znesku ${eurFromMinor(totals.grossMinor)}. — ${tenant.name}`,
          },
          idempotencyKey: `notify.invoice_available:${invoiceId}`,
        });
      }

      // Obvestilo v zvonček (near-commit: tik pred uspešnim zaključkom tx;
      // NotifyService teče po lastni admin poti in posla ne more podreti).
      await this.notify.toRoles(ctx.tenantId, ['owner', 'advisor'], {
        kind: 'invoice', title: `Izdan račun ${number}`,
        entityType: 'invoice', entityId: invoiceId, excludeUserId: ctx.userId,
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
      const tenant = (await tx.query<any>(`SELECT name, country FROM app.tenants WHERE id = $1`, [ctx.tenantId])).rows[0];
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

      // SMS stranki "Račun je na voljo" (spec: invoice_available) — outbox v
      // ISTI transakciji; telefon je neobvezen, brez njega dogodka ni.
      if (customer.phone) {
        await this.outbox.enqueue(tx, {
          tenantId: ctx.tenantId, eventType: 'notification.send',
          payload: {
            channel: 'sms', to: normalizeSiPhone(customer.phone), kind: 'invoice_available',
            body: `Izdan je račun ${number} v znesku ${eurFromMinor(totals.grossMinor)}. — ${tenant.name}`,
          },
          idempotencyKey: `notify.invoice_available:${invoiceId}`,
        });
      }

      // Obvestilo v zvonček (near-commit: tik pred uspešnim zaključkom tx;
      // NotifyService teče po lastni admin poti in posla ne more podreti).
      await this.notify.toRoles(ctx.tenantId, ['owner', 'advisor'], {
        kind: 'invoice', title: `Izdan račun ${number}`,
        entityType: 'invoice', entityId: invoiceId, excludeUserId: ctx.userId,
      });

      return header;
    });
  }


  /**
   * Zbirni račun — kandidati: ZAKLJUČENI ('ready') in še nezaračunani nalogi
   * stranke. Nezaračunan pomeni: ni v vezni tabeli invoice_work_orders (zbirni
   * tok) IN status še ni 'invoiced' (enojni tok). UNIQUE(work_order_id) v 0028
   * isto varuje še na ravni baze.
   */
  async consolidatedCandidates(customerId: string) {
    const ctx = getContext();
    if (!customerId) throw new BadRequestException('customerId je obvezen');
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT w.id, w.number, w.currency, w.total_gross_minor, w.ready_at,
                w.asset_id, a.plate, a.country_of_plate AS plate_country,
                (SELECT count(*)::int FROM app.work_order_lines wl
                  WHERE wl.work_order_id = w.id AND wl.type <> 'discount' AND wl.net_minor <> 0) AS billable_lines
           FROM app.work_orders w
           LEFT JOIN app.assets a ON a.id = w.asset_id
          WHERE w.customer_id = $1
            AND w.status = 'ready'
            AND NOT EXISTS (SELECT 1 FROM app.invoice_work_orders iwo WHERE iwo.work_order_id = w.id)
          ORDER BY w.number NULLS LAST, w.created_at`,
        [customerId],
      );
      return r.rows.map((w: any) => ({
        id: w.id,
        number: w.number ?? null,
        currency: w.currency,
        totalGrossMinor: String(w.total_gross_minor),
        readyAt: w.ready_at ? (w.ready_at instanceof Date ? w.ready_at.toISOString() : String(w.ready_at)) : null,
        assetId: w.asset_id ?? null,
        plate: w.plate ?? null,
        plateCountry: w.plate_country ?? null,
        billableLines: Number(w.billable_lines ?? 0),
      }));
    });
  }

  /**
   * Zbirni račun (Consolidated Invoicing): EN račun za VEČ 'ready' nalogov iste
   * stranke. NAMENOMA isti motor kot enojni tok — ista DDV odločitev po vrstici,
   * isti composeInvoiceTotals, isti repo/števec/audit/outbox; nič ni izumljeno
   * na novo. Razlike: glava ima work_order_id = NULL (vez nosi 0028 tabela,
   * 1 račun : N nalogov), vsaka vrstica nosi izvorni work_order_id (0029) za
   * vsote po nalogu, vsi nalogi pa se atomarno premaknejo v 'invoiced' v ISTI
   * transakciji kot račun — račun brez označenih nalogov ne more obstajati.
   */
  async issueConsolidated(dto: {
    customerId: string; workOrderIds: string[]; issueDate?: string; dueDays?: number;
  }): Promise<InvoiceHeader> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const ids = [...new Set(dto.workOrderIds ?? [])];
      if (ids.length === 0) throw new BadRequestException('Izberi vsaj en delovni nalog.');
      if (ids.length > 50) throw new BadRequestException('Največ 50 nalogov na en zbirni račun.');

      // FOR UPDATE: zaklene naloge do konca transakcije (sočasna izdaja odpade).
      const woRes = await tx.query<any>(
        `SELECT * FROM app.work_orders WHERE id = ANY($1::uuid[]) FOR UPDATE`, [ids],
      );
      if (woRes.rowCount !== ids.length) {
        throw new NotFoundException('Nekaterih izbranih nalogov ni mogoče najti.');
      }
      const orders = woRes.rows
        .slice()
        .sort((x: any, y: any) => String(x.number ?? '').localeCompare(String(y.number ?? '')) || String(x.created_at).localeCompare(String(y.created_at)));

      const wrongCustomer = orders.filter((o: any) => o.customer_id !== dto.customerId);
      if (wrongCustomer.length > 0) {
        throw new BadRequestException(`Nalogi ne pripadajo izbrani stranki: ${wrongCustomer.map((o: any) => o.number ?? o.id).join(', ')}`);
      }
      const notReady = orders.filter((o: any) => o.status !== 'ready');
      if (notReady.length > 0) {
        throw new ConflictException(`Na zbirni račun gredo samo nalogi v statusu 'Pripravljeno': ${notReady.map((o: any) => `${o.number ?? o.id} (${o.status})`).join(', ')}`);
      }
      const currency = orders[0].currency;
      if (orders.some((o: any) => o.currency !== currency)) {
        throw new ConflictException('Vsi nalogi na zbirnem računu morajo imeti isto valuto.');
      }
      const already = await tx.query<any>(
        `SELECT iwo.work_order_id, w.number
           FROM app.invoice_work_orders iwo
           JOIN app.work_orders w ON w.id = iwo.work_order_id
          WHERE iwo.work_order_id = ANY($1::uuid[])`,
        [ids],
      );
      if ((already.rowCount ?? 0) > 0) {
        throw new ConflictException(`Že zaračunani nalogi: ${already.rows.map((r: any) => r.number ?? r.work_order_id).join(', ')}`);
      }

      const customer = (await tx.query<any>(`SELECT * FROM app.customers WHERE id = $1`, [dto.customerId])).rows[0];
      if (!customer) throw new NotFoundException('Customer not found');
      const tenant = (await tx.query<any>(`SELECT name, country FROM app.tenants WHERE id = $1`, [ctx.tenantId])).rows[0];

      const vatCtx: Vat.VatContext = {
        supplierCountry: tenant.country,
        customerCountry: customer.country,
        customerIsBusiness: customer.type === 'company',
        customerVatId: customer.vat_id,
        customerVatIdValidated: customer.vat_id_validated === true,
      };

      const invoiceLineInputs: Invoicing.InvoiceLineInput[] = [];
      const toInsert: Array<{
        type: string; description: string; quantity: string; unitPriceMinor: bigint;
        discountPct: string; vatRatePct: string; reverseCharge: boolean;
        netMinor: bigint; vatMinor: bigint; grossMinor: bigint; workOrderId: string;
      }> = [];

      let anyHumanConfirm = false;
      let treatment: string | null = null;
      let anyReverseCharge = false;
      let vatNote: string | null = null;

      for (const order of orders) {
        const lines = (await tx.query<any>(
          `SELECT * FROM app.work_order_lines WHERE work_order_id = $1 ORDER BY line_no`, [order.id],
        )).rows;
        const billable = lines.filter((l: any) => l.type !== 'discount' && BigInt(l.net_minor) !== 0n);
        if (billable.length === 0) {
          throw new BadRequestException(`Nalog ${order.number ?? order.id} nima obračunljivih vrstic.`);
        }
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
            workOrderId: order.id,
          });
        }
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

      // Vez + status: v ISTI transakciji kot račun (atomarno, brez razpok).
      for (const order of orders) {
        await tx.query(
          `INSERT INTO app.invoice_work_orders (invoice_id, work_order_id, tenant_id) VALUES ($1, $2, $3)`,
          [invoiceId, order.id, ctx.tenantId],
        );
        await tx.query(
          `UPDATE app.work_orders SET status='invoiced', invoiced_at=now(), version=version+1, updated_at=now() WHERE id=$1`,
          [order.id],
        );
      }

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'invoice.issued',
        entityType: 'invoice', entityId: invoiceId,
        before: null,
        after: {
          number, treatment, reverseCharge: anyReverseCharge,
          grossMinor: totals.grossMinor.toString(), currency,
          source: 'consolidated', workOrderCount: orders.length,
          workOrders: orders.map((o: any) => ({ id: o.id, number: o.number ?? null })),
        },
      });

      await this.outbox.enqueue(tx, {
        tenantId: ctx.tenantId, eventType: 'minimax.invoice.upsert',
        payload: { invoiceId }, idempotencyKey: `minimax.invoice:${invoiceId}`,
      });
      await this.outbox.enqueue(tx, {
        tenantId: ctx.tenantId, eventType: 'einvoice.issue',
        payload: { invoiceId }, idempotencyKey: `einvoice.issue:${invoiceId}`,
      });

      // SMS stranki "Račun je na voljo" — ista pot kot enojni tok.
      if (customer.phone) {
        await this.outbox.enqueue(tx, {
          tenantId: ctx.tenantId, eventType: 'notification.send',
          payload: {
            channel: 'sms', to: normalizeSiPhone(customer.phone), kind: 'invoice_available',
            body: `Izdan je zbirni račun ${number} (${orders.length} nalogov) v znesku ${eurFromMinor(totals.grossMinor)}. — ${tenant.name}`,
          },
          idempotencyKey: `notify.invoice_available:${invoiceId}`,
        });
      }

      await this.notify.toRoles(ctx.tenantId, ['owner', 'advisor'], {
        kind: 'invoice', title: `Izdan zbirni račun ${number} (${orders.length} nalogov)`,
        entityType: 'invoice', entityId: invoiceId, excludeUserId: ctx.userId,
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

  /**
   * Knjiži plačilo na KONKRETEN račun (Plačila P2 — uvoz bančnih izpiskov):
   * sklic z izpiska pove točno, kateri račun je plačan, zato tu ni
   * oldest-first alokacije. Uporablja isti zapis (payments +
   * payment_allocations + repo.applyPayment) kot ročni recordPayment, da
   * statusi in saldo računa živijo na enem mestu. Morebitno preplačilo ostane
   * kot unapplied na plačilu — vidno, ne izgubljeno.
   */
  async applyPaymentToInvoice(input: {
    invoiceId: string; amountMinor: string; receivedAt: string;
    reference?: string | null; payerName?: string | null; source?: string;
  }) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const header = await this.repo.findHeader(tx, input.invoiceId);
      if (!header) throw new NotFoundException('Invoice not found');
      const remaining = BigInt(header.totalGrossMinor) - BigInt(header.paidMinor ?? 0);
      if (remaining <= 0n) throw new ConflictException(`Račun ${header.number} je že poravnan.`);
      const amount = BigInt(input.amountMinor);
      if (amount <= 0n) throw new BadRequestException('Znesek plačila mora biti pozitiven.');
      const applied = amount < remaining ? amount : remaining;
      const unapplied = amount - applied;

      const paymentId = newId();
      await tx.query(
        `INSERT INTO app.payments (id, tenant_id, customer_id, currency, amount_minor, method, received_at, reference, unapplied_minor, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          paymentId, ctx.tenantId, header.customerId, header.currency ?? 'EUR', amount.toString(),
          'bank_transfer', input.receivedAt, input.reference ?? null, unapplied.toString(), ctx.userId,
        ],
      );
      await tx.query(
        `INSERT INTO app.payment_allocations (id, tenant_id, payment_id, invoice_id, applied_minor)
         VALUES (gen_random_uuid(),$1,$2,$3,$4)`,
        [ctx.tenantId, paymentId, input.invoiceId, applied.toString()],
      );
      await this.repo.applyPayment(tx, input.invoiceId, applied);

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'payment.recorded',
        entityType: 'payment', entityId: paymentId,
        before: null,
        after: {
          amountMinor: amount.toString(), appliedMinor: applied.toString(),
          unappliedMinor: unapplied.toString(), invoiceId: input.invoiceId,
          invoiceNumber: header.number, source: input.source ?? 'manual',
          payerName: input.payerName ?? null, reference: input.reference ?? null,
        },
      });
      return {
        paymentId, invoiceNumber: header.number,
        appliedMinor: applied.toString(), unappliedMinor: unapplied.toString(),
      };
    });
  }

  /**
   * Razknjiženje plačila (P2.1). Plačilo se NE briše — alokacije so
   * append-only ledger in revizijska sled mora preživeti. Storno je oznaka
   * (payments.reversed_at, migracija 0024); tu se ob njej na vsakem računu,
   * ki ga je plačilo pokrivalo, paid_minor vrne in status izračuna na novo
   * (issued/overdue pri saldu 0, sicer partly_paid). repo.applyPayment za to
   * NI uporabljen, ker njegov CASE pri negativnem znesku vrne napačen status.
   * Idempotentno: že razknjiženo plačilo vrne alreadyReversed brez sprememb,
   * da klicatelj (bank-import) lahko varno dokonča prekinjen postopek.
   */
  async reversePayment(paymentId: string, reason?: string | null) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const p = await tx.query<any>(`SELECT * FROM app.payments WHERE id = $1 FOR UPDATE`, [paymentId]);
      if (!p.rows[0]) throw new NotFoundException('Plačilo ne obstaja.');
      const pay = p.rows[0];
      if (pay.reversed_at) {
        return { paymentId, alreadyReversed: true, allocations: [] as Array<{ invoiceId: string; invoiceNumber: string | null; amountMinor: string; newStatus: string }> };
      }

      const allocs = await tx.query<any>(
        `SELECT invoice_id, applied_minor FROM app.payment_allocations WHERE payment_id = $1`,
        [paymentId],
      );

      const allocations: Array<{ invoiceId: string; invoiceNumber: string | null; amountMinor: string; newStatus: string }> = [];
      for (const a of allocs.rows) {
        const header = await this.repo.findHeaderForUpdate(tx, a.invoice_id);
        if (!header) continue;
        const applied = BigInt(a.applied_minor);
        const newPaid = BigInt(header.paidMinor) - applied;
        if (newPaid < 0n) {
          throw new ConflictException(
            `Računa ${header.number ?? a.invoice_id} ni mogoče razknjižiti: plačani znesek bi postal negativen.`,
          );
        }
        // Statusov credited/void/draft storno ne dotika; paid/status smeta
        // mimo immutability triggerja (zaklenjeni so zneski/številka/datumi).
        const res = await tx.query<any>(
          `UPDATE app.invoices
              SET paid_minor = $2,
                  status = CASE
                             WHEN status IN ('credited','void','draft') THEN status
                             WHEN $2::bigint <= 0 THEN
                               CASE WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE THEN 'overdue' ELSE 'issued' END
                             ELSE 'partly_paid'
                           END,
                  version = version + 1,
                  updated_at = now()
            WHERE id = $1
            RETURNING status`,
          [a.invoice_id, newPaid.toString()],
        );
        allocations.push({
          invoiceId: a.invoice_id, invoiceNumber: header.number,
          amountMinor: applied.toString(), newStatus: res.rows[0]?.status ?? 'unknown',
        });
      }

      await tx.query(
        `UPDATE app.payments SET reversed_at = now(), reversed_by = $2, reversal_reason = $3 WHERE id = $1`,
        [paymentId, ctx.userId, reason ?? null],
      );

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'payment.reversed',
        entityType: 'payment', entityId: paymentId,
        before: { reversedAt: null },
        after: { reason: reason ?? null, allocations },
      });

      return { paymentId, alreadyReversed: false, allocations };
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

  async listByCustomer(customerId?: string): Promise<InvoiceHeader[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) =>
      customerId ? this.repo.listByCustomer(tx, customerId) : this.repo.listAll(tx),
    );
  }

  async get(invoiceId: string) {
    const ctx = getContext();
    const result = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      const header = await this.repo.findHeader(tx, invoiceId);
      if (!header) return null;
      const lines = await this.repo.listLines(tx, invoiceId);
      const vat = await this.repo.listVatBreakdown(tx, invoiceId);
      // Zbirni račun: povezani nalogi iz vezne tabele (prazno za enojni tok).
      const wos = await tx.query<any>(
        `SELECT w.id, w.number, a.plate
           FROM app.invoice_work_orders iwo
           JOIN app.work_orders w ON w.id = iwo.work_order_id
           LEFT JOIN app.assets a ON a.id = w.asset_id
          WHERE iwo.invoice_id = $1
          ORDER BY w.number NULLS LAST`,
        [invoiceId],
      );
      const workOrders = wos.rows.map((w: any) => ({ id: w.id, number: w.number ?? null, plate: w.plate ?? null }));
      return { ...header, lines, vatBreakdown: vat, workOrders };
    });
    if (!result) throw new NotFoundException('Invoice not found');
    return result;
  }

  /** Outbox sinhronizacijski vnosi za en račun (Minimax + e-Račun) — resnica, ne animacija. */
  syncStatus(invoiceId: string) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT id, event_type, status, attempts, last_error, next_attempt_at, updated_at
           FROM app.outbox
          WHERE payload->>'invoiceId' = $1
            AND (event_type LIKE 'minimax.%' OR event_type LIKE 'einvoice.%')
          ORDER BY event_type`,
        [invoiceId],
      );
      return r.rows.map((o: any) => ({
        id: o.id,
        eventType: o.event_type,
        status: o.status,
        attempts: o.attempts,
        lastError: o.last_error ?? undefined,
        nextAttemptAt: o.next_attempt_at,
        updatedAt: o.updated_at,
      }));
    });
  }

  /** Mrtve sinhronizacije računa nazaj v vrsto; worker jih pobere v ~1 s. Avditirano. */
  retrySync(invoiceId: string) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query(
        `UPDATE app.outbox
            SET status = 'pending', next_attempt_at = now(), last_error = NULL, updated_at = now()
          WHERE payload->>'invoiceId' = $1
            AND status = 'dead'
            AND (event_type LIKE 'minimax.%' OR event_type LIKE 'einvoice.%')`,
        [invoiceId],
      );
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'invoice.sync_retry',
        entityType: 'invoice', entityId: invoiceId, before: null,
        after: { requeued: r.rowCount },
      });
      return { ok: true, requeued: r.rowCount };
    });
  }
}

/** Prikaz zneska v SMS: minor (bigint) -> "123,45 €" (sl decimalna vejica). */
function eurFromMinor(minor: bigint): string {
  const cents = Number(minor);
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
