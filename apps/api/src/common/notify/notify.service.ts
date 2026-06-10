import { Injectable, Logger } from '@nestjs/common';
import { PgService } from '../db/pg.service';

/**
 * NotifyService — pisanje obvestil v aplikaciji (zvonček). Registriran v
 * globalnem CommonModule, da ga vsak domenski servis injecta brez sprememb
 * importov (kot AuditService).
 *
 * Zakaj withAdmin: fan-out cilja po VLOGAH, kar zahteva branje app.memberships,
 * ta pa za workshop_app namenoma nima granta (0001: tenant/user upravljanje je
 * admin domena). Zato prejemnike razrešimo in vrstice vstavimo v eni admin
 * transakciji z EKSPLICITNIM tenant_id. Klicatelji to kličejo PO uspešnem
 * poslovnem zapisu (ali tik pred commitom — near-commit, dokumentirano na
 * mestu klica): obvestilo je obvestilo, ne sme podreti posla, zato napake
 * samo logiramo.
 */

export interface NotifyPayload {
  kind: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  /** Akter dogodka — preskočen, da se ne obvešča sam o svojem dejanju. */
  /** Prejemnik, ki se izpusti (običajno akter). null == nikogar ne izključi. */
  excludeUserId?: string | null;
}

@Injectable()
export class NotifyService {
  private readonly log = new Logger('Notify');

  constructor(private readonly pg: PgService) {}

  /** Obvesti vse aktivne člane tenanta z VSAJ ENO od navedenih vlog. */
  async toRoles(tenantId: string, roles: string[], n: NotifyPayload): Promise<void> {
    try {
      await this.pg.withAdmin(async (tx) => {
        const r = await tx.query<{ user_id: string }>(
          `SELECT user_id FROM app.memberships
            WHERE tenant_id = $1 AND active = true AND roles && $2::text[]`,
          [tenantId, roles],
        );
        for (const row of r.rows) {
          if (n.excludeUserId && row.user_id === n.excludeUserId) continue;
          await tx.query(
            `INSERT INTO app.notifications
               (tenant_id, recipient_user_id, kind, title, body, entity_type, entity_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [tenantId, row.user_id, n.kind, n.title, n.body ?? null, n.entityType ?? null, n.entityId ?? null],
          );
        }
      });
    } catch (e) {
      this.log.warn(`notify failed (${n.kind}): ${e instanceof Error ? e.message : e}`);
    }
  }
}
