import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';
import { PgService } from '../common/db/pg.service';
import { AppConfig } from '../config/configuration';
import { OUTBOX_HANDLERS, type OutboxEvent, type OutboxHandler } from '../common/events/outbox-handler.interface';

/**
 * Standalone outbox worker (Architecture §1.5, §6).
 *
 * Loop:
 *   1. Claim a batch of due rows with FOR UPDATE SKIP LOCKED (so multiple
 *      worker instances never process the same row).
 *   2. Dispatch each to its registered handler by event_type.
 *   3. On success -> status 'done'. On transient error -> retry with
 *      exponential backoff (attempts++). On permanent error or attempts
 *      exhausted -> status 'dead' (dead-letter for ops).
 *
 * The workshop never blocks on this: business writes commit immediately and
 * the worker drains asynchronously.
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('OutboxWorker');
  const appCtx = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: false });
  const pg = appCtx.get(PgService);
  const config = appCtx.get(AppConfig);
  const handlerList = appCtx.get<OutboxHandler[]>(OUTBOX_HANDLERS, { strict: false }) ?? [];
  const handlers = new Map(handlerList.map((h) => [h.eventType, h]));

  logger.log(`Outbox worker started; handlers: ${[...handlers.keys()].join(', ') || '(none)'}`);

  let running = true;
  const shutdown = () => { running = false; };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  while (running) {
    try {
      const processed = await drainBatch(pg, config, handlers, logger);
      if (processed === 0) await sleep(config.outboxPollMs);
    } catch (err) {
      logger.error('Outbox loop error', err as Error);
      await sleep(config.outboxPollMs);
    }
  }

  await appCtx.close();
  logger.log('Outbox worker stopped');
}

async function drainBatch(
  pg: PgService,
  config: AppConfig,
  handlers: Map<string, OutboxHandler>,
  logger: Logger,
): Promise<number> {
  // Claim due rows across all tenants (admin scope; outbox carries tenant_id).
  const claimed = await pg.withAdmin(async (tx) => {
    const res = await tx.query<{
      id: string; tenant_id: string; event_type: string; payload: any; attempts: number;
    }>(
      `UPDATE app.outbox o
          SET status = 'processing', updated_at = now()
        WHERE o.id IN (
          SELECT id FROM app.outbox
           WHERE status IN ('pending','processing')
             AND next_attempt_at <= now()
           ORDER BY next_attempt_at
           FOR UPDATE SKIP LOCKED
           LIMIT 20
        )
        RETURNING id, tenant_id, event_type, payload, attempts`,
    );
    return res.rows;
  });

  for (const row of claimed) {
    const event: OutboxEvent = {
      id: row.id,
      tenantId: row.tenant_id,
      eventType: row.event_type,
      payload: row.payload,
      attempts: row.attempts,
    };
    const handler = handlers.get(event.eventType);
    if (!handler) {
      await markDead(pg, event.id, `No handler for event_type=${event.eventType}`);
      continue;
    }
    try {
      await handler.handle(event);
      await pg.withAdmin((tx) =>
        tx.query(`UPDATE app.outbox SET status='done', updated_at=now() WHERE id=$1`, [event.id]),
      );
    } catch (err) {
      const transient = (err as { transient?: boolean }).transient !== false; // default transient
      const attempts = event.attempts + 1;
      if (!transient || attempts >= config.outboxMaxAttempts) {
        await markDead(pg, event.id, (err as Error).message);
        logger.error(`Event ${event.id} dead-lettered: ${(err as Error).message}`);
      } else {
        const backoffMs = Math.min(2 ** attempts * 1000, 60 * 60 * 1000); // cap 1h
        await pg.withAdmin((tx) =>
          tx.query(
            `UPDATE app.outbox
                SET status='pending', attempts=$2, last_error=$3,
                    next_attempt_at = now() + ($4 || ' milliseconds')::interval,
                    updated_at=now()
              WHERE id=$1`,
            [event.id, attempts, (err as Error).message.slice(0, 1000), String(backoffMs)],
          ),
        );
        logger.warn(`Event ${event.id} retry ${attempts} in ${backoffMs}ms`);
      }
    }
  }
  return claimed.length;
}

async function markDead(pg: PgService, id: string, error: string): Promise<void> {
  await pg.withAdmin((tx) =>
    tx.query(
      `UPDATE app.outbox SET status='dead', last_error=$2, updated_at=now() WHERE id=$1`,
      [id, error.slice(0, 1000)],
    ),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

void bootstrap();
