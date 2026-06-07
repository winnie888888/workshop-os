'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, Spinner, ProblemBanner } from '@/components/ui';

/*
 * Owner AI insights — the AI Workshop Manager's dashboard.
 *
 * The presentation is designed to make the advisory boundary obvious and the
 * findings trustworthy. It leads with a plain headline so the owner grasps the
 * situation at a glance, then lists findings grouped by severity (alerts first),
 * each showing its explanation, the NUMBERS behind it (so it is auditable), and
 * an advisory recommendation — phrased as something to consider, never as
 * something the system has done. Everything here is read-only; the screen calls
 * only GET endpoints, because the manager only ever analyses and recommends.
 */

type Period = 'daily' | 'weekly' | 'dashboard';

const SEVERITY_STYLE: Record<string, { ring: string; chip: string; label: string }> = {
  alert: { ring: 'border-l-4 border-stop', chip: 'bg-stop/10 text-stop', label: 'Kritično' },
  warn: { ring: 'border-l-4 border-hold', chip: 'bg-hold/10 text-hold', label: 'Opozorilo' },
  info: { ring: 'border-l-4 border-info', chip: 'bg-info/10 text-info', label: 'Info' },
};

const CATEGORY_LABEL: Record<string, string> = {
  profitability: 'Dobičkonosnost', productivity: 'Produktivnost', inventory: 'Zaloga',
  attendance: 'Prisotnost', receivables: 'Terjatve', invoice: 'Računi', summary: 'Povzetek',
};

export default function OwnerInsightsPage() {
  const [period, setPeriod] = useState<Period>('dashboard');
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true); setError(null);
    const call = period === 'daily' ? api.manager.daily()
      : period === 'weekly' ? api.manager.weekly() : api.manager.dashboard(30);
    call.then((d) => { if (live) { setData(d); setLoading(false); } })
      .catch((e) => { if (live) { setError(e instanceof Error ? e.message : 'Vpogledov ni bilo mogoče naložiti'); setLoading(false); } });
    return () => { live = false; };
  }, [period]);

  const insights: any[] = data?.insights ?? [];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold">Vpogledi delavnice</h1>
        <p className="text-sm text-muted">AI-podprta analiza vaših podatkov. Vsaka številka izvira iz vaših zapisov,
          vsako priporočilo potrdite sami. Nič se ne spremeni samodejno.</p>
      </div>

      {/* Period switch */}
      <div className="flex gap-2">
        {(['daily', 'weekly', 'dashboard'] as Period[]).map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`tool-tap flex-1 rounded-tool border-2 px-3 py-2 font-bold ${period === p ? 'border-info bg-info/10 text-info' : 'border-line'}`}>
            {p === 'daily' ? 'Danes' : p === 'weekly' ? 'Ta teden' : '30 dni'}
          </button>
        ))}
      </div>

      {error && <ProblemBanner message={error} />}
      {loading && <Card className="flex items-center justify-center p-10"><Spinner /></Card>}

      {!loading && data && (
        <>
          {/* Headline / narrative */}
          <Card className="p-4">
            <div className="text-[0.65rem] font-bold uppercase tracking-wide text-muted">{data.periodLabel}</div>
            <p className="mt-1 text-lg font-bold leading-snug">{data.summary?.narrative ?? data.summary?.headline}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {Object.entries(data.summary?.bySeverity ?? {}).map(([sev, n]) => (
                <span key={sev} className={`rounded px-2 py-0.5 font-bold ${SEVERITY_STYLE[sev]?.chip ?? ''}`}>
                  {String(n)} {SEVERITY_STYLE[sev]?.label ?? sev}
                </span>
              ))}
            </div>
          </Card>

          {/* Findings, already prioritised by the backend (alerts first, by money) */}
          {insights.length === 0 ? (
            <Card className="p-6 text-center text-muted">
              <div className="text-3xl">✓</div>
              <p className="mt-1 font-semibold">Trenutno nič ne potrebuje vaše pozornosti.</p>
            </Card>
          ) : (
            insights.map((ins) => <InsightCard key={ins.key} insight={ins} />)
          )}

          <p className="px-1 text-center text-xs text-muted">
            Samo svetovalno — AI analizira in priporoča. Vi odločite, kaj ukreniti.
          </p>
        </>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: any }) {
  const style = SEVERITY_STYLE[insight.severity] ?? SEVERITY_STYLE.info;
  return (
    <Card className={`flex flex-col gap-2 p-4 ${style.ring}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="font-bold leading-snug">{insight.title}</div>
        <span className={`shrink-0 rounded px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide ${style.chip}`}>
          {style.label}
        </span>
      </div>
      <p className="text-sm text-muted">{insight.detail}</p>
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] font-bold uppercase tracking-wide text-muted">
          {CATEGORY_LABEL[insight.category] ?? insight.category}
        </span>
      </div>
      {insight.recommendation && (
        <div className="rounded-tool bg-surface2 p-2 text-sm">
          <span className="font-semibold">Predlog: </span>{insight.recommendation}
        </div>
      )}
    </Card>
  );
}
