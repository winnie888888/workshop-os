import {
  Body, CanActivate, Controller, ExecutionContext, Get, HttpException, Injectable,
  Module, OnModuleDestroy, OnModuleInit, Post,
} from '@nestjs/common';
import { getContext, Permission } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { NotifyService } from '../../common/notify/notify.service';
import { AppConfig } from '../../config/configuration';
import { RequirePermissions } from '../../auth/permissions.guard';

/**
 * Zaračunavanje — Faza B, blok 1: STANJE in MEHKI paywall.
 *
 *  - BillingStateService: bere plan/billing_status/trial_ends_at iz
 *    app.tenants (withAdmin — tabela je admin domena) s 60 s predpomnilnikom,
 *    da PlanGuard ne dodaja poizvedbe vsaki mutaciji.
 *  - PlanGuard (globalni APP_GUARD): mehki paywall. GET/HEAD/OPTIONS so VEDNO
 *    prosti (read-only dostop in IZVOZ podatkov ostaneta — podatki so last
 *    delavnice, ne najemnina). Mutacije ob zamrznjenem stanju vrnejo 402 z
 *    razumljivim sporočilom. Poti /billing so izvzete, da lahko stranka plača.
 *  - BillingSweepService: periodično (10 min) poteklim trialom postavi
 *    billing_status='suspended', avditira 'tenant.trial_expired' (actor =
 *    sistem) in obvesti lastnike. Stripe webhooki (blok 2) bodo ta ista polja
 *    premikali naprej ('active', 'past_due' …).
 *
 * Semantika stanj (enum iz 0018): founders → vedno aktivno (A-SPRINT in
 * ročno ustvarjeni tenanti); active → vse odprto; trialing → odprto do
 * trial_ends_at (guard blokira tudi pred sweepom); past_due → pisanje ŠE
 * dovoljeno (Stripe okno ponovnih bremenitev — banner opozarja, blok 2);
 * suspended/cancelled → samo branje.
 */

export interface BillingState {
  plan: string;
  billingStatus: string;
  trialEndsAt: string | null;
  /** Ali so mutacije dovoljene. */
  writable: boolean;
  /** Razlog blokade ali opozorila: 'trial_expired' | 'suspended' | 'cancelled' | 'past_due' | null. */
  reason: string | null;
  /** Pri aktivnem trialu: celih dni do izteka (za pasico). */
  trialDaysLeft: number | null;
}

const CACHE_TTL_MS = 60_000;

@Injectable()
export class BillingStateService {
  private readonly cache = new Map<string, { at: number; state: BillingState }>();

  constructor(private readonly pg: PgService) {}

  invalidate(tenantId: string): void {
    this.cache.delete(tenantId);
  }

  async get(tenantId: string): Promise<BillingState> {
    const hit = this.cache.get(tenantId);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.state;

    const row = await this.pg.withAdmin(async (tx) =>
      (await tx.query<{ plan: string; billing_status: string; trial_ends_at: string | null }>(
        `SELECT plan, billing_status, trial_ends_at FROM app.tenants WHERE id = $1`,
        [tenantId],
      )).rows[0]);

    const state = computeState(row?.plan ?? 'founders', row?.billing_status ?? 'active', row?.trial_ends_at ?? null);
    this.cache.set(tenantId, { at: Date.now(), state });
    return state;
  }
}

export function computeState(plan: string, billingStatus: string, trialEndsAt: string | null): BillingState {
  const base = { plan, billingStatus, trialEndsAt, trialDaysLeft: null as number | null };

  if (plan === 'founders') return { ...base, writable: true, reason: null };
  if (billingStatus === 'active') return { ...base, writable: true, reason: null };
  if (billingStatus === 'past_due') return { ...base, writable: true, reason: 'past_due' };

  if (billingStatus === 'trialing') {
    const ends = trialEndsAt ? Date.parse(trialEndsAt) : NaN;
    if (!Number.isFinite(ends) || ends > Date.now()) {
      const daysLeft = Number.isFinite(ends)
        ? Math.max(0, Math.ceil((ends - Date.now()) / 86_400_000))
        : null;
      return { ...base, writable: true, reason: null, trialDaysLeft: daysLeft };
    }
    return { ...base, writable: false, reason: 'trial_expired' };
  }

  // 'suspended' | 'cancelled' (in karkoli neznanega — fail-closed za pisanje)
  return { ...base, writable: false, reason: billingStatus };
}

const BLOCK_MESSAGES: Record<string, string> = {
  trial_expired: 'Poskusno obdobje je poteklo. Podatki in izvoz ostajajo dostopni; za urejanje izberite paket v razdelku Zaračunavanje.',
  suspended: 'Naročnina je zamrznjena. Podatki in izvoz ostajajo dostopni; za urejanje uredite plačilo v razdelku Zaračunavanje.',
  cancelled: 'Naročnina je prekinjena. Podatki in izvoz ostajajo dostopni; za urejanje znova izberite paket.',
};

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private readonly state: BillingStateService) {}

  async canActivate(execCtx: ExecutionContext): Promise<boolean> {
    const req = execCtx.switchToHttp().getRequest();
    const method: string = (req?.method ?? 'GET').toUpperCase();

    // Mehki paywall: branje (in s tem GDPR izvoz) je vedno prosto.
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

    // Poti zunaj tenant konteksta (public, health, user-scoped) guard spusti;
    // getContext je AsyncLocalStorage in se obnaša defenzivno.
    let tenantId: string | null = null;
    try { tenantId = getContext()?.tenantId ?? null; } catch { tenantId = null; }
    if (!tenantId) return true;

    // Plačilne poti morajo delovati tudi v zamrznjenem stanju (da stranka plača).
    const url: string = String(req?.originalUrl ?? req?.url ?? '');
    if (url.startsWith('/billing') || url.includes('/billing/')) return true;

    const state = await this.state.get(tenantId);
    if (state.writable) return true;

    const detail = BLOCK_MESSAGES[state.reason ?? ''] ?? BLOCK_MESSAGES.suspended;
    throw new HttpException(
      {
        statusCode: 402,
        title: 'Plačilo potrebno',
        detail,
        plan: state.plan,
        billingStatus: state.billingStatus,
        trialEndsAt: state.trialEndsAt,
      },
      402,
    );
  }
}

const SWEEP_INTERVAL_MS = 10 * 60_000;
const SWEEP_INITIAL_DELAY_MS = 15_000;

@Injectable()
export class BillingSweepService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;
  private initial: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(
    private readonly pg: PgService,
    private readonly audit: AuditService,
    private readonly notify: NotifyService,
    private readonly state: BillingStateService,
  ) {}

  onModuleInit(): void {
    this.initial = setTimeout(() => { void this.sweep(); }, SWEEP_INITIAL_DELAY_MS);
    this.timer = setInterval(() => { void this.sweep(); }, SWEEP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.initial) clearTimeout(this.initial);
  }

  /** Potekli triali → suspended (+ audit, sistem kot akter), nato obvestilo lastnikom. */
  async sweep(): Promise<void> {
    if (this.running) return; // brez prekrivanja, če bi bila baza počasna
    this.running = true;
    try {
      const expired = await this.pg.withAdmin(async (tx) => {
        const r = await tx.query<{ id: string; name: string }>(
          `UPDATE app.tenants
              SET billing_status = 'suspended', updated_at = now()
            WHERE billing_status = 'trialing'
              AND trial_ends_at IS NOT NULL
              AND trial_ends_at < now()
            RETURNING id, name`,
        );
        for (const t of r.rows) {
          await this.audit.append(tx, {
            tenantId: t.id, actorId: null, action: 'tenant.trial_expired',
            entityType: 'tenant', entityId: t.id,
            before: { billingStatus: 'trialing' }, after: { billingStatus: 'suspended' },
          });
        }
        return r.rows;
      });

      for (const t of expired) {
        this.state.invalidate(t.id);
        await this.notify.toRoles(t.id, ['owner', 'admin'], {
          kind: 'billing',
          title: 'Poskusno obdobje je poteklo',
          body: 'Urejanje je zamrznjeno do izbire paketa. Vsi podatki in izvoz ostajajo dostopni.',
          entityType: 'tenant',
          entityId: t.id,
        });
      }
      if (expired.length > 0)
        console.log(`[billing] trial sweep: ${expired.length} tenant(ov) → suspended`);
    } catch (e) {
      console.error('[billing] trial sweep failed:', (e as Error).message);
    } finally {
      this.running = false;
    }
  }
}

/* ------------------------------ Stripe (blok 2) ------------------------------ */

/**
 * Stripe Billing brez SDK odvisnosti — surovi fetch na api.stripe.com (form
 * encoding), po istem poštenem vzorcu kot Resend mailer: prazen
 * STRIPE_SECRET_KEY ⇒ checkout/portal/webhook vrnejo 503 z razlago, nič se ne
 * pretvarja. Webhook se overja z "verify-by-retrieve": iz prejetega telesa
 * vzamemo SAMO event id in dogodek ponovno preberemo neposredno iz Stripe API
 * — ponarejen payload tako nima učinka, surovo telo/podpis pa nista potrebna
 * (ni posega v body parser). Checkout zbira naslov + davčno številko kupca
 * (billing_address_collection, tax_id_collection), da bo platformno
 * fakturiranje (issueFromLines) imelo zakonsko potrebne podatke.
 */
@Injectable()
export class StripeService {
  constructor(
    private readonly cfg: AppConfig,
    private readonly pg: PgService,
    private readonly audit: AuditService,
    private readonly notify: NotifyService,
    private readonly state: BillingStateService,
  ) {}

  get configured(): boolean { return this.cfg.stripeSecretKey.trim() !== ''; }

  priceFor(plan: string): string | null {
    const map: Record<string, string> = {
      start: this.cfg.stripePriceStart,
      delavnica: this.cfg.stripePriceDelavnica,
      flota: this.cfg.stripePriceFlota,
    };
    const p = map[plan];
    return p && p.trim() !== '' ? p : null;
  }

  private planForPrice(priceId: string | null | undefined): string | null {
    if (!priceId) return null;
    if (priceId === this.cfg.stripePriceStart) return 'start';
    if (priceId === this.cfg.stripePriceDelavnica) return 'delavnica';
    if (priceId === this.cfg.stripePriceFlota) return 'flota';
    return null;
  }

  private async stripe(method: 'GET' | 'POST', path: string, form?: Record<string, string>): Promise<any> {
    const res = await fetch(`https://api.stripe.com/v1${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.cfg.stripeSecretKey}`,
        ...(form ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: form ? new URLSearchParams(form).toString() : undefined,
    });
    const json: any = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error?.message ?? `Stripe ${res.status}`;
      throw Object.assign(new Error(msg), { status: res.status });
    }
    return json;
  }

  private notConfigured(): never {
    throw new HttpException(
      {
        statusCode: 503,
        title: 'Stripe ni konfiguriran',
        detail: 'Koda za naročnine je pripravljena; dodajte STRIPE_SECRET_KEY in STRIPE_PRICE_* v okolje API-ja (test ključi sk_test_… zadoščajo za preizkus).',
      },
      503,
    );
  }

  async createCheckout(tenantId: string, plan: string): Promise<{ url: string }> {
    if (!this.configured) this.notConfigured();
    const price = this.priceFor(plan);
    if (!price)
      throw new HttpException(
        { statusCode: 400, title: 'Neznan paket', detail: `Za paket "${plan}" ni nastavljen STRIPE_PRICE_*.` },
        400,
      );
    const base = this.cfg.webAppUrl.replace(/\/+$/, '');
    const s = await this.stripe('POST', '/checkout/sessions', {
      mode: 'subscription',
      'line_items[0][price]': price,
      'line_items[0][quantity]': '1',
      client_reference_id: tenantId,
      'metadata[tenant_id]': tenantId,
      'metadata[plan]': plan,
      'subscription_data[metadata][tenant_id]': tenantId,
      'subscription_data[metadata][plan]': plan,
      billing_address_collection: 'required',
      'tax_id_collection[enabled]': 'true',
      allow_promotion_codes: 'true',
      success_url: `${base}/owner/billing?checkout=success`,
      cancel_url: `${base}/owner/billing?checkout=cancel`,
    });
    return { url: s.url };
  }

  async createPortal(tenantId: string): Promise<{ url: string }> {
    if (!this.configured) this.notConfigured();
    const row = await this.pg.withAdmin(async (tx) =>
      (await tx.query<{ stripe_customer_id: string | null }>(
        `SELECT stripe_customer_id FROM app.tenants WHERE id = $1`, [tenantId],
      )).rows[0]);
    if (!row?.stripe_customer_id)
      throw new HttpException(
        { statusCode: 400, title: 'Ni naročnine', detail: 'Delavnica še nima Stripe naročnine — najprej izberite paket.' },
        400,
      );
    const base = this.cfg.webAppUrl.replace(/\/+$/, '');
    const s = await this.stripe('POST', '/billing_portal/sessions', {
      customer: row.stripe_customer_id,
      return_url: `${base}/owner/billing`,
    });
    return { url: s.url };
  }

  /** Webhook: telo je le NAMIG — resnico preberemo nazaj iz Stripe po event id. */
  async handleWebhook(body: any): Promise<{ received: boolean; ignored?: boolean }> {
    if (!this.configured) this.notConfigured();
    const id = typeof body?.id === 'string' && /^evt_/.test(body.id) ? body.id : null;
    if (!id) return { received: true, ignored: true };

    let evt: any;
    try { evt = await this.stripe('GET', `/events/${id}`); }
    catch { return { received: true, ignored: true }; } // neznan/tuj event id → tiho 200

    const type: string = evt?.type ?? '';
    const o: any = evt?.data?.object ?? {};

    if (type === 'checkout.session.completed') {
      const tenantId: string | null = o.client_reference_id ?? o.metadata?.tenant_id ?? null;
      const plan: string | null = o.metadata?.plan ?? null;
      if (tenantId && plan) {
        await this.updateTenant({ by: 'id', key: tenantId }, {
          plan, billing_status: 'active',
          stripe_customer_id: typeof o.customer === 'string' ? o.customer : null,
          stripe_subscription_id: typeof o.subscription === 'string' ? o.subscription : null,
        }, 'checkout.session.completed');
        await this.notify.toRoles(tenantId, ['owner', 'admin'], {
          kind: 'billing', title: 'Naročnina je aktivirana',
          body: `Hvala! Paket »${plan}« je aktiven — vse funkcije so odklenjene.`,
          entityType: 'tenant', entityId: tenantId,
        });
      }
      return { received: true };
    }

    if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
      const subId: string | null = typeof o.id === 'string' ? o.id : null;
      if (!subId) return { received: true, ignored: true };
      const status: string = type.endsWith('deleted') ? 'canceled' : String(o.status ?? '');
      const mapped =
        status === 'active' || status === 'trialing' ? 'active'
        : status === 'past_due' ? 'past_due'
        : status === 'canceled' || status === 'incomplete_expired' ? 'cancelled'
        : status === 'unpaid' || status === 'paused' ? 'suspended'
        : null;
      if (!mapped) return { received: true, ignored: true };
      const plan = o.metadata?.plan ?? this.planForPrice(o?.items?.data?.[0]?.price?.id);
      await this.updateTenant({ by: 'subscription', key: subId }, {
        billing_status: mapped, ...(plan ? { plan } : {}),
      }, type);
      return { received: true };
    }

    if (type === 'invoice.paid' || type === 'invoice.payment_failed') {
      const subId: string | null = typeof o.subscription === 'string' ? o.subscription : null;
      const cusId: string | null = typeof o.customer === 'string' ? o.customer : null;
      const lookup = subId ? { by: 'subscription' as const, key: subId }
                   : cusId ? { by: 'customer' as const, key: cusId } : null;
      if (!lookup) return { received: true, ignored: true };
      const paid = type === 'invoice.paid';
      const tenantId = await this.updateTenant(lookup, { billing_status: paid ? 'active' : 'past_due' }, type, {
        stripeInvoiceId: o.id, amountPaidMinor: o.amount_paid ?? null, currency: o.currency ?? null,
        periodStart: o.period_start ?? null, periodEnd: o.period_end ?? null,
      });
      if (tenantId && !paid) {
        await this.notify.toRoles(tenantId, ['owner', 'admin'], {
          kind: 'billing', title: 'Plačilo naročnine ni uspelo',
          body: 'Stripe ni uspel bremeniti plačilnega sredstva. Uredite ga v razdelku Zaračunavanje, sicer bo urejanje zamrznjeno.',
          entityType: 'tenant', entityId: tenantId,
        });
      }
      return { received: true };
    }

    return { received: true, ignored: true };
  }

  /** Skupni UPDATE + audit (actor = sistem) + invalidate; vrne tenant id ali null. */
  private async updateTenant(
    lookup: { by: 'id' | 'customer' | 'subscription'; key: string },
    patch: Record<string, string | null>,
    sourceEvent: string,
    extraAudit?: Record<string, unknown>,
  ): Promise<string | null> {
    const where = lookup.by === 'id' ? 'id = $1'
      : lookup.by === 'customer' ? 'stripe_customer_id = $1'
      : 'stripe_subscription_id = $1';
    const cols = Object.entries(patch).filter(([, v]) => v !== null) as Array<[string, string]>;
    if (cols.length === 0) return null;

    return this.pg.withAdmin(async (tx) => {
      const before = (await tx.query<any>(
        `SELECT id, plan, billing_status FROM app.tenants WHERE ${where}`, [lookup.key],
      )).rows[0];
      if (!before) return null;

      const sets = cols.map(([c], i) => `${c} = $${i + 2}`).join(', ');
      await tx.query(
        `UPDATE app.tenants SET ${sets}, updated_at = now() WHERE id = $1`,
        [before.id, ...cols.map(([, v]) => v)],
      );
      await this.audit.append(tx, {
        tenantId: before.id, actorId: null, action: 'tenant.subscription_updated',
        entityType: 'tenant', entityId: before.id,
        before: { plan: before.plan, billingStatus: before.billing_status },
        after: { ...Object.fromEntries(cols), sourceEvent, ...(extraAudit ?? {}) },
      });
      this.state.invalidate(before.id);
      return before.id as string;
    });
  }
}

@Controller('billing')
export class BillingController {
  constructor(private readonly state: BillingStateService, private readonly stripe: StripeService) {}

  /** Stanje naročnine za pasico/zaslon Zaračunavanje — bere vsak član. */
  @Get('status')
  async status(): Promise<BillingState> {
    const ctx = getContext();
    return this.state.get(ctx.tenantId);
  }

  /** Stripe Checkout za izbran paket — owner/admin. Vrne {url} za preusmeritev. */
  @Post('checkout')
  @RequirePermissions(Permission.TenantManage)
  checkout(@Body() body: { plan?: string }) {
    const ctx = getContext();
    const plan = String(body?.plan ?? '');
    if (!['start', 'delavnica', 'flota'].includes(plan))
      throw new HttpException({ statusCode: 400, title: 'Neznan paket', detail: 'Dovoljeni paketi: start, delavnica, flota.' }, 400);
    return this.stripe.createCheckout(ctx.tenantId, plan);
  }

  /** Stripe Billing Portal (menjava kartice, računi) — owner/admin. */
  @Post('portal')
  @RequirePermissions(Permission.TenantManage)
  portal() {
    const ctx = getContext();
    return this.stripe.createPortal(ctx.tenantId);
  }

  /**
   * Stripe webhook — JAVNA pot (izvzeta iz auth middleware-a). Telo je samo
   * namig: dogodek preberemo nazaj iz Stripe po event id (verify-by-retrieve),
   * zato ponarejen klic nima učinka, raw-body podpisovanje pa ni potrebno.
   */
  @Post('webhook')
  webhook(@Body() body: unknown) {
    return this.stripe.handleWebhook(body);
  }
}

@Module({
  controllers: [BillingController],
  providers: [BillingStateService, BillingSweepService, PlanGuard, StripeService],
  exports: [BillingStateService, PlanGuard],
})
export class BillingModule {}
