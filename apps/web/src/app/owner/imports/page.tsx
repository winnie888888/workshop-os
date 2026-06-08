'use client';

import { useMemo, useState, type ChangeEvent, type DragEvent } from 'react';
import { Button, Card, ProblemBanner, SoftChip, Spinner } from '@/components/ui';
import { SelectField } from '@/components/form';
import { DEMO_MODE } from '@/lib/demo';
import { demoStore } from '@/lib/demo-store';
import { ENTITY_LIST, getSchema, planImport, ruleBasedMapper } from '@/lib/import-engine';
import type { ColumnMapping, DryRunResult, RowOutcome, SourceTable } from '@/lib/import-engine';
import { readFileToSourceTable } from '@/lib/import-file';

/*
 * Uvoz podatkov — the wizard surface over the Universal Import Engine.
 * Entiteta → Datoteka (CSV/XLSX) → samodejna Preslikava (z urejanjem) → Pregled
 * (dry-run nad obstoječimi demo-podatki). The confirm/write is the next engine
 * step (P1 4); this surface proves the full parse→map→validate→classify path.
 */

const STEPS = ['Entiteta', 'Datoteka', 'Preslikava', 'Pregled'];

const OUT: Record<RowOutcome, { tone: 'go' | 'info' | 'hold' | 'stop'; label: string; bar: string }> = {
  create: { tone: 'go', label: 'nov', bar: 'border-l-go' },
  update: { tone: 'info', label: 'posodobitev', bar: 'border-l-brand' },
  skip: { tone: 'hold', label: 'preskočeno', bar: 'border-l-hold' },
  error: { tone: 'stop', label: 'napaka', bar: 'border-l-stop' },
};

const ENTITY_ICON: Record<string, JSX.Element> = {
  companies: (<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3" /><path d="M9 9v.01M9 12v.01M9 15v.01" /></svg>),
  vehicles: (<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 3h13v13H1zM14 8h4l3 3v5h-7" /><circle cx="5.5" cy="18.5" r="2" /><circle cx="17.5" cy="18.5" r="2" /></svg>),
  products: (<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8l-9-5-9 5v8l9 5z" /><path d="M3.3 7L12 12l8.7-5M12 22V12" /></svg>),
  invoices: (<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>),
};

function existingFor(entity: string): any[] {
  switch (entity) {
    case 'companies': return demoStore.customers.list();
    case 'vehicles': return demoStore.vehicles.list();
    case 'products': return demoStore.items.list();
    case 'invoices': return demoStore.invoices.list();
    default: return [];
  }
}

function displayVal(type: string, v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  if (type === 'money' && typeof v === 'number') return (v / 100).toFixed(2);
  if (type === 'boolean') return v ? 'da' : 'ne';
  return String(v);
}

function ConfChip({ m }: { m: ColumnMapping }) {
  if (!m.targetField) return <SoftChip tone="neutral">neprepoznano</SoftChip>;
  if (m.reason === 'ročno izbrano') return <SoftChip tone="info">ročno</SoftChip>;
  const pct = Math.round(m.confidence * 100);
  const tone: 'go' | 'info' | 'hold' = m.confidence >= 0.9 ? 'go' : m.confidence >= 0.6 ? 'info' : 'hold';
  return <SoftChip tone={tone}>samodejno {pct}%</SoftChip>;
}

export default function ImportWizardPage() {
  const [step, setStep] = useState(1);
  const [entity, setEntity] = useState<string | null>(null);
  const [table, setTable] = useState<SourceTable | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = entity ? getSchema(entity) : undefined;

  const dry = useMemo<DryRunResult | null>(() => {
    if (!entity || !table) return null;
    const s = getSchema(entity);
    if (!s) return null;
    return planImport(table, s, mapping, existingFor(entity));
  }, [entity, table, mapping]);

  const mappedKeys = new Set(mapping.filter((m) => m.targetField && !m.ignored).map((m) => m.targetField as string));
  const missingReq = schema ? schema.fields.filter((f) => f.required && !mappedKeys.has(f.key)).map((f) => f.label) : [];

  function reset() {
    setStep(1); setEntity(null); setTable(null); setMapping([]); setError(null);
  }

  async function onFile(file: File | null | undefined) {
    if (!file || !schema) return;
    setError(null); setBusy(true);
    try {
      const t = await readFileToSourceTable(file);
      if (!t.rows.length) { setError('V datoteki ni nobene podatkovne vrstice.'); return; }
      const prop = ruleBasedMapper(t, schema);
      setTable(t); setMapping(prop.columns); setStep(3);
    } catch (err: any) {
      setError(err?.message ?? 'Napaka pri branju datoteke.');
    } finally {
      setBusy(false);
    }
  }

  function setTarget(idx: number, key: string) {
    setMapping((prev) => prev.map((m, i) => {
      if (i !== idx) return m;
      const manual = key !== (m.targetField ?? '');
      return {
        ...m,
        targetField: key === '' ? null : key,
        ignored: key === '',
        confidence: key === '' ? 0 : manual ? 1 : m.confidence,
        reason: key === '' ? 'prezrto' : manual ? 'ročno izbrano' : m.reason,
      };
    }));
  }

  if (!DEMO_MODE) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-bold text-ink">Uvoz podatkov</h1>
        <Card className="mt-4 p-5">
          <p className="text-steel">Uvoz v živo (zapis v bazo prek API) pride v fazi P2. Čarovnik trenutno deluje v demo načinu.</p>
        </Card>
      </div>
    );
  }

  const fieldOptions = schema
    ? [{ value: '', label: '— prezri stolpec —' }, ...schema.fields.map((f) => ({ value: f.key, label: f.required ? `${f.label} *` : f.label }))]
    : [];

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Uvoz podatkov</h1>
        <p className="mt-1 text-muted">Excel ali CSV iz katerega koli sistema → samodejna preslikava stolpcev → varen predogled pred uvozom.</p>
      </header>

      <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        {STEPS.map((s, i) => {
          const n = i + 1; const active = n === step; const done = n < step;
          return (
            <li key={s} className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${active ? 'bg-brand text-white' : done ? 'bg-go/15 text-go' : 'bg-floor text-muted2'}`}>{done ? '✓' : n}</span>
              <span className={active ? 'font-semibold text-ink' : 'text-muted'}>{s}</span>
              {n < STEPS.length && <span className="mx-1 hidden h-px w-6 bg-line sm:block" />}
            </li>
          );
        })}
      </ol>

      {error && <div className="mb-4"><ProblemBanner message={error} /></div>}

      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {ENTITY_LIST.map((e) => (
            <Card key={e.entity} onClick={() => { setEntity(e.entity); setError(null); setStep(2); }} className="cursor-pointer p-4 transition hover:border-brandring">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tool bg-brandweak text-brand">{ENTITY_ICON[e.entity]}</span>
                <div>
                  <div className="font-semibold text-ink">{e.label}</div>
                  <div className="mt-0.5 text-sm text-muted">{e.description}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {step === 2 && schema && (
        <div>
          <div className="mb-4 flex items-center gap-2 text-sm">
            <SoftChip tone="info">{schema.label}</SoftChip>
            <button onClick={() => setStep(1)} className="text-muted underline-offset-2 hover:underline">spremeni</button>
          </div>
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-linestrong bg-surface2 p-10 text-center transition hover:border-brandring"
            onDrop={(ev: DragEvent) => { ev.preventDefault(); onFile(ev.dataTransfer.files?.[0]); }}
            onDragOver={(ev: DragEvent) => ev.preventDefault()}
          >
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-brand" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5M12 15V3" /></svg>
            <div className="font-semibold text-ink">Povleci datoteko sem ali klikni za izbiro</div>
            <div className="text-sm text-muted">CSV, TSV ali Excel (.xlsx, .xls) — do 15 MB</div>
            <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm" className="hidden" onChange={(ev: ChangeEvent<HTMLInputElement>) => onFile(ev.target.files?.[0])} />
          </label>
          {busy && <div className="mt-3 flex items-center gap-2 text-sm text-muted"><Spinner /> Berem datoteko…</div>}
        </div>
      )}

      {step === 3 && schema && table && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted">{table.meta?.filename} · {table.columns.length} stolpcev · {table.rows.length} vrstic</div>
            <SoftChip tone="info">{schema.label}</SoftChip>
          </div>

          {missingReq.length > 0 && (
            <div className="mb-3"><ProblemBanner tone="hold" message={`Manjkajo obvezna polja: ${missingReq.join(', ')}. Take vrstice bodo označene kot napaka.`} /></div>
          )}

          <Card className="divide-y divide-line">
            {mapping.map((m, i) => (
              <div key={m.sourceColumn + i} className="grid items-center gap-3 p-3 sm:grid-cols-[1.1fr_auto_1.2fr_auto]">
                <div className="min-w-0">
                  <div className="truncate font-medium text-ink">{m.sourceColumn}</div>
                  {m.sampleValues.length > 0 && <div className="truncate text-xs text-muted">npr.: {m.sampleValues.slice(0, 3).join(', ')}</div>}
                </div>
                <div className="hidden text-muted2 sm:block">→</div>
                <SelectField label="" value={m.targetField ?? ''} onChange={(v) => setTarget(i, v)} options={fieldOptions} />
                <div className="justify-self-start sm:justify-self-end"><ConfChip m={m} /></div>
              </div>
            ))}
          </Card>

          <div className="mt-4 flex items-center justify-between">
            <Button tone="neutral" onClick={() => { setStep(2); setTable(null); }}>Nazaj</Button>
            <Button tone="info" onClick={() => setStep(4)}>Predogled uvoza</Button>
          </div>
        </div>
      )}

      {step === 4 && schema && dry && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SoftChip tone="go">Novih {dry.created}</SoftChip>
            <SoftChip tone="info">Posodobitev {dry.updated}</SoftChip>
            <SoftChip tone="hold">Preskočenih {dry.skipped}</SoftChip>
            <SoftChip tone="stop">Napak {dry.errored}</SoftChip>
            <span className="ml-auto text-sm text-muted">skupaj {dry.total} vrstic</span>
          </div>

          {dry.unmappedColumns.length > 0 && (
            <p className="mb-3 text-sm text-muted">Nepreslikani stolpci (prezrti): {dry.unmappedColumns.join(', ')}.</p>
          )}

          <Card className="overflow-hidden">
            <div className="max-h-[28rem] divide-y divide-line overflow-auto">
              {dry.rows.slice(0, 300).map((r) => {
                const o = OUT[r.outcome];
                const parts = schema.fields
                  .filter((f) => r.record[f.key] !== undefined && r.record[f.key] !== null && r.record[f.key] !== '')
                  .slice(0, 3)
                  .map((f) => `${f.label}: ${displayVal(f.type, r.record[f.key])}`);
                return (
                  <div key={r.index} className={`border-l-4 ${o.bar} bg-surface px-3 py-2`}>
                    <div className="flex items-center gap-2">
                      <span className="w-10 shrink-0 text-xs tabular-nums text-muted2">#{r.index + 1}</span>
                      <SoftChip tone={o.tone}>{o.label}{r.matchedBy ? ` · ${r.matchedBy}` : ''}</SoftChip>
                      <span className="truncate text-sm text-steel">{parts.join('  ·  ')}</span>
                    </div>
                    {(r.errors.length > 0 || r.warnings.length > 0) && (
                      <div className="mt-1 pl-12 text-xs">
                        {r.errors.map((e, k) => <div key={`e${k}`} className="text-stop">⚠ {e}</div>)}
                        {r.warnings.map((w, k) => <div key={`w${k}`} className="text-hold">{w}</div>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {dry.rows.length > 300 && <div className="border-t border-line p-2 text-center text-xs text-muted">prikazanih prvih 300 od {dry.rows.length} vrstic</div>}
          </Card>

          <div className="mt-5 rounded-card border border-line bg-surface2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Button tone="go" size="lg" disabled>Uvozi {dry.created + dry.updated} zapisov</Button>
                <p className="mt-2 max-w-xl text-sm text-muted">Zapis v aplikacijo pride v naslednjem koraku (P1 korak 4). Ta pregled ničesar ne shrani — je varnostni korak: pokaže, kaj bo nastalo, posodobljeno ali preskočeno.</p>
              </div>
              <div className="flex gap-2">
                <Button tone="neutral" onClick={() => setStep(3)}>Nazaj na preslikavo</Button>
                <Button tone="neutral" onClick={reset}>Začni znova</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
