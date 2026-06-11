import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PgService } from '../common/db/pg.service';
import { OutboxService } from '../common/outbox/outbox.service';
import { normalizeSiPhone } from '../integrations/notifications/phone.util';

/**
 * Opomniki — urni sweep (SMS spec: payment_reminder; appointment_reminder
 * pride v istem ogrodju, ko bo shema terminov potrjena).
 *
 * Dve opravili v ENI admin transakciji na tick:
 *
 *   1. STATUS: računi 'issued'/'sent' z zapadlim due_date in odprtim saldom
 *      preklopijo v 'overdue'. To je IZPELJANO stanje (derivat datuma in
 *      salda), ne uporabniško dejanje — zato brez per-row audita; sweep
 *      zapiše samo število v dnevnik. Immutability trigger status/paid
 *      namenoma spušča (0004). 'partly_paid' obdrži svojo oznako (nosi
 *      informacijo o delnem plačilu), opomnik pa vseeno dobi.
 *
 *   2. OPOMNIK: za vsak zapadel odprt račun stranke s telefonom se v outbox
 *      vstavi notification.send (payment_reminder). Idempotenčni ključ
 *      vsebuje ISO teden -> največ EN SMS na račun na teden, tudi če sweep
 *      teče vsako uro ali na več instancah (ON CONFLICT DO NOTHING).
 *
 * Varnost ob sočasnosti: obe operaciji sta idempotentni, zato instance ne
 * potrebujejo zaklepanja. REMINDERS_SWEEP_MS=0 sweep izklopi (testi/skripte);
 * privzeto enkrat na uro, prvi tek ~20 s po zagonu.
 */
@Injectable()
export class RemindersSweepService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('RemindersSweep');
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private running = false;

  constructor(
    private readonly pg: PgService,
    private readonly outbox: OutboxService,
  ) {}

  private get intervalMs(): number {
    const raw = Number(process.env.REMINDERS_SWEEP_MS ?? 3_600_000);
    return Number.isFinite(raw) ? raw : 3_600_000;
  }

  onModuleInit(): void {
    if (this.intervalMs <= 0) {
      this.log.warn('REMINDERS_SWEEP_MS<=0 — sweep izklopljen.');
      return;
    }
    this.log.log(`started (interval=${this.intervalMs}ms)`);
    this.schedule(20_000); // prvi tek kmalu po zagonu, ne v špici bootstrapa
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  private schedule(ms: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => void this.tick(), ms);
  }

  /** En prehod. Nikoli ne vrže; vedno se ponovno razporedi. */
  private async tick(): Promise<void> {
    if (this.running) return this.schedule(this.intervalMs);
    this.running = true;
    try {
      await this.pg.withAdmin(async (tx) => {
        // (1) Izpeljan status: zapadlo + odprt saldo -> 'overdue'.
        const flipped = await tx.query(
          `UPDATE app.invoices
              SET status = 'overdue', version = version + 1, updated_at = now()
            WHERE kind = 'invoice'
              AND status IN ('issued','sent')
              AND due_date IS NOT NULL AND due_date < CURRENT_DATE
              AND (total_gross_minor - paid_minor) > 0`,
        );
        if ((flipped.rowCount ?? 0) > 0) {
          this.log.log(`overdue status: ${flipped.rowCount} račun(ov) preklopljenih`);
        }

        // (2) SMS opomniki za zapadle odprte račune strank s telefonom.
        const due = await tx.query<any>(
          `SELECT i.id, i.tenant_id, i.number, i.due_date, i.currency,
                  (i.total_gross_minor - i.paid_minor) AS outstanding,
                  c.phone, t.name AS tenant_name
             FROM app.invoices i
             JOIN app.customers c ON c.id = i.customer_id
             JOIN app.tenants t ON t.id = i.tenant_id
            WHERE i.kind = 'invoice'
              AND i.status IN ('overdue','partly_paid')
              AND i.due_date IS NOT NULL AND i.due_date < CURRENT_DATE
              AND (i.total_gross_minor - i.paid_minor) > 0
              AND c.phone IS NOT NULL AND c.phone <> ''`,
        );

        let enqueued = 0;
        const week = isoWeekKey(new Date()); // npr. 2026-W24 -> max 1 SMS/teden/račun
        for (const r of due.rows) {
          const dueDate = r.due_date instanceof Date
            ? r.due_date.toISOString().slice(0, 10)
            : String(r.due_date).slice(0, 10);
          await this.outbox.enqueue(tx, {
            tenantId: r.tenant_id,
            eventType: 'notification.send',
            payload: {
              channel: 'sms',
              to: normalizeSiPhone(r.phone),
              kind: 'payment_reminder',
              body: `Račun ${r.number ?? ''} v znesku ${eurFromMinor(BigInt(r.outstanding))} je zapadel ${dueDate}. Prosimo za plačilo. — ${r.tenant_name}`,
            },
            idempotencyKey: `notify.payment_reminder:${r.id}:${week}`,
          });
          enqueued++;
        }
        if (enqueued > 0) this.log.log(`payment_reminder: ${enqueued} opomnik(ov) v vrsti (teden ${week})`);
      });
    } catch (err: any) {
      this.log.error(`tick failed: ${err?.message ?? err}`);
    } finally {
      this.running = false;
      this.schedule(this.intervalMs);
    }
  }
}

/** ISO teden kot stabilen idempotenčni delilnik: '2026-W24'. */
function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Prikaz zneska v SMS: minor (bigint) -> "123,45 €". */
function eurFromMinor(minor: bigint): string {
  return `${(Number(minor) / 100).toFixed(2).replace('.', ',')} €`;
}
