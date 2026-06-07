'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatMoneyMinor } from '@/lib/format';
import { Card, Spinner } from '@/components/ui';
import { InsightList } from '@/components/insight-list';

export default function ReceivablesPage() {
  const [aging, setAging] = useState<any | null | undefined>(undefined);
  const [insights, setInsights] = useState<any[] | null>(null);

  useEffect(() => {
    api.reports.arAging(new Date().toISOString().slice(0, 10)).then(setAging).catch(() => setAging(null));
    api.manager.dashboard(30).then((d) => setInsights((d?.insights ?? []).filter((i: any) => i.category === 'receivables'))).catch(() => setInsights([]));
  }, []);

  const f = useMemo(() => (k: string) => (aging?.formatted?.[k]) || (aging ? formatMoneyMinor(aging.buckets[k]) : '—'), [aging]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Terjatve</h1>
        <p className="text-sm text-muted">Stanje odprtih terjatev po starosti{aging?.asOf ? ` na ${aging.asOf}` : ''}.</p>
      </div>

      <Card className="p-5">
        {aging === undefined ? <Spinner className="text-brand" /> : !aging ? <p className="text-muted">Ni podatkov.</p> : (
          <>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
              {([['current', 'Nezapadlo'], ['d1_30', '1–30 dni'], ['d31_60', '31–60 dni'], ['d61_90', '61–90 dni'], ['d90_plus', 'nad 90 dni']] as [string, string][]).map(([k, l]) => {
                const alert = k === 'd90_plus' && aging.buckets.d90_plus !== '0';
                return (
                  <div key={k} className={`rounded-tool p-3 ${alert ? 'bg-stop/10' : 'bg-surface2'}`}>
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted2">{l}</p>
                    <p className={`num mt-1 text-sm font-bold ${alert ? 'text-stop' : 'text-ink'}`}>{f(k)}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <span className="font-bold text-ink">Skupaj odprto</span>
              <span className="num text-lg font-extrabold text-ink">{f('total')}</span>
            </div>
          </>
        )}
      </Card>

      <h2 className="text-base font-bold text-ink">Opozorila o terjatvah</h2>
      {insights === null ? <div className="flex justify-center py-8"><Spinner className="text-brand" /></div>
        : <InsightList insights={insights} empty="Ni opozoril o terjatvah. 👍" />}
    </div>
  );
}
