import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  newId, getContext, assertCustomerInvariants, Receivables, Money, Vat, type Customer,
} from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { CustomersRepository } from './customers.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { VAT_ID_VALIDATION_PORT, type VatIdValidationPort } from '../../integrations/vies/vat-id-validation.port';

/**
 * Demonstrates the connected foundation: a single transaction
 *   (1) writes the domain row (RLS-scoped),
 *   (2) appends a tamper-evident audit entry,
 *   (3) enqueues an outbox event for Minimax sync.
 * All three commit or roll back together (Master Blueprint §4 connected core).
 */
@Injectable()
export class CustomersService {
  constructor(
    private readonly pg: PgService,
    private readonly repo: CustomersRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(VAT_ID_VALIDATION_PORT) private readonly vies: VatIdValidationPort,
  ) {}

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const ctx = getContext();
    const currency = (dto.currency ?? 'EUR').toUpperCase();
    const paymentTermsDays = dto.paymentTermsDays ?? 30;

    // Domain invariants (shared, transport-independent).
    assertCustomerInvariants({
      country: dto.country.toUpperCase(),
      currency,
      vatLiable: dto.vatLiable,
      vatId: dto.vatId ?? null,
      paymentTermsDays,
    });

    const id = newId();

    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const customer = await this.repo.insert(tx, {
        id,
        tenantId: ctx.tenantId,
        code: dto.code ?? null,
        name: dto.name,
        type: dto.type,
        country: dto.country.toUpperCase(),
        address: dto.address ?? null,
        postCode: dto.postCode ?? null,
        city: dto.city ?? null,
        vatLiable: dto.vatLiable,
        vatId: dto.vatId ? dto.vatId.toUpperCase() : null,
        taxId: dto.taxId ?? null,
        registrationNo: dto.registrationNo ?? null,
        currency,
        paymentTermsDays,
        discountPct: dto.discountPct ?? '0',
        minimaxPartnerId: dto.minimaxPartnerId ?? null,
        createdBy: ctx.userId,
      });

      await this.audit.append(tx, {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: 'customer.created',
        entityType: 'customer',
        entityId: customer.id,
        before: null,
        after: customer,
      });

      // Push to Minimax as a partner upsert (field-ownership per Master Blueprint §9).
      await this.outbox.enqueue(tx, {
        tenantId: ctx.tenantId,
        eventType: 'minimax.partner.upsert',
        payload: { customerId: customer.id },
        idempotencyKey: `minimax.partner.upsert:${customer.id}`,
      });

      return customer;
    });
  }

  async findById(id: string): Promise<Customer> {
    const ctx = getContext();
    const customer = await this.pg.withTenant(ctx.tenantId, (tx) => this.repo.findById(tx, id));
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async list(limit: number, afterName?: string, afterId?: string): Promise<Customer[]> {
    const ctx = getContext();
    const capped = Math.min(Math.max(limit, 1), 100);
    return this.pg.withTenant(ctx.tenantId, (tx) => this.repo.list(tx, capped, afterName, afterId));
  }

  /**
   * Update an existing customer. This mirrors `create` exactly: it re-checks
   * the same domain invariants on the resulting state, audits the before/after
   * pair on the tamper-evident chain, and re-enqueues the Minimax partner
   * upsert so the accounting system stays in step with the edit. The patch is
   * partial — only the fields the advisor changed are sent — so we load the
   * current row first to validate the *merged* result, not the patch alone.
   */
  async update(id: string, dto: import('./dto/update-customer.dto').UpdateCustomerDto): Promise<Customer> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const before = await this.repo.findById(tx, id);
      if (!before) throw new NotFoundException('Customer not found');

      // Validate the merged result so an edit can never leave the customer in a
      // state `create` would have rejected (e.g. VAT-liable without a VAT id).
      const merged = {
        country: (dto.country ?? before.country).toUpperCase(),
        currency: (dto.currency ?? before.currency).toUpperCase(),
        vatLiable: dto.vatLiable ?? before.vatLiable,
        vatId: (dto.vatId ?? before.vatId) || null,
        paymentTermsDays: dto.paymentTermsDays ?? before.paymentTermsDays,
      };
      assertCustomerInvariants(merged);

      const after = await this.repo.update(tx, id, {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        country: dto.country ? dto.country.toUpperCase() : undefined,
        address: dto.address,
        postCode: dto.postCode,
        city: dto.city,
        vatLiable: dto.vatLiable,
        vatId: dto.vatId ? dto.vatId.toUpperCase() : dto.vatId,
        taxId: dto.taxId,
        registrationNo: dto.registrationNo,
        currency: dto.currency ? dto.currency.toUpperCase() : undefined,
        paymentTermsDays: dto.paymentTermsDays,
        discountPct: dto.discountPct,
        minimaxPartnerId: dto.minimaxPartnerId,
        updatedBy: ctx.userId,
      });
      if (!after) throw new NotFoundException('Customer not found');

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'customer.updated',
        entityType: 'customer', entityId: id, before, after,
      });

      // Keep Minimax in step with the edit (same upsert event as create).
      await this.outbox.enqueue(tx, {
        tenantId: ctx.tenantId, eventType: 'minimax.partner.upsert',
        payload: { customerId: id }, idempotencyKey: `minimax.partner.upsert:${id}:${Date.now()}`,
      });

      return after;
    });
  }

  /**
   * Validate a customer's VAT id so cross-border EU B2B invoices may be
   * reverse-charged. Two modes:
   *
   *   - 'vies'   — call the EU VIES service (only when configured). VIES's
   *                authoritative yes/no decides the outcome; a "no" records a
   *                failed attempt and leaves the customer unvalidated.
   *   - 'manual' — an audited human attestation: the advisor confirms they
   *                verified the id (note required), used when VIES is not wired.
   *
   * Either way the action is written to the tamper-evident audit chain with its
   * source, result, and note, and the row records who validated it and when.
   * Reverse charge then follows automatically from the (now-true) flag the
   * invoice engine already reads.
   */
  async validateVatId(
    customerId: string,
    input: { mode: 'vies' | 'manual'; note?: string },
  ): Promise<{ validated: boolean; source: 'vies' | 'manual'; viesName?: string | null; reason?: string }> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const customer = await this.repo.findById(tx, customerId);
      if (!customer) throw new NotFoundException('Customer not found');
      if (!customer.vatId) throw new BadRequestException('Customer has no VAT id to validate');

      // The id must structurally parse and its country prefix must match the
      // customer's country, or the treatment downstream would be wrong.
      const parsed = Vat.parseVatId(customer.vatId);
      if (!parsed) throw new BadRequestException('VAT id is not a valid format');
      if (!Vat.vatIdCountryMatches(customer.vatId, customer.country)) {
        throw new BadRequestException(
          `VAT id country (${parsed.country}) does not match customer country (${customer.country})`,
        );
      }

      let validated = false;
      let source: 'vies' | 'manual';
      let viesName: string | null = null;
      let reason: string | undefined;
      let note: string | null = null;

      if (input.mode === 'vies') {
        if (!this.vies.available) {
          throw new BadRequestException('VIES validation is not available in this deployment; use manual confirmation');
        }
        const result = await this.vies.check(parsed.country, parsed.number);
        validated = result.valid;
        source = 'vies';
        viesName = result.name;
        note = result.requestId ? `VIES requestId ${result.requestId}` : null;
        if (!validated) reason = 'VIES reports this VAT id is not valid';
      } else {
        // Manual confirmation is a deliberate, accountable act and must carry a
        // note explaining what the advisor checked.
        if (!input.note || input.note.trim().length < 3) {
          throw new BadRequestException('Manual confirmation requires a note describing what was verified');
        }
        validated = true;
        source = 'manual';
        note = input.note.trim();
      }

      const before = {
        vatIdValidated: customer.vatIdValidated ?? false,
        source: customer.vatIdValidationSource ?? null,
      };

      validated
        ? await this.repo.setVatValidation(tx, customerId, { validated: true, source, by: ctx.userId, note })
        : await this.repo.setVatValidation(tx, customerId, { validated: false, source: null, by: ctx.userId, note: null });

      // Audit EVERY validation action — success or failure, VIES or manual —
      // on the hash-chain (item 6). The note (and VIES request id) is captured.
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'customer.vat_id_validated',
        entityType: 'customer', entityId: customerId,
        before,
        after: { vatIdValidated: validated, source, viesName, note, reason: reason ?? null },
      });

      return { validated, source, viesName, reason };
    });
  }

  /**
   * Receivables aging for ONE customer (item 6). This deliberately reuses the
   * exact open-invoice query shape the shop-wide reporting endpoint uses, but
   * scoped with `customer_id = $1`, and feeds the result into the SAME tested
   * Receivables.ageReceivables function. No new financial arithmetic is
   * introduced — the advisor's per-customer overdue figure and the owner's
   * shop-wide figure are computed by identical, proven code.
   */
  async receivables(customerId: string, asOf?: string) {
    const ctx = getContext();
    const at = asOf ?? new Date().toISOString().slice(0, 10);
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      // Confirm the customer exists in this tenant before reporting on it.
      const exists = await this.repo.findById(tx, customerId);
      if (!exists) throw new NotFoundException('Customer not found');

      const res = await tx.query<any>(
        `SELECT id, issue_date, due_date, (total_gross_minor - paid_minor) AS outstanding
           FROM app.invoices
          WHERE customer_id = $1
            AND kind = 'invoice'
            AND status IN ('issued','sent','partly_paid','overdue')
            AND (total_gross_minor - paid_minor) > 0`,
        [customerId],
      );
      const open: Receivables.OpenInvoice[] = res.rows.map((r: any) => ({
        invoiceId: r.id,
        issuedAt: r.issue_date instanceof Date ? r.issue_date.toISOString().slice(0, 10) : String(r.issue_date).slice(0, 10),
        dueAt: r.due_date instanceof Date ? r.due_date.toISOString().slice(0, 10) : String(r.due_date).slice(0, 10),
        outstandingMinor: BigInt(r.outstanding),
      }));
      const b = Receivables.ageReceivables('EUR', open, at);
      const f = (m: bigint) => Money.format(Money.money('EUR', m));
      return {
        customerId,
        asOf: at,
        openCount: open.length,
        buckets: {
          current: b.current.toString(), d1_30: b.d1_30.toString(), d31_60: b.d31_60.toString(),
          d61_90: b.d61_90.toString(), d90_plus: b.d90_plus.toString(), total: b.totalMinor.toString(),
        },
        formatted: {
          current: f(b.current), d1_30: f(b.d1_30), d31_60: f(b.d31_60),
          d61_90: f(b.d61_90), d90_plus: f(b.d90_plus), total: f(b.totalMinor),
        },
      };
    });
  }
}
