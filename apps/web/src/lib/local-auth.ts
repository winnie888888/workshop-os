'use client';

/**
 * Lastna prijava (Faza A) — tanek most med /public/* endpointi in OBSTOJEČO
 * sejo (lib/session.ts). Nič novega ne izumlja: zgradi točno tisto Session
 * obliko, ki jo api.ts in layouti že poznajo (Authorization + X-Tenant-Id),
 * zato vsa aplikacija dela nespremenjeno, ne glede na to, ali je žeton prišel
 * iz OIDC ali iz lokalne prijave.
 *
 * Žeton backend podpiše za 30 dni; tu si zapomnimo 29, da expiry preverjanje
 * (SessionPolicy) uporabnika preusmeri na prijavo, preden žeton zares poteče.
 */

import { setSession, type Membership, type Session } from './session';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
const TOKEN_TTL_MS = 29 * 24 * 60 * 60 * 1000;

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Strežnik ni dosegljiv. Preverite povezavo in poskusite znova.');
  }
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const m = Array.isArray(json?.message) ? json.message[0] : json?.message;
    throw new Error(typeof m === 'string' && m ? m : 'Zahteva ni uspela.');
  }
  return json as T;
}

function buildSession(
  accessToken: string,
  user: { id: string; name: string },
  memberships: Membership[],
  tenantId: string,
): Session {
  const roles = memberships.find((m) => m.tenantId === tenantId)?.roles ?? memberships[0]?.roles ?? [];
  const now = Date.now();
  return {
    accessToken,
    expiresAt: now + TOKEN_TTL_MS,
    sessionExpiresAt: now + TOKEN_TTL_MS,
    tenantId,
    memberships,
    user: { id: user.id, name: user.name, mechanicId: user.id, roles, locale: 'sl' },
  };
}

/** Korak 1: zahteva za registracijo. Strežnik VEDNO odgovori {ok} (enumeration zaščita). */
export async function signupLocal(email: string, password: string, workshopName: string): Promise<void> {
  await post('/public/signup', { email, password, workshopName });
}

/** Korak 2: potrditev e-maila → provisioning → takojšnja seja. */
export async function verifyLocal(token: string): Promise<Session> {
  const r = await post<{ accessToken: string; tenantId: string; user: { id: string; email: string; name: string } }>(
    '/public/verify', { token },
  );
  // Ime delavnice + vloge prek obstoječe login-time poti /auth/me.
  let memberships: Membership[] = [];
  try {
    const meRes = await fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${r.accessToken}` } });
    if (meRes.ok) {
      const me: any = await meRes.json().catch(() => ({}));
      memberships = (me?.memberships ?? []).map((m: any): Membership => ({
        tenantId: m.tenantId ?? m.tenant_id,
        tenantName: m.tenantName ?? m.tenant_name ?? 'Delavnica',
        roles: m.roles ?? [],
      }));
    }
  } catch { /* fallback spodaj */ }
  if (memberships.length === 0) {
    memberships = [{ tenantId: r.tenantId, tenantName: 'Moja delavnica', roles: ['owner'] }];
  }
  const s = buildSession(r.accessToken, r.user, memberships, r.tenantId);
  setSession(s);
  return s;
}

/** Prijava: pri enem članstvu takoj izbere tenant, pri več pokaže TenantPicker. */
export async function loginLocal(email: string, password: string): Promise<Session> {
  const r = await post<{
    accessToken: string;
    user: { id: string; email: string; name: string };
    memberships: Array<{ tenantId: string; tenantName: string; roles: string[] }>;
  }>('/public/login', { email, password });
  const memberships: Membership[] = (r.memberships ?? []).map((m) => ({
    tenantId: m.tenantId, tenantName: m.tenantName, roles: m.roles ?? [],
  }));
  const tenantId = memberships.length === 1 ? memberships[0].tenantId : '';
  const s = buildSession(r.accessToken, r.user, memberships, tenantId);
  setSession(s);
  return s;
}
