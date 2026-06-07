'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button, Card, ProblemBanner } from '@/components/ui';
import { SelectField, TextField, TextAreaField, NumberField } from '@/components/form';
import {
  apptStore, makeAppointment, isoDate, startOfWeek, addDays, WEEKDAY_LABELS,
  type Appointment, type ApptStatus,
} from '@/lib/calendar-store';

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const refresh = useCallback(() => { apptStore.list(200).then(setAppts); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { api.customers.list().then((c) => setCustomers(c as any[])).catch(() => setCustomers([])); }, []);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayIso = isoDate(new Date());

  function openNew(date: string) { setForm(makeAppointment(date)); setSavedNote(null); setError(null); }
  function openEdit(a: Appointment) { setForm({ ...a }); setSavedNote(null); setError(null); }

  async function save() {
    if (!form) return;
    if (!form.customerName.trim() && !form.customerId) { setError('Vnesite stranko.'); return; }
    await apptStore.save(form); setForm(null); refresh(); setSavedNote('Termin shranjen.');
  }
  async function remove() {
    if (!form) return;
    await apptStore.remove(form.id); setForm(null); refresh(); setSavedNote('Termin izbrisan.');
  }
  function setF<K extends keyof Appointment>(k: K, v: Appointment[K]) { setForm((p) => (p ? { ...p, [k]: v } : p)); }

  const customerOptions = [{ value: '', label: 'Brez / ročno' }, ...customers.map((c) => ({ value: c.id, label: c.name ?? c.id }))];
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

      {/* Add / edit form */}
      {form && (
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-base font-bold text-ink">{appts.some((a) => a.id === form.id) ? 'Uredi termin' : 'Nov termin'}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Datum" value={form.date} onChange={(v) => setF('date', v)} type="date" />
            <TextField label="Ura" value={form.time} onChange={(v) => setF('time', v)} type="time" />
            <NumberField label="Trajanje (min)" value={String(form.durationMin)} onChange={(v) => setF('durationMin', parseInt(v || '0', 10) || 0)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Stranka" value={form.customerId ?? ''} onChange={(id) => { const c = customers.find((x) => x.id === id); setForm((p) => (p ? { ...p, customerId: id || undefined, customerName: c?.name ?? p.customerName } : p)); }} options={customerOptions} />
            <TextField label="Vozilo" value={form.vehicle} onChange={(v) => setF('vehicle', v)} placeholder="npr. NM CK-412" />
          </div>
          {!form.customerId && <TextField label="Naziv stranke (ročno)" value={form.customerName} onChange={(v) => setF('customerName', v)} />}
          <TextField label="Storitev" value={form.service} onChange={(v) => setF('service', v)} placeholder="npr. Mali servis, menjava zavor" />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Status" value={form.status} onChange={(v) => setF('status', v as ApptStatus)}
              options={[{ value: 'scheduled', label: 'Načrtovano' }, { value: 'done', label: 'Opravljeno' }, { value: 'cancelled', label: 'Preklicano' }]} />
          </div>
          <TextAreaField label="Opomba" value={form.note} onChange={(v) => setF('note', v)} rows={2} />
          <div className="flex flex-wrap justify-end gap-2">
            {appts.some((a) => a.id === form.id) && <Button tone="stop" onClick={remove}>Izbriši</Button>}
            <Button tone="neutral" onClick={() => setForm(null)}>Prekliči</Button>
            <Button tone="go" onClick={save}>Shrani termin</Button>
          </div>
        </Card>
      )}

      {/* Week grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((d, i) => {
          const di = isoDate(d);
          const dayAppts = appts.filter((a) => a.date === di).sort((a, b) => a.time.localeCompare(b.time));
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
                {dayAppts.map((a) => (
                  <button key={a.id} onClick={() => openEdit(a)}
                    className={`rounded-tool border-l-[3px] px-2 py-1.5 text-left transition hover:bg-surface2
                      ${a.status === 'cancelled' ? 'border-stop bg-stop/5 opacity-70' : a.status === 'done' ? 'border-go bg-go/5' : 'border-brand bg-brandweak'}`}>
                    <div className="num text-xs font-bold text-ink">{a.time} · {a.durationMin}m</div>
                    <div className="truncate text-xs font-semibold text-ink">{a.customerName || 'Stranka'}</div>
                    {(a.service || a.vehicle) && <div className="truncate text-[0.7rem] text-muted">{[a.service, a.vehicle].filter(Boolean).join(' · ')}</div>}
                  </button>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted2">Termini so shranjeni lokalno (pripravljeno za priklop na pravi koledar/API).</p>
    </div>
  );
}
