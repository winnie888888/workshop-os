import { Injectable } from '@nestjs/common';
import { Sequence } from '@workshop/shared';
import type { TxClient } from '../db/pg.service';

/**
 * Allocates a legal, gapless document number inside the CALLER's transaction.
 *
 * The whole point of a counter (versus a Postgres sequence) is that it must not
 * leak gaps when a transaction rolls back: invoice number 142 cannot simply
 * vanish because an issuing transaction failed after grabbing it. We achieve
 * that by holding the per-(tenant, doc-type, year) counter row with
 * SELECT ... FOR UPDATE for the duration of the transaction. Two concurrent
 * issuers serialise on that row lock; whichever loses the race waits, then
 * reads the freshly incremented value. The increment commits or rolls back
 * atomically with the document it numbers, so the sequence is always dense.
 */
@Injectable()
export class CounterService {
  async next(tx: TxClient, tenantId: string, docType: Sequence.DocumentType): Promise<string> {
    const year = new Date().getUTCFullYear();

    // Make sure the counter row exists, then lock it.
    await tx.query(
      `INSERT INTO app.document_counters (tenant_id, doc_type, year, value)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (tenant_id, doc_type, year) DO NOTHING`,
      [tenantId, docType, year],
    );
    const locked = await tx.query<{ value: number }>(
      `SELECT value FROM app.document_counters
        WHERE tenant_id = $1 AND doc_type = $2 AND year = $3
        FOR UPDATE`,
      [tenantId, docType, year],
    );

    const current = { docType, year, value: locked.rows[0].value };
    const next = Sequence.nextCounter(current, year, true);

    await tx.query(
      `UPDATE app.document_counters SET value = $4, updated_at = now()
        WHERE tenant_id = $1 AND doc_type = $2 AND year = $3`,
      [tenantId, docType, year, next.value],
    );
    return Sequence.formatNumber(next);
  }
}
