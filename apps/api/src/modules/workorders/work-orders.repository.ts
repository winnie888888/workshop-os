import { Injectable } from '@nestjs/common';
import type { TxClient } from '../../common/db/pg.service';

export interface WorkOrderHeader {
  id: string; number: string | null; status: string; customerId: string;
  assetId: string | null; fleetId: string | null; locationId: string | null;
  complaint: string | null; diagnosis: string | null; odometer: number | null;
  currency: string; customerPo: string | null;
  totalNetMinor: string; totalVatMinor: string; totalGrossMinor: string;
  version: number;
}
export interface WorkOrderLineRow {
  id: string; lineNo: number; type: string; description: string;
  inventoryItemId: string | null; reservedLocationId: string | null;
  quantity: string; unitPriceMinor: string;
  discountPct: string; vatRatePct: string; netMinor: string; vatMinor: string;
  grossMinor: string; issued: boolean;
}
export interface TimeEntryRow {
  id: string; workOrderId: string; mechanicId: string; startedAt: string; endedAt: string | null;
  durationSeconds: number | null; costMinor: string | null;
}

function headerToDomain(r: any): WorkOrderHeader {
  return {
    id: r.id, number: r.number, status: r.status, customerId: r.customer_id,
    assetId: r.asset_id, fleetId: r.fleet_id, locationId: r.location_id,
    complaint: r.complaint, diagnosis: r.diagnosis, odometer: r.odometer,
    currency: r.currency, customerPo: r.customer_po,
    totalNetMinor: String(r.total_net_minor), totalVatMinor: String(r.total_vat_minor),
    totalGrossMinor: String(r.total_gross_minor), version: r.version,
  };
}

@Injectable()
export class WorkOrdersRepository {
  async insertHeader(
    tx: TxClient,
    w: {
      id: string; tenantId: string; number: string; customerId: string; assetId: string | null;
      fleetId: string | null; locationId: string | null; complaint: string | null;
      odometer: number | null; currency: string; customerPo: string | null; createdBy: string | null;
    },
  ): Promise<WorkOrderHeader> {
    const res = await tx.query<any>(
      `INSERT INTO app.work_orders
         (id, tenant_id, number, customer_id, asset_id, fleet_id, location_id, status,
          complaint, odometer, currency, customer_po, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8,$9,$10,$11,$12,$12)
       RETURNING *`,
      [
        w.id, w.tenantId, w.number, w.customerId, w.assetId, w.fleetId, w.locationId,
        w.complaint, w.odometer, w.currency, w.customerPo, w.createdBy,
      ],
    );
    return headerToDomain(res.rows[0]);
  }

  /** Locks the work order row so status/total updates are race-free. */
  async findHeaderForUpdate(tx: TxClient, id: string): Promise<WorkOrderHeader | null> {
    const res = await tx.query<any>(`SELECT * FROM app.work_orders WHERE id = $1 FOR UPDATE`, [id]);
    return res.rowCount > 0 ? headerToDomain(res.rows[0]) : null;
  }

  async findHeader(tx: TxClient, id: string): Promise<WorkOrderHeader | null> {
    const res = await tx.query<any>(`SELECT * FROM app.work_orders WHERE id = $1`, [id]);
    return res.rowCount > 0 ? headerToDomain(res.rows[0]) : null;
  }

  async lineExists(tx: TxClient, lineId: string): Promise<boolean> {
    const res = await tx.query<{ one: number }>(
      `SELECT 1 AS one FROM app.work_order_lines WHERE id = $1`,
      [lineId],
    );
    return res.rowCount > 0;
  }

  async nextLineNo(tx: TxClient, workOrderId: string): Promise<number> {
    const res = await tx.query<{ max: number | null }>(
      `SELECT MAX(line_no) AS max FROM app.work_order_lines WHERE work_order_id = $1`,
      [workOrderId],
    );
    return (res.rows[0].max ?? 0) + 1;
  }

  async insertLine(
    tx: TxClient,
    l: {
      id: string; tenantId: string; workOrderId: string; lineNo: number; type: string;
      description: string; inventoryItemId: string | null; reservedLocationId: string | null;
      quantity: string; unitPriceMinor: bigint;
      discountPct: string; vatRatePct: string; netMinor: bigint; vatMinor: bigint; grossMinor: bigint;
    },
  ): Promise<void> {
    await tx.query(
      `INSERT INTO app.work_order_lines
         (id, tenant_id, work_order_id, line_no, type, description, inventory_item_id, reserved_location_id,
          quantity, unit_price_minor, discount_pct, vat_rate_pct, net_minor, vat_minor, gross_minor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        l.id, l.tenantId, l.workOrderId, l.lineNo, l.type, l.description, l.inventoryItemId,
        l.reservedLocationId, l.quantity, l.unitPriceMinor.toString(), l.discountPct, l.vatRatePct,
        l.netMinor.toString(), l.vatMinor.toString(), l.grossMinor.toString(),
      ],
    );
  }

  async listLines(tx: TxClient, workOrderId: string): Promise<WorkOrderLineRow[]> {
    const res = await tx.query<any>(
      `SELECT * FROM app.work_order_lines WHERE work_order_id = $1 ORDER BY line_no`,
      [workOrderId],
    );
    return res.rows.map((r: any) => ({
      id: r.id, lineNo: r.line_no, type: r.type, description: r.description,
      inventoryItemId: r.inventory_item_id, reservedLocationId: r.reserved_location_id,
      quantity: String(r.quantity),
      unitPriceMinor: String(r.unit_price_minor), discountPct: String(r.discount_pct),
      vatRatePct: String(r.vat_rate_pct), netMinor: String(r.net_minor),
      vatMinor: String(r.vat_minor), grossMinor: String(r.gross_minor), issued: r.issued,
    }));
  }

  /** Recompute and persist denormalized totals from the lines; bump version. */
  async recomputeTotals(tx: TxClient, workOrderId: string): Promise<WorkOrderHeader> {
    const res = await tx.query<any>(
      `UPDATE app.work_orders w SET
         total_net_minor = COALESCE(s.net, 0),
         total_vat_minor = COALESCE(s.vat, 0),
         total_gross_minor = COALESCE(s.gross, 0),
         version = w.version + 1,
         updated_at = now()
       FROM (
         SELECT SUM(net_minor) net, SUM(vat_minor) vat, SUM(gross_minor) gross
           FROM app.work_order_lines WHERE work_order_id = $1
       ) s
       WHERE w.id = $1
       RETURNING *`,
      [workOrderId],
    );
    return headerToDomain(res.rows[0]);
  }

  async updateStatus(
    tx: TxClient,
    id: string,
    status: string,
    stamps: { opened?: boolean; ready?: boolean; invoiced?: boolean; closed?: boolean },
    updatedBy: string | null,
  ): Promise<WorkOrderHeader> {
    const res = await tx.query<any>(
      `UPDATE app.work_orders SET
         status = $2,
         opened_at   = CASE WHEN $3 THEN now() ELSE opened_at END,
         ready_at    = CASE WHEN $4 THEN now() ELSE ready_at END,
         invoiced_at = CASE WHEN $5 THEN now() ELSE invoiced_at END,
         closed_at   = CASE WHEN $6 THEN now() ELSE closed_at END,
         version = version + 1,
         updated_by = $7,
         updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, status, !!stamps.opened, !!stamps.ready, !!stamps.invoiced, !!stamps.closed, updatedBy],
    );
    return headerToDomain(res.rows[0]);
  }

  /** Set or clear the assigned mechanic on a work order. */
  async setAssignedMechanic(
    tx: TxClient,
    workOrderId: string,
    mechanicId: string | null,
    updatedBy: string | null,
  ): Promise<WorkOrderHeader | null> {
    const res = await tx.query<any>(
      `UPDATE app.work_orders SET
         assigned_mechanic_id = $2,
         version = version + 1,
         updated_by = $3,
         updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [workOrderId, mechanicId, updatedBy],
    );
    return res.rowCount > 0 ? headerToDomain(res.rows[0]) : null;
  }

  /** Fetch a single line (to validate an edit/delete against its state). */
  async findLine(tx: TxClient, workOrderId: string, lineId: string): Promise<WorkOrderLineRow | null> {
    const res = await tx.query<any>(
      `SELECT * FROM app.work_order_lines WHERE id = $1 AND work_order_id = $2`,
      [lineId, workOrderId],
    );
    if (res.rowCount === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id, lineNo: r.line_no, type: r.type, description: r.description,
      inventoryItemId: r.inventory_item_id, reservedLocationId: r.reserved_location_id,
      quantity: String(r.quantity), unitPriceMinor: String(r.unit_price_minor),
      discountPct: String(r.discount_pct), vatRatePct: String(r.vat_rate_pct),
      netMinor: String(r.net_minor), vatMinor: String(r.vat_minor),
      grossMinor: String(r.gross_minor), issued: r.issued,
    };
  }

  /** Overwrite the editable fields and recomputed money of one line. */
  async updateLine(
    tx: TxClient,
    lineId: string,
    f: {
      description: string; quantity: string; unitPriceMinor: bigint;
      discountPct: string; vatRatePct: string;
      netMinor: bigint; vatMinor: bigint; grossMinor: bigint;
    },
  ): Promise<void> {
    await tx.query(
      `UPDATE app.work_order_lines SET
         description = $2, quantity = $3, unit_price_minor = $4,
         discount_pct = $5, vat_rate_pct = $6,
         net_minor = $7, vat_minor = $8, gross_minor = $9,
         updated_at = now()
       WHERE id = $1`,
      [lineId, f.description, f.quantity, f.unitPriceMinor.toString(),
       f.discountPct, f.vatRatePct, f.netMinor.toString(), f.vatMinor.toString(), f.grossMinor.toString()],
    );
  }

  async deleteLine(tx: TxClient, lineId: string): Promise<void> {
    await tx.query(`DELETE FROM app.work_order_lines WHERE id = $1`, [lineId]);
  }

  async countBillableLines(tx: TxClient, workOrderId: string): Promise<number> {
    const res = await tx.query<{ c: string }>(
      `SELECT COUNT(*) c FROM app.work_order_lines WHERE work_order_id = $1`,
      [workOrderId],
    );
    return Number(res.rows[0].c);
  }

  /* ----- time entries ----- */

  async openEntriesForMechanic(tx: TxClient, mechanicId: string): Promise<TimeEntryRow[]> {
    const res = await tx.query<any>(
      `SELECT * FROM app.time_entries WHERE mechanic_id = $1 AND ended_at IS NULL`,
      [mechanicId],
    );
    return res.rows.map(this.timeRow);
  }

  async openEntriesForWorkOrder(tx: TxClient, workOrderId: string): Promise<number> {
    const res = await tx.query<{ c: string }>(
      `SELECT COUNT(*) c FROM app.time_entries WHERE work_order_id = $1 AND ended_at IS NULL`,
      [workOrderId],
    );
    return Number(res.rows[0].c);
  }

  async insertTimeEntry(
    tx: TxClient,
    t: { id: string; tenantId: string; workOrderId: string; mechanicId: string; startedAt: string },
  ): Promise<void> {
    await tx.query(
      `INSERT INTO app.time_entries (id, tenant_id, work_order_id, mechanic_id, started_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [t.id, t.tenantId, t.workOrderId, t.mechanicId, t.startedAt],
    );
  }

  async findOpenEntry(tx: TxClient, workOrderId: string, mechanicId: string): Promise<TimeEntryRow | null> {
    const res = await tx.query<any>(
      `SELECT * FROM app.time_entries
        WHERE work_order_id = $1 AND mechanic_id = $2 AND ended_at IS NULL
        FOR UPDATE`,
      [workOrderId, mechanicId],
    );
    return res.rowCount > 0 ? this.timeRow(res.rows[0]) : null;
  }

  async closeTimeEntry(
    tx: TxClient,
    id: string,
    endedAt: string,
    durationSeconds: number,
    costMinor: bigint,
  ): Promise<void> {
    await tx.query(
      `UPDATE app.time_entries
          SET ended_at = $2, duration_seconds = $3, cost_minor = $4, updated_at = now()
        WHERE id = $1`,
      [id, endedAt, durationSeconds, costMinor.toString()],
    );
  }

  async listTimeEntries(tx: TxClient, workOrderId: string): Promise<TimeEntryRow[]> {
    const res = await tx.query<any>(
      `SELECT * FROM app.time_entries WHERE work_order_id = $1 ORDER BY started_at`,
      [workOrderId],
    );
    return res.rows.map(this.timeRow);
  }

  /** Assemble the full nalog: header joined with customer + asset details. */
  async nalogContext(tx: TxClient, id: string): Promise<any | null> {
    const res = await tx.query<any>(
      `SELECT w.*,
              c.name AS customer_name, c.address AS customer_address, c.vat_id AS customer_vat_id,
              a.plate AS asset_plate, a.country_of_plate AS asset_country, a.vin AS asset_vin,
              a.make AS asset_make, a.model AS asset_model
         FROM app.work_orders w
         LEFT JOIN app.customers c ON c.id = w.customer_id
         LEFT JOIN app.assets a ON a.id = w.asset_id
        WHERE w.id = $1`,
      [id],
    );
    return res.rowCount > 0 ? res.rows[0] : null;
  }

  private timeRow = (r: any): TimeEntryRow => ({
    id: r.id, workOrderId: r.work_order_id, mechanicId: r.mechanic_id, startedAt: toIso(r.started_at),
    endedAt: r.ended_at ? toIso(r.ended_at) : null,
    durationSeconds: r.duration_seconds, costMinor: r.cost_minor != null ? String(r.cost_minor) : null,
  });

  /**
   * List work orders for the operational boards (mechanic job list, advisor
   * Today board). Returns a lightweight projection joined with the customer and
   * vehicle display fields the boards show, plus whether the given mechanic is
   * currently clocked on. RLS scopes every row to the tenant automatically.
   */
  async list(
    tx: TxClient,
    filter: {
      statuses?: string[];
      assignedMechanicId?: string;
      clockedMechanicId?: string;
      limit: number;
    },
  ): Promise<any[]> {
    const where: string[] = [];
    const params: any[] = [];
    if (filter.statuses && filter.statuses.length > 0) {
      params.push(filter.statuses);
      where.push(`w.status = ANY($${params.length})`);
    }
    if (filter.assignedMechanicId) {
      params.push(filter.assignedMechanicId);
      where.push(`w.assigned_mechanic_id = $${params.length}`);
    }
    params.push(filter.limit);
    const limitIdx = params.length;
    // The clocked-mechanic id (if any) is matched in the SELECT so the board can
    // show a live "running for me" badge without a second round-trip.
    params.push(filter.clockedMechanicId ?? null);
    const clockedIdx = params.length;

    const res = await tx.query<any>(
      `SELECT w.id, w.number, w.status, w.currency, w.location_id, w.complaint,
              w.total_gross_minor, w.opened_at, w.created_at, w.assigned_mechanic_id,
              c.name AS customer_name,
              a.plate AS asset_plate, a.country_of_plate AS asset_country,
              a.make AS asset_make, a.model AS asset_model,
              EXISTS (
                SELECT 1 FROM app.time_entries te
                 WHERE te.work_order_id = w.id AND te.ended_at IS NULL
              ) AS has_open_clock,
              EXISTS (
                SELECT 1 FROM app.time_entries te
                 WHERE te.work_order_id = w.id AND te.ended_at IS NULL
                   AND te.mechanic_id = $${clockedIdx}
              ) AS clocked_for_me
         FROM app.work_orders w
         LEFT JOIN app.customers c ON c.id = w.customer_id
         LEFT JOIN app.assets a ON a.id = w.asset_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY w.created_at DESC
        LIMIT $${limitIdx}`,
      params,
    );
    return res.rows;
  }
}

function toIso(v: any): string {
  return v instanceof Date ? v.toISOString() : String(v);
}
