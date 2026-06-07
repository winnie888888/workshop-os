'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { uploadDocument } from '@/lib/uploads';
import { displayPlate, statusLabel } from '@/lib/format';
import { Button, Card, Spinner, ProblemBanner } from '@/components/ui';

/*
 * Plate scan — the advisor photographs a license plate and the system identifies
 * the vehicle, customer, and any open work order, then the advisor confirms.
 *
 * This is the DOWNSTREAM door of the recognition airlock, and the design goal is
 * speed-with-safety: in the common case (one confident match) the advisor is one
 * tap from the right job, but nothing is created or opened until that tap. The
 * screen handles the four outcomes the matcher produces:
 *
 *   singleConfident  — one exact match: show it, offer open-existing or new-job.
 *   ambiguous        — several candidates: show a chooser.
 *   noMatch          — nothing matched: offer to create a new vehicle.
 *   confusion        — a candidate that only matched after folding look-alike
 *                      characters: shown with a "please confirm" note.
 *
 * It never computes anything irreversible; confirming calls the existing work-
 * order workflow through the plate API.
 */

type Phase = 'capture' | 'recognizing' | 'review';

export default function PlateScanPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('capture');
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPhase('recognizing');
    try {
      const up = await uploadDocument(file);
      if (!up.ok || !up.attachmentId) throw new Error(up.error ?? 'Upload failed');
      const res = await api.plate.recognize(up.attachmentId);
      setResult(res);
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read the plate');
      setPhase('capture');
    }
  }

  async function openExisting(workOrderId: string, assetId: string) {
    setWorking(true); setError(null);
    try {
      const r = await api.plate.confirmExisting({ workOrderId, assetId });
      router.push(`/advisor/work-orders/${r.workOrderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the work order');
      setWorking(false);
    }
  }

  async function createNew(customerId: string, assetId: string) {
    setWorking(true); setError(null);
    try {
      const r = await api.plate.confirmNew({ customerId, assetId, clientId: crypto.randomUUID() });
      router.push(`/advisor/work-orders/${r.workOrderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the work order');
      setWorking(false);
    }
  }

  function reset() { setResult(null); setError(null); setPhase('capture'); }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Scan a plate</h1>
        <p className="text-sm text-steel">Photograph the license plate. The system finds the vehicle and customer,
          and checks for an open job. You confirm before anything is created or opened.</p>
      </div>

      {error && <ProblemBanner message={error} />}

      {phase === 'capture' && (
        <Card className="p-4">
          <label className="tool-tap flex flex-col items-center justify-center gap-3 rounded-tool border-2
            border-dashed border-ink/20 bg-floor p-10 text-center">
            <span className="text-4xl">📷</span>
            <span className="font-display text-xl font-bold">Photograph the plate</span>
            <span className="text-sm text-steel">or tap to choose a photo</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
          </label>
        </Card>
      )}

      {phase === 'recognizing' && (
        <Card className="flex flex-col items-center gap-3 p-10">
          <Spinner />
          <p className="font-display text-lg font-bold">Reading the plate…</p>
        </Card>
      )}

      {phase === 'review' && result && (
        <ReviewPanel result={result} working={working}
          onOpenExisting={openExisting} onCreateNew={createNew} onReset={reset} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- review */

function ReviewPanel({ result, working, onOpenExisting, onCreateNew, onReset }: {
  result: any; working: boolean;
  onOpenExisting: (workOrderId: string, assetId: string) => void;
  onCreateNew: (customerId: string, assetId: string) => void;
  onReset: () => void;
}) {
  const { read, country, candidates, noMatch } = result;

  return (
    <div className="flex flex-col gap-4">
      {/* What was read */}
      <Card className="flex items-center justify-between gap-3 p-4">
        <div>
          <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Plate read</div>
          <div className="font-mono text-2xl font-bold">{displayPlate(read.plate)}</div>
          <div className="text-xs text-steel">
            {country?.effective ?? 'country unknown'} · confidence {pct(read.confidence)}
          </div>
        </div>
        <Button tone="neutral" onClick={onReset}>Rescan</Button>
      </Card>

      {/* No match → create a new vehicle */}
      {noMatch && (
        <Card className="flex flex-col gap-3 p-4">
          <p className="font-semibold">No vehicle on file matches this plate.</p>
          <p className="text-sm text-steel">Register the vehicle first, then start its job. The plate is pre-filled.</p>
          <a href={`/advisor/vehicles/new?plate=${encodeURIComponent(read.canonical)}&country=${encodeURIComponent(country?.effective ?? '')}`}
            className="tool-tap inline-flex items-center justify-center rounded-tool bg-info px-5 font-display font-bold text-white">
            + Register new vehicle
          </a>
        </Card>
      )}

      {/* Candidates (one or several) */}
      {(candidates ?? []).map((c: any) => (
        <CandidateCard key={c.vehicle.id} candidate={c} working={working}
          onOpenExisting={onOpenExisting} onCreateNew={onCreateNew} />
      ))}
    </div>
  );
}

function CandidateCard({ candidate, working, onOpenExisting, onCreateNew }: {
  candidate: any; working: boolean;
  onOpenExisting: (workOrderId: string, assetId: string) => void;
  onCreateNew: (customerId: string, assetId: string) => void;
}) {
  const { vehicle, customer, openWorkOrders, method, reason, confidence } = candidate;
  const isConfusion = method === 'confusion';

  return (
    <Card className={`flex flex-col gap-3 p-4 ${isConfusion ? 'border-2 border-hold' : ''}`}>
      {/* Vehicle + customer */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-lg font-bold">{displayPlate(vehicle.plate)}
            <span className="ml-2 text-xs font-semibold text-steel">{vehicle.countryOfPlate}</span></div>
          <div className="font-semibold">{[vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle'}</div>
          {customer && <div className="text-sm text-steel">{customer.name}{customer.city ? ` · ${customer.city}` : ''}</div>}
        </div>
        <span className={`shrink-0 rounded px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide
          ${isConfusion ? 'bg-hold/10 text-hold' : 'bg-go/10 text-go'}`}>
          {isConfusion ? 'Confirm' : 'Match'} {pct(confidence)}
        </span>
      </div>

      {isConfusion && (
        <div className="rounded-tool bg-hold/10 p-2 text-xs font-semibold text-hold">⚠ {reason}</div>
      )}

      {/* Open work orders for this vehicle */}
      {(openWorkOrders ?? []).length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Open job{openWorkOrders.length > 1 ? 's' : ''}</div>
          {openWorkOrders.map((wo: any) => (
            <button key={wo.id} onClick={() => onOpenExisting(wo.id, vehicle.id)} disabled={working}
              className="flex items-center justify-between rounded-tool border-2 border-line bg-panel px-3 py-3 text-left hover:border-info">
              <span>
                <span className="font-mono font-bold">{wo.number ?? 'draft'}</span>
                <span className="ml-2 text-sm text-steel">{statusLabel(wo.status)}</span>
                {wo.complaint && <span className="block truncate text-sm text-steel">{wo.complaint}</span>}
              </span>
              <span className="font-semibold text-info">Open →</span>
            </button>
          ))}
          <Button tone="neutral" onClick={() => onCreateNew(customer.id, vehicle.id)} disabled={working}>
            {working ? <Spinner /> : '+ Start a separate new job instead'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-steel">No open job for this vehicle.</p>
          <Button tone="go" onClick={() => onCreateNew(customer.id, vehicle.id)} disabled={working}>
            {working ? <Spinner /> : 'Start a new job for this vehicle'}
          </Button>
        </div>
      )}
    </Card>
  );
}

function pct(c: number | null | undefined): string {
  return typeof c === 'number' ? `${Math.round(c * 100)}%` : '—';
}
