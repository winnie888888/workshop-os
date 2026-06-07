'use client';

/*
 * Portal demo adapter. In demo mode the portal client routes here instead of the
 * network, so the customer portal is explorable from the same shareable link as
 * the staff app — with no backend and no real magic link. It answers as the
 * demo customer "Transport Horvat d.o.o." against the shared A-SPRINT fixtures,
 * and keeps a tiny in-memory store for the write actions (approve work, request
 * an appointment) so the screens react. Resets on reload.
 */

import { demoCustomers, demoVehicles, demoWorkOrders, demoInvoices } from './demo-data';

// The portal demo always acts as the Croatian haulier — a cross-border B2B
// customer, which is the most interesting case (reverse-charge invoice).
const DEMO_CUSTOMER_ID = 'cust-horvat';

// In-memory approvals + appointments for the demo (reset on reload).
let approvals: any[] = [
  {
    id: 'appr-1', workOrderId: 'wo-1002', workOrderNumber: '2026-1002', kind: 'additional_work',
    title: 'Additional work found during 120,000 km service',
    proposedItems: [
      { description: 'Replace front brake discs (pair)', quantity: '1', unitPriceMinor: '32000', vatRatePct: '0' },
      { description: 'Labour, 1.5h', quantity: '1.5', unitPriceMinor: '6500', vatRatePct: '0' },
    ],
    currency: 'EUR', amountNetMinor: '41750', amountGrossMinor: '41750',
    status: 'pending', respondedAt: null, createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
];
let appointments: any[] = [];

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

function custWorkOrders(open: boolean): any[] {
  return Object.values(demoWorkOrders)
    .filter((w: any) => w.customerId === DEMO_CUSTOMER_ID)
    .filter((w: any) => !open || ['open', 'in_progress', 'ready'].includes(w.status))
    .map((w: any) => portalCard(w));
}

function portalCard(w: any): any {
  const labels: Record<string, string> = {
    draft: 'Received', open: 'Scheduled', in_progress: 'In progress',
    ready: 'Ready for collection', invoiced: 'Invoiced', closed: 'Completed', cancelled: 'Cancelled',
  };
  const progress: Record<string, number> = { draft: 10, open: 25, in_progress: 60, ready: 90, invoiced: 100, closed: 100, cancelled: 0 };
  const veh = Object.values(demoVehicles).flat().find((v: any) => v.id === w.assetId);
  return {
    id: w.id, number: w.number, status: w.status, statusLabel: labels[w.status] ?? w.status,
    progress: progress[w.status] ?? 0, complaint: w.complaint, currency: w.currency,
    totalGrossMinor: w.totalGrossMinor, plate: veh?.plate ?? null,
    makeModel: veh ? `${veh.make} ${veh.model}` : null,
    createdAt: w.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

interface Call { path: string; method: string; body?: any; }

export async function portalDemoRequest<T>(call: Call): Promise<T> {
  const [rawPath] = call.path.split('?');
  const path = rawPath.replace(/\/+$/, '');
  const method = call.method.toUpperCase();
  const seg = path.split('/').filter(Boolean); // ['portal', ...]
  const cust = demoCustomers.find((c) => c.id === DEMO_CUSTOMER_ID)!;
  const ok = <R>(v: R): Promise<R> => Promise.resolve(clone(v));

  // auth
  if (path === '/portal/auth/request-link') return ok({ sent: true } as any);
  if (path === '/portal/auth/verify') {
    return ok({ sessionToken: 'demo-portal-session', tenantId: '00000000-0000-0000-0000-0000000a5b71', customerId: DEMO_CUSTOMER_ID, customerName: cust.name } as any);
  }
  if (path === '/portal/logout') return ok({} as any);
  if (path === '/portal/me') return ok({ id: cust.id, name: cust.name, country: cust.country, city: (cust as any).city, email: 'dispatch@transport-horvat.hr', phone: '+385 1 555 0123', currency: cust.currency, paymentTermsDays: cust.paymentTermsDays } as any);

  if (path === '/portal/vehicles') return ok((demoVehicles[DEMO_CUSTOMER_ID] ?? []) as any);

  if (path === '/portal/work-orders' && method === 'GET') {
    const open = call.path.includes('open=1');
    return ok(custWorkOrders(open) as any);
  }
  if (seg[0] === 'portal' && seg[1] === 'work-orders' && seg[2] && method === 'GET') {
    const w: any = demoWorkOrders[seg[2]];
    if (!w) return ok({} as any);
    return ok({
      ...portalCard(w), diagnosis: w.diagnosis ?? null,
      lines: (w.lines ?? []).map((l: any) => ({ lineNo: l.lineNo, type: l.type, description: l.description, quantity: l.quantity, grossMinor: l.grossMinor, done: l.issued })),
    } as any);
  }

  if (path === '/portal/service-history') {
    return ok(Object.values(demoWorkOrders).filter((w: any) => w.customerId === DEMO_CUSTOMER_ID && ['invoiced', 'closed'].includes(w.status)).map((w: any) => portalCard(w)) as any);
  }

  if (path === '/portal/invoices' && method === 'GET') {
    const inv = demoInvoices['inv-1'];
    return ok([{ ...inv, paymentStatus: 'unpaid' }] as any);
  }
  if (seg[0] === 'portal' && seg[1] === 'invoices' && seg[2] && method === 'GET') {
    const inv = demoInvoices['inv-1'];
    return ok({ ...inv, paymentStatus: 'unpaid', lines: [] } as any);
  }
  if (path === '/portal/documents') {
    const inv = demoInvoices['inv-1'];
    return ok([{ id: inv.id, kind: 'invoice', title: `Invoice ${inv.number}`, date: inv.issueDate, downloadPath: `/portal/invoices/${inv.id}/pdf` }] as any);
  }

  if (path === '/portal/approvals' && method === 'GET') {
    const pendingOnly = call.path.includes('pending=1');
    return ok((pendingOnly ? approvals.filter((a) => a.status === 'pending') : approvals) as any);
  }
  if (seg[1] === 'approvals' && seg[3] === 'respond' && method === 'POST') {
    const a = approvals.find((x) => x.id === seg[2]);
    if (a) { a.status = call.body?.decision ?? 'approved'; a.respondedAt = new Date().toISOString(); }
    return ok({ id: seg[2], status: a?.status } as any);
  }

  if (path === '/portal/appointments' && method === 'GET') return ok(appointments as any);
  if (path === '/portal/appointments' && method === 'POST') {
    const appt = { id: `appt-${Date.now()}`, asset_id: call.body?.assetId ?? null, preferred_date: call.body?.preferredDate ?? null, description: call.body?.description ?? null, status: 'requested', created_at: new Date().toISOString() };
    appointments = [appt, ...appointments];
    return ok({ id: appt.id, status: 'requested' } as any);
  }

  return ok((method === 'GET' ? [] : { ok: true }) as any);
}

