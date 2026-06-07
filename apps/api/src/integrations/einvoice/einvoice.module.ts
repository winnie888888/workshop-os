import { Module } from '@nestjs/common';
import { InvoicesModule } from '../../modules/invoices/invoices.module';
import { EINVOICE_CHANNELS } from './einvoice.port';
import { HrFiscalizationChannel } from './hr-fiscalization.channel';
import { SiEslogPeppolChannel } from './si-eslog-peppol.channel';
import { EInvoiceIssueHandler } from './einvoice.handler';

/**
 * Registers both legal e-invoice channels and the 'einvoice.issue' outbox
 * handler (the worker drains it; see WorkerModule, which aggregates all outbox
 * handlers into the OUTBOX_HANDLERS array).
 *
 * NestJS has no Angular-style `multi: true` providers, so the channel ARRAY is
 * bound explicitly via a factory that depends on each channel. The handler then
 * injects EINVOICE_CHANNELS and routes to the right channel per invoice — the
 * original business behaviour, expressed in a way NestJS actually supports.
 */
@Module({
  imports: [InvoicesModule],
  providers: [
    HrFiscalizationChannel,
    SiEslogPeppolChannel,
    {
      provide: EINVOICE_CHANNELS,
      useFactory: (hr: HrFiscalizationChannel, si: SiEslogPeppolChannel) => [hr, si],
      inject: [HrFiscalizationChannel, SiEslogPeppolChannel],
    },
    EInvoiceIssueHandler,
  ],
  exports: [EInvoiceIssueHandler],
})
export class EInvoiceModule {}
