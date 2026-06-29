'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatMoneyMinor } from '@/lib/format';
import { Card, Spinner, StatusChip } from '@/components/ui';

/*
 * Nadzorna plošča e-računov — operativni pregled, ne vnosna površina. Vsak
 * izdani račun s stanjem e-računa (zgrajen / oddan / potrjen / NAPAKA) in sync
 * stanjem. Težave (failed / mrtve sinhronizacije) so na vrhu, z razlogom in
 * gumbom za ponovni poskus. Bere agregat, ki ga sestavi strežnik.
 */

type EInvoiceStatus = string | null;

// Status e-računa -> barva in slovenska oznaka.
function statusMeta(s: EInvoiceStatus, dead: number): { tone: 'go' | 'info' | 'hold' | 'stop'; label: string } {
  if (s === 'failed') return { tone: 'stop', label: 'napaka' };
  if (dead > 0) return { tone: 'stop', label: 'sync zastoj' };
  if (s === 'transmitted') return { tone: 'go', label: 'oddan' };
  if (s === 'acknowledged') return { tone: 'go', label: 'potrjen' };
  if (s === 'built') return { tone: 'info', label: 'zgrajen' };
  if (s === 'n/a') return { tone: 'hold', label: 'ni potreben' };
  if (s === null) return { tone: 'hold', label: 'čaka' };
  return { tone: 'info', label: s };
}

export default function EInvoicesDashboard() {
  const { data, isLoading, mutate } = useSWR(['einvoice-overview'], () => api.invoices.einvoiceOverview());
  const [retrying, setRetrying] = useState<string | null>(null);

  async function retry(invoiceId: string) {
    setRetrying(invoiceId);
    try {
      await api.invoices.retrySync(invoiceId);
      await mutate();
    } finally {
      setRetrying(null);
    }
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>;

  const rows = data ?? [];
  const problems = rows.filter((r) => r.einvoiceStatus === 'failed' || r.deadCount > 0);
  const pending = rows.filter((r) => r.einvoiceStatus === null || r.einvoiceStatus === 'built');
  const done = rows.length - problems.length - pending.length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">E-računi</h1>
        <p className="text-sm text-muted">Stanje oddaje e-računov (e-SLOG / Peppol) in sinhronizacij. Težave so na vrhu.</p>
      </div>

      {/* Povzetek */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Težave" value={problems.length} tone={problems.length > 0 ? 'stop' : 'go'} />
        <SummaryCard label="V teku" value={pending.length} tone={pending.length > 0 ? 'info' : 'go'} />
        <SummaryCard label="Urejeno" value={done} tone="go" />
      </div>

      {rows.length === 0 ? (
        <Card className="p-6 text-center text-muted">Še ni izdanih računov.</Card>
      ) : (
        <Card className="divide-y divide-line p-0">
          {rows.map((r) => {
            const m = statusMeta(r.einvoiceStatus, r.deadCount);
            const hasProblem = r.einvoiceStatus === 'failed' || r.deadCount > 0;
            return (
              <div key={r.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/advisor/invoices/${r.id}`} className="num font-bold text-ink hover:text-brand">
                      {r.number ?? '—'}
                    </Link>
                    {r.channel && <span className="text-xs text-muted2">{r.channel}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="num text-sm text-muted">{formatMoneyMinor(r.totalGrossMinor, r.currency)}</span>
                    <StatusChip tone={m.tone}>{m.label}</StatusChip>
                  </div>
                </div>

                {hasProblem && (
                  <div className="flex items-start justify-between gap-3 rounded-tool border border-red-200 bg-red-50 p-3">
                    <div className="flex-1 text-sm text-red-700">
                      {r.einvoiceError
                        ? r.einvoiceError
                        : r.deadCount > 0
                          ? `${r.deadCount} sinhronizacij obtičalo (mrtva vrsta).`
                          : 'Neznana napaka.'}
                    </div>
                    <button
                      onClick={() => retry(r.id)}
                      disabled={retrying === r.id}
                      className="inline-flex min-h-tap flex-none items-center rounded-tool border border-red-300 bg-white px-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      {retrying === r.id ? <Spinner /> : 'Poskusi znova'}
                    </button>
                  </div>
                )}

                {r.authorityRef && (
                  <div className="text-xs text-muted2">Sklic organa: <span className="num">{r.authorityRef}</span></div>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'go' | 'info' | 'stop' }) {
  const color = tone === 'stop' ? 'text-red-600' : tone === 'info' ? 'text-brand' : 'text-emerald-600';
  return (
    <Card className="p-4 text-center">
      <div className={`num text-3xl font-extrabold ${color}`}>{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted2">{label}</div>
    </Card>
  );
}
