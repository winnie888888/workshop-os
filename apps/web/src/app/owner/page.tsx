'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useMemo } from 'react';
import { formatMoneyMinor, statusLabel, statusTone, todayIso } from '@/lib/format';
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

  // Mesečni prihodki za graf: 6 oken, vzporedni klici istega poročila.
  const { data: revSeries } = useSWR('owner-rev-6m', async () => {
    const wins = monthWindows(6);
    const rs = await Promise.all(wins.map((w) => api.reports.revenue(w.from, w.to).catch(() => null)));
    return wins.map((w, i) => ({ label: w.label, minor: Number(rs[i]?.grossMinor ?? 0) }));
  });
  // Mešanica nalogov po statusih za donut.
  const { data: woMix } = useSWR('owner-wo-mix', () => api.workOrders.list({ limit: 200 }).catch(() => []));

  const revTrend = useMemo(() => {
    if (!revSeries || revSeries.length < 2) return null;
    const prev = revSeries[revSeries.length - 2].minor;
    const cur = revSeries[revSeries.length - 1].minor;
    if (prev <= 0) return null;
    return ((cur - prev) / prev) * 100;
  }, [revSeries]);

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
        <Kpi label="Prihodki" value={revGross} tone="go" trendPct={revTrend}
          sub={revenue ? `${revenue.documents} ${revenue.documents === 1 ? 'dokument' : 'dokumentov'}` : undefined} />
        <Kpi label="Izdani DDV" value={vatTotal} tone="info" sub="izstopni DDV" />
        <Kpi label="Odprte terjatve" value={recvTotal} tone="brandpurple"
          sub={overdueMinor > 0n ? `zapadlo ${formatMoneyMinor(overdueMinor.toString())}` : 'ni zapadlih'}
          alert={overdueMinor > 0n} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-1 text-base font-bold text-ink">Prihodki — zadnjih 6 mesecev</h2>
          {!revSeries ? <Spinner className="text-brand" /> : <RevenueChart points={revSeries} />}
        </Card>
        <Card className="p-5">
          <h2 className="mb-1 text-base font-bold text-ink">Delovni nalogi po statusu</h2>
          {!woMix ? <Spinner className="text-brand" /> : <StatusDonut orders={woMix} />}
        </Card>
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
function Kpi({ label, value, tone, sub, alert, trendPct }: {
  label: string; value: string | null; tone: 'go' | 'info' | 'brandpurple'; sub?: string; alert?: boolean; trendPct?: number | null;
}) {
  const up = (trendPct ?? 0) >= 0;
  return (
    <Card className={`p-5 ${alert ? 'ring-1 ring-stop/30' : ''}`}>
      <p className="text-sm font-semibold text-muted">{label}</p>
      {value === null ? <Spinner className="mt-2 text-brand" /> : (
        <p className={`num mt-1 flex items-baseline gap-2 text-3xl font-extrabold tracking-tight ${KPI_TONE[tone]}`}>
          {value}
          {trendPct !== undefined && trendPct !== null && (
            <span className={`num text-sm font-bold ${up ? 'text-go' : 'text-stop'}`}>
              {up ? '▲' : '▼'} {Math.abs(trendPct).toFixed(0)}%
            </span>
          )}
        </p>
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

/** Zadnjih n koledarskih mesecev (UTC), tekoči do danes. */
function monthWindows(n: number): { from: string; to: string; label: string }[] {
  const out: { from: string; to: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const endOfMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    const end = endOfMonth < now ? endOfMonth : now;
    out.push({
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      label: start.toLocaleDateString('sl-SI', { month: 'short' }),
    });
  }
  return out;
}

/** Kompakten € prikaz za osi/oznake grafa (minor enote -> "1,2 k€"). */
function compactEur(minor: number): string {
  const eur = minor / 100;
  if (Math.abs(eur) >= 1000) return `${(eur / 1000).toLocaleString('sl-SI', { maximumFractionDigits: 1 })} k€`;
  return `${eur.toLocaleString('sl-SI', { maximumFractionDigits: 0 })} €`;
}

/** Ročni SVG ploščinski graf — brez chart odvisnosti (bundle ostane droben). */
function RevenueChart({ points }: { points: { label: string; minor: number }[] }) {
  const W = 560, H = 190, PAD_L = 14, PAD_R = 14, PAD_T = 26, PAD_B = 30;
  const geo = useMemo(() => {
    const max = Math.max(1, ...points.map((p) => p.minor));
    const iw = W - PAD_L - PAD_R, ih = H - PAD_T - PAD_B;
    const step = points.length > 1 ? iw / (points.length - 1) : 0;
    const xy = points.map((p, i) => ({
      x: PAD_L + i * step,
      y: PAD_T + ih - (p.minor / max) * ih,
      ...p,
    }));
    const line = xy.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${(PAD_L + iw).toFixed(1)},${(PAD_T + ih).toFixed(1)} L${PAD_L},${(PAD_T + ih).toFixed(1)} Z`;
    return { xy, line, area, baseline: PAD_T + ih };
  }, [points]);
  const allZero = points.every((p) => p.minor === 0);
  if (allZero) return <p className="py-8 text-center text-sm text-muted">V zadnjih 6 mesecih še ni izdanih dokumentov.</p>;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Prihodki po mesecih">
      {/* barve so hex zrcalo design tokenov (SVG ne bere Tailwind razredov) */}
      <defs>
        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A6BEF" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#1A6BEF" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <line x1={PAD_L} x2={W - PAD_R} y1={geo.baseline} y2={geo.baseline} stroke="#E3E9F2" strokeWidth="1" />
      <path d={geo.area} fill="url(#revFill)" />
      <path d={geo.line} fill="none" stroke="#1A6BEF" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {geo.xy.map((p) => (
        <g key={p.label + p.x}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#1A6BEF" strokeWidth="2" />
          <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#0F1B2D" className="num">{compactEur(p.minor)}</text>
          <text x={p.x} y={H - 10} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#8A99AE">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

/** Hex zrcalo statusnih tonov za SVG (v sinhronizaciji s tailwind tokeni). */
const TONE_HEX: Record<string, string> = {
  go: '#178A47', hold: '#B45309', stop: '#DC2626', info: '#1A6BEF', safety: '#e0a400', neutral: '#8A99AE',
};

/** Ročni SVG kolobar nalogov po statusih + legenda. */
function StatusDonut({ orders }: { orders: { status: string }[] }) {
  const seg = useMemo(() => {
    const by = new Map<string, number>();
    for (const o of orders) by.set(o.status, (by.get(o.status) ?? 0) + 1);
    const total = orders.length;
    const items = [...by.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([status, n]) => ({ status, n, label: statusLabel(status), hex: TONE_HEX[statusTone(status)] ?? TONE_HEX.neutral }));
    return { total, items };
  }, [orders]);
  if (seg.total === 0) return <p className="py-8 text-center text-sm text-muted">Ni delovnih nalogov.</p>;
  const R = 54, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 150 150" className="h-40 w-40 flex-none" role="img" aria-label="Nalogi po statusu">
        <circle cx="75" cy="75" r={R} fill="none" stroke="#F2F5FA" strokeWidth="22" />
        {seg.items.map((it) => {
          const frac = it.n / seg.total;
          const dash = frac * C;
          const off = -acc * C;
          acc += frac;
          return (
            <circle key={it.status} cx="75" cy="75" r={R} fill="none" stroke={it.hex} strokeWidth="22"
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={off} transform="rotate(-90 75 75)" />
          );
        })}
        <text x="75" y="72" textAnchor="middle" fontSize="26" fontWeight="800" fill="#0F1B2D" className="num">{seg.total}</text>
        <text x="75" y="90" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#8A99AE">nalogov</text>
      </svg>
      <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
        {seg.items.map((it) => (
          <li key={it.status} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: it.hex }} />
            <span className="min-w-0 flex-1 truncate text-steel">{it.label}</span>
            <span className="num font-bold text-ink">{it.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
