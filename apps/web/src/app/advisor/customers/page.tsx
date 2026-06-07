'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { Card, Spinner } from '@/components/ui';

/*
 * Customers register — the on-ramp to the operational loop. Each row links to
 * the customer hub (vehicles, balance, new job); the header offers New customer.
 */
export default function CustomersList() {
  const { data, isLoading } = useSWR('customers-list', () => api.customers.list());
  const rows = (data as any[]) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Stranke</h1>
          {data && <p className="mt-0.5 text-sm text-muted"><span className="num">{rows.length}</span> strank</p>}
        </div>
        <Link href="/advisor/customers/new"
          className="inline-flex min-h-tap items-center gap-2 rounded-tool bg-brand px-5 font-bold text-white shadow-tool transition hover:bg-brand600 active:translate-y-px">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          Nova stranka
        </Link>
      </div>

      {isLoading && <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>}

      {data && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
              <tr>
                <th className="px-4 py-2.5 font-bold">Naziv</th>
                <th className="hidden px-4 py-2.5 font-bold sm:table-cell">DDV</th>
                <th className="hidden px-4 py-2.5 font-bold sm:table-cell">Država</th>
                <th className="px-4 py-2.5 font-bold">Plačilni rok</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-line transition hover:bg-floor">
                  <td className="px-4 py-3">
                    <Link href={`/advisor/customers/${c.id}`} className="font-semibold text-brand hover:underline">{c.name ?? '—'}</Link>
                  </td>
                  <td className="num hidden px-4 py-3 text-muted sm:table-cell">{c.vatId ?? c.vat_id ?? '—'}</td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">{c.country ?? c.countryCode ?? '—'}</td>
                  <td className="px-4 py-3 text-muted"><span className="num">{c.paymentTermsDays ?? c.payment_terms_days ?? '—'}</span> dni</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/advisor/customers/${c.id}`} className="text-sm font-semibold text-muted2 hover:text-brand">odpri →</Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">
                  Še ni strank. <Link href="/advisor/customers/new" className="font-semibold text-brand hover:underline">Dodaj prvo →</Link>
                </td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
