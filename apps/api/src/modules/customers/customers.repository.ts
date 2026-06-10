import { Injectable } from '@nestjs/common';
import type { TxClient } from '../../common/db/pg.service';
import type { Customer } from '@workshop/shared';

interface CustomerRow {
  id: string; tenant_id: string; code: string | null; name: string; type: string;
  country: string; address: string | null; post_code: string | null; city: string | null;
  vat_liable: boolean; vat_id: string | null; tax_id: string | null; registration_no: string | null;
  currency: string; payment_terms_days: number; discount_pct: string; price_list_id: string | null;
  einvoice_capable: boolean; peppol_id: string | null; minimax_partner_id: string | null;
  notes: string | null; status: string; version: number;
  vat_id_validated: boolean | null; vat_id_validation_source: string | null; vat_id_validated_at: Date | string | null;
}

function toDomain(r: CustomerRow): Customer {
  return {
    id: r.id, tenantId: r.tenant_id, code: r.code, name: r.name, type: r.type as Customer['type'],
    country: r.country, address: r.address, postCode: r.post_code, city: r.city,
    vatLiable: r.vat_liable, vatId: r.vat_id, taxId: r.tax_id, registrationNo: r.registration_no,
    vatIdValidated: r.vat_id_validated ?? false,
    vatIdValidationSource: (r.vat_id_validation_source as 'vies' | 'manual' | null) ?? null,
    vatIdValidatedAt: r.vat_id_validated_at
      ? (r.vat_id_validated_at instanceof Date ? r.vat_id_validated_at.toISOString() : String(r.vat_id_validated_at))
      : null,
    currency: r.currency, paymentTermsDays: r.payment_terms_days, discountPct: String(r.discount_pct),
    priceListId: r.price_list_id, einvoiceCapable: r.einvoice_capable, peppolId: r.peppol_id,
    minimaxPartnerId: r.minimax_partner_id, notes: r.notes, status: r.status as Customer['status'],
  };
}

@Injectable()
export class CustomersRepository {
  async insert(
    tx: TxClient,
    c: {
      id: string; tenantId: string; code: string | null; name: string; type: string;
      country: string; address: string | null; postCode: string | null; city: string | null;
      vatLiable: boolean; vatId: string | null; taxId: string | null; registrationNo: string | null;
      currency: string; paymentTermsDays: number; discountPct: string; minimaxPartnerId: string | null;
      createdBy: string | null;
    },
  ): Promise<Customer> {
    const res = await tx.query<CustomerRow>(
      `INSERT INTO app.customers
         (id, tenant_id, code, name, type, country, address, post_code, city,
          vat_liable, vat_id, tax_id, registration_no, currency, payment_terms_days,
          discount_pct, minimax_partner_id, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18)
       RETURNING *`,
      [
        c.id, c.tenantId, c.code, c.name, c.type, c.country, c.address, c.postCode, c.city,
        c.vatLiable, c.vatId, c.taxId, c.registrationNo, c.currency, c.paymentTermsDays,
        c.discountPct, c.minimaxPartnerId, c.createdBy,
      ],
    );
    return toDomain(res.rows[0]);
  }

  async findById(tx: TxClient, id: string): Promise<Customer | null> {
    const res = await tx.query<CustomerRow>(`SELECT * FROM app.customers WHERE id = $1`, [id]);
    return res.rowCount > 0 ? toDomain(res.rows[0]) : null;
  }

  /**
   * Persist the outcome of a VAT-id validation (Phase 4C). Writes the flag and
   * its full provenance together so the row-level state always satisfies the
   * provenance constraint: a validated id records source + timestamp + actor; an
   * unvalidated one clears them. `source` is 'vies' or 'manual'; `note` carries
   * the human attestation text for a manual confirmation.
   */
  async setVatValidation(
    tx: TxClient,
    id: string,
    v: { validated: boolean; source: 'vies' | 'manual' | null; by: string | null; note: string | null },
  ): Promise<Customer | null> {
    const res = await tx.query<CustomerRow>(
      `UPDATE app.customers SET
          vat_id_validated        = $2,
          vat_id_validation_source= $3,
          vat_id_validated_at     = CASE WHEN $2 THEN now() ELSE NULL END,
          vat_id_validated_by     = CASE WHEN $2 THEN $4::uuid ELSE NULL END,
          vat_id_validation_note  = $5,
          updated_by              = $4,
          updated_at              = now()
        WHERE id = $1
        RETURNING *`,
      [id, v.validated, v.validated ? v.source : null, v.by, v.note],
    );
    return res.rowCount > 0 ? toDomain(res.rows[0]) : null;
  }

  /**
   * Update the mutable fields of an existing customer. Every column uses
   * COALESCE($n, column) so a partial patch only touches the fields actually
   * supplied — the identity columns (id, tenant_id, created_by) are never
   * rewritten. Returns the updated row, or null if it does not exist in tenant.
   */
  async update(
    tx: TxClient,
    id: string,
    c: {
      code?: string | null; name?: string; type?: string; country?: string;
      address?: string | null; postCode?: string | null; city?: string | null;
      vatLiable?: boolean; vatId?: string | null; taxId?: string | null;
      registrationNo?: string | null; currency?: string; paymentTermsDays?: number;
      discountPct?: string; minimaxPartnerId?: string | null; updatedBy: string | null;
    },
  ): Promise<Customer | null> {
    const res = await tx.query<CustomerRow>(
      `UPDATE app.customers SET
          code              = COALESCE($2, code),
          name              = COALESCE($3, name),
          type              = COALESCE($4, type),
          country           = COALESCE($5, country),
          address           = COALESCE($6, address),
          post_code         = COALESCE($7, post_code),
          city              = COALESCE($8, city),
          vat_liable        = COALESCE($9, vat_liable),
          vat_id            = COALESCE($10, vat_id),
          tax_id            = COALESCE($11, tax_id),
          registration_no   = COALESCE($12, registration_no),
          currency          = COALESCE($13, currency),
          payment_terms_days= COALESCE($14, payment_terms_days),
          discount_pct      = COALESCE($15, discount_pct),
          minimax_partner_id= COALESCE($16, minimax_partner_id),
          updated_by        = $17,
          updated_at        = now()
        WHERE id = $1
        RETURNING *`,
      [
        id, c.code ?? null, c.name ?? null, c.type ?? null, c.country ?? null,
        c.address ?? null, c.postCode ?? null, c.city ?? null,
        c.vatLiable ?? null, c.vatId ?? null, c.taxId ?? null, c.registrationNo ?? null,
        c.currency ?? null, c.paymentTermsDays ?? null, c.discountPct ?? null,
        c.minimaxPartnerId ?? null, c.updatedBy,
      ],
    );
    return res.rowCount > 0 ? toDomain(res.rows[0]) : null;
  }

  /** Cursor pagination by (name, id). Returns up to `limit` rows. */
  async list(tx: TxClient, limit: number, afterName?: string, afterId?: string, q?: string): Promise<Customer[]> {
    // Server-side search: one needle across the fields an advisor actually
    // types at the counter — name, VAT id, city, code. Combined with the same
    // keyset pagination so a filtered list pages exactly like the full one.
    const needle = q?.trim() ? `%${q.trim()}%` : undefined;
    const search = needle
      ? `(name ILIKE $N OR vat_id ILIKE $N OR city ILIKE $N OR code ILIKE $N)`
      : undefined;

    if (afterName !== undefined && afterId !== undefined) {
      const params: any[] = [afterName, afterId, limit];
      let where = `(lower(name), id) > (lower($1), $2)`;
      if (search) { params.push(needle); where += ` AND ${search.replace(/\$N/g, `$${params.length}`)}`; }
      const res = await tx.query<CustomerRow>(
        `SELECT * FROM app.customers WHERE ${where} ORDER BY lower(name), id LIMIT $3`,
        params,
      );
      return res.rows.map(toDomain);
    }
    if (search) {
      const res = await tx.query<CustomerRow>(
        `SELECT * FROM app.customers WHERE ${search.replace(/\$N/g, '$2')} ORDER BY lower(name), id LIMIT $1`,
        [limit, needle],
      );
      return res.rows.map(toDomain);
    }
    const res = await tx.query<CustomerRow>(
      `SELECT * FROM app.customers ORDER BY lower(name), id LIMIT $1`,
      [limit],
    );
    return res.rows.map(toDomain);
  }
}
