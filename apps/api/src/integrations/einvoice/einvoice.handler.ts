import { Inject, Injectable } from '@nestjs/common';
import { isEuCountry } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { InvoicesRepository } from '../../modules/invoices/invoices.repository';
import type { OutboxEvent, OutboxHandler } from '../../common/events/outbox-handler.interface';
import { EINVOICE_CHANNELS, type EInvoiceChannel, type InvoiceForEInvoice } from './einvoice.port';

/**
 * Handles 'einvoice.issue'. Routes the invoice to the correct legal channel by
 * the customer's country (Croatia -> Fiskalizacija 2.0; Slovenia -> eSLOG/Peppol),
 * builds the jurisdiction-specific document, transmits it, and records the
 * authority reference and status in app.einvoice_documents. Reverse-charge and
 * non-EU supplies need no fiscalization, so they are marked accordingly and skipped.
 */
@Injectable()
export class EInvoiceIssueHandler implements OutboxHandler {
  readonly eventType = 'einvoice.issue';
  private readonly channels: Map<string, EInvoiceChannel>;

  constructor(
    private readonly pg: PgService,
    private readonly invoices: InvoicesRepository,
    @Inject(EINVOICE_CHANNELS) channels: EInvoiceChannel[],
  ) {
    this.channels = new Map(channels.map((c) => [c.id, c]));
  }

  async handle(event: OutboxEvent): Promise<void> {
    const invoiceId: string = event.payload.invoiceId;

    const loaded = await this.pg.withTenant(event.tenantId, async (tx) => {
      const header = await this.invoices.findHeader(tx, invoiceId);
      if (!header) return null;
      const lines = await this.invoices.listLines(tx, invoiceId);
      const breakdown = await this.invoices.listVatBreakdown(tx, invoiceId);
      const customer = (await tx.query<any>(
        `SELECT name, country, vat_id, address FROM app.customers WHERE id = $1`, [header.customerId]
      )).rows[0];
      const tenant = (await tx.query<any>(
        `SELECT name, country, vat_id FROM app.tenants WHERE id = $1`, [event.tenantId]
      )).rows[0];
      return { header, lines, breakdown, customer, tenant };
    });
    if (!loaded) return;

    const customerCountry = String(loaded.customer.country).toUpperCase();
    const channelId =
      customerCountry === 'HR' ? 'hr_fiscalization'
      : customerCountry === 'SI' ? 'si_eslog_peppol'
      : isEuCountry(customerCountry) ? 'si_eslog_peppol' // EU peers via Peppol
      : null; // non-EU: no domestic fiscalization required

    if (!channelId) {
      await this.upsertDoc(event.tenantId, invoiceId, 'si_eslog_peppol', 'n/a', 'acknowledged',
        null, 'Non-EU supply; no e-invoicing channel required');
      return;
    }

    const channel = this.channels.get(channelId);
    if (!channel) throw new Error(`No e-invoice channel registered for ${channelId}`);

    const invoice: InvoiceForEInvoice = {
      id: loaded.header.id, kind: loaded.header.kind, number: loaded.header.number!,
      currency: loaded.header.currency, issueDate: loaded.header.issueDate!, dueDate: loaded.header.dueDate!,
      reverseCharge: loaded.header.reverseCharge, vatNote: loaded.header.vatNote,
      supplier: { name: loaded.tenant.name, country: loaded.tenant.country, vatId: loaded.tenant.vat_id },
      customer: { name: loaded.customer.name, country: loaded.customer.country, vatId: loaded.customer.vat_id, address: loaded.customer.address },
      netMinor: loaded.header.totalNetMinor, vatMinor: loaded.header.totalVatMinor, grossMinor: loaded.header.totalGrossMinor,
      lines: loaded.lines.map((l) => ({
        description: l.description, quantity: String(l.quantity), netMinor: String(l.net_minor),
        vatRatePct: String(l.vat_rate_pct), vatMinor: String(l.vat_minor),
      })),
      vatBreakdown: loaded.breakdown.map((g) => ({
        ratePct: String(g.rate_pct), reverseCharge: g.reverse_charge,
        netMinor: String(g.net_minor), vatMinor: String(g.vat_minor),
      })),
    };

    const doc = await channel.build(invoice);
    await this.upsertDoc(event.tenantId, invoiceId, channelId, doc.format, 'built', doc.payload, null);

    const result = await channel.transmit(invoice, doc);
    await this.upsertDoc(event.tenantId, invoiceId, channelId, doc.format, 'transmitted', doc.payload, null, result.authorityRef);

    // Mark the invoice as sent once the legal channel has accepted it.
    await this.pg.withTenant(event.tenantId, (tx) => this.invoices.markStatus(tx, invoiceId, 'sent'));
  }

  private async upsertDoc(
    tenantId: string, invoiceId: string, channel: string, format: string, status: string,
    payload: string | null, error: string | null, authorityRef?: string,
  ): Promise<void> {
    await this.pg.withTenant(tenantId, (tx) =>
      tx.query(
        `INSERT INTO app.einvoice_documents (id, tenant_id, invoice_id, channel, format, status, payload, authority_ref, last_error, attempts)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 1)
         ON CONFLICT (invoice_id, channel) DO UPDATE
           SET status = EXCLUDED.status, format = EXCLUDED.format,
               payload = COALESCE(EXCLUDED.payload, app.einvoice_documents.payload),
               authority_ref = COALESCE(EXCLUDED.authority_ref, app.einvoice_documents.authority_ref),
               last_error = EXCLUDED.last_error,
               attempts = app.einvoice_documents.attempts + 1,
               updated_at = now()`,
        [tenantId, invoiceId, channel, format, status, payload, authorityRef ?? null, error],
      ),
    );
  }
}
