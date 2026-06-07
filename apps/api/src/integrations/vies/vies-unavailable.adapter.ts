import { Injectable } from '@nestjs/common';
import type { VatIdValidationPort, ViesCheckResult } from './vat-id-validation.port';

/**
 * The "no VIES configured" adapter. It reports itself unavailable so the
 * customers service knows an authoritative check cannot be made and routes the
 * advisor to an audited manual confirmation instead. It deliberately throws if
 * anyone calls `check` despite `available` being false, so that an unvalidated
 * id can never be silently treated as VIES-checked.
 */
@Injectable()
export class ViesUnavailableAdapter implements VatIdValidationPort {
  readonly available = false;

  async check(): Promise<ViesCheckResult> {
    throw new Error('VIES validation is not available; use an audited manual confirmation');
  }
}
