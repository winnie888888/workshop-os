import { Inject, Injectable } from '@nestjs/common';
import { PgService } from '../../common/db/pg.service';
import { InvoicesRepository } from '../../modules/invoices/invoices.repository';
import type { OutboxEvent, OutboxHandler } from '../../common/events/outbox-handler.interface';
import { MINIMAX_PORT, type MinimaxPort } from './minimax.port';
import { toMinimaxInvoice } from './minimax-invoice.mapper';

/**
 * Handles 'minimax.invoice.upsert': loads the issued invoice and pushes it to
 * Minimax, then records the returned Minimax document id. Failures propagate to
 * the worker for retry/backoff (Master Blueprint §9 — we own reliability since
 * Seyfor offers no integration support).
 */
@Injectable()
export class MinimaxInvoiceUpsertHandler implements OutboxHandler {
  readonly eventType = 'minimax.invoice.upsert';

  constructor(
    private readonly pg: PgService,
    private readonly invoices: InvoicesRepository,
    @Inject(MINIMAX_PORT) private readonly minimax: MinimaxPort,
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    const invoiceId: string = event.payload.invoiceId;

    const loaded = await this.pg.withTenant(event.tenantId, async (tx) => {
      const header = await this.invoices.findHeader(tx, invoiceId);
      if (!header) return null;
      const lines = await this.invoices.listLines(tx, invoiceId);
      const breakdown = await this.invoices.listVatBreakdown(tx, invoiceId);
      const customer = (await tx.query<any>(
        `SELECT id, minimax_partner_id FROM app.customers WHERE id = $1`, [header.customerId]
      )).rows[0];
      return { header, lines, breakdown, customer };
    });
    if (!loaded) return;

    const payload = toMinimaxInvoice(
      loaded.header,
      { id: loaded.customer.id, minimaxPartnerId: loaded.customer.minimax_partner_id },
      loaded.lines,
      loaded.breakdown,
    );
    const { minimaxInvoiceId } = await this.minimax.upsertInvoice(event.tenantId, payload);

    await this.pg.withTenant(event.tenantId, (tx) => this.invoices.setMinimaxId(tx, invoiceId, minimaxInvoiceId));
  }
}
