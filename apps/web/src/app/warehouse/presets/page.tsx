'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DEMO_MODE } from '@/lib/demo';
import { formatMoneyMinor } from '@/lib/format';
import { Button, Card, SoftChip, Spinner } from '@/components/ui';

/*
 * Servisni paketi (predloge) — pregled. Paket je sklop dela + delov, ki ga z
 * enim klikom dodaš na delovni nalog (gumb „+ Paket" na nalogu). Oznake razred
 * + pogon določajo, kje se ponudi; prazno = velja za vse.
 */

const CLASS_LABEL: Record<string, string> = { tractor: 'Vlačilec', truck: 'Tovornjak', van: 'Kombi', trailer: 'Priklopnik', other: 'Drugo' };
const POWER_LABEL: Record<string, string> = { diesel: 'Dizel', petrol: 'Bencin', electric: 'Električno', hybrid: 'Hibrid', cng: 'CNG', lng: 'LNG', hydrogen: 'Vodik', other: 'Drugo' };

function grossMinor(p: any): number {
  return (p.lines ?? []).reduce((s: number, l: any) => s + Math.round((l.qty ?? 0) * (l.unitPriceMinor ?? 0) * (1 + (l.vatRatePct ?? 0) / 100)), 0);
}

export default function PresetsPage() {
  const { data: presets, isLoading } = useSWR('presets', () => api.presets.list().catch(() => []));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Servisni paketi</h1>
          <p className="text-sm text-muted">Sklopi dela in delov za hiter vnos na nalog. Dodaš jih na nalogu prek „+ Paket".</p>
        </div>
        <Link href="/warehouse/presets/new"><Button tone="go">+ Nov paket</Button></Link>
      </div>

      {isLoading || !presets ? (
        <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>
      ) : presets.length === 0 ? (
        <Card className="p-8 text-center text-muted">Ni paketov.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {presets.map((p: any) => {
            const classes: string[] = p.vehicleClasses ?? [];
            const powers: string[] = p.powertrains ?? [];
            return (
              <Link key={p.id} href={`/warehouse/presets/${p.id}`} className="block">
                <Card className="flex h-full flex-col gap-2 p-4 transition hover:shadow-lift">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold leading-tight text-ink">{p.name}</h2>
                  <span className="num shrink-0 rounded-tool bg-brandweak px-2 py-1 text-sm font-bold text-brand">{formatMoneyMinor(String(grossMinor(p)))}</span>
                </div>
                {p.description && <p className="text-sm text-muted">{p.description}</p>}
                <div className="flex flex-wrap gap-1">
                  {classes.length === 0 && powers.length === 0
                    ? <SoftChip tone="neutral">vsa vozila</SoftChip>
                    : <>
                        {classes.map((c) => <SoftChip key={c} tone="info">{CLASS_LABEL[c] ?? c}</SoftChip>)}
                        {powers.map((pw) => <SoftChip key={pw} tone="go">{POWER_LABEL[pw] ?? pw}</SoftChip>)}
                      </>}
                </div>
                <div className="mt-1 border-t border-line pt-2 text-xs text-muted2">
                  {(p.lines ?? []).length} postavk · {(p.lines ?? []).filter((l: any) => l.kind === 'labour').length} delo, {(p.lines ?? []).filter((l: any) => l.kind === 'part').length} deli
                </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {DEMO_MODE && (
        <p className="text-center text-xs text-muted2">
          Klikni paket za urejanje, ali ga preizkusi na nalogu:&nbsp;
          <Link href="/advisor/work-orders/wo-1003" className="font-semibold text-brand">odpri električni nalog →</Link>
        </p>
      )}
    </div>
  );
}
