'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { DEMO_MODE } from '@/lib/demo';

/*
 * Pasica stanja naročnine (Faza B, blok 1). Tiha, kadar je vse v redu:
 *  - aktivni trial → diskretno odštevanje dni,
 *  - past_due → opozorilo (pisanje še dela — Stripe okno ponovnih bremenitev),
 *  - suspended/cancelled/trial_expired → jasna razlaga mehkega paywalla
 *    (branje in izvoz ostajata; mutacije vračajo 402).
 * Gumb »Izberi paket« pride z zaslonom Zaračunavanje v bloku 2 (Stripe).
 */
export default function BillingBanner() {
  const { data } = useSWR(
    DEMO_MODE ? null : 'billing-status',
    () => api.billing.status().catch(() => null),
    { revalidateOnFocus: false, dedupingInterval: 5 * 60_000 },
  );

  if (!data) return null;

  if (!data.writable) {
    const msg = data.reason === 'trial_expired'
      ? 'Poskusno obdobje je poteklo — urejanje je zamrznjeno, vsi podatki in izvoz ostajajo dostopni.'
      : data.reason === 'cancelled'
        ? 'Naročnina je prekinjena — urejanje je zamrznjeno, vsi podatki in izvoz ostajajo dostopni.'
        : 'Naročnina je zamrznjena — urejanje je onemogočeno, vsi podatki in izvoz ostajajo dostopni.';
    return (
      <div className="mb-4 rounded-lg border border-stop/30 bg-stop/10 px-4 py-2.5 text-sm font-semibold text-stop">
        {msg}{' '}
        <Link href="/owner/billing" className="underline underline-offset-2 hover:opacity-80">Izberi paket →</Link>
      </div>
    );
  }

  if (data.reason === 'past_due') {
    return (
      <div className="mb-4 rounded-lg border border-hold/30 bg-hold/10 px-4 py-2.5 text-sm font-semibold text-hold">
        Zadnje plačilo naročnine ni uspelo —{' '}
        <Link href="/owner/billing" className="underline underline-offset-2 hover:opacity-80">preverite plačilno sredstvo</Link>, sicer bo dostop za urejanje zamrznjen.
      </div>
    );
  }

  if (data.plan === 'trial' && data.trialDaysLeft !== null) {
    const d = data.trialDaysLeft;
    const label = d === 0 ? 'danes se izteče' : d === 1 ? 'še 1 dan' : d === 2 ? 'še 2 dneva' : `še ${d} dni`;
    return (
      <div className="mb-4 rounded-lg border border-line bg-paper px-4 py-2 text-sm text-muted">
        Poskusno obdobje: <span className="font-semibold text-ink">{label}</span>. Vaši podatki ostanejo vaši — tudi po izteku sta branje in izvoz vedno odprta.
      </div>
    );
  }

  return null;
}
