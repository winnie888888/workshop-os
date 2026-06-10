import { Injectable } from '@nestjs/common';
import { getContext } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';

/**
 * Activity feed — a human-readable window onto the audit chain.
 *
 * No new event system and no second source of truth: every business action in
 * this platform already lands in app.audit_log (append-only, hash-chained).
 * This service just READS the latest entries and renders each one as a short
 * Slovenian sentence for the dashboard. Pure plumbing entries (attachment
 * presigning, per-line edits, clock punches, periodic insight refreshes) are
 * filtered out so the advisor sees business moments, not noise.
 *
 * Response shape mirrors the demo store's Activity exactly:
 *   { id, kind, message, entityType, entityId, createdAt }
 */

type AfterDoc = Record<string, any> | null;
type LabelFn = (after: AfterDoc, before: AfterDoc) => string;

const EST_STATUS: Record<string, string> = {
  draft: 'osnutek', sent: 'poslan', accepted: 'sprejet', rejected: 'zavrnjen', invoiced: 'računiran',
};
const WO_STATUS: Record<string, string> = {
  draft: 'osnutek', open: 'odprt', in_progress: 'v delu', waiting_parts: 'čaka dele',
  ready: 'pripravljen', invoiced: 'računiran', closed: 'zaključen', cancelled: 'preklican',
};

const num = (a: AfterDoc) => (a?.number ? String(a.number) : '');
const withTail = (head: string, tail?: string) => (tail ? `${head} ${tail}`.trim() : head);
const eur = (minor: unknown) => {
  const n = Number(minor);
  return Number.isFinite(n) ? `${(n / 100).toFixed(2)} €` : '';
};

const LABELS: Record<string, LabelFn> = {
  // Front of house
  'estimate.created': (a) => withTail('Nov predračun', num(a)),
  'estimate.updated': () => 'Predračun posodobljen',
  'estimate.status_changed': (a) => `Predračun ${EST_STATUS[String(a?.status)] ?? a?.status ?? 'spremenjen'}`,
  'estimate.invoiced': (a) => withTail('Predračun → račun', a?.invoiceNumber ? String(a.invoiceNumber) : ''),
  'appointment.created': (a) => (a?.title ? `Nov termin — ${a.title}` : 'Nov termin'),
  'appointment.updated': (a) => (a?.title ? `Termin posodobljen — ${a.title}` : 'Termin posodobljen'),
  'appointment.deleted': (_a, b) => (b?.title ? `Termin izbrisan — ${b.title}` : 'Termin izbrisan'),
  'customer.created': (a) => withTail('Nova stranka —', a?.name ? String(a.name) : ''),
  'customer.updated': () => 'Stranka posodobljena',
  'customer.vat_id_validated': () => 'DDV ID potrjen (VIES)',
  'customer.vat_lookup': () => 'Hitri vnos: poizvedba v registru',
  'asset.created': (a) => withTail('Novo vozilo', a?.plate ? String(a.plate) : ''),
  'asset.updated': () => 'Vozilo posodobljeno',
  'asset.trailer_linked': () => 'Priklopnik povezan z vlačilcem',

  // Work orders
  'workorder.created': (a) => withTail('Nov delovni nalog', num(a)),
  'workorder.transitioned': (a) => {
    const to = String(a?.to ?? a?.status ?? '');
    return withTail(`Nalog ${num(a)}`.trim() || 'Nalog', `→ ${WO_STATUS[to] ?? to}`);
  },
  'workorder.assigned': () => 'Nalog dodeljen mehaniku',
  'voice.drafted': () => 'Glasovni osnutek naloga',
  'voice.created_work_order': () => 'Glasovni nalog ustvarjen',
  'voice.updated_work_order': () => 'Nalog dopolnjen z glasovnim zapisom',
  'plate.recognized': (a) => withTail('Tablica prepoznana', a?.plate ? String(a.plate) : ''),
  'plate.created_work_order': () => 'Tablica prepoznana → nov nalog',
  'plate.opened_work_order': () => 'Tablica prepoznana → odprt nalog',
  'field_service.recorded': () => 'Terenski servis zabeležen',

  // Money
  'invoice.issued': (a) => withTail('Izstavljen račun', num(a)),
  'invoice.credited': (a) => withTail('Dobropis', num(a)),
  'payment.recorded': (a) => withTail('Zabeleženo plačilo', eur(a?.amountMinor)),

  // Warehouse & purchasing
  'goods_receipt.draft_created': () => 'Osnutek prevzema blaga',
  'goods_receipt.posted': () => 'Prevzem blaga knjižen',
  'purchase_order.created': () => 'Novo naročilo dobavitelju',
  'stock.adjusted': () => 'Zaloga popravljena',
  'stock_count.opened': () => 'Inventura odprta',
  'stock_count.closed': () => 'Inventura zaključena',
  'supplier.created': (a) => withTail('Nov dobavitelj —', a?.name ? String(a.name) : ''),
  'supplier.updated': () => 'Dobavitelj posodobljen',
  'supplier.item_linked': () => 'Artikel povezan z dobaviteljem',
  'ocr.extracted': () => 'Dobavnica prebrana (OCR)',

  // Rental & fleet
  'rental.vehicle_created': () => 'Novo najemno vozilo',
  'rental.reserved': () => 'Najem rezerviran',
  'rental.contract_created': () => 'Najemna pogodba ustvarjena',
  'rental.handover': () => 'Najem — predaja vozila',
  'rental.return': () => 'Najem — vračilo vozila',
  'rental.invoiced': () => 'Najem zaračunan',
  'fleet.created': () => 'Nova flota',

  // People & travel
  'leave.requested': () => 'Zahteva za dopust',
  'attendance.corrected': () => 'Popravek evidence ur',
  'travel_order.created': () => 'Potni nalog ustvarjen',
  'travel_order.completed': () => 'Potni nalog zaključen',
  'service_vehicle.created': () => 'Novo servisno vozilo',
  'service_vehicle.assigned': () => 'Servisno vozilo dodeljeno',

  // Portal
  'portal.appointment.requested': () => 'Portal: zahteva za termin',
};

/** Last-resort humanizer so unmapped actions still read like words. */
function fallbackLabel(action: string): string {
  const [entity, verb] = action.split('.');
  const e = (entity ?? action).replace(/_/g, ' ');
  const v = (verb ?? '').replace(/_/g, ' ');
  const head = e.charAt(0).toUpperCase() + e.slice(1);
  return v ? `${head}: ${v}` : head;
}

export interface ActivityItem {
  id: string;
  kind: string;
  message: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

const tsIso = (v: any): string => (v instanceof Date ? v.toISOString() : String(v));

@Injectable()
export class ActivityService {
  constructor(private readonly pg: PgService) {}

  async list(limit: number): Promise<ActivityItem[]> {
    const ctx = getContext();
    const n = Math.min(Math.max(Math.floor(limit) || 30, 1), 50);
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      // Explicit tenant filter on top of RLS — same belt-and-braces the
      // AuditService itself uses on this table. Noise classes excluded in SQL
      // so the LIMIT buys real business events.
      const res = await tx.query<any>(
        `SELECT id, action, entity_type, entity_id, before, after, occurred_at
           FROM app.audit_log
          WHERE tenant_id = $1
            AND action NOT LIKE 'attachment.%'
            AND action NOT LIKE 'workorder.line%'
            AND action NOT LIKE 'attendance.clock%'
            AND action NOT LIKE 'attendance.break%'
            AND action <> 'manager.insights_generated'
          ORDER BY seq DESC
          LIMIT $2`,
        [ctx.tenantId, n],
      );
      return res.rows.map((r: any): ActivityItem => {
        const fn = LABELS[r.action];
        const message = fn ? fn(r.after ?? null, r.before ?? null) : fallbackLabel(r.action);
        return {
          id: r.id,
          kind: r.action,
          message,
          entityType: r.entity_type ?? undefined,
          entityId: r.entity_id ?? undefined,
          createdAt: tsIso(r.occurred_at),
        };
      });
    });
  }
}
