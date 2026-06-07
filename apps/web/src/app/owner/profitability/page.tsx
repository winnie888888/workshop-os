'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatMoneyMinor } from '@/lib/format';
import { Card, Spinner } from '@/components/ui';
import { InsightList } from '@/components/insight-list';

function iso(d: Date) { return d.toISOString().slice(0, 10); }

export default function ProfitabilityPage() {
  const [rev, setRev] = useState<any | null | undefined>(undefined);
  const [insights, setInsights] = useState<any[] | null>(null);

  useEffect(() => {
    const now = new Date();
    const from = iso(new Date(now.getFullYear(), now.getMonth(), 1));
    const to = iso(now);
    api.reports.revenue(from, to).then(setRev).catch(() => setRev(null));
    api.manager.dashboard(30).then((d) => setInsights((d?.insights ?? []).filter((i: any) => i.category === 'profitability'))).catch(() => setInsights([]));
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Profitabilnost</h1>
        <p className="text-sm text-muted">Promet tega meseca in ugotovitve o dobičkonosnosti nalogov.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Promet (bruto)" value={rev === undefined ? null : rev ? (rev.gross || formatMoneyMinor(rev.grossMinor)) : '—'} />
        <Kpi label="Promet (neto)" value={rev === undefined ? null : rev ? (rev.net || formatMoneyMinor(rev.netMinor)) : '—'} />
        <Kpi label="Izdanih dokumentov" value={rev === undefined ? null : rev ? String(rev.documents ?? 0) : '—'} />
      </div>

      <h2 className="text-base font-bold text-ink">Ugotovitve o dobičkonosnosti</h2>
      {insights === null ? <div className="flex justify-center py-8"><Spinner className="text-brand" /></div>
        : <InsightList insights={insights} empty="Ni opozoril o dobičkonosnosti. 👍" />}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | null }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-muted">{label}</p>
      {value === null ? <Spinner className="mt-2 text-brand" /> : <p className="num mt-1 text-3xl font-extrabold tracking-tight text-ink">{value}</p>}
    </Card>
  );
}
