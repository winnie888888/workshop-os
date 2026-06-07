/**
 * Session policy — the pure decisions that govern an access token's lifecycle
 * on the client: is it still valid, should it be refreshed proactively, and
 * when does the session as a whole expire. Keeping these as pure functions
 * means the genuinely error-prone part of "session management" (clock maths and
 * skew) is tested by execution rather than discovered in production.
 *
 * All times are epoch milliseconds. A small skew window guards against the
 * client clock running slightly ahead of the issuer's, which would otherwise
 * cause spurious "expired" decisions right at the boundary.
 */

export interface TokenState {
  /** Epoch ms when the access token expires (from the `exp` claim * 1000). */
  accessTokenExpiresAt: number;
  /** Epoch ms when the refresh token / session hard-expires, if known. */
  sessionExpiresAt?: number;
}

export const DEFAULT_SKEW_MS = 30_000;          // tolerate 30s of clock skew
export const DEFAULT_REFRESH_LEAD_MS = 120_000; // refresh 2 min before expiry

/** True if the access token is past its expiry (allowing for skew). */
export function isAccessTokenExpired(
  state: TokenState,
  now: number,
  skewMs = DEFAULT_SKEW_MS,
): boolean {
  return now >= state.accessTokenExpiresAt - skewMs;
}

/**
 * True if we should refresh now — either already expired, or inside the lead
 * window before expiry so a refresh completes before any request needs it.
 */
export function shouldRefresh(
  state: TokenState,
  now: number,
  leadMs = DEFAULT_REFRESH_LEAD_MS,
  skewMs = DEFAULT_SKEW_MS,
): boolean {
  if (isSessionExpired(state, now, skewMs)) return false; // nothing to refresh to
  return now >= state.accessTokenExpiresAt - leadMs;
}

/** True if the whole session has hard-expired and the user must log in again. */
export function isSessionExpired(
  state: TokenState,
  now: number,
  skewMs = DEFAULT_SKEW_MS,
): boolean {
  if (state.sessionExpiresAt === undefined) return false;
  return now >= state.sessionExpiresAt - skewMs;
}

/** Convert an OIDC `exp` claim (seconds) to the epoch-ms expiry we store. */
export function expiryFromExpClaim(expSeconds: number): number {
  return expSeconds * 1000;
}

/**
 * Decide the next action for a session at a given moment. This is the single
 * function the API client consults before every request.
 */
export type SessionAction = "ok" | "refresh" | "reauthenticate";

export function nextSessionAction(
  state: TokenState,
  now: number,
  opts: { leadMs?: number; skewMs?: number } = {},
): SessionAction {
  const skewMs = opts.skewMs ?? DEFAULT_SKEW_MS;
  const leadMs = opts.leadMs ?? DEFAULT_REFRESH_LEAD_MS;
  if (isSessionExpired(state, now, skewMs)) return "reauthenticate";
  if (isAccessTokenExpired(state, now, skewMs)) return "refresh";
  if (shouldRefresh(state, now, leadMs, skewMs)) return "refresh";
  return "ok";
}
