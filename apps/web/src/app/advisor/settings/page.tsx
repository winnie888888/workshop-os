'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { DEMO_MODE } from '@/lib/demo';
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type WorkshopSettings } from '@/lib/workshop-settings';
import { Button, Card, Spinner, ProblemBanner } from '@/components/ui';
import { TextField, NumberField, SelectField, CheckboxField, TextAreaField } from '@/components/form';

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
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Nastavitve</h1>
          <p className="mt-1 text-sm text-muted">Plačilni podatki spodaj so skupni za vso delavnico. Ostale nastavitve na tej strani veljajo za to napravo/brskalnik.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setS(DEFAULT_SETTINGS)} className="text-sm font-semibold text-muted2 hover:text-stop">Ponastavi</button>
          <Button tone="go" onClick={save} disabled={busy}>{busy ? <Spinner /> : 'Shrani nastavitve'}</Button>
        </div>
      </div>

      {saved && <ProblemBanner tone="go" message="Nastavitve shranjene." />}

      <PaymentProfileCard />

      <Section title="Podjetje (videz izpisov na tej napravi)">
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
        <div className="rounded-lg border border-hold/40 bg-hold/10 px-3 py-2 text-xs text-hold">
          V pripravi — povezave se vklopijo s priklopom poverilnic na strežniku (Minimax org., SMS pošiljatelj).
          Trenutno te možnosti opisujejo načrtovano vedenje in ne vklapljajo/izklapljajo pošiljanja.
        </div>
        <CheckboxField label="Minimax (računovodstvo / e-računi)" checked={s.integrations.minimaxEnabled}
          onChange={(v) => set('integrations', { minimaxEnabled: v })}
          hint="Načrtovano: ob izstavitvi računa se ta pošlje v Minimax." />
        {s.integrations.minimaxEnabled && (
          <TextField label="Minimax OrgId" value={s.integrations.minimaxOrgId} onChange={(v) => set('integrations', { minimaxOrgId: v })} placeholder="npr. 123456" mono />
        )}
        <CheckboxField label="SMS obveščanje stranke" checked={s.integrations.smsEnabled}
          onChange={(v) => set('integrations', { smsEnabled: v })}
          hint="Načrtovano: obvestila o statusu naloga, odobritvah in pripravljenosti vozila." />
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

/*
 * Podatki za plačila (UPN QR) — STREŽNIŠKI profil delavnice (/tenant/profile),
 * viden vsem članom in uporabljen kot prejemnik na QR kodi računa/predračuna.
 * Ločeno od lokalne sekcije »Podjetje« zgoraj, ki služi le demo izpisom na tej
 * napravi. Shranjevanje zahteva vlogo lastnika ali administratorja (TenantManage).
 */
function PaymentProfileCard() {
  const { data, mutate } = useSWR(DEMO_MODE ? null : 'tenant-profile', () => api.tenant.profile());
  const [form, setForm] = useState<{ iban: string; bankName: string; address: string; postCode: string; city: string; phone: string; fax: string; email: string; website: string; bic: string; iban2: string; bic2: string; registrationNote: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: 'go' | 'stop'; msg: string } | null>(null);

  useEffect(() => {
    if (data && !form) {
      setForm({
        iban: data.iban ?? '', bankName: data.bankName ?? '',
        address: data.address ?? '', postCode: data.postCode ?? '', city: data.city ?? '',
        phone: data.phone ?? '', fax: data.fax ?? '', email: data.email ?? '', website: data.website ?? '',
        bic: data.bic ?? '', iban2: data.iban2 ?? '', bic2: data.bic2 ?? '',
        registrationNote: data.registrationNote ?? '',
      });
    }
  }, [data, form]);

  if (DEMO_MODE) {
    return (
      <Section title="Podatki za plačila (UPN QR)">
        <p className="text-sm text-muted">
          QR koda za plačilo na računu in predračunu uporablja IBAN ter naslov delavnice.
          V demo načinu je prikazan vzorčni IBAN iz ZBS standarda; v pravi rabi podatke
          tu vpiše lastnik in veljajo za vse uporabnike.
        </p>
        <div className="num rounded-md bg-paper px-3 py-2 text-sm text-ink">SI56 0510 0801 0486 080 <span className="text-xs text-muted">(vzorec)</span></div>
      </Section>
    );
  }

  if (!form) {
    return (
      <Section title="Podatki za plačila (UPN QR)">
        <div className="flex items-center gap-3 text-sm text-muted"><Spinner className="text-brand" /> Nalagam …</div>
      </Section>
    );
  }

  const setF = (patch: Partial<NonNullable<typeof form>>) => setForm((p) => (p ? { ...p, ...patch } : p));

  async function savePayment() {
    if (!form) return;
    setBusy(true); setNote(null);
    try {
      await api.tenant.updateProfile(form);
      await mutate();
      setNote({ tone: 'go', msg: 'Plačilni podatki shranjeni — QR na računih jih uporablja takoj.' });
    } catch (e: any) {
      const denied = String(e?.message ?? '').includes('403');
      setNote({
        tone: 'stop',
        msg: denied
          ? 'Za urejanje plačilnih podatkov potrebujete vlogo lastnika ali administratorja.'
          : (e?.message ?? 'Shranjevanje ni uspelo.'),
      });
    } finally { setBusy(false); }
  }

  return (
    <Section title="Podatki za plačila (UPN QR)">
      <p className="text-sm text-muted">
        Ti podatki so prejemnik na QR kodi računa in predračuna (avans). Shranjeni so na
        strežniku in veljajo za vse uporabnike delavnice.
      </p>
      <TextField label="IBAN (TRR delavnice)" value={form.iban} onChange={(v) => setF({ iban: v })} placeholder="SI56 0000 0000 0000 000" mono required />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Banka" value={form.bankName} onChange={(v) => setF({ bankName: v })} placeholder="npr. NLB d.d." />
        <TextField label="Ulica in št." value={form.address} onChange={(v) => setF({ address: v })} placeholder="Industrijska cesta 12" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Poštna številka" value={form.postCode} onChange={(v) => setF({ postCode: v })} placeholder="8340" />
        <TextField label="Kraj" value={form.city} onChange={(v) => setF({ city: v })} placeholder="Črnomelj" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="BIC (SWIFT) banke" value={form.bic} onChange={(v) => setF({ bic: v })} placeholder="LJBASI2X" mono />
        <TextField label="Telefon" value={form.phone} onChange={(v) => setF({ phone: v })} placeholder="040 328 279" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="IBAN 2 (drugi TRR, neobvezno)" value={form.iban2} onChange={(v) => setF({ iban2: v })} placeholder="SI56 …" mono />
        <TextField label="BIC 2" value={form.bic2} onChange={(v) => setF({ bic2: v })} placeholder="KBMASI2X" mono />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Faks (neobvezno)" value={form.fax} onChange={(v) => setF({ fax: v })} />
        <TextField label="E-pošta (na računu)" value={form.email} onChange={(v) => setF({ email: v })} placeholder="info@delavnica.si" />
      </div>
      <TextField label="Spletna stran (neobvezno)" value={form.website} onChange={(v) => setF({ website: v })} placeholder="www.delavnica.si" />
      <TextAreaField label="Registracijska noga računa" value={form.registrationNote} onChange={(v) => setF({ registrationNote: v })} rows={2}
        placeholder="Družba je registrirana dne … pri Okrožnem sodišču v … pod št. … Osnovni kapital znaša … EUR. Matična številka: …" />
      <p className="text-xs text-muted2">Vsi ti podatki se izpišejo v glavi oz. nogi vsakega računa — enako kot na obstoječih Minimax računih.</p>
      {note && <ProblemBanner tone={note.tone} message={note.msg} />}
      <div>
        <Button tone="go" onClick={savePayment} disabled={busy}>{busy ? <Spinner /> : 'Shrani podatke podjetja'}</Button>
      </div>
    </Section>
  );
}
