'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { api, type WorkOrderListItem } from '@/lib/api';
import { displayPlate, formatMoneyMinor, statusLabel, statusTone } from '@/lib/format';
import { Card, SoftChip, Spinner } from '@/components/ui';

/*
 * The advisor's dashboard ("Nadzorna plošča") — the daily landing. It answers
 * "what is happening today, what needs me, and where do we stand financially",
 * matching the design spec: today's jobs, quick actions, derived alerts, the
 * receivables headline, and the most recent work orders. Everything is wired to
 * real endpoints (work-order list + AR aging); no invented data.
 */

const OPEN_STATUSES = ['open', 'in_progress', 'awaiting_approval', 'awaiting_parts', 'on_hold', 'ready'];

export default function AdvisorDashboard() {
  const { data: open, isLoading } = useSWR(
    'advisor-open',
    () => api.workOrders.list({ statuses: OPEN_STATUSES, limit: 200 }),
    { refreshInterval: 15000 },
  );
  const { data: recent } = useSWR('advisor-recent', () => api.workOrders.list({ limit: 8 }));
  const { data: aging } = useSWR('advisor-aging', () => api.reports.arAging().catch(() => null));

  const jobs = open ?? [];
  const today = new Date().toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Nadzorna plošča</h1>
        <span className="text-sm capitalize text-muted">{today}</span>
      </div>

      {isLoading && <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: schedule + recent */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="overflow-hidden">
            <SectionHead title="Današnji urnik" count={jobs.length} href="/advisor/work-orders" />
            <ul className="divide-y divide-line">
              {jobs.slice(0, 6).map((w) => (
                <li key={w.id}>
                  <Link href={`/advisor/work-orders/${w.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-floor">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="num text-sm font-semibold text-muted2">{w.number ?? '—'}</span>
                      <span className="num font-bold text-ink">{w.plate ? displayPlate(w.plate) : '—'}</span>
                      <span className="hidden truncate text-sm text-muted sm:inline">{w.customerName ?? ''}</span>
                    </span>
                    <SoftChip tone={w.hasOpenClock ? 'go' : statusTone(w.status)}>
                      {w.hasOpenClock ? 'V delu' : statusLabel(w.status)}
                    </SoftChip>
                  </Link>
                </li>
              ))}
              {jobs.length === 0 && !isLoading && (
                <li className="px-4 py-8 text-center text-muted">Danes ni odprtih nalogov.</li>
              )}
            </ul>
          </Card>

          <Card className="overflow-hidden">
            <SectionHead title="Zadnji delovni nalogi" href="/advisor/work-orders" />
            <table className="w-full text-sm">
              <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
                <tr>
                  <th className="px-4 py-2 font-bold">Št. naloga</th>
                  <th className="px-4 py-2 font-bold">Vozilo</th>
                  <th className="hidden px-4 py-2 font-bold sm:table-cell">Stranka</th>
                  <th className="px-4 py-2 font-bold">Status</th>
                  <th className="px-4 py-2 text-right font-bold">Znesek</th>
                </tr>
              </thead>
              <tbody>
                {(recent ?? []).map((w) => (
                  <tr key={w.id} className="border-t border-line">
                    <td className="px-4 py-2.5">
                      <Link href={`/advisor/work-orders/${w.id}`} className="num font-semibold text-brand hover:underline">{w.number ?? '—'}</Link>
                    </td>
                    <td className="num px-4 py-2.5 text-muted">{w.plate ? displayPlate(w.plate) : '—'}</td>
                    <td className="hidden truncate px-4 py-2.5 text-muted sm:table-cell">{w.customerName ?? ''}</td>
                    <td className="px-4 py-2.5"><SoftChip tone={statusTone(w.status)}>{statusLabel(w.status)}</SoftChip></td>
                    <td className="num px-4 py-2.5 text-right font-semibold text-ink">{formatMoneyMinor(w.totalGrossMinor, w.currency)}</td>
                  </tr>
                ))}
                {(recent ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Ni nalogov.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Right: quick access, alerts, finance */}
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <h2 className="mb-3 text-base font-bold text-ink">Hitri dostop</h2>
            <div className="flex flex-col gap-2">
              <QuickRow href="/advisor/work-orders/new" label="Nov nalog"
                icon={<path d="M12 5v14M5 12h14" />} />
              <QuickRow href="/advisor/customers/new" label="Nova stranka"
                icon={<><circle cx="9" cy="7" r="4" /><path d="M3 21v-1a5 5 0 0 1 5-5h2M19 8v6M16 11h6" /></>} />
              <QuickRow href="/advisor/plate-scan" label="Skeniraj tablico"
                icon={<><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10v4M11 10v4M15 10v4" /></>} />
              <QuickRow href="/advisor/voice" label="Glasovni vnos"
                icon={<><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></>} />
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-base font-bold text-ink">Opozorila</h2>
            <Alerts jobs={jobs} aging={aging} />
          </Card>

          <Finance aging={aging} />
        </div>
      </div>
    </div>
  );
}

function SectionHead({ title, count, href }: { title: string; count?: number; href: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-4 py-3">
      <h2 className="flex items-center gap-2 text-base font-bold text-ink">
        {title}
        {count !== undefined && count > 0 && (
          <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-brandweak px-1.5 text-xs font-bold text-brand">{count}</span>
        )}
      </h2>
      <Link href={href} className="text-xs font-bold uppercase tracking-wide text-brand hover:underline">Preglej vse</Link>
    </div>
  );
}

function QuickRow({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href}
      className="flex items-center gap-3 rounded-tool border border-line bg-surface px-3 py-3 transition hover:border-brandring hover:bg-brandweak">
      <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-brandweak text-brand">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">{icon}</svg>
      </span>
      <span className="font-semibold text-ink">{label}</span>
    </Link>
  );
}

function Alerts({ jobs, aging }: { jobs: WorkOrderListItem[]; aging: any }) {
  const approvals = jobs.filter((w) => w.status === 'awaiting_approval').length;
  const ready = jobs.filter((w) => w.status === 'ready').length;
  const parts = jobs.filter((w) => w.status === 'awaiting_parts').length;
  const overdueMinor = aging ? overdue(aging) : 0n;

  const rows: Array<{ tone: 'stop' | 'hold' | 'info'; text: string; href: string }> = [];
  if (overdueMinor > 0n) rows.push({ tone: 'stop', text: `${formatMoneyMinor(overdueMinor.toString())} zapadlih terjatev`, href: '/advisor/invoices' });
  if (approvals > 0) rows.push({ tone: 'hold', text: `${approvals} ${approvals === 1 ? 'nalog čaka' : 'nalogov čaka'} odobritev`, href: '/advisor/work-orders' });
  if (parts > 0) rows.push({ tone: 'hold', text: `${parts} ${parts === 1 ? 'nalog čaka' : 'nalogov čaka'} dele`, href: '/advisor/work-orders' });
  if (ready > 0) rows.push({ tone: 'info', text: `${ready} ${ready === 1 ? 'nalog za' : 'nalogov za'} izstavitev računa`, href: '/advisor/work-orders' });

  if (rows.length === 0) return <p className="text-sm text-muted">Trenutno ni opozoril.</p>;

  const badge = { stop: 'bg-stop', hold: 'bg-safety', info: 'bg-brand' } as const;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <li key={i}>
          <Link href={r.href} className="flex items-start gap-3 rounded-tool px-1 py-1.5 transition hover:bg-floor">
            <span className={`mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full text-white ${badge[r.tone]}`}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
            </span>
            <span className="text-sm font-semibold leading-snug text-ink">{r.text}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Finance({ aging }: { aging: any }) {
  const total = aging?.formatted?.total ?? '—';
  const overdueMinor = aging ? overdue(aging) : 0n;
  return (
    <Card className="p-4">
      <h2 className="mb-1 text-base font-bold text-ink">Finančno stanje</h2>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted2">Odprte terjatve</p>
      <p className="num mt-0.5 text-3xl font-extrabold tracking-tight text-ink">{total}</p>
      {overdueMinor > 0n && (
        <p className="num mt-1 text-sm font-semibold text-stop">zapadlo {formatMoneyMinor(overdueMinor.toString())}</p>
      )}
      <Link href="/advisor/invoices" className="mt-3 inline-block text-xs font-bold uppercase tracking-wide text-brand hover:underline">Podrobnosti</Link>
    </Card>
  );
}

/** Sum the overdue aging buckets (everything past current) in minor units. */
function overdue(aging: any): bigint {
  const b = aging?.buckets;
  if (!b) return 0n;
  const keys = ['d1_30', 'd31_60', 'd61_90', 'd90_plus'];
  let sum = 0n;
  for (const k of keys) { try { sum += BigInt(b[k] ?? '0'); } catch { /* ignore */ } }
  return sum;
}
