'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { displayPlate } from '@/lib/format';
import { Card, SoftChip, Spinner } from '@/components/ui';

/*
 * Vehicles browser. The backend lists vehicles per customer (a vehicle always
 * belongs to one), so this page is customer-scoped: pick a customer, see their
 * fleet. Each vehicle links to its edit screen, and the customer's hub is one
 * click away for adding a new one.
 */
export default function VehiclesBrowser() {
  const { data: customers } = useSWR('customers', () => api.customers.list().catch(() => []));
  const [customerId, setCustomerId] = useState('');
  const { data: vehicles } = useSWR(
    customerId ? ['vehicles-browser', customerId] : null,
    () => api.assets.list(customerId).catch(() => []),
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Vehicles</h1>

      <Card className="p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-steel">Customer</span>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
            className="min-h-tap w-full rounded-tool border-2 border-line bg-panel px-3 text-tap focus:border-info focus:outline-none">
            <option value="">Select a customer to see their vehicles…</option>
            {((customers ?? []) as any[]).map((c) => <option key={c.id} value={c.id}>{c.name ?? c.id}</option>)}
          </select>
        </label>
      </Card>

      {customerId && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-4">
            <h2 className="font-display text-lg font-bold">Fleet</h2>
            <Link href={`/advisor/customers/${customerId}/vehicles/new`} className="text-sm font-semibold text-info">+ Add vehicle</Link>
          </div>
          {!vehicles ? (
            <div className="flex justify-center p-6"><Spinner className="text-info" /></div>
          ) : (vehicles as any[]).length === 0 ? (
            <p className="p-6 text-center text-steel">No vehicles for this customer yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-floor text-left text-xs uppercase tracking-wide text-steel">
                <tr><th className="p-3">Plate</th><th className="p-3">Make / model</th><th className="p-3">VIN</th>
                  <th className="p-3">Type</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {(vehicles as any[]).map((v) => (
                  <tr key={v.id} className="border-t border-line hover:bg-floor">
                    <td className="p-3 font-mono font-bold">{v.plate ? displayPlate(v.plate) : '—'}</td>
                    <td className="p-3">{[v.make, v.model].filter(Boolean).join(' ') || '—'}</td>
                    <td className="p-3 font-mono text-xs">{v.vin ?? '—'}</td>
                    <td className="p-3"><SoftChip tone="neutral">{v.type ?? '—'}</SoftChip></td>
                    <td className="p-3 text-right">
                      <Link href={`/advisor/vehicles/${v.id}/edit`} className="text-sm font-semibold text-info">edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
