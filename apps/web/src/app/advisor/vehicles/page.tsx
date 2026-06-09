'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { displayPlate } from '@/lib/format';
import { Card, SoftChip, Spinner } from '@/components/ui';
import { SelectField } from '@/components/form';

/*
 * Vehicles browser. Vehicles belong to a customer, so this page is
 * customer-scoped: pick a customer, see their fleet. Each vehicle links to its
 * edit screen; the customer's hub is one click away for adding a new one.
 */
export default function VehiclesBrowser() {
  const { data: customers } = useSWR('customers', () => api.customers.list().catch(() => []));
  const [customerId, setCustomerId] = useState('');
  const { data: vehicles } = useSWR(
    customerId ? ['vehicles-browser', customerId] : null,
    () => api.assets.list(customerId).catch(() => []),
  );

  const options = [{ value: '', label: 'Izberi stranko za prikaz vozil…' },
    ...((customers ?? []) as any[]).map((c) => ({ value: c.id, label: c.name ?? c.id }))];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Vozila</h1>

      <Card className="p-4">
        <SelectField label="Stranka" value={customerId} onChange={setCustomerId} options={options} />
      </Card>

      {customerId && (
        <Card className="overflow-x-auto">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-base font-bold text-ink">Vozni park</h2>
            <Link href={`/advisor/customers/${customerId}/vehicles/new`} className="text-sm font-bold text-brand hover:underline">+ Dodaj vozilo</Link>
          </div>
          {!vehicles ? (
            <div className="flex justify-center p-8"><Spinner className="text-brand" /></div>
          ) : (vehicles as any[]).length === 0 ? (
            <p className="p-8 text-center text-muted">Ta stranka še nima vozil.</p>
          ) : (
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Tablica</th>
                  <th className="px-4 py-2.5 font-bold">Znamka / model</th>
                  <th className="hidden px-4 py-2.5 font-bold sm:table-cell">VIN</th>
                  <th className="px-4 py-2.5 font-bold">Tip</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {(vehicles as any[]).map((v) => (
                  <tr key={v.id} className="border-t border-line transition hover:bg-floor">
                    <td className="num px-4 py-3 font-bold text-ink">{v.plate ? displayPlate(v.plate) : '—'}</td>
                    <td className="px-4 py-3 text-ink">{[v.make, v.model].filter(Boolean).join(' ') || '—'}</td>
                    <td className="num hidden px-4 py-3 text-xs text-muted sm:table-cell">{v.vin ?? '—'}</td>
                    <td className="px-4 py-3"><SoftChip tone="neutral">{v.type ?? '—'}</SoftChip></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/advisor/vehicles/${v.id}/edit`} className="text-sm font-semibold text-muted2 hover:text-brand">uredi</Link>
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
