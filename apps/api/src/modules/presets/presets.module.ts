import {
  Body, Controller, Delete, Get, Injectable, Module, NotFoundException,
  Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { IsArray, IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { Permission } from '@workshop/shared';
import { getContext } from '../../common/context/request-context';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

/**
 * Servisni paketi (presets) — sklopi dela + delov za en-klik vnos na delovni
 * nalog. Kontrakt 1:1 z demo obliko, ki jo warehouse strani in gumb „+ Paket"
 * na nalogu že uporabljajo: {id, name, description?, vehicleClasses[],
 * powertrains[], lines[], active, createdAt, updatedAt}; vrstica paketa je
 * {id, kind 'labour'|'part', description, itemId?, qty, unitPriceMinor,
 * vatRatePct}. Vrstice hranimo kot jsonb — cena je ZAJETA ob shranjevanju
 * paketa, živi katalog se uporabi ob aplikaciji na nalog (web logika).
 * Branje je prosto za vse člane; mutacije zahtevajo PresetManage.
 */

class PresetDto {
  @IsString() @Length(1, 200) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() vehicleClasses?: string[];
  @IsOptional() @IsArray() powertrains?: string[];
  @IsOptional() @IsArray() lines?: unknown[];
  @IsOptional() @IsBoolean() active?: boolean;
}

class PresetPatchDto {
  @IsOptional() @IsString() @Length(1, 200) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() vehicleClasses?: string[];
  @IsOptional() @IsArray() powertrains?: string[];
  @IsOptional() @IsArray() lines?: unknown[];
  @IsOptional() @IsBoolean() active?: boolean;
}

function mapPreset(r: any) {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    vehicleClasses: r.vehicle_classes ?? [],
    powertrains: r.powertrains ?? [],
    lines: r.lines ?? [],
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

@Injectable()
class PresetsService {
  constructor(private readonly pg: PgService, private readonly audit: AuditService) {}

  list() {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(`SELECT * FROM app.presets ORDER BY name`);
      return r.rows.map(mapPreset);
    });
  }

  get(id: string) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(`SELECT * FROM app.presets WHERE id = $1`, [id]);
      if (r.rowCount === 0) throw new NotFoundException('Preset not found');
      return mapPreset(r.rows[0]);
    });
  }

  create(dto: PresetDto) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `INSERT INTO app.presets (tenant_id, name, description, vehicle_classes, powertrains, lines, active)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, COALESCE($7, true))
         RETURNING *`,
        [ctx.tenantId, dto.name.trim(), dto.description ?? null,
         dto.vehicleClasses ?? [], dto.powertrains ?? [],
         JSON.stringify(dto.lines ?? []), dto.active ?? null],
      );
      const row = r.rows[0];
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'preset.created',
        entityType: 'preset', entityId: row.id, before: null, after: { name: row.name },
      });
      return mapPreset(row);
    });
  }

  update(id: string, dto: PresetPatchDto) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const cur = await tx.query<any>(`SELECT * FROM app.presets WHERE id = $1 FOR UPDATE`, [id]);
      if (cur.rowCount === 0) throw new NotFoundException('Preset not found');
      const r = await tx.query<any>(
        `UPDATE app.presets SET
           name            = COALESCE($2, name),
           description     = COALESCE($3, description),
           vehicle_classes = COALESCE($4, vehicle_classes),
           powertrains     = COALESCE($5, powertrains),
           lines           = COALESCE($6::jsonb, lines),
           active          = COALESCE($7, active)
         WHERE id = $1 RETURNING *`,
        [id, dto.name?.trim() ?? null, dto.description ?? null,
         dto.vehicleClasses ?? null, dto.powertrains ?? null,
         dto.lines != null ? JSON.stringify(dto.lines) : null,
         dto.active ?? null],
      );
      const row = r.rows[0];
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'preset.updated',
        entityType: 'preset', entityId: id,
        before: { name: cur.rows[0].name }, after: { name: row.name, active: row.active },
      });
      return mapPreset(row);
    });
  }

  remove(id: string) {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const cur = await tx.query<any>(`SELECT name FROM app.presets WHERE id = $1`, [id]);
      if (cur.rowCount === 0) throw new NotFoundException('Preset not found');
      await tx.query(`DELETE FROM app.presets WHERE id = $1`, [id]);
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'preset.deleted',
        entityType: 'preset', entityId: id, before: { name: cur.rows[0].name }, after: null,
      });
      return { ok: true };
    });
  }
}

@Controller('presets')
@UseGuards(PermissionsGuard)
class PresetsController {
  constructor(private readonly svc: PresetsService) {}

  @Get()
  list() { return this.svc.list(); }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) { return this.svc.get(id); }

  @Post()
  @RequirePermissions(Permission.PresetManage)
  create(@Body() dto: PresetDto) { return this.svc.create(dto); }

  @Patch(':id')
  @RequirePermissions(Permission.PresetManage)
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: PresetPatchDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PresetManage)
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.svc.remove(id); }
}

@Module({
  controllers: [PresetsController],
  providers: [PresetsService],
})
export class PresetsModule {}
