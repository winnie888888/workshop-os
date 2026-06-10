import { Controller, Get, Injectable, Module, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { getContext } from '../../common/context/request-context';
import { PgService } from '../../common/db/pg.service';

/**
 * Obvestila v aplikaciji (zvonček v glavi vmesnika). Kontrakt je 1:1 tisti,
 * ki ga web (lib/api.ts + advisor/layout) že uporablja v demo načinu:
 *   GET  /notifications            → [{id,kind,title,body?,entityType?,entityId?,read,createdAt}]
 *   POST /notifications/:id/read   → {ok}
 *   POST /notifications/read-all   → {ok}
 * Brez posebnih permissionov: vsak aktiven član tenanta vidi SVOJA obvestila
 * (vrstice so per-prejemnik; pisanje gre prek globalnega NotifyService).
 */

@Injectable()
class InAppNotificationsService {
  constructor(private readonly pg: PgService) {}

  list() {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await tx.query<any>(
        `SELECT id, kind, title, body, entity_type, entity_id, read_at, created_at
           FROM app.notifications
          WHERE recipient_user_id = $1
          ORDER BY created_at DESC
          LIMIT 50`,
        [ctx.userId],
      );
      return r.rows.map((n: any) => ({
        id: n.id,
        kind: n.kind,
        title: n.title,
        body: n.body ?? undefined,
        entityType: n.entity_type ?? undefined,
        entityId: n.entity_id ?? undefined,
        read: n.read_at != null,
        createdAt: n.created_at,
      }));
    });
  }

  async markRead(id: string) {
    const ctx = getContext();
    await this.pg.withTenant(ctx.tenantId, async (tx) => {
      await tx.query(
        `UPDATE app.notifications SET read_at = now()
          WHERE id = $1 AND recipient_user_id = $2 AND read_at IS NULL`,
        [id, ctx.userId],
      );
    });
    return { ok: true };
  }

  async markAllRead() {
    const ctx = getContext();
    await this.pg.withTenant(ctx.tenantId, async (tx) => {
      await tx.query(
        `UPDATE app.notifications SET read_at = now()
          WHERE recipient_user_id = $1 AND read_at IS NULL`,
        [ctx.userId],
      );
    });
    return { ok: true };
  }
}

@Controller('notifications')
class InAppNotificationsController {
  constructor(private readonly svc: InAppNotificationsService) {}

  @Get()
  list() { return this.svc.list(); }

  @Post('read-all')
  readAll() { return this.svc.markAllRead(); }

  @Post(':id/read')
  read(@Param('id', new ParseUUIDPipe()) id: string) { return this.svc.markRead(id); }
}

@Module({
  controllers: [InAppNotificationsController],
  providers: [InAppNotificationsService],
})
export class InAppNotificationsModule {}
