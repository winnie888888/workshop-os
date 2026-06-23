import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { AppConfig } from '../../config/configuration';

/**
 * A transaction-scoped query client. Every query runs under the tenant bound
 * via `SET LOCAL app.current_tenant_id`, so Postgres RLS enforces isolation
 * even if application code forgets a tenant filter (defence in depth —
 * Architecture Blueprint §3.3, §1.4).
 */
export interface TxClient {
  query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
}

@Injectable()
export class PgService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly log = new Logger('PgService');

  constructor(private readonly config: AppConfig) {
    this.pool = new Pool({
      connectionString: config.databaseUrl,
      max: config.dbPoolMax,
      connectionTimeoutMillis: config.dbPoolConnTimeoutMs,
      idleTimeoutMillis: config.dbPoolIdleTimeoutMs,
    });
    // Brez tega bi nepričakovana napaka na nedejavni povezavi (npr. DB restart,
    // mrežni izpad) sesula proces. Zabeležimo in pustimo pool, da povezavo
    // nadomesti ob naslednji uporabi (resilienca pri skaliranju/deployih).
    this.pool.on('error', (err) => {
      this.log.error(`idle pool client error: ${err.message}`);
    });
  }

  /**
   * Run `fn` inside a transaction scoped to `tenantId`. Sets the RLS GUC and
   * the least-privilege role with SET LOCAL so both reset automatically at
   * COMMIT/ROLLBACK. Commits on success, rolls back on throw.
   */
  async withTenant<T>(tenantId: string, fn: (tx: TxClient) => Promise<T>): Promise<T> {
    if (!/^[0-9a-f-]{36}$/i.test(tenantId)) {
      throw new Error('withTenant called with an invalid tenant id');
    }
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // set_config(..., true) => local to this transaction
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
      await client.query(`SET LOCAL ROLE ${quoteIdent(this.config.dbAppRole)}`);
      const tx: TxClient = {
        query: (text, params) => client.query(text, params as any[]) as any,
      };
      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await safeRollback(client);
      throw err;
    } finally {
      client.release();
    }
  }

  /** Admin transaction WITHOUT tenant scoping — for tenant/user provisioning only. */
  async withAdmin<T>(fn: (tx: TxClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const tx: TxClient = { query: (t, p) => client.query(t, p as any[]) as any };
      const r = await fn(tx);
      await client.query('COMMIT');
      return r;
    } catch (e) {
      await safeRollback(client);
      throw e;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

async function safeRollback(client: PoolClient): Promise<void> {
  try { await client.query('ROLLBACK'); } catch { /* connection already broken */ }
}

function quoteIdent(ident: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(ident)) throw new Error(`Unsafe identifier: ${ident}`);
  return `"${ident}"`;
}
