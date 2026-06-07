import { BadRequestException, Injectable } from '@nestjs/common';
import { getContext } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { WorkOrdersService } from '../workorders/work-orders.service';
import { SyncMutationDto } from './sync.dto';

/**
 * The server side of offline-first (Master Blueprint §14).
 *
 * Two directions:
 *   - PULL: the device asks for every change to its tenant's syncable entities
 *     after the last cursor it saw. Because the change feed is append-only and
 *     ordered by a monotonic cursor, "catch me up" is a single ordered scan.
 *   - PUSH: the device replays the mutations it queued while offline. Each is
 *     guarded by (device_id, idempotency_key): if we have already applied it we
 *     return the stored result instead of doing it again, so a retry after a
 *     dropped connection is harmless. The actual work is delegated to the same
 *     WorkOrdersService the online API uses, so offline and online go through
 *     identical domain rules — there is no second, weaker code path.
 */
@Injectable()
export class SyncService {
  constructor(
    private readonly pg: PgService,
    private readonly workOrders: WorkOrdersService,
  ) {}

  async pull(since: string | undefined, limit: number): Promise<{ changes: any[]; nextCursor: string }> {
    const ctx = getContext();
    const sinceCursor = since ? BigInt(since) : 0n;
    const capped = Math.min(Math.max(limit, 1), 500);
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const res = await tx.query<any>(
        `SELECT cursor, entity_type, entity_id, op, version, payload, created_at
           FROM app.change_feed
          WHERE cursor > $1
          ORDER BY cursor
          LIMIT $2`,
        [sinceCursor.toString(), capped],
      );
      const changes = res.rows.map((r: any) => ({
        cursor: String(r.cursor), entityType: r.entity_type, entityId: r.entity_id,
        op: r.op, version: r.version, payload: r.payload, at: toIso(r.created_at),
      }));
      const nextCursor = changes.length > 0 ? changes[changes.length - 1].cursor : sinceCursor.toString();
      return { changes, nextCursor };
    });
  }

  async replay(mutations: SyncMutationDto[]): Promise<Array<{ idempotencyKey: string; result: any }>> {
    const out: Array<{ idempotencyKey: string; result: any }> = [];
    // Mutations are applied in order; each runs in its own transaction (inside
    // the delegated service) so one failure does not roll back earlier ones.
    for (const m of mutations) {
      const result = await this.applyOne(m);
      out.push({ idempotencyKey: m.idempotencyKey, result });
    }
    return out;
  }

  private async applyOne(m: SyncMutationDto): Promise<any> {
    const ctx = getContext();

    // Fast path: already applied? Return the stored result.
    const seen = await this.pg.withTenant(ctx.tenantId, (tx) =>
      tx.query<{ result: any }>(
        `SELECT result FROM app.sync_mutations
          WHERE device_id = $1 AND idempotency_key = $2`,
        [m.deviceId, m.idempotencyKey],
      ),
    );
    if (seen.rowCount > 0) return seen.rows[0].result;

    // Apply via the shared domain service (identical rules to the online path).
    const result = await this.dispatch(m);

    // Record that we applied it, so a replay is a no-op.
    await this.pg.withTenant(ctx.tenantId, (tx) =>
      tx.query(
        `INSERT INTO app.sync_mutations (id, tenant_id, device_id, idempotency_key, result)
         VALUES (gen_random_uuid(), $1, $2, $3, $4)
         ON CONFLICT (tenant_id, device_id, idempotency_key) DO NOTHING`,
        [ctx.tenantId, m.deviceId, m.idempotencyKey, JSON.stringify(result)],
      ),
    );
    return result;
  }

  private dispatch(m: SyncMutationDto): Promise<any> {
    const p = m.payload;
    switch (m.type) {
      case 'work_order.create':
        return this.workOrders.create(p as any);
      case 'work_order.add_line':
        return this.workOrders.addLine(p.workOrderId, p.line);
      case 'work_order.transition':
        return this.workOrders.transition(p.workOrderId, p.to);
      case 'time.clock_on':
        return this.workOrders.clockOn(p.workOrderId, { mechanicId: p.mechanicId });
      case 'time.clock_off':
        return this.workOrders.clockOff(p.workOrderId, { mechanicId: p.mechanicId });
      default:
        throw new BadRequestException(`Unknown mutation type: ${m.type}`);
    }
  }
}

function toIso(v: any): string {
  return v instanceof Date ? v.toISOString() : String(v);
}
