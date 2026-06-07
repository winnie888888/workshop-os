import { Injectable } from '@nestjs/common';
import { Search, getContext } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';

/**
 * Global search service — powers the advisor command bar. It classifies the
 * query with the shared (tested) Search core to decide which columns to target
 * first, runs RLS-scoped lookups across customers, vehicles, and work orders,
 * tags exact identifier matches, then merges and ranks the results with the
 * shared ranker. The database does the matching; the shared core does the
 * intelligence, so "why did the wrong thing rank first" is answerable in a test.
 */
@Injectable()
export class SearchService {
  constructor(private readonly pg: PgService) {}

  async search(rawQuery: string, limit = 10) {
    const { display } = Search.normalizeQuery(rawQuery ?? '');
    if (display.length < 2) return { query: display, intent: 'text', hits: [] };

    const intent = Search.classifyQuery(display);
    const ctx = getContext();
    const like = `%${display.toLowerCase()}%`;
    const plate = Search.normalizePlate(display);

    const hits = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      const out: Search.SearchHit[] = [];

      // Customers — by name (fuzzy) or VAT id (exact).
      const customers = await tx.query<any>(
        `SELECT id, name, vat_id, city,
                (lower(vat_id) = lower($2)) AS exact
           FROM app.customers
          WHERE lower(name) LIKE $1 OR lower(vat_id) = lower($2)
          ORDER BY name LIMIT $3`,
        [like, display, limit],
      );
      for (const c of customers.rows) {
        out.push({ type: 'customer', id: c.id, label: c.name,
          sublabel: [c.city, c.vat_id].filter(Boolean).join(' · ') || undefined, exact: Boolean(c.exact) });
      }

      // Vehicles — by plate (normalised exact-ish) or VIN (exact) or fuzzy.
      const vehicles = await tx.query<any>(
        `SELECT id, plate, make, model, vin,
                (upper(regexp_replace(plate, '[\\s-]', '', 'g')) = $2 OR upper(vin) = upper($3)) AS exact
           FROM app.assets
          WHERE upper(regexp_replace(plate, '[\\s-]', '', 'g')) LIKE '%' || $2 || '%'
             OR upper(vin) LIKE '%' || upper($3) || '%'
          ORDER BY plate LIMIT $4`,
        [like, plate, display, limit],
      );
      for (const v of vehicles.rows) {
        out.push({ type: 'vehicle', id: v.id, label: v.plate,
          sublabel: [v.make, v.model].filter(Boolean).join(' ') || undefined, exact: Boolean(v.exact) });
      }

      // Work orders — by document number (exact-ish).
      const wos = await tx.query<any>(
        `SELECT w.id, w.number, c.name AS customer_name,
                (lower(w.number) = lower($1)) AS exact
           FROM app.work_orders w
           LEFT JOIN app.customers c ON c.id = w.customer_id
          WHERE w.number IS NOT NULL AND lower(w.number) LIKE '%' || lower($1) || '%'
          ORDER BY w.created_at DESC LIMIT $2`,
        [display, limit],
      );
      for (const w of wos.rows) {
        out.push({ type: 'work_order', id: w.id, label: w.number ?? '(draft)',
          sublabel: w.customer_name ?? undefined, exact: Boolean(w.exact) });
      }

      return out;
    });

    return { query: display, intent, hits: Search.rankHits(hits, intent).slice(0, limit) };
  }
}
