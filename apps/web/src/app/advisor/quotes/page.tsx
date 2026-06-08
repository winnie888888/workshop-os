'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { DEMO_MODE } from '@/lib/demo';
import { formatMoneyMinor, estimateStatusLabel, estimateStatusTone, docTotalsMinor } from '@/lib/format';
import { Button, Card, SoftChip, Spinner } from '@/components/ui';

/*
 * Predračuni (estimates) — list. Central-store backed: every estimate created
 * from a work order, a customer, or here shows up in one place, with its status
 * in the document chain (osnutek → poslan → sprejet → računiran). Customer names
 * are resolved client-side from the customers list, keeping the API thin.
 */
export default function QuotesPage() {
  const router = useRouter();
  const { data: estimates, isLoading } = useSWR(DEMO_MODE ? ['estimates-all'] : null, () => api.estimates.list().catch(() => []));
  const { data: customers } = useSWR(DEMO_MODE ? ['customers-for-quotes'] : null, () => api.customers.list().catch(() => []));

  if (!DEMO_MODE) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="border-hold/40 bg-hold/5 p-6">
          <p className="font-semibold text-ink">Predračuni so povezani z demo bazo.</p>
          <p className="mt-1 text-sm text-muted">V produkciji tečejo prek API-ja /estimates (v pripravi) — enaka veriga nalog → predračun → račun.</p>
          <Link href="/advisor" className="mt-3 inline-block text-sm font-semibold text-brand">‹ Nazaj</Link>
        </Card>
      </div>
    );
  }

  const custName = (cid: string) => (customers as any[] | undefined)?.find((c) => c.id === cid)?.name ?? '—';

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Predračuni</h1>
          <p className="text-sm text-muted">Ponudbe strankam — osnutek, pošiljanje, sprejem, pretvorba v račun.</p>
        </div>
        <Button tone="go" onClick={() => router.push('/advisor/quotes/new')}>+ Nov predračun</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>
      ) : !estimates || estimates.length === 0 ? (
        <Card className="p-10 text-center text-muted">Še ni predračunov. Ustvari prvega z gumbom zgoraj ali iz delovnega naloga.</Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
              <tr><th className="p-3 font-bold">Št.</th><th className="p-3 font-bold">Stranka</th><th className="p-3 font-bold">Datum</th><th className="p-3 font-bold">Status</th><th className="p-3 text-right font-bold">Znesek</th></tr>
            </thead>
            <tbody>
              {(estimates as any[]).map((e) => (
                <tr key={e.id} className="cursor-pointer border-t border-line hover:bg-surface2" onClick={() => router.push(`/advisor/quotes/${e.id}`)}>
                  <td className="num p-3 font-semibold text-brand">{e.number ?? '—'}</td>
                  <td className="p-3 text-ink">{custName(e.customerId)}</td>
                  <td className="num p-3 text-muted">{e.createdAt ? String(e.createdAt).slice(0, 10) : '—'}</td>
                  <td className="p-3"><SoftChip tone={estimateStatusTone(e.status)}>{estimateStatusLabel(e.status)}</SoftChip></td>
                  <td className="num p-3 text-right font-semibold text-ink">{formatMoneyMinor(docTotalsMinor(e.lines).grossMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
