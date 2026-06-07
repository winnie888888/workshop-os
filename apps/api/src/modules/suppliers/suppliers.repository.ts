import { Injectable } from '@nestjs/common';
import type { TxClient } from '../../common/db/pg.service';
import type { Supplier } from '@workshop/shared';

// Row shape as it comes back from Postgres (snake_case), mapped to the domain
// camelCase by toDomain. Same pattern as the customers repository.
interface SupplierRow {
  id: string; tenant_id: string; code: string | null; name: string; country: string;
  vat_id: string | null; currency: string; payment_terms_days: number; default_lead_time_days: number;
  email: string | null; phone: string | null; address: string | null; notes: string | null;
  minimax_partner_id: string | null; status: string; version: number;
}

function toDomain(r: SupplierRow): Supplier {
  return {
    id: r.id, tenantId: r.tenant_id, code: r.code, name: r.name, country: r.country,
    vatId: r.vat_id, currency: r.currency, paymentTermsDays: r.payment_terms_days,
    defaultLeadTimeDays: r.default_lead_time_days, email: r.email, phone: r.phone,
    address: r.address, notes: r.notes, minimaxPartnerId: r.minimax_partner_id,
    status: r.status as Supplier['status'],
  };
}

@Injectable()
export class SuppliersRepository {
  async insert(
    tx: TxClient,
    s: {
      id: string; tenantId: string; code: string | null; name: string; country: string;
      vatId: string | null; currency: string; paymentTermsDays: number; defaultLeadTimeDays: number;
      email: string | null; phone: string | null; address: string | null; notes: string | null;
      createdBy: string | null;
    },
  ): Promise<Supplier> {
    const res = await tx.query<SupplierRow>(
      `INSERT INTO app.suppliers
         (id, tenant_id, code, name, country, vat_id, currency, payment_terms_days,
          default_lead_time_days, email, phone, address, notes, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)
       RETURNING *`,
      [
        s.id, s.tenantId, s.code, s.name, s.country.toUpperCase(), s.vatId,
        s.currency.toUpperCase(), s.paymentTermsDays, s.defaultLeadTimeDays,
        s.email, s.phone, s.address, s.notes, s.createdBy,
      ],
    );
    return toDomain(res.rows[0]);
  }

  async findById(tx: TxClient, id: string): Promise<Supplier | null> {
    const res = await tx.query<SupplierRow>(`SELECT * FROM app.suppliers WHERE id = $1`, [id]);
    return res.rowCount > 0 ? toDomain(res.rows[0]) : null;
  }

  async list(tx: TxClient, opts: { status?: string; limit: number }): Promise<Supplier[]> {
    const res = await tx.query<SupplierRow>(
      `SELECT * FROM app.suppliers
        WHERE ($1::text IS NULL OR status = $1)
        ORDER BY lower(name) LIMIT $2`,
      [opts.status ?? null, opts.limit],
    );
    return res.rows.map(toDomain);
  }

  /**
   * Partial update: every field guarded by COALESCE so a patch only changes
   * what it supplies and never blanks an untouched column. Mirrors the customer
   * update path exactly.
   */
  async update(
    tx: TxClient,
    id: string,
    s: {
      code?: string | null; name?: string; country?: string; vatId?: string | null;
      currency?: string; paymentTermsDays?: number; defaultLeadTimeDays?: number;
      email?: string | null; phone?: string | null; address?: string | null;
      notes?: string | null; status?: string; updatedBy: string | null;
    },
  ): Promise<Supplier | null> {
    const res = await tx.query<SupplierRow>(
      `UPDATE app.suppliers SET
          code                  = COALESCE($2, code),
          name                  = COALESCE($3, name),
          country               = COALESCE($4, country),
          vat_id                = COALESCE($5, vat_id),
          currency              = COALESCE($6, currency),
          payment_terms_days    = COALESCE($7, payment_terms_days),
          default_lead_time_days= COALESCE($8, default_lead_time_days),
          email                 = COALESCE($9, email),
          phone                 = COALESCE($10, phone),
          address               = COALESCE($11, address),
          notes                 = COALESCE($12, notes),
          status                = COALESCE($13, status),
          updated_by            = $14,
          version               = version + 1
        WHERE id = $1
        RETURNING *`,
      [
        id, s.code ?? null, s.name ?? null, s.country?.toUpperCase() ?? null, s.vatId ?? null,
        s.currency?.toUpperCase() ?? null, s.paymentTermsDays ?? null, s.defaultLeadTimeDays ?? null,
        s.email ?? null, s.phone ?? null, s.address ?? null, s.notes ?? null, s.status ?? null,
        s.updatedBy,
      ],
    );
    return res.rowCount > 0 ? toDomain(res.rows[0]) : null;
  }

  // --- supplier ↔ item cross reference ------------------------------------

  async linkItem(
    tx: TxClient,
    l: {
      id: string; tenantId: string; supplierId: string; itemId: string;
      supplierSku: string | null; supplierName: string | null; packSize: number;
      lastPriceMinor: string; currency: string; leadTimeDays: number | null; preferred: boolean;
    },
  ): Promise<void> {
    // If this link is being marked preferred, clear any other preferred link
    // for the same item first (the partial unique index would otherwise reject).
    if (l.preferred) {
      await tx.query(
        `UPDATE app.supplier_items SET preferred = false WHERE item_id = $1 AND preferred = true`,
        [l.itemId],
      );
    }
    await tx.query(
      `INSERT INTO app.supplier_items
         (id, tenant_id, supplier_id, item_id, supplier_sku, supplier_name, pack_size,
          last_price_minor, currency, lead_time_days, preferred)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (tenant_id, supplier_id, item_id) DO UPDATE SET
          supplier_sku = EXCLUDED.supplier_sku, supplier_name = EXCLUDED.supplier_name,
          pack_size = EXCLUDED.pack_size, last_price_minor = EXCLUDED.last_price_minor,
          currency = EXCLUDED.currency, lead_time_days = EXCLUDED.lead_time_days,
          preferred = EXCLUDED.preferred`,
      [
        l.id, l.tenantId, l.supplierId, l.itemId, l.supplierSku, l.supplierName, l.packSize,
        l.lastPriceMinor, l.currency.toUpperCase(), l.leadTimeDays, l.preferred,
      ],
    );
    // Keep the item's preferred-supplier pointer in step.
    if (l.preferred) {
      await tx.query(
        `UPDATE app.inventory_items SET preferred_supplier_id = $2 WHERE id = $1`,
        [l.itemId, l.supplierId],
      );
    }
  }

  async itemsForSupplier(tx: TxClient, supplierId: string): Promise<any[]> {
    const res = await tx.query<any>(
      `SELECT si.*, i.name AS item_name, i.sku AS item_sku
         FROM app.supplier_items si
         JOIN app.inventory_items i ON i.id = si.item_id
        WHERE si.supplier_id = $1
        ORDER BY i.name`,
      [supplierId],
    );
    return res.rows;
  }

  async suppliersForItem(tx: TxClient, itemId: string): Promise<any[]> {
    const res = await tx.query<any>(
      `SELECT si.*, s.name AS supplier_name_full, s.country
         FROM app.supplier_items si
         JOIN app.suppliers s ON s.id = si.supplier_id
        WHERE si.item_id = $1
        ORDER BY si.preferred DESC, s.name`,
      [itemId],
    );
    return res.rows;
  }
}
