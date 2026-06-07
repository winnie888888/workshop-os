'use client';

import { useEffect, useState } from 'react';
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type WorkshopSettings } from '@/lib/workshop-settings';
import { Button, Card, Spinner, ProblemBanner } from '@/components/ui';
import { TextField, NumberField, SelectField, CheckboxField } from '@/components/form';

/*
 * Nastavitve — konfiguracija delavnice (podjetje, privzete vrednosti, integracije,
 * AI). Shranjeno lokalno; pripravljeno za zamenjavo z GET/PUT /settings. Pravi
 * API ključi bi bili shranjeni na strežniku — tu so le za demo konfiguracijo.
 */
export default function SettingsPage() {
  const [s, setS] = useState<WorkshopSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadSettings().then(setS); }, []);

  if (!s) return <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>;

  const set = <K extends keyof WorkshopSettings,>(group: K, patch: Partial<WorkshopSettings[K]>) =>
    setS((p) => (p ? { ...p, [group]: { ...p[group], ...patch } } : p));

  async function save() {
    setBusy(true);
    try { await saveSettings(s!); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Nastavitve</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setS(DEFAULT_SETTINGS)} className="text-sm font-semibold text-muted2 hover:text-stop">Ponastavi</button>
          <Button tone="go" onClick={save} disabled={busy}>{busy ? <Spinner /> : 'Shrani nastavitve'}</Button>
        </div>
      </div>

      {saved && <ProblemBanner tone="go" message="Nastavitve shranjene." />}

      <Section title="Podjetje">
        <TextField label="Naziv" value={s.company.name} onChange={(v) => set('company', { name: v })} />
        <TextField label="Naslov" value={s.company.address} onChange={(v) => set('company', { address: v })} placeholder="Ulica, pošta, kraj" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="ID za DDV" value={s.company.vatId} onChange={(v) => set('company', { vatId: v })} placeholder="SI12345678" />
          <TextField label="IBAN" value={s.company.iban} onChange={(v) => set('company', { iban: v })} placeholder="SI56 …" mono />
        </div>
      </Section>

      <Section title="Privzete vrednosti">
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Privzeta stopnja DDV (%)" value={s.defaults.vatRatePct} onChange={(v) => set('defaults', { vatRatePct: v })} />
          <NumberField label="Urna postavka (€)" value={s.defaults.labourRateEur} onChange={(v) => set('defaults', { labourRateEur: v })} />
          <SelectField label="Valuta" value={s.defaults.currency} onChange={(v) => set('defaults', { currency: v })}
            options={[{ value: 'EUR', label: 'EUR' }]} />
        </div>
      </Section>

      <Section title="Integracije">
        <CheckboxField label="Minimax (računovodstvo / e-računi)" checked={s.integrations.minimaxEnabled}
          onChange={(v) => set('integrations', { minimaxEnabled: v })}
          hint="Ob izstavitvi računa se ta pošlje v Minimax." />
        {s.integrations.minimaxEnabled && (
          <TextField label="Minimax OrgId" value={s.integrations.minimaxOrgId} onChange={(v) => set('integrations', { minimaxOrgId: v })} placeholder="npr. 123456" mono />
        )}
        <CheckboxField label="SMS obveščanje stranke" checked={s.integrations.smsEnabled}
          onChange={(v) => set('integrations', { smsEnabled: v })}
          hint="Obvestila o statusu naloga, odobritvah in pripravljenosti vozila." />
        {s.integrations.smsEnabled && (
          <TextField label="Pošiljatelj SMS" value={s.integrations.smsSender} onChange={(v) => set('integrations', { smsSender: v })} />
        )}
      </Section>

      <Section title="AI pomočniki">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Govor v besedilo (STT)" value={s.ai.sttProvider} onChange={(v) => set('ai', { sttProvider: v as any })}
            options={[{ value: 'browser', label: 'Brskalnik (Web Speech)' }, { value: 'external', label: 'Zunanji ponudnik' }]} />
          <SelectField label="Prepoznava tablic (OCR)" value={s.ai.ocrProvider} onChange={(v) => set('ai', { ocrProvider: v as any })}
            options={[{ value: 'demo', label: 'Demo (lokalno)' }, { value: 'external', label: 'Zunanji ponudnik' }]} />
        </div>
        <p className="text-xs text-muted">Izbira »zunanji ponudnik« bo aktivna, ko priklopimo ključe (OpenAI / Google / Azure).</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {children}
    </Card>
  );
}
