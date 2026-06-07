import { Injectable } from '@nestjs/common';
import type { TxClient } from '../db/pg.service';

/**
 * Writes one row to the offline change feed for every server-side change to a
 * syncable entity (Master Blueprint §14). This is what lets a bay tablet that
 * has been offline for an hour catch up: it asks "give me everything for my
 * tenant after cursor N" and replays the rows in order.
 *
 * It must be called inside the SAME transaction as the change it describes, so
 * a device can never observe a change that later rolled back, and can never
 * miss a change that committed.
 */
@Injectable()
export class ChangeFeedService {
  async append(
    tx: TxClient,
    params: {
      tenantId: string;
      entityType: 'work_order' | 'work_order_line' | 'time_entry';
      entityId: string;
      op: 'upsert' | 'delete';
      version: number;
      payload: unknown;
    },
  ): Promise<void> {
    await tx.query(
      `INSERT INTO app.change_feed (tenant_id, entity_type, entity_id, op, version, payload)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.tenantId, params.entityType, params.entityId, params.op,
        params.version, JSON.stringify(params.payload),
      ],
    );
  }
}
