'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { displayPlate } from '@/lib/format';
import { Button, Card, SoftChip, Spinner, ProblemBanner } from '@/components/ui';
import { TextField } from '@/components/form';
import {
  plateStore, mockRecognize, normalizePlate, guessCountry, matchPlate, makePlateScan,
  PLATE_DEMO_SET, type PlateScan, type PlateSource, type PlateMatch,
} from '@/lib/plate-scan';

/*
 * Skeniranje tablice — zajem s kamero / nalaganje slike / ročni vnos / demo.
 * Prepozna tablico (mock OCR brez ključev), jo normalizira, poišče vozilo in
 * ponudi akcije. Shramba v localStorage (swap-ready za pravi API).
 */

type Status = 'idle' | 'camera' | 'ocr' | 'review';

interface ScanResult {
  plateRaw: string;
  confidence: number;
  source: PlateSource;
  imagePreview?: string;
  match: PlateMatch;
}

export default function PlateScanPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [editPlate, setEditPlate] = useState('');
  const [manual, setManual] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<PlateScan[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const refreshHistory = useCallback(() => { plateStore.list(10).then(setHistory); }, []);
  useEffect(() => { refreshHistory(); }, [refreshHistory]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => () => stopCamera(), [stopCamera]);

  async function recognizeInto(plateRaw: string, confidence: number, source: PlateSource, imagePreview?: string) {
    setStatus('ocr'); setError(null);
    const match = await matchPlate((q) => api.search(q), plateRaw);
    setResult({ plateRaw, confidence, source, imagePreview, match });
    setEditPlate(normalizePlate(plateRaw));
    setStatus('review');
  }

  async function startCamera() {
    setError(null); setSavedNote(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setStatus('camera');
      // attach after the video element is in the DOM
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; void videoRef.current.play(); } }, 50);
    } catch {
      setError('Kamera ni na voljo. Naložite sliko ali vnesite tablico ročno.');
      setStatus('idle');
    }
  }

  async function capture() {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 640, h = video.videoHeight || 480;
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d')?.drawImage(video, 0, 0, w, h);
    const preview = canvas.toDataURL('image/jpeg', 0.6);
    stopCamera();
    const { plate, confidence } = await mockRecognize();
    await recognizeInto(plate, confidence, 'camera', preview);
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setSavedNote(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const preview = typeof reader.result === 'string' ? reader.result : undefined;
      setStatus('ocr');
      const { plate, confidence } = await mockRecognize();
      await recognizeInto(plate, confidence, 'upload', preview);
    };
    reader.readAsDataURL(file);
  }

  async function recognizeManual() {
    const p = manual.trim();
    if (!p) { setError('Vnesite tablico.'); return; }
    setSavedNote(null);
    await recognizeInto(p, 1, 'manual');
  }

  async function demoPlate() {
    setError(null); setSavedNote(null);
    const p = PLATE_DEMO_SET[Math.floor(Math.random() * PLATE_DEMO_SET.length)];
    setStatus('ocr');
    await new Promise((r) => setTimeout(r, 500));
    await recognizeInto(p, 0.93, 'demo');
  }

  function reset() {
    stopCamera(); setResult(null); setEditPlate(''); setManual('');
    setError(null); setSavedNote(null); setStatus('idle');
  }

  async function persist(extra: Partial<PlateScan> = {}): Promise<PlateScan | null> {
    if (!result) return null;
    const scan = { ...makePlateScan({ ...result, plateRaw: editPlate || result.plateRaw }), ...extra };
    await plateStore.save(scan);
    refreshHistory();
    return scan;
  }

  async function saveScan() {
    setBusy(true);
    try { await persist({ status: 'saved' }); setSavedNote('Sken shranjen.'); }
    finally { setBusy(false); }
  }

  async function openVehicle() {
    if (!result?.match.matchedAssetId) return;
    await persist();
    router.push(`/advisor/vehicles/${result.match.matchedAssetId}/edit`);
  }

  async function createWorkOrder() {
    setBusy(true);
    try {
      const demoWo = `DN-DEMO-${Date.now().toString().slice(-5)}`;
      await persist({ createdWorkOrderId: demoWo, status: 'saved' });
      setSavedNote(`Demo shranjeno - delovni nalog ${demoWo}. Odpiram vnos naloga...`);
      setTimeout(() => router.push('/advisor/work-orders/new'), 600);
    } finally { setBusy(false); }
  }

  async function linkCustomer() {
    if (result?.match.matchedCustomerId) {
      await persist();
      router.push(`/advisor/customers/${result.match.matchedCustomerId}`);
      return;
    }
    await persist({ status: 'saved' });
    setSavedNote('Demo shranjeno - povezava s stranko bo na voljo ob pravi prepoznavi.');
  }

  const matched = !!result?.match.matchedAssetId;
  const pill = status === 'camera' ? { l: 'Kamera', t: 'info' as const }
    : status === 'ocr' ? { l: 'OCR', t: 'hold' as const }
    : status === 'review' ? (matched ? { l: 'Najdeno', t: 'go' as const } : { l: 'Ni najdeno', t: 'stop' as const })
    : { l: 'Pripravljeno', t: 'neutral' as const };
  const liveNorm = normalizePlate(editPlate || result?.plateRaw || '');

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Skeniranje tablice</h1>
          <p className="text-sm text-muted">Skenirajte, naložite sliko ali vnesite tablico - sistem poišče vozilo.</p>
        </div>
        <SoftChip tone={pill.t}>{pill.l}</SoftChip>
      </div>

      {error && <ProblemBanner message={error} />}
      {savedNote && <ProblemBanner tone="go" message={savedNote} />}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Skener */}
        <Card className="flex flex-col gap-4 p-5">
          <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-sidebar">
            {status === 'camera' ? (
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            ) : result?.imagePreview ? (
              <img src={result.imagePreview} alt="zajeta tablica" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-white/40">
                <svg viewBox="0 0 24 24" className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9a2 2 0 0 1 2-2h2l1.5-2h7L19 7h0a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/></svg>
              </div>
            )}
            {/* overlay okvir za tablico */}
            {(status === 'camera' || status === 'ocr') && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className={`h-[22%] w-[62%] rounded-lg border-2 ${status === 'ocr' ? 'animate-pulse border-safety' : 'border-white/80'}`} />
              </div>
            )}
            {status === 'ocr' && <div className="absolute inset-0 grid place-items-center bg-sidebar/40"><Spinner className="text-white" /></div>}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {status === 'camera' ? (
            <div className="flex gap-2">
              <Button tone="neutral" onClick={reset} className="flex-1">Prekliči</Button>
              <Button tone="go" size="lg" onClick={capture} className="flex-1">Zajemi</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button tone="info" size="lg" onClick={startCamera}>Začni skeniranje</Button>
                <label className="inline-flex min-h-tap cursor-pointer items-center justify-center rounded-tool border border-linestrong bg-surface px-4 font-semibold text-steel transition hover:border-brandring hover:text-brand">
                  Naloži sliko
                  <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
                </label>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1"><TextField label="Ročni vnos tablice" value={manual} onChange={setManual} placeholder="npr. NMCK418" uppercase /></div>
                <Button tone="neutral" onClick={recognizeManual}>Prepoznaj</Button>
              </div>
              <button onClick={demoPlate} className="text-sm font-semibold text-brand hover:underline">Demo tablica</button>
            </>
          )}
        </Card>

        {/* Rezultat */}
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-base font-bold text-ink">Rezultat prepoznave</h2>
          {!result ? (
            <p className="flex flex-1 items-center justify-center py-10 text-center text-sm text-muted">
              Rezultat se prikaže po skeniranju, nalaganju slike ali vnosu tablice.
            </p>
          ) : (
            <>
              <div className="flex items-end gap-3">
                <div className="flex-1"><TextField label="Registrska tablica" value={editPlate} onChange={setEditPlate} uppercase mono /></div>
                <div className="pb-2 text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted2">Zaupanje</p>
                  <p className={`num text-lg font-extrabold ${result.confidence >= 0.85 ? 'text-go' : 'text-hold'}`}>{Math.round(result.confidence * 100)}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Berljiva oblika" value={displayPlate(liveNorm)} mono />
                <Field label="Država" value={guessCountry(liveNorm)} />
              </div>

              <div className={`rounded-card border p-3 ${matched ? 'border-go/40 bg-go/5' : 'border-line bg-surface2'}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted2">Vozilo</p>
                {matched ? (
                  <p className="mt-0.5 font-bold text-ink">{result.match.vehicleLabel ?? 'Najdeno vozilo'}
                    {result.match.customerLabel && <span className="block text-sm font-normal text-muted">{result.match.customerLabel}</span>}
                  </p>
                ) : (
                  <p className="mt-0.5 font-bold text-steel">Novo vozilo - ni v evidenci</p>
                )}
              </div>

              <div className="rounded-card border border-line bg-surface2 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted2">Zadnji delovni nalogi</p>
                <p className="mt-0.5 text-sm text-muted">{matched ? 'Ni nedavnih nalogov za to vozilo.' : 'Za novo vozilo ni zgodovine.'}</p>
              </div>

              <p className="rounded-tool bg-brandweak p-2 text-xs font-semibold text-brand">
                Predlagana akcija: {matched ? 'Odpri vozilo in preglej zgodovino.' : 'Ustvari delovni nalog za novo vozilo.'}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button tone="neutral" onClick={openVehicle} disabled={!matched}>Odpri vozilo</Button>
                <Button tone="neutral" onClick={linkCustomer}>Poveži s stranko</Button>
                <Button tone="info" onClick={createWorkOrder} disabled={busy}>Ustvari nalog</Button>
                <Button tone="go" onClick={saveScan} disabled={busy}>{busy ? <Spinner /> : 'Shrani sken'}</Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Zgodovina */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-bold text-ink">Zadnja skeniranja</h2>
          {history.length > 0 && (
            <button onClick={() => plateStore.clear().then(refreshHistory)} className="text-xs font-semibold text-muted2 hover:text-stop">Počisti</button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="p-8 text-center text-muted">Še ni skeniranj.</p>
        ) : (
          <ul className="divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex items-center gap-3">
                  {h.imagePreview
                    ? <img src={h.imagePreview} alt="" className="h-10 w-14 flex-none rounded object-cover" />
                    : <span className="grid h-10 w-14 flex-none place-items-center rounded bg-surface2 text-muted2"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="10" rx="2"/></svg></span>}
                  <div>
                    <p className="num font-bold text-ink">{displayPlate(h.plateNormalized)}</p>
                    <p className="num text-xs text-muted2">{new Date(h.createdAt).toLocaleString('sl-SI')} · {Math.round(h.confidence * 100)}% · {h.source}{h.createdWorkOrderId ? ` · ${h.createdWorkOrderId}` : ''}</p>
                  </div>
                </div>
                <SoftChip tone={h.status === 'matched' ? 'go' : h.status === 'saved' ? 'info' : h.status === 'not_found' ? 'stop' : 'neutral'}>
                  {h.status === 'matched' ? 'najdeno' : h.status === 'saved' ? 'shranjeno' : h.status === 'not_found' ? 'ni najdeno' : 'prepoznano'}
                </SoftChip>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-tool bg-surface2 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted2">{label}</p>
      <p className={`mt-0.5 font-bold text-ink ${mono ? 'num' : ''}`}>{value || '—'}</p>
    </div>
  );
}
