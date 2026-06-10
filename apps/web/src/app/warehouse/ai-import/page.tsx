'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { readDefaultsSync } from '@/lib/workshop-settings';
import { formatMoneyMinor } from '@/lib/format';
import { Button, Card, SoftChip, Spinner } from '@/components/ui';

/*
 * AI uvoz — zajem dobaviteljevega računa. Prilepiš besedilo (ali naložiš primer),
 * AI razčleni postavke, ti jih pregledaš/popraviš, ob potrditvi pa se NOVI artikli
 * ustvarijo v katalogu, OBSTOJEČIM pa se poveča zaloga (z nabavno ceno). Vse skozi
 * iste končne točke kot ročni vnos — ustvarjeni artikli se takoj vidijo v Postavkah,
 * izbirniku delov na nalogu in hitrem vnosu.
 *
 * Tu je razčlenjevalnik hevristični (deluje na prilepljenem besedilu). V produkciji
 * fotografijo prebere AI prehod (OCR + model); pot ostane enaka: predlog → pregled → potrditev.
 */

const SAMPLE = `Dobavitelj: AD Auto Parts d.o.o., ID za DDV SI11223344
Racun st. 2026-4471, datum 06.06.2026

Set zavornih ploscic spredaj      2    85,00    22%
Zavorni disk spredaj (par)        2    120,00   22%
Olje za menjalnik (L)             20   7,20     22%
Klinasti jermen pogonski          4    9,50     22%
Zavorna tekocina DOT (L)          5    6,80     22%

Skupaj neto: 1.045,00 EUR
DDV 22%: 229,90 EUR
Za placilo: 1.274,90 EUR`;

type Row = { id: string; name: string; qty: string; costEur: string; vat: string; matchId?: string; matchName?: string; asNew: boolean };

const uid = () => Math.random().toString(36).slice(2, 9);
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const norm = (s: string) => fold(s.toLowerCase()).replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
const SKIP = /\b(dobavitelj|ra[cč]un|datum|skupaj|neto|bruto|ddv|za pla[cč]ilo|osnova|valuta|stranka|naslov|znesek|popust)\b/i;

/** Heuristic parser: pull {name, qty, unit cost, vat} from invoice-ish lines. */
function parseInvoice(text: string, catalog: any[]): Row[] {
  const rows: Row[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.length < 4 || SKIP.test(line)) continue;
    const vatMatch = line.match(/(\d{1,2}(?:[.,]\d+)?)\s*%/);
    const vat = vatMatch ? vatMatch[1].replace(',', '.') : readDefaultsSync().vatRatePct;
    const noVat = line.replace(/\d{1,2}(?:[.,]\d+)?\s*%/, ' ');
    const nums = (noVat.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
    if (nums.length < 2) continue; // need at least qty + price
    const cost = nums[nums.length - 1];            // last number = unit price
    const qty = nums.find((n) => Number.isInteger(parseFloat(n))) ?? nums[0]; // first integer-ish = qty
    const name = noVat.replace(/[\d.,]+/g, ' ').replace(/\(\s*/g, '(').replace(/\s*\)/g, ')').replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim();
    if (name.length < 3) continue;
    const match = catalog.find((it) => norm(it.name) === norm(name))
      ?? catalog.find((it) => norm(it.name).includes(norm(name)) || norm(name).includes(norm(it.name)));
    rows.push({ id: uid(), name, qty: String(parseFloat(qty) || 1), costEur: (parseFloat(cost) || 0).toFixed(2), vat, matchId: match?.id, matchName: match?.name, asNew: !match });
  }
  return rows;
}

export default function AiImportPage() {
  const { data: catalog } = useSWR(['catalog-all-import'], () => api.inventory.search('').catch(() => []));
  const [phase, setPhase] = useState<'input' | 'review' | 'done'>('input');
  const [text, setText] = useState('');
  const [markup, setMarkup] = useState('40');
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<{ created: number; updated: number } | null>(null);


  function analyse() {
    setRows(parseInvoice(text, (catalog as any[]) ?? []));
    setPhase('review');
  }
  const setRow = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));

  async function confirm() {
    setBusy(true);
    let created = 0, updated = 0;
    const mk = (parseFloat(markup) || 0) / 100;
    for (const r of rows) {
      const costMinor = Math.round((parseFloat(r.costEur) || 0) * 100);
      const qty = parseFloat(r.qty) || 0;
      const vat = parseFloat(r.vat) || 22;
      try {
        if (!r.asNew && r.matchId) {
          await api.inventory.receive({ itemId: r.matchId, quantity: qty, costMinor });
          updated++;
        } else {
          await api.inventory.create({ name: r.name, kind: 'part', unit: 'kos', costMinor, priceMinor: Math.round(costMinor * (1 + mk)), vatRatePct: vat, onHand: qty });
          created++;
        }
      } catch { /* skip a bad row, keep going */ }
    }
    setSummary({ created, updated });
    setPhase('done');
    setBusy(false);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">AI uvoz računa</h1>
        <p className="text-sm text-muted">Prilepi dobaviteljev račun — AI razčleni postavke, ti potrdiš, artikli se ustvarijo/posodobijo v katalogu.</p>
      </div>

      {phase === 'input' && (
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-muted2">Besedilo računa</span>
            <button onClick={() => setText(SAMPLE)} className="text-sm font-semibold text-brand">Naloži primer</button>
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12}
            placeholder="Prilepi besedilo dobaviteljevega računa…"
            className="w-full rounded-tool border border-line bg-surface2 p-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brandring" />
          <p className="text-xs text-muted2">Namig: v produkciji namesto tega slikaš račun in ga prebere AI (OCR). Tu deluje na prilepljenem besedilu.</p>
          <div className="flex justify-end">
            <Button tone="go" onClick={analyse} disabled={text.trim().length < 10}>Razčleni z AI</Button>
          </div>
        </Card>
      )}

      {phase === 'review' && (
        <>
          {rows.length === 0 ? (
            <Card className="p-6 text-center text-muted">AI ni našel postavk. Preveri besedilo in poskusi znova.</Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">AI je predlagal {rows.length} postavk</span>
                <label className="flex items-center gap-2 text-sm text-muted">
                  Pribitek za nove (%)
                  <input value={markup} inputMode="decimal" onChange={(e) => setMarkup(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
                    className="num w-16 rounded-tool border border-line bg-surface px-2 py-1 text-right text-sm" />
                </label>
              </div>

              <div className="flex flex-col gap-2">
                {rows.map((r) => {
                  const costMinor = Math.round((parseFloat(r.costEur) || 0) * 100);
                  const sellMinor = Math.round(costMinor * (1 + (parseFloat(markup) || 0) / 100));
                  return (
                    <Card key={r.id} className="p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <input value={r.name} onChange={(e) => setRow(r.id, { name: e.target.value })}
                          className="flex-1 rounded-tool border border-line bg-surface px-2.5 py-1.5 text-sm font-semibold text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brandring" />
                        <button onClick={() => removeRow(r.id)} className="px-1 text-sm font-semibold text-stop">×</button>
                      </div>
                      <div className="mb-2 flex items-center gap-2">
                        {r.matchId
                          ? (r.asNew
                              ? <SoftChip tone="info">nov artikel</SoftChip>
                              : <SoftChip tone="go">obstoječ · zaloga +{r.qty}</SoftChip>)
                          : <SoftChip tone="info">nov artikel</SoftChip>}
                        {r.matchId && (
                          <label className="flex items-center gap-1 text-xs text-muted">
                            <input type="checkbox" checked={r.asNew} onChange={(e) => setRow(r.id, { asNew: e.target.checked })} className="accent-brand" />
                            ustvari kot nov
                          </label>
                        )}
                        {r.matchId && !r.asNew && <span className="truncate text-xs text-muted2">→ {r.matchName}</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="block"><span className="text-[0.6rem] uppercase text-muted2">Količina</span>
                          <input value={r.qty} inputMode="decimal" onChange={(e) => setRow(r.id, { qty: e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.') })} className="num w-full rounded-tool border border-line bg-surface px-2.5 py-1.5 text-right text-sm" /></label>
                        <label className="block"><span className="text-[0.6rem] uppercase text-muted2">Nabava/EM €</span>
                          <input value={r.costEur} inputMode="decimal" onChange={(e) => setRow(r.id, { costEur: e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.') })} className="num w-full rounded-tool border border-line bg-surface px-2.5 py-1.5 text-right text-sm" /></label>
                        <label className="block"><span className="text-[0.6rem] uppercase text-muted2">DDV %</span>
                          <input value={r.vat} inputMode="decimal" onChange={(e) => setRow(r.id, { vat: e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.') })} className="num w-full rounded-tool border border-line bg-surface px-2.5 py-1.5 text-right text-sm" /></label>
                      </div>
                      {(r.asNew || !r.matchId) && (
                        <p className="mt-1.5 text-xs text-muted2">Prodajna cena (z {markup || 0}% pribitka): <span className="num font-semibold text-ink">{formatMoneyMinor(String(sellMinor))}</span></p>
                      )}
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-between gap-2">
                <Button tone="neutral" onClick={() => setPhase('input')}>‹ Nazaj</Button>
                <Button tone="go" onClick={confirm} disabled={busy}>{busy ? <Spinner /> : `Potrdi in uvozi (${rows.length})`}</Button>
              </div>
            </>
          )}
        </>
      )}

      {phase === 'done' && summary && (
        <Card className="border-go/40 bg-go/5 p-6">
          <p className="text-lg font-bold text-ink">Uvoz zaključen ✓</p>
          <p className="mt-1 text-sm text-steel">Ustvarjenih novih artiklov: <span className="font-bold">{summary.created}</span> · posodobljena zaloga: <span className="font-bold">{summary.updated}</span>.</p>
          <div className="mt-4 flex gap-2">
            <Link href="/warehouse/items"><Button tone="info">Odpri Postavke</Button></Link>
            <Button tone="neutral" onClick={() => { setText(''); setRows([]); setSummary(null); setPhase('input'); }}>Nov uvoz</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
