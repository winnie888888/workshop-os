import { Controller, Get, Injectable, Module, UseGuards } from '@nestjs/common';
import { Permission } from '@workshop/shared';
import { getContext } from '../../common/context/request-context';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

/**
 * Izvoz podatkov — GDPR čl. 20 (prenosljivost) in DPA obljuba "vsi podatki
 * tvojega podjetja, kadarkoli, brez zaklepanja". En endpoint vrne POLN posnetek
 * tenanta; web (owner/data) iz njega dela CSV-je po entitetah in JSON arhiv.
 *
 * Načela:
 *  - SELECT * — imena stolpcev so resnica baze (arhiv mora preživeti naš lasten
 *    re-import), brez ročnih projekcij, ki bi z leti odtekle od sheme.
 *  - Vse poslovne tabele tečejo v ENI withTenant transakciji (konsistenten
 *    posnetek pod RLS). Edina izjema je seznam zaposlenih: memberships za
 *    workshop_app namenoma nima granta, zato roster preberemo prek withAdmin
 *    z eksplicitnim tenant_id — isti vzorec kot NotifyService.
 *  - Dostop je gated s Permission.DataExport (owner + admin) in AVDITIRAN
 *    ('export.snapshot') — kdo je kdaj odnesel celoten arhiv, mora biti vidno.
 *  - Gnezdeni podrejeni zapisi (postavke naloga/računa, DDV razčlenitev) so
 *    vgrajeni kot jsonb agregati, da CSV ene entitete ne izgubi vsebine.
 */

@Injectable()
class ExportService {
  constructor(
    private readonly pg: PgService,
    private readonly audit: AuditService,
  ) {}

  async snapshot() {
    const ctx = getContext();

    const tenant = await this.pg.withAdmin(async (tx) => {
      const r = await tx.query<{ name: string }>(`SELECT name FROM app.tenants WHERE id = $1`, [ctx.tenantId]);
      return r.rows[0]?.name ?? 'Delavnica';
    });

    const data = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      const all = async (sql: string): Promise<any[]> => (await tx.query<any>(sql)).rows;

      const out: Record<string, any[]> = {
        customers: await all(`SELECT * FROM app.customers`),
        vehicles: await all(`SELECT * FROM app.assets`),
        workOrders: await all(
          `SELECT w.*,
                  COALESCE((SELECT jsonb_agg(l) FROM app.work_order_lines l WHERE l.work_order_id = w.id), '[]'::jsonb) AS lines
             FROM app.work_orders w`,
        ),
        timeEntries: await all(`SELECT * FROM app.time_entries`),
        estimates: await all(`SELECT * FROM app.estimates`),
        invoices: await all(
          `SELECT i.*,
                  COALESCE((SELECT jsonb_agg(l) FROM app.invoice_lines l WHERE l.invoice_id = i.id), '[]'::jsonb) AS lines,
                  COALESCE((SELECT jsonb_agg(v) FROM app.invoice_vat_breakdown v WHERE v.invoice_id = i.id), '[]'::jsonb) AS vat_breakdown
             FROM app.invoices i`,
        ),
        payments: await all(`SELECT * FROM app.payments`),
        paymentAllocations: await all(`SELECT * FROM app.payment_allocations`),
        items: await all(`SELECT * FROM app.inventory_items`),
        stockLevels: await all(`SELECT * FROM app.stock_levels`),
        suppliers: await all(`SELECT * FROM app.suppliers`),
        presets: await all(`SELECT * FROM app.presets`),
        appointments: await all(`SELECT * FROM app.appointments`),
        attendanceDays: await all(`SELECT * FROM app.attendance_days`),
      };

      // Avdit V isti transakciji — izvoz celotnega arhiva mora pustiti sled.
      await this.audit.append(tx, {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: 'export.snapshot',
        entityType: 'tenant',
        entityId: ctx.tenantId,
        before: null,
        after: { entities: Object.keys(out).length, rows: Object.values(out).reduce((n, a) => n + a.length, 0) },
      });
      return out;
    });

    // Roster zaposlenih — memberships je admin domena (brez granta za
    // workshop_app), beremo z eksplicitnim tenant_id, kot NotifyService.
    data.mechanics = await this.pg.withAdmin(async (tx) =>
      (await tx.query<any>(
        `SELECT u.id, u.email, u.name, u.locale, m.roles, m.active
           FROM app.memberships m
           JOIN app.users u ON u.id = m.user_id
          WHERE m.tenant_id = $1`,
        [ctx.tenantId],
      )).rows);

    return { exportedAt: new Date().toISOString(), tenant, data };
  }
}

@Controller('export')
@UseGuards(PermissionsGuard)
class ExportController {
  constructor(private readonly svc: ExportService) {}

  @Get('snapshot')
  @RequirePermissions(Permission.DataExport)
  snapshot() {
    return this.svc.snapshot();
  }
}

@Module({
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
