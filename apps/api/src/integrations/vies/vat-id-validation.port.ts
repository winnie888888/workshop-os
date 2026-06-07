/**
 * VAT-ID validation port (Phase 4C).
 *
 * Whether a customer's EU VAT id is genuine governs whether we may reverse-
 * charge their invoices, so this is a correctness-critical boundary. We model it
 * as a port with two realities behind it:
 *
 *   - VIES is the EU's official VAT-id checking service. When an endpoint is
 *     configured, the VIES adapter calls it and returns an authoritative yes/no
 *     (plus the registered name/address, useful for confirming identity).
 *   - When VIES is NOT configured or is unreachable, the port reports itself
 *     unavailable. The service then falls back to an AUDITED MANUAL confirmation
 *     — a human attests they verified the id, and that attestation is recorded
 *     on the hash-chain. Manual confirmation is a deliberate, accountable act,
 *     not a silent default.
 *
 * The domain depends only on this interface; the protocol details live in the
 * adapters and can change without touching customers or invoicing.
 */

export interface ViesCheckResult {
  /** True only if VIES affirmatively reports the id valid. */
  valid: boolean;
  /** Registered name as VIES knows it, when returned. */
  name: string | null;
  /** Registered address as VIES knows it, when returned. */
  address: string | null;
  /** The provider's consultation reference, for the audit trail, when present. */
  requestId: string | null;
}

export interface VatIdValidationPort {
  /** Is an authoritative (VIES) check available in this deployment? */
  readonly available: boolean;

  /**
   * Check a VAT id authoritatively. Implementations MUST throw if `available`
   * is false (callers should branch on `available` first), and may throw a
   * transient error if the upstream is momentarily down — the caller surfaces
   * that to the advisor, who can retry or fall back to manual confirmation.
   */
  check(country: string, number: string): Promise<ViesCheckResult>;
}

export const VAT_ID_VALIDATION_PORT = Symbol('VAT_ID_VALIDATION_PORT');
