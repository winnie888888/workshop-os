import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { runWithContext, newId, type RequestContext } from '@workshop/shared';
import { PgService } from '../common/db/pg.service';
import { TokenVerifier } from './token-verifier';
import { AppConfig } from '../config/configuration';

/**
 * User-auth middleware (tenant-less). Used only for the login-time endpoints
 * (/auth/me, /auth/session/*, /me/profile) where the user is authenticated but
 * has not yet chosen a tenant to act in. It verifies the bearer token and
 * resolves the platform user, then binds a RequestContext WITHOUT a tenant
 * (tenantId = ''). Services behind these routes must use PgService.withAdmin
 * and filter by the authenticated user id — they never rely on tenant RLS.
 *
 * This is the deliberate counterpart to AuthTenantMiddleware, which requires a
 * verified membership and is used for every tenant-scoped route.
 */
@Injectable()
export class UserAuthMiddleware implements NestMiddleware {
  private readonly verifier: TokenVerifier;

  constructor(
    private readonly pg: PgService,
    private readonly config: AppConfig,
  ) {
    this.verifier = new TokenVerifier(config);
  }

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    let subject: string;
    if (this.config.devAuth) {
      subject = this.config.devAuthSubject;
    } else {
      const auth = req.header('authorization');
      if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
      try {
        const payload = await this.verifier.verify(auth.slice(7));
        subject = String(payload.sub);
      } catch {
        throw new UnauthorizedException('Invalid token');
      }
    }

    const user = await this.pg.withAdmin(async (tx) => {
      const u = await tx.query<{ id: string; status: string }>(
        `SELECT id, status FROM app.users WHERE external_subject = $1`,
        [subject],
      );
      if (u.rowCount === 0 || u.rows[0].status !== 'active') return null;
      return u.rows[0];
    });
    if (!user) throw new UnauthorizedException('Unknown or inactive user');

    const ctx: RequestContext = {
      tenantId: '',               // no tenant chosen yet
      userId: user.id,
      roles: [],
      requestId: req.header('x-request-id') ?? newId(),
    };
    // Expose the verified subject for first-login provisioning if needed.
    (req as any).oidcSubject = subject;
    runWithContext(ctx, () => next());
  }
}
