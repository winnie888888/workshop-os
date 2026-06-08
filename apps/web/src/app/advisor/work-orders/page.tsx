'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { api, type WorkOrderListItem } from '@/lib/api';
import { displayPlate, formatMoneyMinor, statusLabel, statusTone } from '@/lib/format';
import { Card, SoftChip, Spinner } from '@/components/ui';

/*
 * Work Orders register — the advisor's full list beyond the dashboard. Same
 * premium table styling as the dashboard, plus live status filters, a quick
 * search and a per-row action menu. All filtering is client-side over the
 * fetched list, so it works identically against real and demo data.
 */
type FilterKey = 'all' | 'in_progress' | 'waiting' | 'ready' | 'done';

const FILTERS: { key: FilterKey; label: string; match: (w: WorkOrderListItem) => boolean }[] = [
  { key: 'all', label: 'Vsi', match: () => true },
  { key: 'in_progress', label: 'V delu', match: (w) => w.hasOpenClock || w.status === 'in_progress' },
  { key: 'waiting', label: 'Čakajo', match: (w) => ['open', 'awaiting_approval', 'awaiting_parts', 'on_hold'].includes(w.status) },
  { key: 'ready', label: 'Pripravljeni', match: (w) => w.status === 'ready' },
  { key: 'done', label: 'Zaključeni', match: (w) => ['invoiced', 'closed'].includes(w.status) },
];

export default function WorkOrdersList() {
  const { data, isLoading } = useSWR('all-work-orders', () => api.workOrders.list({ limit: 200 }));
  const [filter, setFilter] = useState<FilterKey>('all');
  const [q, setQ] = useState('');

  const all = data ?? [];
  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: 0, in_progress: 0, waiting: 0, ready: 0, done: 0 };
    for (const f of FILTERS) c[f.key] = all.filter(f.match).length;
    return c;
  }, [all]);

  const rows = useMemo(() => {
    const match = FILTERS.find((f) => f.key === filter)?.match ?? (() => true);
    const needle = q.trim().toLowerCase();
    return all.filter(match).filter((w) => {
      if (!needle) return true;
      return (w.number ?? '').toLowerCase().includes(needle)
        || (w.plate ?? '').toLowerCase().includes(needle)
        || (w.customerName ?? '').toLowerCase().includes(needle);
    });
  }, [all, filter, q]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Delovni nalogi</h1>
          {data && <p className="mt-0.5 text-sm text-muted"><span className="num">{all.length}</span> nalogov</p>}
        </div>
        <Link href="/advisor/work-orders/new"
          className="inline-flex min-h-tap items-center gap-2 rounded-tool bg-brand px-5 font-bold text-white shadow-tool transition hover:bg-brand600 active:translate-y-px">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          Nov nalog
        </Link>
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition
                  ${active ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-steel hover:border-brandring hover:bg-brandweak'}`}>
                {f.label}
                <span className={`num grid h-4 min-w-4 place-items-center rounded-full px-1 text-[0.65rem] font-bold
                  ${active ? 'bg-white/25 text-white' : 'bg-floor text-muted2'}`}>{counts[f.key]}</span>
              </button>
            );
          })}
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted2">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtriraj (št., tablica, stranka)…"
            className="h-10 w-full rounded-full border border-line bg-surface2 pl-9 pr-3 text-sm transition focus:border-brandring focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brandweak" />
        </div>
      </div>

      {isLoading && <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>}

      {data && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
              <tr>
                <th className="px-4 py-2.5 font-bold">Št. naloga</th>
                <th className="px-4 py-2.5 font-bold">Vozilo</th>
                <th className="hidden px-4 py-2.5 font-bold sm:table-cell">Stranka</th>
                <th className="px-4 py-2.5 font-bold">Status</th>
                <th className="px-4 py-2.5 text-right font-bold">Znesek</th>
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id} className="border-t border-line transition hover:bg-floor">
                  <td className="px-4 py-3">
                    <Link href={`/advisor/work-orders/${w.id}`} className="num font-semibold text-brand hover:underline">{w.number ?? 'osnutek'}</Link>
                  </td>
                  <td className="num px-4 py-3 text-ink">{w.plate ? displayPlate(w.plate) : '—'}</td>
                  <td className="hidden truncate px-4 py-3 text-muted sm:table-cell">{w.customerName ?? '—'}</td>
                  <td className="px-4 py-3"><SoftChip tone={statusTone(w.status)}>{statusLabel(w.status)}</SoftChip></td>
                  <td className="num px-4 py-3 text-right font-semibold text-ink">{formatMoneyMinor(w.totalGrossMinor, w.currency)}</td>
                  <td className="px-2 py-3 text-right"><RowMenu w={w} /></td>
                </tr>
              ))}
              {all.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Še ni delovnih nalogov.</td></tr>}
              {all.length > 0 && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Ni nalogov v tem pogledu.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function RowMenu({ w }: { w: WorkOrderListItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block text-left">
      <button onClick={() => setOpen((o) => !o)} onBlur={() => setTimeout(() => setOpen(false), 160)}
        className="grid h-8 w-8 place-items-center rounded-full text-muted2 transition hover:bg-line hover:text-ink" title="Več" aria-label="Več">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-tool border border-line bg-surface py-1 text-left shadow-lift">
          <Link href={`/advisor/work-orders/${w.id}`} className="block px-3 py-2 text-sm font-semibold text-ink hover:bg-floor">Odpri nalog</Link>
          {w.status === 'ready' && <Link href={`/advisor/invoices/issue/${w.id}`} className="block px-3 py-2 text-sm font-semibold text-ink hover:bg-floor">Izstavi račun</Link>}
        </div>
      )}
    </div>
  );
}
