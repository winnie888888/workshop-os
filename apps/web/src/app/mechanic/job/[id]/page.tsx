'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { getSession } from '@/lib/session';
import { enqueue } from '@/lib/offline-queue';
import { startClock, stopClock, clockStartedAt, reconcileFromServer } from '@/lib/clock';
import { addPendingAttachment, pendingAttachmentCount } from '@/lib/attachments';
import { uploadPhoto, uploadVoiceNote } from '@/lib/uploads';
import { formatClock } from '@/lib/format';
import { useNow } from '@/lib/hooks';
import { Button, Card, Sheet, Spinner, Stepper } from '@/components/ui';

/*
 * The Job screen. Top: the vehicle + complaint brief (read-only). Centre: the
 * large clock control. Below: the four field actions as big equal tiles. Bottom:
 * the quieter "found extra work" path. No prices, no VAT, no invoice — nothing
 * from the Mechanic UX Principles' forbidden list.
 */
export default function JobScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = getSession();
  const mechanicId = session?.user.mechanicId ?? '';

  const { data: wo, isLoading, mutate } = useSWR(['wo', id], () => api.workOrders.get(id));

  // Reconcile the local timer from the server's open entry for this mechanic.
  useEffect(() => {
    if (!wo) return;
    const mine = wo.timeEntries.find((t) => t.mechanicId === mechanicId && t.endedAt === null);
    reconcileFromServer(id, mine ? mine.startedAt : null);
  }, [wo, id, mechanicId]);

  const [running, setRunning] = useState<boolean>(() => !!clockStartedAt(id));
  useEffect(() => { setRunning(!!clockStartedAt(id)); }, [wo, id]);

  const [sheet, setSheet] = useState<null | 'photo' | 'note' | 'part'>(null);
  const [attachments, setAttachments] = useState(0);
  useEffect(() => { setAttachments(pendingAttachmentCount(id)); }, [id, sheet]);

  function toggleClock() {
    if (running) {
      stopClock(id);
      setRunning(false);
      enqueue('time.clock_off', { workOrderId: id, mechanicId });
    } else {
      startClock(id);
      setRunning(true);
      enqueue('time.clock_on', { workOrderId: id, mechanicId });
    }
  }

  function markDone() {
    // The mechanic's "done" advances the job to ready; if still clocked on, stop
    // first so labour is closed before the job leaves the bay.
    if (running) { stopClock(id); setRunning(false); enqueue('time.clock_off', { workOrderId: id, mechanicId }); }
    enqueue('work_order.transition', { workOrderId: id, to: 'ready' });
    router.push('/mechanic');
  }

  function flagExtraWork() {
    enqueue('work_order.transition', { workOrderId: id, to: 'awaiting_approval' });
    router.push('/mechanic');
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner className="text-info" /></div>;
  if (!wo) return <Card className="p-6 text-center text-muted">Nalog ni najden.</Card>;

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => router.push('/mechanic')} className="self-start text-sm font-semibold text-white/70">‹ Nalogi</button>

      <VehicleBrief workOrderId={id} />

      <ClockControl running={running} workOrderId={id} onToggle={toggleClock} />

      <div className="grid grid-cols-2 gap-3">
        <ActionTile color="#2563eb" label="Foto" badge={attachments || undefined} onClick={() => setSheet('photo')}
          icon={<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>} />
        <ActionTile color="#d97706" label="Opomba" onClick={() => setSheet('note')}
          icon={<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/></svg>} />
        <ActionTile color="#7c3aed" label="Del" onClick={() => setSheet('part')}
          icon={<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 1 5.4-5.4l-2.7 2.7-2.3-.4-.4-2.3 2.7-2.7Z"/></svg>} />
        <ActionTile color="#16a34a" label="Zaključi" onClick={markDone}
          icon={<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>} />
      </div>

      <button
        onClick={flagExtraWork}
        className="mt-1 flex items-center justify-center gap-2 rounded-tool border border-safety bg-safety/15 px-4 py-3 font-bold text-safety"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
        Dodatno delo? Pošlji v odobritev
      </button>

      <PhotoSheet open={sheet === 'photo'} onClose={() => setSheet(null)} workOrderId={id} />
      <NoteSheet open={sheet === 'note'} onClose={() => setSheet(null)} workOrderId={id} />
      <PartSheet open={sheet === 'part'} onClose={() => setSheet(null)} workOrderId={id} onAdded={() => mutate()} />
    </div>
  );
}

function VehicleBrief({ workOrderId }: { workOrderId: string }) {
  const { data } = useSWR(['nalog', workOrderId], () => api.workOrders.nalog(workOrderId).catch(() => null));
  const doc = data as any;
  if (!doc) return null;
  return (
    <div>
      {doc.vehicle?.makeModel && <p className="text-2xl font-extrabold tracking-tight text-white">{doc.vehicle.makeModel}</p>}
      {doc.vehicle?.plate && <p className="num text-lg text-white/60">{doc.vehicle.plate}</p>}
      {doc.complaint && <p className="mt-2 text-lg text-white/90">{doc.complaint}</p>}
    </div>
  );
}

function ClockControl({ running, workOrderId, onToggle }: { running: boolean; workOrderId: string; onToggle: () => void }) {
  const now = useNow();
  const startedAt = clockStartedAt(workOrderId);
  const elapsed = running && startedAt ? Math.floor((now - Date.parse(startedAt)) / 1000) : 0;
  return (
    <Card className={`flex flex-col items-center gap-4 p-6 ${running ? 'bg-go/10' : ''}`}>
      <div className="num text-5xl font-bold tracking-tight text-ink">{running ? formatClock(elapsed) : '00:00:00'}</div>
      <Button tone={running ? 'stop' : 'go'} size="xl" full onClick={onToggle}>
        <span className="inline-flex items-center gap-2">
          {running
            ? <><svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg> Ustavi delo</>
            : <><svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Začni delo</>}
        </span>
      </Button>
    </Card>
  );
}

/* ---------------- Capture sheets ---------------- */

function PhotoSheet({ open, onClose, workOrderId }: { open: boolean; onClose: () => void; workOrderId: string }) {
  // Web camera capture via a file input bound to the device camera. The
  // captured image is uploaded to the server through the presign→PUT→complete
  // workflow (uploads.ts); if offline it is preserved locally and flushed later.
  const [busy, setBusy] = useState(false);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    await uploadPhoto(workOrderId, file);
    setBusy(false);
    onClose();
  }
  return (
    <Sheet open={open} onClose={onClose} title="Dodaj fotografijo">
      <label className="flex flex-col items-center justify-center gap-3 rounded-tool border border-dashed border-linestrong bg-surface2 p-8">
        {busy ? <Spinner className="text-brand" /> : <svg viewBox="0 0 24 24" className="h-10 w-10 text-brand" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
        <span className="text-xl font-bold text-ink">{busy ? 'Nalagam…' : 'Posnemi fotografijo'}</span>
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} disabled={busy} />
      </label>
    </Sheet>
  );
}

function NoteSheet({ open, onClose, workOrderId }: { open: boolean; onClose: () => void; workOrderId: string }) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<{ media?: MediaRecorder; chunks: Blob[] }>({ chunks: [] });

  // On-device voice-to-text via the Web Speech API for the transcript, and a
  // parallel MediaRecorder capture of the audio itself so the original
  // recording is uploaded alongside the text. Both are best-effort: if the
  // browser lacks one, the other still works.
  async function dictate() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    // Start audio capture (for the uploaded file).
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      recRef.current = { media, chunks: [] };
      media.ondataavailable = (ev) => { if (ev.data.size) recRef.current.chunks.push(ev.data); };
      media.start();
    } catch { /* no mic — transcript-only */ }

    if (SR) {
      const rec = new SR();
      rec.lang = 'sl-SI';
      rec.interimResults = false;
      rec.onresult = (ev: any) => setText((t) => `${t} ${ev.results[0][0].transcript}`.trim());
      rec.onend = () => setListening(false);
      setListening(true);
      rec.start();
    }
  }

  function stopAudio(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const media = recRef.current.media;
      if (!media || media.state === 'inactive') return resolve(null);
      media.onstop = () => resolve(new Blob(recRef.current.chunks, { type: 'audio/webm' }));
      media.stop();
      media.stream.getTracks().forEach((t) => t.stop());
    });
  }

  async function saveNote() {
    setBusy(true);
    const audio = await stopAudio();
    if (audio && audio.size > 0) {
      // Upload the recording with its transcript.
      await uploadVoiceNote(workOrderId, audio, text.trim());
    } else if (text.trim()) {
      // Transcript-only note (no audio captured): store as a pending text note.
      addPendingAttachment(workOrderId, { kind: 'note', text: text.trim(), at: Date.now() });
    }
    setBusy(false);
    setText('');
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Dodaj opombo">
      <button onClick={dictate} className={`mb-3 flex w-full items-center justify-center gap-3 rounded-tool border ${listening ? 'border-stop bg-stop/10 text-stop' : 'border-brand bg-brandweak text-brand'} p-5 text-xl font-bold`}>
        {listening
          ? <><span className="h-3 w-3 animate-pulse rounded-full bg-stop" /> Poslušam…</>
          : <><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/></svg> Narekuj</>}
      </button>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Ali natipkaj kratko opombo"
        className="w-full rounded-tool border border-linestrong bg-surface p-3 text-lg focus:border-brandring focus:outline-none"
      />
      <div className="mt-3"><Button tone="go" size="lg" full onClick={saveNote} disabled={busy || (!text.trim())}>
        {busy ? 'Shranjujem…' : 'Shrani opombo'}
      </Button></div>
    </Sheet>
  );
}

function PartSheet({ open, onClose, workOrderId, onAdded }: {
  open: boolean; onClose: () => void; workOrderId: string; onAdded: () => void;
}) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);

  // "Add part" creates a part line on the work order via the idempotent sync
  // queue (work_order.add_line). The mechanic supplies what they fit and how
  // many; price and stock location are the advisor/warehouse concern, so the
  // line is added unpriced (advisor finalises) with a client lineId for safe
  // replay. Scanning would set inventoryItemId; the manual path is the fallback.
  function addPart() {
    if (!name.trim()) return;
    enqueue('work_order.add_line', {
      workOrderId,
      line: {
        lineId: crypto.randomUUID(),
        type: 'part',
        description: name.trim(),
        quantity: String(qty),
        unitPriceMinor: 0,
      },
    });
    setName(''); setQty(1);
    onAdded();
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Dodaj del">
      <button className="mb-3 flex w-full items-center justify-center gap-3 rounded-tool border border-linestrong bg-surface2 p-5 text-xl font-bold text-ink">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14"/></svg>
        Skeniraj črtno kodo
      </button>
      <p className="mb-2 text-center text-sm font-semibold uppercase tracking-wide text-steel">ali izberi / natipkaj</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Naziv dela"
        className="mb-4 w-full rounded-tool border border-linestrong bg-surface p-3 text-lg focus:border-brandring focus:outline-none"
      />
      <div className="mb-4 flex items-center justify-between">
        <span className="text-lg font-bold text-ink">Količina</span>
        <Stepper value={qty} onChange={setQty} />
      </div>
      <Button tone="go" size="lg" full onClick={addPart} disabled={!name.trim()}>Dodaj</Button>
    </Sheet>
  );
}

function ActionTile({ color, label, icon, badge, onClick }: {
  color: string; label: string; icon: React.ReactNode; badge?: number; onClick?: () => void;
}) {
  return (
    <button onClick={onClick}
      className="relative flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-card text-white shadow-card transition active:translate-y-px"
      style={{ background: color }}>
      {icon}
      <span className="text-lg font-bold tracking-tight">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-3 top-3 flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-1.5 text-sm font-bold" style={{ color }}>{badge}</span>
      )}
    </button>
  );
}
