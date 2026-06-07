'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { formatMoneyMinor } from '@/lib/format';
import { readDefaultsSync } from '@/lib/workshop-settings';
import { Button, Card, SoftChip, Spinner } from '@/components/ui';
import { TextField, TextAreaField } from '@/components/form';

/*
 * Skupni obrazec za servisni paket (ustvari + uredi). Oznake razred + pogon
 * (večizbirno; prazno = velja za vse) določajo, kje se paket ponudi. Vrstice so
 * dinamične: delo (privzeto urna postavka) ali del; del lahko vežeš na artikel iz
 * kataloga (napolni opis, ceno, DDV in itemId za živo ceno ob uporabi).
 */

const CLASS_OPTS: [string, string][] = [['tractor', 'Vlačilec'], ['truck', 'Tovornjak'], ['van', 'Kombi'], ['trailer', 'Priklopnik'], ['other', 'Drugo']];
const POWER_OPTS: [string, string][] = [['diesel', 'Dizel'], ['petrol', 'Bencin'], ['electric', 'Električno'], ['hybrid', 'Hibrid'], ['cng', 'CNG'], ['lng', 'LNG'], ['hydrogen', 'Vodik'], ['other', 'Drugo']];

type Line = { id: string; kind: 'labour' | 'part'; description: string; itemId?: string; qty: string; priceEur: string; vat: string };
const uid = () => Math.random().toString(36).slice(2, 9);
function toLineState(l: any): Line {
  return { id: l.id ?? uid(), kind: l.kind ?? 'part', description: l.description ?? '', itemId: l.itemId, qty: String(l.qty ?? 1), priceEur: ((l.unitPriceMinor ?? 0) / 100).toFixed(2), vat: String(l.vatRatePct ?? 22) };
}

function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${on ? 'border-brand bg-brand text-white' : 'border-linestrong bg-surface text-steel hover:border-brandring'}`}>
      {label}
    </button>
  );
}

export function PresetForm({ mode, initial }: { mode: 'create' | 'edit'; initial?: any }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [classes, setClasses] = useState<string[]>(initial?.vehicleClasses ?? []);
  const [powers, setPowers] = useState<string[]>(initial?.powertrains ?? []);
  const [lines, setLines] = useState<Line[]>((initial?.lines ?? []).map(toLineState));
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const setLine = (id: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLine = (id: string) => setLines((ls) => ls.filter((l) => l.id !== id));
  const addLabour = () => { const d = readDefaultsSync(); setLines((ls) => [...ls, { id: uid(), kind: 'labour', description: 'Delo', qty: '1', priceEur: d.labourRateEur, vat: d.vatRatePct }]); };
  const addFree = () => { const d = readDefaultsSync(); setLines((ls) => [...ls, { id: uid(), kind: 'part', description: '', qty: '1', priceEur: '0.00', vat: d.vatRatePct }]); };
  const addItem = (it: any) => {
    setLines((ls) => [...ls, { id: uid(), kind: 'part', description: it.name, itemId: it.id, qty: '1', priceEur: (Number(it.priceMinor) / 100).toFixed(2), vat: String(it.vatRatePct ?? 22) }]);
    setPicking(false);
  };

  const grossMinor = lines.reduce((s, l) => s + Math.round((parseFloat(l.qty) || 0) * Math.round((parseFloat(l.priceEur) || 0) * 100) * (1 + (parseFloat(l.vat) || 0) / 100)), 0);

  async function save() {
    if (name.trim().length < 2) { setError('Naziv je obvezen.'); return; }
    if (lines.length === 0) { setError('Dodaj vsaj eno postavko.'); return; }
    setBusy(true); setError(null);
    const payload: Record<string, any> = {
      name: name.trim(), description: description.trim() || undefined,
      vehicleClasses: classes, powertrains: powers,
      lines: lines.map((l) => ({ kind: l.kind, description: l.description.trim(), itemId: l.itemId, qty: parseFloat(l.qty) || 0, unitPriceMinor: Math.round((parseFloat(l.priceEur) || 0) * 100), vatRatePct: parseFloat(l.vat) || 0 })),
    };
    try {
      if (mode === 'create') await api.presets.create(payload);
      else await api.presets.update(initial.id, payload);
      router.push('/warehouse/presets'); router.refresh();
    } catch (e: any) { setError(e?.message || 'Shranjevanje ni uspelo.'); setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted2">Osnovno</h2>
        <div className="grid gap-3">
          <TextField label="Naziv paketa" value={name} onChange={setName} required placeholder="npr. Servis 120.000 km (dizel)" />
          <TextAreaField label="Opis" value={description} onChange={setDescription} rows={2} placeholder="Kaj paket vključuje…" />
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted2">Za katera vozila</h2>
        <p className="mb-3 text-xs text-muted">Nič izbranega = velja za vsa vozila. Izbrano = paket se ponudi le pri ujemajočih.</p>
        <div className="mb-2 text-xs font-semibold text-steel">Razred</div>
        <div className="mb-4 flex flex-wrap gap-2">
          {CLASS_OPTS.map(([v, l]) => <Chip key={v} on={classes.includes(v)} label={l} onClick={() => toggle(classes, setClasses, v)} />)}
        </div>
        <div className="mb-2 text-xs font-semibold text-steel">Pogon</div>
        <div className="flex flex-wrap gap-2">
          {POWER_OPTS.map(([v, l]) => <Chip key={v} on={powers.includes(v)} label={l} onClick={() => toggle(powers, setPowers, v)} />)}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted2">Postavke</h2>
          <span className="num text-sm font-bold text-ink">{formatMoneyMinor(String(grossMinor))}</span>
        </div>

        {lines.length === 0 && <p className="mb-3 text-sm text-muted">Ni postavk. Dodaj delo ali artikel.</p>}

        <div className="flex flex-col gap-2">
          {lines.map((l) => (
            <div key={l.id} className="rounded-tool border border-line bg-surface2 p-2.5">
              <div className="mb-2 flex items-center gap-2">
                <button type="button" onClick={() => setLine(l.id, { kind: l.kind === 'labour' ? 'part' : 'labour' })}>
                  <SoftChip tone={l.kind === 'labour' ? 'info' : 'neutral'}>{l.kind === 'labour' ? 'Delo' : 'Del'}{l.itemId ? ' · katalog' : ''}</SoftChip>
                </button>
                <input value={l.description} onChange={(e) => setLine(l.id, { description: e.target.value })} placeholder="Opis"
                  className="flex-1 rounded-tool border border-line bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brandring" />
                <button type="button" onClick={() => removeLine(l.id)} className="px-1 text-sm font-semibold text-stop">×</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="block"><span className="text-[0.6rem] uppercase text-muted2">Količina</span>
                  <input value={l.qty} inputMode="decimal" onChange={(e) => setLine(l.id, { qty: e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.') })} className="w-full rounded-tool border border-line bg-surface px-2.5 py-1.5 text-right text-sm num" /></label>
                <label className="block"><span className="text-[0.6rem] uppercase text-muted2">Cena/EM €</span>
                  <input value={l.priceEur} inputMode="decimal" onChange={(e) => setLine(l.id, { priceEur: e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.') })} className="w-full rounded-tool border border-line bg-surface px-2.5 py-1.5 text-right text-sm num" /></label>
                <label className="block"><span className="text-[0.6rem] uppercase text-muted2">DDV %</span>
                  <input value={l.vat} inputMode="decimal" onChange={(e) => setLine(l.id, { vat: e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.') })} className="w-full rounded-tool border border-line bg-surface px-2.5 py-1.5 text-right text-sm num" /></label>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button tone="info" onClick={addLabour}>+ Delo</Button>
          <Button tone="go" onClick={() => setPicking((p) => !p)}>+ Artikel iz kataloga</Button>
          <Button tone="neutral" onClick={addFree}>+ Prosta postavka</Button>
        </div>

        {picking && <CataloguePicker onPick={addItem} onClose={() => setPicking(false)} />}
      </Card>

      {error && <p className="rounded-tool bg-stop/10 px-3 py-2 text-sm font-semibold text-stop">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button tone="neutral" onClick={() => router.back()}>Prekliči</Button>
        <Button tone="go" onClick={save} disabled={busy}>{busy ? <Spinner /> : (mode === 'create' ? 'Ustvari paket' : 'Shrani')}</Button>
      </div>
    </div>
  );
}

/* Inline catalogue search to attach a part line bound to a real item. */
function CataloguePicker({ onPick, onClose }: { onPick: (it: any) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const { data: results } = useSWR(['preset-cat', q], () => api.inventory.search(q).catch(() => []));
  return (
    <div className="mt-3 rounded-tool border border-brandring bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-ink">Izberi artikel</span>
        <button onClick={onClose} className="text-sm font-semibold text-muted hover:text-brand">zapri</button>
      </div>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Išči po nazivu, SKU, OEM…"
        className="mb-2 w-full rounded-tool border border-line bg-surface2 px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brandring" />
      <div className="flex max-h-56 flex-col gap-1 overflow-auto">
        {(results ?? []).length === 0 ? <p className="p-2 text-sm text-muted">Ni zadetkov.</p>
          : (results as any[]).map((it) => (
            <button key={it.id} type="button" onClick={() => onPick(it)}
              className="flex items-center justify-between rounded-tool px-2 py-1.5 text-left text-sm hover:bg-surface2">
              <span className="text-ink">{it.name} <span className="num text-xs text-muted2">{it.sku}</span></span>
              <span className="num text-muted">{formatMoneyMinor(it.priceMinor)}</span>
            </button>
          ))}
      </div>
    </div>
  );
}
