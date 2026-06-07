'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatMoneyMinor } from '@/lib/format';
import { Card, Spinner, ProblemBanner } from '@/components/ui';

/*
 * Poročila — finančni pregled iz pravih report endpointov: promet, DDV po
 * stopnjah in stanje terjatev. Obdobje izbereš s hitrimi gumbi ali po meri.
 * Demo-varno: kjer endpoint v demu ni stuban, prikaže prazno stanje.
 */

type RangeKey = 'thisMonth' | 'lastMonth' | 'ytd' | 'custom';

function iso(d: Date) { return d.toISOString().slice(0, 10); }
function monthRange(offset: number): [string, string] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return [iso(start), iso(end)];
}

export default function ReportsPage() {
  const [rangeKey, setRangeKey] = useState<RangeKey>('thisMonth');
  const [from, setFrom] = useState(() => monthRange(0)[0]);
  const [to, setTo] = useState(() => monthRange(0)[1]);

  const [revenue, setRevenue] = useState<any | null | undefined>(undefined);
  const [vat, setVat] = useState<any | null | undefined>(undefined);
  const [aging, setAging] = useState<any | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  function applyRange(key: RangeKey) {
    setRangeKey(key);
    if (key === 'thisMonth') { const [f, t] = monthRange(0); setFrom(f); setTo(t); }
    else if (key === 'lastMonth') { const [f, t] = monthRange(-1); setFrom(f); setTo(t); }
    else if (key === 'ytd') { const y = new Date().getFullYear(); setFrom(`${y}-01-01`); setTo(iso(new Date())); }
  }

  useEffect(() => {
    let live = true;
    setError(null); setRevenue(undefined); setVat(undefined); setAging(undefined);
    api.reports.revenue(from, to).then((d) => live && setRevenue(d)).catch(() => live && setRevenue(null));
    api.reports.vat(from, to).then((d) => live && setVat(d)).catch(() => live && setVat(null));
    api.reports.arAging(to).then((d) => live && setAging(d)).catch(() => live && setAging(null));
    return () => { live = false; };
  }, [from, to]);

  const agingF = useMemo(() => (key: string) =>
    (aging?.formatted?.[key]) || (aging ? formatMoneyMinor(aging.buckets[key]) : '—'), [aging]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Poročila</h1>
        <div className="flex flex-wrap items-center gap-2">
          {([['thisMonth', 'Ta mesec'], ['lastMonth', 'Pretekli mesec'], ['ytd', 'Letos'], ['custom', 'Po meri']] as [RangeKey, string][]).map(([k, l]) => (
            <button key={k} onClick={() => applyRange(k)}
              className={`rounded-tool px-3 py-2 text-sm font-bold transition ${rangeKey === k ? 'bg-brand text-white' : 'border border-line bg-surface text-steel hover:border-brandring'}`}>{l}</button>
          ))}
        </div>
      </div>

      {rangeKey === 'custom' && (
        <Card className="flex flex-wrap items-end gap-3 p-4">
          <label className="flex flex-col gap-1"><span className="text-xs font-bold uppercase tracking-wide text-muted2">Od</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-tool border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brandring" /></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-bold uppercase tracking-wide text-muted2">Do</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-tool border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brandring" /></label>
          <span className="num pb-2 text-sm text-muted">{from} → {to}</span>
        </Card>
      )}

      {error && <ProblemBanner message={error} />}

      {/* KPI: promet */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Promet (bruto)" value={revenue === undefined ? null : revenue ? (revenue.gross || formatMoneyMinor(revenue.grossMinor)) : '—'} />
        <Kpi label="Promet (neto)" value={revenue === undefined ? null : revenue ? (revenue.net || formatMoneyMinor(revenue.netMinor)) : '—'} />
        <Kpi label="Izdanih dokumentov" value={revenue === undefined ? null : revenue ? String(revenue.documents ?? 0) : '—'} plain />
      </div>

      {/* DDV po stopnjah */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-3"><h2 className="text-base font-bold text-ink">DDV po stopnjah</h2></div>
        {vat === undefined ? <div className="p-6"><Spinner className="text-brand" /></div>
          : !vat || !(vat.groups?.length) ? <p className="p-8 text-center text-muted">Za izbrano obdobje ni podatkov o DDV.</p>
          : (
            <table className="w-full text-sm">
              <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
                <tr><th className="px-5 py-2.5 font-bold">Stopnja</th><th className="px-4 py-2.5 text-right font-bold">Osnova (neto)</th><th className="px-4 py-2.5 text-right font-bold">DDV</th><th className="px-5 py-2.5 font-bold">Opomba</th></tr>
              </thead>
              <tbody>
                {vat.groups.map((g: any, i: number) => (
                  <tr key={i} className="border-t border-line">
                    <td className="num px-5 py-3 font-bold text-ink">{g.ratePct}%</td>
                    <td className="num px-4 py-3 text-right text-ink">{g.net}</td>
                    <td className="num px-4 py-3 text-right text-ink">{g.vat}</td>
                    <td className="px-5 py-3 text-muted">{g.reverseCharge ? 'obrnjena obveznost' : '—'}</td>
                  </tr>
                ))}
                <tr className="border-t border-linestrong bg-surface2 font-bold">
                  <td className="px-5 py-3 text-ink">Skupaj</td>
                  <td className="num px-4 py-3 text-right text-ink">{formatMoneyMinor(vat.totalNetMinor)}</td>
                  <td className="num px-4 py-3 text-right text-ink">{formatMoneyMinor(vat.totalVatMinor)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          )}
      </Card>

      {/* Stanje terjatev */}
      <Card className="p-5">
        <h2 className="mb-4 text-base font-bold text-ink">Stanje terjatev{aging?.asOf ? <span className="num ml-2 text-sm font-normal text-muted">na {aging.asOf}</span> : null}</h2>
        {aging === undefined ? <Spinner className="text-brand" /> : !aging ? <p className="text-muted">Ni podatkov.</p> : (
          <>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
              {([['current', 'Nezapadlo'], ['d1_30', '1–30 dni'], ['d31_60', '31–60 dni'], ['d61_90', '61–90 dni'], ['d90_plus', 'nad 90 dni']] as [string, string][]).map(([k, l]) => (
                <div key={k} className={`rounded-tool p-3 ${k === 'd90_plus' && aging.buckets.d90_plus !== '0' ? 'bg-stop/10' : 'bg-surface2'}`}>
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted2">{l}</p>
                  <p className={`num mt-1 text-sm font-bold ${k === 'd90_plus' && aging.buckets.d90_plus !== '0' ? 'text-stop' : 'text-ink'}`}>{agingF(k)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <span className="font-bold text-ink">Skupaj odprto</span>
              <span className="num text-lg font-extrabold text-ink">{agingF('total')}</span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value, plain }: { label: string; value: string | null; plain?: boolean }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-muted">{label}</p>
      {value === null ? <Spinner className="mt-2 text-brand" /> : <p className="num mt-1 text-3xl font-extrabold tracking-tight text-ink">{value}</p>}
    </Card>
  );
}
