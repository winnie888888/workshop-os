'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api, ApiError } from '@/lib/api';
import { Button, Card, ProblemBanner, Spinner } from '@/components/ui';
import { TextField, NumberField, SelectField, CheckboxField, TextAreaField, COUNTRY_OPTIONS } from '@/components/form';

/*
 * Edit Customer. Loads the current record, lets the advisor change the mutable
 * fields, and PATCHes only what is sent. The backend re-validates the merged
 * result against the same invariants `create` enforces and re-syncs Minimax, so
 * an edit is as safe as a create and the accounting system stays in step.
 */
export default function EditCustomer() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: customer } = useSWR(['customer', id], () => api.customers.get(id));

  const [form, setForm] = useState<any | null>(null);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Seed the form once the customer loads.
  useEffect(() => {
    if (customer && !form) {
      setForm({
        name: customer.name ?? '', type: customer.type ?? 'company', country: customer.country ?? 'SI',
        vatLiable: !!customer.vatLiable, vatId: customer.vatId ?? '', address: customer.address ?? '',
        postCode: customer.postCode ?? '', city: customer.city ?? '',
        paymentTermsDays: String(customer.paymentTermsDays ?? 30),
        currency: customer.currency ?? 'EUR', discountPct: customer.discountPct ?? '',
      });
    }
  }, [customer, form]);

  if (!customer || !form) return <div className="flex justify-center py-16"><Spinner className="text-info" /></div>;

  const needsVatId = form.vatLiable && form.type === 'company';
  const canSave = form.name.trim().length > 0 && (!needsVatId || form.vatId.trim().length > 0);

  async function save() {
    setBusy(true); setError(null);
    try {
      await api.customers.update(id, {
        name: form.name.trim(), type: form.type, country: form.country,
        vatLiable: form.vatLiable, vatId: form.vatId.trim() || undefined,
        address: form.address.trim() || undefined, postCode: form.postCode.trim() || undefined,
        city: form.city.trim() || undefined, paymentTermsDays: parseInt(form.paymentTermsDays, 10) || 30,
        currency: form.currency, discountPct: form.discountPct.trim() || undefined,
      });
      router.push(`/advisor/customers/${id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sprememb ni bilo mogoče shraniti');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <button onClick={() => router.push(`/advisor/customers/${id}`)} className="self-start text-sm font-semibold text-steel">‹ {customer.name}</button>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Uredi stranko</h1>
      {error && <ProblemBanner message={error} />}

      <Card className="flex flex-col gap-4 p-5">
        <TextField label="Naziv" value={form.name} onChange={(v) => set('name', v)} required />
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Tip" value={form.type} onChange={(v) => set('type', v)}
            options={[{ value: 'company', label: 'Podjetje' }, { value: 'individual', label: 'Fizična oseba' }]} />
          <SelectField label="Država" value={form.country} onChange={(v) => set('country', v)} options={COUNTRY_OPTIONS} required />
        </div>
        <CheckboxField label="Zavezanec za DDV" checked={form.vatLiable} onChange={(v) => set('vatLiable', v)}
          hint="Določa, ali čezmejni računi uporabijo obrnjeno davčno obveznost." />
        {form.vatLiable && (
          <TextField label="ID za DDV" value={form.vatId} onChange={(v) => set('vatId', v)} mono uppercase required={needsVatId} />
        )}
        <TextAreaField label="Naslov" value={form.address} onChange={(v) => set('address', v)} rows={2} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Poštna št." value={form.postCode} onChange={(v) => set('postCode', v)} />
          <TextField label="Kraj" value={form.city} onChange={(v) => set('city', v)} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <NumberField label="Plačilni rok (dni)" value={form.paymentTermsDays} onChange={(v) => set('paymentTermsDays', v)} />
          <SelectField label="Valuta" value={form.currency} onChange={(v) => set('currency', v)}
            options={[{ value: 'EUR', label: 'EUR' }]} />
          <NumberField label="Popust %" value={form.discountPct} onChange={(v) => set('discountPct', v)} />
        </div>
        <div className="flex justify-end gap-3">
          <Button tone="neutral" onClick={() => router.push(`/advisor/customers/${id}`)}>Prekliči</Button>
          <Button tone="info" size="lg" onClick={save} disabled={busy || !canSave}>{busy ? <Spinner /> : 'Shrani spremembe'}</Button>
        </div>
      </Card>
    </div>
  );
}
