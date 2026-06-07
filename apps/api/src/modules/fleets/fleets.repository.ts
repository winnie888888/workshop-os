import { Injectable } from '@nestjs/common';
import type { TxClient } from '../../common/db/pg.service';

export interface Fleet {
  id: string;
  tenantId: string;
  customerId: string;
  name: string;
  costCenter: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  version: number;
}

interface Row {
  id: string; tenant_id: string; customer_id: string; name: string;
  cost_center: string | null; notes: string | null; status: string; version: number;
}
const toDomain = (r: Row): Fleet => ({
  id: r.id, tenantId: r.tenant_id, customerId: r.customer_id, name: r.name,
  costCenter: r.cost_center, notes: r.notes, status: r.status as Fleet['status'], version: r.version,
});

@Injectable()
export class FleetsRepository {
  async insert(
    tx: TxClient,
    f: { id: string; tenantId: string; customerId: string; name: string; costCenter: string | null; notes: string | null },
  ): Promise<Fleet> {
    const res = await tx.query<Row>(
      `INSERT INTO app.fleets (id, tenant_id, customer_id, name, cost_center, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [f.id, f.tenantId, f.customerId, f.name, f.costCenter, f.notes],
    );
    return toDomain(res.rows[0]);
  }

  async findById(tx: TxClient, id: string): Promise<Fleet | null> {
    const res = await tx.query<Row>(`SELECT * FROM app.fleets WHERE id = $1`, [id]);
    return res.rowCount > 0 ? toDomain(res.rows[0]) : null;
  }

  async listByCustomer(tx: TxClient, customerId: string): Promise<Fleet[]> {
    const res = await tx.query<Row>(
      `SELECT * FROM app.fleets WHERE customer_id = $1 ORDER BY lower(name)`,
      [customerId],
    );
    return res.rows.map(toDomain);
  }
}
