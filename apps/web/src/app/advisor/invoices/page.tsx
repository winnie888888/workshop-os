'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError } from '@/lib/api';
import { todayIso } from '@/lib/format';
import { Button, Card, ProblemBanner, Spinner } from '@/components/ui';

/*
 * Invoices & AR — the advisor's money-collection surface. It shows the
 * workshop's receivables aging from the real report endpoint, and lets the
 * advisor record a payment against a customer (oldest-due-first allocation is
 * done by the backend). Listing individual issued invoices would use an
 * invoices-list endpoint; until that exists, this screen focuses on the aging
 * picture and payment capture, both fully wired to real endpoints.
 */
export default function InvoicesAndAr() {
  const { data: aging, isLoading, mutate } = useSWR('advisor-aging', () => api.reports.arAging(todayIso()));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Invoices &amp; receivables</h1>

      {isLoading && <div className="flex justify-center py-16"><Spinner className="text-info" /></div>}

      {aging && (
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold">Aging as of {aging.asOf}</h2>
          <div className="grid grid-cols-5 gap-2 text-center">
            <Bucket label="Current" value={aging.formatted.current} />
            <Bucket label="1–30" value={aging.formatted.d1_30} />
            <Bucket label="31–60" value={aging.formatted.d31_60} />
            <Bucket label="61–90" value={aging.formatted.d61_90} />
            <Bucket label="90+" value={aging.formatted.d90_plus} alert={aging.buckets.d90_plus !== '0'} />
          </div>
          <div className="mt-4 flex justify-between border-t border-line pt-3">
            <span className="font-display font-bold">Total outstanding</span>
            <span className="font-mono text-lg font-bold">{aging.formatted.total}</span>
          </div>
        </Card>
      )}

      <RecordPayment onRecorded={() => mutate()} />
    </div>
  );
}

function Bucket({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-tool p-3 ${alert ? 'bg-stop/10' : 'bg-floor'}`}>
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">{label}</p>
      <p className={`mt-1 font-mono text-sm font-bold ${alert ? 'text-stop' : ''}`}>{value}</p>
    </div>
  );
}

function RecordPayment({ onRecorded }: { onRecorded: () => void }) {
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'bank' | 'cash' | 'card' | 'other'>('bank');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: customers } = useSWR('customers', () => api.customers.list().catch(() => []));

  async function record() {
    setError(null); setOk(false);
    const minor = Math.round(parseFloat(amount.replace(',', '.')) * 100);
    if (!customerId || !Number.isFinite(minor) || minor <= 0) { setError('Pick a customer and a valid amount.'); return; }
    setBusy(true);
    try {
      await api.invoices.recordPayment({
        customerId, amountMinor: minor, method, receivedAt: new Date().toISOString(),
        reference: reference || undefined,
      });
      setOk(true); setAmount(''); setReference('');
      onRecorded();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not record payment');
    } finally { setBusy(false); }
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h2 className="font-display text-lg font-bold">Record a payment</h2>
      <p className="text-sm text-steel">
        The backend allocates the amount oldest-due-first across the customer&apos;s open invoices,
        with any surplus held as unapplied credit.
      </p>
      {error && <ProblemBanner message={error} />}
      {ok && <ProblemBanner tone="go" message="Payment recorded and allocated." />}

      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-steel">Customer</span>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
          className="min-h-tap w-full rounded-tool border-2 border-line bg-panel px-3 text-tap focus:border-info focus:outline-none">
          <option value="">Select…</option>
          {((customers ?? []) as any[]).map((c) => <option key={c.id} value={c.id}>{c.name ?? c.id}</option>)}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-steel">Amount (€)</span>
          <input value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value)}
            className="min-h-tap w-full rounded-tool border-2 border-line bg-panel px-3 text-tap focus:border-info focus:outline-none" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-steel">Method</span>
          <select value={method} onChange={(e) => setMethod(e.target.value as any)}
            className="min-h-tap w-full rounded-tool border-2 border-line bg-panel px-3 text-tap focus:border-info focus:outline-none">
            <option value="bank">Bank transfer</option><option value="cash">Cash</option>
            <option value="card">Card</option><option value="other">Other</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-steel">Reference (optional)</span>
        <input value={reference} onChange={(e) => setReference(e.target.value)}
          className="min-h-tap w-full rounded-tool border-2 border-line bg-panel px-3 text-tap focus:border-info focus:outline-none" />
      </label>

      <div className="flex justify-end">
        <Button tone="go" size="lg" onClick={record} disabled={busy}>{busy ? <Spinner /> : 'Record payment'}</Button>
      </div>
    </Card>
  );
}
