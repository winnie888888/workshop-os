/**
 * Demo mode (mobile-shareable demo, not production).
 *
 * When NEXT_PUBLIC_DEMO is set at build time, the whole app runs without a
 * backend and without login: a ready-made session is planted in localStorage so
 * every screen behaves as a signed-in A-SPRINT owner, and the API client answers
 * from in-memory fixtures instead of the network (see demo-data.ts and the demo
 * branch in api.ts). This is what lets a stranger open the Vercel link on a phone
 * and use the app with zero setup. It changes nothing about the production build,
 * which leaves NEXT_PUBLIC_DEMO unset and uses real OIDC + the real API.
 */

import { setSession, getSession, type Session } from './session';

// A single flag drives all demo behaviour. Vercel sets NEXT_PUBLIC_DEMO=1.
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO === '1';

// Local dev-login: plant a seed-owner session but hit the REAL API (not demo
// fixtures). Pair with DEV_AUTH=1 on the backend. Off in production.
export const DEV_AUTH = process.env.NEXT_PUBLIC_DEV_AUTH === '1';

// The seeded A-SPRINT tenant + owner, matching db/seed/0001_seed_tenant.sql so
// the demo identity is the same one the rest of the system knows.
const DEMO_TENANT_ID = '00000000-0000-0000-0000-0000000a5b71';
const DEMO_OWNER_ID = '00000000-0000-0000-0000-0000000a5001';

/**
 * Build the demo session. The token is a harmless placeholder (no real backend
 * ever validates it in demo mode) and the expiry is set far in the future so the
 * refresh path is never triggered. The owner carries every role so all three
 * interfaces (advisor, mechanic, owner) are explorable from one link.
 */
function demoSession(): Session {
  const farFuture = Date.now() + 365 * 24 * 60 * 60 * 1000; // a year out
  return {
    accessToken: 'demo-access-token',
    expiresAt: farFuture,
    sessionExpiresAt: farFuture,
    tenantId: DEMO_TENANT_ID,
    memberships: [
      { tenantId: DEMO_TENANT_ID, tenantName: 'A-SPRINT d.o.o.', roles: ['owner', 'admin', 'advisor', 'mechanic'] },
    ],
    user: {
      id: DEMO_OWNER_ID,
      name: 'A-SPRINT Demo',
      // Matches demo-data MECHANIC_ID (Marko Kovač) so the mechanic console shows
      // this account's assigned, in-progress job with its running clock — a richer,
      // unmistakably-working demo rather than an empty job list.
      mechanicId: '00000000-0000-0000-0000-0000000a5002',
      roles: ['owner', 'admin', 'advisor', 'mechanic'],
      locale: 'sl',
    },
  };
}

/**
 * Plant the demo session if one is not already present. Safe to call on every
 * load; it only writes when needed, so the user's tenant choice (if they switch)
 * survives a re-render. No-op when demo mode is off or when run on the server.
 */
export function ensureDemoSession(): void {
  if (!DEMO_MODE) return;
  if (typeof window === 'undefined') return;
  if (getSession()) return;
  setSession(demoSession());
}

/**
 * Plant a local dev session (seed A-SPRINT owner) and return it. Unlike demo
 * mode, this does NOT route the API client to fixtures — requests go to the real
 * backend, which must run with DEV_AUTH=1. For local development only.
 */
export function planDevSession(): Session {
  const s = demoSession();
  setSession(s);
  return s;
}
