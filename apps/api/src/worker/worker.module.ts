import { Module } from '@nestjs/common';
import { OUTBOX_HANDLERS } from '../common/events/outbox-handler.interface';
import { OutboxWorkerService } from '../common/outbox/outbox.worker';
import { RemindersSweepService } from './reminders.sweep';
import { NotificationsModule, NotificationSendHandler } from '../integrations/notifications/notifications.module';
import { MinimaxModule } from '../integrations/minimax/minimax.module';
import { MinimaxPartnerUpsertHandler } from '../integrations/minimax/minimax.partner-upsert.handler';
import { MinimaxInvoiceUpsertHandler } from '../integrations/minimax/minimax-invoice.handler';
import { EInvoiceModule } from '../integrations/einvoice/einvoice.module';
import { EInvoiceIssueHandler } from '../integrations/einvoice/einvoice.handler';

/**
 * Worker composition root (anticipated by the handler modules: "exported so a
 * worker composition root can pick it up into the OUTBOX_HANDLERS array").
 * NestJS has no `multi: true`, so the array is assembled exactly once, here.
 * Adding a future integration = export its handler + add one line below.
 */
@Module({
  imports: [NotificationsModule, MinimaxModule, EInvoiceModule],
  providers: [
    {
      provide: OUTBOX_HANDLERS,
      useFactory: (...handlers: unknown[]) => handlers,
      inject: [
        NotificationSendHandler,
        MinimaxPartnerUpsertHandler,
        MinimaxInvoiceUpsertHandler,
        EInvoiceIssueHandler,
      ],
    },
    OutboxWorkerService,
    RemindersSweepService, // Opomniki: zapadli računi -> 'overdue' + payment_reminder SMS (urni sweep)
  ],
})
export class WorkerModule {}
