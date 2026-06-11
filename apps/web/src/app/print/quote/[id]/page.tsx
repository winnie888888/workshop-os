'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { DEMO_MODE } from '@/lib/demo';
import { formatMoneyMinor, formatVatRate, vatBreakdownMinor, docTotalsMinor } from '@/lib/format';
import { loadSettings } from '@/lib/workshop-settings';
import { buildUpnQr, upnQrSvg, rfReference } from '@/lib/qr/upn';
import { PrintLogo } from '@/components/print-logo';

/*
 * Tiskani PREDRAČUN — vizualno in vsebinsko 1:1 s tiskanim RAČUNOM (Minimax
 * predloga), z razlikami, ki jih zahteva narava dokumenta:
 *  - blok se imenuje PREDRAČUN, namesto »Zapade« ima »Velja do«
 *    (validUntil iz podatkov; če ga ni, datum izdaje + 7 dni),
 *  - UPN QR za avansno plačilo z RF sklicem (ISO 11649) iz številke
 *    predračuna — uvoz bančnih izpiskov (camt.053) tak sklic ujame in
 *    plačilo samodejno poveže, kar je ravno smisel P2 pipeline-a,
 *  - opomba, da predračun ni davčni dokument (DDV se obračuna na računu),
 *  - ista pravna klavzula in registracijska noga kot na računu.
 * Postavke predračuna so camelCase (qty/unitPriceMinor/discountPct/vatRatePct),
 * vsote in rekapitulacija DDV se izračunajo na klientu (docTotalsMinor /
 * vatBreakdownMinor) — predračun s strežnika ne nosi net_minor po vrsticah.
 */

const LEGAL_TERMS = [
  'Vgrajeni rezervni deli, potrošni material in naročeno blago se po vgradnji, uporabi ali prevzemu ne vračajo, razen v primerih, ki jih določa veljavna zakonodaja.',
  'Stranka je dolžna ob prevzemu vozila pregledati opravljeno storitev in vgrajeni material ter morebitne očitne napake ali pomanjkljivosti nemudoma sporočiti. Kasnejše reklamacije se obravnavajo skladno z veljavno zakonodajo, garancijskimi pogoji proizvajalca in dokazljivostjo napake.',
  'Do celotnega plačila računa ostanejo vgrajeni rezervni deli in dobavljeno blago last izvajalca. V primeru neplačila ali zamude pri plačilu si izvajalec pridržuje pravico do obračuna zakonskih zamudnih obresti, stroškov opominjanja in stroškov izterjave v skladu z veljavnimi predpisi.',
];

/** Privzeta veljavnost predračuna, če je strežnik ne določi. */
const DEFAULT_VALIDITY_DAYS = 7;

function addDaysIso(date: string | null | undefined, days: number): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function QuotePrint() {
  const { id } = useParams<{ id: string }>();
  const { data: est } = useSWR(['print-est', id], () => api.estimates.get(id).catch(() => null));
  const { data: customer } = useSWR(est?.customerId ? ['print-est-cust', est.customerId] : null, () => api.customers.get(est!.customerId).catch(() => null));
  const { data: vehicle } = useSWR(est?.vehicleId ? ['print-est-veh', est.vehicleId] : null, () => api.assets.get(est!.vehicleId).catch(() => null));
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
    if (est && (profile !== undefined || settings) && !printed.current) {
      printed.current = true;
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [est, profile, settings]);

  if (!est) return <div className="p-10 text-center text-muted">Nalagam predračun…</div>;

  const cur = est.currency || 'EUR';
  const lines = (est.lines as any[]) ?? [];
  const totals = docTotalsMinor(lines);
  const rows = vatBreakdownMinor(lines);
  const issueDate = est.issueDate ?? est.createdAt ?? null;
  const validUntil = est.validUntil ?? addDaysIso(issueDate, DEFAULT_VALIDITY_DAYS);
  const ref = est.number ? rfReference(String(est.number)) : null;

  // UPN QR za avansno plačilo — isti standard kot na računu; brez IBAN,
  // številke ali zneska ga ni (osnutek predračuna QR-ja ne dobi).
  let qrSvg: string | null = null;
  const grossMinor = Number(totals.grossMinor ?? 0);
  if (co.iban && ref && grossMinor > 0) {
    try {
      const qr = buildUpnQr({
        recipient: { iban: co.iban, name: co.name, street: co.address || undefined, city: co.postCity || undefined },
        amountMinor: grossMinor,
        purpose: `Plačilo po predračunu ${est.number}`,
        purposeCode: 'GDSV',
        reference: ref,
        deadline: validUntil ?? undefined,
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
  const lineNet = (l: any) =>
    Math.round(Number(l.qty ?? 0) * Number(l.unitPriceMinor ?? 0) * (1 - Number(l.discountPct ?? 0) / 100));
  const lineVat = (l: any) => Math.round((lineNet(l) * Number(l.vatRatePct ?? 0)) / 100);
  const unitGross = (l: any) =>
    Math.round(Number(l.unitPriceMinor ?? 0) * (1 + Number(l.vatRatePct ?? 0) / 100));
  const vehicleLabel = vehicle
    ? [vehicle.plate, [vehicle.make, vehicle.model].filter(Boolean).join(' '), vehicle.vin ? `VIN ${vehicle.vin}` : null]
        .filter(Boolean).join(', ')
    : null;

  return (
    <div className="min-h-screen bg-floor py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4 print:hidden">
        <a href={`/advisor/quotes/${id}`} className="text-sm font-semibold text-muted hover:text-brand">‹ Nazaj na predračun</a>
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

        {/* Kupec levo, blok PREDRAČUN desno */}
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
            <div className="text-2xl font-bold tracking-wide">PREDRAČUN</div>
            <table className="mt-2 text-[13px] leading-snug">
              <tbody>
                <tr><td className="pr-6 font-semibold">Številka:</td><td className="num text-right font-bold">{est.number ?? '— osnutek —'}</td></tr>
                <tr><td className="pr-6 font-semibold">Kraj:</td><td className="text-right uppercase">{profile?.city ?? ''}</td></tr>
                {ref && <tr><td className="pr-6 font-semibold">Referenca:</td><td className="num text-right">{ref}</td></tr>}
                <tr><td className="pr-6 font-semibold">Datum:</td><td className="num text-right">{issueDate ?? '—'}</td></tr>
                <tr><td className="pr-6 font-semibold">Velja do:</td><td className="num text-right">{validUntil ?? '—'}</td></tr>
                <tr><td className="pr-6 font-semibold">Osnova za predračun:</td><td className="text-right"> </td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Postavke — Minimax stolpci */}
        <div className="mt-8">
          Izstavljamo vam predračun za:{vehicleLabel ? <span> {vehicleLabel}</span> : null}
        </div>
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
            {lines.map((l: any, i: number) => {
              const rate = Number(l.vatRatePct ?? 0);
              return (
                <tr key={i} className="align-top">
                  <td className="py-1 pr-2">
                    {l.description ?? l.name ?? ''}
                    {Number(l.discountPct ?? 0) > 0 && (
                      <span className="text-xs"> (popust {formatVatRate(Number(l.discountPct))} %)</span>
                    )}
                  </td>
                  <td className="num py-1 text-right">{Number(l.qty ?? 0).toFixed(2).replace('.', ',')}</td>
                  <td className="num py-1 text-right">{formatMoneyMinor(String(l.unitPriceMinor ?? '0'), cur).replace(/[^\d,.]/g, '')}</td>
                  <td className="num py-1 text-right">{formatMoneyMinor(String(lineVat(l)), cur).replace(/[^\d,.]/g, '')} ({formatVatRate(rate)} %)</td>
                  <td className="num py-1 text-right">{formatMoneyMinor(String(unitGross(l)), cur).replace(/[^\d,.]/g, '')}</td>
                  <td className="num py-1 text-right">{formatMoneyMinor(String(lineNet(l)), cur).replace(/[^\d,.]/g, '')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Vsote — kot Minimax */}
        <div className="mt-2 border-t border-ink pt-1">
          <div className="ml-auto w-96 text-[13px]">
            <div className="flex justify-between py-0.5"><span className="font-bold">SKUPAJ:</span><span className="num">{formatMoneyMinor(totals.netMinor, cur).replace(/[^\d,.]/g, '')}</span></div>
            {rows.map((b: any) => (
              <div key={b.ratePct} className="flex justify-between py-0.5">
                <span>DDV: {formatVatRate(b.ratePct)}%</span>
                <span>od: <span className="num">{formatMoneyMinor(b.netMinor, cur).replace(/[^\d,.]/g, '')}</span></span>
                <span className="num">{formatMoneyMinor(b.vatMinor, cur).replace(/[^\d,.]/g, '')}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-ink py-0.5"><span className="font-bold">SKUPAJ {cur}:</span><span className="num font-bold">{formatMoneyMinor(totals.grossMinor, cur).replace(/[^\d,.]/g, '')}</span></div>
            <div className="flex justify-between py-0.5 text-base"><span className="font-bold">Za plačilo {cur}:</span><span className="num font-extrabold">{formatMoneyMinor(totals.grossMinor, cur).replace(/[^\d,.]/g, '')}</span></div>
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

        {/* Opomba o naravi dokumenta + pravna klavzula + registracijska noga */}
        <div className="mt-auto pt-8">
          <div className="mb-3 text-[10.5px] font-semibold text-zinc-700">
            Predračun ni davčni dokument; DDV se obračuna na računu ob dobavi. Predračun velja do navedenega datuma.
          </div>
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
