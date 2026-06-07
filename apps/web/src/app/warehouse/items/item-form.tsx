'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { readDefaultsSync } from '@/lib/workshop-settings';
import { Button, Card, Spinner } from '@/components/ui';
import { TextField, NumberField, SelectField, TextAreaField, CheckboxField } from '@/components/form';

/*
 * Skupni obrazec za artikel (ustvari + uredi). Cene se vnašajo v EUR in se ob
 * shranjevanju pretvorijo v centov (minor). Povezano s centralno shrambo prek
 * api.inventory.create/update — nov artikel se takoj vidi v Postavkah in v
 * izbirniku delov na nalogu.
 */

const KIND_OPTIONS = [
  { value: 'part', label: 'Del' },
  { value: 'consumable', label: 'Potrošni material' },
  { value: 'fluid', label: 'Tekočina / olje' },
  { value: 'tyre', label: 'Pnevmatika' },
  { value: 'other', label: 'Drugo' },
];

function eurToMinor(v: string): number { return Math.round((parseFloat(v) || 0) * 100); }
function minorToEur(m?: number): string { return m != null ? (m / 100).toFixed(2) : ''; }

export function ItemForm({ mode, initial }: { mode: 'create' | 'edit'; initial?: any }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [kind, setKind] = useState(initial?.kind ?? 'part');
  const [unit, setUnit] = useState(initial?.unit ?? 'kos');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [oemRef, setOemRef] = useState(initial?.oemRef ?? '');
  const [barcode, setBarcode] = useState(initial?.barcode ?? '');
  const [priceEur, setPriceEur] = useState(minorToEur(initial?.priceMinor));
  const [costEur, setCostEur] = useState(minorToEur(initial?.costMinor));
  const [vat, setVat] = useState(String(initial?.vatRatePct ?? 22));
  const [supplierName, setSupplierName] = useState(initial?.supplierName ?? '');
  const [supplierSku, setSupplierSku] = useState(initial?.supplierSku ?? '');
  const [onHand, setOnHand] = useState(String(initial?.onHand ?? '0'));
  const [reorderPoint, setReorderPoint] = useState(String(initial?.reorderPoint ?? '0'));
  const [bin, setBin] = useState(initial?.bin ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [quickAdd, setQuickAdd] = useState(initial?.quickAdd ?? false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On a new item, prefill VAT from the workshop default (Settings).
  useEffect(() => { if (mode === 'create') setVat(readDefaultsSync().vatRatePct); }, [mode]);

  async function save() {
    if (name.trim().length < 2) { setError('Naziv je obvezen.'); return; }
    setBusy(true); setError(null);
    const payload: Record<string, any> = {
      name: name.trim(), sku: sku.trim(), kind, unit: unit.trim() || 'kos',
      category: category.trim() || undefined, oemRef: oemRef.trim() || undefined, barcode: barcode.trim() || undefined,
      priceMinor: eurToMinor(priceEur), costMinor: costEur ? eurToMinor(costEur) : undefined,
      vatRatePct: parseFloat(vat) || 0, supplierName: supplierName.trim() || undefined, supplierSku: supplierSku.trim() || undefined,
      reorderPoint: parseInt(reorderPoint, 10) || 0, bin: bin.trim() || undefined,
      notes: notes.trim() || undefined, active, quickAdd,
    };
    if (mode === 'create') payload.onHand = parseInt(onHand, 10) || 0;
    try {
      const saved = mode === 'create'
        ? await api.inventory.create(payload)
        : await api.inventory.update(initial.id, payload);
      router.push(saved?.id ? `/warehouse/items/${saved.id}` : '/warehouse/items');
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Shranjevanje ni uspelo.');
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted2">Osnovno</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><TextField label="Naziv" value={name} onChange={setName} required placeholder="npr. Set zavornih ploščic spredaj" /></div>
          <TextField label="SKU / šifra" value={sku} onChange={setSku} mono uppercase placeholder={mode === 'create' ? 'samodejno, če prazno' : ''} />
          <SelectField label="Vrsta" value={kind} onChange={setKind} options={KIND_OPTIONS} />
          <TextField label="Enota" value={unit} onChange={setUnit} placeholder="kos, set, par, L…" />
          <TextField label="Kategorija" value={category} onChange={setCategory} placeholder="Zavore, Filtri…" />
          <TextField label="OEM referenca" value={oemRef} onChange={setOemRef} mono />
          <TextField label="Črtna koda (EAN)" value={barcode} onChange={setBarcode} mono />
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted2">Cene in DDV</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="Prodajna cena (€)" value={priceEur} onChange={setPriceEur} hint="neto, brez DDV" />
          <NumberField label="Nabavna cena (€)" value={costEur} onChange={setCostEur} hint="za maržo in vrednost zaloge" />
          <NumberField label="DDV %" value={vat} onChange={setVat} />
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted2">Zaloga in dobavitelj</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {mode === 'create'
            ? <NumberField label="Začetna zaloga" value={onHand} onChange={setOnHand} />
            : <div className="rounded-tool border border-line bg-surface2 p-2.5 text-sm"><span className="block text-xs text-muted2">Zaloga</span><span className="num font-bold text-ink">{initial?.onHand ?? 0} {unit}</span><span className="block text-xs text-muted">uredi prek Prejem / Popravek</span></div>}
          <NumberField label="Min. zaloga (opozorilo)" value={reorderPoint} onChange={setReorderPoint} hint="0 = brez opozorila" />
          <TextField label="Lokacija / predal" value={bin} onChange={setBin} placeholder="A-12" />
          <TextField label="Dobavitelj" value={supplierName} onChange={setSupplierName} />
          <TextField label="Šifra pri dobavitelju" value={supplierSku} onChange={setSupplierSku} mono />
        </div>
      </Card>

      <Card className="p-4">
        <div className="grid gap-3">
          <TextAreaField label="Opombe" value={notes} onChange={setNotes} rows={2} />
          <CheckboxField label="Aktiven artikel" checked={active} onChange={setActive} hint="Neaktivni se ne ponujajo pri vnosu na nalog." />
          <CheckboxField label="Hitri vnos" checked={quickAdd} onChange={setQuickAdd} hint="Pogosto dodajan del — pokaže se kot gumb na delovnem nalogu." />
        </div>
      </Card>

      {error && <p className="rounded-tool bg-stop/10 px-3 py-2 text-sm font-semibold text-stop">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button tone="neutral" onClick={() => router.back()}>Prekliči</Button>
        <Button tone="go" onClick={save} disabled={busy}>{busy ? <Spinner /> : (mode === 'create' ? 'Ustvari artikel' : 'Shrani')}</Button>
      </div>
    </div>
  );
}
