/**
 * Outbox handler contract (Architecture §1.5, §6). Each integration registers
 * a handler keyed by event_type. The worker dispatches durably-queued events
 * to the matching handler with retry/backoff and dead-lettering.
 */
export interface OutboxEvent {
  id: string;
  tenantId: string;
  eventType: string;
  payload: any;
  attempts: number;
}

export interface OutboxHandler {
  readonly eventType: string;
  handle(event: OutboxEvent): Promise<void>;
}

/** Multi-provider DI token; every OutboxHandler provider is collected here. */
export const OUTBOX_HANDLERS = 'OUTBOX_HANDLERS';
