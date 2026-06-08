/**
 * CENTRAL DEMO STORE — single source of truth for the whole demo plane.
 *
 * One localStorage key (wos.demo.v1), versioned and SSR-safe. Owns every demo
 * entity plus the cross-cutting layers (notifications, activity log, settings).
 * Mutations emit Activity + Notification events, so the bell, dashboard, reports
 * and any other screen that reads this store stay in sync automatically.
 *
 * This is the demo backing for api.ts (via demo-api.ts). In real mode the API
 * client talks to the NestJS backend instead; this file is never used there.
 *
 * Money is stored in MINOR units (cents) as integers. Dates are ISO strings.
 */

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export type CustomerType = 'company' | 'individual';
export type WorkOrderStatus =
  | 'reception' | 'approved' | 'in_progress' | 'ready' | 'invoiced' | 'closed' | 'cancelled';
export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'invoiced';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'credited';
export type MinimaxSync = 'none' | 'queued' | 'sending' | 'synced' | 'failed';
export type LineKind = 'labour' | 'part' | 'service';

export interface Customer {
  id: string; code?: string; name: string; type: CustomerType;
  country: string; address?: string; postCode?: string; city?: string;
  vatLiable: boolean; vatId?: string; taxId?: string; registrationNo?: string;
  currency: string; paymentTermsDays: number; discountPct: number;
  phone?: string; email?: string; createdAt: string;
}

export type VehicleType = 'tractor' | 'truck' | 'van' | 'trailer' | 'other';
export type Powertrain = 'diesel' | 'petrol' | 'electric' | 'hybrid' | 'cng' | 'lng' | 'hydrogen' | 'other';
export interface Vehicle {
  id: string; customerId: string; plate: string; countryOfPlate: string;
  vin?: string; make?: string; model?: string; year?: number;
  type: VehicleType; powertrain?: Powertrain;
  odometerLast?: number; createdAt: string;
}

export interface DocLine {
  id: string; kind: LineKind; description: string;
  qty: number; unitPriceMinor: number; vatRatePct: number;
}

export interface WorkOrder {
  id: string; number: string; customerId: string; vehicleId: string;
  status: WorkOrderStatus; complaint?: string; diagnosis?: string;
  mechanicId?: string; lines: DocLine[]; notes?: string;
  voiceNoteIds: string[]; plateScanIds: string[];
  createdAt: string; updatedAt: string;
}

export interface Estimate {
  id: string; number: string; customerId: string; vehicleId?: string;
  workOrderId?: string; status: EstimateStatus; lines: DocLine[];
  validUntil?: string; createdAt: string;
}

export interface Invoice {
  id: string; number: string; customerId: string; vehicleId?: string;
  workOrderId?: string; estimateId?: string; status: InvoiceStatus;
  lines: DocLine[]; issueDate?: string; dueDate?: string; paidDate?: string;
  minimaxSync: MinimaxSync; createdAt: string;
}

export interface VoiceNote { id: string; transcript: string; workOrderId?: string; createdAt: string; }
export interface PlateScan { id: string; plate: string; countryOfPlate?: string; vehicleId?: string; createdAt: string; }
export interface Message { id: string; threadId: string; customerId?: string; direction: 'in' | 'out'; channel: 'sms' | 'email'; body: string; createdAt: string; }
export interface Appointment { id: string; customerId?: string; vehicleId?: string; workOrderId?: string; title: string; start: string; end?: string; createdAt: string; }
export interface Mechanic { id: string; name: string; }

// Inventory item (full model + optional lot/batch tracking). Single demo location.
export type ItemKind = 'part' | 'consumable' | 'fluid' | 'tyre' | 'other';
export interface ItemBatch { id: string; batchNo?: string; qty: number; expiry?: string; costMinor?: number; receivedAt: string; }
export interface Item {
  id: string; sku: string; name: string; oemRef?: string; barcode?: string;
  kind: ItemKind; unit: string; category?: string;
  priceMinor: number; costMinor?: number; vatRatePct: number;
  supplierName?: string; supplierSku?: string; preferredSupplierId?: string;
  onHand: number; reserved: number; reorderPoint: number; bin?: string;
  batches: ItemBatch[];
  active: boolean; quickAdd?: boolean; notes?: string; createdAt: string; updatedAt: string;
}
export function itemAvailable(it: Item): number { return Math.max(0, it.onHand - it.reserved); }
export function itemIsLow(it: Item): boolean { return it.reorderPoint > 0 && it.onHand <= it.reorderPoint; }

// Service package / preset: a reusable bundle of labour + part lines, applied to
// a work order in one click. Optional tags (vehicle class + powertrain) scope it;
// empty = applies to all. Part lines carry an itemId so price/VAT can be resolved
// live from the catalogue at apply time.
export interface PresetLine { id: string; kind: 'labour' | 'part'; description: string; itemId?: string; qty: number; unitPriceMinor: number; vatRatePct: number; }
export interface Preset {
  id: string; name: string; description?: string;
  vehicleClasses?: VehicleType[]; powertrains?: Powertrain[];
  lines: PresetLine[]; active: boolean; createdAt: string; updatedAt: string;
}
export function presetMatches(p: Preset, type?: VehicleType | null, powertrain?: Powertrain | null): boolean {
  const okClass = !p.vehicleClasses?.length || (!!type && p.vehicleClasses.includes(type));
  const okPow = !p.powertrains?.length || (!!powertrain && p.powertrains.includes(powertrain));
  return okClass && okPow;
}

export type NotificationKind =
  | 'work_order_new' | 'vehicle_ready' | 'invoice_overdue' | 'minimax_failed'
  | 'mechanic_assigned' | 'invoice_issued' | 'estimate_sent' | 'message_in' | 'low_stock';
export interface Notification {
  id: string; kind: NotificationKind; title: string; body?: string;
  entityType?: string; entityId?: string; read: boolean; createdAt: string;
}

export type ActivityKind =
  | 'work_order_created' | 'work_order_status' | 'line_added' | 'estimate_created'
  | 'estimate_to_invoice' | 'invoice_issued' | 'invoice_paid' | 'invoice_credited'
  | 'minimax_sync' | 'mechanic_assigned' | 'vehicle_created' | 'customer_created'
  | 'plate_scanned' | 'voice_captured' | 'message_sent'
  | 'item_created' | 'item_updated' | 'item_received' | 'stock_adjusted';
export interface Activity {
  id: string; kind: ActivityKind; message: string;
  entityType?: string; entityId?: string; actor?: string; createdAt: string;
}

export interface Settings {
  vatRatePct: number; labourRateMinor: number; currency: string;
  company: { name: string; address?: string; postCode?: string; city?: string; vatId?: string; iban?: string };
  integrations: { minimax: boolean; vies: boolean; sms: boolean };
}

interface DB {
  v: number;
  customers: Customer[]; vehicles: Vehicle[]; mechanics: Mechanic[];
  workOrders: WorkOrder[]; estimates: Estimate[]; invoices: Invoice[];
  items: Item[]; presets: Preset[];
  voiceNotes: VoiceNote[]; plateScans: PlateScan[]; messages: Message[]; appointments: Appointment[];
  notifications: Notification[]; activity: Activity[]; settings: Settings;
  seq: number;
}

// ----------------------------------------------------------------------------
// Persistence (single key, SSR-safe, versioned) + reactive subscribe()
// ----------------------------------------------------------------------------
const KEY = 'wos.demo.v1';
const VERSION = 4;
const listeners = new Set<() => void>();
let version = 0;
let cache: DB | null = null;

function nowIso(): string { return new Date().toISOString(); }
function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function emptyDB(): DB {
  return {
    v: VERSION,
    customers: [], vehicles: [], mechanics: [], workOrders: [], estimates: [], invoices: [],
    items: [], presets: [],
    voiceNotes: [], plateScans: [], messages: [], appointments: [],
    notifications: [], activity: [],
    settings: {
      vatRatePct: 22, labourRateMinor: 6500, currency: 'EUR',
      company: { name: 'A-SPRINT d.o.o.', address: 'Industrijska cesta 1', postCode: '8340', city: 'Črnomelj', vatId: 'SI12345678', iban: 'SI56 0000 0000 0000 000' },
      integrations: { minimax: false, vies: true, sms: false },
    },
    seq: 1000,
  };
}

function load(): DB {
  if (cache) return cache;
  if (typeof window === 'undefined') { cache = seed(emptyDB()); return cache; }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed && parsed.v === VERSION) { cache = parsed; return cache; }
    }
  } catch { /* fall through to seed */ }
  cache = seed(emptyDB());
  persist();
  return cache;
}

function persist(): void {
  if (cache && typeof window !== 'undefined') {
    try { window.localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* quota */ }
  }
  version += 1;
  listeners.forEach((l) => l());
}

/** Subscribe to any store change (use with React's useSyncExternalStore). */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function snapshotVersion(): number { return version; }

/** Wipe everything and re-seed. */
export function reset(): void { cache = seed(emptyDB()); persist(); }

// ----------------------------------------------------------------------------
// Money / totals helpers
// ----------------------------------------------------------------------------
export function lineNetMinor(l: DocLine): number { return Math.round(l.qty * l.unitPriceMinor); }
export function lineVatMinor(l: DocLine): number { return Math.round(lineNetMinor(l) * (l.vatRatePct / 100)); }
export interface Totals { netMinor: number; vatMinor: number; grossMinor: number; }
export function totals(lines: DocLine[]): Totals {
  const netMinor = lines.reduce((s, l) => s + lineNetMinor(l), 0);
  const vatMinor = lines.reduce((s, l) => s + lineVatMinor(l), 0);
  return { netMinor, vatMinor, grossMinor: netMinor + vatMinor };
}

// ----------------------------------------------------------------------------
// Event emitters (every mutation funnels through these)
// ----------------------------------------------------------------------------
function logActivity(kind: ActivityKind, message: string, entityType?: string, entityId?: string): void {
  const db = load();
  db.activity.unshift({ id: newId('act'), kind, message, entityType, entityId, actor: 'Vi', createdAt: nowIso() });
  db.activity = db.activity.slice(0, 200);
}
function notify(kind: NotificationKind, title: string, body?: string, entityType?: string, entityId?: string): void {
  const db = load();
  db.notifications.unshift({ id: newId('ntf'), kind, title, body, entityType, entityId, read: false, createdAt: nowIso() });
  db.notifications = db.notifications.slice(0, 100);
}

/** Public emit surface: lets demo-api record events when an action happens. */
export const demoEmit = {
  activity(kind: ActivityKind, message: string, entityType?: string, entityId?: string): void {
    logActivity(kind, message, entityType, entityId); persist();
  },
  notify(kind: NotificationKind, title: string, body?: string, entityType?: string, entityId?: string): void {
    notify(kind, title, body, entityType, entityId); persist();
  },
};

// ----------------------------------------------------------------------------
// Numbering
// ----------------------------------------------------------------------------
function nextNumber(kind: 'wo' | 'est' | 'inv'): string {
  const db = load();
  const n = db.seq++;
  const year = new Date().getFullYear();
  if (kind === 'wo') return `${year}-${String(n).slice(-4)}`;
  if (kind === 'est') return `P-${year}-${String(n).slice(-4)}`;
  return `INV-${year}-${String(n).padStart(6, '0')}`;
}
function nextSku(): string {
  const db = load();
  const n = (db.items.length + 1);
  return `ART-${String(n).padStart(4, '0')}`;
}

// ----------------------------------------------------------------------------
// Public store API
// ----------------------------------------------------------------------------
export const demoStore = {
  // ---- customers ----
  customers: {
    list(q?: string): Customer[] {
      const all = load().customers;
      if (!q) return [...all];
      const s = q.toLowerCase();
      return all.filter((c) => c.name.toLowerCase().includes(s) || (c.vatId ?? '').toLowerCase().includes(s) || (c.taxId ?? '').includes(s) || (c.code ?? '').toLowerCase().includes(s));
    },
    get(id: string): Customer | undefined { return load().customers.find((c) => c.id === id); },
    create(data: Partial<Customer> & { name: string }): Customer {
      const db = load();
      const c: Customer = {
        id: newId('cus'), name: data.name, type: data.type ?? 'company',
        country: (data.country ?? 'SI').toUpperCase(), address: data.address, postCode: data.postCode, city: data.city,
        vatLiable: data.vatLiable ?? true, vatId: data.vatId, taxId: data.taxId, registrationNo: data.registrationNo,
        currency: data.currency ?? 'EUR', paymentTermsDays: data.paymentTermsDays ?? 30, discountPct: data.discountPct ?? 0,
        phone: data.phone, email: data.email, code: data.code, createdAt: nowIso(),
      };
      db.customers.unshift(c);
      logActivity('customer_created', `Nova stranka: ${c.name}`, 'customer', c.id);
      persist();
      return c;
    },
    update(id: string, patch: Partial<Customer>): Customer | undefined {
      const db = load(); const c = db.customers.find((x) => x.id === id);
      if (!c) return undefined;
      Object.assign(c, patch); persist(); return c;
    },
  },

  // ---- vehicles ----
  vehicles: {
    list(customerId?: string): Vehicle[] {
      const all = load().vehicles;
      return customerId ? all.filter((v) => v.customerId === customerId) : [...all];
    },
    get(id: string): Vehicle | undefined { return load().vehicles.find((v) => v.id === id); },
    findByPlate(plate: string): Vehicle | undefined {
      const norm = plate.replace(/\s+/g, '').toUpperCase();
      return load().vehicles.find((v) => v.plate.replace(/\s+/g, '').toUpperCase() === norm);
    },
    create(data: Partial<Vehicle> & { customerId: string; plate: string }): Vehicle {
      const db = load();
      const v: Vehicle = {
        id: newId('veh'), customerId: data.customerId, plate: data.plate.toUpperCase(),
        countryOfPlate: (data.countryOfPlate ?? 'SI').toUpperCase(), vin: data.vin, make: data.make,
        model: data.model, year: data.year, type: data.type ?? 'truck', odometerLast: data.odometerLast, createdAt: nowIso(),
      };
      db.vehicles.unshift(v);
      logActivity('vehicle_created', `Novo vozilo: ${v.plate}`, 'vehicle', v.id);
      persist();
      return v;
    },
    update(id: string, patch: Partial<Vehicle>): Vehicle | undefined {
      const db = load(); const v = db.vehicles.find((x) => x.id === id);
      if (!v) return undefined; Object.assign(v, patch); persist(); return v;
    },
  },

  mechanics: { list(): Mechanic[] { return [...load().mechanics]; } },

  // ---- work orders ----
  workOrders: {
    list(filter?: { customerId?: string; vehicleId?: string; status?: WorkOrderStatus }): WorkOrder[] {
      let all = [...load().workOrders];
      if (filter?.customerId) all = all.filter((w) => w.customerId === filter.customerId);
      if (filter?.vehicleId) all = all.filter((w) => w.vehicleId === filter.vehicleId);
      if (filter?.status) all = all.filter((w) => w.status === filter.status);
      return all;
    },
    get(id: string): WorkOrder | undefined { return load().workOrders.find((w) => w.id === id); },
    create(data: { customerId: string; vehicleId: string; complaint?: string; mechanicId?: string }): WorkOrder {
      const db = load();
      const w: WorkOrder = {
        id: newId('wo'), number: nextNumber('wo'), customerId: data.customerId, vehicleId: data.vehicleId,
        status: 'reception', complaint: data.complaint, mechanicId: data.mechanicId, lines: [],
        voiceNoteIds: [], plateScanIds: [], createdAt: nowIso(), updatedAt: nowIso(),
      };
      db.workOrders.unshift(w);
      const veh = db.vehicles.find((v) => v.id === w.vehicleId);
      logActivity('work_order_created', `Nov delovni nalog ${w.number}${veh ? ` · ${veh.plate}` : ''}`, 'work_order', w.id);
      notify('work_order_new', `Nov delovni nalog ${w.number}`, veh?.plate, 'work_order', w.id);
      persist();
      return w;
    },
    addLine(id: string, line: Omit<DocLine, 'id'>): WorkOrder | undefined {
      const db = load(); const w = db.workOrders.find((x) => x.id === id);
      if (!w) return undefined;
      w.lines.push({ id: newId('ln'), ...line }); w.updatedAt = nowIso();
      logActivity('line_added', `Dodano na nalog ${w.number}: ${line.description}`, 'work_order', w.id);
      persist();
      return w;
    },
    removeLine(id: string, lineId: string): WorkOrder | undefined {
      const db = load(); const w = db.workOrders.find((x) => x.id === id);
      if (!w) return undefined;
      w.lines = w.lines.filter((l) => l.id !== lineId); w.updatedAt = nowIso(); persist(); return w;
    },
    setStatus(id: string, status: WorkOrderStatus): WorkOrder | undefined {
      const db = load(); const w = db.workOrders.find((x) => x.id === id);
      if (!w) return undefined;
      w.status = status; w.updatedAt = nowIso();
      logActivity('work_order_status', `Nalog ${w.number} → ${status}`, 'work_order', w.id);
      if (status === 'ready') {
        const veh = db.vehicles.find((v) => v.id === w.vehicleId);
        notify('vehicle_ready', `Vozilo pripravljeno`, `${veh?.plate ?? ''} · nalog ${w.number}`, 'work_order', w.id);
      }
      persist();
      return w;
    },
    assignMechanic(id: string, mechanicId: string): WorkOrder | undefined {
      const db = load(); const w = db.workOrders.find((x) => x.id === id);
      if (!w) return undefined;
      w.mechanicId = mechanicId; w.updatedAt = nowIso();
      const m = db.mechanics.find((x) => x.id === mechanicId);
      logActivity('mechanic_assigned', `Nalog ${w.number} dodeljen: ${m?.name ?? mechanicId}`, 'work_order', w.id);
      notify('mechanic_assigned', `Dodeljen mehanik`, `${m?.name ?? ''} · nalog ${w.number}`, 'work_order', w.id);
      persist();
      return w;
    },
    totals(id: string): Totals { const w = demoStore.workOrders.get(id); return totals(w?.lines ?? []); },
  },

  // ---- estimates (predračuni) ----
  estimates: {
    list(filter?: { customerId?: string }): Estimate[] {
      const all = [...load().estimates];
      return filter?.customerId ? all.filter((e) => e.customerId === filter.customerId) : all;
    },
    get(id: string): Estimate | undefined { return load().estimates.find((e) => e.id === id); },
    create(data: { customerId: string; vehicleId?: string; lines?: DocLine[]; workOrderId?: string }): Estimate {
      const db = load();
      const e: Estimate = {
        id: newId('est'), number: nextNumber('est'), customerId: data.customerId, vehicleId: data.vehicleId,
        workOrderId: data.workOrderId, status: 'draft', lines: data.lines ?? [], createdAt: nowIso(),
      };
      db.estimates.unshift(e);
      logActivity('estimate_created', `Nov predračun ${e.number}`, 'estimate', e.id);
      persist();
      return e;
    },
    fromWorkOrder(workOrderId: string): Estimate | undefined {
      const w = demoStore.workOrders.get(workOrderId);
      if (!w) return undefined;
      const e = demoStore.estimates.create({
        customerId: w.customerId, vehicleId: w.vehicleId, workOrderId: w.id,
        lines: w.lines.map((l) => ({ ...l, id: newId('ln') })),
      });
      return e;
    },
    setStatus(id: string, status: EstimateStatus): Estimate | undefined {
      const db = load(); const e = db.estimates.find((x) => x.id === id);
      if (!e) return undefined; e.status = status;
      if (status === 'sent') notify('estimate_sent', `Predračun poslan ${e.number}`, undefined, 'estimate', e.id);
      persist(); return e;
    },
    update(id: string, patch: Partial<Pick<Estimate, 'customerId' | 'vehicleId' | 'workOrderId' | 'lines' | 'status'>>): Estimate | undefined {
      const db = load(); const e = db.estimates.find((x) => x.id === id);
      if (!e) return undefined;
      Object.assign(e, patch);
      persist(); return e;
    },
    toInvoice(id: string): Invoice | undefined {
      const db = load(); const e = db.estimates.find((x) => x.id === id);
      if (!e) return undefined;
      const inv = demoStore.invoices.create({
        customerId: e.customerId, vehicleId: e.vehicleId, workOrderId: e.workOrderId, estimateId: e.id,
        lines: e.lines.map((l) => ({ ...l, id: newId('ln') })),
      });
      e.status = 'invoiced';
      logActivity('estimate_to_invoice', `Predračun ${e.number} → račun ${inv.number}`, 'invoice', inv.id);
      persist();
      return inv;
    },
  },

  // ---- invoices (računi) ----
  invoices: {
    list(filter?: { customerId?: string; status?: InvoiceStatus }): Invoice[] {
      let all = [...load().invoices];
      if (filter?.customerId) all = all.filter((i) => i.customerId === filter.customerId);
      if (filter?.status) all = all.filter((i) => i.status === filter.status);
      return all;
    },
    get(id: string): Invoice | undefined { return load().invoices.find((i) => i.id === id); },
    create(data: { customerId: string; vehicleId?: string; workOrderId?: string; estimateId?: string; lines?: DocLine[] }): Invoice {
      const db = load();
      const inv: Invoice = {
        id: newId('inv'), number: nextNumber('inv'), customerId: data.customerId, vehicleId: data.vehicleId,
        workOrderId: data.workOrderId, estimateId: data.estimateId, status: 'draft',
        lines: data.lines ?? [], minimaxSync: 'none', createdAt: nowIso(),
      };
      db.invoices.unshift(inv); persist(); return inv;
    },
    fromWorkOrder(workOrderId: string): Invoice | undefined {
      const w = demoStore.workOrders.get(workOrderId);
      if (!w) return undefined;
      const inv = demoStore.invoices.create({
        customerId: w.customerId, vehicleId: w.vehicleId, workOrderId: w.id,
        lines: w.lines.map((l) => ({ ...l, id: newId('ln') })),
      });
      demoStore.workOrders.setStatus(w.id, 'invoiced');
      return inv;
    },
    issue(id: string): Invoice | undefined {
      const db = load(); const inv = db.invoices.find((x) => x.id === id);
      if (!inv) return undefined;
      const cust = db.customers.find((c) => c.id === inv.customerId);
      const terms = cust?.paymentTermsDays ?? 30;
      inv.status = 'issued'; inv.issueDate = nowIso();
      inv.dueDate = new Date(Date.now() + terms * 86400000).toISOString();
      inv.minimaxSync = db.settings.integrations.minimax ? 'queued' : 'none';
      logActivity('invoice_issued', `Izdan račun ${inv.number}`, 'invoice', inv.id);
      notify('invoice_issued', `Izdan račun ${inv.number}`, undefined, 'invoice', inv.id);
      persist();
      return inv;
    },
    recordPayment(id: string): Invoice | undefined {
      const db = load(); const inv = db.invoices.find((x) => x.id === id);
      if (!inv) return undefined;
      inv.status = 'paid'; inv.paidDate = nowIso();
      logActivity('invoice_paid', `Plačan račun ${inv.number}`, 'invoice', inv.id);
      persist(); return inv;
    },
    creditNote(id: string): Invoice | undefined {
      const db = load(); const inv = db.invoices.find((x) => x.id === id);
      if (!inv) return undefined;
      inv.status = 'credited';
      logActivity('invoice_credited', `Dobropis za račun ${inv.number}`, 'invoice', inv.id);
      persist(); return inv;
    },
    setMinimaxSync(id: string, state: MinimaxSync): Invoice | undefined {
      const db = load(); const inv = db.invoices.find((x) => x.id === id);
      if (!inv) return undefined;
      inv.minimaxSync = state;
      logActivity('minimax_sync', `Minimax: račun ${inv.number} → ${state}`, 'invoice', inv.id);
      if (state === 'failed') notify('minimax_failed', `Napaka pri Minimax sinhronizaciji`, `Račun ${inv.number}`, 'invoice', inv.id);
      persist(); return inv;
    },
    totals(id: string): Totals { const inv = demoStore.invoices.get(id); return totals(inv?.lines ?? []); },
  },

  // ---- voice / plate / messages / appointments ----
  voiceNotes: {
    list(workOrderId?: string): VoiceNote[] { const all = load().voiceNotes; return workOrderId ? all.filter((n) => n.workOrderId === workOrderId) : [...all]; },
    create(data: { transcript: string; workOrderId?: string }): VoiceNote {
      const db = load(); const n: VoiceNote = { id: newId('voc'), transcript: data.transcript, workOrderId: data.workOrderId, createdAt: nowIso() };
      db.voiceNotes.unshift(n);
      if (data.workOrderId) { const w = db.workOrders.find((x) => x.id === data.workOrderId); if (w) w.voiceNoteIds.push(n.id); }
      logActivity('voice_captured', `Glasovni zapis zajet`, 'voice', n.id);
      persist(); return n;
    },
  },
  plateScans: {
    list(): PlateScan[] { return [...load().plateScans]; },
    create(data: { plate: string; countryOfPlate?: string; vehicleId?: string }): PlateScan {
      const db = load(); const p: PlateScan = { id: newId('plt'), plate: data.plate.toUpperCase(), countryOfPlate: data.countryOfPlate, vehicleId: data.vehicleId, createdAt: nowIso() };
      db.plateScans.unshift(p);
      logActivity('plate_scanned', `Skenirana tablica ${p.plate}`, 'plate', p.id);
      persist(); return p;
    },
  },
  messages: {
    list(threadId?: string): Message[] { const all = load().messages; return threadId ? all.filter((m) => m.threadId === threadId) : [...all]; },
    send(data: { threadId: string; customerId?: string; channel?: 'sms' | 'email'; body: string }): Message {
      const db = load(); const m: Message = { id: newId('msg'), threadId: data.threadId, customerId: data.customerId, direction: 'out', channel: data.channel ?? 'sms', body: data.body, createdAt: nowIso() };
      db.messages.push(m);
      logActivity('message_sent', `Sporočilo poslano`, 'message', m.id);
      persist(); return m;
    },
  },
  appointments: {
    list(): Appointment[] { return [...load().appointments]; },
    create(data: Omit<Appointment, 'id' | 'createdAt'>): Appointment {
      const db = load(); const a: Appointment = { id: newId('apt'), ...data, createdAt: nowIso() };
      db.appointments.push(a); persist(); return a;
    },
  },

  // ---- notifications ----
  notifications: {
    list(): Notification[] { return [...load().notifications]; },
    unreadCount(): number { return load().notifications.filter((n) => !n.read).length; },
    markRead(id: string): void { const db = load(); const n = db.notifications.find((x) => x.id === id); if (n) { n.read = true; persist(); } },
    markAllRead(): void { const db = load(); db.notifications.forEach((n) => { n.read = true; }); persist(); },
  },

  // ---- activity ----
  activity: { list(limit = 30): Activity[] { return load().activity.slice(0, limit); } },

  // ---- settings ----
  settings: {
    get(): Settings { return load().settings; },
    update(patch: Partial<Settings>): Settings {
      const db = load();
      db.settings = { ...db.settings, ...patch, company: { ...db.settings.company, ...(patch.company ?? {}) }, integrations: { ...db.settings.integrations, ...(patch.integrations ?? {}) } };
      persist(); return db.settings;
    },
  },

  // ---- inventory items (catalogue + stock + batches) ----
  items: {
    list(q?: string): Item[] {
      const all = [...load().items];
      if (!q) return all;
      const s = q.toLowerCase();
      return all.filter((i) =>
        i.name.toLowerCase().includes(s) || i.sku.toLowerCase().includes(s) ||
        (i.oemRef ?? '').toLowerCase().includes(s) || (i.barcode ?? '').toLowerCase().includes(s));
    },
    get(id: string): Item | undefined { return load().items.find((i) => i.id === id); },
    quickAdd(): Item[] { return load().items.filter((i) => i.quickAdd && i.active); },
    lowStock(): Item[] { return load().items.filter(itemIsLow); },
    valuationMinor(): number {
      return load().items.reduce((s, i) => s + i.onHand * (i.costMinor ?? i.priceMinor), 0);
    },
    /** Catalogue projection matching api.inventory.search (string money fields). */
    catalogue(it: Item): { id: string; name: string; sku: string; oemRef: string | null; priceMinor: string; vatRatePct: string; unit: string } {
      return { id: it.id, name: it.name, sku: it.sku, oemRef: it.oemRef ?? null, priceMinor: String(it.priceMinor), vatRatePct: String(it.vatRatePct), unit: it.unit };
    },
    create(data: Partial<Item> & { name: string }): Item {
      const db = load();
      const it: Item = {
        id: newId('item'), sku: (data.sku && data.sku.trim()) || nextSku(), name: data.name,
        oemRef: data.oemRef, barcode: data.barcode, kind: data.kind ?? 'part', unit: data.unit ?? 'kos',
        category: data.category, priceMinor: data.priceMinor ?? 0, costMinor: data.costMinor,
        vatRatePct: data.vatRatePct ?? db.settings.vatRatePct, supplierName: data.supplierName, supplierSku: data.supplierSku,
        preferredSupplierId: data.preferredSupplierId,
        onHand: data.onHand ?? 0, reserved: data.reserved ?? 0, reorderPoint: data.reorderPoint ?? 0, bin: data.bin,
        batches: data.batches ?? [], active: data.active ?? true, quickAdd: data.quickAdd ?? false, notes: data.notes,
        createdAt: nowIso(), updatedAt: nowIso(),
      };
      db.items.unshift(it);
      logActivity('item_created', `Nov artikel: ${it.name} (${it.sku})`, 'inventory_item', it.id);
      if (itemIsLow(it)) notify('low_stock', 'Nizka zaloga', `${it.name} · ${it.onHand} ${it.unit}`, 'inventory_item', it.id);
      persist();
      return it;
    },
    update(id: string, patch: Partial<Item>): Item | undefined {
      const db = load(); const it = db.items.find((x) => x.id === id);
      if (!it) return undefined;
      const wasLow = itemIsLow(it);
      Object.assign(it, patch); it.updatedAt = nowIso();
      logActivity('item_updated', `Urejen artikel: ${it.name} (${it.sku})`, 'inventory_item', it.id);
      if (!wasLow && itemIsLow(it)) notify('low_stock', 'Nizka zaloga', `${it.name} · ${it.onHand} ${it.unit}`, 'inventory_item', it.id);
      persist();
      return it;
    },
    /** Receive stock (optionally as a tracked batch). Increments on-hand. */
    receive(id: string, qty: number, opts?: { batchNo?: string; expiry?: string; costMinor?: number }): Item | undefined {
      const db = load(); const it = db.items.find((x) => x.id === id);
      if (!it || qty <= 0) return it;
      it.onHand += qty;
      if (opts?.batchNo || opts?.expiry || opts?.costMinor != null) {
        it.batches.unshift({ id: newId('btc'), batchNo: opts?.batchNo, qty, expiry: opts?.expiry, costMinor: opts?.costMinor, receivedAt: nowIso() });
      }
      if (opts?.costMinor != null) it.costMinor = opts.costMinor;
      it.updatedAt = nowIso();
      logActivity('item_received', `Prejem ${qty} ${it.unit} · ${it.name}${opts?.batchNo ? ` (šarža ${opts.batchNo})` : ''}`, 'inventory_item', it.id);
      persist();
      return it;
    },
    /** Manual stock correction (stocktake). Sets absolute on-hand. */
    adjust(id: string, newOnHand: number, reason?: string): Item | undefined {
      const db = load(); const it = db.items.find((x) => x.id === id);
      if (!it) return undefined;
      const delta = newOnHand - it.onHand; it.onHand = Math.max(0, newOnHand); it.updatedAt = nowIso();
      logActivity('stock_adjusted', `Popravek zaloge · ${it.name}: ${delta >= 0 ? '+' : ''}${delta} ${it.unit}${reason ? ` (${reason})` : ''}`, 'inventory_item', it.id);
      if (itemIsLow(it)) notify('low_stock', 'Nizka zaloga', `${it.name} · ${it.onHand} ${it.unit}`, 'inventory_item', it.id);
      persist();
      return it;
    },
  },

  // ---- service packages / presets ----
  presets: {
    all(): Preset[] { return [...load().presets]; },
    active(): Preset[] { return load().presets.filter((p) => p.active); },
    get(id: string): Preset | undefined { return load().presets.find((p) => p.id === id); },
    grossMinor(p: Preset): number {
      return p.lines.reduce((s, l) => s + Math.round(l.qty * l.unitPriceMinor * (1 + l.vatRatePct / 100)), 0);
    },
    create(data: Partial<Preset> & { name: string }): Preset {
      const db = load();
      const p: Preset = {
        id: newId('pk'), name: data.name, description: data.description,
        vehicleClasses: data.vehicleClasses ?? [], powertrains: data.powertrains ?? [],
        lines: (data.lines ?? []).map((l) => ({ id: l.id ?? newId('pl'), kind: l.kind ?? 'part', description: l.description ?? '', itemId: l.itemId, qty: l.qty ?? 1, unitPriceMinor: l.unitPriceMinor ?? 0, vatRatePct: l.vatRatePct ?? db.settings.vatRatePct })),
        active: data.active ?? true, createdAt: nowIso(), updatedAt: nowIso(),
      };
      db.presets.unshift(p);
      logActivity('item_created', `Nov servisni paket: ${p.name}`, 'preset', p.id);
      persist();
      return p;
    },
    update(id: string, patch: Partial<Preset>): Preset | undefined {
      const db = load(); const p = db.presets.find((x) => x.id === id);
      if (!p) return undefined; Object.assign(p, patch); p.updatedAt = nowIso(); persist(); return p;
    },
    remove(id: string): void {
      const db = load(); db.presets = db.presets.filter((p) => p.id !== id); persist();
    },
  },

  // ---- dashboard (derived; never hardcoded) ----
  dashboard: {
    stats() {
      const db = load();
      const openWO = db.workOrders.filter((w) => !['invoiced', 'closed', 'cancelled'].includes(w.status)).length;
      const readyVehicles = db.workOrders.filter((w) => w.status === 'ready').length;
      const unpaid = db.invoices.filter((i) => i.status === 'issued' || i.status === 'overdue');
      const unpaidMinor = unpaid.reduce((s, i) => s + totals(i.lines).grossMinor, 0);
      const overdue = db.invoices.filter((i) => i.status === 'overdue').length;
      const today = new Date().toISOString().slice(0, 10);
      const todayRevenueMinor = db.invoices
        .filter((i) => (i.issueDate ?? '').slice(0, 10) === today && (i.status === 'issued' || i.status === 'paid'))
        .reduce((s, i) => s + totals(i.lines).grossMinor, 0);
      return { openWO, readyVehicles, unpaidCount: unpaid.length, unpaidMinor, overdue, todayRevenueMinor, customers: db.customers.length, vehicles: db.vehicles.length };
    },
  },

  // ---- global search (across the connected entities) ----
  search(q: string): Array<{ type: string; id: string; label: string; sublabel?: string }> {
    const db = load(); const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const out: Array<{ type: string; id: string; label: string; sublabel?: string }> = [];
    for (const c of db.customers) if (c.name.toLowerCase().includes(s) || (c.vatId ?? '').toLowerCase().includes(s)) out.push({ type: 'customer', id: c.id, label: c.name, sublabel: c.vatId ?? c.city });
    for (const v of db.vehicles) if (v.plate.toLowerCase().includes(s) || (v.vin ?? '').toLowerCase().includes(s)) out.push({ type: 'vehicle', id: v.id, label: v.plate, sublabel: [v.make, v.model].filter(Boolean).join(' ') });
    for (const w of db.workOrders) if (w.number.toLowerCase().includes(s)) out.push({ type: 'work_order', id: w.id, label: `Nalog ${w.number}`, sublabel: w.status });
    for (const i of db.invoices) if (i.number.toLowerCase().includes(s)) out.push({ type: 'invoice', id: i.id, label: `Račun ${i.number}`, sublabel: i.status });
    return out.slice(0, 12);
  },
};

// ----------------------------------------------------------------------------
// Seed — a small, realistic Slovenian dataset so the demo is alive on first run
// ----------------------------------------------------------------------------
function seed(db: DB): DB {
  db.mechanics = [
    { id: 'mech-1', name: 'Marko Novak' },
    { id: 'mech-2', name: 'Janez Horvat' },
  ];

  const c1: Customer = { id: 'cus-1', code: 'K-001', name: 'Transport Horvat d.o.o.', type: 'company', country: 'SI', address: 'Cesta v Mestni log 12', postCode: '1000', city: 'Ljubljana', vatLiable: true, vatId: 'SI11223344', taxId: '11223344', registrationNo: '1234567000', currency: 'EUR', paymentTermsDays: 30, discountPct: 0, phone: '+386 41 111 222', createdAt: nowIso() };
  const c2: Customer = { id: 'cus-2', code: 'K-002', name: 'Logistika Kranj d.o.o.', type: 'company', country: 'SI', address: 'Industrijska 5', postCode: '4000', city: 'Kranj', vatLiable: true, vatId: 'SI55667788', taxId: '55667788', registrationNo: '7654321000', currency: 'EUR', paymentTermsDays: 45, discountPct: 5, phone: '+386 41 333 444', createdAt: nowIso() };
  const c3: Customer = { id: 'cus-3', code: 'K-003', name: 'Prevozi Novak s.p.', type: 'company', country: 'SI', address: 'Kolodvorska 3', postCode: '8340', city: 'Črnomelj', vatLiable: true, vatId: 'SI99887766', taxId: '99887766', registrationNo: '2233445000', currency: 'EUR', paymentTermsDays: 15, discountPct: 0, phone: '+386 41 555 666', createdAt: nowIso() };
  db.customers = [c1, c2, c3];

  const v1: Vehicle = { id: 'veh-1', customerId: c1.id, plate: 'LJ AB-123', countryOfPlate: 'SI', vin: 'WDB9634031L123456', make: 'Mercedes-Benz', model: 'Actros 1845', year: 2019, type: 'tractor', powertrain: 'diesel', odometerLast: 612000, createdAt: nowIso() };
  const v2: Vehicle = { id: 'veh-2', customerId: c1.id, plate: 'LJ PR-456', countryOfPlate: 'SI', make: 'Krone', model: 'SD', year: 2020, type: 'trailer', createdAt: nowIso() };
  const v3: Vehicle = { id: 'veh-3', customerId: c2.id, plate: 'KR CD-789', countryOfPlate: 'SI', vin: 'XLRTE47MS0E654321', make: 'DAF', model: 'XD Electric', year: 2024, type: 'truck', powertrain: 'electric', odometerLast: 88000, createdAt: nowIso() };
  db.vehicles = [v1, v2, v3];

  // One work order in progress with a couple of lines
  const w1: WorkOrder = {
    id: 'wo-1', number: '2026-1007', customerId: c1.id, vehicleId: v1.id, status: 'in_progress',
    complaint: 'Cviljenje zavor spredaj, vibracije pri zaviranju.', diagnosis: 'Obrabljene sprednje zavorne ploščice in diski.',
    mechanicId: 'mech-1',
    lines: [
      { id: 'ln-1', kind: 'labour', description: 'Menjava sprednjih zavor (delo)', qty: 2, unitPriceMinor: 6500, vatRatePct: 22 },
      { id: 'ln-2', kind: 'part', description: 'Set zavornih ploščic spredaj', qty: 1, unitPriceMinor: 18500, vatRatePct: 22 },
      { id: 'ln-3', kind: 'part', description: 'Zavorni disk (par)', qty: 1, unitPriceMinor: 24000, vatRatePct: 22 },
    ],
    voiceNoteIds: [], plateScanIds: [], createdAt: nowIso(), updatedAt: nowIso(),
  };
  db.workOrders = [w1];

  // One issued invoice (and one overdue) so dashboard/reports have data
  const inv1: Invoice = {
    id: 'inv-1', number: 'INV-2026-000101', customerId: c2.id, vehicleId: v3.id, status: 'issued',
    lines: [{ id: 'ln-i1', kind: 'service', description: 'Servis 80.000 km', qty: 1, unitPriceMinor: 52000, vatRatePct: 22 }],
    issueDate: nowIso(), dueDate: new Date(Date.now() + 30 * 86400000).toISOString(), minimaxSync: 'none', createdAt: nowIso(),
  };
  const inv2: Invoice = {
    id: 'inv-late', number: 'INV-2026-000088', customerId: c1.id, vehicleId: v1.id, status: 'overdue',
    lines: [{ id: 'ln-i2', kind: 'service', description: 'Popravilo menjalnika', qty: 1, unitPriceMinor: 196700, vatRatePct: 22 }],
    issueDate: new Date(Date.now() - 70 * 86400000).toISOString(), dueDate: new Date(Date.now() - 40 * 86400000).toISOString(), minimaxSync: 'synced', createdAt: nowIso(),
  };
  db.invoices = [inv1, inv2];

  // Seed a few events so the bell + activity feed are alive immediately
  db.notifications = [
    { id: 'ntf-seed-1', kind: 'invoice_overdue', title: 'Zapadel račun', body: `${inv2.number} · ${c1.name}`, entityType: 'invoice', entityId: inv2.id, read: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'ntf-seed-2', kind: 'work_order_new', title: `Delovni nalog ${w1.number}`, body: v1.plate, entityType: 'work_order', entityId: w1.id, read: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'ntf-seed-3', kind: 'low_stock', title: 'Nizka zaloga', body: 'Metlica brisalca 650mm · 3 kos', entityType: 'inventory_item', entityId: 'item-wiper', read: false, createdAt: new Date(Date.now() - 5400000).toISOString() },
  ];
  db.activity = [
    { id: 'act-seed-1', kind: 'invoice_issued', message: `Izdan račun ${inv1.number}`, entityType: 'invoice', entityId: inv1.id, actor: 'Vi', createdAt: new Date(Date.now() - 1800000).toISOString() },
    { id: 'act-seed-2', kind: 'work_order_created', message: `Nov delovni nalog ${w1.number} · ${v1.plate}`, entityType: 'work_order', entityId: w1.id, actor: 'Vi', createdAt: new Date(Date.now() - 7200000).toISOString() },
  ];

  // Inventory catalogue (these also feed the work-order parts picker)
  const t = nowIso();
  db.items = [
    { id: 'item-pad', sku: 'BP-FR-ACT', name: 'Set zavornih ploščic spredaj', oemRef: '0034205220', kind: 'part', unit: 'set', category: 'Zavore', priceMinor: 18500, costMinor: 11900, vatRatePct: 22, supplierName: 'AD Auto Parts d.o.o.', onHand: 6, reserved: 1, reorderPoint: 3, bin: 'A-12', batches: [], active: true, createdAt: t, updatedAt: t },
    { id: 'item-disc', sku: 'BD-FR-ACT', name: 'Zavorni disk spredaj (par)', oemRef: '0004212312', kind: 'part', unit: 'par', category: 'Zavore', priceMinor: 24000, costMinor: 15600, vatRatePct: 22, supplierName: 'AD Auto Parts d.o.o.', onHand: 4, reserved: 0, reorderPoint: 2, bin: 'A-13', batches: [], active: true, createdAt: t, updatedAt: t },
    { id: 'item-oil', sku: 'OIL-1040', name: 'Motorno olje 10W-40', kind: 'fluid', unit: 'L', category: 'Olja in tekočine', priceMinor: 650, costMinor: 420, vatRatePct: 22, supplierName: 'Petrol d.d.', onHand: 180, reserved: 0, reorderPoint: 40, bin: 'C-01', quickAdd: true, batches: [{ id: 'btc-oil-1', batchNo: 'OIL-2026-04', qty: 180, expiry: new Date(Date.now() + 540 * 86400000).toISOString().slice(0, 10), costMinor: 420, receivedAt: t }], active: true, createdAt: t, updatedAt: t },
    { id: 'item-airf', sku: 'AF-2245', name: 'Zračni filter', oemRef: 'C 30 1500', kind: 'part', unit: 'kos', category: 'Filtri', priceMinor: 3800, costMinor: 2400, vatRatePct: 22, supplierName: 'AD Auto Parts d.o.o.', onHand: 12, reserved: 0, reorderPoint: 4, bin: 'B-04', batches: [], active: true, quickAdd: true, createdAt: t, updatedAt: t },
    { id: 'item-wiper', sku: 'WB-650', name: 'Metlica brisalca 650mm', kind: 'consumable', unit: 'kos', category: 'Drobni material', priceMinor: 1400, costMinor: 820, vatRatePct: 22, onHand: 3, reserved: 0, reorderPoint: 4, bin: 'D-09', batches: [], active: true, quickAdd: true, createdAt: t, updatedAt: t },
  ];

  // Service packages (reference the catalogue items seeded above). Tags scope
  // them by class + powertrain; empty = applies to all.
  db.presets = [
    { id: 'pk-brake-front', name: 'Menjava sprednjih zavor', description: 'Ploščice + diski spredaj, z delom.',
      vehicleClasses: ['tractor', 'truck', 'van'], powertrains: [], active: true, createdAt: t, updatedAt: t, lines: [
        { id: 'pl-1', kind: 'labour', description: 'Menjava sprednjih zavor (delo)', qty: 2, unitPriceMinor: 6500, vatRatePct: 22 },
        { id: 'pl-2', kind: 'part', itemId: 'item-pad', description: 'Set zavornih ploščic spredaj', qty: 1, unitPriceMinor: 18500, vatRatePct: 22 },
        { id: 'pl-3', kind: 'part', itemId: 'item-disc', description: 'Zavorni disk spredaj (par)', qty: 1, unitPriceMinor: 24000, vatRatePct: 22 },
      ] },
    { id: 'pk-service-120', name: 'Servis 120.000 km (dizel)', description: 'Olje in filtri za dizelski tovornjak.',
      vehicleClasses: ['tractor', 'truck'], powertrains: ['diesel'], active: true, createdAt: t, updatedAt: t, lines: [
        { id: 'pl-4', kind: 'labour', description: 'Veliki servis (delo)', qty: 3, unitPriceMinor: 6500, vatRatePct: 22 },
        { id: 'pl-5', kind: 'part', itemId: 'item-oil', description: 'Motorno olje 10W-40', qty: 30, unitPriceMinor: 650, vatRatePct: 22 },
        { id: 'pl-6', kind: 'part', itemId: 'item-airf', description: 'Zračni filter', qty: 1, unitPriceMinor: 3800, vatRatePct: 22 },
      ] },
    { id: 'pk-ev-service', name: 'Servis električnega vozila', description: 'Pregled HV baterije, zavorna tekočina, kabinski filter — brez olja.',
      vehicleClasses: ['tractor', 'truck', 'van'], powertrains: ['electric', 'hybrid'], active: true, createdAt: t, updatedAt: t, lines: [
        { id: 'pl-7', kind: 'labour', description: 'Pregled HV sistema in baterije (delo)', qty: 1.5, unitPriceMinor: 6500, vatRatePct: 22 },
        { id: 'pl-8', kind: 'labour', description: 'Menjava zavorne tekočine (delo)', qty: 0.5, unitPriceMinor: 6500, vatRatePct: 22 },
      ] },
    { id: 'pk-trailer', name: 'Servis priklopnika', description: 'Zavore, vzmetenje, luči, EBS.',
      vehicleClasses: ['trailer'], powertrains: [], active: true, createdAt: t, updatedAt: t, lines: [
        { id: 'pl-9', kind: 'labour', description: 'Pregled in nastavitev zavor priklopnika (delo)', qty: 2, unitPriceMinor: 6500, vatRatePct: 22 },
      ] },
  ];

  db.seq = 1010;
  return db;
}
