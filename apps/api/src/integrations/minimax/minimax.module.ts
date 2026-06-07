import { Module } from '@nestjs/common';
import { CustomersModule } from '../../modules/customers/customers.module';
import { InvoicesModule } from '../../modules/invoices/invoices.module';
import { MINIMAX_PORT } from './minimax.port';
import { MinimaxHttpAdapter } from './minimax.adapter';
import { MinimaxPartnerUpsertHandler } from './minimax.partner-upsert.handler';
import { MinimaxInvoiceUpsertHandler } from './minimax-invoice.handler';

/**
 * Minimax accounting integration. Provides the HTTP adapter behind MINIMAX_PORT
 * and the two outbox handlers (partner upsert, invoice upsert). The handlers are
 * EXPORTED so the WorkerModule can aggregate them into the OUTBOX_HANDLERS array
 * via a factory provider — NestJS has no `multi: true`, so aggregation happens
 * there rather than by repeating a multi token here.
 */
@Module({
  imports: [CustomersModule, InvoicesModule],
  providers: [
    MinimaxHttpAdapter,
    { provide: MINIMAX_PORT, useExisting: MinimaxHttpAdapter },
    MinimaxPartnerUpsertHandler,
    MinimaxInvoiceUpsertHandler,
  ],
  exports: [MinimaxPartnerUpsertHandler, MinimaxInvoiceUpsertHandler],
})
export class MinimaxModule {}
