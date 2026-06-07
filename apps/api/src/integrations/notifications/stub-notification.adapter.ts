import { Injectable, Logger } from '@nestjs/common';
import type { NotificationMessage, NotificationPort, NotificationSendResult } from './notification.port';

/**
 * Stub notification adapter. Until a real provider (Infobip) is configured, this
 * "sends" by logging — which is exactly right for development and for the demo,
 * and means the rest of the portal (magic links, approval prompts) is fully
 * exercisable without a paid SMS account. Swapping in Infobip later is a new
 * adapter that implements the same NotificationPort; no business code changes.
 *
 * Crucially, even the stub records the message so a magic link is recoverable
 * from the server log during testing — there is no silent failure.
 */
@Injectable()
export class StubNotificationAdapter implements NotificationPort {
  readonly provider = 'stub';
  private readonly log = new Logger('Notifications');

  async send(message: NotificationMessage): Promise<NotificationSendResult> {
    this.log.log(
      `[${message.channel}] -> ${message.to} (${message.kind}): ${message.body}` +
      (message.link ? ` link=${message.link}` : ''),
    );
    return { providerMessageId: null, provider: this.provider, accepted: true };
  }
}
