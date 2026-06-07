import { BadRequestException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PortalToken } from '@workshop/shared';
import { PgService } from '../common/db/pg.service';
import { AppConfig } from '../config/configuration';
import { OutboxService } from '../common/outbox/outbox.service';
import { NOTIFICATION_PORT, type NotificationPort } from '../integrations/notifications/notification.port';

/**
 * Portal authentication. A customer never has a password; they sign in through a
 * deep link. The flow has three honest steps:
 *
 *   1. requestLink(email|phone): find the customer in the tenant, mint a SHORT-
 *      lived signed MAGIC token (15 min), build the deep link, and enqueue a
 *      notification to send it. We deliberately do NOT reveal whether the
 *      contact matched a customer (no account enumeration) — the caller always
 *      gets the same neutral response.
 *
 *   2. verifyLink(magicToken): verify the signature + expiry + purpose, then mint
 *      a longer-lived SESSION. We store only the SHA-256 HASH of the session
 *      secret, so a database leak cannot be replayed. The raw session secret is
 *      returned to the browser once and never stored server-side.
 *
 *   3. authenticate(sessionSecret): on each portal request, hash the presented
 *      secret, look up a live session, and return its {tenantId, customerId}.
 *
 * Tenant resolution for steps 1–2 is by the configured tenant (the portal is
 * branded per workshop); we accept it explicitly so a customer of tenant A can
 * never be issued a token for tenant B.
 */
@Injectable()
export class PortalAuthService {
  private readonly log = new Logger('PortalAuth');

  constructor(
    private readonly pg: PgService,
    private readonly config: AppConfig,
    private readonly outbox: OutboxService,
    @Inject(NOTIFICATION_PORT) notifier: NotificationPort,
  ) {}

  private hash(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Issue a magic link to a customer identified by email or phone within a
   * tenant. Neutral by design: it never tells the caller whether the contact
   * matched, to avoid leaking which contacts are customers.
   */
  async requestLink(tenantId: string, contact: string, channel: 'sms' | 'email'): Promise<{ sent: boolean }> {
    if (!tenantId) throw new BadRequestException('tenant required');
    const found = await this.pg.withAdmin(async (tx) => {
      // Match by email or a normalised phone; only active customers.
      const r = await tx.query<{ id: string; name: string; email: string | null; phone: string | null }>(
        `SELECT id, name, email, phone FROM app.customers
          WHERE tenant_id = $1 AND status <> 'archived'
            AND ($2 = lower(email) OR regexp_replace(COALESCE(phone,''),'[^0-9]','','g') = regexp_replace($3,'[^0-9]','','g'))
          LIMIT 1`,
        [tenantId, contact.toLowerCase(), contact],
      );
      return r.rowCount > 0 ? r.rows[0] : null;
    });

    // Always behave the same whether or not we found someone.
    if (!found) {
      this.log.log(`Portal link requested for unknown contact in tenant ${tenantId} (no-op)`);
      return { sent: true };
    }

    const { token } = PortalToken.createPortalToken(
      { tenantId, customerId: found.id, purpose: 'magic', ttlSeconds: 15 * 60 },
      this.config.portalTokenSecret,
    );
    const link = `${this.config.portalBaseUrl}/enter?token=${encodeURIComponent(token)}`;

    // Enqueue the notification (operational message; provider behind the port).
    await this.pg.withTenant(tenantId, async (tx) => {
      await this.outbox.enqueue(tx, {
        tenantId, eventType: 'notification.send',
        payload: {
          channel, to: channel === 'email' ? found.email : found.phone, kind: 'magic_link',
          body: `Your A-SPRINT customer portal sign-in link (valid 15 minutes): ${link}`,
          link,
        },
        idempotencyKey: `magic-${found.id}-${Math.floor(Date.now() / 60000)}`,
      });
    });
    return { sent: true };
  }

  /** Verify a magic token and mint a portal session; returns the raw session secret. */
  async verifyLink(magicToken: string, userAgent: string | null): Promise<{
    sessionToken: string; tenantId: string; customerId: string; customerName: string;
  }> {
    let claims;
    try {
      claims = PortalToken.verifyPortalToken(magicToken, this.config.portalTokenSecret, 'magic');
    } catch {
      throw new UnauthorizedException('This sign-in link is invalid or has expired. Please request a new one.');
    }

    const sessionSecret = PortalToken.newSessionSecret();
    const tokenHash = this.hash(sessionSecret);
    const sessionDays = 30;

    const customerName = await this.pg.withTenant(claims.tenantId, async (tx) => {
      const c = await tx.query<{ name: string }>(`SELECT name FROM app.customers WHERE id = $1`, [claims.customerId]);
      if (c.rowCount === 0) throw new UnauthorizedException('Customer no longer exists');
      await tx.query(
        `INSERT INTO app.portal_sessions (tenant_id, customer_id, token_hash, user_agent, expires_at)
         VALUES ($1,$2,$3,$4, now() + ($5 || ' days')::interval)`,
        [claims.tenantId, claims.customerId, tokenHash, userAgent, String(sessionDays)],
      );
      return c.rows[0].name;
    });

    return { sessionToken: sessionSecret, tenantId: claims.tenantId, customerId: claims.customerId, customerName };
  }

  /** Resolve a live session from a presented session secret. Used by the middleware. */
  async authenticate(sessionSecret: string): Promise<{ tenantId: string; customerId: string } | null> {
    const tokenHash = this.hash(sessionSecret);
    return this.pg.withAdmin(async (tx) => {
      const r = await tx.query<{ tenant_id: string; customer_id: string }>(
        `SELECT tenant_id, customer_id FROM app.portal_sessions
          WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
          LIMIT 1`,
        [tokenHash],
      );
      if (r.rowCount === 0) return null;
      // Touch last_seen for idle tracking (best-effort).
      await tx.query(`UPDATE app.portal_sessions SET last_seen_at = now() WHERE token_hash = $1`, [tokenHash]);
      return { tenantId: r.rows[0].tenant_id, customerId: r.rows[0].customer_id };
    });
  }

  /** Revoke the current session (logout). */
  async logout(sessionSecret: string): Promise<void> {
    const tokenHash = this.hash(sessionSecret);
    await this.pg.withAdmin(async (tx) => {
      await tx.query(`UPDATE app.portal_sessions SET revoked_at = now() WHERE token_hash = $1`, [tokenHash]);
    });
  }
}
