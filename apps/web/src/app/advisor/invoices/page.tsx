'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError } from '@/lib/api';
import { formatMoneyMinor, todayIso } from '@/lib/format';
import { Button, Card, ProblemBanner, Spinner } from '@/components/ui';
import { SelectField, TextField } from '@/components/form';

/*
 * Invoices & receivables — the advisor's money surface. Shows the workshop's
 * receivables aging from the real report endpoint and records a payment against
 * a customer (oldest-due-first allocation handled by the backend).
 */
export default function InvoicesAndAr() {
  const { data: aging, isLoading, mutate } = useSWR('advisor-aging', () => api.reports.arAging(todayIso()).catch(() => null));
  const f = (key: 'current' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90_plus' | 'total') =>
    (aging?.formatted?.[key]) || (aging ? formatMoneyMinor(aging.buckets[key]) : '—');

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Računi & terjatve</h1>

      {isLoading && <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>}

      {aging && (
        <Card className="p-5">
          <h2 className="num mb-4 text-base font-bold text-ink">Stanje terjatev na {aging.asOf}</h2>
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
            <Bucket label="Nezapadlo" value={f('current')} />
            <Bucket label="1–30 dni" value={f('d1_30')} />
            <Bucket label="31–60 dni" value={f('d31_60')} />
            <Bucket label="61–90 dni" value={f('d61_90')} />
            <Bucket label="nad 90 dni" value={f('d90_plus')} alert={aging.buckets.d90_plus !== '0'} />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <span className="font-bold text-ink">Skupaj odprto</span>
            <span className="num text-lg font-extrabold text-ink">{f('total')}</span>
          </div>
        </Card>
      )}

      <RecordPayment onRecorded={() => mutate()} />
    </div>
  );
}

function Bucket({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-tool p-3 ${alert ? 'bg-stop/10' : 'bg-surface2'}`}>
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted2">{label}</p>
      <p className={`num mt-1 text-sm font-bold ${alert ? 'text-stop' : 'text-ink'}`}>{value}</p>
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
  const customerOptions = [{ value: '', label: 'Izberi…' },
    ...((customers ?? []) as any[]).map((c) => ({ value: c.id, label: c.name ?? c.id }))];

  async function record() {
    setError(null); setOk(false);
    const minor = Math.round(parseFloat(amount.replace(',', '.')) * 100);
    if (!customerId || !Number.isFinite(minor) || minor <= 0) { setError('Izberi stranko in veljaven znesek.'); return; }
    setBusy(true);
    try {
      await api.invoices.recordPayment({
        customerId, amountMinor: minor, method, receivedAt: new Date().toISOString(),
        reference: reference || undefined,
      });
      setOk(true); setAmount(''); setReference('');
      onRecorded();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Plačila ni bilo mogoče zabeležiti');
    } finally { setBusy(false); }
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-base font-bold text-ink">Zabeleži plačilo</h2>
        <p className="mt-1 text-sm text-muted">
          Zaledje znesek razporedi po najstarejših odprtih računih stranke; morebitni presežek ostane kot dobroimetje.
        </p>
      </div>
      {error && <ProblemBanner message={error} />}
      {ok && <ProblemBanner tone="go" message="Plačilo zabeleženo in razporejeno." />}

      <SelectField label="Stranka" value={customerId} onChange={setCustomerId} options={customerOptions} />

      <div className="grid grid-cols-2 gap-4">
        <TextField label="Znesek (€)" value={amount} onChange={setAmount} mono />
        <SelectField label="Način" value={method} onChange={(v) => setMethod(v as any)}
          options={[{ value: 'bank', label: 'Bančno nakazilo' }, { value: 'cash', label: 'Gotovina' }, { value: 'card', label: 'Kartica' }, { value: 'other', label: 'Drugo' }]} />
      </div>

      <TextField label="Sklic (neobvezno)" value={reference} onChange={setReference} />

      <div className="flex justify-end">
        <Button tone="go" size="lg" onClick={record} disabled={busy}>{busy ? <Spinner /> : 'Zabeleži plačilo'}</Button>
      </div>
    </Card>
  );
}
