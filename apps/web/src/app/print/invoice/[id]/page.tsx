'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { DEMO_MODE } from '@/lib/demo';
import { formatMoneyMinor, formatVatRate } from '@/lib/format';
import { loadSettings } from '@/lib/workshop-settings';
import { buildUpnQr, upnQrSvg, rfReference } from '@/lib/qr/upn';
import { PrintLogo } from '@/components/print-logo';

/*
 * Tiskani RAČUN — predloga, vsebinsko enaka obstoječim Minimax računom
 * delavnice (zahteva: »računi morajo biti identični s pravimi«):
 *  - glava: naziv, naslov, Identifikacijska številka, Tel/Faks/E-pošta + logo,
 *    desno OBA TRR z BIC (podatki iz strežniškega profila delavnice),
 *  - blok RAČUN: Številka, Kraj, Referenca, Datum, Opravljeno, Zapade,
 *  - tabela: Vrsta blaga oz. storitev / Količina / Cena / DDV / Cena z DDV / Vrednost,
 *  - vsote: SKUPAJ, DDV po stopnjah z osnovo, SKUPAJ EUR, Za plačilo EUR,
 *  - UPN QR za plačilo v mobilni banki (isti standard kot na zaslonu računa),
 *  - pravna klavzula (vračilo delov, pregled ob prevzemu, pridržek lastništva),
 *  - registracijska noga družbe (sodišče, kapital, matična — iz Nastavitev).
 * Referenca je RF (ISO 11649 s kontrolnima številkama) — banke jo sprejmejo
 * enako kot SI00, uvoz izpiskov pa jo ujame stoodstotno.
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

const LEGAL_TERMS = [
  'Vgrajeni rezervni deli, potrošni material in naročeno blago se po vgradnji, uporabi ali prevzemu ne vračajo, razen v primerih, ki jih določa veljavna zakonodaja.',
  'Stranka je dolžna ob prevzemu vozila pregledati opravljeno storitev in vgrajeni material ter morebitne očitne napake ali pomanjkljivosti nemudoma sporočiti. Kasnejše reklamacije se obravnavajo skladno z veljavno zakonodajo, garancijskimi pogoji proizvajalca in dokazljivostjo napake.',
  'Do celotnega plačila računa ostanejo vgrajeni rezervni deli in dobavljeno blago last izvajalca. V primeru neplačila ali zamude pri plačilu si izvajalec pridržuje pravico do obračuna zakonskih zamudnih obresti, stroškov opominjanja in stroškov izterjave v skladu z veljavnimi predpisi.',
];

export default function InvoicePrint() {
  const { id } = useParams<{ id: string }>();
  const { data: inv } = useSWR(['print-inv', id], () => api.invoices.get(id));
  const { data: customer } = useSWR(inv?.customerId ? ['print-inv-cust', inv.customerId] : null, () => api.customers.get(inv!.customerId));
  const { data: profile } = useSWR(DEMO_MODE ? null : 'tenant-profile', () => api.tenant.profile().catch(() => null));
  const [settings, setSettings] = useState<{ name: string; address: string; vatId: string; iban: string } | null>(null);
  useEffect(() => { loadSettings().then((s) => setSettings(s.company)).catch(() => { /* ignore */ }); }, []);

  // Profil delavnice (strežnik) ima prednost; lokalne nastavitve so rezerva.
  const co = {
    name: profile?.name || settings?.name || 'Delavnica',
    address: profile?.address || settings?.address || '',
    postCity: [profile?.postCode, profile?.city].filter(Boolean).join(' '),
    vatId: profile?.vatId || settings?.vatId || '',
    phone: profile?.phone || '', fax: profile?.fax || '',
    email: profile?.email || '', website: profile?.website || '',
    iban: (profile?.iban || settings?.iban || '').replace(/\s+/g, ''),
    bic: profile?.bic || '', iban2: (profile?.iban2 || '').replace(/\s+/g, ''), bic2: profile?.bic2 || '',
    registrationNote: profile?.registrationNote || '',
  };

  const printed = useRef(false);
  useEffect(() => {
    if (inv && (profile !== undefined || settings) && !printed.current) {
      printed.current = true;
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [inv, profile, settings]);

  if (!inv) return <div className="p-10 text-center text-muted">Nalagam račun…</div>;

  const rows = recapRows(inv);
  const cur = inv.currency || 'EUR';
  const isCredit = inv.kind === 'credit_note';
  const remainingMinor = Number(inv.totalGrossMinor ?? 0) - Number(inv.paidMinor ?? 0);
  const ref = inv.number ? rfReference(String(inv.number)) : null;

  // UPN QR — isti standard kot na zaslonu računa; brez IBAN/zneska ga ni.
  let qrSvg: string | null = null;
  if (!isCredit && co.iban && ref && remainingMinor > 0) {
    try {
      const qr = buildUpnQr({
        recipient: { iban: co.iban, name: co.name, street: co.address || undefined, city: co.postCity || undefined },
        amountMinor: remainingMinor,
        purpose: `Plačilo računa ${inv.number}`,
        purposeCode: 'GDSV',
        reference: ref,
        deadline: inv.dueDate ?? undefined,
        payer: customer?.name ? {
          name: customer.name,
          street: customer.address ?? undefined,
          city: [customer.postCode, customer.city].filter(Boolean).join(' ') || undefined,
        } : undefined,
      });
      qrSvg = upnQrSvg(qr.payload, 46);
    } catch { qrSvg = null; }
  }

  const fmtIban = (i: string) => i.replace(/(.{4})/g, '$1 ').trim();
  const unitGross = (l: any) => {
    const unit = Number(l.unit_price_minor ?? l.unitPriceMinor ?? 0);
    const rate = Number(l.vat_rate_pct ?? l.vatRatePct ?? 0);
    return Math.round(unit * (1 + rate / 100));
  };

  return (
    <div className="min-h-screen bg-floor py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4 print:hidden">
        <a href={`/advisor/invoices/${id}`} className="text-sm font-semibold text-muted hover:text-brand">‹ Nazaj na račun</a>
        <button onClick={() => window.print()} className="min-h-tap rounded-tool bg-brand px-5 font-semibold text-white">Natisni / shrani PDF</button>
      </div>

      <div className="mx-auto flex min-h-[270mm] max-w-[210mm] flex-col bg-white p-[14mm] text-[13px] leading-relaxed text-ink shadow-card print:max-w-none print:p-0 print:shadow-none">
        {/* Glava: podjetje levo, TRR-ji desno — kot Minimax */}
        <div className="flex items-start justify-between gap-6">
          <div className="leading-snug">
            <PrintLogo companyName={co.name} />
            <div className="text-base font-extrabold uppercase">{co.name}</div>
            {co.address && <div className="uppercase">{co.address}</div>}
            {co.postCity && <div>{co.postCity}</div>}
            {co.vatId && <div>Identifikacijska številka: <span className="num">{co.vatId}</span></div>}
            {co.phone && <div>Tel. <span className="num">{co.phone}</span></div>}
            {co.fax && <div>Fax: <span className="num">{co.fax}</span></div>}
            {co.email && <div>E-mail: {co.email}</div>}
            {co.website && <div>{co.website}</div>}
          </div>
          <div className="num pt-1 text-right leading-snug">
            {co.iban && <div>IBAN: {fmtIban(co.iban)}{co.bic ? `  BIC:${co.bic}` : ''}</div>}
            {co.iban2 && <div>IBAN: {fmtIban(co.iban2)}{co.bic2 ? `  BIC:${co.bic2}` : ''}</div>}
          </div>
        </div>

        {/* Kupec levo, blok RAČUN desno */}
        <div className="mt-10 flex items-start justify-between gap-8">
          <div className="leading-snug">
            <div className="font-bold uppercase">{customer?.name ?? '—'}</div>
            {customer?.address && <div>{customer.address}</div>}
            {(customer?.postCode || customer?.city) && (
              <div>{[customer?.postCode, customer?.city].filter(Boolean).join('  ')}</div>
            )}
            {customer?.vatId && <div className="mt-3">Identifikacijska številka: <span className="num">{customer.vatId}</span></div>}
          </div>
          <div className="min-w-72">
            <div className="text-2xl font-bold tracking-wide">{isCredit ? 'DOBROPIS' : 'RAČUN'}</div>
            <table className="mt-2 text-[13px] leading-snug">
              <tbody>
                <tr><td className="pr-6 font-semibold">Številka:</td><td className="num text-right font-bold">{inv.number ?? '— osnutek —'}</td></tr>
                <tr><td className="pr-6 font-semibold">Kraj:</td><td className="text-right uppercase">{profile?.city ?? ''}</td></tr>
                {ref && <tr><td className="pr-6 font-semibold">Referenca:</td><td className="num text-right">{ref}</td></tr>}
                <tr><td className="pr-6 font-semibold">Datum:</td><td className="num text-right">{inv.issueDate ?? '—'}</td></tr>
                <tr><td className="pr-6 font-semibold">Opravljeno:</td><td className="num text-right">{inv.serviceDate ?? inv.deliveryDate ?? inv.issueDate ?? '—'}</td></tr>
                <tr><td className="pr-6 font-semibold">Zapade:</td><td className="num text-right">{inv.dueDate ?? '—'}</td></tr>
                <tr><td className="pr-6 font-semibold">Osnova za račun:</td><td className="text-right"> </td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {inv.reverseCharge && (
          <div className="mt-4 text-xs">
            <span className="font-semibold">Obrnjena davčna obveznost</span> — {String(inv.vatTreatment ?? '').includes('eu') ? 'čl. 196 Direktive 2006/112/ES (DDV obračuna prejemnik).' : '76.a člen ZDDV-1 (DDV obračuna prejemnik).'}
          </div>
        )}
        {inv.vatNote && <div className="mt-2 text-xs">{inv.vatNote}</div>}

        {/* Postavke — Minimax stolpci */}
        <div className="mt-8">Izstavljamo vam račun za:</div>
        <table className="mt-1 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b-2 border-t border-ink text-left">
              <th className="py-1.5 font-bold">Vrsta blaga oz.storitev</th>
              <th className="py-1.5 text-right font-bold">Količina</th>
              <th className="py-1.5 text-right font-bold">Cena</th>
              <th className="py-1.5 text-right font-bold">DDV</th>
              <th className="py-1.5 text-right font-bold">Cena z DDV</th>
              <th className="py-1.5 text-right font-bold">Vrednost {cur}</th>
            </tr>
          </thead>
          <tbody>
            {(inv.lines ?? []).map((l: any, i: number) => {
              const rate = Number(l.vat_rate_pct ?? l.vatRatePct ?? 0);
              return (
                <tr key={i} className="align-top">
                  <td className="py-1 pr-2">
                    {l.description}
                    {Number(l.discount_pct ?? l.discountPct ?? 0) > 0 && (
                      <span className="text-xs"> (popust {formatVatRate(Number(l.discount_pct ?? l.discountPct))} %)</span>
                    )}
                  </td>
                  <td className="num py-1 text-right">{Number(l.qty ?? l.quantity ?? 0).toFixed(2).replace('.', ',')}</td>
                  <td className="num py-1 text-right">{formatMoneyMinor(String(l.unit_price_minor ?? l.unitPriceMinor ?? '0'), cur).replace(/[^\d,.]/g, '')}</td>
                  <td className="num py-1 text-right">{formatMoneyMinor(String(l.vat_minor ?? '0'), cur).replace(/[^\d,.]/g, '')} ({formatVatRate(rate)} %)</td>
                  <td className="num py-1 text-right">{formatMoneyMinor(String(unitGross(l)), cur).replace(/[^\d,.]/g, '')}</td>
                  <td className="num py-1 text-right">{formatMoneyMinor(String(l.net_minor ?? '0'), cur).replace(/[^\d,.]/g, '')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Vsote — kot Minimax */}
        <div className="mt-2 border-t border-ink pt-1">
          <div className="ml-auto w-96 text-[13px]">
            <div className="flex justify-between py-0.5"><span className="font-bold">SKUPAJ:</span><span className="num">{formatMoneyMinor(inv.totalNetMinor, cur).replace(/[^\d,.]/g, '')}</span></div>
            {rows.map((b) => (
              <div key={b.ratePct} className="flex justify-between py-0.5">
                <span>DDV: {formatVatRate(b.ratePct)}%</span>
                <span>od: <span className="num">{formatMoneyMinor(b.netMinor, cur).replace(/[^\d,.]/g, '')}</span></span>
                <span className="num">{formatMoneyMinor(b.vatMinor, cur).replace(/[^\d,.]/g, '')}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-ink py-0.5"><span className="font-bold">SKUPAJ {cur}:</span><span className="num font-bold">{formatMoneyMinor(inv.totalGrossMinor, cur).replace(/[^\d,.]/g, '')}</span></div>
            <div className="flex justify-between py-0.5 text-base"><span className="font-bold">Za plačilo {cur}:</span><span className="num font-extrabold">{formatMoneyMinor(inv.totalGrossMinor, cur).replace(/[^\d,.]/g, '')}</span></div>
          </div>
        </div>

        {/* UPN QR + podpis */}
        <div className="mt-8 flex items-end justify-between gap-8">
          <div>
            <div>PODPIS:</div>
            <div className="mt-8 w-56 border-b border-ink" />
          </div>
          {qrSvg && (
            <div className="text-center">
              <div dangerouslySetInnerHTML={{ __html: qrSvg }} className="[&_svg]:h-32 [&_svg]:w-32" />
              <div className="mt-1 text-[10px]">Plačajte s skenom v mobilni banki (UPN QR)</div>
              <div className="num text-[10px]">sklic {ref}</div>
            </div>
          )}
        </div>

        {/* Pravna klavzula — na vsakem računu */}
        <div className="mt-auto pt-8">
          <div className="space-y-1.5 text-[9.5px] leading-snug text-zinc-600">
            {LEGAL_TERMS.map((t, i) => <p key={i}>{t}</p>)}
          </div>
          {co.registrationNote && (
            <div className="mt-4 border-t border-zinc-400 pt-2 text-[10px] leading-snug text-zinc-700">
              {co.registrationNote}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
