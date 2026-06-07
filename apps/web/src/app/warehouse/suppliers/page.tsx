'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button, Card, SoftChip, Spinner, ProblemBanner } from '@/components/ui';
import { TextField } from '@/components/form';
import { supplierLocalStore, makeSupplier, type Supplier } from '@/lib/suppliers-store';

export default function SuppliersPage() {
  const [list, setList] = useState<Supplier[] | null>(null);
  const [form, setForm] = useState<Supplier | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [apiList, localList] = await Promise.all([
      api.suppliers.list().catch(() => [] as any[]),
      supplierLocalStore.list(100),
    ]);
    const byName = new Map<string, Supplier>();
    localList.forEach((s) => byName.set((s.name || s.id).toLowerCase(), s));
    (apiList as any[]).forEach((s) => byName.set((s.name || s.id).toLowerCase(), { ...s, local: false }));
    setList(Array.from(byName.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  function setF<K extends keyof Supplier>(k: K, v: Supplier[K]) { setForm((p) => (p ? { ...p, [k]: v } : p)); }

  async function save() {
    if (!form) return;
    if (!form.name.trim()) { setError('Vnesite naziv dobavitelja.'); return; }
    setBusy(true); setError(null);
    // best-effort real API
    try { await api.suppliers.create({ name: form.name, vatId: form.vatId, email: form.email, phone: form.phone }); }
    catch { /* backend morda ni na voljo -> lokalno */ }
    await supplierLocalStore.save(form);
    setBusy(false); setForm(null); setSavedNote('Dobavitelj dodan.'); refresh();
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Dobavitelji</h1>
        <Button tone="go" onClick={() => { setForm(makeSupplier()); setSavedNote(null); setError(null); }}>+ Dodaj dobavitelja</Button>
      </div>

      {savedNote && <ProblemBanner tone="go" message={savedNote} />}

      {form && (
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-base font-bold text-ink">Nov dobavitelj</h2>
          {error && <ProblemBanner message={error} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Naziv" value={form.name} onChange={(v) => setF('name', v)} />
            <TextField label="ID za DDV" value={form.vatId ?? ''} onChange={(v) => setF('vatId', v)} placeholder="SI…" />
            <TextField label="E-pošta" value={form.email ?? ''} onChange={(v) => setF('email', v)} />
            <TextField label="Telefon" value={form.phone ?? ''} onChange={(v) => setF('phone', v)} mono />
          </div>
          <div className="flex justify-end gap-2">
            <Button tone="neutral" onClick={() => setForm(null)}>Prekliči</Button>
            <Button tone="go" onClick={save} disabled={busy}>{busy ? <Spinner /> : 'Shrani'}</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        {list === null ? <div className="p-6"><Spinner className="text-brand" /></div>
          : list.length === 0 ? <p className="p-8 text-center text-muted">Še ni dobaviteljev. Dodajte prvega.</p>
          : (
            <table className="w-full text-sm">
              <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
                <tr><th className="px-5 py-2.5 font-bold">Naziv</th><th className="px-4 py-2.5 font-bold">ID za DDV</th><th className="hidden px-4 py-2.5 font-bold sm:table-cell">E-pošta</th><th className="px-4 py-2.5 font-bold">Telefon</th><th className="px-5 py-2.5"></th></tr>
              </thead>
              <tbody>
                {list.map((s, i) => (
                  <tr key={s.id ?? i} className="border-t border-line">
                    <td className="px-5 py-3 font-semibold text-ink">{s.name}</td>
                    <td className="num px-4 py-3 text-muted">{s.vatId || '—'}</td>
                    <td className="hidden px-4 py-3 text-muted sm:table-cell">{s.email || '—'}</td>
                    <td className="num px-4 py-3 text-muted">{s.phone || '—'}</td>
                    <td className="px-5 py-3 text-right">{s.local && <SoftChip tone="neutral">lokalno</SoftChip>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Card>
    </div>
  );
}
