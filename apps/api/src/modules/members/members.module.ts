import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Put,
} from '@nestjs/common';
import {
  getContext,
  Permission,
  effectivePermissionsFor,
  isValidPermission,
  permissionsFor,
  type PermissionOverride,
  type Role,
} from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { RequirePermissions, invalidatePermissionOverrides } from '../../auth/permissions.guard';

/*
 * Members — Pravice uporabnikov (P1).
 *
 * Vloge na članstvu ostanejo osnova pravic (testirana matrika v shared);
 * tukaj admin/lastnik upravlja ROČNE IZJEME po članu: allow doda pravico
 * mimo vlog, deny jo vzame kljub vlogi (deny zmaga — logika in testi v
 * shared/roles). PUT zamenja celoten nabor izjem člana v eni transakciji
 * (zadnje stanje je resnica, ne dnevnik klikov), vsaka sprememba gre v
 * revizijsko verigo, predpomnilnik guarda pa se razveljavi takoj.
 *
 * Varovalka: član si ne more sam odvzeti tenant:manage — sicer bi se zadnji
 * administrator lahko zaklenil iz upravljanja delavnice.
 */

interface MemberRow {
  userId: string;
  name: string;
  email: string;
  roles: Role[];
  active: boolean;
  overrides: PermissionOverride[];
}

@Injectable()
export class MembersService {
  constructor(
    private readonly pg: PgService,
    private readonly audit: AuditService,
  ) {}

  /** Vsi člani delavnice z vlogami in izjemami (za matriko v UI). */
  async list(): Promise<Array<MemberRow & { base: Permission[]; effective: Permission[] }>> {
    const ctx = getContext();
    const rows = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT m.user_id, m.roles, m.active, u.name, u.email,
                COALESCE(
                  json_agg(json_build_object('permission', o.permission, 'allow', o.allow))
                    FILTER (WHERE o.permission IS NOT NULL),
                  '[]'
                ) AS overrides
           FROM app.memberships m
           JOIN app.users u ON u.id = m.user_id
           LEFT JOIN app.member_permission_overrides o
             ON o.tenant_id = m.tenant_id AND o.user_id = m.user_id
          WHERE m.tenant_id = $1
          GROUP BY m.user_id, m.roles, m.active, u.name, u.email
          ORDER BY u.name`,
        [ctx.tenantId],
      );
      return r.rows;
    });
    return rows.map((r: any) => this.shape(r));
  }

  /** En član: vloge, izjeme, efektivne pravice in celoten katalog pravic. */
  async getPermissions(userId: string) {
    const ctx = getContext();
    const row = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT m.user_id, m.roles, m.active, u.name, u.email,
                COALESCE(
                  json_agg(json_build_object('permission', o.permission, 'allow', o.allow))
                    FILTER (WHERE o.permission IS NOT NULL),
                  '[]'
                ) AS overrides
           FROM app.memberships m
           JOIN app.users u ON u.id = m.user_id
           LEFT JOIN app.member_permission_overrides o
             ON o.tenant_id = m.tenant_id AND o.user_id = m.user_id
          WHERE m.tenant_id = $1 AND m.user_id = $2
          GROUP BY m.user_id, m.roles, m.active, u.name, u.email`,
        [ctx.tenantId, userId],
      );
      return r.rows[0] ?? null;
    });
    if (!row) throw new NotFoundException('Član ne obstaja v tej delavnici.');
    const member = this.shape(row);
    return { ...member, catalog: Object.values(Permission) };
  }

  /**
   * Zamenja celoten nabor izjem člana (replace-all v eni transakciji).
   * Vrne novo stanje — UI ga uporabi brez dodatnega klica.
   */
  async replacePermissions(userId: string, overridesIn: Array<{ permission: string; allow: boolean }>) {
    const ctx = getContext();
    if (!Array.isArray(overridesIn)) throw new BadRequestException('overrides mora biti seznam.');
    if (overridesIn.length > 200) throw new BadRequestException('Preveč izjem.');

    // Validacija + deduplikacija (zadnja navedba pravice zmaga).
    const byPerm = new Map<string, boolean>();
    for (const o of overridesIn) {
      if (!o || typeof o.permission !== 'string' || typeof o.allow !== 'boolean') {
        throw new BadRequestException('Vsaka izjema rabi { permission, allow }.');
      }
      if (!isValidPermission(o.permission)) {
        throw new BadRequestException(`Neznana pravica: ${o.permission}`);
      }
      byPerm.set(o.permission, o.allow);
    }
    const overrides: PermissionOverride[] = [...byPerm.entries()]
      .map(([permission, allow]) => ({ permission: permission as Permission, allow }));

    // Samozaščita: ne moreš si sam odvzeti upravljanja delavnice.
    if (userId === ctx.userId && overrides.some((o) => o.permission === Permission.TenantManage && !o.allow)) {
      throw new BadRequestException('Sebi ni mogoče odvzeti pravice tenant:manage.');
    }

    const result = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      const m = await tx.query<any>(
        `SELECT roles FROM app.memberships WHERE tenant_id = $1 AND user_id = $2`,
        [ctx.tenantId, userId],
      );
      if (!m.rows[0]) throw new NotFoundException('Član ne obstaja v tej delavnici.');

      const beforeRes = await tx.query<any>(
        `SELECT permission, allow FROM app.member_permission_overrides
          WHERE tenant_id = $1 AND user_id = $2 ORDER BY permission`,
        [ctx.tenantId, userId],
      );
      const before = beforeRes.rows as Array<{ permission: string; allow: boolean }>;

      await tx.query(
        `DELETE FROM app.member_permission_overrides WHERE tenant_id = $1 AND user_id = $2`,
        [ctx.tenantId, userId],
      );
      for (const o of overrides) {
        await tx.query(
          `INSERT INTO app.member_permission_overrides (tenant_id, user_id, permission, allow, created_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [ctx.tenantId, userId, o.permission, o.allow, ctx.userId],
        );
      }

      await this.audit.append(tx, {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: 'member.permissions_updated',
        entityType: 'membership',
        entityId: userId,
        before: { overrides: before },
        after: { overrides },
      });

      return { roles: (m.rows[0].roles ?? []) as Role[] };
    });

    // Sprememba velja takoj na tej instanci; drugje najkasneje v ~5 s (TTL).
    invalidatePermissionOverrides(ctx.tenantId, userId);

    return {
      userId,
      roles: result.roles,
      overrides,
      base: permissionsFor(result.roles),
      effective: effectivePermissionsFor(result.roles, overrides),
    };
  }

  private shape(r: any): MemberRow & { base: Permission[]; effective: Permission[] } {
    const roles = (r.roles ?? []) as Role[];
    const overrides = (typeof r.overrides === 'string' ? JSON.parse(r.overrides) : r.overrides ?? []) as PermissionOverride[];
    return {
      userId: r.user_id,
      name: r.name,
      email: r.email,
      roles,
      active: !!r.active,
      overrides,
      base: permissionsFor(roles),
      effective: effectivePermissionsFor(roles, overrides),
    };
  }
}

@Controller('members')
@RequirePermissions(Permission.TenantManage)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  list() {
    return this.members.list();
  }

  @Get(':userId/permissions')
  get(@Param('userId') userId: string) {
    return this.members.getPermissions(userId);
  }

  @Put(':userId/permissions')
  put(
    @Param('userId') userId: string,
    @Body() body: { overrides?: Array<{ permission: string; allow: boolean }> },
  ) {
    return this.members.replacePermissions(userId, body?.overrides ?? []);
  }
}

@Module({
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}
