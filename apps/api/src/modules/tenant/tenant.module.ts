import {
  Body, Controller, Get, Injectable, Module, Patch, UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, Length } from 'class-validator';
import { getContext, Permission } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

/**
 * Profil delavnice (tenant) — naziv, davčni podatki in PLAČILNI podatki
 * (IBAN, banka, naslov), ki jih UPN QR potrebuje kot prejemnika (polja 15,
 * 17–19). GET je odprt vsem članom — QR mora znati izrisati tudi svetovalec
 * in mehanik, ne le lastnik. PATCH je gated s Permission.TenantManage
 * (owner + admin) in avditiran ('tenant.updated').
 *
 * app.tenants namenoma nima grantov za workshop_app (admin domena), zato
 * obe poti tečeta prek withAdmin z tenant_id iz overjenega konteksta —
 * isti vzorec kot GDPR export in NotifyService.
 */

class TenantProfilePatchDto {
  @IsOptional() @IsString() @Length(0, 64) iban?: string;
  @IsOptional() @IsString() @Length(0, 120) bankName?: string;
  @IsOptional() @IsString() @Length(0, 200) address?: string;
  @IsOptional() @IsString() @Length(0, 16) postCode?: string;
  @IsOptional() @IsString() @Length(0, 120) city?: string;
  @IsOptional() @IsString() @Length(0, 40) phone?: string;
  @IsOptional() @IsString() @Length(0, 40) fax?: string;
  @IsOptional() @IsString() @Length(0, 160) email?: string;
  @IsOptional() @IsString() @Length(0, 160) website?: string;
  @IsOptional() @IsString() @Length(0, 16) bic?: string;
  @IsOptional() @IsString() @Length(0, 64) iban2?: string;
  @IsOptional() @IsString() @Length(0, 16) bic2?: string;
  @IsOptional() @IsString() @Length(0, 600) registrationNote?: string;
}

function mapProfile(r: any) {
  return {
    id: r.id,
    name: r.name,
    country: r.country,
    vatId: r.vat_id ?? null,
    iban: r.iban ?? null,
    bankName: r.bank_name ?? null,
    address: r.address ?? null,
    postCode: r.post_code ?? null,
    city: r.city ?? null,
    phone: r.phone ?? null,
    fax: r.fax ?? null,
    email: r.email ?? null,
    website: r.website ?? null,
    bic: r.bic ?? null,
    iban2: r.iban2 ?? null,
    bic2: r.bic2 ?? null,
    registrationNote: r.registration_note ?? null,
  };
}

@Injectable()
export class TenantService {
  constructor(private readonly pg: PgService, private readonly audit: AuditService) {}

  async getProfile() {
    const ctx = getContext();
    return this.pg.withAdmin(async (tx) => {
      const r = await tx.query<any>(
        `SELECT id, name, country, vat_id, iban, bank_name, address, post_code, city, phone, fax, email, website, bic, iban2, bic2, registration_note
           FROM app.tenants WHERE id = $1`,
        [ctx.tenantId],
      );
      return mapProfile(r.rows[0]);
    });
  }

  async updateProfile(dto: TenantProfilePatchDto) {
    const ctx = getContext();

    // Normalizacija: IBAN brez presledkov in z velikimi črkami; prazen niz
    // pomeni izbris (NULL). Nedefinirana polja se ne dotaknejo.
    const norm = (v: string | undefined): string | null | undefined =>
      v === undefined ? undefined : (v.trim() === '' ? null : v.trim());
    const iban = dto.iban === undefined ? undefined
      : (dto.iban.replace(/\s+/g, '').toUpperCase() || null);
    if (iban && !/^[A-Z]{2}[0-9A-Z]{11,32}$/.test(iban))
      throw Object.assign(new Error('IBAN ni veljaven.'), { status: 400 });

    const iban2 = dto.iban2 === undefined ? undefined
      : (dto.iban2.replace(/\s+/g, '').toUpperCase() || null);
    if (iban2 && !/^[A-Z]{2}[0-9A-Z]{11,32}$/.test(iban2))
      throw Object.assign(new Error('Drugi IBAN ni veljaven.'), { status: 400 });

    const cols: Array<[string, string | null | undefined]> = [
      ['iban', iban],
      ['iban2', iban2],
      ['phone', norm(dto.phone)],
      ['fax', norm(dto.fax)],
      ['email', norm(dto.email)],
      ['website', norm(dto.website)],
      ['bic', norm(dto.bic)],
      ['bic2', norm(dto.bic2)],
      ['registration_note', norm(dto.registrationNote)],
      ['bank_name', norm(dto.bankName)],
      ['address', norm(dto.address)],
      ['post_code', norm(dto.postCode)],
      ['city', norm(dto.city)],
    ];
    const sets: string[] = [];
    const vals: Array<string | null> = [];
    for (const [col, val] of cols) {
      if (val === undefined) continue;
      vals.push(val);
      sets.push(`${col} = $${vals.length}`);
    }

    return this.pg.withAdmin(async (tx) => {
      const beforeRow = (await tx.query<any>(
        `SELECT id, name, country, vat_id, iban, bank_name, address, post_code, city, phone, fax, email, website, bic, iban2, bic2, registration_note
           FROM app.tenants WHERE id = $1`,
        [ctx.tenantId],
      )).rows[0];

      if (sets.length === 0) return mapProfile(beforeRow);

      vals.push(ctx.tenantId);
      const r = await tx.query<any>(
        `UPDATE app.tenants SET ${sets.join(', ')}, updated_at = now()
          WHERE id = $${vals.length}
          RETURNING id, name, country, vat_id, iban, bank_name, address, post_code, city, phone, fax, email, website, bic, iban2, bic2, registration_note`,
        vals,
      );
      const row = r.rows[0];
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'tenant.updated',
        entityType: 'tenant', entityId: ctx.tenantId,
        before: {
          iban: beforeRow.iban, bankName: beforeRow.bank_name, address: beforeRow.address,
          postCode: beforeRow.post_code, city: beforeRow.city,
        },
        after: {
          iban: row.iban, bankName: row.bank_name, address: row.address,
          postCode: row.post_code, city: row.city,
        },
      });
      return mapProfile(row);
    });
  }
}

@Controller('tenant')
@UseGuards(PermissionsGuard)
export class TenantController {
  constructor(private readonly svc: TenantService) {}

  /** Profil delavnice — bere ga lahko vsak član (QR na računu rabi IBAN). */
  @Get('profile')
  getProfile() { return this.svc.getProfile(); }

  /** Posodobitev plačilnih podatkov — owner/admin (TenantManage), avditirano. */
  @Patch('profile')
  @RequirePermissions(Permission.TenantManage)
  updateProfile(@Body() dto: TenantProfilePatchDto) { return this.svc.updateProfile(dto); }
}

@Module({
  controllers: [TenantController],
  providers: [TenantService],
})
export class TenantModule {}
