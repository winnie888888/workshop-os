import { Injectable } from '@nestjs/common';
import { getContext } from '@workshop/shared';
import { PgService } from '../common/db/pg.service';
import { AppConfig } from '../config/configuration';

/**
 * Auth/profile/session service. Everything here operates on GLOBAL user state
 * (identity, profile, sessions) rather than tenant-scoped data, so it always
 * runs at admin scope and filters by the authenticated user id taken from the
 * request context. This is the one place that legitimately crosses tenants,
 * because a single human logs in once and may belong to several workshops.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly pg: PgService,
    private readonly config: AppConfig,
  ) {}

  /** Public OIDC client parameters the SPA needs to start a PKCE login. */
  authConfig() {
    return {
      issuer: this.config.oidcIssuer,
      discoveryUrl: this.config.oidcDiscoveryUrl,
      clientId: this.config.oidcClientId,
      scopes: this.config.oidcScopes,
      redirectUri: this.config.oidcRedirectUri,
    };
  }

  /**
   * "Who am I": the user's profile plus every tenant they can act in, with the
   * roles for each. This is what the SPA calls right after login to populate
   * the profile and present the tenant picker.
   */
  async me() {
    const ctx = getContext();
    const userId = ctx.userId!;
    return this.pg.withAdmin(async (tx) => {
      const u = await tx.query<any>(
        `SELECT id, email, name, display_name, locale, phone, avatar_key, status
           FROM app.users WHERE id = $1`,
        [userId],
      );
      const memberships = await tx.query<any>(
        `SELECT m.tenant_id, t.name AS tenant_name, m.roles, m.active
           FROM app.memberships m
           JOIN app.tenants t ON t.id = m.tenant_id
          WHERE m.user_id = $1 AND m.active = true
          ORDER BY t.name`,
        [userId],
      );
      const user = u.rows[0];
      return {
        user: {
          id: user.id, email: user.email,
          name: user.display_name || user.name,
          locale: user.locale, phone: user.phone ?? null,
          hasAvatar: Boolean(user.avatar_key),
        },
        memberships: memberships.rows.map((m: any) => ({
          tenantId: m.tenant_id, tenantName: m.tenant_name, roles: m.roles ?? [],
        })),
      };
    });
  }

  /** Update the user's own profile (display name, locale, phone). */
  async updateProfile(input: { displayName?: string; locale?: string; phone?: string }) {
    const ctx = getContext();
    const userId = ctx.userId!;
    return this.pg.withAdmin(async (tx) => {
      const res = await tx.query<any>(
        `UPDATE app.users
            SET display_name = COALESCE($2, display_name),
                locale = COALESCE($3, locale),
                phone = COALESCE($4, phone),
                updated_at = now()
          WHERE id = $1
          RETURNING id, email, name, display_name, locale, phone`,
        [userId, input.displayName ?? null, input.locale ?? null, input.phone ?? null],
      );
      const u = res.rows[0];
      return { id: u.id, email: u.email, name: u.display_name || u.name, locale: u.locale, phone: u.phone ?? null };
    });
  }

  /**
   * Record/refresh a login session for this device. Upserts on (user, device)
   * so re-opening the app updates last_seen rather than piling up rows. Returns
   * the active sessions so the user can see and revoke their devices.
   */
  async heartbeat(input: { deviceId?: string; userAgent?: string; ipHint?: string; expiresAt?: string }) {
    const ctx = getContext();
    const userId = ctx.userId!;
    return this.pg.withAdmin(async (tx) => {
      if (input.deviceId) {
        await tx.query(
          `INSERT INTO app.user_sessions (user_id, device_id, user_agent, ip_hint, expires_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, device_id) WHERE revoked_at IS NULL AND device_id IS NOT NULL
           DO UPDATE SET last_seen_at = now(), user_agent = EXCLUDED.user_agent,
                         ip_hint = EXCLUDED.ip_hint, expires_at = EXCLUDED.expires_at`,
          [userId, input.deviceId, input.userAgent ?? null, input.ipHint ?? null, input.expiresAt ?? null],
        );
      }
      return this.listSessions(tx, userId);
    });
  }

  async sessions() {
    const ctx = getContext();
    const userId = ctx.userId!;
    return this.pg.withAdmin((tx) => this.listSessions(tx, userId));
  }

  /** Revoke one device session (logout-this-device) or the current one. */
  async revoke(sessionId?: string, deviceId?: string) {
    const ctx = getContext();
    const userId = ctx.userId!;
    await this.pg.withAdmin(async (tx) => {
      if (sessionId) {
        await tx.query(`UPDATE app.user_sessions SET revoked_at = now() WHERE id = $1 AND user_id = $2`,
          [sessionId, userId]);
      } else if (deviceId) {
        await tx.query(
          `UPDATE app.user_sessions SET revoked_at = now()
            WHERE user_id = $1 AND device_id = $2 AND revoked_at IS NULL`,
          [userId, deviceId]);
      }
    });
    return { ok: true };
  }

  private async listSessions(tx: any, userId: string) {
    const res = await tx.query(
      `SELECT id, device_id, user_agent, ip_hint, created_at, last_seen_at, expires_at
         FROM app.user_sessions
        WHERE user_id = $1 AND revoked_at IS NULL
        ORDER BY last_seen_at DESC`,
      [userId],
    );
    return res.rows.map((r: any) => ({
      id: r.id, deviceId: r.device_id, userAgent: r.user_agent,
      createdAt: r.created_at, lastSeenAt: r.last_seen_at, expiresAt: r.expires_at,
    }));
  }
}
