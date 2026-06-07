import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { newId, getContext } from '@workshop/shared';
import { PgService } from '../common/db/pg.service';
import { AuditService } from '../common/audit/audit.service';
import { OutboxService } from '../common/outbox/outbox.service';

/**
 * The portal data surface. EVERY method here reads both tenantId and customerId
 * from the request context and filters by both. RLS already guarantees a query
 * cannot cross tenants; the explicit customer_id filter guarantees it cannot
 * cross customers within a tenant. A portal request can therefore only ever see
 * or touch the signed-in customer's own data. Reads dominate; the few writes
 * (approve/decline work, request an appointment) are audited.
 */
@Injectable()
export class PortalService {
  constructor(
    private readonly pg: PgService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  /** The customerId for this request, or a hard failure if somehow unset. */
  private scope(): { tenantId: string; customerId: string } {
    const ctx = getContext();
    if (!ctx.customerId) throw new ForbiddenException('Not a customer-portal request');
    return { tenantId: ctx.tenantId, customerId: ctx.customerId };
  }

  /** The signed-in customer's own profile (safe, non-financial fields). */
  async me(): Promise<any> {
    const { tenantId, customerId } = this.scope();
    return this.pg.withTenant(tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT id, name, country, city, email, phone, currency, payment_terms_days
           FROM app.customers WHERE id = $1`, [customerId]);
      if (r.rowCount === 0) throw new NotFoundException('Customer not found');
      const c = r.rows[0];
      return { id: c.id, name: c.name, country: c.country, city: c.city,
        email: c.email, phone: c.phone, currency: c.currency, paymentTermsDays: c.payment_terms_days };
    });
  }

  /** The customer's vehicles. */
  async vehicles(): Promise<any[]> {
    const { tenantId, customerId } = this.scope();
    return this.pg.withTenant(tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT id, type, plate, country_of_plate, vin, make, model, year, odometer_last, status
           FROM app.assets WHERE customer_id = $1 ORDER BY make, model`, [customerId]);
      return r.rows.map((v) => ({
        id: v.id, type: v.type, plate: v.plate, plateCountry: v.country_of_plate, vin: v.vin,
        make: v.make, model: v.model, year: v.year, odometer: v.odometer_last, status: v.status,
      }));
    });
  }

  /**
   * Work orders for the customer, optionally only open ones. The portal shows a
   * customer-friendly status and never exposes internal cost — only the
   * customer-facing gross total (what they will be billed).
   */
  async workOrders(opts: { open?: boolean } = {}): Promise<any[]> {
    const { tenantId, customerId } = this.scope();
    return this.pg.withTenant(tenantId, async (tx) => {
      const openStatuses = ['open', 'in_progress', 'ready'];
      const r = await tx.query<any>(
        `SELECT wo.id, wo.number, wo.status, wo.complaint, wo.diagnosis, wo.currency,
                wo.total_gross_minor, wo.created_at, wo.updated_at,
                a.plate, a.make, a.model
           FROM app.work_orders wo
           LEFT JOIN app.assets a ON a.id = wo.asset_id
          WHERE wo.customer_id = $1
            ${opts.open ? `AND wo.status = ANY($2)` : ''}
          ORDER BY wo.created_at DESC`,
        opts.open ? [customerId, openStatuses] : [customerId]);
      return r.rows.map((w) => this.toWorkOrderCard(w));
    });
  }

  async workOrderDetail(id: string): Promise<any> {
    const { tenantId, customerId } = this.scope();
    return this.pg.withTenant(tenantId, async (tx) => {
      const w = await tx.query<any>(
        `SELECT wo.*, a.plate, a.make, a.model FROM app.work_orders wo
           LEFT JOIN app.assets a ON a.id = wo.asset_id
          WHERE wo.id = $1 AND wo.customer_id = $2`, [id, customerId]);
      if (w.rowCount === 0) throw new NotFoundException('Work order not found');
      // Lines: show description and customer-facing gross only (no internal cost).
      const lines = await tx.query<any>(
        `SELECT line_no, type, description, quantity, gross_minor, issued
           FROM app.work_order_lines WHERE work_order_id = $1 ORDER BY line_no`, [id]);
      return {
        ...this.toWorkOrderCard(w.rows[0]),
        diagnosis: w.rows[0].diagnosis,
        lines: lines.rows.map((l) => ({
          lineNo: l.line_no, type: l.type, description: l.description,
          quantity: l.quantity, grossMinor: l.gross_minor, done: l.issued,
        })),
      };
    });
  }

  // Map the internal status to a friendly customer-facing label + progress.
  private toWorkOrderCard(w: any): any {
    const labels: Record<string, string> = {
      draft: 'Received', open: 'Scheduled', in_progress: 'In progress',
      ready: 'Ready for collection', invoiced: 'Invoiced', closed: 'Completed', cancelled: 'Cancelled',
    };
    const progress: Record<string, number> = {
      draft: 10, open: 25, in_progress: 60, ready: 90, invoiced: 100, closed: 100, cancelled: 0,
    };
    return {
      id: w.id, number: w.number, status: w.status, statusLabel: labels[w.status] ?? w.status,
      progress: progress[w.status] ?? 0, complaint: w.complaint, currency: w.currency,
      totalGrossMinor: w.total_gross_minor, plate: w.plate,
      makeModel: [w.make, w.model].filter(Boolean).join(' ') || null,
      createdAt: w.created_at, updatedAt: w.updated_at,
    };
  }

  /** Closed/invoiced work as service history. */
  async serviceHistory(): Promise<any[]> {
    const { tenantId, customerId } = this.scope();
    return this.pg.withTenant(tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT wo.id, wo.number, wo.status, wo.complaint, wo.diagnosis, wo.currency,
                wo.total_gross_minor, wo.updated_at, a.plate, a.make, a.model
           FROM app.work_orders wo LEFT JOIN app.assets a ON a.id = wo.asset_id
          WHERE wo.customer_id = $1 AND wo.status IN ('invoiced','closed')
          ORDER BY wo.updated_at DESC`, [customerId]);
      return r.rows.map((w) => this.toWorkOrderCard(w));
    });
  }

  /** Invoices for the customer, with payment status. */
  async invoices(): Promise<any[]> {
    const { tenantId, customerId } = this.scope();
    return this.pg.withTenant(tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT id, kind, number, status, currency, reverse_charge, vat_note,
                total_net_minor, total_vat_minor, total_gross_minor, paid_minor, issue_date, due_date
           FROM app.invoices
          WHERE customer_id = $1 AND status <> 'draft'
          ORDER BY issue_date DESC NULLS LAST, created_at DESC`, [customerId]);
      return r.rows.map((i) => this.toInvoice(i));
    });
  }

  async invoiceDetail(id: string): Promise<any> {
    const { tenantId, customerId } = this.scope();
    return this.pg.withTenant(tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT * FROM app.invoices WHERE id = $1 AND customer_id = $2 AND status <> 'draft'`, [id, customerId]);
      if (r.rowCount === 0) throw new NotFoundException('Invoice not found');
      const lines = await tx.query<any>(
        `SELECT line_no, description, quantity, unit_price_minor, net_minor, vat_rate_pct, vat_minor, gross_minor
           FROM app.invoice_lines WHERE invoice_id = $1 ORDER BY line_no`, [id]).catch(() => ({ rows: [] }));
      return { ...this.toInvoice(r.rows[0]), lines: lines.rows };
    });
  }

  private toInvoice(i: any): any {
    const paid = BigInt(i.paid_minor ?? 0);
    const gross = BigInt(i.total_gross_minor ?? 0);
    const paymentStatus = i.status === 'paid' || paid >= gross ? 'paid'
      : paid > 0n ? 'partly_paid'
      : i.status === 'overdue' ? 'overdue' : 'unpaid';
    return {
      id: i.id, kind: i.kind, number: i.number, status: i.status, currency: i.currency,
      reverseCharge: i.reverse_charge, vatNote: i.vat_note,
      totalNetMinor: i.total_net_minor, totalVatMinor: i.total_vat_minor, totalGrossMinor: i.total_gross_minor,
      paidMinor: i.paid_minor, paymentStatus, issueDate: i.issue_date, dueDate: i.due_date,
    };
  }

  /**
   * Document archive: the customer's issued invoices as downloadable documents.
   * Each entry points at the portal invoice-PDF endpoint. (Work-order completion
   * documents can join this list later; invoices are the documents customers ask
   * for most.)
   */
  async documents(): Promise<any[]> {
    const invoices = await this.invoices();
    return invoices.map((i) => ({
      id: i.id, kind: 'invoice', title: `Invoice ${i.number ?? i.id.slice(0, 8)}`,
      date: i.issueDate, downloadPath: `/portal/invoices/${i.id}/pdf`,
    }));
  }

  // --- Approvals (additional work + estimate sign-off) ---------------------

  async approvals(opts: { pendingOnly?: boolean } = {}): Promise<any[]> {
    const { tenantId, customerId } = this.scope();
    return this.pg.withTenant(tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT a.*, wo.number AS wo_number FROM app.work_order_approvals a
           JOIN app.work_orders wo ON wo.id = a.work_order_id
          WHERE a.customer_id = $1 ${opts.pendingOnly ? `AND a.status = 'pending'` : ''}
          ORDER BY a.created_at DESC`, [customerId]);
      return r.rows.map((a) => ({
        id: a.id, workOrderId: a.work_order_id, workOrderNumber: a.wo_number, kind: a.kind,
        title: a.title, proposedItems: a.proposed_items, currency: a.currency,
        amountNetMinor: a.amount_net_minor, amountGrossMinor: a.amount_gross_minor,
        status: a.status, respondedAt: a.responded_at, createdAt: a.created_at,
      }));
    });
  }

  /** Customer approves or declines a pending additional-work / estimate request. */
  async respondToApproval(id: string, decision: 'approved' | 'declined', note?: string): Promise<any> {
    const { tenantId, customerId } = this.scope();
    return this.pg.withTenant(tenantId, async (tx) => {
      const a = await tx.query<any>(
        `SELECT * FROM app.work_order_approvals WHERE id = $1 AND customer_id = $2 FOR UPDATE`, [id, customerId]);
      if (a.rowCount === 0) throw new NotFoundException('Approval not found');
      if (a.rows[0].status !== 'pending') throw new BadRequestException(`This request was already ${a.rows[0].status}`);

      const updated = await tx.query<any>(
        `UPDATE app.work_order_approvals
            SET status = $2, responded_at = now(), response_note = $3 WHERE id = $1 RETURNING *`,
        [id, decision, note ?? null]);

      // Audit the customer's decision on the tamper-evident chain (actor is null
      // because a customer is not a platform user; the action records who).
      await this.audit.append(tx, {
        tenantId, actorId: null, action: `portal.approval.${decision}`,
        entityType: 'work_order_approval', entityId: id,
        before: { status: 'pending' }, after: { status: decision, customerId, note: note ?? null },
      });

      // Tell the workshop the customer responded (operational notification).
      await this.outbox.enqueue(tx, {
        tenantId, eventType: 'notification.send',
        payload: { channel: 'email', to: null, kind: 'additional_work_approval',
          body: `Customer ${decision} additional work on WO ${a.rows[0].work_order_id}.` },
        idempotencyKey: `approval-resp-${id}`,
      });
      return { id, status: updated.rows[0].status };
    });
  }

  // --- Appointment requests ------------------------------------------------

  async requestAppointment(input: { assetId?: string; preferredDate?: string; description?: string }): Promise<any> {
    const { tenantId, customerId } = this.scope();
    return this.pg.withTenant(tenantId, async (tx) => {
      // If an asset is named, it must belong to this customer.
      if (input.assetId) {
        const a = await tx.query(`SELECT 1 FROM app.assets WHERE id = $1 AND customer_id = $2`, [input.assetId, customerId]);
        if (a.rowCount === 0) throw new BadRequestException('Vehicle not found');
      }
      const id = newId();
      await tx.query(
        `INSERT INTO app.appointment_requests (id, tenant_id, customer_id, asset_id, preferred_date, description)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, tenantId, customerId, input.assetId ?? null, input.preferredDate ?? null, input.description ?? null]);
      await this.audit.append(tx, {
        tenantId, actorId: null, action: 'portal.appointment.requested',
        entityType: 'appointment_request', entityId: id,
        before: null, after: { customerId, assetId: input.assetId ?? null, preferredDate: input.preferredDate ?? null },
      });
      return { id, status: 'requested' };
    });
  }

  async appointments(): Promise<any[]> {
    const { tenantId, customerId } = this.scope();
    return this.pg.withTenant(tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT id, asset_id, preferred_date, description, status, created_at
           FROM app.appointment_requests WHERE customer_id = $1 ORDER BY created_at DESC`, [customerId]);
      return r.rows;
    });
  }
}
