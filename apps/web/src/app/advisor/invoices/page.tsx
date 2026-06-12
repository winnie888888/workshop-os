'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError } from '@/lib/api';
import { formatMoneyMinor, todayIso } from '@/lib/format';
import Link from 'next/link';
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Računi & terjatve</h1>
        <Link href="/advisor/invoices/consolidated"
          className="inline-flex min-h-tap items-center rounded-tool border border-brand bg-surface px-4 text-sm font-bold text-brand transition hover:bg-brandweak">
          Zbirni račun
        </Link>
      </div>

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

      <InvoicesList />

      <RecordPayment onRecorded={() => mutate()} />
    </div>
  );
}

/* Tabela računov (QA B1): brez nje je podrobnost računa — e-SLOG, UPN QR,
   Minimax sled — iz vmesnika nedosegljiva. Imena strank pridejo iz istega
   SWR ključa 'customers' kot spodnji obrazec, zato ni dodatnega klica. */
const INV_STATUS: Record<string, { label: string; cls: string }> = {
  issued: { label: 'Izdan', cls: 'bg-surface2 text-ink' },
  sent: { label: 'Poslan', cls: 'bg-surface2 text-ink' },
  partly_paid: { label: 'Delno plačan', cls: 'bg-hold/15 text-hold' },
  paid: { label: 'Plačan', cls: 'bg-go/15 text-go' },
  overdue: { label: 'Zapadel', cls: 'bg-stop/15 text-stop' },
  credit_note: { label: 'Dobropis', cls: 'bg-surface2 text-muted' },
  cancelled: { label: 'Storniran', cls: 'bg-surface2 text-muted' },
};

function InvoicesList() {
  const { data: invoices, error } = useSWR('advisor-invoices', () => api.invoices.list());
  const { data: customers } = useSWR('customers', () => api.customers.list().catch(() => []));
  const nameOf = (id?: string) => ((customers ?? []) as any[]).find((c) => c.id === id)?.name ?? '—';

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-base font-bold text-ink">
          Računi {Array.isArray(invoices) && <span className="num text-muted2">({invoices.length})</span>}
        </h2>
      </div>
      {error && <div className="px-5 py-4"><ProblemBanner message="Računov ni bilo mogoče naložiti." /></div>}
      {!invoices && !error && <div className="flex justify-center py-10"><Spinner className="text-brand" /></div>}
      {Array.isArray(invoices) && invoices.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-muted">Še ni izdanih računov.</p>
      )}
      {Array.isArray(invoices) && invoices.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted2">
                <th className="px-5 py-2.5 font-bold">Številka</th>
                <th className="px-4 py-2.5 font-bold">Stranka</th>
                <th className="px-4 py-2.5 font-bold">Status</th>
                <th className="px-4 py-2.5 font-bold">Izdan</th>
                <th className="px-4 py-2.5 font-bold">Zapade</th>
                <th className="px-5 py-2.5 text-right font-bold">Znesek</th>
              </tr>
            </thead>
            <tbody>
              {(invoices as any[]).map((inv) => {
                const st = INV_STATUS[inv.status] ?? { label: inv.status, cls: 'bg-surface2 text-ink' };
                return (
                  <tr key={inv.id} className="border-b border-line/60 transition hover:bg-surface2/60">
                    <td className="px-5 py-3">
                      <Link href={`/advisor/invoices/${inv.id}`} className="num font-bold text-brand hover:underline">
                        {inv.number ?? inv.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink">{nameOf(inv.customerId)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="num px-4 py-3 text-muted">{inv.issueDate ?? '—'}</td>
                    <td className="num px-4 py-3 text-muted">{inv.dueDate ?? '—'}</td>
                    <td className="num px-5 py-3 text-right font-bold text-ink">{formatMoneyMinor(inv.totalGrossMinor)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
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
