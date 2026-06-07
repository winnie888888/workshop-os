'use client';

import { Card, SoftChip } from './ui';

/* Reusable list of AI manager insights (used across owner sub-pages). */
export function InsightList({ insights, empty = 'Ni ugotovitev v tej kategoriji.' }: { insights: any[]; empty?: string }) {
  if (!insights || insights.length === 0) {
    return <Card className="p-8 text-center text-muted">{empty}</Card>;
  }
  return (
    <div className="flex flex-col gap-3">
      {insights.map((ins, i) => (
        <Card key={ins.key ?? i}
          className={`flex flex-col gap-2 p-4 ${ins.severity === 'alert' ? 'border-l-4 border-stop' : ins.severity === 'warn' ? 'border-l-4 border-hold' : 'border-l-4 border-brand'}`}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold leading-snug text-ink">{ins.title}</h3>
            <SoftChip tone={ins.severity === 'alert' ? 'stop' : ins.severity === 'warn' ? 'hold' : 'info'}>
              {ins.severity === 'alert' ? 'kritično' : ins.severity === 'warn' ? 'opozorilo' : 'info'}
            </SoftChip>
          </div>
          <p className="text-sm text-muted">{ins.detail}</p>
          {typeof ins.metric?.utilisation === 'number' && (
            <div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(ins.metric.utilisation * 100)}%` }} />
              </div>
              <p className="num mt-1 text-xs text-muted2">Izkoriščenost {Math.round(ins.metric.utilisation * 100)}%</p>
            </div>
          )}
          {ins.recommendation && (
            <div className="rounded-tool bg-surface2 p-2 text-sm text-ink"><span className="font-semibold">Predlog: </span>{ins.recommendation}</div>
          )}
        </Card>
      ))}
    </div>
  );
}
