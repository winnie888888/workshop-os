'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { formatMoneyMinor, formatVatRate, vatBreakdownMinor, docTotalsMinor } from '@/lib/format';
import { loadSettings } from '@/lib/workshop-settings';

/*
 * Print / PDF view of a predračun (quote) — a clean A4 sheet rendered OUTSIDE
 * the app shell (root layout only, so no sidebar). Opens the browser print
 * dialog automatically; "Shrani kot PDF" produces the offer the workshop sends
 * to the customer. A predračun is NOT a tax document (no DDV is due on it), so
 * it carries an explicit note and no reverse-charge tax clause.
 */
export default function QuotePrint() {
  const { id } = useParams<{ id: string }>();
  const { data: est } = useSWR(['print-est', id], () => api.estimates.get(id).catch(() => null));
  const { data: customer } = useSWR(est?.customerId ? ['print-est-cust', est.customerId] : null, () => api.customers.get(est!.customerId).catch(() => null));
  const { data: vehicle } = useSWR(est?.vehicleId ? ['print-est-veh', est.vehicleId] : null, () => api.assets.get(est!.vehicleId).catch(() => null));
  const [company, setCompany] = useState<{ name: string; address: string; vatId: string; iban: string } | null>(null);
  useEffect(() => { loadSettings().then((s) => setCompany(s.company)).catch(() => { /* ignore */ }); }, []);

  const printed = useRef(false);
  useEffect(() => {
    if (est && company && !printed.current) {
      printed.current = true;
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [est, company]);

  if (!est) return <div className="p-10 text-center text-muted">Nalagam predračun…</div>;

  const cur = est.currency || 'EUR';
  const totals = docTotalsMinor((est.lines as any[]) ?? []);
  const rows = vatBreakdownMinor((est.lines as any[]) ?? []);
  const ref = String(est.number ?? '').replace(/\D/g, '');

  return (
    <div className="min-h-screen bg-floor py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4 print:hidden">
        <a href={`/advisor/quotes/${id}`} className="text-sm font-semibold text-muted hover:text-brand">‹ Nazaj na predračun</a>
        <button onClick={() => window.print()} className="min-h-tap rounded-tool bg-brand px-5 font-semibold text-white">Natisni / shrani PDF</button>
      </div>

      <div className="mx-auto max-w-[210mm] bg-white p-[16mm] text-[13px] leading-relaxed text-ink shadow-card print:max-w-none print:p-0 print:shadow-none">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-lg font-extrabold">{company?.name || 'Delavnica'}</div>
            {company?.address && <div className="text-steel">{company.address}</div>}
            {company?.vatId && <div className="num text-steel">ID za DDV: {company.vatId}</div>}
          </div>
          <div className="text-right">
            <div className="text-xl font-extrabold tracking-tight">Predračun</div>
            <div className="num text-lg font-bold">{est.number}</div>
            <div className="num mt-1 text-steel">Datum: {est.issueDate ?? est.createdAt ?? '—'}</div>
            {est.validUntil && <div className="num text-steel">Velja do: {est.validUntil}</div>}
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-line p-3">
            <div className="text-[0.65rem] font-bold uppercase tracking-wide text-muted2">Stranka</div>
            <div className="mt-0.5 font-semibold">{customer?.name ?? est.customerId ?? '—'}</div>
            {(customer?.address || customer?.city) && (
              <div className="text-steel">{[customer?.address, [customer?.postCode, customer?.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</div>
            )}
            {customer?.vatId && <div className="num text-steel">ID za DDV: {customer.vatId}</div>}
          </div>
          {vehicle && (
            <div className="rounded border border-line p-3">
              <div className="text-[0.65rem] font-bold uppercase tracking-wide text-muted2">Vozilo</div>
              <div className="num mt-0.5 font-semibold">{vehicle.plate ?? '—'}</div>
              {(vehicle.make || vehicle.model) && <div className="text-steel">{[vehicle.make, vehicle.model].filter(Boolean).join(' ')}</div>}
              {vehicle.vin && <div className="num text-steel">VIN: {vehicle.vin}</div>}
            </div>
          )}
        </div>

        {Array.isArray(est.lines) && est.lines.length > 0 && (
          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left text-xs uppercase text-muted2">
                <th className="py-2">Opis</th><th className="py-2 text-right">Količina</th><th className="py-2 text-right">Cena</th><th className="py-2 text-right">Popust</th><th className="py-2 text-right">DDV %</th><th className="py-2 text-right">Neto</th>
              </tr>
            </thead>
            <tbody>
              {(est.lines as any[]).map((l, i) => (
                <tr key={i} className="border-b border-line">
                  <td className="py-2">{l.description ?? l.name ?? ''}</td>
                  <td className="num py-2 text-right">{l.qty ?? ''}</td>
                  <td className="num py-2 text-right">{formatMoneyMinor(String(l.unitPriceMinor ?? '0'), cur)}</td>
                  <td className="num py-2 text-right">{(l.discountPct || 0) > 0 ? `−${formatVatRate(l.discountPct)} %` : '—'}</td>
                  <td className="num py-2 text-right">{String(l.vatRatePct ?? '')}%</td>
                  <td className="num py-2 text-right">{formatMoneyMinor(String(Math.round((l.qty || 0) * (l.unitPriceMinor || 0) * (1 - (l.discountPct || 0) / 100))), cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {rows.length > 0 && (
          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted2"><th className="py-1">Rekapitulacija DDV</th><th className="py-1 text-right">Osnova</th><th className="py-1 text-right">DDV</th></tr>
            </thead>
            <tbody>
              {rows.map((b: any) => (
                <tr key={b.ratePct} className="border-t border-line">
                  <td className="num py-1">{formatVatRate(b.ratePct)} %</td>
                  <td className="num py-1 text-right">{formatMoneyMinor(b.netMinor, cur)}</td>
                  <td className="num py-1 text-right">{formatMoneyMinor(b.vatMinor, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-6 ml-auto w-64 text-sm">
          <div className="flex justify-between py-1"><span className="text-steel">Neto</span><span className="num">{formatMoneyMinor(totals.netMinor, cur)}</span></div>
          <div className="flex justify-between py-1"><span className="text-steel">DDV</span><span className="num">{formatMoneyMinor(totals.vatMinor, cur)}</span></div>
          <div className="flex justify-between border-t-2 border-ink py-1 text-base font-extrabold"><span>Skupaj</span><span className="num">{formatMoneyMinor(totals.grossMinor, cur)}</span></div>
        </div>

        <div className="mt-8 border-t border-line pt-3 text-xs text-steel">
          {company?.iban && <div className="num">Za predplačilo: IBAN {company.iban} · sklic SI00 {ref} · znesek {formatMoneyMinor(totals.grossMinor, cur)}</div>}
          <div className="mt-1">Predračun ni davčni dokument; DDV se obračuna na računu ob dobavi.</div>
        </div>
      </div>
    </div>
  );
}
