'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { loadSettings } from '@/lib/workshop-settings';
import { PrintLogo } from '@/components/print-logo';

/*
 * Tiskani DELOVNI NALOG — A4 list, ki vizualno sledi papirnemu obrazcu
 * »Delovni nalog MEHANIČNI« (glava podjetja + logo, podatki o stranki,
 * podatki o vozilu, opis napake, mehanska dela z izvajalci in urami,
 * material s šifro, noga z davčno številko). Aplikacijski zaslon ostaja
 * moderen SaaS UI; ta pogled je uradni dokument za tisk / PDF.
 * Bere obstoječi nalog payload (api.workOrders.nalog) — brez podvajanja logike.
 */

interface NalogDoc {
  number: string;
  status: string;
  issuedFor: { customer: string | null; address: string | null; vatId: string | null; po: string | null };
  vehicle: { plate: string; vin: string | null; makeModel: string; odometer: number | null } | null;
  complaint: string | null;
  diagnosis: string | null;
  lines: Array<{ no: number; type: string; description: string; sku: string | null; quantity: string; unitPrice: string; net: string; gross: string; issued: boolean }>;
  labour: {
    entries: number; clockedHours: string;
    detail: Array<{ mechanic: string; date: string; from: string | null; to: string | null; hours: string | null; open: boolean }>;
    byMechanic: Array<{ name: string; hours: string }>;
  };
  totals: { net: string; vat: string; gross: string };
}

const STATUS_SL: Record<string, string> = {
  open: 'Novo', in_progress: 'V delu', awaiting_parts: 'Čaka dele',
  awaiting_approval: 'Čaka stranko', ready: 'Pripravljeno', invoiced: 'Fakturirano', cancelled: 'Preklicano',
};

function SectionBar({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 bg-zinc-700 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-white print:bg-zinc-700">{children}</div>;
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex border-b border-zinc-300 text-[13px]">
      <div className="w-44 flex-none bg-zinc-100 px-2 py-1 font-semibold">{label}</div>
      <div className="num flex-1 px-2 py-1">{value ?? ''}</div>
    </div>
  );
}

export default function WorkOrderPrint() {
  const { id } = useParams<{ id: string }>();
  const { data: nalog } = useSWR(['print-wo', id], () => api.workOrders.nalog(id) as Promise<NalogDoc>);
  const [company, setCompany] = useState<{ name: string; address: string; vatId: string; iban: string } | null>(null);
  useEffect(() => { loadSettings().then((s) => setCompany(s.company)).catch(() => { /* ignore */ }); }, []);

  const printed = useRef(false);
  useEffect(() => {
    if (nalog && company && !printed.current) {
      printed.current = true;
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [nalog, company]);

  if (!nalog) return <div className="p-10 text-zinc-500">Nalaganje naloga …</div>;

  const labourLines = nalog.lines.filter((l) => l.type === 'labour');
  const materialLines = nalog.lines.filter((l) => l.type !== 'labour');

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-8 text-black print:p-6">
      {/* Gumbi — samo na zaslonu */}
      <div className="mb-4 flex gap-2 print:hidden">
        <button onClick={() => window.print()} className="rounded bg-zinc-900 px-4 py-2 text-sm font-bold text-white">Natisni / Shrani kot PDF</button>
        <button onClick={() => window.close()} className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold">Zapri</button>
      </div>

      {/* Glava: podjetje + naziv dokumenta (kot papirni obrazec) */}
      <div className="flex items-start justify-between gap-4 border-2 border-zinc-700 p-3">
        <div className="text-[13px] leading-snug">
          <PrintLogo companyName={company?.name} />
          <div className="text-base font-extrabold">{company?.name || 'Delavnica'}</div>
          {company?.address && <div>{company.address}</div>}
          {company?.vatId && <div className="num">ID za DDV: {company.vatId}</div>}
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold uppercase tracking-tight">Delovni nalog</div>
          <div className="text-sm font-bold uppercase text-zinc-600">Mehanični</div>
          <div className="num mt-2 text-xl font-extrabold">{nalog.number}</div>
          <div className="num mt-1 text-[13px]">Datum: {new Date().toLocaleDateString('sl-SI')}</div>
          <div className="text-[13px]">Status: <span className="font-bold">{STATUS_SL[nalog.status] ?? nalog.status}</span></div>
        </div>
      </div>

      {/* Stranka */}
      <SectionBar>Podatki o stranki</SectionBar>
      <Row label="Ime in priimek / podjetje" value={nalog.issuedFor.customer} />
      <Row label="Naslov" value={nalog.issuedFor.address} />
      <Row label="Davčna št. (za podjetja)" value={nalog.issuedFor.vatId} />
      {nalog.issuedFor.po && <Row label="Naročilnica / PO" value={nalog.issuedFor.po} />}

      {/* Vozilo */}
      <SectionBar>Podatki o vozilu</SectionBar>
      <Row label="Znamka in model" value={nalog.vehicle?.makeModel} />
      <Row label="Registrska št." value={nalog.vehicle?.plate} />
      <Row label="VIN" value={nalog.vehicle?.vin} />
      <Row label="Stanje števca (km)" value={nalog.vehicle?.odometer ?? null} />

      {/* Opis napake */}
      <SectionBar>Opis napake ali popravila</SectionBar>
      <div className="min-h-12 border-b border-zinc-300 px-2 py-1 text-[13px]">
        {nalog.complaint || '—'}
        {nalog.diagnosis && <div className="mt-1 text-zinc-700"><span className="font-semibold">Diagnoza:</span> {nalog.diagnosis}</div>}
      </div>

      {/* Mehanska dela */}
      <SectionBar>Mehanska dela</SectionBar>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-zinc-100 text-left">
            <th className="border border-zinc-300 px-2 py-1">Opis dela</th>
            <th className="border border-zinc-300 px-2 py-1 text-right">Ure</th>
            <th className="border border-zinc-300 px-2 py-1 text-right">Cena/h</th>
            <th className="border border-zinc-300 px-2 py-1 text-right">Znesek</th>
          </tr>
        </thead>
        <tbody>
          {labourLines.length === 0 && (
            <tr><td colSpan={4} className="border border-zinc-300 px-2 py-2 text-zinc-500">Ni postavk dela.</td></tr>
          )}
          {labourLines.map((l) => (
            <tr key={l.no}>
              <td className="border border-zinc-300 px-2 py-1">{l.description}</td>
              <td className="num border border-zinc-300 px-2 py-1 text-right">{l.quantity}</td>
              <td className="num border border-zinc-300 px-2 py-1 text-right">{l.unitPrice}</td>
              <td className="num border border-zinc-300 px-2 py-1 text-right">{l.net}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Izvajalci in ure (papirni stolpec Datum/Izvajalec/Ure) */}
      {nalog.labour.detail.length > 0 && (
        <table className="mt-2 w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-zinc-100 text-left">
              <th className="border border-zinc-300 px-2 py-1">Datum</th>
              <th className="border border-zinc-300 px-2 py-1">Izvajalec</th>
              <th className="border border-zinc-300 px-2 py-1">Od–do</th>
              <th className="border border-zinc-300 px-2 py-1 text-right">Ure</th>
            </tr>
          </thead>
          <tbody>
            {nalog.labour.detail.map((t, i) => (
              <tr key={i}>
                <td className="num border border-zinc-300 px-2 py-1">{t.date}</td>
                <td className="border border-zinc-300 px-2 py-1">{t.mechanic}</td>
                <td className="num border border-zinc-300 px-2 py-1">{t.from ?? ''}{t.to ? `–${t.to}` : ''}</td>
                <td className="num border border-zinc-300 px-2 py-1 text-right">{t.open ? 'v teku' : t.hours ?? ''}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td colSpan={3} className="border border-zinc-300 px-2 py-1 text-right">Skupaj ur</td>
              <td className="num border border-zinc-300 px-2 py-1 text-right">{nalog.labour.clockedHours}</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Material */}
      <SectionBar>Material</SectionBar>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-zinc-100 text-left">
            <th className="w-24 border border-zinc-300 px-2 py-1">Šifra</th>
            <th className="border border-zinc-300 px-2 py-1">Material</th>
            <th className="border border-zinc-300 px-2 py-1 text-right">Količina</th>
            <th className="border border-zinc-300 px-2 py-1 text-right">Cena (€)</th>
            <th className="border border-zinc-300 px-2 py-1 text-right">Skupaj</th>
          </tr>
        </thead>
        <tbody>
          {materialLines.length === 0 && (
            <tr><td colSpan={5} className="border border-zinc-300 px-2 py-2 text-zinc-500">Ni materiala.</td></tr>
          )}
          {materialLines.map((l) => (
            <tr key={l.no}>
              <td className="num border border-zinc-300 px-2 py-1">{l.sku ?? ''}</td>
              <td className="border border-zinc-300 px-2 py-1">{l.description}</td>
              <td className="num border border-zinc-300 px-2 py-1 text-right">{l.quantity}</td>
              <td className="num border border-zinc-300 px-2 py-1 text-right">{l.unitPrice}</td>
              <td className="num border border-zinc-300 px-2 py-1 text-right">{l.net}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Vsote */}
      <div className="mt-3 ml-auto w-64 text-[13px]">
        <div className="flex justify-between border-b border-zinc-300 py-0.5"><span>Skupaj brez DDV</span><span className="num font-semibold">{nalog.totals.net}</span></div>
        <div className="flex justify-between border-b border-zinc-300 py-0.5"><span>DDV</span><span className="num font-semibold">{nalog.totals.vat}</span></div>
        <div className="flex justify-between border-t-2 border-zinc-700 py-1 text-base font-extrabold"><span>Skupaj</span><span className="num">{nalog.totals.gross}</span></div>
      </div>

      {/* Opomba + podpisa */}
      <SectionBar>Opomba</SectionBar>
      <div className="min-h-10 border-b border-zinc-300 px-2 py-1 text-[13px]"> </div>
      <div className="mt-8 grid grid-cols-2 gap-12 text-[13px]">
        <div><div className="border-t border-zinc-500 pt-1">Podpis izvajalca</div></div>
        <div><div className="border-t border-zinc-500 pt-1">Podpis stranke</div></div>
      </div>

      {/* Noga kot na papirju */}
      <div className="mt-8 flex justify-between border-t border-zinc-400 pt-2 text-[11px] text-zinc-600">
        <span>Delovni nalog: MEHANIČNI</span>
        <span>{company?.name ?? ''}</span>
        <span className="num">{company?.vatId ? `Davčna št.: ${company.vatId}` : ''}</span>
      </div>
    </div>
  );
}
