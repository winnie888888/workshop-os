'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { displayPlate, formatMoneyMinor } from '@/lib/format';
import { Button, Card, SoftChip, Spinner } from '@/components/ui';

/*
 * The customer hub. This is the screen that ties the customer to everything
 * connected to them — their vehicles, their outstanding balance, and the
 * actions that start real work (add a vehicle, open a job). It is the natural
 * home base an advisor returns to, and it resolves the readiness-review gap
 * that vehicles were only ever listed per customer with nowhere to see them.
 */
export default function CustomerHub() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: customer, mutate: refreshCustomer } = useSWR(['customer', id], () => api.customers.get(id));
  const { data: vehicles } = useSWR(['cust-vehicles', id], () => api.assets.list(id).catch(() => []));
  const { data: ar } = useSWR(['cust-ar', id], () => api.customerReceivables(id).catch(() => null));

  if (!customer) return <div className="flex justify-center py-16"><Spinner className="text-info" /></div>;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <button onClick={() => router.push('/advisor/customers')} className="self-start text-sm font-semibold text-steel">‹ Customers</button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">{customer.name}</h1>
          <p className="text-sm text-steel">
            {customer.country}{customer.vatId ? ` · VAT ${customer.vatId}` : ''}
            {customer.paymentTermsDays != null ? ` · ${customer.paymentTermsDays}-day terms` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/advisor/customers/${id}/edit`}><Button tone="neutral">Edit</Button></Link>
          <Link href={`/advisor/work-orders/new?customerId=${id}`}><Button tone="info">+ New job</Button></Link>
        </div>
      </div>

      {customer.vatLiable && customer.vatId && (
        <VatStatusCard customer={customer} onChanged={() => refreshCustomer()} />
      )}

      {ar && ar.buckets.total !== '0' && (
        <Card className={`p-4 ${ar.buckets.d61_90 !== '0' || ar.buckets.d90_plus !== '0' ? 'border-stop/40 bg-stop/5' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="font-display font-bold">Outstanding balance</span>
            <span className="font-mono text-lg font-bold">{ar.formatted.total}</span>
          </div>
          {(ar.buckets.d61_90 !== '0' || ar.buckets.d90_plus !== '0') && (
            <p className="mt-1 text-sm font-semibold text-stop">
              {ar.formatted.d90_plus} is 90+ days overdue — review credit before adding work.
            </p>
          )}
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="font-display text-lg font-bold">Vehicles</h2>
          <Link href={`/advisor/customers/${id}/vehicles/new`}>
            <Button tone="info">+ Add vehicle</Button>
          </Link>
        </div>
        {!vehicles ? (
          <div className="flex justify-center p-6"><Spinner className="text-info" /></div>
        ) : vehicles.length === 0 ? (
          <p className="p-6 text-center text-steel">No vehicles yet. Add the first one to open a job for it.</p>
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
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * VAT status & validation (Phase 4C). For a VAT-liable customer with a VAT id,
 * this card shows whether the id is validated — and lets the advisor validate
 * it. Validation is what unlocks reverse charge for cross-border EU invoices,
 * so the card explains that consequence plainly. Two paths: a VIES check (when
 * the deployment has it wired) and an audited manual confirmation that requires
 * a note describing what was verified.
 * -------------------------------------------------------------------------- */
function VatStatusCard({ customer, onChanged }: { customer: any; onChanged: () => void }) {
  const [mode, setMode] = useState<null | 'manual'>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const validated = customer.vatIdValidated === true;
  const source = customer.vatIdValidationSource as 'vies' | 'manual' | null;

  async function run(m: 'vies' | 'manual') {
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await api.customers.validateVat(customer.id, { mode: m, note: m === 'manual' ? note.trim() : undefined });
      if (r.validated) {
        setResult(`Validated via ${r.source}${r.viesName ? ` — ${r.viesName}` : ''}.`);
        setMode(null); setNote('');
        onChanged();
      } else {
        setError(r.reason || 'Validation did not confirm the VAT id.');
      }
    } catch (e: any) {
      setError(e?.message || 'Validation failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={`p-4 ${validated ? 'border-go/40 bg-go/5' : 'border-hold/40 bg-hold/5'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-steel">VAT ID status</h3>
          <p className="mt-1 flex items-center gap-2 font-display text-lg font-bold">
            <span className="font-mono">{customer.vatId}</span>
            {validated
              ? <SoftChip tone="go">validated{source ? ` · ${source}` : ''}</SoftChip>
              : <SoftChip tone="hold">not validated</SoftChip>}
          </p>
          {!validated && (
            <p className="mt-1 text-sm text-steel">
              Cross-border EU invoices can only be reverse-charged once this VAT ID is validated.
              Until then, issuing is blocked for an EU business customer in another country.
            </p>
          )}
        </div>
        {!validated && mode === null && (
          <div className="flex flex-col gap-2">
            <Button tone="go" onClick={() => run('vies')} disabled={busy}>Check via VIES</Button>
            <Button tone="neutral" onClick={() => { setMode('manual'); setError(null); }} disabled={busy}>Confirm manually</Button>
          </div>
        )}
      </div>

      {error && <p className="mt-3 rounded-tool bg-stop/10 px-3 py-2 text-sm font-semibold text-stop">{error}</p>}
      {result && <p className="mt-3 rounded-tool bg-go/10 px-3 py-2 text-sm font-semibold text-go">{result}</p>}

      {mode === 'manual' && (
        <div className="mt-4 rounded-tool border-2 border-line bg-panel p-3">
          <p className="mb-2 text-sm font-semibold">Manual confirmation</p>
          <p className="mb-2 text-xs text-steel">
            Attest what you verified (e.g. checked the VIES portal, customer VAT certificate on file).
            This is recorded against your name in the audit log.
          </p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            placeholder="e.g. VIES portal checked 2026-06-07; certificate on file"
            className="w-full rounded-tool border-2 border-line bg-floor p-2 text-sm focus:border-info focus:outline-none" />
          <div className="mt-2 flex justify-end gap-2">
            <Button tone="neutral" onClick={() => { setMode(null); setNote(''); }}>Cancel</Button>
            <Button tone="go" onClick={() => run('manual')} disabled={busy || note.trim().length < 3}>
              {busy ? <Spinner /> : 'Confirm & record'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
