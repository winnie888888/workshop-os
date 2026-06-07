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
      setError(e instanceof Error ? e.message : 'Podatkov o najemu ni bilo mogoče naložiti');
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Najem vozil</h1>
          <p className="text-sm text-muted">Avtodomi, avtomobili in nadomestna vozila — rezervacija, predaja, vračilo, račun.</p>
        </div>
        {stage !== 'home' && (
          <Button tone="neutral" size="sm" onClick={() => { setStage('home'); setContract(null); setCharges(null); setInvoice(null); refresh(); }}>
            ← Nazaj
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
        <Button tone="go" full onClick={onReserve}>Nova rezervacija</Button>
        <Button tone="neutral" full onClick={onNewVehicle}>Dodaj vozilo</Button>
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-[0.65rem] font-bold uppercase tracking-wide text-muted">Vozni park ({vehicles.length})</div>
        {vehicles.length === 0 && <Card className="p-4 text-sm text-muted">Še ni vozil za najem. Dodajte prvo.</Card>}
        {vehicles.map((v) => (
          <Card key={v.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-bold">{[v.make, v.model].filter(Boolean).join(' ') || v.plate}</div>
              <div className="text-sm text-muted">{v.plate} · {catLabel(v.category)} · {eur(Number(v.daily_rate_minor))}/dan</div>
            </div>
            <SoftChip tone={v.status === 'available' ? 'go' : v.status === 'rented' ? 'hold' : 'neutral'}>{rentStatus(v.status)}</SoftChip>
          </Card>
        ))}
      </div>
    </>
  );
}

function catLabel(c: string): string {
  const m: Record<string, string> = { motorhome: 'Avtodom', car: 'Avtomobil', replacement: 'Nadomestno', van: 'Kombi', service: 'Servisno', other: 'Drugo' };
  return m[c] ?? c;
}
function rentStatus(s: string): string {
  return s === 'available' ? 'na voljo' : s === 'rented' ? 'oddano' : s === 'maintenance' ? 'vzdrževanje' : s;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.65rem] font-bold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}
const inputCls = 'rounded-tool border border-line px-3 py-2 text-base';

function NewVehicleForm({ onCreated, onError }: { onCreated: () => void; onError: (m: string) => void }) {
  const [f, setF] = useState<any>({ category: 'motorhome', plate: '', make: '', model: '', dailyRateMinor: 12000, includedKmPerDay: 250, perKmRateMinor: 30, perFuelEighthMinor: 1800, cleaningFeeMinor: 5000, lateFeePerDayMinor: 15000, depositMinor: 80000, deductibleMinor: 40000 });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const euros = (k: string) => (
    <input className={inputCls} type="number" value={Number(f[k]) / 100}
      onChange={(e) => set(k, Math.round(Number(e.target.value) * 100))} />
  );
  async function submit() {
    if (!f.plate) { onError('Tablica je obvezna'); return; }
    setBusy(true);
    try { await api.rental.createVehicle(f); onCreated(); }
    catch (e) { onError(e instanceof Error ? e.message : 'Vozila ni bilo mogoče ustvariti'); }
    finally { setBusy(false); }
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="text-lg font-bold">Dodaj vozilo za najem</div>
      <Field label="Kategorija">
        <select className={inputCls} value={f.category} onChange={(e) => set('category', e.target.value)}>
          <option value="motorhome">Avtodom</option><option value="car">Avtomobil</option>
          <option value="replacement">Nadomestno</option><option value="van">Kombi</option>
          <option value="service">Servisno</option><option value="other">Drugo</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tablica"><input className={inputCls} value={f.plate} onChange={(e) => set('plate', e.target.value)} /></Field>
        <Field label="Znamka"><input className={inputCls} value={f.make} onChange={(e) => set('make', e.target.value)} /></Field>
        <Field label="Model"><input className={inputCls} value={f.model} onChange={(e) => set('model', e.target.value)} /></Field>
        <Field label="Dnevna cena (€)">{euros('dailyRateMinor')}</Field>
        <Field label="Vključeni km/dan"><input className={inputCls} type="number" value={f.includedKmPerDay} onChange={(e) => set('includedKmPerDay', Number(e.target.value))} /></Field>
        <Field label="Cena dodatnih km (€)">{euros('perKmRateMinor')}</Field>
        <Field label="Varščina (€)">{euros('depositMinor')}</Field>
        <Field label="Odbitna franšiza (€)">{euros('deductibleMinor')}</Field>
      </div>
      <Button tone="go" full disabled={busy} onClick={submit}>{busy ? 'Shranjevanje…' : 'Shrani vozilo'}</Button>
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
    if (!vehicleId || !customerId) { onError('Izberite vozilo in stranko'); return; }
    setBusy(true);
    try {
      const res = await api.rental.reserve({
        rentalVehicleId: vehicleId, customerId,
        startAt: new Date(startAt + 'T08:00:00').toISOString(),
        endAt: new Date(endAt + 'T08:00:00').toISOString(),
        pickupLocation: pickup, returnLocation: pickup,
      });
      onReserved(res);
    } catch (e) { onError(e instanceof Error ? e.message : 'Rezervacija ni uspela'); }
    finally { setBusy(false); }
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="text-lg font-bold">Nova rezervacija</div>
      <Field label="Vozilo">
        <select className={inputCls} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          {available.map((v) => <option key={v.id} value={v.id}>{[v.make, v.model].filter(Boolean).join(' ')} · {v.plate}</option>)}
        </select>
      </Field>
      <Field label="Stranka">
        <select className={inputCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Od"><input className={inputCls} type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></Field>
        <Field label="Do"><input className={inputCls} type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></Field>
      </div>
      <Field label="Lokacija prevzema / vračila"><input className={inputCls} value={pickup} onChange={(e) => setPickup(e.target.value)} /></Field>
      <Button tone="go" full disabled={busy} onClick={submit}>{busy ? 'Preverjanje razpoložljivosti…' : 'Rezerviraj'}</Button>
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
    } catch (e) { onError(e instanceof Error ? e.message : 'Pogodbe ni bilo mogoče ustvariti'); }
    finally { setBusy(false); }
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="text-lg font-bold">Ustvari pogodbo</div>
      <div className="rounded-tool bg-floor p-3 text-sm">
        <div><span className="text-muted">Customer:</span> {c?.name}</div>
        <div><span className="text-muted">Vehicle:</span> {[v?.make, v?.model].filter(Boolean).join(' ')} ({v?.plate})</div>
        <div><span className="text-muted">Deposit:</span> {eur(Number(v?.deposit_minor ?? 0))} · <span className="text-muted">Deductible:</span> {eur(Number(v?.deductible_minor ?? 0))}</div>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={casco} onChange={(e) => setCasco(e.target.checked)} />
        <span className="text-sm">Comprehensive (casco) insurance — caps renter liability at the deductible</span>
      </label>
      <Button tone="go" full disabled={busy} onClick={submit}>{busy ? 'Ustvarjanje…' : 'Ustvari pogodbo'}</Button>
    </Card>
  );
}

function FuelPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="range" min={0} max={8} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
      <span className="w-10 text-right font-bold">{fuelLabel(value)}</span>
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
    if (res.ok) { setSigId(res.attachmentId); setSigName(file.name); } else onError('Nalaganje podpisa ni uspelo');
  }
  async function submit() {
    setBusy(true);
    try {
      const c = await api.rental.handover(contract.id, { startMileageKm: mileage, startFuelEighths: fuel, signatureAttachmentId: sigId });
      onHandedOver(c);
    } catch (e) { onError(e instanceof Error ? e.message : 'Predaja ni uspela'); }
    finally { setBusy(false); }
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="text-lg font-bold">Handover · {contract.number}</div>
      <p className="text-sm text-muted">Record the vehicle's condition as the customer drives away.</p>
      <Field label="Začetna kilometrina (km)"><input className={inputCls} type="number" value={mileage} onChange={(e) => setMileage(Number(e.target.value))} /></Field>
      <Field label="Začetno gorivo"><FuelPicker value={fuel} onChange={setFuel} /></Field>
      <Field label="Podpis stranke (foto)">
        <input type="file" accept="image/*" capture="environment" onChange={onSig} className="text-sm" />
      </Field>
      {sigName && <div className="text-xs text-go">Signature captured: {sigName}</div>}
      <Button tone="go" full disabled={busy} onClick={submit}>{busy ? 'Shranjevanje…' : 'Potrdi predajo'}</Button>
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
    else onError('Nalaganje fotografije ni uspelo');
  }
  async function onSig(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const res = await uploadDocument(file);
    if (res.ok) setSigId(res.attachmentId); else onError('Nalaganje podpisa ni uspelo');
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
    } catch (e) { onError(e instanceof Error ? e.message : 'Vračilo ni uspelo'); }
    finally { setBusy(false); }
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="text-lg font-bold">Return · {contract.number}</div>
      <p className="text-sm text-muted">Record the readings; the system computes the charges for you to review.</p>
      <Field label="Kilometrina ob vračilu (km)"><input className={inputCls} type="number" value={mileage} onChange={(e) => setMileage(Number(e.target.value))} /></Field>
      <Field label="Gorivo ob vračilu"><FuelPicker value={fuel} onChange={setFuel} /></Field>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={dirty} onChange={(e) => setDirty(e.target.checked)} />
        <span className="text-sm">Vrnjeno umazano (zaračuna se čiščenje)</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={hasDamage} onChange={(e) => setHasDamage(e.target.checked)} />
        <span className="text-sm">Nova škoda</span>
      </label>
      {hasDamage && (
        <div className="flex flex-col gap-2 rounded-tool bg-floor p-3">
          <Field label="Opis škode"><input className={inputCls} value={damageDesc} onChange={(e) => setDamageDesc(e.target.value)} /></Field>
          <Field label="Ocenjen strošek popravila (€)"><input className={inputCls} type="number" value={damageCost / 100} onChange={(e) => setDamageCost(Math.round(Number(e.target.value) * 100))} /></Field>
          <Field label="Fotografije škode"><input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="text-sm" /></Field>
          {photoNames.length > 0 && <div className="text-xs text-go">{photoNames.length} photo(s) attached</div>}
        </div>
      )}
      <Field label="Podpis stranke (foto)">
        <input type="file" accept="image/*" capture="environment" onChange={onSig} className="text-sm" />
      </Field>
      <Button tone="go" full disabled={busy} onClick={submit}>{busy ? 'Računanje stroškov…' : 'Zaključi vračilo'}</Button>
    </Card>
  );
}

function DonePanel({ contract, charges, invoice, onInvoiced, onError }: { contract: any; charges: any; invoice: any; onInvoiced: (inv: any) => void; onError: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function invoiceIt() {
    setBusy(true);
    try { const res = await api.rental.generateInvoice(contract.id); onInvoiced(res.invoice ?? res); }
    catch (e) { onError(e instanceof Error ? e.message : 'Računa ni bilo mogoče ustvariti'); }
    finally { setBusy(false); }
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="text-lg font-bold">Stroški · {contract.number}</div>
      {charges ? (
        <>
          <div className="flex flex-col divide-y divide-line">
            {charges.lines?.map((l: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <span>{l.description}</span><span className="font-bold">{eur(l.amountMinor)}</span>
              </div>
            ))}
          </div>
          <div className="rounded-tool bg-floor p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted">Vmesni seštevek (neto)</span><span className="font-bold">{eur(charges.subtotalMinor)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Uporabljena varščina</span><span>{eur(-charges.depositAppliedMinor)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Vračilo varščine</span><span>{eur(charges.depositRefundMinor)}</span></div>
            <div className="mt-1 flex justify-between border-t border-line pt-1 text-base"><span className="font-bold">Za plačilo</span><span className="font-extrabold">{eur(charges.balanceDueMinor)}</span></div>
          </div>
          <p className="text-xs text-muted">DDV se obračuna ob izstavitvi računa.</p>
        </>
      ) : <div className="text-sm text-muted">Ni zabeleženih stroškov.</div>}

      {invoice ? (
        <div className="rounded-tool bg-go/10 p-3 text-sm text-go">
          Invoice {invoice.number ?? ''} issued. It will sync to Minimax like any other invoice.
        </div>
      ) : (
        <Button tone="go" full disabled={busy} onClick={invoiceIt}>{busy ? 'Izstavljanje…' : 'Izstavi končni račun'}</Button>
      )}
      <a href={api.rental.contractPdfUrl(contract.id)} target="_blank" rel="noreferrer"
        className="tool-tap rounded-tool border border-line px-4 py-2 text-center font-bold">
        Open contract PDF
      </a>
    </Card>
  );
}
