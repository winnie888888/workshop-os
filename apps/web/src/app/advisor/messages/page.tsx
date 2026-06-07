'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button, Card, ProblemBanner } from '@/components/ui';
import { SelectField, TextField } from '@/components/form';
import {
  convStore, seedDemoIfEmpty, newMessage, makeConversation, type Conversation,
} from '@/lib/messages-store';

function fmt(at: string) {
  return new Date(at).toLocaleString('sl-SI', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function MessagesPage() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [body, setBody] = useState('');
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [nf, setNf] = useState({ customerId: '', customerName: '', phone: '', body: '' });

  const refresh = useCallback(() => {
    convStore.list(100).then((list) => setConvs([...list].sort((a, b) => b.lastAt.localeCompare(a.lastAt))));
  }, []);
  useEffect(() => { seedDemoIfEmpty().then(refresh); }, [refresh]);
  useEffect(() => { api.customers.list().then((c) => setCustomers(c as any[])).catch(() => setCustomers([])); }, []);

  const selected = convs.find((c) => c.id === selectedId) ?? null;

  async function send() {
    if (!selected || !body.trim()) return;
    const updated: Conversation = { ...selected, messages: [...selected.messages, newMessage('out', body.trim())], lastAt: new Date().toISOString() };
    await convStore.save(updated); setBody(''); refresh(); setSavedNote('Demo: SMS poslan.');
  }

  async function createConversation() {
    if (!nf.body.trim() || (!nf.customerName.trim() && !nf.customerId)) { setError('Izberite stranko in vnesite sporočilo.'); return; }
    const c = customers.find((x) => x.id === nf.customerId);
    const conv = makeConversation(c?.name ?? nf.customerName, nf.phone, nf.customerId || undefined);
    conv.messages = [newMessage('out', nf.body.trim())]; conv.lastAt = conv.messages[0].at;
    await convStore.save(conv); refresh(); setShowNew(false); setSelectedId(conv.id);
    setNf({ customerId: '', customerName: '', phone: '', body: '' }); setError(null); setSavedNote('Demo: SMS poslan.');
  }

  const customerOptions = [{ value: '', label: 'Brez / ročno' }, ...customers.map((c) => ({ value: c.id, label: c.name ?? c.id }))];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Sporočila</h1>
        <Button tone="go" onClick={() => { setShowNew(true); setSelectedId(null); }}>+ Novo sporočilo</Button>
      </div>

      {savedNote && <ProblemBanner tone="go" message={savedNote} />}

      {showNew ? (
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-base font-bold text-ink">Novo sporočilo</h2>
          {error && <ProblemBanner message={error} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Stranka" value={nf.customerId} onChange={(id) => { const c = customers.find((x) => x.id === id); setNf((p) => ({ ...p, customerId: id, customerName: c?.name ?? p.customerName })); }} options={customerOptions} />
            <TextField label="Telefon" value={nf.phone} onChange={(v) => setNf((p) => ({ ...p, phone: v }))} placeholder="+386 …" mono />
          </div>
          {!nf.customerId && <TextField label="Naziv stranke (ročno)" value={nf.customerName} onChange={(v) => setNf((p) => ({ ...p, customerName: v }))} />}
          <TextField label="Sporočilo" value={nf.body} onChange={(v) => setNf((p) => ({ ...p, body: v }))} placeholder="Besedilo SMS…" />
          <div className="flex justify-end gap-2">
            <Button tone="neutral" onClick={() => { setShowNew(false); setError(null); }}>Prekliči</Button>
            <Button tone="go" onClick={createConversation}>Pošlji</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          {/* Seznam niti */}
          <Card className={`overflow-hidden ${selected ? 'hidden lg:block' : ''}`}>
            {convs.length === 0 ? (
              <p className="p-8 text-center text-muted">Ni pogovorov.</p>
            ) : (
              <ul className="divide-y divide-line">
                {convs.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => setSelectedId(c.id)} className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-surface2 ${selectedId === c.id ? 'bg-brandweak' : ''}`}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-bold text-ink">{c.customerName}</span>
                        <span className="num shrink-0 text-[0.7rem] text-muted2">{fmt(c.lastAt)}</span>
                      </span>
                      <span className="truncate text-sm text-muted">{c.messages[c.messages.length - 1]?.body ?? ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Nit */}
          <Card className={`flex min-h-[24rem] flex-col ${selected ? '' : 'hidden lg:flex'}`}>
            {!selected ? (
              <p className="flex flex-1 items-center justify-center p-8 text-center text-muted">Izberite pogovor.</p>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <button onClick={() => setSelectedId(null)} className="grid h-8 w-8 place-items-center rounded-tool text-muted hover:bg-surface2 lg:hidden">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{selected.customerName}</p>
                    {selected.phone && <p className="num text-xs text-muted2">{selected.phone}</p>}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
                  {selected.messages.map((m) => (
                    <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.direction === 'out' ? 'self-end bg-brand text-white' : 'self-start bg-surface2 text-ink'}`}>
                      <p>{m.body}</p>
                      <p className={`num mt-1 text-[0.65rem] ${m.direction === 'out' ? 'text-white/70' : 'text-muted2'}`}>{fmt(m.at)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 border-t border-line p-3">
                  <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                    placeholder="Napiši sporočilo…" className="flex-1 rounded-tool border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brandring" />
                  <Button tone="go" onClick={send} disabled={!body.trim()}>Pošlji</Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      <p className="text-xs text-muted2">Sporočila so shranjena lokalno (demo pošiljanje); pripravljeno za priklop SMS ponudnika.</p>
    </div>
  );
}
