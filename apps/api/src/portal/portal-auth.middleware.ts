import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { runWithContext, newId, type RequestContext } from '@workshop/shared';
import { PortalAuthService } from './portal-auth.service';

/**
 * Authenticates customer-portal requests. Unlike the staff middleware, there is
 * no OIDC and no X-Tenant-Id header to trust: the portal session token IS the
 * identity. We resolve it to a live {tenantId, customerId} server-side, then
 * bind a RequestContext carrying BOTH. Every portal service method reads the
 * customerId from this context and filters by it, so a customer is scoped within
 * a tenant as well as across tenants (RLS). The tenant is therefore derived from
 * a verified session, never from the client.
 *
 * The two public endpoints (request a link, verify a link) are excluded from
 * this middleware in the module configuration, since by definition the caller is
 * not yet authenticated there.
 */
@Injectable()
export class PortalAuthMiddleware implements NestMiddleware {
  constructor(private readonly auth: PortalAuthService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Portal session required');
    }
    const resolved = await this.auth.authenticate(header.slice(7));
    if (!resolved) {
      throw new UnauthorizedException('Portal session expired or invalid');
    }

    const ctx: RequestContext = {
      tenantId: resolved.tenantId,
      userId: null,                              // a customer is not a platform user
      roles: ['portal_customer'],                // a single, deliberately powerless role
      customerId: resolved.customerId,           // the scope every portal query uses
      requestId: req.header('x-request-id') ?? newId(),
    };
    runWithContext(ctx, () => next());
  }
}
