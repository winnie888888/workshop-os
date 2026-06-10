'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button, Card, ProblemBanner, Spinner } from '@/components/ui';
import { TextField, NumberField, SelectField, CheckboxField, TextAreaField, COUNTRY_OPTIONS } from '@/components/form';

/*
 * Create Customer. The first link in the operational loop: a hauler arrives and
 * becomes a record the rest of the system can hang work, vehicles, and invoices
 * on. The fields here are the ones downstream logic actually needs — country
 * and VAT status drive the VAT engine's treatment decision later, and payment
 * terms drive AR aging — so this is where the data quality of every future
 * invoice is really set.
 */
export default function CreateCustomer() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', type: 'company', country: 'SI', vatLiable: true, vatId: '',
    address: '', postCode: '', city: '', paymentTermsDays: '30', currency: 'EUR', discountPct: '',
    registrationNo: '',
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Company lookup (Customer Creation spec): type ONE identifier — a VAT id
  // (EU → VIES) or a Slovenian registration (matična) number (→ AJPES/Bizi) —
  // and the registry fills the form. vatValidated/vatSource carry a confirmed
  // VIES result through to save(), where it is persisted on the customer.
  const [lookupQ, setLookupQ] = useState('');
  const [looking, setLooking] = useState(false);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const [lookupTone, setLookupTone] = useState<'go' | 'stop' | 'info'>('info');
  const [vatValidated, setVatValidated] = useState(false);
  const [vatSource, setVatSource] = useState<string | null>(null);

  async function doLookup() {
    const q = lookupQ.trim();
    if (!q) return;
    setLooking(true); setLookupMsg(null); setError(null);
    // A VAT id carries a 2-letter country prefix; without one, treat the input
    // as a Slovenian registration number.
    const looksLikeVat = /^[A-Za-z]{2}/.test(q.replace(/[\s-]/g, ''));
    try {
      const r: any = await api.customers.lookup(looksLikeVat ? { vat: q, country: form.country } : { regNo: q });
      if (r?.found) {
        setForm((f) => ({
          ...f,
          name: r.name ?? f.name,
          country: r.countryCode ?? f.country,
          vatLiable: true,
          vatId: r.vatId ?? f.vatId,
          address: r.address ?? f.address,
          postCode: r.postCode ?? f.postCode,
          city: r.city ?? f.city,
          registrationNo: r.registrationNo ?? f.registrationNo,
        }));
        setVatValidated(!!r.vatValid && r.source === 'vies');
        setVatSource(r.source ?? null);
        setLookupTone('go');
        setLookupMsg(
          `Najdeno${r.source ? ` (${String(r.source).toUpperCase()})` : ''}` +
          `${r.vatValid ? ' — DDV veljaven' : ''}${r.status ? ` · ${r.status}` : ''}. Preverite podatke in ustvarite.`,
        );
      } else {
        setVatValidated(false); setVatSource(null);
        setLookupTone(r?.message ? 'info' : 'stop');
        setLookupMsg(r?.message ?? 'Podjetja ni bilo mogoče najti. Vnesite podatke ročno.');
      }
    } catch (e) {
      setVatValidated(false); setVatSource(null);
      setLookupTone('stop');
      setLookupMsg(e instanceof ApiError ? e.message : 'Iskanje ni uspelo. Vnesite podatke ročno.');
    } finally {
      setLooking(false);
    }
  }

  // The one cross-field rule worth catching before the round-trip: an EU
  // VAT-liable company needs a VAT id, or reverse-charge invoicing breaks later.
  const needsVatId = form.vatLiable && form.type === 'company';
  const canSave = form.name.trim().length > 0 && (!needsVatId || form.vatId.trim().length > 0);

  async function save() {
    setBusy(true); setError(null);
    try {
      const created = await api.customers.create({
        name: form.name.trim(),
        type: form.type,
        country: form.country,
        vatLiable: form.vatLiable,
        vatId: form.vatId.trim() || undefined,
        address: form.address.trim() || undefined,
        postCode: form.postCode.trim() || undefined,
        city: form.city.trim() || undefined,
        registrationNo: form.registrationNo.trim() || undefined,
        paymentTermsDays: parseInt(form.paymentTermsDays, 10) || 30,
        currency: form.currency,
        discountPct: form.discountPct.trim() || undefined,
      });
      // If the lookup confirmed the VAT id via VIES, persist that validation
      // (status + timestamp + audit) so reverse charge can apply. Best-effort:
      // the customer is created regardless and can be validated later.
      if (vatValidated && vatSource === 'vies') {
        try { await api.customers.validateVat(created.id, { mode: 'vies' }); } catch { /* leave unvalidated */ }
      }
      // Land on the customer hub so the natural next step (add a vehicle, open a
      // job) is right there.
      router.push(`/advisor/customers/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Stranke ni bilo mogoče ustvariti');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <button onClick={() => router.push('/advisor/customers')} className="self-start text-sm font-semibold text-steel">‹ Customers</button>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Nova stranka</h1>
      {error && <ProblemBanner message={error} />}

      <Card className="flex flex-col gap-3 p-5">
        <div>
          <h2 className="text-base font-bold text-ink">Hitri vnos iz registra</h2>
          <p className="text-sm text-muted">Vnesite ID za DDV (EU → VIES) ali matično številko (SI → AJPES) in podatki se izpolnijo samodejno — brez tipkanja.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextField label="ID za DDV ali matična št." value={lookupQ} onChange={setLookupQ} mono uppercase placeholder="npr. SI58962317" />
          </div>
          <Button tone="info" onClick={doLookup} disabled={looking || !lookupQ.trim()}>
            {looking ? <Spinner /> : 'Poišči'}
          </Button>
        </div>
        {lookupMsg && (
          <div className={`rounded-tool px-3 py-2 text-sm font-semibold ${lookupTone === 'go' ? 'bg-go/10 text-go' : lookupTone === 'stop' ? 'bg-stop/10 text-stop' : 'bg-brandweak text-brand'}`}>
            {lookupMsg}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <TextField label="Naziv" value={form.name} onChange={(v) => set('name', v)} required placeholder="npr. Prevozi Novak d.o.o." />

        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Tip" value={form.type} onChange={(v) => set('type', v)}
            options={[{ value: 'company', label: 'Podjetje' }, { value: 'individual', label: 'Fizična oseba' }]} />
          <SelectField label="Država" value={form.country} onChange={(v) => set('country', v)} options={COUNTRY_OPTIONS} required />
        </div>

        <CheckboxField label="Zavezanec za DDV" checked={form.vatLiable} onChange={(v) => set('vatLiable', v)}
          hint="Določa, ali čezmejni računi uporabijo obrnjeno davčno obveznost." />

        {form.vatLiable && (
          <TextField label="ID za DDV" value={form.vatId} onChange={(v) => set('vatId', v)} mono uppercase
            required={needsVatId} placeholder="npr. SI12345678"
            hint="Predpona države + številka. Potrebno za obračun obrnjene obveznosti v EU." />
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
          <Button tone="neutral" onClick={() => router.push('/advisor/customers')}>Prekliči</Button>
          <Button tone="info" size="lg" onClick={save} disabled={busy || !canSave}>
            {busy ? <Spinner /> : 'Ustvari stranko'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
