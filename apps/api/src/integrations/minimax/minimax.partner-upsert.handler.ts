import { Inject, Injectable } from '@nestjs/common';
import { PgService } from '../../common/db/pg.service';
import { CustomersRepository } from '../../modules/customers/customers.repository';
import type { OutboxEvent, OutboxHandler } from '../../common/events/outbox-handler.interface';
import { MINIMAX_PORT, type MinimaxPort } from './minimax.port';
import { toMinimaxPartner } from './minimax.mapper';

/**
 * Handles 'minimax.partner.upsert'. Loads the customer (tenant-scoped),
 * pushes it to Minimax, and writes back the Minimax partner id — establishing
 * the field-ownership link (Master Blueprint §9). Errors propagate to the
 * worker, which classifies transient vs permanent for retry/dead-lettering.
 */
@Injectable()
export class MinimaxPartnerUpsertHandler implements OutboxHandler {
  readonly eventType = 'minimax.partner.upsert';

  constructor(
    private readonly pg: PgService,
    private readonly repo: CustomersRepository,
    @Inject(MINIMAX_PORT) private readonly minimax: MinimaxPort,
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    const customerId: string = event.payload.customerId;

    const customer = await this.pg.withTenant(event.tenantId, (tx) =>
      this.repo.findById(tx, customerId),
    );
    if (!customer) return; // customer deleted/rolled back; nothing to sync

    const { minimaxPartnerId } = await this.minimax.upsertPartner(
      event.tenantId,
      toMinimaxPartner(customer),
    );

    // Persist the mapping (Minimax owns the id; we own operational fields).
    await this.pg.withTenant(event.tenantId, (tx) =>
      tx.query(
        `UPDATE app.customers
            SET minimax_partner_id = $1, updated_at = now()
          WHERE id = $2 AND (minimax_partner_id IS NULL OR minimax_partner_id = $1)`,
        [minimaxPartnerId, customerId],
      ),
    );
  }
}
