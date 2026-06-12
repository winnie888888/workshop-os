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

type Candidate = {
  id: string; number: string | null; currency: string; totalGrossMinor: string;
  readyAt: string | null; assetId: string | null; plate: string | null; plateCountry: string | null;
  billableLines: number;
};

function Candidates({ customer, onChangeCustomer }: {
  customer: { id: string; name: string };
  onChangeCustomer: () => void;
}) {
  const router = useRouter();
  const { data: cands, error, mutate } = useSWR(
    ['cons-cands', customer.id],
    () => api.invoices.consolidatedCandidates(customer.id),
  );
  /* Obramba pred ne-seznamom: realni API vrača polje, demo ali delen odgovor
     pa lahko karkoli drugega. Vse spodaj uporablja izključno candList — ob
     neznani obliki pokažemo prazno stanje namesto sesutja cele aplikacije
     (QA C1: »TypeError: e is not iterable«). `cands` ostane samo še signal
     nalaganja (undefined = še nalagam). */
  const candList: Candidate[] = useMemo(() => {
    if (Array.isArray(cands)) return cands as Candidate[];
    const inner = cands as { workOrders?: unknown; items?: unknown } | undefined;
    if (inner && Array.isArray(inner.workOrders)) return inner.workOrders as Candidate[];
    if (inner && Array.isArray(inner.items)) return inner.items as Candidate[];
    return [];
  }, [cands]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [byVehicle, setByVehicle] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ id: string; number: string | null; plate: string | null }> | null>(null);

  // Privzeto izbrani VSI kandidati (najpogostejši primer: zaračunaj vse).
  useEffect(() => {
    setSelected(new Set(candList.map((c) => c.id)));
  }, [candList]);

  /* Skupine po vozilu (ključ je assetId, ne niz tablice — trdno tudi ob
     preregistraciji). Nalogi brez vozila so svoja skupina na koncu. */
  const groups = useMemo(() => {
    const list = candList;
    const map = new Map<string, { key: string; plate: string | null; rows: Candidate[] }>();
    for (const c of list) {
      const key = c.assetId ?? 'none';
      const g = map.get(key) ?? { key, plate: c.plate ?? null, rows: [] };
      g.rows.push(c);
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => {
      if (a.key === 'none') return 1;
      if (b.key === 'none') return -1;
      return String(a.plate ?? '').localeCompare(String(b.plate ?? ''), 'sl');
    });
  }, [candList]);

  const summary = useMemo(() => {
    if (candList.length === 0) return { count: 0, sum: 0n, currency: 'EUR', vehicleGroups: 0 };
    let sum = 0n;
    let currency = 'EUR';
    const touched = new Set<string>();
    for (const c of candList) {
      if (!selected.has(c.id)) continue;
      sum += BigInt(c.totalGrossMinor || '0');
      currency = c.currency;
      touched.add(c.assetId ?? 'none');
    }
    return { count: selected.size, sum, currency, vehicleGroups: touched.size };
  }, [candList, selected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleGroup(rows: Candidate[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = rows.every((r) => next.has(r.id));
      for (const r of rows) { if (allOn) next.delete(r.id); else next.add(r.id); }
      return next;
    });
  }

  /** En račun za vse izbrane (per-customer). */
  async function issueOne() {
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

  /**
   * Po vozilu (fleet opcija iz spec): za vsako vozilo z izbranimi nalogi EN
   * račun — zaporedni klici istega zalednega motorja, vsak zase atomaren.
   * Ob napaki se ustavi in POŠTENO pove, kateri računi so že izdani.
   */
  async function issuePerVehicle() {
    if (candList.length === 0) return;
    setBusy(true); setErr(null);
    const done: Array<{ id: string; number: string | null; plate: string | null }> = [];
    for (const g of groups) {
      const ids = g.rows.filter((r) => selected.has(r.id)).map((r) => r.id);
      if (ids.length === 0) continue;
      try {
        const res = await api.invoices.issueConsolidated({ customerId: customer.id, workOrderIds: ids });
        done.push({ id: res.id, number: res.number, plate: g.plate });
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Izdaja ni uspela.';
        setErr(
          `Napaka pri vozilu ${g.plate ? displayPlate(g.plate) : 'brez tablice'}: ${msg}` +
          (done.length > 0 ? ` Že izdani računi (${done.length}): ${done.map((d) => d.number ?? d.id).join(', ')}.` : ''),
        );
        break;
      }
    }
    setBusy(false);
    if (done.length > 0) {
      setResults(done);
      void mutate(); // preostali kandidati se osvežijo
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

  /* Rezultat izdaje po vozilu: seznam izdanih dokumentov s povezavami. */
  if (results) {
    return (
      <div className="flex flex-col gap-4">
        {err && <ProblemBanner message={err} />}
        <Card className="p-5">
          <h2 className="text-lg font-bold text-ink">Izdani računi ({results.length})</h2>
          <ul className="mt-3 divide-y divide-line">
            {results.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex items-center gap-2">
                  <span className="num font-bold text-ink">{r.number ?? r.id}</span>
                  {r.plate && <SoftChip tone="info">{displayPlate(r.plate)}</SoftChip>}
                </span>
                <Link href={`/advisor/invoices/${r.id}`} className="text-sm font-semibold text-brand hover:underline">
                  Odpri ›
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={() => setResults(null)} className="text-sm font-semibold text-muted hover:text-brand">
              Nazaj na kandidate
            </button>
            <Link href="/advisor/invoices" className="text-sm font-bold text-brand hover:underline">Računi ›</Link>
          </div>
        </Card>
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
      ) : candList.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-semibold text-ink">Ni neizdanih pripravljenih nalogov.</p>
          <p className="mt-1 text-sm text-muted">
            Na zbirni račun gredo nalogi v statusu »Pripravljeno«. Zaključi delo na nalogih ali izberi drugo stranko.
          </p>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <h2 className="text-base font-bold text-ink">
                Neizdani nalogi <span className="num text-muted2">({candList.length})</span>
              </h2>
              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-steel">
                  <input type="checkbox" checked={byVehicle} onChange={(e) => setByVehicle(e.target.checked)}
                    className="h-4 w-4 accent-[#1A6BEF]" />
                  Združi po vozilu
                </label>
                <button
                  onClick={() => setSelected(selected.size === candList.length ? new Set() : new Set(candList.map((c) => c.id)))}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  {selected.size === candList.length ? 'Odznači vse' : 'Izberi vse'}
                </button>
              </div>
            </div>

            {!byVehicle ? (
              <ul className="divide-y divide-line">
                {candList.map((c) => (
                  <CandidateRow key={c.id} c={c} on={selected.has(c.id)} onToggle={() => toggle(c.id)} showPlate />
                ))}
              </ul>
            ) : (
              <div className="divide-y divide-linestrong">
                {groups.map((g) => {
                  const onCount = g.rows.filter((r) => selected.has(r.id)).length;
                  const groupSum = g.rows.reduce(
                    (acc, r) => acc + (selected.has(r.id) ? BigInt(r.totalGrossMinor || '0') : 0n), 0n);
                  return (
                    <div key={g.key}>
                      <label className="flex min-h-tap cursor-pointer items-center gap-3 bg-surface2 px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={onCount === g.rows.length}
                          ref={(el) => { if (el) el.indeterminate = onCount > 0 && onCount < g.rows.length; }}
                          onChange={() => toggleGroup(g.rows)}
                          className="h-4 w-4 flex-none accent-[#1A6BEF]"
                        />
                        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                          {g.plate
                            ? <SoftChip tone="info">{displayPlate(g.plate)}</SoftChip>
                            : <SoftChip tone="neutral">brez vozila</SoftChip>}
                          <span className="num text-xs text-muted">{onCount}/{g.rows.length} nalogov</span>
                        </span>
                        <span className="num flex-none text-sm font-bold text-ink">
                          {formatMoneyMinor(groupSum.toString(), g.rows[0]?.currency ?? 'EUR')}
                        </span>
                      </label>
                      <ul className="divide-y divide-line">
                        {g.rows.map((c) => (
                          <CandidateRow key={c.id} c={c} on={selected.has(c.id)} onToggle={() => toggle(c.id)} indent />
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {err && <ProblemBanner message={err} />}

          <Card className="sticky bottom-[4.5rem] flex flex-wrap items-center justify-between gap-3 p-4 shadow-lg lg:bottom-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted2">
                Izbranih: <span className="num">{summary.count}</span>
                {byVehicle && <> · vozil: <span className="num">{summary.vehicleGroups}</span></>}
              </p>
              <p className="num text-lg font-extrabold text-ink">
                {formatMoneyMinor(summary.sum.toString(), summary.currency)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {byVehicle && (
                <Button tone="info" size="lg" onClick={issuePerVehicle} disabled={busy || summary.count === 0}>
                  {busy ? <Spinner /> : `Izdaj po vozilu (${summary.vehicleGroups})`}
                </Button>
              )}
              <Button tone="go" size="lg" onClick={issueOne} disabled={busy || summary.count === 0}>
                {busy ? <Spinner /> : `Izdaj en račun (${summary.count})`}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function CandidateRow({ c, on, onToggle, showPlate, indent }: {
  c: Candidate; on: boolean; onToggle: () => void; showPlate?: boolean; indent?: boolean;
}) {
  return (
    <li>
      <label className={`flex min-h-tap cursor-pointer items-center gap-3 py-3 transition ${indent ? 'pl-10 pr-4' : 'px-4'} ${on ? 'bg-brandweak/50' : 'hover:bg-floor'}`}>
        <input type="checkbox" checked={on} onChange={onToggle} className="h-4 w-4 flex-none accent-[#1A6BEF]" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="num text-sm font-bold text-ink">{c.number ?? 'brez št.'}</span>
            {showPlate && c.plate && <SoftChip tone="info">{displayPlate(c.plate)}</SoftChip>}
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
}
