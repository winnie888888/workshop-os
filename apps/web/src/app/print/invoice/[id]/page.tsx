'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { formatMoneyMinor, formatVatRate } from '@/lib/format';
import { loadSettings } from '@/lib/workshop-settings';

/*
 * Print / PDF view of an invoice — a clean A4 sheet rendered OUTSIDE the app
 * shell (only the root layout applies, so no sidebar/topbar). Opens the browser
 * print dialog automatically; "Shrani kot PDF" produces the document the
 * workshop sends to the customer. Reads the same data as the invoice detail
 * (api.invoices.get) plus the buyer (via customerId) and issuer (Settings).
 */

interface RecapRow { ratePct: number; netMinor: number; vatMinor: number }

function recapRows(inv: any): RecapRow[] {
  const bd = inv?.vatBreakdown;
  if (Array.isArray(bd) && bd.length) {
    return bd.map((b: any) => ({ ratePct: Number(b.rate_pct) || 0, netMinor: Number(b.net_minor) || 0, vatMinor: Number(b.vat_minor) || 0 }));
  }
  const map = new Map<number, { net: number; vat: number }>();
  for (const l of (inv?.lines ?? [])) {
    const rate = Number(l.vat_rate_pct) || 0;
    const net = Number(l.net_minor) || 0;
    const cur = map.get(rate) || { net: 0, vat: 0 };
    cur.net += net;
    cur.vat += Math.round((net * rate) / 100);
    map.set(rate, cur);
  }
  return [...map.entries()].map(([ratePct, v]) => ({ ratePct, netMinor: v.net, vatMinor: v.vat })).sort((a, b) => b.ratePct - a.ratePct);
}

export default function InvoicePrint() {
  const { id } = useParams<{ id: string }>();
  const { data: inv } = useSWR(['print-inv', id], () => api.invoices.get(id));
  const { data: customer } = useSWR(inv?.customerId ? ['print-inv-cust', inv.customerId] : null, () => api.customers.get(inv.customerId));
  const [company, setCompany] = useState<{ name: string; address: string; vatId: string; iban: string } | null>(null);
  useEffect(() => { loadSettings().then((s) => setCompany(s.company)).catch(() => { /* ignore */ }); }, []);

  const printed = useRef(false);
  useEffect(() => {
    if (inv && company && !printed.current) {
      printed.current = true;
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [inv, company]);

  if (!inv) return <div className="p-10 text-center text-muted">Nalagam račun…</div>;

  const rows = recapRows(inv);
  const cur = inv.currency || 'EUR';
  const ref = String(inv.number ?? '').replace(/\D/g, '');

  return (
    <div className="min-h-screen bg-floor py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4 print:hidden">
        <a href={`/advisor/invoices/${id}`} className="text-sm font-semibold text-muted hover:text-brand">‹ Nazaj na račun</a>
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
            <div className="text-xl font-extrabold tracking-tight">{inv.kind === 'credit_note' ? 'Dobropis' : 'Račun'}</div>
            <div className="num text-lg font-bold">{inv.number}</div>
            <div className="num mt-1 text-steel">Izdano: {inv.issueDate ?? '—'}</div>
            <div className="num text-steel">Dobava / storitev: {inv.serviceDate ?? inv.deliveryDate ?? inv.issueDate ?? '—'}</div>
            <div className="num text-steel">Zapadlost: {inv.dueDate ?? '—'}</div>
          </div>
        </div>

        <div className="mt-8 rounded border border-line p-3">
          <div className="text-[0.65rem] font-bold uppercase tracking-wide text-muted2">Kupec</div>
          <div className="mt-0.5 font-semibold">{customer?.name ?? '—'}</div>
          {(customer?.address || customer?.city) && (
            <div className="text-steel">{[customer?.address, [customer?.postCode, customer?.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</div>
          )}
          {customer?.vatId && <div className="num text-steel">ID za DDV: {customer.vatId}</div>}
        </div>

        {inv.reverseCharge && (
          <div className="mt-4 rounded border border-line bg-floor px-3 py-2 text-xs">
            <span className="font-semibold text-ink">Obrnjena davčna obveznost</span> — {String(inv.vatTreatment ?? '').includes('eu') ? 'čl. 196 Direktive 2006/112/ES (DDV obračuna prejemnik).' : '76.a člen ZDDV-1 (DDV obračuna prejemnik).'}
          </div>
        )}
        {inv.vatNote && <div className="mt-2 text-xs text-steel">{inv.vatNote}</div>}

        {Array.isArray(inv.lines) && inv.lines.length > 0 && (
          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left text-xs uppercase text-muted2">
                <th className="py-2">Opis</th><th className="py-2 text-right">Količina</th><th className="py-2 text-right">Cena</th><th className="py-2 text-right">DDV %</th><th className="py-2 text-right">Neto</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((l: any, i: number) => (
                <tr key={i} className="border-b border-line">
                  <td className="py-2">{l.description}</td>
                  <td className="num py-2 text-right">{l.qty ?? l.quantity ?? ''}</td>
                  <td className="num py-2 text-right">{formatMoneyMinor(String(l.unit_price_minor ?? l.unitPriceMinor ?? '0'), cur)}</td>
                  <td className="num py-2 text-right">{String(l.vat_rate_pct ?? l.vatRatePct ?? '')}%</td>
                  <td className="num py-2 text-right">{formatMoneyMinor(String(l.net_minor ?? '0'), cur)}</td>
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
              {rows.map((b) => (
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
          <div className="flex justify-between py-1"><span className="text-steel">Neto</span><span className="num">{formatMoneyMinor(inv.totalNetMinor, cur)}</span></div>
          <div className="flex justify-between py-1"><span className="text-steel">DDV</span><span className="num">{formatMoneyMinor(inv.totalVatMinor, cur)}</span></div>
          <div className="flex justify-between border-t-2 border-ink py-1 text-base font-extrabold"><span>Za plačilo</span><span className="num">{formatMoneyMinor(inv.totalGrossMinor, cur)}</span></div>
        </div>

        <div className="mt-8 border-t border-line pt-3 text-xs text-steel">
          {company?.iban
            ? <div className="num">Plačilo na IBAN {company.iban} · sklic SI00 {ref} · znesek {formatMoneyMinor(inv.totalGrossMinor, cur)}</div>
            : <div>Plačilni podatki: dodaj IBAN v Nastavitvah → Podjetje.</div>}
        </div>
      </div>
    </div>
  );
}
