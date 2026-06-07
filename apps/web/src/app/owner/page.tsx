'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { formatMoneyMinor, todayIso } from '@/lib/format';
import { Card, Spinner } from '@/components/ui';

/*
 * Owner dashboard (design spec, image 2). One-glance health: revenue,
 * receivables and output VAT up top; AI findings and receivables-aging in the
 * middle; recent jobs and the VAT breakdown below. Every figure is real — drawn
 * from the reporting + AI-manager endpoints — and denominated in money.
 */

function periodStart(): string {
  const d = new Date(); d.setUTCDate(1);
  return d.toISOString().slice(0, 10);
}
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('sl-SI', { day: 'numeric', month: 'numeric', year: 'numeric' });

export default function OwnerDashboard() {
  const from = periodStart();
  const to = todayIso();

  const { data: revenue } = useSWR(['rev', from, to], () => api.reports.revenue(from, to).catch(() => null));
  const { data: aging } = useSWR(['aging', to], () => api.reports.arAging(to).catch(() => null));
  const { data: vat } = useSWR(['vat', from, to], () => api.reports.vat(from, to).catch(() => null));
  const { data: ai } = useSWR('owner-ai', () => api.manager.dashboard(30).catch(() => null));
  const { data: recent } = useSWR('owner-recent', () => api.workOrders.list({ statuses: ['ready', 'invoiced'], limit: 8 }).catch(() => []));

  const revGross = revenue ? (revenue.gross ?? formatMoneyMinor(revenue.grossMinor)) : null;
  const recvTotal = aging ? (aging.formatted?.total || formatMoneyMinor(aging.buckets.total)) : null;
  const overdueMinor = aging ? overdue(aging) : 0n;
  const vatTotal = vat ? formatMoneyMinor(vat.totalVatMinor) : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Nadzorna plošča</h1>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-steel shadow-card">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted2" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          <span className="num">{fmtDate(from)} – {fmtDate(to)}</span>
          <span className="text-muted2">· ta mesec</span>
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Prihodki" value={revGross} tone="go"
          sub={revenue ? `${revenue.documents} ${revenue.documents === 1 ? 'dokument' : 'dokumentov'}` : undefined} />
        <Kpi label="Izdani DDV" value={vatTotal} tone="info" sub="izstopni DDV" />
        <Kpi label="Odprte terjatve" value={recvTotal} tone="brandpurple"
          sub={overdueMinor > 0n ? `zapadlo ${formatMoneyMinor(overdueMinor.toString())}` : 'ni zapadlih'}
          alert={overdueMinor > 0n} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink">
              AI opozorila
              {ai?.insights?.length ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-stop px-1.5 text-xs font-bold text-white">{ai.insights.length}</span> : null}
            </h2>
            <Link href="/owner/insights" className="text-xs font-bold uppercase tracking-wide text-brand hover:underline">Preglej vsa</Link>
          </div>
          {!ai ? <Spinner className="text-brand" /> : (ai.insights ?? []).length === 0 ? (
            <p className="text-sm text-muted">Ni opozoril.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {(ai.insights as any[]).slice(0, 4).map((it, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className={`mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full text-white ${sevColor(it.severity)}`}>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">{it.title}</span>
                    <span className="block truncate text-xs text-muted">{it.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-base font-bold text-ink">Terjatve po starosti</h2>
          {!aging ? <Spinner className="text-brand" /> : (
            <div className="flex flex-col gap-3">
              <AgeBar label="Nezapadlo" minor={aging.buckets.current} total={aging.buckets.total} tone="bg-brand" />
              <AgeBar label="1–30 dni" minor={aging.buckets.d1_30} total={aging.buckets.total} tone="bg-safety" />
              <AgeBar label="31–60 dni" minor={aging.buckets.d31_60} total={aging.buckets.total} tone="bg-hold" />
              <AgeBar label="61–90 dni" minor={aging.buckets.d61_90} total={aging.buckets.total} tone="bg-stop/80" />
              <AgeBar label="nad 90 dni" minor={aging.buckets.d90_plus} total={aging.buckets.total} tone="bg-stop" />
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-base font-bold text-ink">Zadnji nalogi — marža</h2>
          </div>
          {!recent ? <div className="p-6"><Spinner className="text-brand" /></div> : recent.length === 0 ? (
            <p className="p-6 text-center text-muted">Ni nedavnih nalogov.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((w) => (
                <li key={w.id}>
                  <Link href={`/owner/work-orders/${w.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-floor">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="num font-bold text-ink">{w.number ?? '—'}</span>
                      <span className="truncate text-sm text-muted">{w.customerName ?? ''}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="num text-sm font-semibold text-ink">{formatMoneyMinor(w.totalGrossMinor, w.currency)}</span>
                      <span className="text-xs font-bold uppercase tracking-wide text-brand">vpogled →</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-base font-bold text-ink">DDV po stopnjah</h2>
          {!vat ? <Spinner className="text-brand" /> : (vat.groups ?? []).length === 0 ? (
            <p className="text-sm text-muted">V tem obdobju ni izdanih dokumentov.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted2">
                <tr><th className="py-1.5 font-bold">Stopnja</th><th className="py-1.5 text-right font-bold">Neto</th><th className="py-1.5 text-right font-bold">DDV</th></tr>
              </thead>
              <tbody>
                {(vat.groups as any[]).map((g, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-2 text-ink">{g.reverseCharge ? 'Obrnjena dav. obv.' : `${g.ratePct}%`}</td>
                    <td className="num py-2 text-right text-muted">{g.net}</td>
                    <td className="num py-2 text-right font-semibold text-ink">{g.vat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

const KPI_TONE: Record<string, string> = { go: 'text-go', info: 'text-brand', brandpurple: 'text-[#7c3aed]' };
function Kpi({ label, value, tone, sub, alert }: {
  label: string; value: string | null; tone: 'go' | 'info' | 'brandpurple'; sub?: string; alert?: boolean;
}) {
  return (
    <Card className={`p-5 ${alert ? 'ring-1 ring-stop/30' : ''}`}>
      <p className="text-sm font-semibold text-muted">{label}</p>
      {value === null ? <Spinner className="mt-2 text-brand" /> : (
        <p className={`num mt-1 text-3xl font-extrabold tracking-tight ${KPI_TONE[tone]}`}>{value}</p>
      )}
      {sub && <p className={`mt-1 text-xs font-semibold ${alert ? 'text-stop' : 'text-muted2'}`}>{sub}</p>}
    </Card>
  );
}

function AgeBar({ label, minor, total, tone }: { label: string; minor: string; total: string; tone: string }) {
  let pct = 0;
  try {
    const t = BigInt(total || '0');
    pct = t > 0n ? Number((BigInt(minor || '0') * 1000n) / t) / 10 : 0;
  } catch { /* ignore */ }
  const hasValue = !!minor && minor !== '0';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-steel">{label}</span>
        <span className="num font-semibold text-ink">{formatMoneyMinor(minor || '0')}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-floor">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${hasValue ? Math.max(pct, 3) : 0}%` }} />
      </div>
    </div>
  );
}

function sevColor(sev: string): string {
  return sev === 'alert' ? 'bg-stop' : sev === 'warn' ? 'bg-safety' : 'bg-brand';
}

function overdue(aging: any): bigint {
  const b = aging?.buckets;
  if (!b) return 0n;
  let sum = 0n;
  for (const k of ['d1_30', 'd31_60', 'd61_90', 'd90_plus']) { try { sum += BigInt(b[k] ?? '0'); } catch { /* ignore */ } }
  return sum;
}
