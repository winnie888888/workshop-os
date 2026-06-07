'use client';

/**
 * Session — the single source of truth on the client for "who am I, which
 * tenant am I acting in, and is my token still good". After the OIDC login
 * flow (oidc.ts) it holds the real tokens and their expiry; the API client
 * consults ensureFreshToken() before every request so an expiring token is
 * refreshed proactively rather than failing a call.
 *
 * The lifecycle decisions (ok / refresh / reauthenticate) are made by the
 * shared SessionPolicy, which is unit-tested against clock-skew edge cases, so
 * the fiddly time maths lives in proven code rather than here.
 */

import * as SessionPolicy from '@workshop/shared/auth/session-policy';

export interface Membership {
  tenantId: string;
  tenantName: string;
  roles: string[];
}

export interface Session {
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms when the access token expires. */
  expiresAt: number;
  /** Epoch ms when the whole session hard-expires (optional). */
  sessionExpiresAt?: number;
  /** The tenant the user is currently acting in (chosen from memberships). */
  tenantId: string;
  /** All tenants the user may act in (from /auth/me). */
  memberships: Membership[];
  user: {
    id: string;
    name: string;
    /** Mechanic identity used for clock-on/off (the user id). */
    mechanicId: string;
    roles: string[];
    locale?: string;
  };
}

let current: Session | null = null;

export function setSession(session: Session | null): void {
  current = session;
  if (typeof window !== 'undefined') {
    if (session) window.localStorage.setItem('wos.session', JSON.stringify(session));
    else window.localStorage.removeItem('wos.session');
  }
}

export function getSession(): Session | null {
  if (current) return current;
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('wos.session');
    if (raw) {
      try { current = JSON.parse(raw) as Session; return current; } catch { /* ignore */ }
    }
  }
  return null;
}

export function requireSession(): Session {
  const s = getSession();
  if (!s) throw new Error('No active session');
  return s;
}

/** Switch the active tenant (and adopt that membership's roles). */
export function selectTenant(tenantId: string): void {
  const s = getSession();
  if (!s) return;
  const m = s.memberships.find((x) => x.tenantId === tenantId);
  if (!m) return;
  setSession({ ...s, tenantId, user: { ...s.user, roles: m.roles } });
}

export function hasPermissionRole(roles: string[]): boolean {
  const s = getSession();
  if (!s) return false;
  return roles.some((r) => s.user.roles.includes(r));
}

/**
 * Ensure the access token is usable for an imminent request. If the shared
 * policy says we should refresh, do so (rotating the refresh token if the IdP
 * issued a new one). If the session has hard-expired, clear it and signal that
 * the caller must re-authenticate. Returns the token to use, or null if the
 * user must log in again.
 */
let refreshing: Promise<string | null> | null = null;

export async function ensureFreshToken(now = Date.now()): Promise<string | null> {
  const s = getSession();
  if (!s) return null;

  const action = SessionPolicy.nextSessionAction(
    { accessTokenExpiresAt: s.expiresAt, sessionExpiresAt: s.sessionExpiresAt },
    now,
  );
  if (action === 'ok') return s.accessToken;
  if (action === 'reauthenticate' || !s.refreshToken) {
    setSession(null);
    return null;
  }

  // Coalesce concurrent refreshes so a burst of requests triggers one exchange.
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const { refreshTokens } = await import('./oidc');
        const tok = await refreshTokens(s.refreshToken!);
        setSession({
          ...s,
          accessToken: tok.accessToken,
          refreshToken: tok.refreshToken ?? s.refreshToken,
          expiresAt: tok.expiresAt,
        });
        return tok.accessToken;
      } catch {
        setSession(null);
        return null;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}
