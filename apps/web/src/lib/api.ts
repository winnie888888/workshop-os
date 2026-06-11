/**
 * API client — the single, typed boundary between the frontend and the NestJS
 * backend built in Phases 1–3. Every method here corresponds to a real route,
 * and every payload field name matches the backend DTO exactly, so the screens
 * are genuinely connected rather than calling invented endpoints.
 *
 * Auth model (from the auth-tenant middleware): every request carries a Bearer
 * access token AND an `X-Tenant-Id` header naming the active tenant; the server
 * resolves the membership and binds the tenant for row-level security. The token
 * and tenant come from the session (see session.ts), not from each call site.
 */

import { getSession, ensureFreshToken } from './session';
import { DEMO_MODE } from './demo';
import { demoRequest } from './demo-api';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: { title?: string; detail?: string; type?: string } | null,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Idempotency / request-id passthrough for safe retries. */
  requestId?: string;
  signal?: AbortSignal;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  // Demo mode: resolve from in-memory fixtures, never touch the network. This
  // is what lets the Vercel link work on a phone with no backend and no login.
  if (DEMO_MODE) {
    return demoRequest<T>({ path, method: opts.method ?? 'GET', body: opts.body });
  }
  const session = getSession();
  const headers: Record<string, string> = {
    accept: 'application/json',
  };
  if (session) {
    // Refresh proactively if the access token is at/near expiry (tested policy),
    // so a long-lived screen never fails a call on a stale token.
    const token = await ensureFreshToken();
    headers['authorization'] = `Bearer ${token ?? session.accessToken}`;
    headers['x-tenant-id'] = session.tenantId;
  }
  if (opts.requestId) headers['x-request-id'] = opts.requestId;
  if (opts.body !== undefined) headers['content-type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
    // The API is a separate origin; never send cookies, only the bearer token.
    credentials: 'omit',
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const parsed = text ? safeParse(text) : null;

  if (!res.ok) {
    // The backend emits RFC 9457 problem+json from its exception filter.
    const problem = (parsed as any) ?? null;
    const message = problem?.detail || problem?.title || `Request failed (${res.status})`;
    throw new ApiError(res.status, problem, message);
  }
  return parsed as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* ----------------------------------------------------------------------------
 * Domain types — mirrors of the backend response shapes the screens consume.
 * Money is always minor units as a string (bigint-safe over the wire).
 * -------------------------------------------------------------------------- */

export type WorkOrderStatus =
  | 'draft' | 'open' | 'in_progress' | 'awaiting_approval'
  | 'awaiting_parts' | 'on_hold' | 'ready' | 'invoiced' | 'closed' | 'cancelled';

export type LineType = 'labour' | 'part' | 'sublet' | 'kit' | 'fee' | 'core' | 'discount';

export interface WorkOrderHeader {
  id: string; number: string | null; status: WorkOrderStatus;
  customerId: string; assetId: string | null; fleetId: string | null;
  locationId: string | null; complaint: string | null; diagnosis: string | null;
  odometer: number | null; currency: string; customerPo: string | null;
  totalNetMinor: string; totalVatMinor: string; totalGrossMinor: string; version: number;
}

export interface WorkOrderLine {
  id: string; lineNo: number; type: LineType; description: string;
  inventoryItemId: string | null; reservedLocationId: string | null;
  quantity: string; unitPriceMinor: string; discountPct: string; vatRatePct: string;
  netMinor: string; vatMinor: string; grossMinor: string; issued: boolean;
}

export interface TimeEntry {
  id: string; mechanicId: string; startedAt: string; endedAt: string | null;
  durationSeconds: number | null; costMinor: string | null;
}

export interface WorkOrderListItem {
  id: string; number: string | null; status: WorkOrderStatus; currency: string;
  locationId: string | null; complaint: string | null; totalGrossMinor: string;
  customerName: string | null; plate: string | null; plateCountry: string | null;
  makeModel: string | null; hasOpenClock: boolean; clockedForMe: boolean;
  assignedMechanicId: string | null;
}

export interface WorkOrderDetail extends WorkOrderHeader {
  lines: WorkOrderLine[];
  timeEntries: TimeEntry[];
}

export interface InvoiceDetail {
  id: string; kind: string; number: string | null; status: string;
  customerId: string; currency: string; vatTreatment: string | null;
  reverseCharge: boolean; vatNote: string | null;
  totalNetMinor: string; totalVatMinor: string; totalGrossMinor: string; paidMinor: string;
  issueDate: string | null; dueDate: string | null;
  serviceDate?: string | null; deliveryDate?: string | null;
  lines: Array<Record<string, unknown>>;
  vatBreakdown: Array<{ rate_pct: string; reverse_charge: boolean; net_minor: string; vat_minor: string }>;
}

export interface LabourInsight {
  workOrder: { id: string; number: string | null; status: string };
  hours: { actual: number; standard: number; billed: number };
  efficiency: number | null;
  profitability: {
    labourCost: string; billedRevenue: string; margin: string; marginPct: number | null;
    labourCostMinor: string; marginMinor: string;
  };
  flags: Array<{ kind: string; severity: 'info' | 'warn' | 'alert'; detail: string }>;
  narrative?: { summary: string; priority: string } | null;
}

export interface VatReport {
  from: string; to: string; totalNetMinor: string; totalVatMinor: string;
  groups: Array<{ ratePct: string; reverseCharge: boolean; net: string; vat: string }>;
}

export interface ArAging {
  asOf: string;
  buckets: { current: string; d1_30: string; d31_60: string; d61_90: string; d90_plus: string; total: string };
  formatted: { current: string; d1_30: string; d31_60: string; d61_90: string; d90_plus: string; total: string };
}

/** A full snapshot of the tenant's data — the basis of the Export feature. */
export interface DataSnapshot {
  exportedAt: string;
  tenant: string;
  data: Record<string, any[]>;
}

export interface RevenueReport {
  from: string; to: string; documents: number;
  netMinor: string; vatMinor: string; grossMinor: string; net: string; gross: string;
}

/* ----------------------------------------------------------------------------
 * Endpoint methods — one per real route.
 * -------------------------------------------------------------------------- */

export interface TenantProfile {
  id: string; name: string; country: string; vatId: string | null;
  iban: string | null; bankName: string | null;
  address: string | null; postCode: string | null; city: string | null;
  phone: string | null; fax: string | null; email: string | null; website: string | null;
  bic: string | null; iban2: string | null; bic2: string | null;
  registrationNote: string | null;
}

export const api = {
  workOrders: {
    list: (params: { statuses?: string[]; assignedMechanicId?: string; clockedMechanicId?: string; customerId?: string; limit?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.statuses?.length) q.set('statuses', params.statuses.join(','));
      if (params.assignedMechanicId) q.set('assignedMechanicId', params.assignedMechanicId);
      if (params.clockedMechanicId) q.set('clockedMechanicId', params.clockedMechanicId);
      if (params.customerId) q.set('customerId', params.customerId);
      if (params.limit) q.set('limit', String(params.limit));
      const qs = q.toString();
      return request<WorkOrderListItem[]>(`/work-orders${qs ? `?${qs}` : ''}`);
    },

    get: (id: string, signal?: AbortSignal) =>
      request<WorkOrderDetail>(`/work-orders/${id}`, { signal }),

    nalog: (id: string) => request<unknown>(`/work-orders/${id}/nalog`),

    create: (dto: {
      customerId: string; assetId?: string; fleetId?: string; locationId?: string;
      complaint?: string; odometer?: number; customerPo?: string; currency?: string; clientId?: string;
    }) => request<WorkOrderHeader>(`/work-orders`, { method: 'POST', body: dto, requestId: dto.clientId }),

    addLine: (id: string, dto: {
      lineId?: string; type: LineType; description: string;
      inventoryItemId?: string; locationId?: string; quantity: string;
      unitPriceMinor: number; discountPct?: string; vatRatePct?: string;
    }) => request<{ workOrder: WorkOrderHeader; lineId: string }>(
      `/work-orders/${id}/lines`, { method: 'POST', body: dto }),

    issueLine: (id: string, lineId: string) =>
      request<{ ok: boolean }>(`/work-orders/${id}/lines/${lineId}/issue`, { method: 'POST' }),

    transition: (id: string, to: WorkOrderStatus) =>
      request<WorkOrderHeader>(`/work-orders/${id}/transition`, { method: 'POST', body: { to } }),

    // Phase 4B: assign or clear the responsible mechanic (mechanicId null clears).
    assign: (id: string, mechanicId: string | null) =>
      request<WorkOrderHeader>(`/work-orders/${id}/assign`, { method: 'POST', body: { mechanicId: mechanicId ?? undefined } }),

    // Phase 4B: the tenant's assignable mechanics.
    mechanics: () => request<Array<{ id: string; name: string }>>(`/work-orders/mechanics`),
    addTime: (id: string, body: { mechanicId: string; date: string; hours?: string; from?: string; to?: string }) =>
      request<{ timeEntryId: string; durationSeconds: number }>(`/work-orders/${id}/time`, { method: 'POST', body }),

    // Phase 4B: edit a line (re-priced server-side by the shared core).
    updateLine: (id: string, lineId: string, dto: {
      description?: string; quantity?: string; unitPriceMinor?: number; discountPct?: string; vatRatePct?: string;
    }) => request<{ workOrder: WorkOrderHeader; lineId: string }>(
      `/work-orders/${id}/lines/${lineId}`, { method: 'PATCH', body: dto }),

    // Phase 4B: remove a line (releases any reserved stock).
    removeLine: (id: string, lineId: string) =>
      request<{ workOrder: WorkOrderHeader; removedLineId: string }>(
        `/work-orders/${id}/lines/${lineId}`, { method: 'DELETE' }),

    clockOn: (id: string, mechanicId: string) =>
      request<{ timeEntryId: string; startedAt: string; idempotentReplay?: boolean }>(
        `/work-orders/${id}/clock-on`, { method: 'POST', body: { mechanicId } }),

    clockOff: (id: string, mechanicId: string) =>
      request<{ timeEntryId: string | null; durationSeconds: number; costMinor?: string }>(
        `/work-orders/${id}/clock-off`, { method: 'POST', body: { mechanicId } }),
  },

  customers: {
    get: (id: string) => request<any>(`/customers/${id}`),
    // The list endpoint returns a paginated envelope {items, nextCursor}. The
    // previous client read it as a bare array (a latent bug); we unwrap items.
    list: async () => {
      const res = await request<{ items: any[]; nextCursor: unknown }>(`/customers?limit=1000`);
      return res.items ?? [];
    },
    create: (dto: Record<string, unknown>) => request<any>(`/customers`, { method: 'POST', body: dto }),
    // Server-side search + keyset pagination for the register screen. Returns
    // the {items, nextCursor} envelope verbatim so the page can load more.
    search: (p: { q?: string; limit?: number; afterName?: string; afterId?: string } = {}) => {
      const s = new URLSearchParams();
      s.set('limit', String(p.limit ?? 50));
      if (p.q) s.set('q', p.q);
      if (p.afterName !== undefined && p.afterId !== undefined) { s.set('afterName', p.afterName); s.set('afterId', p.afterId); }
      return request<{ items: any[]; nextCursor: { afterName: string; afterId: string } | null }>(`/customers?${s.toString()}`);
    },
    // Phase 4B: edit an existing customer.
    update: (id: string, dto: Record<string, unknown>) =>
      request<any>(`/customers/${id}`, { method: 'PATCH', body: dto }),
    // Phase 4C: validate the VAT id (VIES or audited manual confirmation).
    validateVat: (id: string, body: { mode: 'vies' | 'manual'; note?: string }) =>
      request<{ validated: boolean; source: 'vies' | 'manual'; viesName?: string | null; reason?: string }>(
        `/customers/${id}/validate-vat`, { method: 'POST', body }),
    // Pre-creation company lookup: a VAT id (EU → VIES) or SI registration number
    // (→ AJPES/Bizi) resolves to registry data that auto-fills the new-customer
    // form, so the advisor types one identifier instead of the whole company.
    lookup: (params: { vat?: string; regNo?: string; country?: string }) => {
      const q = new URLSearchParams();
      if (params.vat) q.set('vat', params.vat);
      if (params.regNo) q.set('regNo', params.regNo);
      if (params.country) q.set('country', params.country);
      return request<any>(`/customers/lookup?${q.toString()}`);
    },
  },

  assets: {
    get: (id: string) => request<any>(`/assets/${id}`),
    history: (id: string) => request<any>(`/assets/${id}/history`),
    // Vehicles are listed PER CUSTOMER (the backend requires customerId). The
    // previous client called /assets with no customer, which returned nothing.
    list: (customerId: string) => request<any[]>(`/assets?customerId=${encodeURIComponent(customerId)}`),
    create: (dto: Record<string, unknown>) => request<any>(`/assets`, { method: 'POST', body: dto }),
    // Phase 4B: edit a vehicle's descriptive fields.
    update: (id: string, dto: Record<string, unknown>) =>
      request<any>(`/assets/${id}`, { method: 'PATCH', body: dto }),
  },

  inventory: {
    stock: (itemId: string) =>
      request<Array<{ itemId: string; locationId: string; onHand: number; reserved: number; available: number }>>(
        `/inventory/items/${itemId}/stock`),
    // Warehouse 5.1: catalogue search for the advisor parts picker. Matches on
    // name/SKU/OEM server-side; returns priced catalogue items.
    search: (q: string) =>
      request<Array<{ id: string; name: string; sku: string | null; oemRef: string | null;
        priceMinor: string; vatRatePct: string; unit: string }>>(
        `/inventory/items?q=${encodeURIComponent(q)}`),
    get: (id: string) => request<any>(`/inventory/items/${id}`),
    quickAdd: () =>
      request<Array<{ id: string; name: string; sku: string | null; oemRef: string | null; priceMinor: string; vatRatePct: string; unit: string }>>(
        `/inventory/quick-add`),
    create: (dto: Record<string, any>) =>
      request<any>(`/inventory/items`, { method: 'POST', body: dto }),
    update: (id: string, patch: Record<string, any>) =>
      request<any>(`/inventory/items/${id}`, { method: 'PATCH', body: patch }),
    receive: (dto: { itemId: string; locationId?: string; quantity: number; reason?: string; batchNo?: string; expiry?: string; costMinor?: number }) =>
      request<any>(`/inventory/receive`, { method: 'POST', body: dto }),
  },

  presets: {
    list: () => request<any[]>(`/presets`),
    get: (id: string) => request<any>(`/presets/${id}`),
    create: (dto: Record<string, any>) => request<any>(`/presets`, { method: 'POST', body: dto }),
    update: (id: string, patch: Record<string, any>) => request<any>(`/presets/${id}`, { method: 'PATCH', body: patch }),
    remove: (id: string) => request<any>(`/presets/${id}`, { method: 'DELETE' }),
  },

  estimates: {
    list: (q: { customerId?: string } = {}) =>
      request<any[]>(`/estimates${q.customerId ? `?customerId=${encodeURIComponent(q.customerId)}` : ''}`),
    get: (id: string) => request<any>(`/estimates/${id}`),
    create: (dto: Record<string, any>) => request<any>(`/estimates`, { method: 'POST', body: dto }),
    update: (id: string, patch: Record<string, any>) => request<any>(`/estimates/${id}`, { method: 'PATCH', body: patch }),
    setStatus: (id: string, status: string) => request<any>(`/estimates/${id}/status`, { method: 'POST', body: { status } }),
    toInvoice: (id: string) => request<any>(`/estimates/${id}/to-invoice`, { method: 'POST' }),
  },

  appointments: {
    list: (q: { customerId?: string } = {}) =>
      request<any[]>(`/appointments${q.customerId ? `?customerId=${encodeURIComponent(q.customerId)}` : ''}`),
    get: (id: string) => request<any>(`/appointments/${id}`),
    create: (dto: Record<string, any>) => request<any>(`/appointments`, { method: 'POST', body: dto }),
    update: (id: string, patch: Record<string, any>) => request<any>(`/appointments/${id}`, { method: 'PATCH', body: patch }),
    remove: (id: string) => request<any>(`/appointments/${id}`, { method: 'DELETE' }),
  },

  invoices: {
    get: (id: string) => request<InvoiceDetail>(`/invoices/${id}`),
    sync: (id: string) =>
      request<Array<{ id: string; eventType: string; status: 'pending' | 'processing' | 'done' | 'dead'; attempts: number; lastError?: string; nextAttemptAt: string; updatedAt: string }>>(`/invoices/${id}/sync`),
    retrySync: (id: string) => request<{ ok: boolean; requeued: number }>(`/invoices/${id}/sync/retry`, { method: 'POST' }),
    byCustomer: (customerId: string) =>
      request<Array<{ id: string; number: string | null; status: string; currency: string; totalGrossMinor: string; issueDate: string | null; dueDate: string | null }>>(
        `/invoices?customerId=${encodeURIComponent(customerId)}`),
    issue: (dto: { workOrderId: string; dueDays?: number; issueDate?: string }) =>
      request<InvoiceDetail>(`/invoices/issue`, { method: 'POST', body: dto }),
    creditNote: (dto: { invoiceId: string; reason: string }) =>
      request<InvoiceDetail>(`/invoices/credit-note`, { method: 'POST', body: dto }),
    recordPayment: (dto: {
      customerId: string; amountMinor: number; method: 'bank' | 'cash' | 'card' | 'other';
      receivedAt: string; reference?: string;
    }) => request<any>(`/invoices/payments`, { method: 'POST', body: dto }),
  },

  reports: {
    vat: (from: string, to: string) => request<VatReport>(`/reports/vat?from=${from}&to=${to}`),
    arAging: (asOf?: string) => request<ArAging>(`/reports/ar-aging${asOf ? `?asOf=${asOf}` : ''}`),
    revenue: (from: string, to: string) => request<RevenueReport>(`/reports/revenue?from=${from}&to=${to}`),
    workOrderLabour: (id: string) => request<LabourInsight>(`/reports/work-orders/${id}/labour`),
    workOrderInsights: (id: string) => request<LabourInsight>(`/reports/work-orders/${id}/insights`),
  },

  sync: {
    pull: (since?: string, limit = 200) =>
      request<{ changes: any[]; nextCursor: string }>(
        `/sync/changes?${since ? `since=${since}&` : ''}limit=${limit}`),
    replay: (mutations: Array<{ type: string; deviceId: string; idempotencyKey: string; payload: any }>) =>
      request<Array<{ idempotencyKey: string; result: any }>>(
        `/sync/mutations`, { method: 'POST', body: { mutations } }),
  },

  // ---- Phase 4A endpoint families ----------------------------------------

  auth: {
    /** Public: client config to bootstrap the PKCE login (no auth header). */
    config: () => request<{ issuer: string; discoveryUrl: string; clientId: string; scopes: string; redirectUri: string }>(`/auth/config`),
    /** Who am I + which tenants I can act in (tenant-less). */
    me: () => request<{
      user: { id: string; email: string; name: string; locale: string; phone: string | null; hasAvatar: boolean };
      memberships: Array<{ tenantId: string; tenantName: string; roles: string[] }>;
    }>(`/auth/me`),
    heartbeat: (body: { deviceId?: string; userAgent?: string; ipHint?: string; expiresAt?: string }) =>
      request<any[]>(`/auth/session/heartbeat`, { method: 'POST', body }),
    sessions: () => request<any[]>(`/auth/sessions`),
    logout: (body: { sessionId?: string; deviceId?: string } = {}) =>
      request<{ ok: boolean }>(`/auth/logout`, { method: 'POST', body }),
  },

  me: {
    profile: () => request<any>(`/me/profile`),
    updateProfile: (body: Partial<Omit<TenantProfile, 'id' | 'name' | 'country' | 'vatId'>> & Record<string, unknown>) =>
      request<any>(`/me/profile`, { method: 'PATCH', body }),
  },

  // Phase 8: plate recognition. recognize() reads + matches + detects open work
  // orders (no mutation); confirmExisting/confirmNew are the human-confirmed
  // actions that open or create a work order through the existing workflow.
  plate: {
    recognize: (attachmentId: string) =>
      request<any>(`/plate-recognition/recognize`, { method: 'POST', body: { attachmentId } }),
    confirmExisting: (body: { workOrderId: string; assetId: string }) =>
      request<{ workOrderId: string; number: string | null; status: string; created: boolean }>(
        `/plate-recognition/confirm/existing`, { method: 'POST', body }),
    confirmNew: (body: { customerId: string; assetId: string; complaint?: string; odometer?: number; clientId?: string }) =>
      request<{ workOrderId: string; number: string | null; status: string; created: boolean }>(
        `/plate-recognition/confirm/new`, { method: 'POST', body }),
  },

  // Phase 9: Employee Time & Attendance. Self-service actions (clock yourself,
  // your own leave/travel/timesheet) need no special permission; the admin group
  // mirrors the gated management endpoints.
  // Phase 11: AI Workshop Manager — advisory insights. All GET, read-only; the
  // manager never mutates a record, so there are no write methods here.
  manager: {
    dashboard: (windowDays = 30) => request<any>(`/manager/dashboard?windowDays=${windowDays}`),
    daily: () => request<any>(`/manager/daily`),
    weekly: () => request<any>(`/manager/weekly`),
  },

  // Phase 12: vehicle rental management. The desk workflow — fleet, reservations,
  // contracts, handover/return, and invoicing through the existing engine.
  rental: {
    createVehicle: (body: any) => request<any>(`/rental/vehicles`, { method: 'POST', body }),
    listVehicles: () => request<any[]>(`/rental/vehicles`),
    reserve: (body: { rentalVehicleId: string; customerId: string; startAt: string; endAt: string; pickupLocation?: string; returnLocation?: string }) =>
      request<any>(`/rental/reservations`, { method: 'POST', body }),
    calendar: (from: string, to: string) => request<any[]>(`/rental/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    createContract: (body: { reservationId: string; casco?: boolean; fuelPolicy?: string; mileagePolicy?: string; latePolicy?: string }) =>
      request<any>(`/rental/contracts`, { method: 'POST', body }),
    getContract: (id: string) => request<any>(`/rental/contracts/${id}`),
    handover: (id: string, body: { startMileageKm: number; startFuelEighths: number; signatureAttachmentId?: string }) =>
      request<any>(`/rental/contracts/${id}/handover`, { method: 'POST', body }),
    returnVehicle: (id: string, body: any) => request<any>(`/rental/contracts/${id}/return`, { method: 'POST', body }),
    generateInvoice: (id: string) => request<any>(`/rental/contracts/${id}/invoice`, { method: 'POST', body: {} }),
    contractPdfUrl: (id: string) => `/api/rental/contracts/${id}/pdf`,
  },

  attendance: {
    clockIn: () => request<any>(`/attendance/clock-in`, { method: 'POST', body: {} }),
    clockOut: () => request<any>(`/attendance/clock-out`, { method: 'POST', body: {} }),
    startBreak: () => request<any>(`/attendance/break/start`, { method: 'POST', body: {} }),
    endBreak: () => request<any>(`/attendance/break/end`, { method: 'POST', body: {} }),
    current: () => request<any>(`/attendance/current`),
    requestLeave: (body: { leaveType: string; startDate: string; endDate: string; hoursPerDay?: number; reason?: string }) =>
      request<any>(`/attendance/leave`, { method: 'POST', body }),
    myLeave: (status?: string) => request<any[]>(`/attendance/leave/mine${status ? `?status=${status}` : ''}`),
    myVehicle: () => request<any>(`/attendance/vehicle/mine`),
    createTravelOrder: (body: any) => request<any>(`/attendance/travel-orders`, { method: 'POST', body }),
    startTravelOrder: (id: string) => request<any>(`/attendance/travel-orders/${id}/start`, { method: 'POST', body: {} }),
    finishTravelOrder: (id: string, body: any) => request<any>(`/attendance/travel-orders/${id}/finish`, { method: 'POST', body }),
    myTravelOrders: () => request<any[]>(`/attendance/travel-orders/mine`),
    recordFieldService: (body: any) => request<any>(`/attendance/field-service`, { method: 'POST', body }),
    myTimesheet: (userId: string, month: string) => request<any>(`/attendance/timesheet/mine?userId=${userId}&month=${month}`),
  },
  attendanceAdmin: {
    correctDay: (id: string, body: { clockInAt?: string | null; clockOutAt?: string | null; note: string }) =>
      request<any>(`/attendance-admin/days/${id}/correct`, { method: 'POST', body }),
    pendingLeave: () => request<any[]>(`/attendance-admin/leave/pending`),
    decideLeave: (id: string, body: { decision: 'approved' | 'rejected'; note?: string }) =>
      request<any>(`/attendance-admin/leave/${id}/decide`, { method: 'POST', body }),
    listVehicles: () => request<any[]>(`/attendance-admin/service-vehicles`),
    createVehicle: (body: any) => request<any>(`/attendance-admin/service-vehicles`, { method: 'POST', body }),
    assignVehicle: (id: string, userId: string | null) =>
      request<any>(`/attendance-admin/service-vehicles/${id}/assign`, { method: 'POST', body: { userId } }),
    timesheet: (userId: string, month: string) => request<any>(`/attendance-admin/timesheet?userId=${userId}&month=${month}`),
    exportUrl: (userId: string, month: string) => `/attendance-admin/export?userId=${userId}&month=${month}`,
    consistency: (userId: string, from: string, to: string) =>
      request<any>(`/attendance-admin/consistency?userId=${userId}&from=${from}&to=${to}`),
  },

  // Phase 10: voice work orders. draft() transcribes + extracts + resolves (no
  // mutation); confirmCreate/confirmUpdate are the human-confirmed actions that
  // create or append to a work order through the existing workflow.
  voice: {
    draft: (attachmentId: string, languageHint?: string) =>
      request<any>(`/voice-work-orders/draft`, { method: 'POST', body: { attachmentId, languageHint } }),
    confirmCreate: (body: {
      customerId: string; assetId?: string; complaint?: string; odometerKm?: number;
      lines?: Array<{ type: 'labour' | 'part' | 'fee'; description: string }>; clientId?: string;
    }) => request<{ workOrderId: string; number: string | null; status: string; created: boolean; addedLines: number }>(
      `/voice-work-orders/confirm/create`, { method: 'POST', body }),
    confirmUpdate: (body: { workOrderId: string; lines: Array<{ type: 'labour' | 'part' | 'fee'; description: string }> }) =>
      request<{ workOrderId: string; updated: boolean; addedLines: number }>(
        `/voice-work-orders/confirm/update`, { method: 'POST', body }),
  },

  attachments: {
    presign: (body: { workOrderId?: string; kind: 'photo' | 'voice_note' | 'document'; filename: string; contentType: string; byteSize: number }) =>
      request<{ attachmentId: string; storageKey: string; upload: { url: string; method: 'PUT'; headers: Record<string, string>; expiresAt: number } }>(
        `/attachments/presign`, { method: 'POST', body }),
    complete: (id: string, body: { checksumSha256?: string; transcript?: string } = {}) =>
      request<any>(`/attachments/${id}/complete`, { method: 'POST', body }),
    url: (id: string) => request<{ url: string; expiresAt: number; contentType: string }>(`/attachments/${id}/url`),
    list: (workOrderId: string) => request<any[]>(`/attachments?workOrderId=${workOrderId}`),
  },

  search: (q: string, limit = 10) =>
    request<{ query: string; intent: string; hits: Array<{ type: string; id: string; label: string; sublabel?: string; exact: boolean }> }>(
      `/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  // Connected demo layer (demo mode → central store; real backend has no such
  // route yet, so callers tolerate failure and treat it as "no events").
  notifications: {
    list: () => request<Array<{ id: string; kind: string; title: string; body?: string; entityType?: string; entityId?: string; read: boolean; createdAt: string }>>(`/notifications`),
    markRead: (id: string) => request<{ ok: boolean }>(`/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: () => request<{ ok: boolean }>(`/notifications/read-all`, { method: 'POST' }),
  },
  activity: {
    list: (limit = 30) => request<Array<{ id: string; kind: string; message: string; entityType?: string; entityId?: string; actor?: string; createdAt: string }>>(`/activity?limit=${limit}`),
  },

  /** Full tenant data snapshot for export / portability. */
  exportSnapshot: () => request<DataSnapshot>('/export/snapshot'),

  customerReceivables: (customerId: string, asOf?: string) =>
    request<{
      customerId: string; asOf: string; openCount: number;
      buckets: Record<string, string>; formatted: Record<string, string>;
    }>(`/customers/${customerId}/receivables${asOf ? `?asOf=${asOf}` : ''}`),

  // --- Warehouse (5.1–5.4) --------------------------------------------------
  suppliers: {
    list: (status?: string) =>
      request<any[]>(`/suppliers${status ? `?status=${status}` : ''}`),
    get: (id: string) => request<any>(`/suppliers/${id}`),
    create: (dto: Record<string, unknown>) => request<any>(`/suppliers`, { method: 'POST', body: dto }),
    update: (id: string, dto: Record<string, unknown>) =>
      request<any>(`/suppliers/${id}`, { method: 'PATCH', body: dto }),
    items: (id: string) => request<any[]>(`/suppliers/${id}/items`),
    linkItem: (id: string, dto: Record<string, unknown>) =>
      request<void>(`/suppliers/${id}/items`, { method: 'POST', body: dto }),
  },

  purchaseOrders: {
    list: (opts?: { status?: string; supplierId?: string }) => {
      const p = new URLSearchParams();
      if (opts?.status) p.set('status', opts.status);
      if (opts?.supplierId) p.set('supplierId', opts.supplierId);
      const qs = p.toString();
      return request<any[]>(`/purchase-orders${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => request<any>(`/purchase-orders/${id}`),
    create: (dto: Record<string, unknown>) => request<any>(`/purchase-orders`, { method: 'POST', body: dto }),
    send: (id: string) => request<any>(`/purchase-orders/${id}/send`, { method: 'POST' }),
    cancel: (id: string) => request<any>(`/purchase-orders/${id}/cancel`, { method: 'POST' }),
  },

  goodsReceipts: {
    list: (status?: string) =>
      request<any[]>(`/goods-receipts${status ? `?status=${status}` : ''}`),
    get: (id: string) => request<any>(`/goods-receipts/${id}`),
    // Create a DRAFT (manual today; the OCR pipeline will create drafts too).
    createDraft: (dto: Record<string, unknown>) =>
      request<any>(`/goods-receipts`, { method: 'POST', body: dto }),
    // Posting is the action that moves stock + recomputes moving-average cost.
    post: (id: string) => request<any>(`/goods-receipts/${id}/post`, { method: 'POST' }),
    // Phase 7: OCR a photographed delivery note / supplier invoice into a DRAFT.
    // Returns { draft, extraction, supplierMatch, poMatch, lines[], needsReview }.
    // It never posts — the existing post() remains the human-confirmed step.
    ocrDraft: (body: { attachmentId: string; documentType: 'delivery_note' | 'supplier_invoice'; defaultLocationId: string }) =>
      request<any>(`/ocr/receiving/draft`, { method: 'POST', body }),
  },

  stockOps: {
    adjust: (dto: { itemId: string; locationId: string; qty: number; reason: string }) =>
      request<any>(`/stock-ops/adjustments`, { method: 'POST', body: dto }),
    listCounts: () => request<any[]>(`/stock-ops/counts`),
    getCount: (id: string) => request<any>(`/stock-ops/counts/${id}`),
    openCount: (dto: { scope?: string; locationId?: string; notes?: string }) =>
      request<any>(`/stock-ops/counts`, { method: 'POST', body: dto }),
    recordCount: (id: string, lines: Array<{ itemId: string; locationId: string; countedQty: number }>) =>
      request<any>(`/stock-ops/counts/${id}/record`, { method: 'POST', body: { lines } }),
    closeCount: (id: string) => request<any>(`/stock-ops/counts/${id}/close`, { method: 'POST' }),
  },

  warehouseReports: {
    valuation: () =>
      request<{ items: any[]; totalValueMinor: string }>(`/warehouse-reports/valuation`),
    lowStock: () => request<any[]>(`/warehouse-reports/low-stock`),
    suggestedPos: () => request<any[]>(`/warehouse-reports/suggested-pos`),
  },

  // Plačila P1: profil delavnice (IBAN + naslov) za UPN QR prejemnika.
  // GET je odprt vsem članom; PATCH zahteva TenantManage (owner/admin).
  tenant: {
    profile: () =>
      request<TenantProfile>(`/tenant/profile`),
    updateProfile: (dto: { iban?: string; bankName?: string; address?: string; postCode?: string; city?: string; phone?: string; fax?: string; email?: string; website?: string; bic?: string; iban2?: string; bic2?: string; registrationNote?: string }) =>
      request<any>(`/tenant/profile`, { method: 'PATCH', body: dto }),
  },

  // Faza B: stanje naročnine (trial odštevanje, mehki paywall) za pasico in
  // zaslon Zaračunavanje. Mutacije ob zamrznjenem stanju vrnejo 402.
  billing: {
    status: () =>
      request<{ plan: string; billingStatus: string; trialEndsAt: string | null; writable: boolean; reason: string | null; trialDaysLeft: number | null }>(`/billing/status`),
    checkout: (plan: string) =>
      request<{ url: string }>(`/billing/checkout`, { method: 'POST', body: { plan } }),
    portal: () =>
      request<{ url: string }>(`/billing/portal`, { method: 'POST' }),
  },
  bankImport: {
    preview: (xml: string) => request<any>(`/bank-import/preview`, { method: 'POST', body: { xml } }),
    apply: (body: Record<string, unknown>) => request<any>(`/bank-import/apply`, { method: 'POST', body }),
    // P2.1: zgodovina uvozov — glave s povzetkom in en uvoz z vsemi vnosi.
    list: () => request<any[]>(`/bank-import`),
    get: (id: string) => request<any>(`/bank-import/${id}`),
    // P2.1: razknjiženje knjiženega priliva (storno plačila, vnos nazaj v 'pending').
    reverse: (entryId: string, reason?: string) =>
      request<any>(`/bank-import/entries/${entryId}/reverse`, { method: 'POST', body: { reason } }),
  },
};
