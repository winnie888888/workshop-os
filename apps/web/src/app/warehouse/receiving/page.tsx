'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { uploadDocument } from '@/lib/uploads';
import { formatMoneyMinor } from '@/lib/format';
import { Button, Card, Spinner, ProblemBanner } from '@/components/ui';

/*
 * OCR receiving — the human-review workflow, phone-first.
 *
 * This screen is the DOWNSTREAM door of the airlock. The machine has proposed;
 * here the human disposes. It has three states:
 *
 *   1. capture   — photograph (or pick) a delivery note / supplier invoice.
 *   2. review    — the extracted draft is shown with EVERY low-confidence field
 *                  and every unresolved line clearly marked. The clerk corrects,
 *                  confirms the supplier/PO, and only then posts.
 *   3. posted    — stock has moved, through the EXISTING goods-receipt posting.
 *
 * The screen never computes money or moves stock itself. Posting calls the same
 * goods-receipts post endpoint as manual receiving, so the moving-average cost
 * and the immutable ledger are maintained by the one chokepoint as always.
 */

type Phase = 'capture' | 'extracting' | 'review' | 'posting' | 'posted';

// The seeded A-SPRINT primary location (received stock lands here by default;
// in a fuller build this would be chosen from the tenant's locations).
const DEFAULT_LOCATION_ID = '00000000-0000-0000-0000-00000000l001';

export default function OcrReceivingPage() {
  const [phase, setPhase] = useState<Phase>('capture');
  const [docType, setDocType] = useState<'delivery_note' | 'supplier_invoice'>('delivery_note');
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPhase('extracting');
    try {
      // 1) Upload the photographed document through the existing pipeline.
      const up = await uploadDocument(file);
      if (!up.ok || !up.attachmentId) throw new Error(up.error ?? 'Nalaganje ni uspelo');
      // 2) Ask the server to extract + match into a DRAFT (never posts).
      const res = await api.goodsReceipts.ocrDraft({
        attachmentId: up.attachmentId, documentType: docType, defaultLocationId: DEFAULT_LOCATION_ID,
      });
      setResult(res);
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dokumenta ni bilo mogoče prebrati');
      setPhase('capture');
    }
  }

  async function post() {
    if (!result?.draft?.id) return;
    setPhase('posting'); setError(null);
    try {
      await api.goodsReceipts.post(result.draft.id);
      setPhase('posted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prevzema ni bilo mogoče knjižiti');
      setPhase('review');
    }
  }

  function reset() { setResult(null); setError(null); setPhase('capture'); }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold">Prevzem dobave</h1>
        <p className="text-sm text-muted">Fotografirajte dobavnico ali dobaviteljev račun. Sistem ga prebere in pripravi
          osnutek — vi ga preverite in potrdite. Nič ne gre v zalogo, dokler ne potrdite.</p>
      </div>

      {error && <ProblemBanner message={error} />}

      {phase === 'capture' && (
        <CaptureCard docType={docType} setDocType={setDocType} onFile={onFile} />
      )}

      {phase === 'extracting' && (
        <Card className="flex flex-col items-center gap-3 p-10">
          <Spinner />
          <p className="text-lg font-bold">Branje dokumenta…</p>
          <p className="text-sm text-muted">Razbiranje dobavitelja, postavk, količin in cen.</p>
        </Card>
      )}

      {(phase === 'review' || phase === 'posting') && result && (
        <ReviewPanel result={result} posting={phase === 'posting'} onPost={post} onCancel={reset} />
      )}

      {phase === 'posted' && (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-go/15 text-go"><svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg></span>
          <p className="text-xl font-bold text-go">Zaloga prevzeta</p>
          <p className="text-sm text-muted">Prevzem je bil knjižen in zaloga posodobljena po standardnem postopku.
            Drseče povprečje nabavne cene je bilo samodejno preračunano.</p>
          <Button tone="info" onClick={reset}>Prevzemi novo dobavo</Button>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ capture */

function CaptureCard({ docType, setDocType, onFile }: {
  docType: 'delivery_note' | 'supplier_invoice';
  setDocType: (t: 'delivery_note' | 'supplier_invoice') => void;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Card className="flex flex-col gap-4 p-4">
      <div>
        <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted">Vrsta dokumenta</span>
        <div className="flex gap-2">
          {([['delivery_note', 'Dobavnica'], ['supplier_invoice', 'Dobaviteljev račun']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setDocType(v)}
              className={`flex-1 rounded-tool border px-3 py-3 text-sm font-semibold transition
                ${docType === v ? 'border-info bg-info/5 text-info' : 'border-line bg-panel text-muted'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Camera capture via a file input bound to the device camera (same
          pattern the mechanic photo capture uses). */}
      <label className="tool-tap flex flex-col items-center justify-center gap-3 rounded-tool border-2
        border-dashed border-ink/20 bg-surface2 p-10 text-center">
        <svg viewBox="0 0 24 24" className="h-10 w-10 text-muted2" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9a2 2 0 0 1 2-2h2l1.5-2h7L19 7h0a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/></svg>
        <span className="text-xl font-bold">Fotografiraj dokument</span>
        <span className="text-sm text-muted">ali tapni za izbiro fotografije / PDF</span>
        <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={onFile} />
      </label>
    </Card>
  );
}

/* ------------------------------------------------------------------- review */

function ReviewPanel({ result, posting, onPost, onCancel }: {
  result: any; posting: boolean; onPost: () => void; onCancel: () => void;
}) {
  const { extraction, supplierMatch, poMatch, lines, draft, needsReview } = result;
  const draftableLines = (lines ?? []).filter((l: any) => l.draftable);
  const canPost = !!draft?.id && draftableLines.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {needsReview && (
        <div className="rounded-tool border border-hold bg-hold/10 p-3 text-sm font-semibold text-hold">
          Nekatera polja potrebujejo vašo pozornost. Spodaj označene postavke so bile prebrane z nizko
          zanesljivostjo ali jih ni bilo mogoče uskladiti — preverite jih s papirjem.
        </div>
      )}

      {/* Supplier + document header */}
      <Card className="flex flex-col gap-3 p-4">
        <Row label="Dobavitelj" tone={supplierMatch?.supplierId ? 'ok' : 'warn'}>
          {supplierMatch?.supplierId
            ? <span className="font-semibold">{supplierMatch.reason}</span>
            : <span className="font-semibold text-hold">Dobavitelj ni prepoznan — izberite pred knjiženjem</span>}
        </Row>
        <Row label="Naročilnica" tone={poMatch?.purchaseOrderId ? 'ok' : 'muted'}>
          {poMatch?.purchaseOrderId ? poMatch.reason : 'Prevzem brez naročilnice'}
        </Row>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Field label="Št. dokumenta" value={extraction?.deliveryNoteNumber ?? extraction?.documentNumber} />
          <Field label="Datum" value={extraction?.date} />
        </div>
      </Card>

      {/* Lines */}
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Postavke</h2>
        {(lines ?? []).map((l: any) => <LineCard key={l.index} line={l} />)}
      </div>

      {/* Action */}
      <Card className="flex flex-col gap-3 p-4">
        {!canPost && (
          <p className="text-sm text-muted">
            {draft?.id
              ? 'Vsaj ena postavka je pripravljena; najprej uredite označene, če sodijo na ta prevzem.'
              : 'Dokumenta ni bilo mogoče samodejno pretvoriti v osnutek. Uredite dobavitelja in postavke ter prevzemite ročno.'}
          </p>
        )}
        {canPost && (
          <p className="text-sm text-muted">
            {draftableLines.length} postavk pripravljenih za prevzem. Knjiženje posodobi zalogo
            in preračuna drseče povprečje nabavne cene po standardnem postopku.
          </p>
        )}
        <div className="flex gap-2">
          <Button tone="neutral" onClick={onCancel}>Začni znova</Button>
          <Button tone="go" onClick={onPost} disabled={!canPost || posting}>
            {posting ? <Spinner /> : 'Potrdi in prevzemi'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function LineCard({ line }: { line: any }) {
  const flagged = (line.reviewFlags ?? []).length > 0;
  return (
    <Card className={`flex flex-col gap-2 p-3 ${flagged ? 'border border-hold' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">{line.description ?? '(opis ni prebran)'}</div>
          <div className="num text-xs text-muted">
            {[line.supplierSku, line.oemRef].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>
        <MatchBadge match={line.match} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <Field label="Količina" value={line.quantity != null ? String(line.quantity) : null} warn={line.quantityWhole == null} />
        <Field label="Cena/enoto" value={line.unitPriceMinor != null ? formatMoneyMinor(line.unitPriceMinor) : null} warn={line.unitPriceMinor == null || lowConf(line)} />
        <Field label="DDV" value={line.vatRatePct != null ? `${line.vatRatePct}%` : null} />
      </div>

      {flagged && (
        <ul className="flex flex-col gap-1 rounded-tool bg-hold/10 p-2 text-xs font-semibold text-hold">
          {line.reviewFlags.map((f: string, i: number) => <li key={i}>{f}</li>)}
        </ul>
      )}
    </Card>
  );
}

function MatchBadge({ match }: { match: any }) {
  const map: Record<string, { label: string; cls: string }> = {
    matched: { label: 'Ujema', cls: 'bg-go/10 text-go' },
    unmatched: { label: 'Potrdi', cls: 'bg-hold/10 text-hold' },
    new_item: { label: 'Nova postavka', cls: 'bg-stop/10 text-stop' },
  };
  const m = map[match?.status] ?? map.new_item;
  return <span className={`shrink-0 rounded px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide ${m.cls}`}>{m.label}</span>;
}

function lowConf(line: any): boolean {
  return typeof line.confidence === 'number' && line.confidence < 0.7;
}

/* ----------------------------------------------------------------- atoms */

function Row({ label, tone, children }: { label: string; tone: 'ok' | 'warn' | 'muted'; children: React.ReactNode }) {
  const dot = tone === 'ok' ? 'bg-go' : tone === 'warn' ? 'bg-hold' : 'bg-line';
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <span className="w-28 shrink-0 text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
      <span className="min-w-0 flex-1 text-sm">{children}</span>
    </div>
  );
}

function Field({ label, value, warn }: { label: string; value: string | null | undefined; warn?: boolean }) {
  return (
    <div>
      <div className="text-[0.65rem] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className={`num ${warn ? 'rounded bg-hold/15 px-1 font-bold text-hold' : ''}`}>
        {value ?? <span className="text-stop">ni prebrano</span>}
      </div>
    </div>
  );
}
