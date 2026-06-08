'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { DEMO_MODE } from '@/lib/demo';
import { Button, Card, ProblemBanner, Spinner } from '@/components/ui';
import { SelectField, TextField, TextAreaField, NumberField } from '@/components/form';
import { isoDate, startOfWeek, addDays, WEEKDAY_LABELS } from '@/lib/calendar-store';

/*
 * Koledar / termini — central-store backed. Each appointment links to a real
 * customer + vehicle (dropdowns, not free text), persists in the shared store,
 * and logs activity. Times are stored as local wall-clock (no UTC conversion),
 * so what you book is what the grid shows. The old wos.appointments.v1 orphan is
 * gone; date helpers are reused from calendar-store.
 */
type Status = 'scheduled' | 'done' | 'cancelled';
type ApptForm = { id?: string; date: string; time: string; durationMin: number; customerId: string; vehicleId: string; title: string; note: string; status: Status };

const toStart = (date: string, time: string) => `${date}T${time}:00`;

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [form, setForm] = useState<ApptForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const { data: appts, mutate } = useSWR(DEMO_MODE ? ['appointments'] : null, () => api.appointments.list().catch(() => []));
  const { data: customers } = useSWR(DEMO_MODE ? ['cal-customers'] : null, () => api.customers.list().catch(() => []));
  const { data: vehicles } = useSWR(DEMO_MODE && form?.customerId ? ['cal-veh', form.customerId] : null, () => api.assets.list(form!.customerId).catch(() => []));

  if (!DEMO_MODE) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="border-hold/40 bg-hold/5 p-6">
          <p className="font-semibold text-ink">Koledar je povezan z demo bazo.</p>
          <p className="mt-1 text-sm text-muted">V produkciji teče prek API-ja /appointments (v pripravi).</p>
        </Card>
      </div>
    );
  }

  const list = (appts as any[] | undefined) ?? [];
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayIso = isoDate(new Date());
  const custName = (id?: string) => (customers as any[] | undefined)?.find((c) => c.id === id)?.name ?? (id ? '—' : 'Termin');

  function openNew(date: string) { setForm({ date, time: '08:00', durationMin: 60, customerId: '', vehicleId: '', title: '', note: '', status: 'scheduled' }); setSavedNote(null); setError(null); }
  function openEdit(a: any) { setForm({ id: a.id, date: String(a.start).slice(0, 10), time: String(a.start).slice(11, 16), durationMin: a.durationMin ?? 60, customerId: a.customerId ?? '', vehicleId: a.vehicleId ?? '', title: a.title ?? '', note: a.note ?? '', status: a.status ?? 'scheduled' }); setSavedNote(null); setError(null); }
  function setF<K extends keyof ApptForm>(k: K, v: ApptForm[K]) { setForm((p) => (p ? { ...p, [k]: v } : p)); }

  async function save() {
    if (!form) return;
    if (!form.customerId && !form.title.trim()) { setError('Izberi stranko ali vpiši naziv termina.'); return; }
    setError(null);
    const payload = { customerId: form.customerId || undefined, vehicleId: form.vehicleId || undefined, title: form.title.trim() || 'Termin', start: toStart(form.date, form.time), durationMin: form.durationMin, note: form.note || undefined, status: form.status };
    try {
      if (form.id) await api.appointments.update(form.id, payload);
      else await api.appointments.create(payload);
      await mutate(); setForm(null); setSavedNote('Termin shranjen.');
    } catch { setError('Termina ni bilo mogoče shraniti.'); }
  }
  async function remove() {
    if (!form?.id) return;
    try { await api.appointments.remove(form.id); await mutate(); setForm(null); setSavedNote('Termin izbrisan.'); }
    catch { setError('Termina ni bilo mogoče izbrisati.'); }
  }

  const customerOptions = [{ value: '', label: 'Brez stranke' }, ...((customers as any[] | undefined) ?? []).map((c) => ({ value: c.id, label: c.name ?? c.id }))];
  const vehicleOptions = [{ value: '', label: form?.customerId ? 'Brez vozila' : 'najprej izberi stranko' }, ...((vehicles as any[] | undefined) ?? []).map((v) => ({ value: v.id, label: [v.plate, [v.make, v.model].filter(Boolean).join(' ')].filter(Boolean).join(' · ') || v.id }))];
  const monthLabel = weekStart.toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Koledar</h1>
          <p className="text-sm capitalize text-muted">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="grid h-9 w-9 place-items-center rounded-tool border border-line text-steel hover:border-brandring" title="Prejšnji teden">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="rounded-tool border border-line px-3 py-2 text-sm font-semibold text-steel hover:border-brandring">Danes</button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="grid h-9 w-9 place-items-center rounded-tool border border-line text-steel hover:border-brandring" title="Naslednji teden">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <Button tone="go" onClick={() => openNew(todayIso)}>+ Nov termin</Button>
        </div>
      </div>

      {error && <ProblemBanner message={error} />}
      {savedNote && <ProblemBanner tone="go" message={savedNote} />}

      {form && (
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">{form.id ? 'Uredi termin' : 'Nov termin'}</h2>
            {form.customerId && <Link href={`/advisor/customers/${form.customerId}`} className="text-sm font-semibold text-brand hover:underline">Odpri stranko ›</Link>}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Datum" value={form.date} onChange={(v) => setF('date', v)} type="date" />
            <TextField label="Ura" value={form.time} onChange={(v) => setF('time', v)} type="time" />
            <NumberField label="Trajanje (min)" value={String(form.durationMin)} onChange={(v) => setF('durationMin', parseInt(v || '0', 10) || 0)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Stranka" value={form.customerId} onChange={(id) => setForm((p) => (p ? { ...p, customerId: id, vehicleId: '' } : p))} options={customerOptions} />
            <SelectField label="Vozilo" value={form.vehicleId} onChange={(v) => setF('vehicleId', v)} options={vehicleOptions} />
          </div>
          <TextField label="Storitev" value={form.title} onChange={(v) => setF('title', v)} placeholder="npr. Mali servis, menjava zavor" />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Status" value={form.status} onChange={(v) => setF('status', v as Status)}
              options={[{ value: 'scheduled', label: 'Načrtovano' }, { value: 'done', label: 'Opravljeno' }, { value: 'cancelled', label: 'Preklicano' }]} />
          </div>
          <TextAreaField label="Opomba" value={form.note} onChange={(v) => setF('note', v)} rows={2} />
          <div className="flex flex-wrap justify-end gap-2">
            {form.id && <Button tone="stop" onClick={remove}>Izbriši</Button>}
            <Button tone="neutral" onClick={() => setForm(null)}>Prekliči</Button>
            <Button tone="go" onClick={save}>Shrani termin</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((d, i) => {
          const di = isoDate(d);
          const dayAppts = list.filter((a) => String(a.start).slice(0, 10) === di).sort((a, b) => String(a.start).slice(11, 16).localeCompare(String(b.start).slice(11, 16)));
          const isToday = di === todayIso;
          return (
            <Card key={di} className={`flex min-h-[8rem] flex-col gap-2 p-2.5 ${isToday ? 'ring-2 ring-brandring' : ''}`}>
              <button onClick={() => openNew(di)} className="flex items-center justify-between text-left">
                <span>
                  <span className="text-[0.7rem] font-bold uppercase tracking-wide text-muted2">{WEEKDAY_LABELS[i]}</span>
                  <span className={`num ml-1 text-sm font-extrabold ${isToday ? 'text-brand' : 'text-ink'}`}>{d.getDate()}.</span>
                </span>
                <span className="text-muted2 hover:text-brand"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg></span>
              </button>
              <div className="flex flex-col gap-1.5">
                {dayAppts.length === 0 && <span className="px-1 text-xs text-muted2">—</span>}
                {dayAppts.map((a) => {
                  const time = String(a.start).slice(11, 16);
                  const st: Status = a.status ?? 'scheduled';
                  return (
                    <button key={a.id} onClick={() => openEdit(a)}
                      className={`rounded-tool border-l-[3px] px-2 py-1.5 text-left transition hover:bg-surface2
                        ${st === 'cancelled' ? 'border-stop bg-stop/5 opacity-70' : st === 'done' ? 'border-go bg-go/5' : 'border-brand bg-brandweak'}`}>
                      <div className="num text-xs font-bold text-ink">{time} · {a.durationMin ?? 60}m</div>
                      <div className="truncate text-xs font-semibold text-ink">{a.customerId ? custName(a.customerId) : (a.title || 'Termin')}</div>
                      {a.title && a.customerId && <div className="truncate text-[0.7rem] text-muted">{a.title}</div>}
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted2">Termini so povezani s strankami in vozili ter shranjeni v skupni bazi.</p>
    </div>
  );
}
