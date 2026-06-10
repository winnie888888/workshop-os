'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { formatMoneyMinor, formatVatRate, vatBreakdownMinor } from '@/lib/format';
import { Card, SoftChip, Spinner, StatusChip } from '@/components/ui';
import { DEMO_MODE } from '@/lib/demo';
import { loadSettings } from '@/lib/workshop-settings';
import Link from 'next/link';
import { buildInvoiceUbl } from '@/lib/eslog';
import { downloadText } from '@/lib/data-export';

/*
 * Invoice detail — the issued, immutable document with its frozen VAT
 * breakdown. Mostly a read surface; corrections happen via a credit note.
 */
function invStatus(s: string): string {
  const m: Record<string, string> = {
    paid: 'plačan', overdue: 'zapadel', credited: 'dobropisan',
    issued: 'izdan', draft: 'osnutek', partially_paid: 'delno plačan', void: 'razveljavljen',
  };
  return m[s] ?? s;
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: inv, isLoading } = useSWR(['invoice', id], () => api.invoices.get(id));
  const [company, setCompany] = useState<{ name: string; address: string; vatId: string; iban: string } | null>(null);
  useEffect(() => { loadSettings().then((s) => setCompany(s.company)).catch(() => { /* ignore */ }); }, []);

  if (isLoading) return <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>;
  if (!inv) return <Card className="p-6 text-muted">Računa ni mogoče najti.</Card>;

  const tone = inv.status === 'paid' ? 'go' : inv.status === 'overdue' ? 'stop' : inv.status === 'credited' ? 'hold' : 'info';
  const vatRows = vatBreakdownMinor((inv.lines ?? []).map((l: any) => ({ qty: 1, unitPriceMinor: Number(l.net_minor) || 0, vatRatePct: Number(l.vat_rate_pct) || 0 })));

  async function exportEslog() {
    if (!inv) return;
    const customer = inv.customerId ? await api.customers.get(inv.customerId).catch(() => null) : null;
    const num = String(inv.number ?? 'racun').replace(/[^a-z0-9]+/gi, '-');
    downloadText(`eslog-${num}.xml`, buildInvoiceUbl(inv, company, customer), 'application/xml');
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <button onClick={() => router.push('/advisor/invoices')} className="self-start text-sm font-semibold text-muted hover:text-brand">‹ Računi</button>

      <div className="flex items-center justify-between gap-3">
        <h1 className="num text-2xl font-extrabold tracking-tight text-ink">
          {inv.kind === 'credit_note' ? 'Dobropis' : 'Račun'} {inv.number}
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={exportEslog} title="EN 16931 / UBL 2.1 — pred produkcijo validiraj proti uradni e-SLOG 2.0 shemi in oddaj prek ponudnika" className="inline-flex min-h-tap items-center rounded-tool border border-line px-3 text-sm font-semibold text-steel hover:border-brandring hover:text-brand">e-SLOG XML</button>
          <Link href={`/print/invoice/${id}`} target="_blank" className="inline-flex min-h-tap items-center rounded-tool border border-line px-3 text-sm font-semibold text-steel hover:border-brandring hover:text-brand">Natisni / PDF</Link>
          <StatusChip tone={tone}>{invStatus(inv.status)}</StatusChip>
        </div>
      </div>

      {company && (
        <Card className="p-5 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-muted2">Izdajatelj</div>
              <div className="mt-1 font-semibold text-ink">{company.name || '—'}</div>
              {company.address && <div className="text-muted">{company.address}</div>}
              {company.vatId && <div className="num text-muted">ID za DDV: {company.vatId}</div>}
            </div>
            <div className="sm:text-right">
              <div className="text-xs font-bold uppercase tracking-wide text-muted2">Plačilo</div>
              {company.iban ? (
                <>
                  <div className="num mt-1 text-ink">IBAN: {company.iban}</div>
                  <div className="num text-muted">Sklic: SI00 {String(inv.number ?? '').replace(/\D/g, '')}</div>
                  <div className="num text-muted">Znesek: {formatMoneyMinor(inv.totalGrossMinor, inv.currency)}</div>
                </>
              ) : (
                <div className="mt-1 text-muted">Dodaj IBAN v <Link href="/advisor/settings" className="font-medium text-brand hover:underline">Nastavitvah → Podjetje</Link> za plačilne podatke.</div>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <SoftChip tone={inv.reverseCharge ? 'hold' : 'info'}>{inv.vatTreatment ?? '—'}</SoftChip>
          {inv.reverseCharge && <SoftChip tone="hold">obrnjena obveznost</SoftChip>}
        </div>
        {inv.vatNote && <p className="mb-3 rounded-tool bg-surface2 p-3 text-sm text-muted">{inv.vatNote}</p>}

        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted2">
            <tr><th className="py-2 font-bold">Opis</th><th className="py-2 text-right font-bold">Neto</th><th className="py-2 text-right font-bold">DDV %</th></tr>
          </thead>
          <tbody>
            {inv.lines.map((l: any, i: number) => (
              <tr key={i} className="border-t border-line">
                <td className="py-2 text-ink">{l.description}</td>
                <td className="num py-2 text-right text-ink">{formatMoneyMinor(String(l.net_minor), inv.currency)}</td>
                <td className="num py-2 text-right text-muted">{String(l.vat_rate_pct)}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        {vatRows.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-muted2">Rekapitulacija DDV</div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted2">
                <tr><th className="py-1 font-semibold">Stopnja</th><th className="py-1 text-right font-semibold">Osnova</th><th className="py-1 text-right font-semibold">DDV</th></tr>
              </thead>
              <tbody>
                {vatRows.map((b) => (
                  <tr key={b.ratePct} className="border-t border-line">
                    <td className="num py-1 text-ink">{formatVatRate(b.ratePct)} %</td>
                    <td className="num py-1 text-right text-ink">{formatMoneyMinor(b.netMinor, inv.currency)}</td>
                    <td className="num py-1 text-right text-ink">{formatMoneyMinor(b.vatMinor, inv.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 border-t border-line pt-3">
          <Row label="Neto" value={formatMoneyMinor(inv.totalNetMinor, inv.currency)} />
          <Row label="DDV" value={formatMoneyMinor(inv.totalVatMinor, inv.currency)} />
          <Row label="Skupaj" value={formatMoneyMinor(inv.totalGrossMinor, inv.currency)} big />
          <Row label="Plačano" value={formatMoneyMinor(inv.paidMinor, inv.currency)} />
        </div>
        <div className="num mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-muted">
          <span>Izdano {inv.issueDate ?? '—'}</span>
          <span>Dobava/storitev {inv.serviceDate ?? inv.deliveryDate ?? inv.issueDate ?? '—'}</span>
          <span>Zapadlost {inv.dueDate ?? '—'}</span>
        </div>
      </Card>

      {inv.number && <MinimaxSyncPanel invoiceId={inv.id} invoiceNumber={inv.number} />}
    </div>
  );
}

/*
 * Minimax sync demonstration (demo mode only). Replays the real outbox flow so a
 * viewer can see the accounting integration work end to end. Nothing here issues
 * or alters an invoice — it visualises an existing event.
 */
function MinimaxSyncPanel({ invoiceId, invoiceNumber }: { invoiceId: string; invoiceNumber: string }) {
  if (!DEMO_MODE) return <MinimaxSyncLive invoiceId={invoiceId} />;
  return <MinimaxSyncDemo invoiceNumber={invoiceNumber} />;
}

const SYNC_LABEL: Record<string, string> = {
  'minimax.invoice.upsert': 'Minimax — izdani račun',
  'minimax.partner.upsert': 'Minimax — partner',
  'einvoice.issue': 'e-Račun (e-SLOG)',
};
const SYNC_STATUS: Record<string, { tone: 'go' | 'info' | 'stop'; label: string }> = {
  pending: { tone: 'info', label: 'v vrsti' },
  processing: { tone: 'info', label: 'pošiljam' },
  done: { tone: 'go', label: 'sinhronizirano' },
  dead: { tone: 'stop', label: 'neuspešno' },
};

/** Realni način: živi outbox vnosi za ta račun, retry za mrtve. */
function MinimaxSyncLive({ invoiceId }: { invoiceId: string }) {
  const { data, mutate } = useSWR(['inv-sync', invoiceId], () => api.invoices.sync(invoiceId), { refreshInterval: 5000 });
  const [busy, setBusy] = useState(false);
  if (!data) return null;
  const anyDead = data.some((e) => e.status === 'dead');
  async function retry() {
    setBusy(true);
    try { await api.invoices.retrySync(invoiceId); await mutate(); }
    finally { setBusy(false); }
  }
  return (
    <Card className="p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">Sinhronizacije (Minimax · e-Račun)</h2>
        {anyDead && (
          <button onClick={retry} disabled={busy}
            className="rounded-tool border border-line px-3 py-1.5 text-xs font-bold text-steel transition hover:border-brandring hover:text-brand disabled:opacity-60">
            {busy ? 'Pošiljam…' : 'Poskusi znova'}
          </button>
        )}
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-muted">Za ta račun ni sinhronizacij v čakalni vrsti.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {data.map((e) => {
            const st = SYNC_STATUS[e.status] ?? { tone: 'info' as const, label: e.status };
            const notConfigured = (e.lastError ?? '').includes('not configured');
            return (
              <li key={e.id} className="rounded-tool border border-line bg-surface px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{SYNC_LABEL[e.eventType] ?? e.eventType}</span>
                  <span className="flex items-center gap-2">
                    {e.attempts > 0 && e.status !== 'done' && <span className="text-xs text-muted2">poskus {e.attempts}</span>}
                    <SoftChip tone={st.tone}>{st.label}</SoftChip>
                  </span>
                </div>
                {e.status === 'dead' && (
                  <p className="mt-1 text-xs text-stop">
                    {notConfigured
                      ? 'Poverilnice integracije niso povezane — Nastavitve → Integracije. Po povezavi kliknite »Poskusi znova«.'
                      : e.lastError ?? 'Pošiljanje ni uspelo.'}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function MinimaxSyncDemo({ invoiceNumber }: { invoiceNumber: string }) {
  const [stage, setStage] = useState<'queued' | 'sending' | 'synced'>('queued');
  useEffect(() => {
    const t1 = setTimeout(() => setStage('sending'), 700);
    const t2 = setTimeout(() => setStage('synced'), 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  const ref = `MMX-${invoiceNumber}`;
  return (
    <Card className="p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">Sinhronizacija z Minimax</h2>
        <SoftChip tone={stage === 'synced' ? 'go' : 'info'}>{stage === 'synced' ? 'sinhronizirano' : 'v teku'}</SoftChip>
      </div>
      <ol className="flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-2">
          <span className="text-go">✓</span>
          <span className="text-ink">Račun izdan in v čakalni vrsti (<span className="num">minimax.invoice.upsert</span>)</span>
        </li>
        <li className="flex items-center gap-2">
          <span className={stage === 'queued' ? 'text-muted2' : 'text-go'}>{stage === 'queued' ? '○' : '✓'}</span>
          <span className={stage === 'queued' ? 'text-muted2' : 'text-ink'}>Dostava v Minimax…</span>
        </li>
        <li className="flex items-center gap-2">
          <span className={stage === 'synced' ? 'text-go' : 'text-muted2'}>{stage === 'synced' ? '✓' : '○'}</span>
          <span className={stage === 'synced' ? 'text-ink' : 'text-muted2'}>
            Sinhronizirano — Minimax dokument <span className="num">{ref}</span>; povezava z nalogom ohranjena
          </span>
        </li>
      </ol>
      <p className="mt-3 rounded-tool bg-surface2 p-3 text-xs text-muted">
        Prikaz dejanskega outbox toka. Za pošiljanje v vašo organizacijo povežite žive Minimax poverilnice.
      </p>
    </Card>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={big ? 'text-lg font-bold text-ink' : 'text-muted'}>{label}</span>
      <span className={`num ${big ? 'text-xl font-extrabold text-ink' : 'text-ink'}`}>{value}</span>
    </div>
  );
}
