import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../config/configuration';
import type { VatIdValidationPort, ViesCheckResult } from './vat-id-validation.port';

/**
 * Real VIES adapter. The EU exposes a JSON REST endpoint for VAT-id checking:
 *
 *   GET {base}/taxation_customs/vies/rest-api/ms/{COUNTRY}/vat/{NUMBER}
 *
 * which answers with { isValid, name, address, requestIdentifier, ... }. This
 * adapter is "available" only when an endpoint base is configured; otherwise the
 * module wires the unavailable adapter instead. Network calls cannot run in the
 * offline build, but this is the production path used once VIES_BASE_URL is set.
 */
@Injectable()
export class ViesRestAdapter implements VatIdValidationPort {
  constructor(private readonly config: AppConfig) {}

  get available(): boolean {
    return !!this.config.viesBaseUrl;
  }

  async check(country: string, number: string): Promise<ViesCheckResult> {
    if (!this.available) {
      // Defensive: callers branch on `available`, but never pretend to check.
      throw new Error('VIES validation is not configured in this deployment');
    }
    const base = this.config.viesBaseUrl.replace(/\/+$/, '');
    const url = `${base}/taxation_customs/vies/rest-api/ms/${encodeURIComponent(country)}/vat/${encodeURIComponent(number)}`;

    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) {
      // Treat upstream failure as transient; the service surfaces it so the
      // advisor can retry or fall back to an audited manual confirmation.
      throw new Error(`VIES upstream returned ${res.status}`);
    }
    const body = (await res.json()) as any;
    return {
      valid: body.isValid === true || body.valid === true,
      name: body.name ?? body.traderName ?? null,
      address: body.address ?? body.traderAddress ?? null,
      requestId: body.requestIdentifier ?? body.requestId ?? null,
    };
  }
}
