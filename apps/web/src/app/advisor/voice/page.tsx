'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  voiceStore, processTranscript, makeVoiceEntry, priorityLabel,
  VOICE_DEMO_TRANSCRIPT, type VoiceEntry, type VoicePriority,
} from '@/lib/voice-intake';
import { Button, Card, SoftChip, Spinner, ProblemBanner } from '@/components/ui';
import { SelectField, TextAreaField } from '@/components/form';

/*
 * Glasovni vnos naloga — narekuj problem vozila; sistem naredi strukturiran
 * predlog (povzetek, simptomi, diagnostika, delo, deli, prioriteta), ki ga
 * lahko urediš in shraniš. Deluje brez ključev: Web Speech API če je na voljo,
 * sicer ročni vnos; ekstrakcija je lokalna (mock), shramba v localStorage.
 */

type Status = 'idle' | 'recording' | 'processing' | 'review' | 'saved' | 'error';

const STATUS_META: Record<Status, { label: string; tone: 'neutral' | 'info' | 'hold' | 'go' | 'stop' }> = {
  idle: { label: 'Pripravljeno', tone: 'neutral' },
  recording: { label: 'Snemanje', tone: 'stop' },
  processing: { label: 'Obdelava', tone: 'hold' },
  review: { label: 'Predlog pripravljen', tone: 'info' },
  saved: { label: 'Shranjeno', tone: 'go' },
  error: { label: 'Napaka', tone: 'stop' },
};

const linesToArr = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export default function VoiceWorkOrderPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<VoiceEntry[]>([]);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  // Editable structured draft (owned by the human after extraction)
  const [summary, setSummary] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [diagnostics, setDiagnostics] = useState('');
  const [workItems, setWorkItems] = useState('');
  const [parts, setParts] = useState('');
  const [priority, setPriority] = useState<VoicePriority>('normal');
  const [notes, setNotes] = useState('');

  const recRef = useRef<any>(null);
  const finalRef = useRef('');
  const sttSupported = typeof window !== 'undefined'
    && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const refreshHistory = useCallback(() => { voiceStore.list(10).then(setHistory); }, []);
  useEffect(() => { refreshHistory(); }, [refreshHistory]);

  function startRecording() {
    setError(null); setSavedNote(null);
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError('Snemanje glasu ni podprto v tem brskalniku. Uporabite ročni vnos spodaj.'); return; }
    const rec = new SR();
    rec.lang = 'sl-SI';
    rec.continuous = true;
    rec.interimResults = true;
    finalRef.current = transcript ? transcript.trim() + ' ' : '';
    rec.onresult = (e: any) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const txt = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += txt + ' ';
        else interimText += txt;
      }
      setTranscript(finalRef.current.trim());
      setInterim(interimText);
    };
    rec.onerror = (e: any) => {
      setError(e?.error === 'not-allowed' ? 'Dostop do mikrofona zavrnjen.' : 'Napaka pri snemanju glasu.');
      setStatus('error');
    };
    rec.onend = () => { setInterim(''); setStatus((s) => (s === 'recording' ? 'idle' : s)); };
    recRef.current = rec;
    rec.start();
    setStatus('recording');
  }

  function stopRecording() {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    recRef.current = null;
    setInterim('');
    setStatus('idle');
  }

  function loadDemo() {
    if (status === 'recording') stopRecording();
    setError(null); setSavedNote(null);
    setTranscript(VOICE_DEMO_TRANSCRIPT);
  }

  async function runExtract() {
    const t = transcript.trim();
    if (!t) { setError('Najprej narekujte ali vnesite besedilo.'); return; }
    if (status === 'recording') stopRecording();
    setError(null); setSavedNote(null); setStatus('processing');
    try {
      const d = await processTranscript(t);
      setSummary(d.summary);
      setSymptoms(d.symptoms.join('\n'));
      setDiagnostics(d.suggestedDiagnostics.join('\n'));
      setWorkItems(d.suggestedWorkItems.join('\n'));
      setParts(d.suggestedParts.join('\n'));
      setPriority(d.priority);
      setNotes(d.mechanicNotes);
      setStatus('review');
    } catch {
      setError('Obdelava ni uspela.'); setStatus('error');
    }
  }

  function buildEntry(): VoiceEntry {
    return makeVoiceEntry(transcript.trim(), {
      summary: summary.trim(),
      symptoms: linesToArr(symptoms),
      suggestedDiagnostics: linesToArr(diagnostics),
      suggestedWorkItems: linesToArr(workItems),
      suggestedParts: linesToArr(parts),
      priority,
      mechanicNotes: notes.trim(),
    });
  }

  async function saveAsNote() {
    setBusy(true); setError(null);
    try {
      const entry = { ...buildEntry(), status: 'saved' as const };
      await voiceStore.save(entry);
      setSavedNote('Shranjeno kot opomba.');
      setStatus('saved'); refreshHistory();
    } catch { setError('Shranjevanje ni uspelo.'); }
    finally { setBusy(false); }
  }

  async function addToWorkOrder() {
    setBusy(true); setError(null);
    try {
      // Prava povezava z delovnim nalogom še ni vzpostavljena -> demo povezava.
      const demoWo = `DN-DEMO-${Date.now().toString().slice(-5)}`;
      const entry = { ...buildEntry(), status: 'linked' as const, workOrderId: demoWo };
      await voiceStore.save(entry);
      setSavedNote(`Demo shranjeno - pripeto na nalog ${demoWo}.`);
      setStatus('saved'); refreshHistory();
    } catch { setError('Shranjevanje ni uspelo.'); }
    finally { setBusy(false); }
  }

  function reset() {
    setTranscript(''); setInterim(''); setSummary(''); setSymptoms(''); setDiagnostics('');
    setWorkItems(''); setParts(''); setNotes(''); setPriority('normal'); setSavedNote(null);
    setError(null); setStatus('idle');
  }

  const meta = STATUS_META[status];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Glasovni vnos naloga</h1>
          <p className="text-sm text-muted">Narekujte opažanja - sistem pripravi strukturiran predlog.</p>
        </div>
        <SoftChip tone={meta.tone}>{meta.label}</SoftChip>
      </div>

      {error && <ProblemBanner message={error} />}
      {savedNote && <ProblemBanner tone="go" message={savedNote} />}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Snemanje / vnos */}
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex flex-col items-center gap-3 rounded-card bg-surface2 p-6">
            <button
              onClick={status === 'recording' ? stopRecording : startRecording}
              disabled={!sttSupported && status !== 'recording'}
              className={`grid h-24 w-24 place-items-center rounded-full text-white shadow-lift transition active:translate-y-px
                ${status === 'recording' ? 'animate-pulse bg-stop' : sttSupported ? 'bg-brand hover:bg-brand600' : 'bg-muted2'}`}>
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2">
                {status === 'recording'
                  ? <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
                  : <><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>}
              </svg>
            </button>
            <p className="text-sm font-semibold text-steel">
              {status === 'recording' ? 'Snemanje... tapnite za ustavitev'
                : sttSupported ? 'Tapnite za začetek snemanja'
                : 'Snemanje ni podprto - uporabite ročni vnos'}
            </p>
            <button onClick={loadDemo} className="text-sm font-semibold text-brand hover:underline">Naloži demo primer</button>
          </div>

          <TextAreaField
            label="Prepis / ročni vnos"
            value={interim ? `${transcript} ${interim}`.trim() : transcript}
            onChange={setTranscript}
            rows={6}
            placeholder="Narekujte ali vnesite opažanja stranke / mehanika..."
          />

          <div className="flex justify-end gap-2">
            {(status === 'review' || status === 'saved') && (
              <Button tone="neutral" onClick={reset}>Počisti</Button>
            )}
            <Button tone="info" size="lg" onClick={runExtract} disabled={busy || status === 'processing'}>
              {status === 'processing' ? <Spinner /> : 'Obdelaj v predlog'}
            </Button>
          </div>
        </Card>

        {/* AI rezultat */}
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-base font-bold text-ink">AI predlog naloga</h2>
          {status === 'processing' ? (
            <div className="flex flex-1 items-center justify-center py-10 text-muted"><Spinner className="text-brand" /></div>
          ) : status !== 'review' && status !== 'saved' ? (
            <p className="flex flex-1 items-center justify-center py-10 text-center text-sm text-muted">
              Predlog se prikaže po obdelavi narekovanega ali vnesenega besedila.
            </p>
          ) : (
            <>
              <TextAreaField label="Povzetek" value={summary} onChange={setSummary} rows={2} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextAreaField label="Simptomi (vsak v svojo vrstico)" value={symptoms} onChange={setSymptoms} rows={4} />
                <TextAreaField label="Predlagana diagnostika" value={diagnostics} onChange={setDiagnostics} rows={4} />
                <TextAreaField label="Predlagano delo" value={workItems} onChange={setWorkItems} rows={4} />
                <TextAreaField label="Predlagani deli / materiali" value={parts} onChange={setParts} rows={4} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Prioriteta" value={priority} onChange={(v) => setPriority(v as VoicePriority)}
                  options={[{ value: 'low', label: 'Nizka' }, { value: 'normal', label: 'Običajna' }, { value: 'high', label: 'Visoka' }, { value: 'urgent', label: 'Nujno' }]} />
                <div className="flex items-end">
                  <SoftChip tone={priority === 'urgent' || priority === 'high' ? 'stop' : 'info'}>Prioriteta: {priorityLabel(priority)}</SoftChip>
                </div>
              </div>
              <TextAreaField label="Opombe za mehanika" value={notes} onChange={setNotes} rows={2} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button tone="neutral" onClick={saveAsNote} disabled={busy}>{busy ? <Spinner /> : 'Shrani kot opombo'}</Button>
                <Button tone="go" size="lg" onClick={addToWorkOrder} disabled={busy}>{busy ? <Spinner /> : 'Dodaj na delovni nalog'}</Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Zgodovina */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-bold text-ink">Zadnji glasovni vnosi</h2>
          {history.length > 0 && (
            <button onClick={() => voiceStore.clear().then(refreshHistory)} className="text-xs font-semibold text-muted2 hover:text-stop">Počisti</button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="p-8 text-center text-muted">Še ni shranjenih vnosov.</p>
        ) : (
          <ul className="divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{h.summary}</p>
                  <p className="num mt-0.5 text-xs text-muted2">
                    {new Date(h.createdAt).toLocaleString('sl-SI')}
                    {h.workOrderId ? ` · ${h.workOrderId}` : ''} · {h.symptoms.length} simptomov
                  </p>
                </div>
                <SoftChip tone={h.status === 'linked' ? 'go' : h.status === 'saved' ? 'info' : 'neutral'}>
                  {h.status === 'linked' ? 'demo shranjeno' : h.status === 'saved' ? 'opomba' : h.status}
                </SoftChip>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
