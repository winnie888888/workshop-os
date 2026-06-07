'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { uploadDocument } from '@/lib/uploads';
import { Button, Card, Spinner, ProblemBanner, SoftChip, Stepper } from '@/components/ui';

/*
 * Vehicle rental — the desk workflow on a phone.
 *
 * The rental flow is inherently sequential: you reserve a vehicle, draw up a
 * contract, hand the vehicle over, take it back (which computes the charges),
 * then invoice. You cannot return what was never handed over, nor invoice what
 * was never returned. So this screen is a small state machine that mirrors the
 * backend's own contract status (draft -> handed_over -> returned -> invoiced),
 * showing at each step only the action that makes sense. Every figure the
 * customer is charged comes from the tested shared calculator on the server; the
 * screen only collects readings and displays the result for a human to confirm.
 */

type Stage = 'home' | 'newVehicle' | 'reserve' | 'contract' | 'handover' | 'return' | 'done';

function eur(minor: number): string {
  const sign = minor < 0 ? '-' : '';
  return `${sign}€${(Math.abs(minor) / 100).toFixed(2)}`;
}
function fuelLabel(eighths: number): string { return `${eighths}/8`; }

export default function RentalPage() {
  const [stage, setStage] = useState<Stage>('home');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The contract under construction carries us through the workflow.
  const [contract, setContract] = useState<any | null>(null);
  const [reservation, setReservation] = useState<any | null>(null);
  const [charges, setCharges] = useState<any | null>(null);
  const [invoice, setInvoice] = useState<any | null>(null);

  async function refresh() {
    setLoading(true); setError(null);
    try {
      const [v, c] = await Promise.all([api.rental.listVehicles(), api.customers.list()]);
      setVehicles(v); setCustomers(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load rental data');
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Vehicle rental</h1>
          <p className="text-sm text-steel">Motorhomes, cars and replacement vehicles — reserve, hand over, return, invoice.</p>
        </div>
        {stage !== 'home' && (
          <Button tone="neutral" size="sm" onClick={() => { setStage('home'); setContract(null); setCharges(null); setInvoice(null); refresh(); }}>
            ← Back
          </Button>
        )}
      </div>

      {error && <ProblemBanner message={error} />}
      {loading && stage === 'home' && <Card className="flex items-center justify-center p-10"><Spinner /></Card>}

      {stage === 'home' && !loading && (
        <RentalHome
          vehicles={vehicles}
          onNewVehicle={() => setStage('newVehicle')}
          onReserve={() => setStage('reserve')}
        />
      )}

      {stage === 'newVehicle' && (
        <NewVehicleForm onCreated={() => { setStage('home'); refresh(); }} onError={setError} />
      )}

      {stage === 'reserve' && (
        <ReserveForm
          vehicles={vehicles} customers={customers} onError={setError}
          onReserved={(res) => { setReservation(res); setStage('contract'); }}
        />
      )}

      {stage === 'contract' && reservation && (
        <ContractForm
          reservation={reservation} vehicles={vehicles} customers={customers} onError={setError}
          onCreated={(c) => { setContract(c); setStage('handover'); }}
        />
      )}

      {stage === 'handover' && contract && (
        <HandoverForm
          contract={contract} onError={setError}
          onHandedOver={(c) => { setContract(c); setStage('return'); }}
        />
      )}

      {stage === 'return' && contract && (
        <ReturnForm
          contract={contract} onError={setError}
          onReturned={(result) => { setContract(result.contract); setCharges(result.charges); setStage('done'); }}
        />
      )}

      {stage === 'done' && contract && (
        <DonePanel
          contract={contract} charges={charges} invoice={invoice} onError={setError}
          onInvoiced={(inv) => setInvoice(inv)}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------

function RentalHome({ vehicles, onNewVehicle, onReserve }: { vehicles: any[]; onNewVehicle: () => void; onReserve: () => void }) {
  return (
    <>
      <div className="flex gap-2">
        <Button tone="go" full onClick={onReserve}>New reservation</Button>
        <Button tone="neutral" full onClick={onNewVehicle}>Add vehicle</Button>
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Fleet ({vehicles.length})</div>
        {vehicles.length === 0 && <Card className="p-4 text-sm text-steel">No rental vehicles yet. Add your first one.</Card>}
        {vehicles.map((v) => (
          <Card key={v.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-display font-bold">{[v.make, v.model].filter(Boolean).join(' ') || v.plate}</div>
              <div className="text-sm text-steel">{v.plate} · {v.category} · {eur(Number(v.daily_rate_minor))}/day</div>
            </div>
            <SoftChip tone={v.status === 'available' ? 'go' : v.status === 'rented' ? 'hold' : 'neutral'}>{v.status}</SoftChip>
          </Card>
        ))}
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">{label}</span>
      {children}
    </label>
  );
}
const inputCls = 'rounded-tool border-2 border-line px-3 py-2 text-base';

function NewVehicleForm({ onCreated, onError }: { onCreated: () => void; onError: (m: string) => void }) {
  const [f, setF] = useState<any>({ category: 'motorhome', plate: '', make: '', model: '', dailyRateMinor: 12000, includedKmPerDay: 250, perKmRateMinor: 30, perFuelEighthMinor: 1800, cleaningFeeMinor: 5000, lateFeePerDayMinor: 15000, depositMinor: 80000, deductibleMinor: 40000 });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const euros = (k: string) => (
    <input className={inputCls} type="number" value={Number(f[k]) / 100}
      onChange={(e) => set(k, Math.round(Number(e.target.value) * 100))} />
  );
  async function submit() {
    if (!f.plate) { onError('Plate is required'); return; }
    setBusy(true);
    try { await api.rental.createVehicle(f); onCreated(); }
    catch (e) { onError(e instanceof Error ? e.message : 'Could not create vehicle'); }
    finally { setBusy(false); }
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="font-display text-lg font-bold">Add rental vehicle</div>
      <Field label="Category">
        <select className={inputCls} value={f.category} onChange={(e) => set('category', e.target.value)}>
          <option value="motorhome">Motorhome</option><option value="car">Car</option>
          <option value="replacement">Replacement</option><option value="van">Van</option>
          <option value="service">Service</option><option value="other">Other</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Plate"><input className={inputCls} value={f.plate} onChange={(e) => set('plate', e.target.value)} /></Field>
        <Field label="Make"><input className={inputCls} value={f.make} onChange={(e) => set('make', e.target.value)} /></Field>
        <Field label="Model"><input className={inputCls} value={f.model} onChange={(e) => set('model', e.target.value)} /></Field>
        <Field label="Daily rate (€)">{euros('dailyRateMinor')}</Field>
        <Field label="Included km/day"><input className={inputCls} type="number" value={f.includedKmPerDay} onChange={(e) => set('includedKmPerDay', Number(e.target.value))} /></Field>
        <Field label="Extra km rate (€)">{euros('perKmRateMinor')}</Field>
        <Field label="Deposit (€)">{euros('depositMinor')}</Field>
        <Field label="Deductible (€)">{euros('deductibleMinor')}</Field>
      </div>
      <Button tone="go" full disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Save vehicle'}</Button>
    </Card>
  );
}

function ReserveForm({ vehicles, customers, onReserved, onError }: { vehicles: any[]; customers: any[]; onReserved: (r: any) => void; onError: (m: string) => void }) {
  const available = vehicles.filter((v) => v.status === 'available');
  const [vehicleId, setVehicleId] = useState(available[0]?.id ?? '');
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const today = new Date().toISOString().slice(0, 10);
  const [startAt, setStartAt] = useState(today);
  const [endAt, setEndAt] = useState(today);
  const [pickup, setPickup] = useState('A-SPRINT Črnomelj');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!vehicleId || !customerId) { onError('Pick a vehicle and a customer'); return; }
    setBusy(true);
    try {
      const res = await api.rental.reserve({
        rentalVehicleId: vehicleId, customerId,
        startAt: new Date(startAt + 'T08:00:00').toISOString(),
        endAt: new Date(endAt + 'T08:00:00').toISOString(),
        pickupLocation: pickup, returnLocation: pickup,
      });
      onReserved(res);
    } catch (e) { onError(e instanceof Error ? e.message : 'Could not reserve'); }
    finally { setBusy(false); }
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="font-display text-lg font-bold">New reservation</div>
      <Field label="Vehicle">
        <select className={inputCls} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          {available.map((v) => <option key={v.id} value={v.id}>{[v.make, v.model].filter(Boolean).join(' ')} · {v.plate}</option>)}
        </select>
      </Field>
      <Field label="Customer">
        <select className={inputCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From"><input className={inputCls} type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></Field>
        <Field label="To"><input className={inputCls} type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></Field>
      </div>
      <Field label="Pickup / return location"><input className={inputCls} value={pickup} onChange={(e) => setPickup(e.target.value)} /></Field>
      <Button tone="go" full disabled={busy} onClick={submit}>{busy ? 'Checking availability…' : 'Reserve'}</Button>
    </Card>
  );
}

function ContractForm({ reservation, vehicles, customers, onCreated, onError }: { reservation: any; vehicles: any[]; customers: any[]; onCreated: (c: any) => void; onError: (m: string) => void }) {
  const [casco, setCasco] = useState(true);
  const [busy, setBusy] = useState(false);
  const v = vehicles.find((x) => x.id === reservation.rental_vehicle_id);
  const c = customers.find((x) => x.id === reservation.customer_id);
  async function submit() {
    setBusy(true);
    try {
      const contract = await api.rental.createContract({
        reservationId: reservation.id, casco,
        fuelPolicy: 'full_to_full',
        mileagePolicy: `${v?.included_km_per_day ?? 0} km/day included, then ${eur(Number(v?.per_km_rate_minor ?? 0))}/km`,
        latePolicy: `${eur(Number(v?.late_fee_per_day_minor ?? 0))} per started day late`,
      });
      onCreated(contract);
    } catch (e) { onError(e instanceof Error ? e.message : 'Could not create contract'); }
    finally { setBusy(false); }
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="font-display text-lg font-bold">Create contract</div>
      <div className="rounded-tool bg-floor p-3 text-sm">
        <div><span className="text-steel">Customer:</span> {c?.name}</div>
        <div><span className="text-steel">Vehicle:</span> {[v?.make, v?.model].filter(Boolean).join(' ')} ({v?.plate})</div>
        <div><span className="text-steel">Deposit:</span> {eur(Number(v?.deposit_minor ?? 0))} · <span className="text-steel">Deductible:</span> {eur(Number(v?.deductible_minor ?? 0))}</div>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={casco} onChange={(e) => setCasco(e.target.checked)} />
        <span className="text-sm">Comprehensive (casco) insurance — caps renter liability at the deductible</span>
      </label>
      <Button tone="go" full disabled={busy} onClick={submit}>{busy ? 'Creating…' : 'Create contract'}</Button>
    </Card>
  );
}

function FuelPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="range" min={0} max={8} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
      <span className="w-10 text-right font-display font-bold">{fuelLabel(value)}</span>
    </div>
  );
}

function HandoverForm({ contract, onHandedOver, onError }: { contract: any; onHandedOver: (c: any) => void; onError: (m: string) => void }) {
  const [mileage, setMileage] = useState<number>(Number(contract.start_mileage_km ?? 0));
  const [fuel, setFuel] = useState(8);
  const [busy, setBusy] = useState(false);
  const [sigName, setSigName] = useState<string | null>(null);
  const [sigId, setSigId] = useState<string | undefined>(undefined);
  async function onSig(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const res = await uploadDocument(file);
    if (res.ok) { setSigId(res.attachmentId); setSigName(file.name); } else onError('Signature upload failed');
  }
  async function submit() {
    setBusy(true);
    try {
      const c = await api.rental.handover(contract.id, { startMileageKm: mileage, startFuelEighths: fuel, signatureAttachmentId: sigId });
      onHandedOver(c);
    } catch (e) { onError(e instanceof Error ? e.message : 'Handover failed'); }
    finally { setBusy(false); }
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="font-display text-lg font-bold">Handover · {contract.number}</div>
      <p className="text-sm text-steel">Record the vehicle's condition as the customer drives away.</p>
      <Field label="Starting mileage (km)"><input className={inputCls} type="number" value={mileage} onChange={(e) => setMileage(Number(e.target.value))} /></Field>
      <Field label="Starting fuel"><FuelPicker value={fuel} onChange={setFuel} /></Field>
      <Field label="Customer signature (photo)">
        <input type="file" accept="image/*" capture="environment" onChange={onSig} className="text-sm" />
      </Field>
      {sigName && <div className="text-xs text-go">Signature captured: {sigName}</div>}
      <Button tone="go" full disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Confirm handover'}</Button>
    </Card>
  );
}

function ReturnForm({ contract, onReturned, onError }: { contract: any; onReturned: (r: any) => void; onError: (m: string) => void }) {
  const [mileage, setMileage] = useState<number>(Number(contract.start_mileage_km ?? 0));
  const [fuel, setFuel] = useState(8);
  const [dirty, setDirty] = useState(false);
  const [hasDamage, setHasDamage] = useState(false);
  const [damageDesc, setDamageDesc] = useState('');
  const [damageCost, setDamageCost] = useState(0);
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [photoNames, setPhotoNames] = useState<string[]>([]);
  const [sigId, setSigId] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const res = await uploadDocument(file);
    if (res.ok) { setPhotoIds((p) => [...p, res.attachmentId!]); setPhotoNames((p) => [...p, file.name]); }
    else onError('Photo upload failed');
  }
  async function onSig(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const res = await uploadDocument(file);
    if (res.ok) setSigId(res.attachmentId); else onError('Signature upload failed');
  }
  async function submit() {
    setBusy(true);
    try {
      const damages = hasDamage && damageDesc
        ? [{ description: damageDesc, severity: 'moderate', estimatedCostMinor: damageCost, photoAttachmentIds: photoIds }]
        : [];
      const result = await api.rental.returnVehicle(contract.id, {
        returnMileageKm: mileage, returnFuelEighths: fuel, dirty,
        signatureAttachmentId: sigId, damages,
      });
      onReturned(result);
    } catch (e) { onError(e instanceof Error ? e.message : 'Return failed'); }
    finally { setBusy(false); }
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="font-display text-lg font-bold">Return · {contract.number}</div>
      <p className="text-sm text-steel">Record the readings; the system computes the charges for you to review.</p>
      <Field label="Return mileage (km)"><input className={inputCls} type="number" value={mileage} onChange={(e) => setMileage(Number(e.target.value))} /></Field>
      <Field label="Return fuel"><FuelPicker value={fuel} onChange={setFuel} /></Field>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={dirty} onChange={(e) => setDirty(e.target.checked)} />
        <span className="text-sm">Returned dirty (cleaning fee applies)</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={hasDamage} onChange={(e) => setHasDamage(e.target.checked)} />
        <span className="text-sm">New damage</span>
      </label>
      {hasDamage && (
        <div className="flex flex-col gap-2 rounded-tool bg-floor p-3">
          <Field label="Damage description"><input className={inputCls} value={damageDesc} onChange={(e) => setDamageDesc(e.target.value)} /></Field>
          <Field label="Estimated repair cost (€)"><input className={inputCls} type="number" value={damageCost / 100} onChange={(e) => setDamageCost(Math.round(Number(e.target.value) * 100))} /></Field>
          <Field label="Damage photos"><input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="text-sm" /></Field>
          {photoNames.length > 0 && <div className="text-xs text-go">{photoNames.length} photo(s) attached</div>}
        </div>
      )}
      <Field label="Customer signature (photo)">
        <input type="file" accept="image/*" capture="environment" onChange={onSig} className="text-sm" />
      </Field>
      <Button tone="go" full disabled={busy} onClick={submit}>{busy ? 'Computing charges…' : 'Complete return'}</Button>
    </Card>
  );
}

function DonePanel({ contract, charges, invoice, onInvoiced, onError }: { contract: any; charges: any; invoice: any; onInvoiced: (inv: any) => void; onError: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function invoiceIt() {
    setBusy(true);
    try { const res = await api.rental.generateInvoice(contract.id); onInvoiced(res.invoice ?? res); }
    catch (e) { onError(e instanceof Error ? e.message : 'Could not generate invoice'); }
    finally { setBusy(false); }
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="font-display text-lg font-bold">Charges · {contract.number}</div>
      {charges ? (
        <>
          <div className="flex flex-col divide-y divide-line">
            {charges.lines?.map((l: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <span>{l.description}</span><span className="font-display font-bold">{eur(l.amountMinor)}</span>
              </div>
            ))}
          </div>
          <div className="rounded-tool bg-floor p-3 text-sm">
            <div className="flex justify-between"><span className="text-steel">Subtotal (net)</span><span className="font-bold">{eur(charges.subtotalMinor)}</span></div>
            <div className="flex justify-between"><span className="text-steel">Deposit applied</span><span>{eur(-charges.depositAppliedMinor)}</span></div>
            <div className="flex justify-between"><span className="text-steel">Deposit refund</span><span>{eur(charges.depositRefundMinor)}</span></div>
            <div className="mt-1 flex justify-between border-t border-line pt-1 text-base"><span className="font-bold">Balance due</span><span className="font-display font-extrabold">{eur(charges.balanceDueMinor)}</span></div>
          </div>
          <p className="text-xs text-steel">VAT is applied by the invoicing engine when you issue the invoice.</p>
        </>
      ) : <div className="text-sm text-steel">No charges recorded.</div>}

      {invoice ? (
        <div className="rounded-tool bg-go/10 p-3 text-sm text-go">
          Invoice {invoice.number ?? ''} issued. It will sync to Minimax like any other invoice.
        </div>
      ) : (
        <Button tone="go" full disabled={busy} onClick={invoiceIt}>{busy ? 'Issuing…' : 'Generate final invoice'}</Button>
      )}
      <a href={api.rental.contractPdfUrl(contract.id)} target="_blank" rel="noreferrer"
        className="tool-tap rounded-tool border-2 border-line px-4 py-2 text-center font-display font-bold">
        Open contract PDF
      </a>
    </Card>
  );
}
