import { Injectable } from '@nestjs/common';
import { TxClient } from '../db/pg.service';

/**
 * Transactional outbox writer (Architecture §1.5, §6). The event is inserted
 * in the SAME transaction as the domain change, guaranteeing exactly-once
 * intent: if the business write commits, the event is durably queued; if it
 * rolls back, no event is emitted. The worker drains it idempotently.
 */
@Injectable()
export class OutboxService {
  async enqueue(
    tx: TxClient,
    params: {
      tenantId: string;
      eventType: string;
      payload: unknown;
      idempotencyKey: string;
    },
  ): Promise<void> {
    await tx.query(
      `INSERT INTO app.outbox (tenant_id, event_type, payload, idempotency_key)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (tenant_id, idempotency_key) DO NOTHING`,
      [params.tenantId, params.eventType, JSON.stringify(params.payload), params.idempotencyKey],
    );
  }
}
