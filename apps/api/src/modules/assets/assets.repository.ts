import { Injectable } from '@nestjs/common';
import type { TxClient } from '../../common/db/pg.service';

export interface Asset {
  id: string; tenantId: string; customerId: string; fleetId: string | null;
  type: string; plate: string; countryOfPlate: string; vin: string | null;
  make: string | null; model: string | null; year: number | null;
  odometerLast: number | null; status: string;
}

interface Row {
  id: string; tenant_id: string; customer_id: string; fleet_id: string | null;
  type: string; plate: string; country_of_plate: string; vin: string | null;
  make: string | null; model: string | null; year: number | null;
  odometer_last: number | null; status: string;
}
const toDomain = (r: Row): Asset => ({
  id: r.id, tenantId: r.tenant_id, customerId: r.customer_id, fleetId: r.fleet_id,
  type: r.type, plate: r.plate, countryOfPlate: r.country_of_plate, vin: r.vin,
  make: r.make, model: r.model, year: r.year, odometerLast: r.odometer_last, status: r.status,
});

@Injectable()
export class AssetsRepository {
  async insert(
    tx: TxClient,
    a: {
      id: string; tenantId: string; customerId: string; fleetId: string | null; type: string;
      plate: string; countryOfPlate: string; vin: string | null; make: string | null;
      model: string | null; year: number | null; odometerLast: number | null; createdBy: string | null;
    },
  ): Promise<Asset> {
    const res = await tx.query<Row>(
      `INSERT INTO app.assets
         (id, tenant_id, customer_id, fleet_id, type, plate, country_of_plate, vin,
          make, model, year, odometer_last, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
       RETURNING *`,
      [
        a.id, a.tenantId, a.customerId, a.fleetId, a.type, a.plate, a.countryOfPlate, a.vin,
        a.make, a.model, a.year, a.odometerLast, a.createdBy,
      ],
    );
    return toDomain(res.rows[0]);
  }

  async findById(tx: TxClient, id: string): Promise<Asset | null> {
    const res = await tx.query<Row>(`SELECT * FROM app.assets WHERE id = $1`, [id]);
    return res.rowCount > 0 ? toDomain(res.rows[0]) : null;
  }

  async findByPlate(tx: TxClient, country: string, plate: string): Promise<Asset | null> {
    const res = await tx.query<Row>(
      `SELECT * FROM app.assets WHERE country_of_plate = $1 AND plate = $2`,
      [country, plate],
    );
    return res.rowCount > 0 ? toDomain(res.rows[0]) : null;
  }

  async listByCustomer(tx: TxClient, customerId: string): Promise<Asset[]> {
    const res = await tx.query<Row>(
      `SELECT * FROM app.assets WHERE customer_id = $1 ORDER BY plate`,
      [customerId],
    );
    return res.rows.map(toDomain);
  }

  /**
   * Update a vehicle's descriptive fields. Deliberately does NOT touch
   * customer_id — re-homing a vehicle to a different owner is a distinct,
   * higher-stakes operation (it would affect history and billing) and is out of
   * scope for an ordinary edit. Partial patch via COALESCE, as with customers.
   */
  async update(
    tx: TxClient,
    id: string,
    a: {
      fleetId?: string | null; type?: string; plate?: string; countryOfPlate?: string;
      vin?: string | null; make?: string | null; model?: string | null;
      year?: number | null; odometerLast?: number | null; updatedBy: string | null;
    },
  ): Promise<Asset | null> {
    const res = await tx.query<Row>(
      `UPDATE app.assets SET
          fleet_id        = COALESCE($2, fleet_id),
          type            = COALESCE($3, type),
          plate           = COALESCE($4, plate),
          country_of_plate= COALESCE($5, country_of_plate),
          vin             = COALESCE($6, vin),
          make            = COALESCE($7, make),
          model           = COALESCE($8, model),
          year            = COALESCE($9, year),
          odometer_last   = COALESCE($10, odometer_last),
          updated_by      = $11,
          updated_at      = now()
        WHERE id = $1
        RETURNING *`,
      [
        id, a.fleetId ?? null, a.type ?? null, a.plate ?? null, a.countryOfPlate ?? null,
        a.vin ?? null, a.make ?? null, a.model ?? null, a.year ?? null, a.odometerLast ?? null,
        a.updatedBy,
      ],
    );
    return res.rowCount > 0 ? toDomain(res.rows[0]) : null;
  }

  /** Close any open link for the tractor, then open a new one. Time-bounded pairing. */
  async linkTrailer(
    tx: TxClient,
    p: { id: string; tenantId: string; tractorAssetId: string; trailerAssetId: string; validFrom: string },
  ): Promise<void> {
    await tx.query(
      `UPDATE app.asset_links SET valid_to = $3
        WHERE tenant_id = $1 AND tractor_asset_id = $2 AND valid_to IS NULL`,
      [p.tenantId, p.tractorAssetId, p.validFrom],
    );
    await tx.query(
      `INSERT INTO app.asset_links (id, tenant_id, tractor_asset_id, trailer_asset_id, valid_from)
       VALUES ($1,$2,$3,$4,$5)`,
      [p.id, p.tenantId, p.tractorAssetId, p.trailerAssetId, p.validFrom],
    );
  }

  async currentTrailer(tx: TxClient, tractorAssetId: string): Promise<string | null> {
    const res = await tx.query<{ trailer_asset_id: string }>(
      `SELECT trailer_asset_id FROM app.asset_links
        WHERE tractor_asset_id = $1 AND valid_to IS NULL
        ORDER BY valid_from DESC LIMIT 1`,
      [tractorAssetId],
    );
    return res.rowCount > 0 ? res.rows[0].trailer_asset_id : null;
  }
}
