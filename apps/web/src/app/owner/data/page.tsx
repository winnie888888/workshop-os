'use client';

import useSWR from 'swr';
import { api } from '@/lib/api';
import { Button, Card, Spinner } from '@/components/ui';
import { downloadCsv, downloadJson, dateStamp } from '@/lib/data-export';

/*
 * Izvoz podatkov — the data-portability surface (P0 of the import/export
 * pillar). Every core entity can be exported to CSV (Excel-ready) and the whole
 * company dataset to a single JSON archive ("take all my data"), with no
 * vendor lock-in. It reads a full tenant snapshot from one endpoint
 * (api.exportSnapshot — real backend: GET /export/snapshot, Sprint 3). Import
 * (Excel / other systems, with AI column mapping) is the next phase.
 */

const ENTITIES: { key: string; label: string; slug: string }[] = [
  { key: 'customers', label: 'Stranke', slug: 'stranke' },
  { key: 'vehicles', label: 'Vozila', slug: 'vozila' },
  { key: 'workOrders', label: 'Delovni nalogi', slug: 'delovni-nalogi' },
  { key: 'estimates', label: 'Predračuni', slug: 'predracuni' },
  { key: 'invoices', label: 'Računi', slug: 'racuni' },
  { key: 'items', label: 'Postavke (zaloga)', slug: 'postavke' },
  { key: 'suppliers', label: 'Dobavitelji', slug: 'dobavitelji' },
  { key: 'presets', label: 'Paketi', slug: 'paketi' },
  { key: 'appointments', label: 'Termini', slug: 'termini' },
  { key: 'mechanics', label: 'Zaposleni / mehaniki', slug: 'mehaniki' },
];

export default function OwnerDataExport() {
  const { data: snap, isLoading, error } = useSWR('owner-export-snapshot', () => api.exportSnapshot());

  const data: Record<string, any[]> = snap?.data ?? {};
  const totalRows = ENTITIES.reduce((n, e) => n + (data[e.key]?.length ?? 0), 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Izvoz podatkov</h1>
          <p className="mt-0.5 text-sm text-muted">Vsi podatki tvojega podjetja, kadarkoli — brez zaklepanja.</p>
        </div>
        <Button tone="info" disabled={!snap}
          onClick={() => snap && downloadJson(`asprint-podatki-${dateStamp()}.json`, snap)}>
          ↓ Prenesi vse (JSON)
        </Button>
      </div>

      <Card className="flex items-start gap-3 border-brandring bg-brandweak p-4">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-brand text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
        </span>
        <p className="text-sm text-steel">
          <span className="font-semibold text-ink">CSV</span> se odpre v Excelu (slovenska ločila + šumniki),
          <span className="font-semibold text-ink"> JSON</span> je popoln arhiv vseh podatkov.
          Skupaj <span className="num font-semibold text-ink">{totalRows}</span> zapisov.
        </p>
      </Card>

      {isLoading && <div className="flex justify-center py-12"><Spinner className="text-brand" /></div>}
      {error && <Card className="border-stop/40 bg-stop/5 p-4 text-sm font-semibold text-stop">Podatkov ni bilo mogoče pripraviti.</Card>}

      {snap && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
              <tr>
                <th className="px-5 py-2.5 font-bold">Entiteta</th>
                <th className="px-4 py-2.5 text-right font-bold">Zapisov</th>
                <th className="px-5 py-2.5 text-right font-bold">Izvoz</th>
              </tr>
            </thead>
            <tbody>
              {ENTITIES.map((e) => {
                const rows = data[e.key] ?? [];
                return (
                  <tr key={e.key} className="border-t border-line transition hover:bg-floor">
                    <td className="px-5 py-3 font-semibold text-ink">{e.label}</td>
                    <td className="num px-4 py-3 text-right text-muted">{rows.length}</td>
                    <td className="px-5 py-3 text-right">
                      <Button tone="neutral" size="sm" disabled={rows.length === 0}
                        onClick={() => downloadCsv(`asprint-${e.slug}-${dateStamp()}.csv`, rows)}>
                        CSV
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <p className="text-xs text-muted2">
        Naslednji korak: <span className="font-semibold text-muted">uvoz podatkov</span> iz Excela ali drugih sistemov,
        z AI-mapiranjem stolpcev in poročilom o uvozu.
      </p>
    </div>
  );
}
