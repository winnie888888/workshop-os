'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, SoftChip, ProblemBanner } from '@/components/ui';
import { SelectField, TextField } from '@/components/form';
import { movementStore, makeMovement, moveTypeLabel, type StockMovement, type MoveType } from '@/lib/stock-ops-store';

export default function MovementsPage() {
  const [list, setList] = useState<StockMovement[]>([]);
  const [form, setForm] = useState<StockMovement | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => { movementStore.list(50).then(setList); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  function setF<K extends keyof StockMovement>(k: K, v: StockMovement[K]) { setForm((p) => (p ? { ...p, [k]: v } : p)); }
  async function save() {
    if (!form) return;
    if (!form.item.trim() || !form.qty.trim()) { setError('Vnesite artikel in količino.'); return; }
    await movementStore.save(form); setForm(null); refresh(); setSavedNote('Premik zabeležen.'); setError(null);
  }

  const tone = (t: MoveType) => (t === 'in' ? 'go' : t === 'out' ? 'stop' : t === 'transfer' ? 'info' : 'hold');

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Premiki zaloge</h1>
        <Button tone="go" onClick={() => { setForm(makeMovement()); setSavedNote(null); setError(null); }}>+ Nov premik</Button>
      </div>

      {savedNote && <ProblemBanner tone="go" message={savedNote} />}

      {form && (
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-base font-bold text-ink">Nov premik</h2>
          {error && <ProblemBanner message={error} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Artikel" value={form.item} onChange={(v) => setF('item', v)} placeholder="naziv ali SKU" />
            <TextField label="Količina" value={form.qty} onChange={(v) => setF('qty', v)} mono />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="Vrsta" value={form.type} onChange={(v) => setF('type', v as MoveType)}
              options={[{ value: 'in', label: 'Prejem' }, { value: 'out', label: 'Izdaja' }, { value: 'transfer', label: 'Premik' }, { value: 'adjust', label: 'Korekcija' }]} />
            <TextField label="Iz lokacije" value={form.fromLoc} onChange={(v) => setF('fromLoc', v)} />
            <TextField label="Na lokacijo" value={form.toLoc} onChange={(v) => setF('toLoc', v)} />
          </div>
          <TextField label="Opomba" value={form.note} onChange={(v) => setF('note', v)} />
          <div className="flex justify-end gap-2">
            <Button tone="neutral" onClick={() => setForm(null)}>Prekliči</Button>
            <Button tone="go" onClick={save}>Zabeleži</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-3"><h2 className="text-base font-bold text-ink">Zadnji premiki</h2></div>
        {list.length === 0 ? <p className="p-8 text-center text-muted">Še ni premikov.</p> : (
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
              <tr><th className="px-5 py-2.5 font-bold">Datum</th><th className="px-4 py-2.5 font-bold">Artikel</th><th className="px-4 py-2.5 text-right font-bold">Kol.</th><th className="px-4 py-2.5 font-bold">Vrsta</th><th className="hidden px-5 py-2.5 font-bold sm:table-cell">Lokacija</th></tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <td className="num px-5 py-3 text-muted2">{new Date(m.createdAt).toLocaleDateString('sl-SI')}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{m.item}</td>
                  <td className="num px-4 py-3 text-right text-ink">{m.qty}</td>
                  <td className="px-4 py-3"><SoftChip tone={tone(m.type)}>{moveTypeLabel(m.type)}</SoftChip></td>
                  <td className="hidden px-5 py-3 text-muted sm:table-cell">{[m.fromLoc, m.toLoc].filter(Boolean).join(' → ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
