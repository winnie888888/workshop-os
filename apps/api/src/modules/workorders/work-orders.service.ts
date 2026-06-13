import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  newId, getContext, Money, Pricing, WorkOrderState, TimeTracking, Sequence, Inventory,
} from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { normalizeSiPhone } from '../../integrations/notifications/phone.util';
import { CounterService } from '../../common/numbering/counter.service';
import { ChangeFeedService } from '../../common/sync/change-feed.service';
import { AppConfig } from '../../config/configuration';
import { InventoryService } from '../inventory/inventory.service';
import { WorkOrdersRepository, type WorkOrderHeader } from './work-orders.repository';
import { AddLineDto, ClockDto, CreateWorkOrderDto } from './dto/work-order.dto';

// A work order may still be edited (lines added/issued) until it is billed.
const EDITABLE = new Set(['draft', 'open', 'in_progress', 'awaiting_approval', 'awaiting_parts', 'on_hold', 'ready']);

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly pg: PgService,
    private readonly repo: WorkOrdersRepository,
    private readonly counter: CounterService,
    private readonly audit: AuditService,
    private readonly changes: ChangeFeedService,
    private readonly inventory: InventoryService,
    private readonly outbox: OutboxService,
    private readonly config: AppConfig,
  ) {}

  /**
   * Create the digital Delovni nalog. If the bay tablet generated the id offline
   * (clientId), we reuse it so a replay after reconnect is idempotent rather
   * than creating a duplicate job.
   */
  async create(dto: CreateWorkOrderDto): Promise<WorkOrderHeader> {
    const ctx = getContext();
    const id = dto.clientId ?? newId();
    const currency = (dto.currency ?? 'EUR').toUpperCase();

    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const existing = await this.repo.findHeader(tx, id);
      if (existing) return existing; // idempotent offline replay

      const number = await this.counter.next(tx, ctx.tenantId, Sequence.DocumentType.WorkOrder);
      const header = await this.repo.insertHeader(tx, {
        id, tenantId: ctx.tenantId, number, customerId: dto.customerId,
        assetId: dto.assetId ?? null, fleetId: dto.fleetId ?? null,
        locationId: dto.locationId ?? null, complaint: dto.complaint ?? null,
        odometer: dto.odometer ?? null, currency, customerPo: dto.customerPo ?? null,
        createdBy: ctx.userId,
      });

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'workorder.created',
        entityType: 'work_order', entityId: id, before: null, after: header,
      });
      await this.changes.append(tx, {
        tenantId: ctx.tenantId, entityType: 'work_order', entityId: id,
        op: 'upsert', version: header.version, payload: header,
      });
      return header;
    });
  }

  /**
   * Add a line. The price is computed by the shared Pricing module (never ad hoc
   * arithmetic). For a part line backed by stock we reserve the quantity in the
   * SAME transaction, so we can never promise a part we don't have. Then we
   * recompute the work-order totals and record the change for offline sync.
   */
  async addLine(workOrderId: string, dto: AddLineDto) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const header = await this.repo.findHeaderForUpdate(tx, workOrderId);
      if (!header) throw new NotFoundException('Work order not found');

      // Idempotent replay: if a client-supplied line id is already present
      // (a queued offline mutation re-sent after reconnect), do nothing and
      // return the current state rather than adding/reserving the part twice.
      const lineId = dto.lineId ?? newId();
      if (dto.lineId) {
        const exists = await this.repo.lineExists(tx, lineId);
        if (exists) {
          const current = await this.repo.findHeader(tx, workOrderId);
          return { workOrder: current!, lineId, idempotentReplay: true };
        }
      }

      if (!EDITABLE.has(header.status)) {
        throw new ConflictException(`Cannot edit a work order in status '${header.status}'`);
      }

      const price = Pricing.priceLine({
        unitPrice: Money.money(header.currency, BigInt(dto.unitPriceMinor)),
        quantity: dto.quantity,
        discountPct: dto.discountPct ?? '0',
        vatRatePct: dto.vatRatePct ?? '22',
      });

      const lineNo = await this.repo.nextLineNo(tx, workOrderId);

      // A part line backed by inventory must declare WHERE it draws stock from,
      // because the later issue has to hit the same location it reserved at.
      const reservesStock = dto.type === 'part' && !!dto.inventoryItemId;
      if (reservesStock && !dto.locationId) {
        throw new BadRequestException('A stock-backed part line requires locationId');
      }

      await this.repo.insertLine(tx, {
        id: lineId, tenantId: ctx.tenantId, workOrderId, lineNo, type: dto.type,
        description: dto.description, inventoryItemId: dto.inventoryItemId ?? null,
        reservedLocationId: reservesStock ? dto.locationId! : null,
        quantity: dto.quantity, unitPriceMinor: BigInt(dto.unitPriceMinor),
        discountPct: dto.discountPct ?? '0', vatRatePct: dto.vatRatePct ?? '22',
        netMinor: price.net.minor, vatMinor: price.vat.minor, grossMinor: price.gross.minor,
      });

      // Reserve stock for a part line that draws on inventory.
      if (reservesStock) {
        const qty = Number(dto.quantity);
        if (!Number.isInteger(qty) || qty <= 0) {
          throw new BadRequestException('Part quantity must be a positive whole number to reserve stock');
        }
        await this.inventory.move(tx, {
          itemId: dto.inventoryItemId!, locationId: dto.locationId!,
          type: Inventory.MovementType.Reserve, qty,
          reason: `reserve for WO ${header.number}`, createdBy: ctx.userId, workOrderLineId: lineId,
        });
      }

      const updated = await this.repo.recomputeTotals(tx, workOrderId);
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'workorder.line_added',
        entityType: 'work_order_line', entityId: lineId,
        // NB: Money holds bigint minor units, which JSON.stringify cannot
        // serialize. Persist the audited figures as decimal strings.
        before: null,
        after: {
          lineId, lineNo, type: dto.type, description: dto.description, quantity: dto.quantity,
          netMinor: price.net.minor.toString(),
          vatMinor: price.vat.minor.toString(),
          grossMinor: price.gross.minor.toString(),
          currency: header.currency,
        },
      });
      await this.changes.append(tx, {
        tenantId: ctx.tenantId, entityType: 'work_order', entityId: workOrderId,
        op: 'upsert', version: updated.version, payload: updated,
      });
      return { workOrder: updated, lineId };
    });
  }

  /** Mark a part line as physically fitted: convert its reservation into an issue. */
  async issueLine(workOrderId: string, lineId: string) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const header = await this.repo.findHeaderForUpdate(tx, workOrderId);
      if (!header) throw new NotFoundException('Work order not found');
      // Stock may only move while the job is live, never after it is billed,
      // closed or cancelled.
      if (!EDITABLE.has(header.status)) {
        throw new ConflictException(`Cannot issue parts on a work order in status '${header.status}'`);
      }

      const lines = await this.repo.listLines(tx, workOrderId);
      const line = lines.find((l) => l.id === lineId);
      if (!line) throw new NotFoundException('Line not found');
      if (line.issued) return { ok: true }; // idempotent: already fitted
      if (line.type !== 'part' || !line.inventoryItemId) {
        throw new BadRequestException('Only part lines can be issued');
      }
      if (!line.reservedLocationId) {
        throw new BadRequestException('Line has no reserved stock to issue');
      }
      const qty = Number(line.quantity);
      // Issue at the SAME location the line reserved at — never a different one.
      await this.inventory.move(tx, {
        itemId: line.inventoryItemId, locationId: line.reservedLocationId,
        type: Inventory.MovementType.Issue, qty,
        reason: `issue for WO ${header.number}`, createdBy: ctx.userId, workOrderLineId: lineId,
      });
      await tx.query(`UPDATE app.work_order_lines SET issued = true, updated_at = now() WHERE id = $1`, [lineId]);
      return { ok: true };
    });
  }

  /**
   * Transition the work order, enforcing the shared state machine plus the
   * business guards it cannot see on its own (open clock entries, billable
   * lines). Timestamps are stamped on the meaningful milestones.
   */
  async transition(workOrderId: string, to: string) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const header = await this.repo.findHeaderForUpdate(tx, workOrderId);
      if (!header) throw new NotFoundException('Work order not found');

      const from = header.status as any;

      // Idempotent replay: a transition to the state we are already in is a
      // no-op success, so a re-sent offline mutation is acknowledged rather
      // than rejected as an illegal self-transition.
      if (from === to) {
        return header;
      }

      const openTimeEntries = await this.repo.openEntriesForWorkOrder(tx, workOrderId);
      const billable = await this.repo.countBillableLines(tx, workOrderId);

      try {
        WorkOrderState.assertTransition(from, to as any, {
          openTimeEntries,
          hasBillableLines: billable > 0,
        });
      } catch (e) {
        throw new ConflictException((e as Error).message);
      }

      const updated = await this.repo.updateStatus(tx, workOrderId, to, {
        opened: to === 'open',
        ready: to === 'ready',
        invoiced: to === 'invoiced',
        closed: to === 'closed',
      }, ctx.userId);

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'workorder.transitioned',
        entityType: 'work_order', entityId: workOrderId,
        before: { status: from }, after: { status: to },
      });
      await this.changes.append(tx, {
        tenantId: ctx.tenantId, entityType: 'work_order', entityId: workOrderId,
        op: 'upsert', version: updated.version, payload: updated,
      });

      // SMS stranki ob prehodu v 'Pripravljeno' (spec: vehicle_ready) — outbox
      // v ISTI transakciji: brez prehoda ni sporočila, brez sporočila ni
      // prehoda. Telefon je neobvezen; brez njega dogodka ni. Idempotentno na
      // nalog (ponovni 'ready' po zadržanju NE pošlje drugič).
      if (to === 'ready') {
        const info = (await tx.query<any>(
          `SELECT c.phone, t.name AS tenant_name, t.sms_enabled, a.plate
             FROM app.work_orders w
             JOIN app.customers c ON c.id = w.customer_id
             JOIN app.tenants t ON t.id = w.tenant_id
             LEFT JOIN app.assets a ON a.id = w.asset_id
            WHERE w.id = $1`,
          [workOrderId],
        )).rows[0];
        if (info?.phone && info.sms_enabled) {
          await this.outbox.enqueue(tx, {
            tenantId: ctx.tenantId, eventType: 'notification.send',
            payload: {
              channel: 'sms', to: normalizeSiPhone(info.phone), kind: 'vehicle_ready',
              body: `Vaše vozilo${info.plate ? ` ${info.plate}` : ''} je pripravljeno za prevzem. — ${info.tenant_name}`,
            },
            idempotencyKey: `notify.vehicle_ready:${workOrderId}`,
          });
        }
      }
      return updated;
    });
  }

  /**
   * Assign (or unassign, with null) the mechanic responsible for a job. This is
   * what makes a work order appear in a mechanic's "my jobs" list — the missing
   * link the readiness review flagged. It is a light-touch change: it records an
   * audit entry and a change-feed event (so the bay app learns of the new
   * assignment on its next sync) but applies no state-machine transition, since
   * assignment is orthogonal to status.
   */
  async assign(workOrderId: string, mechanicId: string | null) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const header = await this.repo.findHeaderForUpdate(tx, workOrderId);
      if (!header) throw new NotFoundException('Work order not found');

      const updated = await this.repo.setAssignedMechanic(tx, workOrderId, mechanicId, ctx.userId);
      if (!updated) throw new NotFoundException('Work order not found');

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'workorder.assigned',
        entityType: 'work_order', entityId: workOrderId,
        before: { assignedMechanicId: (header as any).assignedMechanicId ?? null },
        after: { assignedMechanicId: mechanicId },
      });
      await this.changes.append(tx, {
        tenantId: ctx.tenantId, entityType: 'work_order', entityId: workOrderId,
        op: 'upsert', version: updated.version, payload: updated,
      });
      return updated;
    });
  }

  /**
   * List the tenant's mechanics so the advisor can pick an assignee. Membership
   * rows are global identity data (not tenant-RLS), so they are read via the
   * admin scope and filtered to the *current* tenant — which is safe because the
   * caller already holds a verified membership in it (enforced by middleware).
   */
  async listMechanics(): Promise<Array<{ id: string; name: string }>> {
    const ctx = getContext();
    return this.pg.withAdmin(async (tx) => {
      const res = await tx.query<any>(
        `SELECT u.id, COALESCE(u.display_name, u.name) AS name
           FROM app.memberships m
           JOIN app.users u ON u.id = m.user_id
          WHERE m.tenant_id = $1 AND m.active = true AND 'mechanic' = ANY(m.roles)
          ORDER BY name`,
        [ctx.tenantId],
      );
      return res.rows.map((r: any) => ({ id: r.id, name: r.name }));
    });
  }

  /**
   * Edit one line's description, quantity, price, discount or VAT rate. Money is
   * recomputed by the SAME shared Pricing.priceLine the add path uses — no new
   * arithmetic — and the header totals are recomputed afterward. A line that
   * reserves stock cannot be edited in place (changing a reservation's quantity
   * is delete-and-re-add), and an issued line is frozen.
   */
  async updateLine(workOrderId: string, lineId: string, dto: {
    description?: string; quantity?: string; unitPriceMinor?: number;
    discountPct?: string; vatRatePct?: string;
  }) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const header = await this.repo.findHeaderForUpdate(tx, workOrderId);
      if (!header) throw new NotFoundException('Work order not found');
      if (!EDITABLE.has(header.status)) {
        throw new ConflictException(`Cannot edit a work order in status '${header.status}'`);
      }
      const line = await this.repo.findLine(tx, workOrderId, lineId);
      if (!line) throw new NotFoundException('Line not found');
      if (line.issued) throw new ConflictException('An issued line cannot be edited');
      if (line.reservedLocationId) {
        throw new ConflictException('A stock-reserved part line cannot be edited; remove and re-add it');
      }

      // Merge the patch over the current line, then re-price the result.
      const quantity = dto.quantity ?? line.quantity;
      const unitPriceMinor = dto.unitPriceMinor != null ? BigInt(dto.unitPriceMinor) : BigInt(line.unitPriceMinor);
      const discountPct = dto.discountPct ?? line.discountPct;
      const vatRatePct = dto.vatRatePct ?? line.vatRatePct;
      const price = Pricing.priceLine({
        unitPrice: Money.money(header.currency, unitPriceMinor),
        quantity, discountPct, vatRatePct,
      });

      await this.repo.updateLine(tx, lineId, {
        description: dto.description ?? line.description,
        quantity, unitPriceMinor, discountPct, vatRatePct,
        netMinor: price.net.minor, vatMinor: price.vat.minor, grossMinor: price.gross.minor,
      });

      const updated = await this.repo.recomputeTotals(tx, workOrderId);
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'workorder.line_updated',
        entityType: 'work_order_line', entityId: lineId,
        before: { net: line.netMinor, vat: line.vatMinor, gross: line.grossMinor },
        after: { net: price.net.minor.toString(), vat: price.vat.minor.toString(), gross: price.gross.minor.toString() },
      });
      await this.changes.append(tx, {
        tenantId: ctx.tenantId, entityType: 'work_order', entityId: workOrderId,
        op: 'upsert', version: updated.version, payload: updated,
      });
      return { workOrder: updated, lineId };
    });
  }

  /**
   * Remove a line. If it reserved stock, the reservation is released back to
   * available before the row is deleted, so inventory never leaks a phantom
   * reservation. An issued line cannot be removed (the part is already fitted).
   */
  async removeLine(workOrderId: string, lineId: string) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const header = await this.repo.findHeaderForUpdate(tx, workOrderId);
      if (!header) throw new NotFoundException('Work order not found');
      if (!EDITABLE.has(header.status)) {
        throw new ConflictException(`Cannot edit a work order in status '${header.status}'`);
      }
      const line = await this.repo.findLine(tx, workOrderId, lineId);
      if (!line) throw new NotFoundException('Line not found');
      if (line.issued) throw new ConflictException('An issued line cannot be removed');

      // Release any stock this line had reserved, mirroring the reserve done at
      // add time, before deleting the row.
      if (line.reservedLocationId && line.inventoryItemId) {
        const qty = Number(line.quantity);
        if (Number.isInteger(qty) && qty > 0) {
          await this.inventory.move(tx, {
            itemId: line.inventoryItemId, locationId: line.reservedLocationId,
            type: Inventory.MovementType.Release, qty,
            reason: `release on line removal (WO ${header.number})`,
            createdBy: ctx.userId, workOrderLineId: lineId,
          });
        }
      }

      await this.repo.deleteLine(tx, lineId);
      const updated = await this.repo.recomputeTotals(tx, workOrderId);
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'workorder.line_removed',
        entityType: 'work_order_line', entityId: lineId,
        before: { type: line.type, gross: line.grossMinor }, after: null,
      });
      await this.changes.append(tx, {
        tenantId: ctx.tenantId, entityType: 'work_order', entityId: workOrderId,
        op: 'upsert', version: updated.version, payload: updated,
      });
      return { workOrder: updated, removedLineId: lineId };
    });
  }

  /** Clock a mechanic onto the job. Opens the job if it was merely scheduled. */
  async clockOn(workOrderId: string, dto: ClockDto) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const header = await this.repo.findHeaderForUpdate(tx, workOrderId);
      if (!header) throw new NotFoundException('Work order not found');

      // Auto-advance open -> in_progress on first clock-on. This is a real
      // state transition, so it must be audited and published to the change
      // feed exactly like an explicit transition — otherwise the audit trail
      // has a gap and an offline device never learns the job started.
      if (header.status === 'open') {
        const advanced = await this.repo.updateStatus(tx, workOrderId, 'in_progress', {}, ctx.userId);
        await this.audit.append(tx, {
          tenantId: ctx.tenantId, actorId: ctx.userId, action: 'workorder.transitioned',
          entityType: 'work_order', entityId: workOrderId,
          before: { status: 'open' }, after: { status: 'in_progress', via: 'clock_on' },
        });
        await this.changes.append(tx, {
          tenantId: ctx.tenantId, entityType: 'work_order', entityId: workOrderId,
          op: 'upsert', version: advanced.version, payload: advanced,
        });
      } else if (!['in_progress', 'awaiting_parts', 'awaiting_approval', 'on_hold'].includes(header.status)) {
        throw new ConflictException(`Cannot clock on while work order is '${header.status}'`);
      }

      const open = await this.repo.openEntriesForMechanic(tx, dto.mechanicId);
      // Idempotent replay: if the mechanic is already clocked onto THIS work
      // order, return that entry rather than failing the unique constraint.
      const onThisWo = open.find((e) => e.workOrderId === workOrderId);
      if (onThisWo) {
        return { timeEntryId: onThisWo.id, startedAt: onThisWo.startedAt, idempotentReplay: true };
      }
      try {
        TimeTracking.assertCanClockOn(open as any);
      } catch (e) {
        throw new ConflictException((e as Error).message);
      }

      const id = newId();
      const startedAt = new Date().toISOString();
      await this.repo.insertTimeEntry(tx, {
        id, tenantId: ctx.tenantId, workOrderId, mechanicId: dto.mechanicId, startedAt,
      });
      await this.changes.append(tx, {
        tenantId: ctx.tenantId, entityType: 'time_entry', entityId: id,
        op: 'upsert', version: 1, payload: { id, workOrderId, mechanicId: dto.mechanicId, startedAt },
      });
      return { timeEntryId: id, startedAt };
    });
  }

  /** Clock off: close the entry, compute duration and labour cost exactly. */
  async clockOff(workOrderId: string, dto: ClockDto) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const header = await this.repo.findHeader(tx, workOrderId);
      if (!header) throw new NotFoundException('Work order not found');

      const entry = await this.repo.findOpenEntry(tx, workOrderId, dto.mechanicId);
      // Idempotent replay: if there is no open entry, the mechanic is already
      // clocked off (or a prior replay closed it). Acknowledge rather than 404,
      // so a re-sent offline mutation does not retry forever.
      if (!entry) return { timeEntryId: null, durationSeconds: 0, idempotentReplay: true };

      const endedAt = new Date().toISOString();
      const closed = { ...entry, endedAt };
      const seconds = TimeTracking.durationSeconds(closed as any);
      const rate = Money.money(header.currency, this.config.defaultLabourRateMinor);
      const cost = TimeTracking.labourCost(closed as any, rate);

      await this.repo.closeTimeEntry(tx, entry.id, endedAt, seconds, cost.minor);
      await this.changes.append(tx, {
        tenantId: ctx.tenantId, entityType: 'time_entry', entityId: entry.id,
        op: 'upsert', version: 2, payload: { id: entry.id, endedAt, seconds, costMinor: cost.minor.toString() },
      });
      return { timeEntryId: entry.id, durationSeconds: seconds, costMinor: cost.minor.toString() };
    });
  }

  /** Board projection for the mechanic job list and advisor Today board. */
  async list(filter: { statuses?: string[]; assignedMechanicId?: string; clockedMechanicId?: string; limit?: number }) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const rows = await this.repo.list(tx, {
        statuses: filter.statuses,
        assignedMechanicId: filter.assignedMechanicId,
        clockedMechanicId: filter.clockedMechanicId,
        limit: Math.min(Math.max(filter.limit ?? 100, 1), 500),
      });
      return rows.map((r: any) => ({
        id: r.id,
        number: r.number,
        status: r.status,
        currency: r.currency,
        locationId: r.location_id,
        complaint: r.complaint,
        totalGrossMinor: String(r.total_gross_minor),
        customerName: r.customer_name,
        plate: r.asset_plate,
        plateCountry: r.asset_country,
        makeModel: [r.asset_make, r.asset_model].filter(Boolean).join(' ') || null,
        hasOpenClock: r.has_open_clock,
        clockedForMe: r.clocked_for_me,
        assignedMechanicId: r.assigned_mechanic_id,
      }));
    });
  }

  async get(workOrderId: string) {
    const ctx = getContext();
    const result = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      const header = await this.repo.findHeader(tx, workOrderId);
      if (!header) return null;
      const lines = await this.repo.listLines(tx, workOrderId);
      const time = await this.repo.listTimeEntries(tx, workOrderId);
      return { ...header, lines, timeEntries: time };
    });
    if (!result) throw new NotFoundException('Work order not found');
    return result;
  }

  /** Assemble the digital Delovni nalog as structured data. */
  async nalog(workOrderId: string) {
    const ctx = getContext();
    const doc = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      const head = await this.repo.nalogContext(tx, workOrderId);
      if (!head) return null;
      const lines = await this.repo.listLines(tx, workOrderId);
      const time = await this.repo.listTimeEntries(tx, workOrderId);
      return { head, lines, time };
    });
    if (!doc) throw new NotFoundException('Work order not found');
    return assembleNalog(doc);
  }
}

/** Build the structured nalog payload that the PWA/print view renders. */
function assembleNalog(d: { head: any; lines: any[]; time: any[] }) {
  const fmt = (minor: string | number) => Money.format(Money.money(d.head.currency, BigInt(minor)));
  const totalClockedSeconds = d.time.reduce((a, t) => a + (t.durationSeconds ?? 0), 0);
  return {
    number: d.head.number,
    status: d.head.status,
    issuedFor: {
      customer: d.head.customer_name,
      address: d.head.customer_address,
      vatId: d.head.customer_vat_id,
      po: d.head.customer_po,
    },
    vehicle: d.head.asset_plate
      ? {
          plate: `${d.head.asset_country}-${d.head.asset_plate}`,
          vin: d.head.asset_vin,
          makeModel: [d.head.asset_make, d.head.asset_model].filter(Boolean).join(' '),
          odometer: d.head.odometer,
        }
      : null,
    complaint: d.head.complaint,
    diagnosis: d.head.diagnosis,
    lines: d.lines.map((l) => ({
      no: l.lineNo, type: l.type, description: l.description, quantity: l.quantity,
      net: fmt(l.netMinor), vat: fmt(l.vatMinor), gross: fmt(l.grossMinor), issued: l.issued,
    })),
    labour: {
      entries: d.time.length,
      clockedHours: (totalClockedSeconds / 3600).toFixed(2),
    },
    totals: {
      net: fmt(d.head.total_net_minor),
      vat: fmt(d.head.total_vat_minor),
      gross: fmt(d.head.total_gross_minor),
    },
  };
}
