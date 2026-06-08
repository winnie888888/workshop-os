'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { DEMO_MODE } from '@/lib/demo';
import { formatMoneyMinor, estimateStatusLabel, estimateStatusTone, docTotalsMinor, displayPlate, vatBreakdownMinor, formatVatRate } from '@/lib/format';
import { Button, Card, SoftChip, Spinner, ProblemBanner, StatusChip } from '@/components/ui';

/*
 * Predračun — detail. Shows the lines and the document-chain status, with the
 * legal next steps as buttons:
 *   draft    → Pošlji (sent)
 *   sent     → Sprejmi (accepted) / Zavrni (rejected)
 *   accepted → Izstavi račun
 *
 * Izstavi račun: if the estimate came from a work order, we route to the
 * EXISTING invoice-issue flow for that work order (the one that already prices
 * and posts a demo invoice) and mark the estimate as računiran. Otherwise we
 * mint a central-store invoice directly and show its number.
 */
export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: est, isLoading, mutate } = useSWR(DEMO_MODE ? ['estimate', id] : null, () => api.estimates.get(id).catch(() => null));
  const { data: customer } = useSWR(est?.customerId ? ['est-cust', est.customerId] : null, () => api.customers.get(est.customerId).catch(() => null));
  const { data: vehicle } = useSWR(est?.vehicleId ? ['est-veh', est.vehicleId] : null, () => api.assets.get(est.vehicleId).catch(() => null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceNote, setInvoiceNote] = useState<string | null>(null);

  if (!DEMO_MODE) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="border-hold/40 bg-hold/5 p-6">
          <p className="font-semibold text-ink">Predračuni so na voljo v demo načinu.</p>
          <Link href="/advisor/quotes" className="mt-3 inline-block text-sm font-semibold text-brand">‹ Predračuni</Link>
        </Card>
      </div>
    );
  }
  if (isLoading) return <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>;
  if (!est || !est.id) return <Card className="p-6 text-muted">Predračun ni najden.</Card>;

  const totals = docTotalsMinor(est.lines);
  const vatRows = vatBreakdownMinor((est.lines as any[]) ?? []);
  const status: string = est.status;

  async function setStatus(next: string) {
    setBusy(true); setError(null);
    try { await api.estimates.setStatus(id, next); await mutate(); }
    catch { setError('Spremembe stanja ni bilo mogoče shraniti.'); }
    finally { setBusy(false); }
  }

  async function issueInvoice() {
    setBusy(true); setError(null);
    try {
      if (est.workOrderId) {
        await api.estimates.setStatus(id, 'invoiced');
        router.push(`/advisor/invoices/issue/${est.workOrderId}`);
        return;
      }
      const inv = await api.estimates.toInvoice(id);
      await mutate();
      setInvoiceNote(`Ustvarjen račun ${inv?.number ?? ''}.`);
    } catch { setError('Računa ni bilo mogoče izstaviti.'); setBusy(false); }
  }

  const vehLabel = vehicle ? [vehicle.plate ? displayPlate(vehicle.plate) : null, [vehicle.make, vehicle.model].filter(Boolean).join(' ')].filter(Boolean).join(' · ') : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <nav className="flex items-center gap-2 text-xs font-semibold text-muted">
        <Link href="/advisor/quotes" className="hover:text-brand">Predračuni</Link>
        <span className="text-muted2">/</span><span className="num text-ink">{est.number ?? '—'}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Predračun <span className="num">{est.number ?? ''}</span></h1>
        <StatusChip tone={estimateStatusTone(status)}>{estimateStatusLabel(status)}</StatusChip>
      </div>

      {error && <ProblemBanner message={error} />}
      {invoiceNote && (
        <Card className="border-go/40 bg-go/5 p-4 text-sm font-semibold text-ink">{invoiceNote}</Card>
      )}

      <Card className="grid grid-cols-2 gap-4 p-4 text-sm">
        <div><div className="text-xs uppercase text-muted2">Stranka</div><div className="font-semibold text-ink">{customer?.name ?? est.customerId}</div></div>
        <div><div className="text-xs uppercase text-muted2">Vozilo</div><div className="font-semibold text-ink">{vehLabel ?? '—'}</div></div>
        {est.workOrderId && (
          <div className="col-span-2"><div className="text-xs uppercase text-muted2">Iz delovnega naloga</div>
            <Link href={`/advisor/work-orders/${est.workOrderId}`} className="num font-semibold text-brand hover:underline">odpri nalog ›</Link></div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
            <tr><th className="p-3 font-bold">Vrsta</th><th className="p-3 font-bold">Opis</th><th className="p-3 text-right font-bold">Kol.</th><th className="p-3 text-right font-bold">Cena</th><th className="p-3 text-right font-bold">DDV</th><th className="p-3 text-right font-bold">Neto</th></tr>
          </thead>
          <tbody>
            {(est.lines as any[] ?? []).map((l) => (
              <tr key={l.id} className="border-t border-line">
                <td className="p-3"><SoftChip tone={l.kind === 'labour' ? 'info' : 'neutral'}>{l.kind === 'labour' ? 'Delo' : 'Del'}</SoftChip></td>
                <td className="p-3 text-ink">{l.description}</td>
                <td className="num p-3 text-right text-steel">{l.qty}</td>
                <td className="num p-3 text-right text-steel">{formatMoneyMinor(String(l.unitPriceMinor))}</td>
                <td className="num p-3 text-right text-muted">{l.vatRatePct}%</td>
                <td className="num p-3 text-right font-semibold text-ink">{formatMoneyMinor(String(Math.round((l.qty || 0) * (l.unitPriceMinor || 0))))}</td>
              </tr>
            ))}
            {(!est.lines || est.lines.length === 0) && (
              <tr><td colSpan={6} className="p-8 text-center text-muted">Predračun nima postavk.</td></tr>
            )}
          </tbody>
        </table>
        {vatRows.length > 1 && (
          <div className="flex flex-col items-end gap-0.5 border-t border-line bg-surface2 px-4 pt-3 text-xs text-muted">
            <span className="font-semibold uppercase tracking-wide text-muted2">Rekapitulacija DDV</span>
            {vatRows.map((b) => (
              <span key={b.ratePct} className="num">{formatVatRate(b.ratePct)} %: osnova {formatMoneyMinor(String(b.netMinor))} · DDV {formatMoneyMinor(String(b.vatMinor))}</span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-end gap-6 border-t border-line bg-surface2 p-4 text-sm">
          <span className="text-muted">Neto <span className="num font-semibold text-ink">{formatMoneyMinor(String(totals.netMinor))}</span></span>
          <span className="text-muted">DDV <span className="num font-semibold text-ink">{formatMoneyMinor(String(totals.vatMinor))}</span></span>
          <span className="text-right"><span className="text-xs uppercase text-muted2">Skupaj </span><span className="num text-lg font-extrabold text-ink">{formatMoneyMinor(String(totals.grossMinor))}</span></span>
        </div>
      </Card>

      {/* Status actions — legal next steps in the chain */}
      <div className="flex flex-wrap items-center gap-3">
        {status === 'draft' && <Button tone="info" onClick={() => setStatus('sent')} disabled={busy}>Pošlji stranki</Button>}
        {status === 'sent' && <>
          <Button tone="go" onClick={() => setStatus('accepted')} disabled={busy}>Sprejmi</Button>
          <Button tone="stop" onClick={() => setStatus('rejected')} disabled={busy}>Zavrni</Button>
        </>}
        {status === 'accepted' && <Button tone="go" size="lg" onClick={issueInvoice} disabled={busy}>Izstavi račun →</Button>}
        {status === 'rejected' && <span className="text-sm text-muted">Predračun je zavrnjen.</span>}
        {status === 'invoiced' && <span className="text-sm font-semibold text-go">Predračun je pretvorjen v račun.</span>}
      </div>
    </div>
  );
}
