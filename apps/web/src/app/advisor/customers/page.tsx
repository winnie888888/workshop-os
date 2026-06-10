'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, Spinner } from '@/components/ui';

/*
 * Customers register — the on-ramp to the operational loop. Each row links to
 * the customer hub (vehicles, balance, new job). The register is server-driven:
 * search (name / VAT / city / code) and keyset pagination happen in the API, so
 * the screen stays fast at any book size. Header offers New customer.
 */
export default function CustomersList() {
  // Server-side search + keyset pagination: the register stays fast at any
  // book size. The needle is debounced so we query once per pause, not per key.
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [cursor, setCursor] = useState<{ afterName: string; afterId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 250); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    let live = true;
    setLoading(true); setError(null);
    api.customers.search({ q: dq || undefined, limit: 50 })
      .then((r) => { if (live) { setRows(r.items ?? []); setCursor(r.nextCursor ?? null); } })
      .catch(() => { if (live) { setRows([]); setCursor(null); setError('Strank ni bilo mogoče naložiti.'); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [dq]);

  async function loadMore() {
    if (!cursor || more) return;
    setMore(true);
    try {
      const r = await api.customers.search({ q: dq || undefined, limit: 50, afterName: cursor.afterName, afterId: cursor.afterId });
      setRows((p) => [...p, ...(r.items ?? [])]);
      setCursor(r.nextCursor ?? null);
    } catch { setError('Naslednje strani ni bilo mogoče naložiti.'); }
    finally { setMore(false); }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Stranke</h1>
          {!loading && (
            <p className="mt-0.5 text-sm text-muted">
              <span className="num">{rows.length}{cursor ? '+' : ''}</span> {dq ? `zadetkov za „${dq}“` : 'strank'}
            </p>
          )}
        </div>
        <Link href="/advisor/customers/new"
          className="inline-flex min-h-tap items-center gap-2 rounded-tool bg-brand px-5 font-bold text-white shadow-tool transition hover:bg-brand600 active:translate-y-px">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          Nova stranka
        </Link>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted2">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        </span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Išči (naziv, ID za DDV, kraj, šifra)…"
          className="h-10 w-full rounded-full border border-line bg-surface2 pl-9 pr-3 text-sm transition focus:border-brandring focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brandweak" />
      </div>

      {error && <p className="text-sm font-semibold text-stop">{error}</p>}
      {loading && <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>}

      {!loading && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
              <tr>
                <th className="px-4 py-2.5 font-bold">Naziv</th>
                <th className="hidden px-4 py-2.5 font-bold sm:table-cell">DDV</th>
                <th className="hidden px-4 py-2.5 font-bold sm:table-cell">Država</th>
                <th className="px-4 py-2.5 font-bold">Plačilni rok</th>
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-line transition hover:bg-floor">
                  <td className="px-4 py-3">
                    <Link href={`/advisor/customers/${c.id}`} className="font-semibold text-brand hover:underline">{c.name ?? '—'}</Link>
                  </td>
                  <td className="num hidden px-4 py-3 text-muted sm:table-cell">{c.vatId ?? c.vat_id ?? '—'}</td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">{c.country ?? c.countryCode ?? '—'}</td>
                  <td className="px-4 py-3 text-muted"><span className="num">{c.paymentTermsDays ?? c.payment_terms_days ?? '—'}</span> dni</td>
                  <td className="px-2 py-3 text-right"><RowMenu id={c.id} /></td>
                </tr>
              ))}
              {rows.length === 0 && !dq && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">
                  Še ni strank. <Link href="/advisor/customers/new" className="font-semibold text-brand hover:underline">Dodaj prvo →</Link>
                </td></tr>
              )}
              {rows.length === 0 && dq && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Ni zadetkov za „{dq}“.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {!loading && cursor && (
        <div className="flex justify-center">
          <button onClick={loadMore} disabled={more}
            className="inline-flex min-h-tap items-center gap-2 rounded-tool border border-line bg-surface px-5 text-sm font-bold text-steel transition hover:border-brandring hover:text-brand disabled:opacity-50">
            {more ? <Spinner /> : 'Naloži več'}
          </button>
        </div>
      )}
    </div>
  );
}

function RowMenu({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block text-left">
      <button onClick={() => setOpen((o) => !o)} onBlur={() => setTimeout(() => setOpen(false), 160)}
        className="grid h-8 w-8 place-items-center rounded-full text-muted2 transition hover:bg-line hover:text-ink" title="Več" aria-label="Več">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-tool border border-line bg-surface py-1 text-left shadow-lift">
          <Link href={`/advisor/customers/${id}`} className="block px-3 py-2 text-sm font-semibold text-ink hover:bg-floor">Odpri stranko</Link>
          <Link href={`/advisor/work-orders/new?customerId=${id}`} className="block px-3 py-2 text-sm font-semibold text-ink hover:bg-floor">Nov nalog</Link>
          <Link href={`/advisor/customers/${id}/vehicles/new`} className="block px-3 py-2 text-sm font-semibold text-ink hover:bg-floor">Novo vozilo</Link>
        </div>
      )}
    </div>
  );
}
