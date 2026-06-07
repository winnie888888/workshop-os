'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Button, Card, ProblemBanner, Spinner } from '@/components/ui';

/*
 * New Job intake — the digital replacement for the paper Delovni nalog. It
 * captures the same fields the paper form did (customer, vehicle, complaint,
 * odometer, customer PO) and creates a real work order via POST /work-orders.
 * A client-generated id makes the create idempotent, so a double-submit or a
 * flaky connection cannot open two jobs for the same drop-off.
 *
 * Vehicles are loaded per-customer (the backend lists assets by customer), so
 * the vehicle dropdown only populates once a customer is chosen. The customer
 * can also be pre-selected via ?customerId= from the customer hub's "New job".
 */
function NewJobInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: customers } = useSWR('customers', () => api.customers.list().catch(() => []));

  const [customerId, setCustomerId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [complaint, setComplaint] = useState('');
  const [odometer, setOdometer] = useState('');
  const [customerPo, setCustomerPo] = useState('');
  const [clientId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Pre-select a customer if we arrived from their hub.
  useEffect(() => {
    const pre = searchParams.get('customerId');
    if (pre) setCustomerId(pre);
  }, [searchParams]);

  // Load THIS customer's vehicles once one is chosen (keyed by customerId so it
  // refetches on change). Empty until a customer is selected.
  const { data: vehicles } = useSWR(
    customerId ? ['intake-vehicles', customerId] : null,
    () => api.assets.list(customerId).catch(() => []),
  );

  async function create() {
    if (!customerId) { setError('Choose a customer first.'); return; }
    setBusy(true); setError(null);
    try {
      const wo = await api.workOrders.create({
        customerId,
        assetId: assetId || undefined,
        complaint: complaint || undefined,
        odometer: odometer ? parseInt(odometer, 10) : undefined,
        customerPo: customerPo || undefined,
        clientId,
      });
      router.push(`/advisor/work-orders/${wo.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the work order');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">New job</h1>
      {error && <ProblemBanner message={error} />}

      <Card className="flex flex-col gap-4 p-5">
        <Select label="Customer" value={customerId} onChange={(v) => { setCustomerId(v); setAssetId(''); }}
          options={[{ value: '', label: 'Select a customer…' },
            ...((customers ?? []) as any[]).map((c) => ({ value: c.id, label: c.name ?? c.id }))]} />

        {customerId && (
          <div>
            <Select label="Vehicle (optional)" value={assetId} onChange={setAssetId}
              options={[{ value: '', label: 'No vehicle / add later' },
                ...((vehicles ?? []) as any[]).map((a) => ({ value: a.id, label: `${a.plate ?? a.id} — ${[a.make, a.model].filter(Boolean).join(' ')}` }))]} />
            {vehicles && (vehicles as any[]).length === 0 && (
              <p className="mt-1 text-xs text-steel">
                This customer has no vehicles yet.{' '}
                <Link href={`/advisor/customers/${customerId}/vehicles/new`} className="font-semibold text-info">Add one →</Link>
              </p>
            )}
          </div>
        )}

        <Textarea label="Complaint (opis napake)" value={complaint} onChange={setComplaint}
          placeholder="What did the customer report?" />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Odometer (km)" value={odometer} onChange={setOdometer} numeric />
          <Input label="Customer PO (optional)" value={customerPo} onChange={setCustomerPo} />
        </div>

        <div className="flex justify-end gap-3">
          <Button tone="neutral" onClick={() => router.push('/advisor')}>Cancel</Button>
          <Button tone="info" size="lg" onClick={create} disabled={busy || !customerId}>
            {busy ? <Spinner /> : 'Open work order'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-steel">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="min-h-tap w-full rounded-tool border-2 border-line bg-panel px-3 text-tap focus:border-info focus:outline-none">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Input({ label, value, onChange, numeric }: {
  label: string; value: string; onChange: (v: string) => void; numeric?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-steel">{label}</span>
      <input value={value} inputMode={numeric ? 'numeric' : 'text'}
        onChange={(e) => onChange(numeric ? e.target.value.replace(/[^0-9]/g, '') : e.target.value)}
        className="min-h-tap w-full rounded-tool border-2 border-line bg-panel px-3 text-tap focus:border-info focus:outline-none" />
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-steel">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
        className="w-full rounded-tool border-2 border-line bg-panel p-3 text-base focus:border-info focus:outline-none" />
    </label>
  );
}

export default function NewJob() {
  return (
    <Suspense fallback={null}>
      <NewJobInner />
    </Suspense>
  );
}

