'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { displayPlate, statusLabel, statusTone } from '@/lib/format';
import { Card, SoftChip, Spinner } from '@/components/ui';

/*
 * Work Orders list — the advisor's full register, beyond the Today board. Lists
 * recent work orders across all open and closed states via the real list
 * endpoint, each linking to its workspace.
 */
export default function WorkOrdersList() {
  const { data, isLoading } = useSWR('all-work-orders', () => api.workOrders.list({ limit: 200 }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Work orders</h1>
        <Link href="/advisor/work-orders/new"
          className="tool-tap inline-flex items-center rounded-tool bg-info px-5 font-display font-bold text-white">
          + New job
        </Link>
      </div>

      {isLoading && <div className="flex justify-center py-16"><Spinner className="text-info" /></div>}

      {data && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-floor text-left text-xs uppercase tracking-wide text-steel">
              <tr><th className="p-3">WO#</th><th className="p-3">Vehicle</th><th className="p-3">Customer</th>
                <th className="p-3">Status</th></tr>
            </thead>
            <tbody>
              {data.map((w) => (
                <tr key={w.id} className="border-t border-line hover:bg-floor">
                  <td className="p-3 font-mono">
                    <Link href={`/advisor/work-orders/${w.id}`} className="font-bold text-info">{w.number ?? 'draft'}</Link>
                  </td>
                  <td className="p-3 font-mono">{w.plate ? displayPlate(w.plate) : '—'}</td>
                  <td className="p-3">{w.customerName ?? '—'}</td>
                  <td className="p-3"><SoftChip tone={statusTone(w.status)}>{statusLabel(w.status)}</SoftChip></td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-steel">No work orders yet.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
