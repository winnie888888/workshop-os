import {
  BadRequestException, ConflictException, Inject, Injectable, Logger,
  ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { newId } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { AppConfig } from '../../config/configuration';
import { hashPassword, verifyPassword } from '../../auth/password.util';
import { signLocalToken } from '../../auth/token-verifier';
import { NOTIFICATION_PORT } from '../../integrations/notifications/notification.port';
import type { NotificationPort } from '../../integrations/notifications/notification.port';

/**
 * Self-serve signup (Produktizacija Faza A). Načela:
 *
 *  - Tenant in uporabnik NE obstajata pred potrjenim e-mailom: čakajoča
 *    registracija (ime delavnice + scrypt hash gesla) živi v
 *    app.signup_tokens, žeton hranimo samo kot sha256.
 *  - Provisioning je ENA withAdmin transakcija: tenant → user → membership
 *    (owner) → credentials → audit 'tenant.created' kot PRVI člen nove
 *    verige. Karkoli pade, ne ostane pol-tenant.
 *  - Enumeration zaščita: /public/signup vrne {ok:true} ne glede na to, ali
 *    e-mail že obstaja; razlika je vidna samo v server logu.
 *  - Rate limit je in-memory (na instanco) — dovolj za fazo A; Turnstile se
 *    preverja samo, če je TURNSTILE_SECRET nastavljen (config-driven, brez
 *    pretvarjanja).
 *  - Prijava: generična napaka za neobstoječ e-mail / napačno geslo, lockout
 *    15 min po 5 zgrešenih poskusih, zahteva potrjen e-mail.
 */

const TOKEN_TTL_HOURS = 24;
const LOCK_AFTER_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

interface RateBucket { count: number; resetAt: number; }

@Injectable()
export class SignupService {
  private readonly log = new Logger('Signup');
  private readonly buckets = new Map<string, RateBucket>();

  constructor(
    private readonly pg: PgService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
    @Inject(NOTIFICATION_PORT) private readonly notify: NotificationPort,
  ) {}

  /**
   * Zgodovina prijav (P3b): en vnos na izid lokalne prijave. Toleranten —
   * napaka pri pisanju zgodovine NIKOLI ne spremeni izida avtentikacije in
   * odgovor klientu ostane bit za bitom enak (enumeration zaščita velja).
   */
  private async recordLoginEvent(tx: any, e: {
    userId?: string | null; emailAttempted?: string | null;
    success: boolean; ip?: string | null; userAgent?: string | null; detail?: string | null;
  }): Promise<void> {
    try {
      await tx.query(
        `INSERT INTO app.login_events (user_id, tenant_id, email_attempted, method, success, ip, user_agent, detail)
         VALUES ($1, NULL, $2, 'local', $3, $4, $5, $6)`,
        [e.userId ?? null, e.emailAttempted ?? null, e.success,
         e.ip ?? null, (e.userAgent ?? '').slice(0, 300) || null, e.detail ?? null],
      );
    } catch { /* zgodovina ne sme nikoli podreti avtentikacije */ }
  }

  /** Samostojen zapis dogodka izven obstoječe transakcije (kratke poti, ki vržejo). */
  private logLoginOutcome(e: {
    userId?: string | null; emailAttempted?: string | null;
    success: boolean; ip?: string | null; userAgent?: string | null; detail?: string | null;
  }): void {
    void this.pg.withAdmin((tx) => this.recordLoginEvent(tx, e)).catch(() => { /* ignore */ });
  }

  /** In-memory drsno okno (1 h). Vrne false, ko je limit presežen. */
  private allow(key: string, max: number): boolean {
    const now = Date.now();
    const b = this.buckets.get(key);
    if (!b || b.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + 3_600_000 });
      return true;
    }
    b.count += 1;
    return b.count <= max;
  }

  private requireLocalSecret(): string {
    const s = this.config.authLocalSecret;
    if (s) return s;
    if (this.config.nodeEnv !== 'production') return 'dev-only-local-auth-secret';
    throw new ServiceUnavailableException('AUTH_LOCAL_SECRET is not configured');
  }

  /** Cloudflare Turnstile — preverja se SAMO, če je skrivnost nastavljena. */
  private async turnstileOk(token: string | undefined, ip: string): Promise<boolean> {
    if (!this.config.turnstileSecret) return true;
    if (!token) return false;
    try {
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: this.config.turnstileSecret, response: token, remoteip: ip }),
      });
      const json: any = await res.json().catch(() => ({}));
      return json?.success === true;
    } catch {
      return false;
    }
  }

  async requestSignup(input: { email: string; password: string; workshopName: string; turnstileToken?: string }, ip: string): Promise<{ ok: true }> {
    this.requireLocalSecret(); // fail fast, preden karkoli obljubimo
    const email = input.email.trim().toLowerCase();
    const workshopName = input.workshopName.trim();
    if (input.password.length < 10) throw new BadRequestException('Geslo mora imeti vsaj 10 znakov.');
    if (workshopName.length < 2) throw new BadRequestException('Vpišite ime delavnice.');
    if (!this.allow(`su:ip:${ip}`, 10) || !this.allow(`su:em:${email}`, 5)) {
      throw new BadRequestException('Preveč poskusov. Poskusite čez eno uro.');
    }
    if (!(await this.turnstileOk(input.turnstileToken, ip))) {
      throw new BadRequestException('Preverjanje proti zlorabi ni uspelo. Osvežite stran in poskusite znova.');
    }

    const exists = await this.pg.withAdmin(async (tx) =>
      (await tx.query(`SELECT 1 FROM app.users WHERE email = $1`, [email])).rowCount > 0);
    if (exists) {
      // Enumeration zaščita: navzven enak odgovor, interno samo log.
      this.log.warn(`signup for existing email suppressed: ${email}`);
      return { ok: true };
    }

    const passwordHash = await hashPassword(input.password);
    const raw = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(raw).digest('hex');

    await this.pg.withAdmin(async (tx) => {
      await tx.query(`UPDATE app.signup_tokens SET used_at = now() WHERE email = $1 AND used_at IS NULL`, [email]);
      await tx.query(
        `INSERT INTO app.signup_tokens (email, token_hash, purpose, payload, expires_at)
         VALUES ($1, $2, 'signup', $3::jsonb, now() + make_interval(hours => $4))`,
        [email, tokenHash, JSON.stringify({ workshopName, passwordHash }), TOKEN_TTL_HOURS],
      );
    });

    const link = `${this.config.webAppBaseUrl}/verify?token=${raw}`;
    await this.notify.send({
      channel: 'email', to: email, kind: 'signup_verification',
      body: `Pozdravljeni!\n\nNekdo (upajmo, da vi) je s tem e-naslovom začel registracijo delavnice "${workshopName}" v A-SPRINT GARAGE.\n\nRegistracijo potrdite s klikom na povezavo (velja ${TOKEN_TTL_HOURS} ur). Če to niste bili vi, sporočilo ignorirajte.`,
      link,
    });
    this.log.log(`signup verification queued for ${email}`);
    return { ok: true };
  }

  /** Potrditev e-maila → provisioning v ENI transakciji → takojšnja seja. */
  async verify(rawToken: string): Promise<{ ok: true; accessToken: string; tenantId: string; user: { id: string; email: string; name: string } }> {
    const secret = this.requireLocalSecret();
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const result = await this.pg.withAdmin(async (tx) => {
      const t = (await tx.query<any>(
        `SELECT * FROM app.signup_tokens WHERE token_hash = $1 FOR UPDATE`, [tokenHash],
      )).rows[0];
      if (!t || t.used_at || new Date(t.expires_at).getTime() < Date.now()) {
        throw new BadRequestException('Povezava ni veljavna ali je potekla. Začnite registracijo znova.');
      }
      const email: string = t.email;
      const payload = t.payload ?? {};
      const workshopName: string = String(payload.workshopName ?? '').trim() || 'Moja delavnica';
      const passwordHash: string = String(payload.passwordHash ?? '');
      if (!passwordHash) throw new BadRequestException('Registracija je poškodovana. Začnite znova.');

      const dup = await tx.query(`SELECT 1 FROM app.users WHERE email = $1`, [email]);
      if (dup.rowCount > 0) throw new ConflictException('Račun s tem e-naslovom že obstaja. Prijavite se.');

      const tenantId = newId();
      const userId = newId();
      const name = email.split('@')[0];

      await tx.query(
        `INSERT INTO app.tenants (id, name, country, plan, billing_status, trial_ends_at)
         VALUES ($1, $2, 'SI', 'trial', 'trialing', now() + make_interval(days => $3))`,
        [tenantId, workshopName, this.config.trialDays],
      );
      await tx.query(
        `INSERT INTO app.users (id, email, name, external_subject) VALUES ($1, $2, $3, $4)`,
        [userId, email, name, `local|${userId}`],
      );
      await tx.query(
        `INSERT INTO app.memberships (tenant_id, user_id, roles, active) VALUES ($1, $2, ARRAY['owner'], true)`,
        [tenantId, userId],
      );
      await tx.query(
        `INSERT INTO app.user_credentials (user_id, password_hash, email_verified_at) VALUES ($1, $2, now())`,
        [userId, passwordHash],
      );
      await tx.query(`UPDATE app.signup_tokens SET used_at = now() WHERE id = $1`, [t.id]);

      // Prvi člen audit verige novega tenanta.
      await this.audit.append(tx, {
        tenantId, actorId: userId, action: 'tenant.created',
        entityType: 'tenant', entityId: tenantId, before: null,
        after: { name: workshopName, plan: 'trial', source: 'self_serve' },
      });

      return { tenantId, userId, email, name };
    });

    const accessToken = await signLocalToken(secret, result.userId);
    this.log.log(`tenant provisioned: ${result.tenantId} (${result.email})`);
    return { ok: true, accessToken, tenantId: result.tenantId, user: { id: result.userId, email: result.email, name: result.name } };
  }

  async login(input: { email: string; password: string }, ip: string, userAgent?: string | null): Promise<{
    ok: true; accessToken: string;
    user: { id: string; email: string; name: string };
    memberships: Array<{ tenantId: string; tenantName: string; roles: string[] }>;
  }> {
    const secret = this.requireLocalSecret();
    const email = input.email.trim().toLowerCase();
    if (!this.allow(`li:ip:${ip}`, 30) || !this.allow(`li:em:${email}`, 10)) {
      throw new UnauthorizedException('Preveč poskusov. Poskusite čez eno uro.');
    }

    const row = await this.pg.withAdmin(async (tx) =>
      (await tx.query<any>(
        `SELECT u.id, u.email, u.name, u.status,
                c.password_hash, c.email_verified_at, c.failed_attempts, c.locked_until
           FROM app.users u
           JOIN app.user_credentials c ON c.user_id = u.id
          WHERE u.email = $1`,
        [email],
      )).rows[0]);

    const generic = new UnauthorizedException('Napačen e-mail ali geslo.');
    if (!row || row.status !== 'active') {
      this.logLoginOutcome({
        userId: row?.id ?? null, emailAttempted: email, success: false,
        ip, userAgent, detail: row ? 'inactive_user' : 'unknown_email',
      });
      throw generic;
    }
    if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
      this.logLoginOutcome({ userId: row.id, emailAttempted: email, success: false, ip, userAgent, detail: 'locked' });
      throw new UnauthorizedException(`Račun je začasno zaklenjen (${LOCK_MINUTES} min) zaradi preveč poskusov.`);
    }

    const ok = await verifyPassword(input.password, row.password_hash);
    if (!ok) {
      await this.pg.withAdmin(async (tx) => {
        await tx.query(
          `UPDATE app.user_credentials
              SET failed_attempts = failed_attempts + 1,
                  locked_until = CASE WHEN failed_attempts + 1 >= $2
                                      THEN now() + make_interval(mins => $3) ELSE locked_until END
            WHERE user_id = $1`,
          [row.id, LOCK_AFTER_ATTEMPTS, LOCK_MINUTES],
        );
        await this.recordLoginEvent(tx, {
          userId: row.id, emailAttempted: email, success: false, ip, userAgent, detail: 'wrong_password',
        });
      });
      throw generic;
    }
    if (!row.email_verified_at) {
      this.logLoginOutcome({ userId: row.id, emailAttempted: email, success: false, ip, userAgent, detail: 'email_not_verified' });
      throw new UnauthorizedException('E-mail še ni potrjen. Preverite svoj nabiralnik.');
    }

    const memberships = await this.pg.withAdmin(async (tx) => {
      await tx.query(
        `UPDATE app.user_credentials SET failed_attempts = 0, locked_until = NULL WHERE user_id = $1`,
        [row.id],
      );
      const m = await tx.query<any>(
        `SELECT m.tenant_id, m.roles, t.name AS tenant_name
           FROM app.memberships m JOIN app.tenants t ON t.id = m.tenant_id
          WHERE m.user_id = $1 AND m.active = true
          ORDER BY t.name`,
        [row.id],
      );
      await this.recordLoginEvent(tx, { userId: row.id, emailAttempted: email, success: true, ip, userAgent, detail: null });
      return m.rows.map((r: any) => ({ tenantId: r.tenant_id, tenantName: r.tenant_name, roles: r.roles ?? [] }));
    });

    const accessToken = await signLocalToken(secret, row.id);
    return { ok: true, accessToken, user: { id: row.id, email: row.email, name: row.name }, memberships };
  }
}
