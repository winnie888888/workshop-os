'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api, ApiError } from '@/lib/api';
import { Button, Card, ProblemBanner, Spinner } from '@/components/ui';
import { TextField, NumberField, SelectField, COUNTRY_OPTIONS } from '@/components/form';

/*
 * Create Vehicle, scoped to a customer (the customer id comes from the route, so
 * a vehicle is always born owned by someone — there is no orphaned-vehicle path).
 * The plate and its country of registration are the identity a workshop actually
 * uses; the VIN is validated structurally if given. This is the second link of
 * the loop: the thing the work will be done on.
 */
export default function CreateVehicle() {
  const { id: customerId } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: customer } = useSWR(['customer', customerId], () => api.customers.get(customerId));

  const [form, setForm] = useState({
    type: 'truck', plate: '', countryOfPlate: 'SI', vin: '', make: '', model: '', year: '', odometerLast: '',
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSave = form.plate.trim().length > 0;

  async function save() {
    setBusy(true); setError(null);
    try {
      await api.assets.create({
        customerId,
        type: form.type,
        plate: form.plate.trim(),
        countryOfPlate: form.countryOfPlate,
        vin: form.vin.trim() || undefined,
        make: form.make.trim() || undefined,
        model: form.model.trim() || undefined,
        year: form.year ? parseInt(form.year, 10) : undefined,
        odometerLast: form.odometerLast ? parseInt(form.odometerLast, 10) : undefined,
      });
      router.push(`/advisor/customers/${customerId}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Vozila ni bilo mogoče ustvariti');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <button onClick={() => router.push(`/advisor/customers/${customerId}`)} className="self-start text-sm font-semibold text-steel">
        ‹ {customer?.name ?? 'Customer'}
      </button>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Novo vozilo</h1>
      {error && <ProblemBanner message={error} />}

      <Card className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Tip" value={form.type} onChange={(v) => set('type', v)}
            options={[
              { value: 'truck', label: 'Tovornjak' }, { value: 'tractor', label: 'Vlačilec' },
              { value: 'trailer', label: 'Priklopnik' }, { value: 'van', label: 'Kombi' }, { value: 'other', label: 'Drugo' },
            ]} />
          <SelectField label="Država tablice" value={form.countryOfPlate} onChange={(v) => set('countryOfPlate', v)} options={COUNTRY_OPTIONS} required />
        </div>

        <TextField label="Registrska tablica" value={form.plate} onChange={(v) => set('plate', v)} required mono uppercase placeholder="npr. NM CK-412" />

        <TextField label="VIN" value={form.vin} onChange={(v) => set('vin', v)} mono uppercase
          hint="17 characters; validated if provided." />

        <div className="grid grid-cols-2 gap-4">
          <TextField label="Znamka" value={form.make} onChange={(v) => set('make', v)} placeholder="npr. MAN" />
          <TextField label="Model" value={form.model} onChange={(v) => set('model', v)} placeholder="npr. TGX 18.500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Letnik" value={form.year} onChange={(v) => set('year', v)} />
          <NumberField label="Števec (km)" value={form.odometerLast} onChange={(v) => set('odometerLast', v)} />
        </div>

        <div className="flex justify-end gap-3">
          <Button tone="neutral" onClick={() => router.push(`/advisor/customers/${customerId}`)}>Prekliči</Button>
          <Button tone="info" size="lg" onClick={save} disabled={busy || !canSave}>{busy ? <Spinner /> : 'Ustvari vozilo'}</Button>
        </div>
      </Card>
    </div>
  );
}
