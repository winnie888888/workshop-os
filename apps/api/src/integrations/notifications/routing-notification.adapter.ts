import { Injectable, Logger } from '@nestjs/common';
import type { NotificationMessage, NotificationPort, NotificationSendResult } from './notification.port';
import { StubNotificationAdapter } from './stub-notification.adapter';
import { ResendEmailSender } from './resend-email.adapter';

/**
 * Routing adapter behind NOTIFICATION_PORT. The channel is a field, not a
 * branch in business code (port contract) — the branch lives HERE, once:
 *
 *   email          → Resend, when RESEND_API_KEY is configured; stub otherwise
 *   sms / whatsapp → stub (Infobip adapter slots in here later, same pattern)
 *
 * The fallback is the existing logging stub, so an unconfigured environment
 * keeps working end-to-end (magic links recoverable from the log) without
 * pretending anything was delivered.
 */
@Injectable()
export class RoutingNotificationAdapter implements NotificationPort {
  readonly provider = 'routing';
  private readonly log = new Logger('Notifications');

  constructor(
    private readonly stub: StubNotificationAdapter,
    private readonly resend: ResendEmailSender,
  ) {}

  async send(message: NotificationMessage): Promise<NotificationSendResult> {
    if (message.channel === 'email' && this.resend.configured) {
      const r = await this.resend.send(message.to, message.kind, message.body, message.link);
      return { providerMessageId: r.id, provider: 'resend', accepted: r.accepted };
    }
    if (message.channel === 'email') {
      this.log.warn('RESEND_API_KEY not set — email routed to log stub (dev mode).');
    }
    return this.stub.send(message);
  }
}
