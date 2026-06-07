'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatMoneyMinor } from '@/lib/format';
import { Button, Card, SoftChip, Spinner, ProblemBanner } from '@/components/ui';
import { SelectField, TextField, TextAreaField } from '@/components/form';
import {
  quoteStore, makeQuote, newQuoteLine, quoteTotals, quoteStatusLabel,
  type Quote, type QuoteLine,
} from '@/lib/quotes-store';

const inputCls = 'w-full rounded-tool border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brandring';

export default function QuotesPage() {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote>(() => makeQuote());
  const [customers, setCustomers] = useState<any[]>([]);
  const [history, setHistory] = useState<Quote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshHistory = useCallback(() => { quoteStore.list(10).then(setHistory); }, []);
  useEffect(() => { refreshHistory(); }, [refreshHistory]);
  useEffect(() => { api.customers.list().then((c) => setCustomers(c as any[])).catch(() => setCustomers([])); }, []);

  const totals = quoteTotals(quote.lines);

  function updateLine(id: string, patch: Partial<QuoteLine>) {
    setQuote((q) => ({ ...q, lines: q.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  }
  function addLine() { setQuote((q) => ({ ...q, lines: [...q.lines, newQuoteLine()] })); }
  function removeLine(id: string) { setQuote((q) => ({ ...q, lines: q.lines.length > 1 ? q.lines.filter((l) => l.id !== id) : q.lines })); }

  function pickCustomer(id: string) {
    const c = customers.find((x) => x.id === id);
    setQuote((q) => ({ ...q, customerId: id || undefined, customerName: c?.name ?? q.customerName }));
  }

  async function saveQuote(status: Quote['status'] = 'draft') {
    setBusy(true); setError(null);
    try {
      const q = { ...quote, status };
      await quoteStore.save(q); setQuote(q); refreshHistory();
      setSavedNote(status === 'sent' ? 'Predračun shranjen in označen kot poslan.' : 'Predračun shranjen.');
    } catch { setError('Shranjevanje ni uspelo.'); }
    finally { setBusy(false); }
  }

  async function convert() {
    setBusy(true); setError(null);
    let realWoId: string | undefined;
    try {
      if (quote.customerId) {
        const wo = await api.workOrders.create({ customerId: quote.customerId, complaint: quote.note || `Iz predračuna ${quote.number}` });
        realWoId = (wo as any)?.id;
      }
    } catch { /* fall back to demo link */ }
    const wid = realWoId ?? `DN-DEMO-${Date.now().toString().slice(-5)}`;
    const q = { ...quote, status: 'converted' as const, workOrderId: wid };
    try { await quoteStore.save(q); } catch { /* ignore */ }
    setQuote(q); refreshHistory(); setBusy(false);
    if (realWoId) { setSavedNote('Nalog ustvarjen iz predračuna.'); router.push(`/advisor/work-orders/${realWoId}`); }
    else setSavedNote(`Demo: pretvorjeno v nalog ${wid}. Za pravi nalog izberi stranko iz seznama.`);
  }

  function loadFromHistory(q: Quote) { setQuote({ ...q, id: q.id }); setSavedNote(null); setError(null); }
  function newQuote() { setQuote(makeQuote()); setSavedNote(null); setError(null); }

  const customerOptions = [{ value: '', label: 'Brez / vpiši ročno' },
    ...customers.map((c) => ({ value: c.id, label: c.name ?? c.id }))];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="num text-3xl font-extrabold tracking-tight text-ink">Predračun {quote.number}</h1>
          <p className="text-sm text-muted">Pripravi ponudbo, jo shrani in po potrebi pretvori v delovni nalog.</p>
        </div>
        <div className="flex items-center gap-2">
          <SoftChip tone={quote.status === 'converted' ? 'go' : quote.status === 'accepted' ? 'go' : quote.status === 'sent' ? 'info' : 'neutral'}>{quoteStatusLabel(quote.status)}</SoftChip>
          <Button tone="neutral" onClick={newQuote}>Nov predračun</Button>
        </div>
      </div>

      {error && <ProblemBanner message={error} />}
      {savedNote && <ProblemBanner tone="go" message={savedNote} />}

      <Card className="flex flex-col gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Stranka" value={quote.customerId ?? ''} onChange={pickCustomer} options={customerOptions} />
          <TextField label="Vozilo (neobvezno)" value={quote.vehicle} onChange={(v) => setQuote((q) => ({ ...q, vehicle: v }))} placeholder="npr. MAN TGX · NM CK-412" />
        </div>
        {!quote.customerId && (
          <TextField label="Naziv stranke (ročno)" value={quote.customerName} onChange={(v) => setQuote((q) => ({ ...q, customerName: v }))} placeholder="npr. Transport Novak d.o.o." />
        )}

        {/* Postavke */}
        <div>
          <div className="mb-2 grid grid-cols-[1fr_3.5rem_5rem_4rem_2rem] gap-2 px-1 text-[0.65rem] font-bold uppercase tracking-wide text-muted2">
            <span>Opis</span><span className="text-right">Kol.</span><span className="text-right">Cena €</span><span className="text-right">DDV %</span><span></span>
          </div>
          <div className="flex flex-col gap-2">
            {quote.lines.map((l) => (
              <div key={l.id} className="grid grid-cols-[1fr_3.5rem_5rem_4rem_2rem] items-center gap-2">
                <input className={inputCls} value={l.description} onChange={(e) => updateLine(l.id, { description: e.target.value })} placeholder="Delo ali del…" />
                <input className={`${inputCls} num text-right`} value={l.qty} inputMode="decimal" onChange={(e) => updateLine(l.id, { qty: e.target.value })} />
                <input className={`${inputCls} num text-right`} value={l.unitPriceEur} inputMode="decimal" onChange={(e) => updateLine(l.id, { unitPriceEur: e.target.value })} />
                <input className={`${inputCls} num text-right`} value={l.vatRatePct} inputMode="decimal" onChange={(e) => updateLine(l.id, { vatRatePct: e.target.value })} />
                <button onClick={() => removeLine(l.id)} title="Odstrani" className="grid h-8 w-8 place-items-center rounded-tool text-muted2 hover:bg-stop/10 hover:text-stop">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg>
                </button>
              </div>
            ))}
          </div>
          <button onClick={addLine} className="mt-2 text-sm font-semibold text-brand hover:underline">+ Dodaj postavko</button>
        </div>

        <TextAreaField label="Opomba / opis dela" value={quote.note} onChange={(v) => setQuote((q) => ({ ...q, note: v }))} rows={2} />

        {/* Seštevki */}
        <div className="ml-auto w-full max-w-xs rounded-card bg-surface2 p-4">
          <Row label="Neto" value={formatMoneyMinor(String(totals.netMinor))} />
          <Row label="DDV" value={formatMoneyMinor(String(totals.vatMinor))} />
          <div className="mt-1 flex items-center justify-between border-t border-line pt-2">
            <span className="font-bold text-ink">Skupaj</span>
            <span className="num text-lg font-extrabold text-ink">{formatMoneyMinor(String(totals.grossMinor))}</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button tone="neutral" onClick={() => saveQuote('draft')} disabled={busy}>Shrani osnutek</Button>
          <Button tone="info" onClick={() => saveQuote('sent')} disabled={busy}>Označi kot poslano</Button>
          <Button tone="go" size="lg" onClick={convert} disabled={busy}>{busy ? <Spinner /> : 'Pretvori v nalog'}</Button>
        </div>
      </Card>

      {/* Zgodovina */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-bold text-ink">Zadnji predračuni</h2>
          {history.length > 0 && <button onClick={() => quoteStore.clear().then(refreshHistory)} className="text-xs font-semibold text-muted2 hover:text-stop">Počisti</button>}
        </div>
        {history.length === 0 ? (
          <p className="p-8 text-center text-muted">Še ni shranjenih predračunov.</p>
        ) : (
          <ul className="divide-y divide-line">
            {history.map((h) => {
              const t = quoteTotals(h.lines);
              return (
                <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <button onClick={() => loadFromHistory(h)} className="min-w-0 text-left">
                    <p className="num font-bold text-ink">{h.number} <span className="font-normal text-muted">· {h.customerName || 'brez stranke'}</span></p>
                    <p className="num text-xs text-muted2">{new Date(h.createdAt).toLocaleString('sl-SI')} · {formatMoneyMinor(String(t.grossMinor))}{h.workOrderId ? ` · ${h.workOrderId}` : ''}</p>
                  </button>
                  <SoftChip tone={h.status === 'converted' || h.status === 'accepted' ? 'go' : h.status === 'sent' ? 'info' : 'neutral'}>{quoteStatusLabel(h.status)}</SoftChip>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="num font-semibold text-ink">{value}</span>
    </div>
  );
}
