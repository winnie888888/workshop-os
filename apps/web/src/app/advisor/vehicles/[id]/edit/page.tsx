'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api, ApiError } from '@/lib/api';
import { Button, Card, ProblemBanner, Spinner } from '@/components/ui';
import { TextField, NumberField, SelectField, COUNTRY_OPTIONS } from '@/components/form';

/*
 * Edit Vehicle. Loads the vehicle, lets the advisor correct its descriptive
 * fields, and PATCHes the change. Ownership is intentionally not editable here —
 * the backend's update path does not touch customer_id — so this screen cannot
 * accidentally re-home a truck to the wrong hauler.
 */
export default function EditVehicle() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: vehicle } = useSWR(['vehicle', id], () => api.assets.get(id));

  const [form, setForm] = useState<any | null>(null);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (vehicle && !form) {
      setForm({
        type: vehicle.type ?? 'truck', plate: vehicle.plate ?? '', countryOfPlate: vehicle.countryOfPlate ?? vehicle.country_of_plate ?? 'SI',
        vin: vehicle.vin ?? '', make: vehicle.make ?? '', model: vehicle.model ?? '',
        year: vehicle.year ? String(vehicle.year) : '', odometerLast: vehicle.odometerLast ? String(vehicle.odometerLast) : '',
      });
    }
  }, [vehicle, form]);

  if (!vehicle || !form) return <div className="flex justify-center py-16"><Spinner className="text-info" /></div>;

  const ownerId = vehicle.customerId ?? vehicle.customer_id;
  const canSave = form.plate.trim().length > 0;

  async function save() {
    setBusy(true); setError(null);
    try {
      await api.assets.update(id, {
        type: form.type, plate: form.plate.trim(), countryOfPlate: form.countryOfPlate,
        vin: form.vin.trim() || undefined, make: form.make.trim() || undefined,
        model: form.model.trim() || undefined,
        year: form.year ? parseInt(form.year, 10) : undefined,
        odometerLast: form.odometerLast ? parseInt(form.odometerLast, 10) : undefined,
      });
      router.push(ownerId ? `/advisor/customers/${ownerId}` : '/advisor/customers');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save changes');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <button onClick={() => router.back()} className="self-start text-sm font-semibold text-steel">‹ Back</button>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Edit vehicle</h1>
      {error && <ProblemBanner message={error} />}

      <Card className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Type" value={form.type} onChange={(v) => set('type', v)}
            options={[
              { value: 'truck', label: 'Truck' }, { value: 'tractor', label: 'Tractor unit' },
              { value: 'trailer', label: 'Trailer' }, { value: 'van', label: 'Van' }, { value: 'other', label: 'Other' },
            ]} />
          <SelectField label="Country of plate" value={form.countryOfPlate} onChange={(v) => set('countryOfPlate', v)} options={COUNTRY_OPTIONS} required />
        </div>
        <TextField label="Plate" value={form.plate} onChange={(v) => set('plate', v)} required mono uppercase />
        <TextField label="VIN" value={form.vin} onChange={(v) => set('vin', v)} mono uppercase />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Make" value={form.make} onChange={(v) => set('make', v)} />
          <TextField label="Model" value={form.model} onChange={(v) => set('model', v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Year" value={form.year} onChange={(v) => set('year', v)} />
          <NumberField label="Odometer (km)" value={form.odometerLast} onChange={(v) => set('odometerLast', v)} />
        </div>
        <div className="flex justify-end gap-3">
          <Button tone="neutral" onClick={() => router.back()}>Cancel</Button>
          <Button tone="info" size="lg" onClick={save} disabled={busy || !canSave}>{busy ? <Spinner /> : 'Save changes'}</Button>
        </div>
      </Card>
    </div>
  );
}
