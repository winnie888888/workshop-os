'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { Button, Card, Spinner } from '@/components/ui';

/*
 * Customers register — the on-ramp to the operational loop. Each row links to
 * the customer hub (vehicles, balance, new job); the header offers New customer.
 * This is where an advisor starts when a hauler they don't yet have arrives.
 */
export default function CustomersList() {
  const { data, isLoading } = useSWR('customers-list', () => api.customers.list());

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Customers</h1>
        <Link href="/advisor/customers/new">
          <Button tone="info">+ New customer</Button>
        </Link>
      </div>

      {isLoading && <div className="flex justify-center py-16"><Spinner className="text-info" /></div>}

      {data && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-floor text-left text-xs uppercase tracking-wide text-steel">
              <tr><th className="p-3">Name</th><th className="p-3">VAT id</th><th className="p-3">Country</th>
                <th className="p-3">Terms</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {(data as any[]).map((c) => (
                <tr key={c.id} className="border-t border-line hover:bg-floor">
                  <td className="p-3">
                    <Link href={`/advisor/customers/${c.id}`} className="font-semibold text-info">{c.name ?? '—'}</Link>
                  </td>
                  <td className="p-3 font-mono">{c.vatId ?? c.vat_id ?? '—'}</td>
                  <td className="p-3">{c.country ?? c.countryCode ?? '—'}</td>
                  <td className="p-3">{c.paymentTermsDays ?? c.payment_terms_days ?? '—'} days</td>
                  <td className="p-3 text-right">
                    <Link href={`/advisor/customers/${c.id}`} className="text-sm font-semibold text-steel">open →</Link>
                  </td>
                </tr>
              ))}
              {(data as any[]).length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-steel">
                  No customers yet. <Link href="/advisor/customers/new" className="font-semibold text-info">Add the first one →</Link>
                </td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
