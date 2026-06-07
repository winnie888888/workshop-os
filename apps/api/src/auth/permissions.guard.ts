import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  ForbiddenException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getContext, hasPermission, type Permission, type Role } from '@workshop/shared';

export const PERMISSIONS_KEY = 'required_permissions';

/** Declare the permissions a route requires (PRD §14 RBAC). */
export const RequirePermissions = (...perms: Permission[]) => SetMetadata(PERMISSIONS_KEY, perms);

/**
 * Authorizes against the roles bound in the request context. Tenant scope and
 * roles come from the verified membership, not the client.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const ctx = getContext(); // throws if no tenant context bound
    const roles = ctx.roles as Role[];
    const ok = required.every((p) => hasPermission(roles, p));
    if (!ok) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}

/** Inject the current RequestContext into a handler parameter. */
export const CurrentContext = createParamDecorator((_data, _ctx: ExecutionContext) => getContext());
