'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Card } from '@/components/ui';

/* Sporočila stranke — nit s servisom. Lokalna shramba (demo pošiljanje),
 * swap-ready za pravi /portal/messages. */
interface PMsg { id: string; at: string; from: 'workshop' | 'customer'; body: string; }
const KEY = 'wos.portal.messages.v1';

function load(): PMsg[] {
  if (typeof window === 'undefined') return [];
  try { const r = window.localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch { /* ignore */ }
  const seed: PMsg[] = [
    { id: 'p1', at: new Date(Date.now() - 3600_000 * 6).toISOString(), from: 'workshop', body: 'Pozdravljeni! Tukaj lahko komunicirate s servisom A-SPRINT. Z veseljem odgovorimo na vprašanja o vašem vozilu.' },
  ];
  try { window.localStorage.setItem(KEY, JSON.stringify(seed)); } catch { /* ignore */ }
  return seed;
}
function save(msgs: PMsg[]) { try { window.localStorage.setItem(KEY, JSON.stringify(msgs)); } catch { /* ignore */ } }
function fmt(at: string) { return new Date(at).toLocaleString('sl-SI', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }

export default function PortalMessagesPage() {
  const [msgs, setMsgs] = useState<PMsg[]>([]);
  const [body, setBody] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMsgs(load()); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  function send() {
    if (!body.trim()) return;
    const next = [...msgs, { id: `m${Date.now()}`, at: new Date().toISOString(), from: 'customer' as const, body: body.trim() }];
    setMsgs(next); save(next); setBody('');
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Sporočila</h1>
        <p className="text-sm text-muted">Pogovor s servisom A-SPRINT.</p>
      </div>

      <Card className="flex min-h-[26rem] flex-col">
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
          {msgs.map((m) => (
            <div key={m.id} className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${m.from === 'customer' ? 'self-end bg-brand text-white' : 'self-start bg-surface2 text-ink'}`}>
              <p>{m.body}</p>
              <p className={`num mt-1 text-[0.65rem] ${m.from === 'customer' ? 'text-white/70' : 'text-muted2'}`}>{fmt(m.at)}</p>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="flex items-center gap-2 border-t border-line p-3">
          <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder="Napišite sporočilo…" className="flex-1 rounded-tool border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brandring" />
          <Button tone="go" onClick={send} disabled={!body.trim()}>Pošlji</Button>
        </div>
      </Card>
      <p className="text-xs text-muted2">Sporočila se shranijo lokalno (demo). V produkciji bodo povezana s servisom.</p>
    </div>
  );
}
