'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, Spinner } from '@/components/ui';
import { InsightList } from '@/components/insight-list';

export default function ProductivityPage() {
  const [insights, setInsights] = useState<any[] | null>(null);
  const [summary, setSummary] = useState<any | null>(null);

  useEffect(() => {
    api.manager.dashboard(30).then((d) => {
      setSummary(d?.summary ?? null);
      setInsights((d?.insights ?? []).filter((i: any) => i.category === 'productivity'));
    }).catch(() => { setInsights([]); });
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Produktivnost</h1>
        <p className="text-sm text-muted">Izkoriščenost mehanikov in priložnosti za boljše načrtovanje.</p>
      </div>

      {summary?.narrative && (
        <Card className="p-4"><p className="text-sm text-ink">{summary.narrative}</p></Card>
      )}

      <h2 className="text-base font-bold text-ink">Ugotovitve o produktivnosti</h2>
      {insights === null ? <div className="flex justify-center py-8"><Spinner className="text-brand" /></div>
        : <InsightList insights={insights} empty="Ni opozoril o produktivnosti. 👍" />}
    </div>
  );
}
