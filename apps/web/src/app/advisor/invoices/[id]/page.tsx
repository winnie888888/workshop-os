'use client';

import { Fragment, useEffect, useState } from 'react';
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
import PayQr from '@/components/pay-qr';
import { rfReference } from '@/lib/qr/upn';
import { validateEslogInvoice, formatEslogIssues } from '@/lib/eslog-validate';

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
  // ZDDV-1 skladnost (strežniška, avtoritativna — ista preverba, ki blokira oddajo e-računa).
  const { data: complianceRaw } = useSWR(['invoice-compliance', id], () => api.invoices.compliance(id).catch(() => null));
  // Sprejmi le veljaven oblika rezultata (findings je array); sicer obravnavaj kot 'ni podatka',
  // da nepričakovan odgovor (npr. demo objekt) ne sesuje strani.
  const compliance = complianceRaw && Array.isArray((complianceRaw as any).findings)
    ? complianceRaw
    : null;
  // Plačnik za UPN QR (polja 6–8) — neobvezno; banka ga ob skenu lahko prepiše.
  const { data: payCust } = useSWR(
    inv?.customerId ? ['inv-cust', inv.customerId] : null,
    // id pride iz ključa (fetcher teče le, ko je ključ truthy) — tipsko čisto brez "!"
    ([, custId]: [string, string]) => api.customers.get(custId).catch(() => null),
  );
  const [company, setCompany] = useState<{ name: string; address: string; vatId: string; iban: string } | null>(null);
  useEffect(() => { loadSettings().then((s) => setCompany(s.company)).catch(() => { /* ignore */ }); }, []);

  if (isLoading) return <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>;
  if (!inv) return <Card className="p-6 text-muted">Računa ni mogoče najti.</Card>;

  const tone = inv.status === 'paid' ? 'go' : inv.status === 'overdue' ? 'stop' : inv.status === 'credited' ? 'hold' : 'info';
  const vatRows = vatBreakdownMinor((inv.lines ?? []).map((l: any) => ({ qty: 1, unitPriceMinor: Number(l.net_minor) || 0, vatRatePct: Number(l.vat_rate_pct) || 0 })));

  async function exportEslog() {
    if (!inv) return;
    const customer = inv.customerId ? await api.customers.get(inv.customerId).catch(() => null) : null;
    // Sprint 5: strukturna EN 16931 predletna kontrola — ujame manjkajoča
    // obvezna polja in neusklajene vsote, preden datoteka zapusti aplikacijo.
    const issues = validateEslogInvoice(inv, company, customer);
    if (issues.length > 0 && !window.confirm(formatEslogIssues(issues))) return;
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

      {compliance && compliance.findings.length > 0 && (
        <Card className={`p-4 text-sm ${compliance.ok ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50'}`}>
          <div className="mb-2 flex items-center gap-2 font-bold">
            <span className={compliance.ok ? 'text-amber-700' : 'text-red-700'}>
              {compliance.ok ? '⚠ ZDDV-1 opozorila' : '✕ ZDDV-1 neskladje'}
            </span>
            <span className="text-xs font-normal text-muted">
              {compliance.ok
                ? 'Račun je veljaven, a preveri spodnje.'
                : 'Račun ne izpolnjuje obveznih podatkov — e-račun bi bil zavrnjen.'}
            </span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {compliance.findings.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`mt-0.5 text-xs font-bold ${f.severity === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
                  {f.severity === 'error' ? 'NAPAKA' : 'opozorilo'}
                </span>
                <span className="text-ink">{f.message}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {compliance && compliance.ok && compliance.findings.length === 0 && (
        <div className="flex items-center gap-2 rounded-tool border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          <span className="font-bold">✓ ZDDV-1 skladno</span>
          <span className="text-xs text-emerald-600">Vsi obvezni podatki (82. člen) prisotni.</span>
        </div>
      )}

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

        {(inv.workOrders?.length ?? 0) > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-tool bg-surface2 p-3">
            <span className="mr-1 text-xs font-bold uppercase tracking-wide text-muted2">
              Zbirni račun · {inv.workOrders!.length} nalogov
            </span>
            {inv.workOrders!.map((w) => (
              <Link key={w.id} href={`/advisor/work-orders/${w.id}`}>
                <SoftChip tone="info">{w.number ?? '—'}{w.plate ? ` · ${w.plate}` : ''}</SoftChip>
              </Link>
            ))}
          </div>
        )}

        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted2">
            <tr><th className="py-2 font-bold">Opis</th><th className="py-2 text-right font-bold">Neto</th><th className="py-2 text-right font-bold">DDV %</th></tr>
          </thead>
          <InvoiceLinesBody lines={inv.lines as any[]} currency={inv.currency} workOrders={inv.workOrders ?? []} />
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

      {(() => {
        // Plačilo s QR: samo za izdane, še ne (povsem) plačane račune.
        const remaining = Number(inv.totalGrossMinor ?? 0) - Number(inv.paidMinor ?? 0);
        const payable = inv.number && inv.kind !== 'credit_note' && remaining > 0
          && !['paid', 'credited', 'void', 'draft'].includes(inv.status);
        if (!payable) return null;
        return (
          <PayQr
            heading="Plačilo računa"
            amountMinor={remaining}
            purpose={`Račun ${inv.number}`}
            reference={rfReference(String(inv.number))}
            deadline={inv.dueDate ?? null}
            payer={payCust ? {
              name: payCust.name,
              street: payCust.address,
              city: [payCust.postCode, payCust.city].filter(Boolean).join(' '),
            } : null}
          />
        );
      })()}

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

/* ----------------------------------------------------------------------------
 * Vrstice računa. Pri zbirnem računu (vrstice nosijo work_order_id) so
 * grupirane po izvornem nalogu z naslovno vrstico (DN št. · tablica, klik na
 * nalog) in vmesno NETO vsoto — spec: "totals per work order". Enojni računi
 * in stari zapisi (brez work_order_id) se izrišejo kot doslej.
 * -------------------------------------------------------------------------- */
function InvoiceLinesBody({ lines, currency, workOrders }: {
  lines: any[];
  currency: string;
  workOrders: Array<{ id: string; number: string | null; plate: string | null }>;
}) {
  const woById = new Map(workOrders.map((w) => [w.id, w]));
  const grouped = workOrders.length > 0 && lines.some((l) => l.work_order_id);

  if (!grouped) {
    return (
      <tbody>
        {lines.map((l, i) => (
          <tr key={i} className="border-t border-line">
            <td className="py-2 text-ink">{l.description}</td>
            <td className="num py-2 text-right text-ink">{formatMoneyMinor(String(l.net_minor), currency)}</td>
            <td className="num py-2 text-right text-muted">{String(l.vat_rate_pct)}%</td>
          </tr>
        ))}
      </tbody>
    );
  }

  // Vrstice so urejene po line_no; zbirna izdaja jih piše nalog za nalogom,
  // zato skupine sestavimo z enim prehodom (brez preurejanja dokumenta).
  const groups: Array<{ woId: string | null; rows: any[] }> = [];
  for (const l of lines) {
    const woId = l.work_order_id ?? null;
    const last = groups[groups.length - 1];
    if (last && last.woId === woId) last.rows.push(l);
    else groups.push({ woId, rows: [l] });
  }

  return (
    <tbody>
      {groups.map((g, gi) => {
        const wo = g.woId ? woById.get(g.woId) : undefined;
        const subtotal = g.rows.reduce((acc: bigint, l: any) => acc + BigInt(l.net_minor ?? 0), 0n);
        return (
          <Fragment key={gi}>
            <tr className="border-t border-linestrong bg-surface2">
              <td colSpan={3} className="py-1.5 text-xs font-bold uppercase tracking-wide text-steel">
                {wo ? (
                  <Link href={`/advisor/work-orders/${wo.id}`} className="hover:text-brand hover:underline">
                    DN {wo.number ?? '—'}{wo.plate ? ` · ${wo.plate}` : ''}
                  </Link>
                ) : (
                  'Ostale postavke'
                )}
              </td>
            </tr>
            {g.rows.map((l: any, i: number) => (
              <tr key={i} className="border-t border-line">
                <td className="py-2 text-ink">{l.description}</td>
                <td className="num py-2 text-right text-ink">{formatMoneyMinor(String(l.net_minor), currency)}</td>
                <td className="num py-2 text-right text-muted">{String(l.vat_rate_pct)}%</td>
              </tr>
            ))}
            <tr>
              <td className="py-1.5 text-right text-xs font-bold uppercase tracking-wide text-muted2">Skupaj nalog (neto)</td>
              <td className="num py-1.5 text-right font-bold text-ink">{formatMoneyMinor(subtotal.toString(), currency)}</td>
              <td />
            </tr>
          </Fragment>
        );
      })}
    </tbody>
  );
}
