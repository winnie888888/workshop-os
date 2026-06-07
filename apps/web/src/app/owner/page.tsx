'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { todayIso } from '@/lib/format';
import { Card, SoftChip, Spinner } from '@/components/ui';

/*
 * Owner dashboard home — the one-glance health view from the UX spec. Built on
 * the real reporting endpoints (revenue, AR aging) plus a derived attention
 * list. The defining quality is signal: the owner reads it in seconds and knows
 * whether the shop is making money, whether anything is leaking, and where to
 * look. Every figure is denominated in money, per the Owner Principles.
 */

function periodStart(): string {
  const d = new Date(); d.setUTCDate(1);
  return d.toISOString().slice(0, 10);
}

export default function OwnerDashboard() {
  const from = periodStart();
  const to = todayIso();

  const { data: revenue } = useSWR(['rev', from, to], () => api.reports.revenue(from, to));
  const { data: aging } = useSWR(['aging', to], () => api.reports.arAging(to));
  const { data: vat } = useSWR(['vat', from, to], () => api.reports.vat(from, to));
  const { data: flagged } = useSWR('owner-attention', () =>
    api.workOrders.list({ statuses: ['ready', 'invoiced'], limit: 60 }));

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <div className="font-display text-3xl font-extrabold tracking-tight">A-SPRINT</div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-steel">Owner dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/owner/rental"
            className="tool-tap inline-flex items-center gap-2 rounded-tool border-2 border-line px-4 py-2 font-display font-bold">
            🚐 Rental
          </Link>
          <Link href="/owner/insights"
            className="tool-tap inline-flex items-center gap-2 rounded-tool bg-info px-4 py-2 font-display font-bold text-white">
            ✨ AI insights
          </Link>
          <Link href="/" className="text-sm text-steel underline">all interfaces</Link>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Tile label="Revenue (MTD)" value={revenue?.gross} loading={!revenue} />
        <Tile label="Documents" value={revenue ? String(revenue.documents) : undefined} loading={!revenue} plain />
        <Tile label="Output VAT" value={vat ? formatFromMinor(vat.totalVatMinor) : undefined} loading={!vat} />
        <Tile label="Money owed" value={aging?.formatted.total} loading={!aging}
          accent={aging && aging.buckets.d90_plus !== '0' ? 'stop' : undefined} />
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <AgingCard aging={aging} />
        <VatCard vat={vat} />
      </section>

      <AttentionCard flagged={flagged} />
    </main>
  );
}

function Tile({ label, value, loading, plain, accent }: {
  label: string; value?: string; loading: boolean; plain?: boolean; accent?: 'stop';
}) {
  return (
    <Card className={`p-4 ${accent === 'stop' ? 'border-stop/40' : ''}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-steel">{label}</p>
      {loading ? <Spinner className="mt-2 text-info" /> : (
        <p className={`mt-1 font-mono text-2xl font-bold ${accent === 'stop' ? 'text-stop' : ''} ${plain ? '' : ''}`}>
          {value ?? '—'}
        </p>
      )}
    </Card>
  );
}

function AgingCard({ aging }: { aging: any }) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 font-display text-lg font-bold">Receivables aging</h2>
      {!aging ? <Spinner className="text-info" /> : (
        <div className="flex flex-col gap-2">
          <AgeRow label="Current" value={aging.formatted.current} />
          <AgeRow label="1–30 days" value={aging.formatted.d1_30} />
          <AgeRow label="31–60 days" value={aging.formatted.d31_60} />
          <AgeRow label="61–90 days" value={aging.formatted.d61_90} />
          <AgeRow label="90+ days" value={aging.formatted.d90_plus} alert={aging.buckets.d90_plus !== '0'} />
        </div>
      )}
    </Card>
  );
}

function AgeRow({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-tool px-3 py-2 ${alert ? 'bg-stop/10' : 'bg-floor'}`}>
      <span className={alert ? 'font-semibold text-stop' : 'text-steel'}>{label}</span>
      <span className={`font-mono font-bold ${alert ? 'text-stop' : ''}`}>{value}</span>
    </div>
  );
}

function VatCard({ vat }: { vat: any }) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 font-display text-lg font-bold">VAT this period</h2>
      {!vat ? <Spinner className="text-info" /> : vat.groups.length === 0 ? (
        <p className="text-steel">No issued documents yet this period.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-steel">
            <tr><th className="py-1">Rate</th><th className="py-1 text-right">Net</th><th className="py-1 text-right">VAT</th></tr>
          </thead>
          <tbody>
            {vat.groups.map((g: any, i: number) => (
              <tr key={i} className="border-t border-line">
                <td className="py-2">{g.reverseCharge ? 'Reverse charge' : `${g.ratePct}%`}</td>
                <td className="py-2 text-right font-mono">{g.net}</td>
                <td className="py-2 text-right font-mono">{g.vat}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function AttentionCard({ flagged }: { flagged: any[] | undefined }) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 font-display text-lg font-bold">Recent jobs — labour &amp; margin</h2>
      <p className="mb-3 text-sm text-steel">
        Each recent job&apos;s clocked-vs-standard-vs-billed picture and profitability is one tap away.
        Underbilling and wasted labour surface here as money, not just counts.
      </p>
      {!flagged ? <Spinner className="text-info" /> : flagged.length === 0 ? (
        <p className="text-steel">No recent invoiced jobs.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {flagged.slice(0, 12).map((w) => (
            <li key={w.id}>
              <Link href={`/owner/work-orders/${w.id}`}
                className="flex items-center justify-between rounded-tool border border-line px-3 py-2 hover:bg-floor">
                <span className="font-mono font-bold">{w.number ?? w.plate ?? w.id.slice(0, 8)}</span>
                <span className="text-sm text-steel">{w.customerName}</span>
                <span className="text-sm font-semibold text-info">view insight →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function formatFromMinor(minor: string): string {
  // Owner VAT tile shows EUR; the report already formats group lines, this is
  // the period total which arrives as minor units.
  const n = BigInt(minor);
  const neg = n < 0n; const abs = neg ? -n : n;
  return `${neg ? '-' : ''}€${(abs / 100n).toString()}.${(abs % 100n).toString().padStart(2, '0')}`;
}
