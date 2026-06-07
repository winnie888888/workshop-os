'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, SoftChip, ProblemBanner } from '@/components/ui';
import { TextField } from '@/components/form';
import { countStore, makeCountSession, makeCountLine, type CountSession, type CountLine } from '@/lib/stock-ops-store';

const inputCls = 'w-full rounded-tool border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brandring';

export default function StocktakePage() {
  const [session, setSession] = useState<CountSession>(() => makeCountSession());
  const [history, setHistory] = useState<CountSession[]>([]);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const refresh = useCallback(() => { countStore.list(10).then(setHistory); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  function updateLine(id: string, patch: Partial<CountLine>) {
    setSession((s) => ({ ...s, lines: s.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  }
  function addLine() { setSession((s) => ({ ...s, lines: [...s.lines, makeCountLine()] })); }
  function removeLine(id: string) { setSession((s) => ({ ...s, lines: s.lines.length > 1 ? s.lines.filter((l) => l.id !== id) : s.lines })); }

  async function save(status: CountSession['status']) {
    const s = { ...session, status };
    await countStore.save(s); setSession(s); refresh();
    setSavedNote(status === 'closed' ? 'Popis zaključen.' : 'Popis shranjen.');
  }
  function loadSession(s: CountSession) { setSession({ ...s }); setSavedNote(null); }

  const counted = session.lines.filter((l) => l.item.trim()).length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Inventura</h1>
        <div className="flex items-center gap-2">
          <SoftChip tone={session.status === 'closed' ? 'go' : 'hold'}>{session.status === 'closed' ? 'zaključen' : 'odprt'}</SoftChip>
          <Button tone="neutral" onClick={() => { setSession(makeCountSession()); setSavedNote(null); }}>Nov popis</Button>
        </div>
      </div>

      {savedNote && <ProblemBanner tone="go" message={savedNote} />}

      <Card className="flex flex-col gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Lokacija" value={session.location} onChange={(v) => setSession((s) => ({ ...s, location: v }))} />
          <div className="flex items-end text-sm text-muted">Preštetih postavk: <span className="num ml-1 font-bold text-ink">{counted}</span></div>
        </div>

        <div>
          <div className="mb-2 grid grid-cols-[1fr_6rem_2rem] gap-2 px-1 text-[0.65rem] font-bold uppercase tracking-wide text-muted2">
            <span>Artikel</span><span className="text-right">Prešteto</span><span></span>
          </div>
          <div className="flex flex-col gap-2">
            {session.lines.map((l) => (
              <div key={l.id} className="grid grid-cols-[1fr_6rem_2rem] items-center gap-2">
                <input className={inputCls} value={l.item} onChange={(e) => updateLine(l.id, { item: e.target.value })} placeholder="naziv ali SKU" />
                <input className={`${inputCls} num text-right`} value={l.counted} inputMode="decimal" onChange={(e) => updateLine(l.id, { counted: e.target.value })} />
                <button onClick={() => removeLine(l.id)} title="Odstrani" className="grid h-8 w-8 place-items-center rounded-tool text-muted2 hover:bg-stop/10 hover:text-stop">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg>
                </button>
              </div>
            ))}
          </div>
          <button onClick={addLine} className="mt-2 text-sm font-semibold text-brand hover:underline">+ Dodaj postavko</button>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button tone="neutral" onClick={() => save('open')}>Shrani osnutek</Button>
          <Button tone="go" onClick={() => save('closed')}>Zaključi popis</Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-3"><h2 className="text-base font-bold text-ink">Pretekli popisi</h2></div>
        {history.length === 0 ? <p className="p-8 text-center text-muted">Še ni popisov.</p> : (
          <ul className="divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <button onClick={() => loadSession(h)} className="text-left">
                  <p className="font-bold text-ink">{h.location}</p>
                  <p className="num text-xs text-muted2">{new Date(h.createdAt).toLocaleString('sl-SI')} · {h.lines.filter((l) => l.item.trim()).length} postavk</p>
                </button>
                <SoftChip tone={h.status === 'closed' ? 'go' : 'hold'}>{h.status === 'closed' ? 'zaključen' : 'odprt'}</SoftChip>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
