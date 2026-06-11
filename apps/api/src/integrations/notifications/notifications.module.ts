import { Module } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_PORT } from './notification.port';
import type { NotificationPort } from './notification.port';
import { StubNotificationAdapter } from './stub-notification.adapter';
import { ResendEmailSender } from './resend-email.adapter';
import { InfobipSmsAdapter } from './infobip-sms.adapter';
import { RoutingNotificationAdapter } from './routing-notification.adapter';
import type { OutboxHandler, OutboxEvent } from '../../common/events/outbox-handler.interface';

/**
 * Outbox handler for 'notification.send'. The portal (and later the workshop
 * flows: vehicle-ready, invoice-available, payment-reminder) enqueue a
 * notification in the SAME transaction as the action that triggers it, so a
 * message is never sent for an action that rolled back, and a committed action
 * never silently fails to notify. The worker drains the event to this handler,
 * which calls whichever provider is wired behind the port.
 */
@Injectable()
export class NotificationSendHandler implements OutboxHandler {
  readonly eventType = 'notification.send';
  constructor(@Inject(NOTIFICATION_PORT) private readonly port: NotificationPort) {}

  async handle(event: OutboxEvent): Promise<void> {
    const msg = event.payload as any;
    await this.port.send({
      channel: msg.channel, to: msg.to, kind: msg.kind, body: msg.body, link: msg.link,
    });
  }
}

/**
 * Registers the notification provider behind the port. Today that is the stub
 * (log) adapter; wiring Infobip later means adding an InfobipAdapter and
 * selecting it here by config — nothing else in the system changes.
 *
 * The NotificationSendHandler is exported so a worker composition root can pick
 * it up into the OUTBOX_HANDLERS array (NestJS has no `multi: true`).
 */
@Module({
  providers: [
    StubNotificationAdapter,
    ResendEmailSender,
    InfobipSmsAdapter,
    RoutingNotificationAdapter,
    // Real channels route here; unconfigured channels honestly fall back to the
    // logging stub (see RoutingNotificationAdapter).
    { provide: NOTIFICATION_PORT, useExisting: RoutingNotificationAdapter },
    NotificationSendHandler,
  ],
  exports: [NOTIFICATION_PORT, NotificationSendHandler],
})
export class NotificationsModule {}
