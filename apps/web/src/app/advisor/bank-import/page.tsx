'use client';

import { Fragment, useRef, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api, ApiError } from '@/lib/api';
import { DEMO_MODE } from '@/lib/demo';
import { formatMoneyMinor } from '@/lib/format';
import { Button, Card, ProblemBanner, SoftChip, Spinner } from '@/components/ui';

/*
 * Plačila (banka) — uvoz izpiska camt.053 (Plačila P2). Tok: izberi XML iz
 * e-banke → predogled ujemanj (NIČ se še ne knjiži) → svetovalec potrdi →
 * knjiženje (idempotentno; isti izpisek dvakrat ne podvoji ničesar).
 * Zanesljiva ujemanja (veljaven RF/SI sklic → točno en odprt račun) so
 * predizbrana; predlogi zahtevajo človeški klik; brez ujemanja = informacija.
 */

type Entry = {
  idx: number; fingerprint: string; credit: boolean; amountMinor: string; currency: string;
  bookingDate: string | null; payerName: string | null; payerIban: string | null;
  reference: string | null; details: string | null;
  match: 'auto' | 'suggested' | 'none' | 'duplicate' | 'debit';
  invoice: { id: string; number: string; customerName: string | null; remainingMinor: string } | null;
  candidates: Array<{ id: string; number: string; customerName: string | null; remainingMinor: string }>;
};

type Preview = {
  accountIban: string | null; from: string | null; to: string | null;
  total: number; credits: number; autoMatched: number; entries: Entry[];
};

const MATCH_META: Record<Entry['match'], { label: string; tone: 'go' | 'hold' | 'neutral' | 'info' }> = {
  auto: { label: 'ujemanje po sklicu', tone: 'go' },
  suggested: { label: 'predlog', tone: 'hold' },
  none: { label: 'brez ujemanja', tone: 'neutral' },
  duplicate: { label: 'že knjiženo', tone: 'info' },
  debit: { label: 'odliv', tone: 'neutral' },
};

export default function BankImportPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [chosen, setChosen] = useState<Record<string, string | null>>({}); // fingerprint -> invoiceId | null
  const [busy, setBusy] = useState<'parse' | 'apply' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ applied: number; duplicates: number; errors: number; results: any[] } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    setBusy('parse'); setError(null); setResult(null); setPreview(null);
    try {
      const xml = await f.text();
      const p: Preview = await api.bankImport.preview(xml);
      setFilename(f.name);
      // Predizbor: auto vnosi knjižijo na svoj račun; predlogi čakajo na klik.
      const init: Record<string, string | null> = {};
      for (const en of p.entries) init[en.fingerprint] = en.match === 'auto' ? en.invoice!.id : null;
      setChosen(init);
      setPreview(p);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Izpiska ni bilo mogoče prebrati.');
    } finally { setBusy(null); }
  }

  const selectable = (preview?.entries ?? []).filter((e) => e.match === 'auto' || e.match === 'suggested');
  const selectedCount = selectable.filter((e) => chosen[e.fingerprint]).length;

  async function applySelected() {
    if (!preview) return;
    const items = selectable
      .filter((e) => chosen[e.fingerprint])
      .map((e) => ({
        fingerprint: e.fingerprint, invoiceId: chosen[e.fingerprint]!,
        amountMinor: e.amountMinor, currency: e.currency, bookingDate: e.bookingDate,
        payerName: e.payerName, payerIban: e.payerIban, reference: e.reference, details: e.details,
      }));
    if (items.length === 0) return;
    setBusy('apply'); setError(null);
    try {
      const r = await api.bankImport.apply({
        filename, accountIban: preview.accountIban, from: preview.from, to: preview.to,
        total: preview.total, credits: preview.credits, items,
      });
      setResult(r);
      setPreview(null); // svež pogled: ponovni uvoz iste datoteke pokaže "že knjiženo"
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Knjiženje ni uspelo.');
    } finally { setBusy(null); }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Plačila (banka)</h1>
          <p className="mt-1 text-sm text-muted">
            Uvozi izpisek <span className="font-semibold">camt.053 (ISO 20022 XML)</span> iz e-banke —
            prilivi se po sklicu sami povežejo z računi.
          </p>
        </div>
        <Button tone="go" onClick={() => fileRef.current?.click()} disabled={busy !== null || DEMO_MODE}>
          {busy === 'parse' ? <Spinner /> : '⬆ Uvozi izpisek (.xml)'}
        </Button>
        <input ref={fileRef} type="file" accept=".xml,text/xml,application/xml" className="hidden" onChange={onFile} />
      </div>

      {DEMO_MODE && <ProblemBanner tone="hold" message="Demo način: uvoz izpiskov teče v pravem okolju (potrebuje bazo in izdane račune)." />}
      {error && <ProblemBanner tone="stop" message={error} />}

      {result && (
        <Card className="p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-steel">Rezultat knjiženja</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <SoftChip tone="go">Knjiženo: <span className="num font-bold">{result.applied}</span></SoftChip>
            <SoftChip tone="info">Že knjiženo prej: <span className="num font-bold">{result.duplicates}</span></SoftChip>
            <SoftChip tone={result.errors > 0 ? 'stop' : 'neutral'}>Napake: <span className="num font-bold">{result.errors}</span></SoftChip>
          </div>
          {result.results.filter((r: any) => r.status === 'applied').slice(0, 8).map((r: any) => (
            <p key={r.fingerprint} className="mt-1 text-sm text-muted">
              ✓ Račun <span className="num font-semibold text-ink">{r.invoiceNumber}</span> —{' '}
              {formatMoneyMinor(r.appliedMinor, 'EUR')}
              {Number(r.unappliedMinor) > 0 && <> (preplačilo {formatMoneyMinor(r.unappliedMinor, 'EUR')} ostane na plačilu)</>}
            </p>
          ))}
          {result.results.filter((r: any) => r.status === 'error').map((r: any) => (
            <p key={r.fingerprint} className="mt-1 text-sm font-semibold text-stop">✕ {r.error}</p>
          ))}
        </Card>
      )}

      {preview && (
        <>
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap gap-2 text-sm">
              {preview.accountIban && <SoftChip tone="neutral">Račun: <span className="num">{preview.accountIban}</span></SoftChip>}
              {(preview.from || preview.to) && (
                <SoftChip tone="neutral">Obdobje: <span className="num">{preview.from ?? '…'} – {preview.to ?? '…'}</span></SoftChip>
              )}
              <SoftChip tone="info">Vnosov: <span className="num font-bold">{preview.total}</span></SoftChip>
              <SoftChip tone="go">Ujemanj po sklicu: <span className="num font-bold">{preview.autoMatched}</span></SoftChip>
            </div>
            <Button tone="go" size="lg" onClick={applySelected} disabled={busy !== null || selectedCount === 0}>
              {busy === 'apply' ? <Spinner /> : `Knjiži izbrana plačila (${selectedCount})`}
            </Button>
          </Card>

          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-steel">
                  <th className="p-3 w-10"></th>
                  <th className="p-3">Datum</th>
                  <th className="p-3">Plačnik</th>
                  <th className="p-3">Sklic</th>
                  <th className="p-3 text-right">Znesek</th>
                  <th className="p-3">Ujemanje → račun</th>
                </tr>
              </thead>
              <tbody>
                {preview.entries.map((e) => {
                  const meta = MATCH_META[e.match];
                  const pickable = e.match === 'auto' || e.match === 'suggested';
                  return (
                    <tr key={e.fingerprint} className={`border-b border-line last:border-0 ${e.match === 'duplicate' || e.match === 'debit' ? 'opacity-50' : ''}`}>
                      <td className="p-3">
                        {pickable && (
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-[var(--go,#16a34a)]"
                            checked={!!chosen[e.fingerprint]}
                            onChange={(ev) => {
                              const def = e.invoice?.id ?? e.candidates[0]?.id ?? null;
                              setChosen((c) => ({ ...c, [e.fingerprint]: ev.target.checked ? (c[e.fingerprint] ?? def) : null }));
                            }}
                          />
                        )}
                      </td>
                      <td className="num p-3 whitespace-nowrap">{e.bookingDate ?? '—'}</td>
                      <td className="p-3">
                        <div className="font-semibold">{e.payerName ?? '—'}</div>
                        {e.payerIban && <div className="num text-xs text-muted2">{e.payerIban}</div>}
                      </td>
                      <td className="num p-3">{e.reference ?? <span className="text-muted2">{e.details ? e.details.slice(0, 40) : '—'}</span>}</td>
                      <td className={`num p-3 text-right font-bold ${e.credit ? 'text-go' : 'text-steel'}`}>
                        {e.credit ? '+' : '−'}{formatMoneyMinor(e.amountMinor, e.currency)}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <SoftChip tone={meta.tone}>{meta.label}</SoftChip>
                          {e.match === 'auto' && e.invoice && (
                            <Link href={`/advisor/invoices/${e.invoice.id}`} className="font-semibold text-brand hover:underline">
                              {e.invoice.number}
                            </Link>
                          )}
                          {e.match === 'suggested' && (
                            <select
                              value={chosen[e.fingerprint] ?? ''}
                              onChange={(ev) => setChosen((c) => ({ ...c, [e.fingerprint]: ev.target.value || null }))}
                              className="min-h-tap rounded-tool border border-linestrong bg-surface px-2 text-sm focus:border-brandring focus:outline-none"
                            >
                              <option value="">— izberi račun —</option>
                              {e.candidates.map((cnd) => (
                                <option key={cnd.id} value={cnd.id}>
                                  {cnd.number} · {cnd.customerName ?? '?'} · odprto {formatMoneyMinor(cnd.remainingMinor, e.currency)}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <p className="text-xs text-muted2">
            Zanesljiva ujemanja (veljaven RF/SI sklic → točno en odprt račun) so predizbrana. Predlogi
            (ujemanje samo po znesku ali več kandidatov) zahtevajo vašo izbiro. Ponovni uvoz iste
            datoteke ne podvoji knjižb — že knjiženi prilivi so označeni.
          </p>
        </>
      )}

      {!preview && !result && !DEMO_MODE && (
        <Card className="p-8 text-center text-muted">
          <p className="text-lg font-semibold text-ink">Kako deluje?</p>
          <p className="mx-auto mt-2 max-w-xl text-sm">
            V e-banki izvozite izpisek v formatu <span className="font-semibold">ISO 20022 camt.053 (XML)</span> in ga
            uvozite tukaj. Prilivi z RF sklicem (ta je na UPN QR kodi vaših računov) se samodejno povežejo
            s pravim računom — vi samo pregledate in potrdite.
          </p>
        </Card>
      )}

      {!DEMO_MODE && <ImportHistory refreshKey={result ? result.applied + result.duplicates + result.errors : 0} />}
    </div>
  );
}

/*
 * P2.1 — zgodovina uvozov. Revizijska sled: kdaj je bila katera datoteka
 * uvožena, koliko prilivov je imela in koliko/koliko € je bilo knjiženih.
 * Klik na vrstico razpre vnose s povezavami na račune. refreshKey poskrbi,
 * da se seznam osveži takoj po knjiženju (ne šele ob naslednjem obisku).
 */
const ENTRY_STATUS: Record<string, { label: string; tone: 'go' | 'hold' | 'neutral' }> = {
  applied: { label: 'knjiženo', tone: 'go' },
  pending: { label: 'neknjiženo (v teku ali razknjiženo)', tone: 'hold' },
  skipped: { label: 'preskočeno', tone: 'neutral' },
};

function ImportHistory({ refreshKey }: { refreshKey: number }) {
  const [bump, setBump] = useState(0); // osvežitev po razknjiženju
  const [revBusy, setRevBusy] = useState<string | null>(null);
  const [revError, setRevError] = useState<string | null>(null);
  const { data: imports, error } = useSWR(['bank-imports', refreshKey, bump], () => api.bankImport.list());
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: detail } = useSWR(openId ? ['bank-import', openId, bump] : null, () => api.bankImport.get(openId!));

  async function reverse(entryId: string) {
    // Razlog je neobvezen; Prekliči (null) prekine. Storno gre skozi
    // InvoicesService — saldo in status računa se vrneta, vnos pa nazaj v
    // 'pending', da ga ponovni uvoz izpiska lahko knjiži na pravi račun.
    const reason = window.prompt('Razknjižim plačilo? Saldo in status računa se vrneta. Razlog (neobvezno):', '');
    if (reason === null) return;
    setRevBusy(entryId); setRevError(null);
    try {
      await api.bankImport.reverse(entryId, reason.trim() || undefined);
      setBump((b) => b + 1);
    } catch (err) {
      setRevError(err instanceof ApiError ? err.message : 'Razknjiženje ni uspelo.');
    } finally { setRevBusy(null); }
  }

  if (error) return <ProblemBanner tone="hold" message="Zgodovine uvozov ni bilo mogoče naložiti." />;
  if (!imports || imports.length === 0) return null;

  return (
    <Card className="p-0">
      <div className="border-b border-line p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-steel">Zgodovina uvozov</h3>
      </div>
      {revError && <div className="p-3"><ProblemBanner tone="stop" message={revError} /></div>}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-steel">
            <th className="p-3">Uvoženo</th>
            <th className="p-3">Datoteka</th>
            <th className="p-3">Obdobje</th>
            <th className="p-3 text-right">Prilivov</th>
            <th className="p-3 text-right">Knjiženo</th>
            <th className="p-3 text-right">Znesek</th>
          </tr>
        </thead>
        <tbody>
          {imports.map((im: any) => (
            <Fragment key={im.id}>
              <tr
                onClick={() => setOpenId((cur) => (cur === im.id ? null : im.id))}
                className={`cursor-pointer border-b border-line last:border-0 hover:bg-floor ${openId === im.id ? 'bg-floor' : ''}`}
              >
                <td className="num p-3 whitespace-nowrap">{String(im.createdAt ?? '').slice(0, 10)}</td>
                <td className="p-3 font-semibold">{im.filename ?? '—'}</td>
                <td className="num p-3 whitespace-nowrap">{im.from ?? '…'} – {im.to ?? '…'}</td>
                <td className="num p-3 text-right">{im.entriesCredit}</td>
                <td className="num p-3 text-right font-bold">{im.appliedCount}</td>
                <td className="num p-3 text-right font-bold">{formatMoneyMinor(im.appliedMinor, 'EUR')}</td>
              </tr>
              {openId === im.id && (
                <tr key={`${im.id}-detail`} className="border-b border-line last:border-0">
                  <td colSpan={6} className="bg-floor p-3">
                    {!detail ? (
                      <div className="p-2 text-center"><Spinner /></div>
                    ) : detail.entries.length === 0 ? (
                      <p className="text-sm text-muted">Ta uvoz nima zabeleženih vnosov (predogled brez knjiženja vnosov ne shrani).</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wide text-steel">
                            <th className="p-2">Datum</th><th className="p-2">Plačnik</th><th className="p-2">Sklic</th>
                            <th className="p-2 text-right">Znesek</th><th className="p-2">Status</th><th className="p-2">Račun</th><th className="p-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.entries.map((en: any) => {
                            const st = ENTRY_STATUS[en.status] ?? { label: en.status, tone: 'neutral' as const };
                            return (
                              <tr key={en.id} className="border-t border-line">
                                <td className="num p-2 whitespace-nowrap">{en.bookingDate ?? '—'}</td>
                                <td className="p-2">{en.payerName ?? '—'}</td>
                                <td className="num p-2">{en.reference ?? '—'}</td>
                                <td className="num p-2 text-right font-bold">{formatMoneyMinor(en.amountMinor, en.currency || 'EUR')}</td>
                                <td className="p-2"><SoftChip tone={st.tone}>{st.label}</SoftChip></td>
                                <td className="p-2">
                                  {en.invoiceId ? (
                                    <Link href={`/advisor/invoices/${en.invoiceId}`} className="font-semibold text-brand hover:underline">
                                      {en.invoiceNumber ?? 'račun'}
                                    </Link>
                                  ) : '—'}
                                </td>
                                <td className="p-2 text-right">
                                  {en.status === 'applied' && en.paymentId && (
                                    <button
                                      onClick={() => reverse(en.id)}
                                      disabled={revBusy !== null}
                                      className="min-h-tap rounded-tool border border-linestrong bg-surface px-3 text-sm font-semibold text-ink hover:bg-floor disabled:opacity-50"
                                    >
                                      {revBusy === en.id ? <Spinner /> : 'Razknjiži'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
