'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DEMO_MODE } from '@/lib/demo';
import { formatMoneyMinor } from '@/lib/format';
import { Button, Card, SoftChip, Spinner } from '@/components/ui';

/*
 * Postavke — pregled artiklov + zaloga. V demo nacinu povezano s centralno
 * shrambo: nov artikel se takoj vidi tudi v izbirniku delov na nalogu. Iskanje
 * gre prek /inventory/items, vrednost zaloge prek /warehouse-reports/valuation.
 */
export default function ItemsPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<any[] | null>(null);
  const [valuation, setValuation] = useState<any | null>(null);

  useEffect(() => { api.warehouseReports.valuation().then(setValuation).catch(() => setValuation(null)); }, [items]);
  useEffect(() => {
    let live = true; setItems(null);
    const t = setTimeout(() => {
      api.inventory.search(q).then((r) => live && setItems(r as any[])).catch(() => live && setItems([]));
    }, q ? 250 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Postavke</h1>
        <div className="flex items-center gap-2">
          {valuation && (
            <span className="rounded-tool bg-brandweak px-3 py-2 text-sm font-bold text-brand">
              Vrednost zaloge: <span className="num">{formatMoneyMinor(valuation.totalValueMinor)}</span>
            </span>
          )}
          {DEMO_MODE && <Link href="/warehouse/items/new"><Button tone="go">+ Nov artikel</Button></Link>}
        </div>
      </div>

      <div className="relative">
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted2" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Išči po nazivu, SKU ali OEM…"
          className="w-full rounded-tool border border-line bg-surface py-3 pl-10 pr-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brandring" />
      </div>

      <Card className="overflow-x-auto">
        {items === null ? <div className="p-6"><Spinner className="text-brand" /></div>
          : items.length === 0 ? <p className="p-8 text-center text-muted">{q ? 'Ni zadetkov.' : 'Ni postavk na zalogi.'}</p>
          : (
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
                <tr><th className="px-5 py-2.5 font-bold">Naziv</th><th className="px-4 py-2.5 font-bold">SKU</th><th className="hidden px-4 py-2.5 font-bold sm:table-cell">OEM</th><th className="px-4 py-2.5 text-right font-bold">Zaloga</th><th className="px-4 py-2.5 text-right font-bold">Cena</th><th className="px-4 py-2.5 text-right font-bold">DDV</th><th className="px-5 py-2.5 font-bold">Enota</th></tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={it.id ?? i}
                    onClick={() => { if (DEMO_MODE && it.id) router.push(`/warehouse/items/${it.id}`); }}
                    className={`border-t border-line ${DEMO_MODE ? 'cursor-pointer hover:bg-surface2' : ''}`}>
                    <td className="px-5 py-3 font-semibold text-ink">{it.name}</td>
                    <td className="num px-4 py-3 text-muted">{it.sku ?? '—'}</td>
                    <td className="num hidden px-4 py-3 text-muted2 sm:table-cell">{it.oemRef ?? '—'}</td>
                    <td className="num px-4 py-3 text-right">
                      {it.onHand != null
                        ? (it.low ? <SoftChip tone="stop">{it.onHand}</SoftChip> : <span className="text-ink">{it.onHand}</span>)
                        : '—'}
                    </td>
                    <td className="num px-4 py-3 text-right text-ink">{it.priceMinor != null ? formatMoneyMinor(it.priceMinor) : '—'}</td>
                    <td className="num px-4 py-3 text-right text-muted">{it.vatRatePct != null ? `${it.vatRatePct}%` : '—'}</td>
                    <td className="px-5 py-3 text-muted">{it.unit ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Card>

      {DEMO_MODE && <p className="text-center text-xs text-muted2">Klikni vrstico za podrobnosti, urejanje in prejem zaloge.</p>}
    </div>
  );
}
