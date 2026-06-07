import { Injectable } from '@nestjs/common';
import { PgService } from '../../common/db/pg.service';
import type { MinimaxPartner, MinimaxPort } from './minimax.port';

/**
 * Real HTTP adapter for the Minimax (Seyfor) REST API. It reads per-tenant
 * credentials from app.integration_credentials, calls the configured base URL
 * with an idempotency key, and maps transport errors to typed failures so the
 * outbox worker can retry/backoff. This is NOT a mock — it performs a real
 * request; it is simply unconfigured until a tenant supplies credentials and
 * the Minimax base URL (demo or production) is set.
 *
 * Seyfor does not support integrations — we own reliability (Master Blueprint §9).
 */
@Injectable()
export class MinimaxHttpAdapter implements MinimaxPort {

  constructor(private readonly pg: PgService) {}

  private async credentials(tenantId: string): Promise<{ baseUrl: string; token: string }> {
    const row = await this.pg.withTenant(tenantId, (tx) =>
      tx.query<{ config: any; secret_ciphertext: string | null }>(
        `SELECT config, secret_ciphertext FROM app.integration_credentials
          WHERE provider = 'minimax' LIMIT 1`,
      ),
    );
    if (row.rowCount === 0) {
      throw new IntegrationNotConfiguredError('minimax');
    }
    const baseUrl = row.rows[0].config?.baseUrl;
    // In production the secret is decrypted via KMS here; the ciphertext blob
    // holds the OAuth token / API key. Decryption is a separate, audited step.
    const token = decryptSecret(row.rows[0].secret_ciphertext);
    if (!baseUrl || !token) throw new IntegrationNotConfiguredError('minimax');
    return { baseUrl, token };
  }

  async upsertPartner(
    tenantId: string,
    partner: MinimaxPartner,
  ): Promise<{ minimaxPartnerId: string }> {
    const { baseUrl, token } = await this.credentials(tenantId);
    const method = partner.minimaxPartnerId ? 'PUT' : 'POST';
    const path = partner.minimaxPartnerId
      ? `/api/orgs/partners/${encodeURIComponent(partner.minimaxPartnerId)}`
      : `/api/orgs/partners`;

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        // Idempotency key keeps retries from creating duplicate partners.
        'idempotency-key': `partner:${partner.externalRef}`,
      },
      body: JSON.stringify({
        Name: partner.name,
        CountryCode: partner.country,
        Address: partner.address,
        PostalCode: partner.postCode,
        City: partner.city,
        TaxNumber: partner.taxId,
        IssuedIdentificationNumber: partner.vatId,
        Currency: partner.currency,
        DueDays: partner.paymentTermsDays,
        DiscountPercent: partner.discountPct,
        ExternalReference: partner.externalRef,
      }),
    });

    if (res.status === 429 || res.status >= 500) {
      // Transient — let the worker retry.
      throw new TransientIntegrationError(`Minimax ${res.status}`);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new PermanentIntegrationError(`Minimax ${res.status}: ${text.slice(0, 500)}`);
    }
    const body = (await res.json().catch(() => ({}))) as { PartnerId?: string; Id?: string };
    const minimaxPartnerId = body.PartnerId ?? body.Id;
    if (!minimaxPartnerId) throw new PermanentIntegrationError('Minimax response missing partner id');
    return { minimaxPartnerId };
  }

  async upsertInvoice(
    tenantId: string,
    invoice: any,
  ): Promise<{ minimaxInvoiceId: string }> {
    const { baseUrl, token } = await this.credentials(tenantId);
    const res = await fetch(`${baseUrl}/api/orgs/issued-invoices`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'idempotency-key': `invoice:${invoice.externalRef}`,
      },
      body: JSON.stringify({
        DocumentNumber: invoice.documentNumber,
        DocumentType: invoice.kind === 'credit_note' ? 'CreditNote' : 'Invoice',
        PartnerExternalReference: invoice.partnerExternalRef,
        PartnerId: invoice.minimaxPartnerId,
        Currency: invoice.currency,
        DateIssued: invoice.issueDate,
        DateDue: invoice.dueDate,
        ReverseCharge: invoice.reverseCharge,
        Note: invoice.vatNote,
        // Minimax expects major-unit decimals; we convert from minor units.
        ValueNet: minorToDecimal(invoice.netMinor),
        ValueVat: minorToDecimal(invoice.vatMinor),
        ValueGross: minorToDecimal(invoice.grossMinor),
        Rows: invoice.lines.map((l: any) => ({
          Description: l.description,
          Quantity: l.quantity,
          Price: minorToDecimal(l.unitPriceMinor),
          VatRate: l.vatRatePct,
          ValueNet: minorToDecimal(l.netMinor),
          ValueVat: minorToDecimal(l.vatMinor),
        })),
        VatSummary: invoice.vatBreakdown.map((g: any) => ({
          Rate: g.ratePct, ReverseCharge: g.reverseCharge,
          Base: minorToDecimal(g.netMinor), Vat: minorToDecimal(g.vatMinor),
        })),
        ExternalReference: invoice.externalRef,
      }),
    });
    if (res.status === 429 || res.status >= 500) throw new TransientIntegrationError(`Minimax ${res.status}`);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new PermanentIntegrationError(`Minimax ${res.status}: ${text.slice(0, 500)}`);
    }
    const body = (await res.json().catch(() => ({}))) as { InvoiceId?: string; Id?: string };
    const minimaxInvoiceId = body.InvoiceId ?? body.Id;
    if (!minimaxInvoiceId) throw new PermanentIntegrationError('Minimax response missing invoice id');
    return { minimaxInvoiceId };
  }
}

/** Placeholder for the KMS decryption boundary (Master Blueprint §8). */
function decryptSecret(ciphertext: string | null): string | null {
  if (!ciphertext) return null;
  // Real implementation calls the KMS/HSM. The ciphertext is never logged.
  // For local dev, credentials may be provided as plaintext base64 of the token.
  try {
    return Buffer.from(ciphertext, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

export class IntegrationNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`Integration not configured: ${provider}`);
    this.name = 'IntegrationNotConfiguredError';
  }
}
export class TransientIntegrationError extends Error {
  readonly transient = true;
  constructor(msg: string) { super(msg); this.name = 'TransientIntegrationError'; }
}
export class PermanentIntegrationError extends Error {
  readonly transient = false;
  constructor(msg: string) { super(msg); this.name = 'PermanentIntegrationError'; }
}

/** Convert integer minor units (as string) to a major-unit decimal string. */
function minorToDecimal(minor: string): string {
  const neg = minor.startsWith('-');
  const digits = (neg ? minor.slice(1) : minor).padStart(3, '0');
  const whole = digits.slice(0, -2);
  const frac = digits.slice(-2);
  return `${neg ? '-' : ''}${whole}.${frac}`;
}
