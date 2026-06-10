import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../config/configuration';
import type { NotificationKind } from './notification.port';

/**
 * Resend e-mail sender (https://resend.com) over plain HTTPS — zero new
 * dependencies (Node 18+ global fetch). Chosen over SMTP for the first real
 * channel because it is one POST, EU-friendly, and keys are a single env var;
 * an SMTP adapter can join later behind the same routing without touching
 * business code.
 *
 * Honesty rule: this class only reports `configured=true` when RESEND_API_KEY
 * is present. The router falls back to the logging stub otherwise, so a dev
 * machine never silently "sends" anything — and never pretends to.
 */
@Injectable()
export class ResendEmailSender {
  private readonly log = new Logger('ResendEmail');

  constructor(private readonly config: AppConfig) {}

  get configured(): boolean {
    return this.config.resendApiKey.trim() !== '';
  }

  /** Subjects are operational and localised here; bodies come from callers. */
  private subjectFor(kind: NotificationKind): string {
    const map: Record<string, string> = {
      signup_verification: 'Potrdite svoj račun — A-SPRINT GARAGE',
      magic_link: 'Vaša prijava — A-SPRINT GARAGE',
      appointment_reminder: 'Opomnik: termin v delavnici',
      vehicle_ready: 'Vaše vozilo je pripravljeno',
      additional_work_approval: 'Potrebna potrditev dodatnih del',
      invoice_available: 'Na voljo je nov račun',
      payment_reminder: 'Opomnik za plačilo',
    };
    return map[kind] ?? 'Obvestilo — A-SPRINT GARAGE';
  }

  async send(to: string, kind: NotificationKind, body: string, link?: string): Promise<{ id: string | null; accepted: boolean }> {
    const text = link ? `${body}\n\n${link}` : body;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.emailFrom,
        to: [to],
        subject: this.subjectFor(kind),
        text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      // Throw so the outbox worker can retry/backoff — a failed send must not
      // be swallowed (no silent failure, same rule as everywhere else).
      throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
    }
    const json: any = await res.json().catch(() => ({}));
    this.log.log(`email -> ${to} (${kind}) accepted id=${json?.id ?? 'n/a'}`);
    return { id: json?.id ?? null, accepted: true };
  }
}
