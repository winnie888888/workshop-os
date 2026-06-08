/*
 * Import sink (P1 step 4) — commits a confirmed DryRunResult into the shared
 * demo store, the single source of truth every role reads from. The pure engine
 * never persists; this app-layer adapter maps engine field keys onto the demo
 * entity shapes and performs an idempotent upsert (create new / update matched).
 *
 * Relations are resolved here: an imported vehicle is linked to its owner
 * (customerName → existing customer). Rows the planner marked skip/error are
 * never written. Invoices are intentionally not committed yet — the demo
 * invoice model is line/work-order based; external-invoice import belongs with
 * the accounting import (e-SLOG, prejeti računi) in a later phase.
 *
 * In real mode this same step will POST to the NestJS confirm endpoint instead;
 * the contract (DryRunResult in, counts out) stays identical.
 */
import { demoStore } from '@/lib/demo-store';
import type { Powertrain, VehicleType } from '@/lib/demo-store';
import { normEmail, normKey, normName, normVatId } from '@/lib/import-engine';
import type { DryRunResult, RowResult } from '@/lib/import-engine';

export interface CommitResult {
  entity: string;
  created: number;
  updated: number;
  /** Rows not written (planner skips/errors + rows we could not link). */
  skipped: number;
  /** Human notes, e.g. vehicles whose owner could not be resolved. */
  notes: string[];
}

/** Entities whose confirm step can write into the demo store today. */
export function canCommit(entity: string): boolean {
  return entity === 'companies' || entity === 'products' || entity === 'vehicles';
}

export function commitImport(entity: string, dry: DryRunResult): CommitResult {
  switch (entity) {
    case 'companies': return commitCompanies(dry);
    case 'products': return commitProducts(dry);
    case 'vehicles': return commitVehicles(dry);
    default:
      return { entity, created: 0, updated: 0, skipped: dry.total, notes: ['Zapis v bazo za to entiteto še ni na voljo.'] };
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function base(entity: string, dry: DryRunResult): CommitResult {
  return { entity, created: 0, updated: 0, skipped: dry.skipped + dry.errored, notes: [] };
}

/** Rows the planner approved for writing. */
function writable(dry: DryRunResult): RowResult[] {
  return dry.rows.filter((r) => r.outcome === 'create' || r.outcome === 'update');
}

/** Drop empty values so we never overwrite stored data with blanks. */
function clean(o: Record<string, any>): Record<string, any> {
  for (const k of Object.keys(o)) if (o[k] === undefined || o[k] === null) delete o[k];
  return o;
}

function note(res: CommitResult, msg: string) {
  if (!res.notes.includes(msg)) res.notes.push(msg);
}

// ---------------------------------------------------------------------------
// companies → Customer
// ---------------------------------------------------------------------------

function findCustomer(rec: Record<string, any>) {
  const list = demoStore.customers.list();
  if (rec.vatId) { const v = normVatId(rec.vatId); const m = list.find((c) => c.vatId && normVatId(c.vatId) === v); if (m) return m; }
  if (rec.registrationNo) { const v = normKey(rec.registrationNo); const m = list.find((c) => c.registrationNo && normKey(c.registrationNo) === v); if (m) return m; }
  if (rec.email) { const v = normEmail(rec.email); const m = list.find((c) => c.email && normEmail(c.email) === v); if (m) return m; }
  if (rec.name) { const v = normName(rec.name); const m = list.find((c) => normName(c.name) === v); if (m) return m; }
  return undefined;
}

function commitCompanies(dry: DryRunResult): CommitResult {
  const res = base('companies', dry);
  for (const r of writable(dry)) {
    const rec = r.record;
    const patch = clean({
      name: rec.name, vatId: rec.vatId, registrationNo: rec.registrationNo,
      country: rec.country, address: rec.address, city: rec.city, postCode: rec.postCode,
      email: rec.email, phone: rec.phone, paymentTermsDays: rec.paymentTermsDays,
    });
    const match = findCustomer(rec);
    if (match) { demoStore.customers.update(match.id, patch); res.updated++; }
    else { demoStore.customers.create({ ...patch, name: String(rec.name) }); res.created++; }
  }
  return res;
}

// ---------------------------------------------------------------------------
// products → Item
// ---------------------------------------------------------------------------

function findItem(rec: Record<string, any>) {
  const list = demoStore.items.list();
  if (rec.sku) { const v = normKey(rec.sku); const m = list.find((i) => i.sku && normKey(i.sku) === v); if (m) return m; }
  if (rec.barcode) { const v = normKey(rec.barcode); const m = list.find((i) => i.barcode && normKey(i.barcode) === v); if (m) return m; }
  if (rec.supplierCode) { const v = normKey(rec.supplierCode); const m = list.find((i) => i.supplierSku && normKey(i.supplierSku) === v); if (m) return m; }
  return undefined;
}

function commitProducts(dry: DryRunResult): CommitResult {
  const res = base('products', dry);
  for (const r of writable(dry)) {
    const rec = r.record;
    const patch = clean({
      sku: rec.sku, barcode: rec.barcode, name: rec.name, notes: rec.description,
      oemRef: rec.oemRef, priceMinor: rec.priceMinor, vatRatePct: rec.vatRatePct,
      onHand: rec.onHand, unit: rec.unit, supplierName: rec.supplier, supplierSku: rec.supplierCode,
      category: rec.category,
    });
    const match = findItem(rec);
    if (match) { demoStore.items.update(match.id, patch); res.updated++; }
    else { demoStore.items.create({ ...patch, name: String(rec.name) }); res.created++; }
  }
  return res;
}

// ---------------------------------------------------------------------------
// vehicles → Vehicle (requires an owner; links customerName → customerId)
// ---------------------------------------------------------------------------

const TYPE_MAP: Record<string, VehicleType> = {
  tractor: 'tractor', truck: 'truck', van: 'van', trailer: 'trailer', car: 'other', bus: 'other',
};
const POWER_MAP: Record<string, Powertrain> = {
  diesel: 'diesel', petrol: 'petrol', electric: 'electric', hybrid: 'hybrid',
  cng: 'cng', lng: 'lng', hydrogen: 'hydrogen', lpg: 'other',
};

function resolveOwnerId(rec: Record<string, any>): string | undefined {
  const raw = rec.customerName;
  if (!raw) return undefined;
  const list = demoStore.customers.list();
  const byName = list.find((c) => normName(c.name) === normName(String(raw)));
  if (byName) return byName.id;
  const asVat = normVatId(String(raw));
  const byVat = list.find((c) => c.vatId && normVatId(c.vatId) === asVat);
  return byVat ? byVat.id : undefined;
}

function findVehicle(rec: Record<string, any>) {
  if (rec.plate) { const v = demoStore.vehicles.findByPlate(String(rec.plate)); if (v) return v; }
  if (rec.vin) { const vv = normKey(rec.vin); const m = demoStore.vehicles.list().find((v) => v.vin && normKey(v.vin) === vv); if (m) return m; }
  return undefined;
}

function commitVehicles(dry: DryRunResult): CommitResult {
  const res = base('vehicles', dry);
  for (const r of writable(dry)) {
    const rec = r.record;
    const patch = clean({
      plate: rec.plate, vin: rec.vin, make: rec.make, model: rec.model,
      type: rec.type ? (TYPE_MAP[String(rec.type).toLowerCase()] ?? 'other') : undefined,
      powertrain: rec.powertrain ? (POWER_MAP[String(rec.powertrain).toLowerCase()] ?? 'other') : undefined,
      odometerLast: rec.odometer, countryOfPlate: rec.plateCountry,
    });

    const existing = findVehicle(rec);
    if (existing) { demoStore.vehicles.update(existing.id, patch); res.updated++; continue; }

    const ownerId = resolveOwnerId(rec);
    if (!ownerId) {
      res.skipped++;
      note(res, 'Nekatera vozila niso bila uvožena: lastnika (stranke) ni bilo mogoče najti po nazivu/DDV. Najprej uvozi stranke, nato vozila.');
      continue;
    }
    demoStore.vehicles.create({ ...patch, plate: String(rec.plate), customerId: ownerId });
    res.created++;
  }
  return res;
}
