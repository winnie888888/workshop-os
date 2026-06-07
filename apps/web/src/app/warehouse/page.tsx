'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { formatMoneyMinor } from '@/lib/format';
import { Card, Spinner } from '@/components/ui';

/*
 * Warehouse overview ("Pregled") — the home screen from the design spec: stock
 * value and counts up top, the low-stock list with a reorder action, and the
 * primary warehouse actions. Wired to the real warehouse-reports endpoints; the
 * OCR receiving workflow lives one tap away at /warehouse/receiving.
 */
export default function WarehouseOverview() {
  const { data: valuation } = useSWR('wh-valuation', () => api.warehouseReports.valuation().catch(() => null));
  const { data: low } = useSWR('wh-low', () => api.warehouseReports.lowStock().catch(() => []));
  const { data: pos } = useSWR('wh-pos', () => api.warehouseReports.suggestedPos().catch(() => []));

  const lowList = (low ?? []) as any[];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Pregled zaloge</h1>
        <div className="flex items-center gap-2">
          <Link href="/warehouse/receiving"
            className="inline-flex min-h-tap items-center gap-2 rounded-tool border border-linestrong bg-surface px-4 font-semibold text-steel transition hover:border-brandring hover:text-brand">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14"/></svg>
            Barkoda
          </Link>
          <Link href="/warehouse/receiving"
            className="inline-flex min-h-tap items-center gap-2 rounded-tool bg-brand px-5 font-bold text-white shadow-tool transition hover:bg-brand600 active:translate-y-px">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Prejem blaga
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Vrednost zaloge" value={valuation ? formatMoneyMinor(valuation.totalValueMinor) : null} />
        <Kpi label="Postavk na zalogi" value={valuation ? String(valuation.items?.length ?? 0) : null} plain />
        <Kpi label="Nizka zaloga" value={low ? String(lowList.length) : null} plain alert={lowList.length > 0} />
        <Kpi label="Za naročilo" value={pos ? String((pos as any[]).length) : null} plain />
      </div>

      {/* Low stock table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            Nizka zaloga
            {lowList.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-stop px-1.5 text-xs font-bold text-white">{lowList.length}</span>}
          </h2>
        </div>
        {!low ? <div className="p-6"><Spinner className="text-brand" /></div> : lowList.length === 0 ? (
          <p className="p-8 text-center text-muted">Vse postavke so nad minimalno zalogo. 👍</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
              <tr>
                <th className="px-5 py-2.5 font-bold">Postavka</th>
                <th className="hidden px-4 py-2.5 font-bold sm:table-cell">Lokacija</th>
                <th className="px-4 py-2.5 text-right font-bold">Na zalogi</th>
                <th className="px-4 py-2.5 text-right font-bold">Minimalno</th>
                <th className="px-4 py-2.5 text-right font-bold">Predlagano</th>
                <th className="px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {lowList.map((it, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="px-5 py-3">
                    <span className="font-semibold text-ink">{it.name}</span>
                    {it.sku && <span className="num ml-2 text-xs text-muted2">{it.sku}</span>}
                  </td>
                  <td className="num hidden px-4 py-3 text-muted sm:table-cell">{String(it.locationId ?? '').slice(0, 8) || '—'}</td>
                  <td className={`num px-4 py-3 text-right font-bold ${(it.onHand ?? 0) <= 0 ? 'text-stop' : (it.onHand ?? 0) <= (it.reorderPoint ?? 0) ? 'text-hold' : 'text-ink'}`}>{it.onHand ?? 0}</td>
                  <td className="num px-4 py-3 text-right text-muted">{it.reorderPoint ?? '—'}</td>
                  <td className="num px-4 py-3 text-right text-muted">{it.reorderQty ?? '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button title="Ustvari naročilo (kmalu)" disabled
                      className="cursor-not-allowed rounded-tool bg-brandweak px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-brand/60">Naroči</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Primary actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionBtn href="/warehouse/receiving" color="#16a34a" label="Prejem blaga"
          icon={<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>} />
        <ActionBtn color="#2563eb" label="Inventura" soon
          icon={<><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"/></>} />
        <ActionBtn color="#7c3aed" label="Premiki" soon
          icon={<><path d="M8 3 4 7l4 4M4 7h16m-4 14 4-4-4-4M20 17H4"/></>} />
        <ActionBtn color="#d97706" label="Poročila" soon
          icon={<><path d="M3 3v18h18"/><path d="M7 15v3M12 9v9M17 5v13"/></>} />
      </div>
    </div>
  );
}

function Kpi({ label, value, plain, alert }: { label: string; value: string | null; plain?: boolean; alert?: boolean }) {
  return (
    <Card className={`p-5 ${alert ? 'ring-1 ring-stop/30' : ''}`}>
      <p className="text-sm font-semibold text-muted">{label}</p>
      {value === null ? <Spinner className="mt-2 text-brand" /> : (
        <p className={`num mt-1 text-3xl font-extrabold tracking-tight ${alert ? 'text-stop' : 'text-ink'}`}>{value}</p>
      )}
    </Card>
  );
}

function ActionBtn({ href, color, label, icon, soon }: {
  href?: string; color: string; label: string; icon: React.ReactNode; soon?: boolean;
}) {
  const inner = (
    <span className="flex items-center justify-center gap-2 rounded-card px-4 py-4 font-bold text-white shadow-card transition active:translate-y-px"
      style={{ background: color, opacity: soon ? 0.55 : 1 }}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">{icon}</svg>
      {label}
    </span>
  );
  if (soon || !href) return <span title="Kmalu" className="cursor-default">{inner}</span>;
  return <Link href={href}>{inner}</Link>;
}
