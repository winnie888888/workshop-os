'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { formatMoneyMinor } from '@/lib/format';
import { Card, Spinner } from '@/components/ui';

/*
 * Warehouse overview ("Pregled") — the home screen: stock value and counts as
 * dashboard-style stat cards, the low-stock list with a reorder action, and the
 * primary warehouse actions. Wired to the real warehouse-reports endpoints; the
 * OCR receiving workflow lives one tap away at /warehouse/receiving.
 */
function Ico({ d, className = 'h-5 w-5' }: { d: React.ReactNode; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">{d}</svg>;
}

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

      {/* KPI row — dashboard-style stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Vrednost zaloge" value={valuation ? formatMoneyMinor(valuation.totalValueMinor) : null} unit="EUR" small
          chip="bg-brandweak text-brand" icon={<><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/></>} />
        <Kpi label="Postavk na zalogi" value={valuation ? String(valuation.items?.length ?? 0) : null} unit="postavk"
          chip="bg-[#efeafe] text-[#6d4fd6]" icon={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>} />
        <Kpi label="Nizka zaloga" value={low ? String(lowList.length) : null} unit="postavk" alert={lowList.length > 0}
          chip={lowList.length > 0 ? 'bg-[#fde8e6] text-stop' : 'bg-[#e3f4ea] text-go'}
          icon={<path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>} />
        <Kpi label="Za naročilo" value={pos ? String((pos as any[]).length) : null} unit="naročil"
          chip="bg-[#e3f4ea] text-go" icon={<><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></>} />
      </div>

      {/* Low stock table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            Nizka zaloga
            {lowList.length > 0 && <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-stop px-1.5 text-xs font-bold text-white">{lowList.length}</span>}
          </h2>
          <Link href="/warehouse/items" className="text-xs font-bold uppercase tracking-wide text-brand hover:underline">Vse postavke</Link>
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
                <tr key={i} className="border-t border-line transition hover:bg-floor">
                  <td className="px-5 py-3">
                    <span className="font-semibold text-ink">{it.name}</span>
                    {it.sku && <span className="num ml-2 text-xs text-muted2">{it.sku}</span>}
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">{it.locationId ? 'Glavno' : '—'}</td>
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

      {/* Primary actions — all wired to real pages */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionBtn href="/warehouse/receiving" color="#16a34a" label="Prejem blaga"
          icon={<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>} />
        <ActionBtn href="/warehouse/stocktake" color="#2563eb" label="Inventura"
          icon={<><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"/></>} />
        <ActionBtn href="/warehouse/movements" color="#7c3aed" label="Premiki"
          icon={<><path d="M8 3 4 7l4 4M4 7h16m-4 14 4-4-4-4M20 17H4"/></>} />
        <ActionBtn href="/warehouse/items" color="#d97706" label="Postavke"
          icon={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>} />
      </div>
    </div>
  );
}

function Kpi({ label, value, unit, chip, icon, alert, small }:
  { label: string; value: string | null; unit?: string; chip: string; icon: React.ReactNode; alert?: boolean; small?: boolean }) {
  return (
    <Card className={`flex flex-col p-4 ${alert ? 'ring-1 ring-stop/30' : ''}`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 flex-none place-items-center rounded-xl ${chip}`}><Ico d={icon} /></span>
        <span className="text-sm font-semibold text-muted">{label}</span>
      </div>
      {value === null ? <Spinner className="mt-3 text-brand" /> : (
        <div className={`num mt-3 font-extrabold leading-none tracking-tight ${small ? 'text-2xl' : 'text-4xl'} ${alert ? 'text-stop' : 'text-ink'}`}>{value}</div>
      )}
      {unit && <div className="mt-1 text-sm text-muted2">{unit}</div>}
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
