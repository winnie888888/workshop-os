'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatMoneyMinor, displayPlate } from '@/lib/format';
import { Button, Card, ProblemBanner, SoftChip, Spinner } from '@/components/ui';

/*
 * Zbirni račun (Consolidated Invoicing) — tok po spec, cilj < 30 s:
 *   1. izberi stranko (server-side iskanje, keyset — brez 1000-vrstičnih dropdownov),
 *   2. sistem pokaže VSE 'ready' nezaračunane naloge te stranke,
 *   3. kljukice (privzeto VSI izbrani — najpogostejši primer je "zaračunaj vse"),
 *   4. en klik -> EN račun; preusmeritev na izdani dokument.
 * Backend izdaja teče skozi isti DDV/številčenje/audit/outbox motor kot enojni
 * tok in atomarno označi naloge; tu ni nobene finančne logike.
 */

export default function ConsolidatedInvoicePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner className="text-brand" /></div>}>
      <ConsolidatedInner />
    </Suspense>
  );
}

function ConsolidatedInner() {
  const sp = useSearchParams();
  const preset = sp.get('customerId');
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);

  // Globoka povezava s hub-a stranke: ime dopolnimo iz API-ja.
  useEffect(() => {
    if (preset && !customer) {
      api.customers.get(preset)
        .then((c: any) => setCustomer({ id: preset, name: c?.name ?? 'Stranka' }))
        .catch(() => setCustomer({ id: preset, name: 'Stranka' }));
    }
  }, [preset, customer]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <Link href="/advisor/invoices" className="text-sm font-semibold text-muted hover:text-brand">‹ Računi</Link>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">Zbirni račun</h1>
        <p className="mt-0.5 text-sm text-muted">
          En račun za več zaključenih nalogov iste stranke — za flote in poslovne stranke.
        </p>
      </div>

      {!customer ? (
        <CustomerPicker onPick={setCustomer} />
      ) : (
        <Candidates customer={customer} onChangeCustomer={() => setCustomer(null)} />
      )}
    </div>
  );
}

/* Server-side iskalnik strank (customers.search, keyset) — brez naštevanja vseh. */
function CustomerPicker({ onPick }: { onPick: (c: { id: string; name: string }) => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Array<{ id: string; name: string; vatId?: string | null; type?: string }>>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const query = q.trim();
    if (query.length < 2) { setHits([]); setSearching(false); return; }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await api.customers.search({ q: query, limit: 8 });
        setHits((res.items ?? []) as any[]);
      } catch { setHits([]); }
      finally { setSearching(false); }
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  return (
    <Card className="p-5">
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted2">Stranka</span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Začni tipkati ime stranke…"
          className="h-12 w-full rounded-tool border border-line bg-surface2 px-3 text-sm transition focus:border-brandring focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brandweak"
        />
      </label>
      <div className="mt-3">
        {searching && <div className="flex justify-center py-4"><Spinner className="text-brand" /></div>}
        {!searching && q.trim().length >= 2 && hits.length === 0 && (
          <p className="py-4 text-center text-sm text-muted">Ni zadetkov.</p>
        )}
        <ul className="divide-y divide-line">
          {hits.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onPick({ id: c.id, name: c.name })}
                className="flex w-full items-center justify-between gap-3 px-2 py-3 text-left transition hover:bg-floor"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-ink">{c.name}</span>
                  {c.vatId && <span className="num block text-xs text-muted">{c.vatId}</span>}
                </span>
                <span className="text-sm font-semibold text-brand">Izberi ›</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function Candidates({ customer, onChangeCustomer }: {
  customer: { id: string; name: string };
  onChangeCustomer: () => void;
}) {
  const router = useRouter();
  const { data: cands, error } = useSWR(
    ['cons-cands', customer.id],
    () => api.invoices.consolidatedCandidates(customer.id),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Privzeto izbrani VSI kandidati (najpogostejši primer: zaračunaj vse).
  useEffect(() => {
    if (cands) setSelected(new Set(cands.map((c) => c.id)));
  }, [cands]);

  const summary = useMemo(() => {
    if (!cands) return { count: 0, sum: 0n, currency: 'EUR' };
    let sum = 0n;
    let currency = 'EUR';
    for (const c of cands) {
      if (!selected.has(c.id)) continue;
      sum += BigInt(c.totalGrossMinor || '0');
      currency = c.currency;
    }
    return { count: selected.size, sum, currency };
  }, [cands, selected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function issue() {
    setBusy(true); setErr(null);
    try {
      const res = await api.invoices.issueConsolidated({
        customerId: customer.id,
        workOrderIds: [...selected],
      });
      router.push(`/advisor/invoices/${res.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Zbirnega računa ni bilo mogoče izdati.');
      setBusy(false);
    }
  }

  if (error) {
    const msg = error instanceof ApiError ? error.message : 'Kandidatov ni bilo mogoče naložiti.';
    return (
      <div>
        <ProblemBanner message={msg} tone="hold" />
        <p className="mt-3 text-sm text-muted">Na demo povezavi zbirni račun ni na voljo — dela proti pravemu API-ju.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-muted2">Stranka</p>
          <p className="truncate text-base font-bold text-ink">{customer.name}</p>
        </div>
        <button onClick={onChangeCustomer} className="text-sm font-semibold text-brand hover:underline">Zamenjaj</button>
      </Card>

      {!cands ? (
        <div className="flex justify-center py-12"><Spinner className="text-brand" /></div>
      ) : cands.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-semibold text-ink">Ni neizdanih pripravljenih nalogov.</p>
          <p className="mt-1 text-sm text-muted">
            Na zbirni račun gredo nalogi v statusu »Pripravljeno«. Zaključi delo na nalogih ali izberi drugo stranko.
          </p>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-base font-bold text-ink">
                Neizdani nalogi <span className="num text-muted2">({cands.length})</span>
              </h2>
              <button
                onClick={() => setSelected(selected.size === cands.length ? new Set() : new Set(cands.map((c) => c.id)))}
                className="text-sm font-semibold text-brand hover:underline"
              >
                {selected.size === cands.length ? 'Odznači vse' : 'Izberi vse'}
              </button>
            </div>
            <ul className="divide-y divide-line">
              {cands.map((c) => {
                const on = selected.has(c.id);
                return (
                  <li key={c.id}>
                    <label className={`flex min-h-tap cursor-pointer items-center gap-3 px-4 py-3 transition ${on ? 'bg-brandweak/50' : 'hover:bg-floor'}`}>
                      <input type="checkbox" checked={on} onChange={() => toggle(c.id)} className="h-4 w-4 flex-none accent-[#1A6BEF]" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="num text-sm font-bold text-ink">{c.number ?? 'brez št.'}</span>
                          {c.plate && <SoftChip tone="info">{displayPlate(c.plate)}</SoftChip>}
                        </span>
                        <span className="num mt-0.5 block text-xs text-muted">
                          {c.readyAt ? `pripravljen ${new Date(c.readyAt).toLocaleDateString('sl-SI')}` : 'pripravljen'}
                          {` · ${c.billableLines} ${c.billableLines === 1 ? 'postavka' : c.billableLines === 2 ? 'postavki' : 'postavk'}`}
                        </span>
                      </span>
                      <span className="num flex-none text-sm font-bold text-ink">
                        {formatMoneyMinor(c.totalGrossMinor, c.currency)}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </Card>

          {err && <ProblemBanner message={err} />}

          <Card className="sticky bottom-[4.5rem] flex items-center justify-between gap-3 p-4 shadow-lg lg:bottom-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted2">
                Izbranih: <span className="num">{summary.count}</span>
              </p>
              <p className="num text-lg font-extrabold text-ink">
                {formatMoneyMinor(summary.sum.toString(), summary.currency)}
              </p>
            </div>
            <Button tone="go" size="lg" onClick={issue} disabled={busy || summary.count === 0}>
              {busy ? <Spinner /> : `Izdaj zbirni račun (${summary.count})`}
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
