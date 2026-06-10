import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { PgService } from '../db/pg.service';
import { AppConfig } from '../../config/configuration';
import { OUTBOX_HANDLERS } from '../events/outbox-handler.interface';
import type { OutboxEvent, OutboxHandler } from '../events/outbox-handler.interface';

/**
 * Outbox worker (Architecture §1.5, §6) — the missing half of the transactional
 * outbox. Writers enqueue in the same transaction as the domain change; THIS
 * loop drains the queue: claim due events with FOR UPDATE SKIP LOCKED (safe for
 * multiple API instances), dispatch each to its registered OutboxHandler, then
 * mark done / retry with exponential backoff / dead-letter after max attempts.
 *
 * Design points:
 *  - Claims run via withAdmin: the queue spans tenants, and app.outbox is under
 *    forced RLS for the app role. Handlers receive tenantId and scope their own
 *    DB work with withTenant as usual.
 *  - Claiming flips rows to 'processing' in its own committed transaction, so a
 *    crash mid-handle cannot lose the event; a reaper returns rows stuck in
 *    'processing' beyond a grace period back to 'pending'.
 *  - An event type with no registered handler is dead-lettered immediately with
 *    a clear error — that is a programming omission, not a transient fault.
 *  - Unconfigured integrations (e.g. Minimax without credentials) throw from
 *    their adapter; that is the honest path: backoff, then dead with the real
 *    error in last_error. Nothing pretends to have synced.
 *  - OUTBOX_POLL_MS=0 disables the loop (tests / one-off scripts).
 */
@Injectable()
export class OutboxWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('OutboxWorker');
  private readonly byType = new Map<string, OutboxHandler>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private ticking = false;

  constructor(
    private readonly pg: PgService,
    private readonly config: AppConfig,
    @Optional() @Inject(OUTBOX_HANDLERS) handlers: OutboxHandler[] | null,
  ) {
    for (const h of handlers ?? []) this.byType.set(h.eventType, h);
  }

  onModuleInit(): void {
    if (this.config.outboxPollMs <= 0) {
      this.log.warn('OUTBOX_POLL_MS<=0 — worker disabled; events will queue but not dispatch.');
      return;
    }
    this.log.log(`started (poll=${this.config.outboxPollMs}ms, maxAttempts=${this.config.outboxMaxAttempts}, handlers=[${[...this.byType.keys()].join(', ') || 'none'}])`);
    this.schedule(this.config.outboxPollMs);
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  private schedule(ms: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => void this.tick(), ms);
  }

  /** One drain cycle. Never throws; always reschedules. */
  private async tick(): Promise<void> {
    if (this.ticking) return this.schedule(this.config.outboxPollMs);
    this.ticking = true;
    let drained = 0;
    try {
      await this.reclaimStale();
      // Keep draining while there is due work, so a burst clears quickly and an
      // idle queue costs one cheap query per poll interval.
      for (let round = 0; round < 10; round++) {
        const batch = await this.claim(10);
        if (batch.length === 0) break;
        for (const ev of batch) await this.dispatch(ev);
        drained += batch.length;
      }
    } catch (err: any) {
      this.log.error(`tick failed: ${err?.message ?? err}`);
    } finally {
      this.ticking = false;
      if (drained > 0) this.log.log(`drained ${drained} event(s)`);
      this.schedule(this.config.outboxPollMs);
    }
  }

  /** Atomically claim a batch of due events (multi-instance safe). */
  private async claim(limit: number): Promise<OutboxEvent[]> {
    return this.pg.withAdmin(async (tx) => {
      const res = await tx.query<any>(
        `UPDATE app.outbox o
            SET status = 'processing'
          WHERE o.id IN (
            SELECT id FROM app.outbox
             WHERE status = 'pending' AND next_attempt_at <= now()
             ORDER BY next_attempt_at
             FOR UPDATE SKIP LOCKED
             LIMIT $1
          )
          RETURNING o.id, o.tenant_id, o.event_type, o.payload, o.attempts`,
        [limit],
      );
      return res.rows.map((r: any): OutboxEvent => ({
        id: r.id,
        tenantId: r.tenant_id,
        eventType: r.event_type,
        payload: r.payload,
        attempts: Number(r.attempts) || 0,
      }));
    });
  }

  private async dispatch(ev: OutboxEvent): Promise<void> {
    const handler = this.byType.get(ev.eventType);
    if (!handler) {
      await this.markDead(ev, `no handler registered for event_type='${ev.eventType}'`);
      this.log.error(`dead (no handler): ${ev.eventType} ${ev.id}`);
      return;
    }
    try {
      await handler.handle(ev);
      await this.markDone(ev);
    } catch (err: any) {
      const message = String(err?.message ?? err).slice(0, 500);
      const attempts = ev.attempts + 1;
      if (attempts >= this.config.outboxMaxAttempts) {
        await this.markDead(ev, message, attempts);
        this.log.error(`dead after ${attempts} attempts: ${ev.eventType} ${ev.id} — ${message}`);
      } else {
        const delaySec = Math.min(3600, Math.pow(2, attempts)); // 2s … 1h cap
        await this.markRetry(ev, message, attempts, delaySec);
        this.log.warn(`retry #${attempts} in ${delaySec}s: ${ev.eventType} ${ev.id} — ${message}`);
      }
    }
  }

  private markDone(ev: OutboxEvent): Promise<void> {
    return this.pg.withAdmin(async (tx) => {
      await tx.query(`UPDATE app.outbox SET status='done', last_error=NULL WHERE id=$1`, [ev.id]);
    });
  }

  private markRetry(ev: OutboxEvent, error: string, attempts: number, delaySec: number): Promise<void> {
    return this.pg.withAdmin(async (tx) => {
      await tx.query(
        `UPDATE app.outbox
            SET status='pending', attempts=$2, last_error=$3,
                next_attempt_at = now() + make_interval(secs => $4)
          WHERE id=$1`,
        [ev.id, attempts, error, delaySec],
      );
    });
  }

  private markDead(ev: OutboxEvent, error: string, attempts?: number): Promise<void> {
    return this.pg.withAdmin(async (tx) => {
      await tx.query(
        `UPDATE app.outbox SET status='dead', attempts=COALESCE($2, attempts), last_error=$3 WHERE id=$1`,
        [ev.id, attempts ?? null, error],
      );
      // Sistemsko opozorilo ownerjem v zvonček — dead-letter ni tiha smrt.
      // Fan-out inline v ISTI admin transakciji (atomarno s flipom v 'dead');
      // memberships je admin-only tabela, zato tu ne gre prek tenant poti.
      const owners = await tx.query<{ user_id: string }>(
        `SELECT user_id FROM app.memberships
          WHERE tenant_id = $1 AND active = true AND 'owner' = ANY(roles)`,
        [ev.tenantId],
      );
      for (const o of owners.rows) {
        await tx.query(
          `INSERT INTO app.notifications (tenant_id, recipient_user_id, kind, title, body)
           VALUES ($1, $2, 'system', $3, $4)`,
          [ev.tenantId, o.user_id, `Integracija ni uspela: ${ev.eventType}`,
           `Dogodek je po vseh poskusih označen kot neuspešen. Napaka: ${error.slice(0, 300)}`],
        );
      }
    });
  }

  /** Return events stuck in 'processing' (crashed instance) to the queue. */
  private async reclaimStale(): Promise<void> {
    await this.pg.withAdmin(async (tx) => {
      const res = await tx.query(
        `UPDATE app.outbox
            SET status='pending', next_attempt_at = now()
          WHERE status='processing' AND updated_at < now() - interval '5 minutes'`,
      );
      if (res.rowCount > 0) this.log.warn(`reclaimed ${res.rowCount} stale 'processing' event(s)`);
    });
  }
}
