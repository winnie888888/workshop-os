import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  ForbiddenException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getContext, type Permission, type Role } from '@workshop/shared';
import { hasEffectivePermission, type PermissionOverride } from '@workshop/shared/roles';
import { PgService } from '../common/db/pg.service';

export const PERMISSIONS_KEY = 'required_permissions';

/** Declare the permissions a route requires (PRD §14 RBAC). */
export const RequirePermissions = (...perms: Permission[]) => SetMetadata(PERMISSIONS_KEY, perms);

/*
 * Per-user permission overrides (Pravice uporabnikov, P1): vloge ostanejo
 * osnova, tabela app.member_permission_overrides pa nosi ročne izjeme
 * (deny > allow > vloge; logika je testirana v shared). Guard izjeme prebere
 * z drobnim TTL predpomnilnikom, da ne dodaja poizvedbe vsakemu zahtevku:
 * sprememba pravic se na ISTI instanci uveljavi takoj (invalidate ob PUT),
 * na morebitnih drugih instancah pa najkasneje v CACHE_TTL_MS.
 */
const CACHE_TTL_MS = 5000;
const CACHE_MAX = 500;
const overridesCache = new Map<string, { at: number; overrides: PermissionOverride[] }>();

/** Takojšnja razveljavitev predpomnjenih izjem (kliče members modul ob PUT). */
export function invalidatePermissionOverrides(tenantId: string, userId: string): void {
  overridesCache.delete(`${tenantId}:${userId}`);
}

/**
 * Authorizes against the roles bound in the request context, combined with
 * the member's stored permission overrides. Tenant scope and roles come from
 * the verified membership, not the client.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly pg: PgService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const ctx = getContext(); // throws if no tenant context bound
    const roles = ctx.roles as Role[];
    const overrides = await this.loadOverrides(ctx.tenantId, ctx.userId);
    const ok = required.every((p) => hasEffectivePermission(roles, overrides, p));
    if (!ok) throw new ForbiddenException('Insufficient permissions');
    return true;
  }

  private async loadOverrides(tenantId: string, userId: string): Promise<PermissionOverride[]> {
    const key = `${tenantId}:${userId}`;
    const now = Date.now();
    const hit = overridesCache.get(key);
    if (hit && now - hit.at < CACHE_TTL_MS) return hit.overrides;

    let overrides: PermissionOverride[] = [];
    try {
      overrides = await this.pg.withTenant(tenantId, async (tx) => {
        const r = await tx.query<{ permission: string; allow: boolean }>(
          `SELECT permission, allow FROM app.member_permission_overrides WHERE user_id = $1`,
          [userId],
        );
        return r.rows.map((row) => ({ permission: row.permission as Permission, allow: row.allow }));
      });
    } catch {
      // Pred migracijo 0025 tabela ne obstaja — vloge ostanejo edina resnica.
      overrides = [];
    }

    if (overridesCache.size >= CACHE_MAX) overridesCache.clear();
    overridesCache.set(key, { at: now, overrides });
    return overrides;
  }
}

/** Inject the current RequestContext into a handler parameter. */
export const CurrentContext = createParamDecorator((_data, _ctx: ExecutionContext) => getContext());
