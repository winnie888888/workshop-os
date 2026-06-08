'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { DEMO_MODE } from '@/lib/demo';
import { readDefaultsSync } from '@/lib/workshop-settings';
import { formatMoneyMinor, docTotalsMinor } from '@/lib/format';
import { Button, Card, SoftChip, Spinner, ProblemBanner } from '@/components/ui';
import { SelectField } from '@/components/form';

/*
 * Nov predračun — create an estimate. Customer (required) + optional vehicle,
 * then a line builder: add labour (prefilled with the workshop hourly rate),
 * a free part, or pull a part straight from the catalogue. Defaults (VAT, rate)
 * come from Settings via readDefaultsSync, so this matches the work-order editor.
 */
type Row = { id: string; kind: 'labour' | 'part'; description: string; qty: string; priceEur: string; vat: string };
const uid = () => Math.random().toString(36).slice(2, 9);
const eurToMinor = (s: string) => Math.round((parseFloat(String(s).replace(',', '.')) || 0) * 100);
const inputCls = 'w-full rounded-tool border border-line bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brandring';

export default function NewQuotePage() {
  const router = useRouter();
  const { data: customers } = useSWR(DEMO_MODE ? ['customers-new-quote'] : null, () => api.customers.list().catch(() => []));
  const [customerId, setCustomerId] = useState('');
  const { data: vehicles } = useSWR(DEMO_MODE && customerId ? ['veh-new-quote', customerId] : null, () => api.assets.list(customerId).catch(() => []));
  const [vehicleId, setVehicleId] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const { data: results } = useSWR(DEMO_MODE && q.trim().length >= 2 ? ['cat-new-quote', q] : null, () => api.inventory.search(q).catch(() => []));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!DEMO_MODE) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="border-hold/40 bg-hold/5 p-6">
          <p className="font-semibold text-ink">Predračuni so na voljo v demo načinu.</p>
          <Link href="/advisor/quotes" className="mt-3 inline-block text-sm font-semibold text-brand">‹ Predračuni</Link>
        </Card>
      </div>
    );
  }

  const addLabour = () => { const d = readDefaultsSync(); setRows((r) => [...r, { id: uid(), kind: 'labour', description: 'Delo', qty: '1', priceEur: d.labourRateEur, vat: d.vatRatePct }]); };
  const addPart = () => { const d = readDefaultsSync(); setRows((r) => [...r, { id: uid(), kind: 'part', description: '', qty: '1', priceEur: '0.00', vat: d.vatRatePct }]); };
  const addFromCatalogue = (it: any) => { const d = readDefaultsSync(); setRows((r) => [...r, { id: uid(), kind: 'part', description: it.name, qty: '1', priceEur: ((Number(it.priceMinor) || 0) / 100).toFixed(2), vat: String(it.vatRatePct ?? d.vatRatePct) }]); setQ(''); };
  const setRow = (id: string, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeRow = (id: string) => setRows((r) => r.filter((x) => x.id !== id));

  const totals = docTotalsMinor(rows.map((r) => ({ qty: parseFloat(r.qty) || 0, unitPriceMinor: eurToMinor(r.priceEur), vatRatePct: parseFloat(r.vat) || 0 })));

  const customerOpts = [{ value: '', label: '— izberi stranko —' }, ...((customers as any[] | undefined) ?? []).map((c) => ({ value: c.id, label: c.name }))];
  const vehicleOpts = [{ value: '', label: customerId ? '— brez vozila —' : 'najprej izberi stranko' }, ...((vehicles as any[] | undefined) ?? []).map((v) => ({ value: v.id, label: [v.plate, [v.make, v.model].filter(Boolean).join(' ')].filter(Boolean).join(' · ') || v.id }))];

  async function save() {
    if (!customerId) { setError('Izberi stranko.'); return; }
    if (rows.length === 0) { setError('Dodaj vsaj eno postavko.'); return; }
    setBusy(true); setError(null);
    try {
      const lines = rows.map((r) => ({ id: uid(), kind: r.kind, description: r.description.trim() || '(brez opisa)', qty: parseFloat(r.qty) || 0, unitPriceMinor: eurToMinor(r.priceEur), vatRatePct: parseFloat(r.vat) || 22 }));
      const est = await api.estimates.create({ customerId, vehicleId: vehicleId || undefined, lines });
      router.push(`/advisor/quotes/${est.id}`);
    } catch { setError('Predračuna ni bilo mogoče shraniti.'); setBusy(false); }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <nav className="flex items-center gap-2 text-xs font-semibold text-muted">
        <Link href="/advisor/quotes" className="hover:text-brand">Predračuni</Link>
        <span className="text-muted2">/</span><span className="text-ink">Nov</span>
      </nav>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Nov predračun</h1>

      {error && <ProblemBanner message={error} />}

      <Card className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <SelectField label="Stranka" value={customerId} onChange={(v) => { setCustomerId(v); setVehicleId(''); }} options={customerOpts} required />
        <SelectField label="Vozilo (neobvezno)" value={vehicleId} onChange={setVehicleId} options={vehicleOpts} />
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-ink">Postavke</span>
          <div className="flex gap-2">
            <Button tone="info" size="sm" onClick={addLabour}>+ Delo</Button>
            <Button tone="neutral" size="sm" onClick={addPart}>+ Postavka</Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-tool border border-dashed border-line py-6 text-center text-sm text-muted2">Ni postavk. Dodaj delo, postavko ali izberi iz kataloga spodaj.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((r) => {
              const lineNet = (parseFloat(r.qty) || 0) * eurToMinor(r.priceEur);
              return (
                <div key={r.id} className="rounded-tool border border-line p-2.5">
                  <div className="mb-2 flex items-center gap-2">
                    <SoftChip tone={r.kind === 'labour' ? 'info' : 'neutral'}>{r.kind === 'labour' ? 'Delo' : 'Del'}</SoftChip>
                    <input value={r.description} onChange={(e) => setRow(r.id, { description: e.target.value })} placeholder={r.kind === 'labour' ? 'npr. Pregled zavor' : 'npr. Zavorne ploščice'} className={inputCls} />
                    <button onClick={() => removeRow(r.id)} className="px-1 text-sm font-semibold text-stop">×</button>
                  </div>
                  <div className="grid grid-cols-4 items-end gap-2">
                    <label className="block"><span className="text-[0.6rem] uppercase text-muted2">{r.kind === 'labour' ? 'Ure' : 'Količina'}</span>
                      <input value={r.qty} inputMode="decimal" onChange={(e) => setRow(r.id, { qty: e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.') })} className={`num ${inputCls} text-right`} /></label>
                    <label className="block"><span className="text-[0.6rem] uppercase text-muted2">{r.kind === 'labour' ? '€/h' : '€/EM'}</span>
                      <input value={r.priceEur} inputMode="decimal" onChange={(e) => setRow(r.id, { priceEur: e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.') })} className={`num ${inputCls} text-right`} /></label>
                    <label className="block"><span className="text-[0.6rem] uppercase text-muted2">DDV %</span>
                      <select value={r.vat} onChange={(e: any) => setRow(r.id, { vat: e.target.value })} className={`num ${inputCls} text-right`}>
                        {!['22', '9.5', '5', '0'].includes(r.vat) && <option value={r.vat}>{r.vat} %</option>}
                        <option value="22">22 %</option>
                        <option value="9.5">9,5 %</option>
                        <option value="5">5 %</option>
                        <option value="0">0 %</option>
                      </select></label>
                    <div className="pb-1.5 text-right text-sm"><span className="text-[0.6rem] uppercase text-muted2">Neto</span><div className="num font-semibold text-ink">{formatMoneyMinor(String(Math.round(lineNet)))}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Catalogue search-add */}
        <div className="rounded-tool border border-line bg-surface2 p-2.5">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Išči po katalogu (naziv, SKU)…" className={inputCls} />
          {q.trim().length >= 2 && (
            <div className="mt-2 flex max-h-44 flex-col gap-1 overflow-auto">
              {!results ? <div className="flex justify-center p-2"><Spinner className="text-brand" /></div>
                : (results as any[]).length === 0 ? <p className="p-2 text-xs text-muted2">Ni zadetkov.</p>
                : (results as any[]).slice(0, 8).map((it) => (
                  <button key={it.id} onClick={() => addFromCatalogue(it)} className="flex items-center justify-between rounded border border-line bg-surface px-2.5 py-1.5 text-left text-sm hover:border-brandring">
                    <span className="truncate text-ink">{it.name} {it.sku ? <span className="num text-xs text-muted2">· {it.sku}</span> : null}</span>
                    <span className="num shrink-0 font-semibold text-ink">{formatMoneyMinor(it.priceMinor)}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="flex items-center justify-between p-4">
        <div className="text-sm text-muted">Neto <span className="num font-semibold text-ink">{formatMoneyMinor(String(totals.netMinor))}</span> · DDV <span className="num font-semibold text-ink">{formatMoneyMinor(String(totals.vatMinor))}</span></div>
        <div className="text-right"><div className="text-xs uppercase text-muted2">Skupaj</div><div className="num text-xl font-extrabold text-ink">{formatMoneyMinor(String(totals.grossMinor))}</div></div>
      </Card>

      <div className="flex justify-end gap-2">
        <Link href="/advisor/quotes"><Button tone="neutral">Prekliči</Button></Link>
        <Button tone="go" onClick={save} disabled={busy}>{busy ? <Spinner /> : 'Shrani predračun'}</Button>
      </div>
    </div>
  );
}
