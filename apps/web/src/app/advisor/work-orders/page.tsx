'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { displayPlate, formatMoneyMinor, statusLabel, statusTone } from '@/lib/format';
import { Card, SoftChip, Spinner } from '@/components/ui';

/*
 * Work Orders register — the advisor's full list beyond the dashboard. Premium
 * table styling matched to the dashboard: quiet header, tabular figures, soft
 * status pills, every row links to its workspace.
 */
export default function WorkOrdersList() {
  const { data, isLoading } = useSWR('all-work-orders', () => api.workOrders.list({ limit: 200 }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Delovni nalogi</h1>
          {data && <p className="mt-0.5 text-sm text-muted"><span className="num">{data.length}</span> nalogov</p>}
        </div>
        <Link href="/advisor/work-orders/new"
          className="inline-flex min-h-tap items-center gap-2 rounded-tool bg-brand px-5 font-bold text-white shadow-tool transition hover:bg-brand600 active:translate-y-px">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          Nov nalog
        </Link>
      </div>

      {isLoading && <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>}

      {data && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
              <tr>
                <th className="px-4 py-2.5 font-bold">Št. naloga</th>
                <th className="px-4 py-2.5 font-bold">Vozilo</th>
                <th className="hidden px-4 py-2.5 font-bold sm:table-cell">Stranka</th>
                <th className="px-4 py-2.5 font-bold">Status</th>
                <th className="px-4 py-2.5 text-right font-bold">Znesek</th>
              </tr>
            </thead>
            <tbody>
              {data.map((w) => (
                <tr key={w.id} className="border-t border-line transition hover:bg-floor">
                  <td className="px-4 py-3">
                    <Link href={`/advisor/work-orders/${w.id}`} className="num font-semibold text-brand hover:underline">{w.number ?? 'osnutek'}</Link>
                  </td>
                  <td className="num px-4 py-3 text-ink">{w.plate ? displayPlate(w.plate) : '—'}</td>
                  <td className="hidden truncate px-4 py-3 text-muted sm:table-cell">{w.customerName ?? '—'}</td>
                  <td className="px-4 py-3"><SoftChip tone={statusTone(w.status)}>{statusLabel(w.status)}</SoftChip></td>
                  <td className="num px-4 py-3 text-right font-semibold text-ink">{formatMoneyMinor(w.totalGrossMinor, w.currency)}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Še ni delovnih nalogov.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
