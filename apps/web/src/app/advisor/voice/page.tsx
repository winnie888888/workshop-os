'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { uploadDocument } from '@/lib/uploads';
import { displayPlate, statusLabel } from '@/lib/format';
import { Button, Card, Spinner, ProblemBanner } from '@/components/ui';

/*
 * Voice work order — speak a note, review the draft, confirm.
 *
 * This is the downstream door of the voice airlock. The design mirrors plate
 * scanning: the model proposes (a transcript and extracted fields), and a human
 * disposes (edits, picks create-vs-update, confirms). Nothing is saved until the
 * confirm tap, and saving goes through the existing work-order workflow.
 *
 * The screen is a small state machine:
 *   capture     — record audio (or choose a file)
 *   recording   — capturing from the microphone
 *   processing  — uploading + transcribing + extracting
 *   review      — show transcript + editable draft + resolved customer/vehicle,
 *                 choose create-or-update, confirm
 */

type Phase = 'capture' | 'recording' | 'processing' | 'review';

export default function VoiceWorkOrderPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('capture');
  const [draft, setDraft] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  // Editable review state (seeded from the draft, owned by the human).
  const [mode, setMode] = useState<'create' | 'update'>('create');
  const [complaint, setComplaint] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [updateWorkOrderId, setUpdateWorkOrderId] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        void processAudio(new File([blob], `note-${Date.now()}.webm`, { type: blob.type }));
      };
      recorderRef.current = rec;
      rec.start();
      setPhase('recording');
    } catch {
      setError('Microphone unavailable — choose an audio file instead.');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setPhase('processing');
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void processAudio(file);
  }

  async function processAudio(file: File) {
    setPhase('processing');
    setError(null);
    try {
      const up = await uploadDocument(file);
      if (!up.ok || !up.attachmentId) throw new Error(up.error ?? 'Upload failed');
      const d = await api.voice.draft(up.attachmentId);
      seedReview(d);
      setDraft(d);
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process the recording');
      setPhase('capture');
    }
  }

  // Seed the editable review state from the draft the backend returned. The
  // human owns it from here; the draft is only a starting point.
  function seedReview(d: any) {
    const dr = d.draft ?? {};
    setComplaint(dr.complaint ?? '');
    setWorkPerformed(dr.workPerformed ?? '');
    setCustomerId(d.resolvedCustomerId ?? d.customerCandidates?.[0]?.id ?? null);
    setAssetId(d.resolvedVehicle?.id ?? null);
    // Default the mode to the detected intent, but if the resolved vehicle has an
    // open job, lean toward update; the human can still switch.
    const hasOpen = (d.openWorkOrders ?? []).length > 0;
    const intent = dr.intent;
    if (intent === 'update_existing' && hasOpen) { setMode('update'); setUpdateWorkOrderId(d.openWorkOrders[0].id); }
    else { setMode('create'); setUpdateWorkOrderId(hasOpen ? d.openWorkOrders[0].id : null); }
  }

  function suggestedLines(): Array<{ type: 'labour'; description: string }> {
    const lines: Array<{ type: 'labour'; description: string }> = [];
    if (workPerformed.trim()) lines.push({ type: 'labour', description: workPerformed.trim() });
    for (const r of draft?.draft?.recommendations ?? []) lines.push({ type: 'labour', description: r });
    return lines;
  }

  async function confirm() {
    setWorking(true); setError(null);
    try {
      if (mode === 'update' && updateWorkOrderId) {
        const r = await api.voice.confirmUpdate({ workOrderId: updateWorkOrderId, lines: suggestedLines() });
        router.push(`/advisor/work-orders/${r.workOrderId}`);
      } else {
        if (!customerId) { setError('Pick a customer before saving.'); setWorking(false); return; }
        const r = await api.voice.confirmCreate({
          customerId, assetId: assetId ?? undefined, complaint: complaint.trim() || undefined,
          odometerKm: draft?.draft?.odometerKm ?? undefined, lines: suggestedLines(),
          clientId: crypto.randomUUID(),
        });
        router.push(`/advisor/work-orders/${r.workOrderId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the work order');
      setWorking(false);
    }
  }

  function reset() { setDraft(null); setError(null); setPhase('capture'); }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Voice work order</h1>
        <p className="text-sm text-steel">Speak naturally — the customer, vehicle, complaint and work done.
          You review and confirm before anything is saved.</p>
      </div>

      {error && <ProblemBanner message={error} />}

      {phase === 'capture' && (
        <Card className="flex flex-col items-center gap-4 p-8">
          <button onClick={startRecording}
            className="tool-tap flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-full bg-info text-white">
            <span className="text-4xl">🎙️</span>
            <span className="font-display font-bold">Record</span>
          </button>
          <label className="tool-tap cursor-pointer text-sm font-semibold text-info underline">
            or choose an audio file
            <input type="file" accept="audio/*" capture className="hidden" onChange={onFile} />
          </label>
        </Card>
      )}

      {phase === 'recording' && (
        <Card className="flex flex-col items-center gap-4 p-8">
          <div className="flex h-32 w-32 animate-pulse items-center justify-center rounded-full bg-stop text-white">
            <span className="text-4xl">●</span>
          </div>
          <p className="font-display text-lg font-bold">Listening…</p>
          <Button tone="stop" onClick={stopRecording}>Stop & transcribe</Button>
        </Card>
      )}

      {phase === 'processing' && (
        <Card className="flex flex-col items-center gap-3 p-10">
          <Spinner />
          <p className="font-display text-lg font-bold">Transcribing & extracting…</p>
        </Card>
      )}

      {phase === 'review' && draft && (
        <ReviewPanel
          draft={draft} mode={mode} setMode={setMode}
          complaint={complaint} setComplaint={setComplaint}
          workPerformed={workPerformed} setWorkPerformed={setWorkPerformed}
          customerId={customerId} setCustomerId={setCustomerId}
          updateWorkOrderId={updateWorkOrderId} setUpdateWorkOrderId={setUpdateWorkOrderId}
          working={working} onConfirm={confirm} onReset={reset}
          lines={suggestedLines()}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- review */

function ReviewPanel(props: any) {
  const {
    draft, mode, setMode, complaint, setComplaint, workPerformed, setWorkPerformed,
    customerId, setCustomerId, updateWorkOrderId, setUpdateWorkOrderId,
    working, onConfirm, onReset, lines,
  } = props;
  const dr = draft.draft ?? {};
  const openWorkOrders = draft.openWorkOrders ?? [];
  const customerCandidates = draft.customerCandidates ?? [];
  const vehicle = draft.resolvedVehicle;

  return (
    <div className="flex flex-col gap-4">
      {/* Transcript */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Transcript
            {draft.transcript?.language ? ` · ${draft.transcript.language}` : ''}</div>
          <Button tone="neutral" onClick={onReset}>Re-record</Button>
        </div>
        <p className="mt-1 text-sm italic text-steel">“{draft.transcript?.text}”</p>
        {dr.needsReview && (
          <div className="mt-2 rounded-tool bg-hold/10 p-2 text-xs font-semibold text-hold">
            ⚠ Please review — {dr.missing?.length ? `still needed: ${dr.missing.join(', ')}` : 'intent unclear, choose below'}
          </div>
        )}
      </Card>

      {/* Create vs update */}
      <Card className="p-4">
        <div className="mb-2 text-[0.65rem] font-bold uppercase tracking-wide text-steel">This note is…</div>
        <div className="flex gap-2">
          <button onClick={() => setMode('create')}
            className={`tool-tap flex-1 rounded-tool border-2 px-3 py-2 font-display font-bold ${mode === 'create' ? 'border-info bg-info/10 text-info' : 'border-line'}`}>
            A new job
          </button>
          <button onClick={() => setMode('update')} disabled={openWorkOrders.length === 0}
            className={`tool-tap flex-1 rounded-tool border-2 px-3 py-2 font-display font-bold ${mode === 'update' ? 'border-info bg-info/10 text-info' : 'border-line'} ${openWorkOrders.length === 0 ? 'opacity-40' : ''}`}>
            Work on an existing job
          </button>
        </div>
        {mode === 'update' && openWorkOrders.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {openWorkOrders.map((wo: any) => (
              <button key={wo.id} onClick={() => setUpdateWorkOrderId(wo.id)}
                className={`flex items-center justify-between rounded-tool border-2 px-3 py-2 text-left ${updateWorkOrderId === wo.id ? 'border-info' : 'border-line'}`}>
                <span><span className="font-mono font-bold">{wo.number ?? 'draft'}</span>
                  <span className="ml-2 text-sm text-steel">{statusLabel(wo.status)}</span></span>
                {updateWorkOrderId === wo.id && <span className="font-bold text-info">✓</span>}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Customer + vehicle */}
      <Card className="flex flex-col gap-3 p-4">
        <div>
          <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Customer</div>
          {customerCandidates.length <= 1 ? (
            <div className="font-semibold">{customerCandidates[0]?.name ?? dr.customerHint ?? '— pick on the next screen —'}</div>
          ) : (
            <select value={customerId ?? ''} onChange={(e) => setCustomerId(e.target.value || null)}
              className="mt-1 w-full rounded-tool border-2 border-line px-3 py-2">
              <option value="">Choose a customer…</option>
              {customerCandidates.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.city ? ` · ${c.city}` : ''}</option>)}
            </select>
          )}
        </div>
        <div>
          <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Vehicle</div>
          {vehicle ? (
            <div className="font-mono font-bold">{displayPlate(vehicle.plate)}
              <span className="ml-2 text-sm font-normal text-steel">{[vehicle.make, vehicle.model].filter(Boolean).join(' ')}</span></div>
          ) : (
            <div className="text-sm text-steel">{dr.vehicleHint ? `heard “${dr.vehicleHint}” — not matched` : 'none detected'}</div>
          )}
        </div>
      </Card>

      {/* Complaint (create) or just the work (both) */}
      {mode === 'create' && (
        <Card className="p-4">
          <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Complaint</div>
          <textarea value={complaint} onChange={(e) => setComplaint(e.target.value)} rows={2}
            className="mt-1 w-full rounded-tool border-2 border-line px-3 py-2" placeholder="Customer's reported problem" />
        </Card>
      )}
      <Card className="p-4">
        <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Work performed</div>
        <textarea value={workPerformed} onChange={(e) => setWorkPerformed(e.target.value)} rows={2}
          className="mt-1 w-full rounded-tool border-2 border-line px-3 py-2" placeholder="What was done" />
        {dr.labourNotes && <p className="mt-1 text-xs text-steel">Note: {dr.labourNotes}</p>}
      </Card>

      {/* Suggested lines preview */}
      {lines.length > 0 && (
        <Card className="p-4">
          <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Lines to add (priced by you afterwards)</div>
          <ul className="mt-1 flex flex-col gap-1">
            {lines.map((l: any, i: number) => (
              <li key={i} className="rounded-tool bg-floor px-3 py-2 text-sm">{l.description}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Follow-ups (informational — not saved as billable lines) */}
      {(dr.followUps ?? []).length > 0 && (
        <Card className="p-4">
          <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Follow-ups</div>
          <ul className="mt-1 list-disc pl-5 text-sm text-steel">
            {dr.followUps.map((f: string, i: number) => <li key={i}>{f}</li>)}
          </ul>
        </Card>
      )}

      <Button tone="go" onClick={onConfirm} disabled={working}>
        {working ? <Spinner /> : mode === 'update' ? 'Add to the job' : 'Create the work order'}
      </Button>
    </div>
  );
}
