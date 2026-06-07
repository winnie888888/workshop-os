'use client';

/*
 * Portal API client. This is deliberately SEPARATE from the staff `lib/api.ts`
 * client for two reasons. First, the auth model is different: the portal carries
 * a customer SESSION token (obtained from a magic link), not an OIDC bearer plus
 * an X-Tenant-Id header — the tenant is baked into the session server-side, so
 * the client never sends it. Second, isolation: the portal session is stored
 * under its own key so a customer and a staff member can use the same browser
 * without their sessions colliding.
 *
 * In demo mode the client answers from the same fixtures the staff demo uses,
 * so the portal is explorable from the Viber link with no backend.
 */

import { DEMO_MODE } from './demo';
import { portalDemoRequest } from './portal-demo';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
const SESSION_KEY = 'wos.portal.session';

export interface PortalSession {
  sessionToken: string;
  tenantId: string;
  customerId: string;
  customerName: string;
}

export function getPortalSession(): PortalSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PortalSession) : null;
  } catch {
    return null;
  }
}

export function setPortalSession(s: PortalSession | null): void {
  if (typeof window === 'undefined') return;
  if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else window.localStorage.removeItem(SESSION_KEY);
}

export class PortalApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'PortalApiError';
  }
}

async function pRequest<T>(path: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  // Demo mode: never touch the network.
  if (DEMO_MODE) return portalDemoRequest<T>({ path, method: opts.method ?? 'GET', body: opts.body });

  const headers: Record<string, string> = { accept: 'application/json' };
  if (opts.auth !== false) {
    const s = getPortalSession();
    if (s) headers['authorization'] = `Bearer ${s.sessionToken}`;
  }
  if (opts.body !== undefined) headers['content-type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: 'omit',
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new PortalApiError(res.status, (data as any)?.message ?? `Request failed (${res.status})`);
  return data as T;
}

export const portalApi = {
  // --- public auth (no session) ---
  requestLink: (tenantId: string, contact: string, channel: 'sms' | 'email') =>
    pRequest<{ sent: boolean }>('/portal/auth/request-link', { method: 'POST', auth: false, body: { tenantId, contact, channel } }),
  verify: (token: string) =>
    pRequest<PortalSession>('/portal/auth/verify', { method: 'POST', auth: false, body: { token } }),

  // --- authenticated ---
  me: () => pRequest<any>('/portal/me'),
  logout: () => pRequest<void>('/portal/logout', { method: 'POST' }),
  vehicles: () => pRequest<any[]>('/portal/vehicles'),
  workOrders: (open?: boolean) => pRequest<any[]>(`/portal/work-orders${open ? '?open=1' : ''}`),
  workOrder: (id: string) => pRequest<any>(`/portal/work-orders/${id}`),
  serviceHistory: () => pRequest<any[]>('/portal/service-history'),
  invoices: () => pRequest<any[]>('/portal/invoices'),
  invoice: (id: string) => pRequest<any>(`/portal/invoices/${id}`),
  // The PDF is a direct link the browser downloads; we expose the URL builder.
  invoicePdfUrl: (id: string) => `${BASE}/portal/invoices/${id}/pdf`,
  documents: () => pRequest<any[]>('/portal/documents'),
  approvals: (pendingOnly?: boolean) => pRequest<any[]>(`/portal/approvals${pendingOnly ? '?pending=1' : ''}`),
  respond: (id: string, decision: 'approved' | 'declined', note?: string) =>
    pRequest<any>(`/portal/approvals/${id}/respond`, { method: 'POST', body: { decision, note } }),
  appointments: () => pRequest<any[]>('/portal/appointments'),
  requestAppointment: (body: { assetId?: string; preferredDate?: string; description?: string }) =>
    pRequest<any>('/portal/appointments', { method: 'POST', body }),
};
