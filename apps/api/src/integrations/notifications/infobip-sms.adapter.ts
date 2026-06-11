import { Injectable, Logger } from '@nestjs/common';
import type { NotificationKind } from './notification.port';

/**
 * Infobip SMS adapter (spec: Infobip prvi, kasneje Twilio/Telekom/A1 za istim
 * portom). En POST na /sms/2/text/advanced prek globalnega fetch — nič novih
 * odvisnosti, enako kot Resend za e-mail.
 *
 * Pravilo poštenosti (kot Resend): `configured` je true SAMO, ko sta
 * INFOBIP_BASE_URL in INFOBIP_API_KEY nastavljena; sicer routing pošlje na
 * logging stub in nič se ne pretvarja, da je bilo poslano.
 *
 * Konfiguracija namerno bere process.env neposredno: configuration.ts ni del
 * tega paketa sprememb; selitev v AppConfig ob naslednjem dotiku te datoteke
 * (zaveden backlog). Env: INFOBIP_BASE_URL (npr. https://xyz.api.infobip.com),
 * INFOBIP_API_KEY, INFOBIP_SENDER (privzeto 'ASPRINT' — registriran sender ID).
 */
@Injectable()
export class InfobipSmsAdapter {
  private readonly log = new Logger('InfobipSms');

  get configured(): boolean {
    return (process.env.INFOBIP_BASE_URL ?? '').trim() !== ''
      && (process.env.INFOBIP_API_KEY ?? '').trim() !== '';
  }

  async send(to: string, kind: NotificationKind, body: string, link?: string): Promise<{ id: string | null; accepted: boolean }> {
    const baseUrl = (process.env.INFOBIP_BASE_URL ?? '').trim().replace(/\/+$/, '');
    const apiKey = (process.env.INFOBIP_API_KEY ?? '').trim();
    const sender = (process.env.INFOBIP_SENDER ?? 'ASPRINT').trim();
    const text = link ? `${body}\n${link}` : body;

    const res = await fetch(`${baseUrl}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        Authorization: `App ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        messages: [{ from: sender, destinations: [{ to }], text }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      // Vrži, da outbox worker ponovi z backoffom — neuspelo pošiljanje se ne
      // sme pogoltniti (isto pravilo kot povsod: brez tihih napak).
      throw new Error(`Infobip ${res.status}: ${detail.slice(0, 300)}`);
    }
    const json: any = await res.json().catch(() => ({}));
    const id = json?.messages?.[0]?.messageId ?? null;
    this.log.log(`sms -> ${to} (${kind}) accepted id=${id ?? 'n/a'}`);
    return { id, accepted: true };
  }
}
