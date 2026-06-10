'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { DEMO_MODE } from '@/lib/demo';
import { PLANS, PLAN_LABELS } from '@/lib/billing-plans';
import { Button, Card, Spinner, ProblemBanner, SoftChip } from '@/components/ui';

/*
 * Zaračunavanje (lastnik) — Faza B, blok 2. Trenutno stanje naročnine, izbira
 * paketa (Stripe Checkout) in upravljanje plačil (Stripe Billing Portal).
 * Brez STRIPE_SECRET_KEY v API okolju gumbi pošteno vrnejo 503 razlago —
 * koda je pripravljena, ključi so ops korak. Founders paket (A-SPRINT in
 * ročno ustvarjeni tenanti) ne potrebuje ničesar tukaj.
 */

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner className="text-brand" /></div>}>
      <BillingInner />
    </Suspense>
  );
}

function BillingInner() {
  const params = useSearchParams();
  const checkoutResult = params.get('checkout'); // 'success' | 'cancel' | null
  const { data: status, isLoading, mutate } = useSWR(
    DEMO_MODE ? null : 'billing-status',
    () => api.billing.status(),
  );
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(plan: string) {
    setBusyPlan(plan); setError(null);
    try {
      const { url } = await api.billing.checkout(plan);
      window.location.href = url;
    } catch (e: any) {
      setError(e?.message ?? 'Checkouta ni bilo mogoče začeti.');
      setBusyPlan(null);
    }
  }

  async function openPortal() {
    setBusyPlan('portal'); setError(null);
    try {
      const { url } = await api.billing.portal();
      window.location.href = url;
    } catch (e: any) {
      setError(e?.message ?? 'Portala ni bilo mogoče odpreti.');
      setBusyPlan(null);
    }
  }

  if (!DEMO_MODE && isLoading)
    return <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>;

  const plan = status?.plan ?? 'trial';
  const founders = plan === 'founders';

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Zaračunavanje</h1>
        <p className="mt-1 text-sm text-muted">Paketi, naročnina in plačilna sredstva.</p>
      </div>

      {checkoutResult === 'success' && (
        <ProblemBanner tone="go" message="Hvala! Plačilo je v obdelavi — naročnina se aktivira v nekaj sekundah (Stripe webhook)." />
      )}
      {checkoutResult === 'cancel' && (
        <ProblemBanner tone="hold" message="Checkout je bil preklican — paket lahko izberete kadar koli." />
      )}
      {error && <ProblemBanner tone="stop" message={error} />}

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted2">Trenutno stanje</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg font-extrabold text-ink">{PLAN_LABELS[plan] ?? plan}</span>
            {DEMO_MODE ? (
              <SoftChip tone="hold">demo</SoftChip>
            ) : status ? (
              <SoftChip tone="info">{status.billingStatus}{status.trialDaysLeft !== null ? ` · še ${status.trialDaysLeft} dni` : ''}</SoftChip>
            ) : null}
          </div>
          {founders && (
            <p className="mt-1 text-sm text-muted">Founders dostop — naročnina ni potrebna. Hvala, da gradite z nami od prvega dne. 🚀</p>
          )}
        </div>
        {!DEMO_MODE && !founders && (
          <Button tone="info" onClick={openPortal} disabled={busyPlan !== null}>
            {busyPlan === 'portal' ? <Spinner /> : 'Upravljaj plačila (Stripe)'}
          </Button>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.id} className={`flex flex-col p-5 ${p.highlight ? 'ring-2 ring-brand' : ''}`}>
            {p.highlight && <div className="mb-2 self-start rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand">Najbolj izbrano</div>}
            <div className="text-lg font-extrabold text-ink">{p.label}</div>
            <div className="num mt-1 text-2xl font-extrabold text-ink">{p.priceEur} €<span className="text-sm font-semibold text-muted"> /mes + DDV</span></div>
            <p className="mt-1 text-sm text-muted">{p.tagline}</p>
            <ul className="mt-3 flex-1 space-y-1.5 text-sm text-ink">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2"><span className="text-go">✓</span><span>{f}</span></li>
              ))}
            </ul>
            <div className="mt-4">
              {DEMO_MODE ? (
                <Button tone="info" disabled className="w-full opacity-60">V demu ni naročanja</Button>
              ) : (
                <Button
                  tone={p.highlight ? 'go' : 'info'}
                  onClick={() => choose(p.id)}
                  disabled={busyPlan !== null || founders || plan === p.id}
                  className="w-full"
                >
                  {busyPlan === p.id ? <Spinner /> : plan === p.id ? 'Trenutni paket' : 'Izberi paket'}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted2">
        Cene so brez DDV; znesek ob plačilu določa Stripe cenik. Naročnino lahko kadar koli
        prekinete — podatki in izvoz ostanejo dostopni tudi po prekinitvi (mehki paywall).
        Po uspešnem plačilu sistem izda račun z gapless številčenjem (Minimax).
      </p>
      {DEMO_MODE && (
        <ProblemBanner tone="hold" message="Demo način: zaslon je prikazan z vzorčnimi stanji; Stripe checkout teče samo v pravem okolju s test ali live ključi." />
      )}
      {!DEMO_MODE && status && founders && (
        <Button tone="info" onClick={() => mutate()} className="self-start">Osveži stanje</Button>
      )}
    </div>
  );
}
