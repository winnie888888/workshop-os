import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { getContext, isValidRole, newId, Permission, Role } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { RequirePermissions } from '../../auth/permissions.guard';

/*
 * API ključi (P2). Ključ format: wos_ + 40 hex znakov (20 naključnih bajtov).
 * Hranimo sha256 hash + prikazni prefix; polni ključ vrnemo NATANKO ENKRAT
 * ob ustvarjanju. Ključ nosi vloge (podmnožico — owner in admin sta
 * prepovedana, da ključ nikoli ne more upravljati delavnice ali pravic) in
 * gre zato skozi isti RBAC guard kot ljudje. Per-permission scoping je
 * zaveden backlog (zahteva razširitev RequestContext v shared jedru).
 */

const FORBIDDEN_KEY_ROLES = new Set<string>([Role.Owner, Role.Admin]);

export function hashApiKey(fullKey: string): string {
  return createHash('sha256').update(fullKey, 'utf8').digest('hex');
}

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly pg: PgService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT k.id, k.name, k.prefix, k.roles, k.permissions, k.created_at, k.last_used_at,
                k.revoked_at, u.name AS created_by_name
           FROM app.api_keys k
           LEFT JOIN app.users u ON u.id = k.created_by
          WHERE k.tenant_id = $1
          ORDER BY k.created_at DESC`,
        [ctx.tenantId],
      );
      return r.rows.map((k: any) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        roles: (k.roles ?? []) as Role[],
        permissions: (k.permissions ?? []) as Permission[],
        createdAt: iso(k.created_at),
        createdByName: k.created_by_name ?? null,
        lastUsedAt: iso(k.last_used_at),
        revokedAt: iso(k.revoked_at),
      }));
    });
  }

  /** Ustvari ključ. POLNI ključ je v odgovoru in se NIKOLI več ne prikaže. */
  async create(name: string, roles: string[], permissions: string[] = []) {
    const ctx = getContext();
    const cleanName = (name ?? '').trim();
    if (!cleanName) throw new BadRequestException('Ime ključa je obvezno.');
    if (cleanName.length > 80) throw new BadRequestException('Ime ključa je predolgo.');

    const rolesArr = Array.isArray(roles) ? roles : [];
    const permsArr = Array.isArray(permissions) ? permissions : [];
    // Ključ rabi VSAJ vlogo ALI vsaj pravico (per-permission scoping): lahko
    // nosi cele vloge, ozke konkretne pravice, ali oboje.
    if (rolesArr.length === 0 && permsArr.length === 0) {
      throw new BadRequestException('Ključ rabi vsaj eno vlogo ali pravico.');
    }
    for (const r of rolesArr) {
      if (!isValidRole(r)) throw new BadRequestException(`Neznana vloga: ${r}`);
      if (FORBIDDEN_KEY_ROLES.has(r)) {
        throw new BadRequestException(`Vloge ${r} ni mogoče dodeliti API ključu.`);
      }
    }
    const validPermissions = new Set<string>(Object.values(Permission));
    for (const p of permsArr) {
      if (!validPermissions.has(p)) throw new BadRequestException(`Neznana pravica: ${p}`);
    }
    const uniqueRoles = [...new Set(rolesArr)];
    const uniquePerms = [...new Set(permsArr)];

    const fullKey = `wos_${randomBytes(20).toString('hex')}`;
    const prefix = fullKey.slice(0, 12);
    const keyHash = hashApiKey(fullKey);
    const id = newId();

    await this.pg.withTenant(ctx.tenantId, async (tx) => {
      await tx.query(
        `INSERT INTO app.api_keys (id, tenant_id, name, prefix, key_hash, roles, permissions, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, ctx.tenantId, cleanName, prefix, keyHash, uniqueRoles, uniquePerms, ctx.userId],
      );
      await this.audit.append(tx, {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: 'apikey.created',
        entityType: 'api_key',
        entityId: id,
        before: null,
        after: { name: cleanName, prefix, roles: uniqueRoles, permissions: uniquePerms },
      });
    });

    return { id, name: cleanName, prefix, roles: uniqueRoles, permissions: uniquePerms, key: fullKey };
  }

  /** Preklic je takojšen in dokončen; zapis ostane zaradi revizijske sledi. */
  async revoke(id: string) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `UPDATE app.api_keys
            SET revoked_at = now(), revoked_by = $2
          WHERE id = $1 AND tenant_id = $3 AND revoked_at IS NULL
          RETURNING name, prefix`,
        [id, ctx.userId, ctx.tenantId],
      );
      if (!r.rows[0]) throw new NotFoundException('Ključ ne obstaja ali je že preklican.');
      await this.audit.append(tx, {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: 'apikey.revoked',
        entityType: 'api_key',
        entityId: id,
        before: null,
        after: { name: r.rows[0].name, prefix: r.rows[0].prefix },
      });
      return { ok: true, id };
    });
  }
}

@Controller('api-keys')
@RequirePermissions(Permission.TenantManage)
export class ApiKeysController {
  constructor(private readonly keys: ApiKeysService) {}

  @Get()
  list() {
    return this.keys.list();
  }

  @Post()
  create(@Body() body: { name?: string; roles?: string[]; permissions?: string[] }) {
    return this.keys.create(body?.name ?? '', body?.roles ?? [], body?.permissions ?? []);
  }

  @Post(':id/revoke')
  revoke(@Param('id') id: string) {
    return this.keys.revoke(id);
  }
}

@Module({
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
})
export class ApiKeysModule {}

function iso(v: any): string | null {
  if (!v) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}
