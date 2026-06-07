/**
 * Demo API adapter (mobile demo only). In demo mode the API client's request()
 * funnels here instead of calling the network. We pattern-match the path and
 * method against the fixtures and return believable data; write actions mutate
 * the in-memory store so the screen updates, then reset on reload. Anything not
 * explicitly handled returns an empty result rather than throwing, so the demo
 * is robust even on screens we did not tailor.
 *
 * This file exists only to make the app explorable from a phone with no backend.
 * It is never imported in a production build (the DEMO_MODE branch guards it).
 */

import {
  demoCustomers, demoVehicles, demoMechanics,
  demoWorkOrders, demoListItem, demoInvoices, demoInsight, LOCATION_MAIN,
} from './demo-data';
import { demoStore, demoEmit } from './demo-store';

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

/*
 * In-memory attendance day for the demo. Because the demo has no server, we keep
 * the current clock state at module scope so clock-in, break, and clock-out feel
 * real within a session (it resets on page reload, which is fine for a demo).
 * demoDayView() reproduces the shape the server's computed day view returns,
 * including the net-worked and break seconds the shared core would derive.
 */
const demoAttendanceState: {
  clockedIn: boolean; clockInMs: number; breaks: Array<[number, number]>; onBreakSince: number | null;
} = { clockedIn: false, clockInMs: 0, breaks: [], onBreakSince: null };

function demoDayView(closed = false): any {
  const d = demoAttendanceState;
  const now = Date.now();
  const grossMs = (closed ? now : now) - d.clockInMs;
  const breakMs = d.breaks.reduce((s, [a, b]) => s + (b - a), 0) + (d.onBreakSince ? now - d.onBreakSince : 0);
  const grossSeconds = Math.max(0, Math.floor(grossMs / 1000));
  const breakSeconds = Math.max(0, Math.floor(breakMs / 1000));
  return {
    id: 'day-demo', workDate: new Date().toISOString().slice(0, 10),
    clockInAt: new Date(d.clockInMs).toISOString(),
    clockOutAt: closed ? new Date(now).toISOString() : null,
    breaks: [
      ...d.breaks.map(([a, b], i) => ({ id: `br-${i}`, startAt: new Date(a).toISOString(), endAt: new Date(b).toISOString() })),
      ...(d.onBreakSince ? [{ id: 'br-open', startAt: new Date(d.onBreakSince).toISOString(), endAt: null }] : []),
    ],
    grossSeconds, breakSeconds, netWorkedSeconds: Math.max(0, grossSeconds - breakSeconds),
    open: !closed, flags: [], corrected: false,
  };
}

// Recompute a work order's totals from its lines after a mutation, so the demo's
// totals stay self-consistent when the user adds or removes a line. This mirrors
// the server's "sum the nets and VATs" approach; it is demo arithmetic, not the
// production pricing engine.
function recompute(wo: any): void {
  let net = 0, vat = 0;
  for (const l of wo.lines) {
    const q = parseFloat(l.quantity) || 0;
    const unit = Number(l.unitPriceMinor) / 100;
    const lineNet = q * unit;
    const lineVat = lineNet * (parseFloat(l.vatRatePct) / 100);
    l.netMinor = String(Math.round(lineNet * 100));
    l.vatMinor = String(Math.round(lineVat * 100));
    l.grossMinor = String(Math.round((lineNet + lineVat) * 100));
    net += lineNet; vat += lineVat;
  }
  wo.totalNetMinor = String(Math.round(net * 100));
  wo.totalVatMinor = String(Math.round(vat * 100));
  wo.totalGrossMinor = String(Math.round((net + vat) * 100));
}

function header(wo: any): any {
  const { lines, timeEntries, ...h } = wo; void lines; void timeEntries; return clone(h);
}

interface Call { path: string; method: string; body?: any; }

export async function demoRequest<T>(call: Call): Promise<T> {
  // Strip the query string for matching; keep it for the few endpoints that read it.
  const [rawPath, query = ''] = call.path.split('?');
  const path = rawPath.replace(/\/+$/, '');
  const method = call.method.toUpperCase();
  const params = new URLSearchParams(query);
  const seg = path.split('/').filter(Boolean); // e.g. ['work-orders','wo-1001']
  const body = call.body;

  const ok = <R>(v: R): Promise<R> => Promise.resolve(clone(v));

  // --- notifications + activity (central demo store) ---
  if (seg[0] === 'notifications') {
    if (seg.length === 1 && method === 'GET') return ok(demoStore.notifications.list() as any);
    if (seg[1] === 'read-all' && method === 'POST') { demoStore.notifications.markAllRead(); return ok({ ok: true } as any); }
    if (seg[1] && seg[2] === 'read' && method === 'POST') { demoStore.notifications.markRead(seg[1]); return ok({ ok: true } as any); }
  }
  if (seg[0] === 'activity' && method === 'GET') {
    return ok(demoStore.activity.list(Number(params.get('limit') ?? 30)) as any);
  }

  // --- auth / session (the launcher + header read these) ---
  if (path === '/auth/config') return ok({ demo: true } as any);
  if (path === '/auth/me') {
    return ok({
      user: { id: '00000000-0000-0000-0000-0000000a5001', name: 'A-SPRINT Demo', roles: ['owner', 'admin', 'advisor', 'mechanic'] },
      memberships: [{ tenantId: '00000000-0000-0000-0000-0000000a5b71', tenantName: 'A-SPRINT d.o.o.', roles: ['owner', 'admin', 'advisor', 'mechanic'] }],
    } as any);
  }
  if (path === '/auth/sessions') return ok([] as any);
  if (path === '/auth/heartbeat' || path === '/auth/logout') return ok({ ok: true } as any);
  if (path === '/me' && method === 'GET') return ok({ id: '00000000-0000-0000-0000-0000000a5001', name: 'A-SPRINT Demo', locale: 'sl' } as any);

  // --- work orders ---
  if (path === '/work-orders/mechanics') return ok(demoMechanics as any);

  if (path === '/work-orders' && method === 'GET') {
    const statuses = params.get('statuses')?.split(',').filter(Boolean);
    const customerId = params.get('customerId');
    let ids = Object.keys(demoWorkOrders);
    if (statuses?.length) ids = ids.filter((id) => statuses.includes(demoWorkOrders[id].status));
    if (customerId) ids = ids.filter((id) => demoWorkOrders[id].customerId === customerId);
    return ok(ids.map(demoListItem) as any);
  }
  if (path === '/work-orders' && method === 'POST') {
    // Create: spin up a minimal new draft so the intake flow "works".
    const id = `wo-${Math.floor(Math.random() * 9000 + 1000)}`;
    demoWorkOrders[id] = {
      id, number: null, status: 'open', customerId: call.body?.customerId ?? 'cust-kralj',
      assetId: call.body?.assetId ?? null, fleetId: null, locationId: LOCATION_MAIN,
      complaint: call.body?.complaint ?? null, diagnosis: null, odometer: call.body?.odometer ?? null,
      currency: 'EUR', customerPo: call.body?.customerPo ?? null,
      totalNetMinor: '0', totalVatMinor: '0', totalGrossMinor: '0', version: 1,
      assignedMechanicId: null, lines: [], timeEntries: [],
    };
    demoEmit.activity('work_order_created', 'Nov delovni nalog (osnutek)', 'work_order', id);
    demoEmit.notify('work_order_new', 'Nov delovni nalog', demoWorkOrders[id].complaint ?? undefined, 'work_order', id);
    return ok(header(demoWorkOrders[id]) as any);
  }

  if (seg[0] === 'work-orders' && seg[1]) {
    const wo = demoWorkOrders[seg[1]];
    if (!wo) return ok({} as any);

    // GET /work-orders/:id
    if (seg.length === 2 && method === 'GET') return ok(wo as any);

    // POST /work-orders/:id/assign
    if (seg[2] === 'assign' && method === 'POST') {
      wo.assignedMechanicId = call.body?.mechanicId ?? null;
      return ok(header(wo) as any);
    }
    // POST /work-orders/:id/transition
    if (seg[2] === 'transition' && method === 'POST') {
      wo.status = call.body?.to ?? wo.status;
      demoEmit.activity('work_order_status', `Nalog ${wo.number ?? wo.id} → ${wo.status}`, 'work_order', wo.id);
      if ((call.body?.to) === 'ready') demoEmit.notify('vehicle_ready', 'Vozilo pripravljeno', `Nalog ${wo.number ?? wo.id}`, 'work_order', wo.id);
      return ok(header(wo) as any);
    }
    // POST /work-orders/:id/clock-on | clock-off
    if (seg[2] === 'clock-on' && method === 'POST') {
      wo.timeEntries.push({ id: `t-${Date.now()}`, mechanicId: call.body?.mechanicId, startedAt: new Date().toISOString(), endedAt: null, durationSeconds: null, costMinor: null });
      return ok({ timeEntryId: `t-${Date.now()}`, startedAt: new Date().toISOString() } as any);
    }
    if (seg[2] === 'clock-off' && method === 'POST') {
      const open = wo.timeEntries.find((t: any) => !t.endedAt);
      if (open) { open.endedAt = new Date().toISOString(); open.durationSeconds = 3600; }
      return ok({ timeEntryId: open?.id ?? null, durationSeconds: open?.durationSeconds ?? 0 } as any);
    }
    // Lines: add / update / remove
    if (seg[2] === 'lines' && !seg[3] && method === 'POST') {
      const b = call.body ?? {};
      const lineId = b.lineId ?? `l-${Date.now()}`;
      wo.lines.push({
        id: lineId, lineNo: wo.lines.length + 1, type: b.type, description: b.description,
        inventoryItemId: b.inventoryItemId ?? null, reservedLocationId: b.locationId ?? null,
        quantity: b.quantity ?? '1', unitPriceMinor: String(b.unitPriceMinor ?? 0),
        discountPct: b.discountPct ?? '0', vatRatePct: b.vatRatePct ?? '22',
        netMinor: '0', vatMinor: '0', grossMinor: '0', issued: false,
      });
      recompute(wo);
      return ok({ workOrder: header(wo), lineId } as any);
    }
    if (seg[2] === 'lines' && seg[3] && method === 'PATCH') {
      const line = wo.lines.find((l: any) => l.id === seg[3]);
      if (line) { Object.assign(line, { ...call.body, unitPriceMinor: call.body?.unitPriceMinor != null ? String(call.body.unitPriceMinor) : line.unitPriceMinor }); recompute(wo); }
      return ok({ workOrder: header(wo), lineId: seg[3] } as any);
    }
    if (seg[2] === 'lines' && seg[3] && method === 'DELETE') {
      wo.lines = wo.lines.filter((l: any) => l.id !== seg[3]);
      recompute(wo);
      return ok({ workOrder: header(wo), removedLineId: seg[3] } as any);
    }
    if (seg[2] === 'lines' && seg[4] === 'issue' && method === 'POST') {
      const line = wo.lines.find((l: any) => l.id === seg[3]);
      if (line) line.issued = true;
      return ok({ ok: true } as any);
    }
    if (seg[2] === 'nalog') return ok({} as any);
  }

  // --- customers ---
  if (path === '/customers' && method === 'GET') return ok({ items: demoCustomers, nextCursor: null } as any);
  if (seg[0] === 'customers' && seg[1]) {
    const cust = demoCustomers.find((c) => c.id === seg[1]);
    if (seg.length === 2 && method === 'GET') return ok((cust ?? {}) as any);
    if (seg[2] === 'receivables') {
      const overdue = seg[1] === 'cust-horvat';
      return ok({
        customerId: seg[1], asOf: new Date().toISOString().slice(0, 10), openCount: overdue ? 1 : 0,
        buckets: { current: overdue ? '0' : '0', d1_30: '0', d31_60: '0', d61_90: '0', d90_plus: '0', total: overdue ? '46750' : '0' },
        formatted: { current: '€0.00', d1_30: '€0.00', d31_60: '€0.00', d61_90: '€0.00', d90_plus: '€0.00', total: overdue ? '€467.50' : '€0.00' },
      } as any);
    }
    if (seg[2] === 'validate-vat' && method === 'POST') {
      if (cust) { (cust as any).vatIdValidated = true; (cust as any).vatIdValidationSource = call.body?.mode ?? 'manual'; }
      return ok({ validated: true, source: call.body?.mode ?? 'manual' } as any);
    }
    if (method === 'PATCH') { if (cust) Object.assign(cust, call.body ?? {}); return ok((cust ?? {}) as any); }
  }
  if (path === '/customers' && method === 'POST') {
    const id = `cust-${Date.now()}`;
    const c = { id, vatIdValidated: false, vatIdValidationSource: null, ...call.body };
    demoCustomers.push(c as any);
    return ok(c as any);
  }

  // --- assets / vehicles ---
  if (path === '/assets' && method === 'GET') {
    const customerId = params.get('customerId');
    return ok((customerId ? demoVehicles[customerId] ?? [] : Object.values(demoVehicles).flat()) as any);
  }
  if (seg[0] === 'assets' && seg[1] && method === 'GET') {
    const veh = Object.values(demoVehicles).flat().find((v) => v.id === seg[1]);
    return ok((veh ?? {}) as any);
  }

  // --- inventory catalogue + stock + batches (central demo store) ---
  if (path === '/inventory/items' && method === 'GET') {
    const q = (params.get('q') ?? '').trim();
    return ok(demoStore.items.list(q).map((i) => ({
      ...demoStore.items.catalogue(i),
      onHand: i.onHand, reserved: i.reserved, available: Math.max(0, i.onHand - i.reserved),
      reorderPoint: i.reorderPoint, low: i.reorderPoint > 0 && i.onHand <= i.reorderPoint,
    })) as any);
  }
  if (path === '/inventory/items' && method === 'POST') {
    return ok(demoStore.items.create(body ?? {}) as any);
  }
  if (seg[0] === 'inventory' && seg[1] === 'items' && seg[2] && seg[3] === 'stock' && method === 'GET') {
    const it = demoStore.items.get(seg[2]);
    if (!it) return ok([] as any);
    return ok([{ itemId: it.id, locationId: LOCATION_MAIN, onHand: it.onHand, reserved: it.reserved, available: Math.max(0, it.onHand - it.reserved) }] as any);
  }
  if (seg[0] === 'inventory' && seg[1] === 'items' && seg[2] && !seg[3] && method === 'GET') {
    return ok((demoStore.items.get(seg[2]) ?? {}) as any);
  }
  if (seg[0] === 'inventory' && seg[1] === 'items' && seg[2] && !seg[3] && (method === 'PATCH' || method === 'PUT')) {
    return ok((demoStore.items.update(seg[2], body ?? {}) ?? {}) as any);
  }
  if (path === '/inventory/receive' && method === 'POST') {
    const it = demoStore.items.receive(body?.itemId, Number(body?.quantity ?? 0), { batchNo: body?.batchNo, expiry: body?.expiry, costMinor: body?.costMinor });
    return ok((it ? { ok: true, onHand: it.onHand } : { ok: false }) as any);
  }

  // --- invoices ---
  if (path === '/invoices' && method === 'GET') {
    const customerId = params.get('customerId');
    const list = Object.values(demoInvoices)
      .filter((inv: any) => !customerId || inv.customerId === customerId)
      .map((inv: any) => ({ id: inv.id, number: inv.number, status: inv.status, currency: inv.currency, totalGrossMinor: inv.totalGrossMinor, issueDate: inv.issueDate ?? null, dueDate: inv.dueDate ?? null }));
    return ok(list as any);
  }
  if (seg[0] === 'invoices' && seg[1] && method === 'GET') return ok((demoInvoices[seg[1]] ?? demoInvoices['inv-1']) as any);

  // --- reports / insight ---
  if (seg[0] === 'reports' && seg[1] === 'work-orders' && (seg[3] === 'insights' || seg[3] === 'labour')) {
    return ok((demoInsight[seg[2] as keyof typeof demoInsight] ?? demoInsight['wo-1001']) as any);
  }
  if (path === '/reports/ar-aging') return ok({ asOf: new Date().toISOString().slice(0, 10), buckets: { current: '0', d1_30: '0', d31_60: '0', d61_90: '0', d90_plus: '0', total: '46750' }, formatted: {} } as any);
  if (path === '/reports/revenue') return ok({ from: '2026-01-01', to: '2026-06-01', documents: 1, netMinor: '46750', vatMinor: '0', grossMinor: '46750', net: '€467.50', gross: '€467.50' } as any);
  if (path === '/reports/vat') return ok({ from: '2026-01-01', to: '2026-06-01', totalNetMinor: '46750', totalVatMinor: '10285', groups: [{ ratePct: '22', reverseCharge: false, net: '€467.50', vat: '€102.85' }, { ratePct: '0', reverseCharge: true, net: '€0.00', vat: '€0.00' }] } as any);

  // --- search ---
  if (path === '/search') {
    const q = (params.get('q') ?? '').toLowerCase();
    const hits = [
      ...demoCustomers.filter((c) => c.name.toLowerCase().includes(q)).map((c) => ({ type: 'customer', id: c.id, label: c.name, exact: false })),
      ...Object.values(demoWorkOrders).filter((w: any) => (w.number ?? '').includes(q)).map((w: any) => ({ type: 'work_order', id: w.id, label: w.number, exact: false })),
    ];
    return ok({ query: params.get('q') ?? '', intent: 'text', hits } as any);
  }

  // --- warehouse reads (return empty so those screens render gracefully) ---
  if (path === '/warehouse-reports/valuation') return ok({ items: [], totalValueMinor: String(demoStore.items.valuationMinor()) } as any);
  if (path === '/warehouse-reports/low-stock') {
    return ok(demoStore.items.lowStock().map((i) => ({ itemId: i.id, locationId: LOCATION_MAIN, name: i.name, sku: i.sku, onHand: i.onHand, reserved: i.reserved, available: Math.max(0, i.onHand - i.reserved), reorderPoint: i.reorderPoint, reorderQty: Math.max(i.reorderPoint, 1), preferredSupplierId: i.preferredSupplierId ?? null })) as any);
  }
  if (path === '/suppliers' || path === '/purchase-orders' || path === '/goods-receipts' || path === '/stock-ops/counts') return ok([] as any);

  // --- OCR receiving (demo): return the realistic Knorr-Bremse extraction so a
  // clerk can see the full review flow — including the deliberately flagged
  // low-confidence price — on a phone, with no model and no object store. ---
  if (path === '/ocr/receiving/draft' && method === 'POST') {
    const eur = (n: number) => Math.round(n * 100);
    return ok({
      draft: { id: 'demo-grn-1', status: 'draft', supplierId: 'sup-knorr', source: 'ocr' },
      extraction: {
        interactionId: 'demo-interaction', overallConfidence: 0.9,
        documentNumber: 'DN-2026-04471', deliveryNoteNumber: 'DN-2026-04471',
        invoiceNumber: null, purchaseOrderRef: '2026-PO-100', date: '2026-03-15',
        totalNetMinor: eur(519), totalGrossMinor: eur(633.18),
      },
      supplierMatch: { supplierId: 'sup-knorr', confidence: 0.99, method: 'exact_vat_id', reason: 'VAT id SI11223344 matches exactly' },
      poMatch: { purchaseOrderId: 'po-1', confidence: 0.97, method: 'exact_sku', reason: 'Purchase order 2026-PO-100 referenced on the document' },
      lines: [
        { index: 0, raw: 'Brake pad & disc kit', description: 'Brake pad & disc kit rear axle',
          supplierSku: 'K-1234', oemRef: '81.50820.6037', quantity: 2, quantityWhole: 2,
          unitPriceMinor: eur(240), vatRatePct: '22', confidence: 0.92, draftable: true,
          match: { itemId: 'item-padkit', confidence: 0.98, method: 'exact_supplier_sku', status: 'matched', reason: 'Supplier SKU K-1234 matches' },
          reviewFlags: [] },
        { index: 1, raw: 'Air filter element', description: 'Air filter element',
          supplierSku: 'K-7780', oemRef: '81.08405.0011', quantity: 1, quantityWhole: 1,
          unitPriceMinor: eur(39), vatRatePct: '22', confidence: 0.41, draftable: true,
          match: { itemId: 'item-airfilter', confidence: 0.96, method: 'exact_oem_ref', status: 'matched', reason: 'OEM ref 81.08405.0011 matches' },
          reviewFlags: ['Low extraction confidence'] },
      ],
      needsReview: true,
    } as any);
  }
  if (seg[0] === 'goods-receipts' && seg[2] === 'post' && method === 'POST') {
    return ok({ id: seg[1], status: 'posted' } as any);
  }
  if (path === '/attachments/presign' && method === 'POST') {
    return ok({ attachmentId: 'demo-attachment', storageKey: 'demo', upload: { url: 'about:blank', method: 'PUT', headers: {}, expiresAt: Date.now() + 60000 } } as any);
  }
  if (seg[0] === 'attachments' && seg[2] === 'complete') return ok({ id: seg[1], status: 'stored' } as any);

  // --- Plate recognition (demo): return a single confident match for the
  // seeded Slovenian vehicle (Prevozi Kralj's MAN, NMCK418) with its in-progress
  // job, so the advisor sees the full read → identify → confirm flow on a phone. ---
  if (path === '/plate-recognition/recognize' && method === 'POST') {
    return ok({
      read: { plate: 'NM CK-418', canonical: 'NMCK418', confidence: 0.93 },
      country: { effective: 'SI', guesses: [{ country: 'SI', confidence: 1 }] },
      candidates: [{
        vehicle: { id: 'veh-man1', plate: 'NMCK418', countryOfPlate: 'SI', customerId: 'cust-kralj', make: 'MAN', model: 'TGX 18.500', vin: 'WMA06XZZ7HM601234' },
        customer: { id: 'cust-kralj', name: 'Prevozi Kralj d.o.o.', country: 'SI', city: 'Novo mesto', phone: null, email: null },
        openWorkOrders: [{ id: 'wo-1001', number: '2026-1001', status: 'in_progress', complaint: 'Zadnje zavore škripijo (rear brakes squeal)', createdAt: new Date().toISOString() }],
        confidence: 0.98, method: 'exact', reason: 'Plate NMCK418 (SI) matches exactly',
      }],
      singleConfident: true, ambiguous: false, noMatch: false,
    } as any);
  }
  if (path === '/plate-recognition/confirm/existing' && method === 'POST') {
    return ok({ workOrderId: call.body?.workOrderId ?? 'wo-1001', number: '2026-1001', status: 'in_progress', created: false } as any);
  }
  if (path === '/plate-recognition/confirm/new' && method === 'POST') {
    return ok({ workOrderId: 'wo-new-demo', number: null, status: 'open', created: true } as any);
  }

  // --- Employee Time & Attendance (demo) ---------------------------------
  // A tiny in-memory day so clock-in/break/clock-out feel real on a phone. The
  // figures mirror what the shared core would compute, so the demo behaves like
  // the server without one.
  if (seg[0] === 'attendance' || seg[0] === 'attendance-admin') {
    const d = demoAttendanceState;

    if (path === '/attendance/current') {
      return ok((d.clockedIn ? demoDayView() : null) as any);
    }
    if (path === '/attendance/clock-in' && method === 'POST') {
      d.clockedIn = true; d.clockInMs = Date.now(); d.breaks = []; d.onBreakSince = null;
      return ok(demoDayView() as any);
    }
    if (path === '/attendance/clock-out' && method === 'POST') {
      if (d.onBreakSince) { d.breaks.push([d.onBreakSince, Date.now()]); d.onBreakSince = null; }
      d.clockedIn = false;
      return ok(demoDayView(true) as any);
    }
    if (path === '/attendance/break/start' && method === 'POST') { d.onBreakSince = Date.now(); return ok(demoDayView() as any); }
    if (path === '/attendance/break/end' && method === 'POST') {
      if (d.onBreakSince) { d.breaks.push([d.onBreakSince, Date.now()]); d.onBreakSince = null; }
      return ok(demoDayView() as any);
    }
    if (path === '/attendance/leave/mine') {
      return ok([
        { id: 'lv-1', leaveType: 'vacation', startDate: '2026-07-14', endDate: '2026-07-25', status: 'approved' },
        { id: 'lv-2', leaveType: 'sick_leave', startDate: '2026-06-02', endDate: '2026-06-03', status: 'approved' },
      ] as any);
    }
    if (path === '/attendance/leave' && method === 'POST') {
      return ok({ id: 'lv-new', status: 'pending', ...(call.body ?? {}) } as any);
    }
    if (path === '/attendance/vehicle/mine') {
      return ok({ id: 'sv-1', registrationNumber: 'NM TT-201', make: 'Renault', model: 'Master', currentMileageKm: 184320, status: 'active' } as any);
    }
    if (path === '/attendance/travel-orders/mine') {
      return ok([
        { id: 'to-1', number: 'TO-2026-000007', purpose: 'road_assistance', destination: 'Metlika', status: 'in_progress' },
        { id: 'to-2', number: 'TO-2026-000006', purpose: 'parts_pickup', destination: 'Ljubljana', status: 'completed' },
      ] as any);
    }
    if (seg[1] === 'travel-orders' && seg[3] === 'start' && method === 'POST') return ok({ id: seg[2], status: 'in_progress' } as any);
    if (seg[1] === 'travel-orders' && seg[3] === 'finish' && method === 'POST') return ok({ id: seg[2], status: 'completed' } as any);
    if (path === '/attendance/travel-orders' && method === 'POST') return ok({ id: 'to-new', number: 'TO-2026-000008', status: 'draft', ...(call.body ?? {}) } as any);

    // --- management ---
    if (path === '/attendance-admin/timesheet' || path === '/attendance/timesheet/mine') {
      return ok({
        userId: params.get('userId') ?? 'demo', month: params.get('month') ?? '2026-06',
        workedHours: 168.5, regularHours: 160, overtimeHours: 8.5,
        leaveHoursByType: { vacation: 8 }, totalLeaveHours: 8, paidHours: 176.5,
        daysWorked: 21, daysOnLeave: 1,
      } as any);
    }
    if (path === '/attendance-admin/consistency') {
      // The spec's worked example: present 10h, accounted 9h => 1h unaccounted (warn).
      return ok({
        userId: params.get('userId') ?? 'demo', from: params.get('from'), to: params.get('to'),
        accountedHours: 9, unaccountedHours: 1, overbookedHours: 0, severity: 'warn',
        summary: 'Present 10h, accounted 9h (work orders, field service, travel) — 1h unaccounted.',
        narrative: 'Marko was present for 10 hours but only 9 are accounted for by jobs, field service and travel — 1 hour is unexplained and worth a quick check.',
        advisoryOnly: true,
      } as any);
    }
    if (path === '/attendance-admin/leave/pending') {
      return ok([{ id: 'lv-3', leaveType: 'personal_leave', startDate: '2026-06-20', endDate: '2026-06-20', status: 'pending' }] as any);
    }
    if (seg[1] === 'leave' && seg[3] === 'decide' && method === 'POST') return ok({ id: seg[2], status: (call.body as any)?.decision ?? 'approved' } as any);
    if (path === '/attendance-admin/service-vehicles') {
      if (method === 'POST') return ok({ id: 'sv-new', ...(call.body ?? {}) } as any);
      return ok([
        { id: 'sv-1', registrationNumber: 'NM TT-201', make: 'Renault', model: 'Master', currentMileageKm: 184320, status: 'active' },
        { id: 'sv-2', registrationNumber: 'NM TK-880', make: 'MAN', model: 'TGL tow', currentMileageKm: 233100, status: 'active' },
      ] as any);
    }
  }

  // --- Voice work orders (demo): return a resolved draft for the seeded
  // Slovenian vehicle so the advisor sees the full record → transcript → review
  // → confirm flow on a phone. The transcript and fields match the fixture. ---
  if (path === '/voice-work-orders/draft' && method === 'POST') {
    return ok({
      draftId: 'voice-demo-1',
      transcript: {
        text: "Okay, this is for Prevozi Kralj, the MAN, plate November Mike Charlie Kilo four one eight. "
          + "Customer says the rear brakes squeal when braking and the pedal feels soft. "
          + "I replaced the rear brake pads and discs and bled the brake system, took about two hours. "
          + "Front brake discs are worn too, recommend replacing at the next service. "
          + "Follow up, call the customer about a quote for the front discs.",
        language: 'en', confidence: 0.9,
      },
      draft: {
        intent: 'unclear', customerHint: 'Prevozi Kralj', vehicleHint: 'NM CK 418', plateCanonical: 'NMCK418',
        complaint: 'Rear brakes squeal when braking and the pedal feels soft',
        workPerformed: 'Replaced rear brake pads and discs, bled the brake system',
        labourNotes: 'About two hours, rear caliper slider was seized',
        recommendations: ['Front brake discs worn, replace at next service'],
        followUps: ['Call customer about front discs quote'],
        odometerKm: 412350, suggestedLines: [], completeness: 1, missing: [], needsReview: true,
      },
      customerCandidates: [{ id: 'cust-kralj', name: 'Prevozi Kralj d.o.o.', country: 'SI', city: 'Novo mesto' }],
      resolvedCustomerId: 'cust-kralj',
      vehicleCandidates: [], resolvedVehicle: { id: 'veh-man1', plate: 'NMCK418', countryOfPlate: 'SI', make: 'MAN', model: 'TGX 18.500', customerId: 'cust-kralj' },
      openWorkOrders: [{ id: 'wo-1001', number: '2026-1001', status: 'in_progress', complaint: 'Rear brakes squeal', createdAt: new Date().toISOString() }],
    } as any);
  }
  if (path === '/voice-work-orders/confirm/create' && method === 'POST') {
    return ok({ workOrderId: 'wo-new-voice', number: null, status: 'open', created: true, addedLines: (call.body?.lines ?? []).length } as any);
  }
  if (path === '/voice-work-orders/confirm/update' && method === 'POST') {
    return ok({ workOrderId: call.body?.workOrderId ?? 'wo-1001', updated: true, addedLines: (call.body?.lines ?? []).length } as any);
  }

  // --- AI Workshop Manager (demo): return a realistic, prioritised insight set
  // for A-SPRINT so the owner sees a believable advisory dashboard on a phone.
  // The same kinds of findings the dry run produces, already prioritised. ---
  if (seg[0] === 'manager') {
    const period = seg[1] === 'daily' ? 'Today' : seg[1] === 'weekly' ? 'This week' : 'Last 30 days';
    const insights = [
      { key: 'ar_overdue:inv-late', category: 'receivables', severity: 'alert',
        title: 'Transport Horvat: €2400.00 overdue 62d',
        detail: 'Invoice 2026-44 for Transport Horvat has €2400.00 outstanding, 62 days past its due date of 2026-03-31.',
        metric: { outstandingMinor: 240000, daysOverdue: 62 }, entityType: 'invoice', entityId: 'inv-late',
        recommendation: 'Escalate collection; consider pausing further credit for this customer.' },
      { key: 'labour_loss:wo-loss', category: 'profitability', severity: 'alert',
        title: 'Labour billed below cost on 2026-1007',
        detail: 'Job 2026-1007 (Transport Horvat) billed €180.00 of labour against €240.00 of labour cost — a loss of €60.00.',
        metric: { marginMinor: -6000 }, entityType: 'work_order', entityId: 'wo-loss',
        recommendation: 'Review the labour pricing or time booked on this job.' },
      { key: 'reorder:item-padkit', category: 'inventory', severity: 'warn',
        title: 'Reorder BPK-MAN-R',
        detail: 'Brake pad kit MAN rear (BPK-MAN-R) is at 1 on hand, at or below its reorder point of 4.',
        metric: { onHand: 1, reorderPoint: 4 }, entityType: 'inventory_item', entityId: 'item-padkit',
        recommendation: 'Raise a purchase order for this item (requires your approval).' },
      { key: 'underbilled:wo-under', category: 'profitability', severity: 'warn',
        title: 'Possible underbilling on 2026-1008',
        detail: 'Job 2026-1008 (Prevozi Kralj) clocked 5h of labour but billed only 2h — 3h appears uncharged.',
        metric: { gapHours: 3 }, entityType: 'work_order', entityId: 'wo-under',
        recommendation: 'Confirm whether the uncharged time should be added to the invoice.' },
      { key: 'low_util:m1', category: 'productivity', severity: 'warn',
        title: 'Low job utilisation for Marko Kovač',
        detail: 'Marko Kovač was present 8h but clocked only 3h onto jobs — 37.5% utilisation.',
        metric: { utilisation: 0.375 }, entityType: 'mechanic', entityId: 'm1',
        recommendation: 'Look at scheduling, parts waiting time, or unbooked work — not necessarily effort.' },
      { key: 'slow_moving:item-slow', category: 'inventory', severity: 'info',
        title: 'Slow-moving stock: OLD-GASKET',
        detail: 'Obsolete gasket (OLD-GASKET) has 12 on hand unmoved for 240 days, tying up about €180.00.',
        metric: { tiedUpMinor: 18000 }, entityType: 'inventory_item', entityId: 'item-slow',
        recommendation: 'Consider returning, discounting, or de-stocking this item.' },
    ];
    return ok({
      periodLabel: period, generatedAt: new Date().toISOString(),
      summary: {
        total: insights.length, byCategory: { receivables: 1, profitability: 2, inventory: 2, productivity: 1 },
        bySeverity: { alert: 2, warn: 3, info: 1 }, top: insights.slice(0, 5),
        headline: `${period}: 6 items flagged (2 alerts, 3 warnings). Top concern: Transport Horvat: €2400.00 overdue 62d.`,
        narrative: 'Two issues need attention: a €2,400 invoice to Transport Horvat is over 60 days overdue, and job 2026-1007 was billed below its labour cost. Stock is running low on rear brake pad kits, and a few jobs and a technician show room to tighten billing and scheduling.',
      },
      insights, advisoryOnly: true,
    } as any);
  }

  // --- Vehicle rental (demo): a believable stateful desk. We keep a tiny
  // in-memory fleet and contract so the whole flow walks end to end on a phone
  // without a backend, and the return reproduces the same charge breakdown the
  // tested shared calculator produces (the A-SPRINT motorhome from the dry run). ---
  if (seg[0] === 'rental') {
    // Lazily seed an in-memory store on the module-scoped object.
    const store: any = ((demoRequest as any)._rental ??= {
      vehicles: [
        { id: 'rv-moho', category: 'motorhome', make: 'Adria', model: 'Matrix 670', plate: 'NM RT-220', status: 'available',
          daily_rate_minor: 12000, included_km_per_day: 250, per_km_rate_minor: 30, per_fuel_eighth_minor: 1800,
          cleaning_fee_minor: 5000, late_fee_per_day_minor: 15000, deposit_minor: 80000, deductible_minor: 40000, currency: 'EUR' },
        { id: 'rv-car', category: 'replacement', make: 'Škoda', model: 'Octavia', plate: 'NM CK-901', status: 'available',
          daily_rate_minor: 4500, included_km_per_day: 200, per_km_rate_minor: 20, per_fuel_eighth_minor: 1200,
          cleaning_fee_minor: 3000, late_fee_per_day_minor: 6000, deposit_minor: 30000, deductible_minor: 20000, currency: 'EUR' },
      ],
      contracts: {} as Record<string, any>,
      seq: 1,
    });

    if (seg[1] === 'vehicles' && method === 'GET') return ok(store.vehicles as any);
    if (seg[1] === 'vehicles' && method === 'POST') {
      const v = { id: 'rv-' + (store.seq++), status: 'available', currency: 'EUR', ...(body ?? {}) };
      store.vehicles.push(v); return ok(v as any);
    }
    if (seg[1] === 'reservations' && method === 'POST') {
      const res = { id: 'res-' + (store.seq++), status: 'reserved', ...(body ?? {}) };
      store._lastRes = res; return ok(res as any);
    }
    if (seg[1] === 'calendar' && method === 'GET') return ok([] as any);
    if (seg[1] === 'contracts' && method === 'POST') {
      const res = store._lastRes ?? {};
      const v = store.vehicles.find((x: any) => x.id === res.rental_vehicle_id || x.id === res.rentalVehicleId) ?? store.vehicles[0];
      const id = 'rc-' + (store.seq++);
      const c = {
        id, number: `RA-2026-${String(store.seq).padStart(6, '0')}`, status: 'draft',
        rental_vehicle_id: v.id, customer_id: res.customerId ?? res.customer_id ?? 'demo-customer',
        start_at: res.startAt ?? new Date().toISOString(), end_at: res.endAt ?? new Date(Date.now() + 4 * 864e5).toISOString(),
        daily_rate_minor: v.daily_rate_minor, included_km_per_day: v.included_km_per_day, per_km_rate_minor: v.per_km_rate_minor,
        per_fuel_eighth_minor: v.per_fuel_eighth_minor, cleaning_fee_minor: v.cleaning_fee_minor,
        late_fee_per_day_minor: v.late_fee_per_day_minor, deposit_minor: v.deposit_minor, deductible_minor: v.deductible_minor,
        casco: body?.casco ?? true, fuel_policy: body?.fuelPolicy ?? 'full_to_full', currency: 'EUR',
        start_mileage_km: v.current_mileage_km ?? 120000, start_fuel_eighths: 8,
      };
      store.contracts[id] = c; return ok(c as any);
    }
    if (seg[1] === 'contracts' && seg[2] && seg[3] === 'handover' && method === 'POST') {
      const c = store.contracts[seg[2]] ?? {};
      c.status = 'handed_over'; c.start_mileage_km = body?.startMileageKm ?? c.start_mileage_km; c.start_fuel_eighths = body?.startFuelEighths ?? 8;
      return ok(c as any);
    }
    if (seg[1] === 'contracts' && seg[2] && seg[3] === 'return' && method === 'POST') {
      const c = store.contracts[seg[2]] ?? {};
      // Reproduce the tested charge logic for the demo (same conventions).
      const days = Math.max(1, Math.ceil((Date.now() - Date.parse(c.start_at)) / 864e5));
      const kmDriven = Math.max(0, (body?.returnMileageKm ?? c.start_mileage_km) - c.start_mileage_km);
      const includedKm = c.included_km_per_day * days;
      const extraKm = Math.max(0, kmDriven - includedKm);
      const missingFuel = Math.max(0, (c.start_fuel_eighths ?? 8) - (body?.returnFuelEighths ?? 8));
      const damageCost = (body?.damages ?? []).reduce((s: number, d: any) => s + Math.max(0, Number(d.estimatedCostMinor ?? 0)), 0);
      const damageCharge = c.casco ? Math.min(damageCost, c.deductible_minor) : damageCost;
      const lines: any[] = [{ code: 'base_rental', description: `Rental ${days} day(s)`, quantity: days, unitMinor: c.daily_rate_minor, amountMinor: days * c.daily_rate_minor }];
      if (extraKm > 0) lines.push({ code: 'extra_km', description: `Extra ${extraKm} km`, quantity: extraKm, unitMinor: c.per_km_rate_minor, amountMinor: extraKm * c.per_km_rate_minor });
      if (missingFuel > 0) lines.push({ code: 'missing_fuel', description: `Missing fuel ${missingFuel}/8`, quantity: missingFuel, unitMinor: c.per_fuel_eighth_minor, amountMinor: missingFuel * c.per_fuel_eighth_minor });
      if (body?.dirty) lines.push({ code: 'cleaning', description: 'Cleaning fee', quantity: 1, unitMinor: c.cleaning_fee_minor, amountMinor: c.cleaning_fee_minor });
      if (damageCharge > 0) lines.push({ code: 'damage', description: 'Damage liability', quantity: 1, unitMinor: damageCharge, amountMinor: damageCharge });
      const subtotalMinor = lines.reduce((s, l) => s + l.amountMinor, 0);
      const depositApplied = Math.min(subtotalMinor, c.deposit_minor);
      const charges = {
        lines, subtotalMinor, rentalDays: days, kmDriven, includedKm, extraKm, missingFuelEighths: missingFuel, daysLate: 0,
        depositMinor: c.deposit_minor, depositAppliedMinor: depositApplied,
        depositRefundMinor: Math.max(0, c.deposit_minor - subtotalMinor), balanceDueMinor: Math.max(0, subtotalMinor - c.deposit_minor),
      };
      c.status = 'returned'; c.charges = charges; c.return_mileage_km = body?.returnMileageKm; c.return_fuel_eighths = body?.returnFuelEighths;
      return ok({ contract: c, charges } as any);
    }
    if (seg[1] === 'contracts' && seg[2] && seg[3] === 'invoice' && method === 'POST') {
      const c = store.contracts[seg[2]] ?? {};
      c.status = 'invoiced';
      return ok({ contractId: c.id, invoiceId: 'demo-inv-' + (store.seq++), invoice: { id: 'demo-inv', number: `INV-2026-${String(store.seq).padStart(6, '0')}` } } as any);
    }
    if (seg[1] === 'contracts' && seg[2] && method === 'GET') return ok(store.contracts[seg[2]] ?? {} as any);
  }

  // Default: empty-ish, never throw, so an untailored screen still renders.
  return ok((method === 'GET' ? [] : { ok: true }) as any);
}
