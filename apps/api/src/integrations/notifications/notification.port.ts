/**
 * Notification port (Customer Portal / Communication architecture).
 *
 * The communication design is explicit: do NOT hardcode a single SMS provider;
 * use a provider abstraction so the channel can change (Infobip first, then
 * Twilio, Telekom Slovenije, A1, …) and migrate from SMS to WhatsApp without
 * touching business logic. So the domain depends only on this interface; the
 * provider lives in an adapter. The same workflow carries SMS, WhatsApp and
 * email — the channel is a field, not a branch in the business code.
 *
 * Messages are OPERATIONAL only (appointment reminder, vehicle ready, additional
 * work approval, invoice available, payment reminder) — never marketing — which
 * is enforced by the small fixed set of message kinds.
 */

export type NotificationChannel = 'sms' | 'whatsapp' | 'email';

export type NotificationKind =
  | 'magic_link'          // portal sign-in link
  | 'appointment_reminder'
  | 'vehicle_ready'
  | 'additional_work_approval'
  | 'invoice_available'
  | 'payment_reminder';

export interface NotificationMessage {
  channel: NotificationChannel;
  /** E.164 phone for sms/whatsapp, or an email address for email. */
  to: string;
  kind: NotificationKind;
  /** Plain-text body (already localised by the caller). */
  body: string;
  /** Optional deep link the body refers to, kept separate for click tracking. */
  link?: string;
}

export interface NotificationSendResult {
  providerMessageId: string | null;
  provider: string;     // 'stub', 'infobip', …
  accepted: boolean;
}

export interface NotificationPort {
  readonly provider: string;
  send(message: NotificationMessage): Promise<NotificationSendResult>;
}

export const NOTIFICATION_PORT = Symbol('NOTIFICATION_PORT');
