import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { MinimaxModule } from '../integrations/minimax/minimax.module';
import { EInvoiceModule } from '../integrations/einvoice/einvoice.module';
import { OUTBOX_HANDLERS, type OutboxHandler } from '../common/events/outbox-handler.interface';
import { EInvoiceIssueHandler } from '../integrations/einvoice/einvoice.handler';
import { MinimaxPartnerUpsertHandler } from '../integrations/minimax/minimax.partner-upsert.handler';
import { MinimaxInvoiceUpsertHandler } from '../integrations/minimax/minimax-invoice.handler';

/**
 * Composition root for the outbox worker process. Imports the integration
 * modules so their handlers are instantiated, then aggregates those handlers
 * into the single OUTBOX_HANDLERS array via a factory provider. NestJS has no
 * Angular-style multi-providers, so this factory IS the aggregation point: the
 * worker reads OUTBOX_HANDLERS and dispatches each queued event by eventType.
 * (HTTP controllers are intentionally absent here.)
 */
@Module({
  imports: [CommonModule, MinimaxModule, EInvoiceModule],
  providers: [
    {
      provide: OUTBOX_HANDLERS,
      useFactory: (...handlers: OutboxHandler[]): OutboxHandler[] => handlers,
      inject: [EInvoiceIssueHandler, MinimaxPartnerUpsertHandler, MinimaxInvoiceUpsertHandler],
    },
  ],
})
export class WorkerModule {}
