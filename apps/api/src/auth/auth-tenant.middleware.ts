import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { runWithContext, newId, type RequestContext } from '@workshop/shared';
import { hashApiKey } from '../modules/api-keys/api-keys.module';
import { PgService } from '../common/db/pg.service';
import { TokenVerifier } from './token-verifier';
import { AppConfig } from '../config/configuration';

/**
 * For every request:
 *  1. Verify the OIDC bearer token.
 *  2. Resolve the platform user from the token subject.
 *  3. Resolve the ACTIVE tenant from the X-Tenant-Id header and verify the
 *     user has an active membership there; load that membership's roles.
 *  4. Bind a RequestContext (tenantId, userId, roles, requestId) via
 *     AsyncLocalStorage so DB calls (RLS) and audit are tenant-scoped.
 *
 * The tenant is therefore derived from a *verified membership*, never trusted
 * from the client (Architecture §5.1 / §7).
 */
@Injectable()
export class AuthTenantMiddleware implements NestMiddleware {
  private readonly verifier: TokenVerifier;

  constructor(
    private readonly pg: PgService,
    private readonly config: AppConfig,
  ) {
    this.verifier = new TokenVerifier(config);
  }

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    // ---- API ključi (P2): Bearer wos_… avtenticira NAMESTO OIDC poti. ----
    // Tenant izhaja IZ ključa; morebitna X-Tenant-Id glava se mora ujemati.
    // Ključ nosi vloge (brez owner/admin), zato naprej velja isti RBAC guard.
    const rawAuth = req.header('authorization');
    if (rawAuth?.startsWith('Bearer wos_')) {
      const fullKey = rawAuth.slice(7);
      const keyHash = hashApiKey(fullKey);
      const key = await this.pg.withAdmin(async (tx) => {
        const r = await tx.query<{ id: string; tenant_id: string; roles: string[]; revoked_at: Date | null }>(
          `SELECT id, tenant_id, roles, revoked_at FROM app.api_keys WHERE key_hash = $1`,
          [keyHash],
        );
        return r.rows[0] ?? null;
      });
      if (!key || key.revoked_at) throw new UnauthorizedException('Invalid API key');
      const headerTenant = req.header('x-tenant-id');
      if (headerTenant && headerTenant !== key.tenant_id) {
        throw new ForbiddenException('API key does not belong to this tenant');
      }
      // last_used_at: dušeno na ~60 s, mimo odgovora (napaka ne sme podreti zahtevka).
      void this.pg.withAdmin(async (tx) => {
        await tx.query(
          `UPDATE app.api_keys
              SET last_used_at = now()
            WHERE id = $1 AND (last_used_at IS NULL OR last_used_at < now() - interval '60 seconds')`,
          [key.id],
        );
      }).catch(() => { /* ignore */ });

      const keyCtx: RequestContext = {
        tenantId: key.tenant_id,
        userId: null,
        roles: key.roles ?? [],
        requestId: req.header('x-request-id') ?? newId(),
      };
      runWithContext(keyCtx, () => next());
      return;
    }

    let subject: string;
    if (this.config.devAuth) {
      subject = this.config.devAuthSubject;
    } else {
      const auth = req.header('authorization');
      if (!auth?.startsWith('Bearer ')) {
        throw new UnauthorizedException('Missing bearer token');
      }
      try {
        const payload = await this.verifier.verify(auth.slice(7));
        subject = String(payload.sub);
      } catch {
        throw new UnauthorizedException('Invalid token');
      }
    }

    const tenantId = req.header('x-tenant-id');
    if (!tenantId) throw new ForbiddenException('X-Tenant-Id header required');

    // Resolve user + membership at admin scope (membership selection precedes RLS).
    const resolved = await this.pg.withAdmin(async (tx) => {
      const u = await tx.query<{ id: string; status: string }>(
        `SELECT id, status FROM app.users WHERE external_subject = $1`,
        [subject],
      );
      if (u.rowCount === 0 || u.rows[0].status !== 'active') return null;
      const userId = u.rows[0].id;
      const m = await tx.query<{ roles: string[]; active: boolean }>(
        `SELECT roles, active FROM app.memberships WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId],
      );
      if (m.rowCount === 0 || !m.rows[0].active) return null;
      return { userId, roles: m.rows[0].roles ?? [] };
    });

    if (!resolved) throw new ForbiddenException('No active membership for this tenant');

    const ctx: RequestContext = {
      tenantId,
      userId: resolved.userId,
      roles: resolved.roles,
      requestId: req.header('x-request-id') ?? newId(),
    };
    // Bind the context for the remainder of the request lifecycle.
    runWithContext(ctx, () => next());
  }
}
