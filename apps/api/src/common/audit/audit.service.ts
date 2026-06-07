import { Injectable } from '@nestjs/common';
import { Audit } from '@workshop/shared';
import { TxClient } from '../db/pg.service';

/**
 * Appends a tamper-evident audit entry within the CURRENT transaction.
 * The previous entry is read with FOR UPDATE so concurrent appends for the
 * same tenant serialise into one linear chain (Master Blueprint §8).
 *
 * Must be called inside PgService.withTenant so RLS scopes the rows.
 */
@Injectable()
export class AuditService {
  async append(
    tx: TxClient,
    input: {
      tenantId: string;
      actorId: string | null;
      action: string;
      entityType: string;
      entityId: string;
      before: unknown | null;
      after: unknown | null;
    },
  ): Promise<{ seq: number; hash: string }> {
    // Lock the latest row for this tenant to serialise the chain.
    const prev = await tx.query<{ seq: string; hash: string }>(
      `SELECT seq, hash FROM app.audit_log
        WHERE tenant_id = $1 ORDER BY seq DESC LIMIT 1 FOR UPDATE`,
      [input.tenantId],
    );

    const prevEntry =
      prev.rowCount > 0
        ? ({ seq: Number(prev.rows[0].seq), hash: prev.rows[0].hash } as Audit.AuditEntry)
        : null;

    const occurredAt = new Date().toISOString();
    const entryInput: Audit.AuditEntryInput = {
      tenantId: input.tenantId,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before,
      after: input.after,
      occurredAt,
    };
    const entry = Audit.appendEntry(prevEntry, entryInput);

    await tx.query(
      `INSERT INTO app.audit_log
        (tenant_id, seq, actor_id, action, entity_type, entity_id, before, after, occurred_at, prev_hash, hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        entry.tenantId,
        entry.seq,
        entry.actorId,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.before === null ? null : safeJson(entry.before),
        entry.after === null ? null : safeJson(entry.after),
        entry.occurredAt,
        entry.prevHash,
        entry.hash,
      ],
    );
    return { seq: entry.seq, hash: entry.hash };
  }
}

/**
 * Audit payloads occasionally contain Money (bigint minor units), which plain
 * JSON.stringify rejects. We coerce bigint to string so an audit write can
 * never crash a business transaction — the audit trail must be the most robust
 * write in the system, not the most fragile.
 */
function safeJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
}
