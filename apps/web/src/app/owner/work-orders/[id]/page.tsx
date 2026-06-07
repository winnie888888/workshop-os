'use client';

import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { Card, ProblemBanner, SoftChip, Spinner } from '@/components/ui';

/*
 * The owner's labour insight for one job — the heart of the Phase 3 business
 * rule made visible. It holds the three hours side by side (actual/clocked,
 * standard/book, billed), the profitability, and the deterministic flags. The
 * AI narrative (from /insights) explains and prioritises the flags; it is shown
 * as analysis, never as an automatic action, and the numbers remain arithmetic.
 */
export default function OwnerInsight() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // /insights includes the deterministic picture AND the AI narrative.
  const { data, isLoading, error } = useSWR(['insight', id], () => api.reports.workOrderInsights(id));

  if (isLoading) return <div className="flex justify-center py-16"><Spinner className="text-info" /></div>;
  if (error || !data) return <Card className="m-6 p-6 text-steel">No insight available for this job.</Card>;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <button onClick={() => router.push('/owner')} className="self-start text-sm font-semibold text-steel">‹ Dashboard</button>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">
        Labour insight · {data.workOrder.number ?? data.workOrder.id.slice(0, 8)}
      </h1>

      {/* Three hours, side by side — the whole point of the rule. */}
      <div className="grid grid-cols-3 gap-4">
        <HourTile label="Actual (clocked)" value={data.hours.actual} tone="neutral" />
        <HourTile label="Standard (book)" value={data.hours.standard} tone="info" />
        <HourTile label="Billed" value={data.hours.billed} tone="go" />
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-2 gap-4">
          <Metric label="Efficiency" value={data.efficiency != null ? `${Math.round(data.efficiency * 100)}%` : '—'} />
          <Metric label="Margin" value={data.profitability.margin} accent />
          <Metric label="Billed revenue" value={data.profitability.billedRevenue} />
          <Metric label="Labour cost" value={data.profitability.labourCost} />
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-bold">Flags</h2>
        {data.flags.length === 0 ? (
          <Card className="border-go/40 bg-go/10 p-4 text-go">No anomalies. Healthy job.</Card>
        ) : (
          data.flags.map((f, i) => (
            <div key={i} className={`rounded-tool border px-4 py-3 ${flagClass(f.severity)}`}>
              <div className="flex items-center gap-2">
                <SoftChip tone={f.severity === 'alert' ? 'stop' : f.severity === 'warn' ? 'hold' : 'info'}>
                  {f.kind.replace('_', ' ')}
                </SoftChip>
              </div>
              <p className="mt-1 text-sm">{f.detail}</p>
            </div>
          ))
        )}
      </div>

      {data.narrative && (
        <Card className="border-info/40 bg-info/5 p-5">
          <div className="mb-2 flex items-center gap-2">
            <SoftChip tone="info">AI analysis</SoftChip>
            <span className="text-xs uppercase tracking-wide text-steel">priority: {data.narrative.priority}</span>
          </div>
          <p className="text-base">{data.narrative.summary}</p>
          <p className="mt-3 text-xs text-steel">
            Generated explanation of the deterministic flags above — for the owner to read or dismiss.
            It does not change any figure.
          </p>
        </Card>
      )}
    </main>
  );
}

function HourTile({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'info' | 'go' }) {
  const bg = tone === 'go' ? 'bg-go/10 text-go' : tone === 'info' ? 'bg-info/10 text-info' : 'bg-steel/10 text-steel';
  return (
    <div className={`rounded-tool p-4 ${bg}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 font-mono text-3xl font-bold">{value.toFixed(2)}<span className="text-base">h</span></p>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-steel">{label}</p>
      <p className={`mt-1 font-mono text-xl font-bold ${accent ? 'text-go' : ''}`}>{value}</p>
    </div>
  );
}

function flagClass(severity: string): string {
  if (severity === 'alert') return 'border-stop/40 bg-stop/10';
  if (severity === 'warn') return 'border-hold/40 bg-hold/10';
  return 'border-info/40 bg-info/5';
}
