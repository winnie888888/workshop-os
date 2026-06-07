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
import { Button, Card, Sheet, Spinner, Stepper, TileButton } from '@/components/ui';

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
  if (!wo) return <Card className="p-6 text-center text-steel">Job not found.</Card>;

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => router.push('/mechanic')} className="self-start text-sm font-semibold text-steel">‹ Jobs</button>

      <VehicleBrief workOrderId={id} />

      <ClockControl running={running} workOrderId={id} onToggle={toggleClock} />

      <div className="grid grid-cols-2 gap-3">
        <TileButton tone="info" icon={<span className="text-2xl">📷</span>} label="Photo" badge={attachments || undefined} onClick={() => setSheet('photo')} />
        <TileButton tone="info" icon={<span className="text-2xl">🎤</span>} label="Note" onClick={() => setSheet('note')} />
        <TileButton tone="neutral" icon={<span className="text-2xl">🔩</span>} label="Part" onClick={() => setSheet('part')} />
        <TileButton tone="go" icon={<span className="text-2xl">✓</span>} label="Done" onClick={markDone} />
      </div>

      <button
        onClick={flagExtraWork}
        className="mt-1 flex items-center justify-center gap-2 rounded-tool border-2 border-hold/40
          bg-hold/10 px-4 py-3 font-display font-bold text-hold"
      >
        ⚠ Found extra work? Send for approval
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
      {doc.vehicle?.makeModel && <p className="font-display text-2xl font-bold tracking-tight">{doc.vehicle.makeModel}</p>}
      {doc.vehicle?.plate && <p className="font-mono text-lg text-steel">{doc.vehicle.plate}</p>}
      {doc.complaint && <p className="mt-2 text-lg">{doc.complaint}</p>}
    </div>
  );
}

function ClockControl({ running, workOrderId, onToggle }: { running: boolean; workOrderId: string; onToggle: () => void }) {
  const now = useNow();
  const startedAt = clockStartedAt(workOrderId);
  const elapsed = running && startedAt ? Math.floor((now - Date.parse(startedAt)) / 1000) : 0;
  return (
    <Card className={`flex flex-col items-center gap-4 p-6 ${running ? 'bg-go/10' : ''}`}>
      <div className="font-mono text-5xl font-bold tracking-tight">{running ? formatClock(elapsed) : '00:00:00'}</div>
      <Button tone={running ? 'stop' : 'go'} size="xl" full onClick={onToggle}>
        {running ? '■ Stop work' : '▶ Start work'}
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
    <Sheet open={open} onClose={onClose} title="Add photo">
      <label className="tool-tap flex flex-col items-center justify-center gap-3 rounded-tool border-2
        border-dashed border-ink/20 bg-panel p-8">
        <span className="text-4xl">{busy ? '⏳' : '📷'}</span>
        <span className="font-display text-xl font-bold">{busy ? 'Uploading…' : 'Take a photo'}</span>
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
    <Sheet open={open} onClose={onClose} title="Add note">
      <button onClick={dictate} className={`tool-tap mb-3 flex w-full items-center justify-center gap-3 rounded-tool
        border-2 ${listening ? 'border-stop bg-stop/10 text-stop' : 'border-info bg-info/10 text-info'} p-5 font-display text-xl font-bold`}>
        {listening ? '● Listening…' : '🎤 Dictate'}
      </button>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Or type a short note"
        className="w-full rounded-tool border-2 border-line bg-panel p-3 text-lg focus:border-info focus:outline-none"
      />
      <div className="mt-3"><Button tone="go" size="lg" full onClick={saveNote} disabled={busy || (!text.trim())}>
        {busy ? 'Saving…' : 'Save note'}
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
    <Sheet open={open} onClose={onClose} title="Add part">
      <button className="tool-tap mb-3 flex w-full items-center justify-center gap-3 rounded-tool border-2
        border-ink/15 bg-panel p-5 font-display text-xl font-bold">
        📷 Scan barcode
      </button>
      <p className="mb-2 text-center text-sm font-semibold uppercase tracking-wide text-steel">or pick / type</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Part name"
        className="mb-4 w-full rounded-tool border-2 border-line bg-panel p-3 text-lg focus:border-info focus:outline-none"
      />
      <div className="mb-4 flex items-center justify-between">
        <span className="font-display text-lg font-bold">Quantity</span>
        <Stepper value={qty} onChange={setQty} />
      </div>
      <Button tone="go" size="lg" full onClick={addPart} disabled={!name.trim()}>Add</Button>
    </Sheet>
  );
}
