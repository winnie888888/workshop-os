'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { getSession } from '@/lib/session';
import { Button, Card, Spinner, ProblemBanner } from '@/components/ui';

/*
 * The employee attendance home. Its single most important element is the big
 * clock control, whose label and colour reflect the current state so the right
 * action is unmistakable at a glance:
 *
 *   clocked out  -> green "Clock in"
 *   clocked in   -> red "Clock out", with a break toggle
 *   on break     -> amber "End break"
 *
 * Below it sit the secondary, spec-mandated actions: assigned vehicle, my travel
 * orders (start/finish from mobile), and my leave. Everything reads from the
 * server's computed day view, so the hours shown are the same figures the shared
 * core produced — the UI never recomputes time itself.
 */

function fmtHm(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export default function EmployeeAttendancePage() {
  const session = typeof window !== 'undefined' ? getSession() : null;
  const userId = session?.user.id ?? '';

  const [day, setDay] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const cur = await api.attendance.current();
      setDay(cur);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prisotnosti ni bilo mogoče naložiti');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function act(fn: () => Promise<any>) {
    setBusy(true); setError(null);
    try { setDay(await fn()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Dejanje ni uspelo'); }
    finally { setBusy(false); }
  }

  const onBreak = !!day && Array.isArray(day.breaks) && day.breaks.some((b: any) => !b.endAt);
  const clockedIn = !!day && day.open;

  return (
    <div className="flex flex-col gap-4">
      {error && <ProblemBanner message={error} />}

      {loading ? (
        <Card className="flex justify-center p-10"><Spinner /></Card>
      ) : (
        <>
          {/* The big clock control */}
          <ClockControl
            clockedIn={clockedIn} onBreak={onBreak} busy={busy} day={day}
            onClockIn={() => act(() => api.attendance.clockIn())}
            onClockOut={() => act(() => api.attendance.clockOut())}
            onStartBreak={() => act(() => api.attendance.startBreak())}
            onEndBreak={() => act(() => api.attendance.endBreak())}
          />

          {/* Day flags (e.g. break-too-short, long day) surfaced gently */}
          {clockedIn && day?.flags?.length > 0 && (
            <div className="rounded-tool bg-hold/10 p-2 text-xs font-semibold text-hold">
              {day.flags.map((f: string) => labelFlag(f)).join(' · ')}
            </div>
          )}

          <MyVehicle />
          <MyTravelOrders userId={userId} onError={setError} />
          <MyLeave />
        </>
      )}
    </div>
  );
}

function ClockControl({ clockedIn, onBreak, busy, day, onClockIn, onClockOut, onStartBreak, onEndBreak }: {
  clockedIn: boolean; onBreak: boolean; busy: boolean; day: any;
  onClockIn: () => void; onClockOut: () => void; onStartBreak: () => void; onEndBreak: () => void;
}) {
  return (
    <Card className="flex flex-col items-center gap-4 p-6">
      {clockedIn ? (
        <>
          <div className="text-center">
            <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Prijavljen</div>
            <div className="font-display text-3xl font-extrabold tabular-nums">{fmtHm(day?.netWorkedSeconds ?? 0)}</div>
            <div className="text-xs text-steel">neto delo · {fmtHm(day?.breakSeconds ?? 0)} odmor</div>
          </div>
          {onBreak ? (
            <button onClick={onEndBreak} disabled={busy}
              className="tool-tap flex h-20 w-full items-center justify-center rounded-tool bg-hold font-display text-2xl font-extrabold text-white disabled:opacity-50">
              {busy ? <Spinner className="text-white" /> : 'Konec odmora'}
            </button>
          ) : (
            <>
              <button onClick={onClockOut} disabled={busy}
                className="tool-tap flex h-20 w-full items-center justify-center rounded-tool bg-stop font-display text-2xl font-extrabold text-white disabled:opacity-50">
                {busy ? <Spinner className="text-white" /> : 'Odjava'}
              </button>
              <Button tone="neutral" onClick={onStartBreak} disabled={busy} className="w-full">Začni odmor</Button>
            </>
          )}
        </>
      ) : (
        <>
          <div className="text-center">
            <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Niste prijavljeni</div>
            <div className="font-display text-xl font-bold text-steel">Tapnite za začetek dneva</div>
          </div>
          <button onClick={onClockIn} disabled={busy}
            className="tool-tap flex h-24 w-full items-center justify-center rounded-tool bg-go font-display text-3xl font-extrabold text-white disabled:opacity-50">
            {busy ? <Spinner className="text-white" /> : 'Prijava'}
          </button>
        </>
      )}
    </Card>
  );
}

function MyVehicle() {
  const [v, setV] = useState<any | null | undefined>(undefined);
  useEffect(() => { api.attendance.myVehicle().then(setV).catch(() => setV(null)); }, []);
  if (v === undefined) return null;
  if (!v) return null;
  return (
    <Card className="flex items-center justify-between p-4">
      <div>
        <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Moje servisno vozilo</div>
        <div className="font-mono text-lg font-bold">{v.registrationNumber}</div>
        <div className="text-sm text-steel">{[v.make, v.model].filter(Boolean).join(' ')} · {v.currentMileageKm} km</div>
      </div>
      <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-brandweak text-brand">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h11v8H3zM14 9h4l3 3v3h-7z"/><circle cx="7" cy="17" r="1.6"/><circle cx="17.5" cy="17" r="1.6"/></svg>
      </span>
    </Card>
  );
}

function MyTravelOrders({ userId, onError }: { userId: string; onError: (m: string) => void }) {
  const [orders, setOrders] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { api.attendance.myTravelOrders().then(setOrders).catch(() => setOrders([])); }, []);
  useEffect(() => { load(); }, [load]);

  async function start(id: string) {
    setBusy(true);
    try { await api.attendance.startTravelOrder(id); load(); }
    catch (e) { onError(e instanceof Error ? e.message : 'Začetka ni bilo mogoče'); }
    finally { setBusy(false); }
  }
  async function finish(id: string) {
    setBusy(true);
    try {
      // A minimal finish; a fuller screen would collect km/expenses. Here we
      // record the trip as completed so it is ready for accounting export.
      await api.attendance.finishTravelOrder(id, { travelSeconds: 0, workSeconds: 0, waitingSeconds: 0, km: 0 });
      load();
    } catch (e) { onError(e instanceof Error ? e.message : 'Zaključka ni bilo mogoče'); }
    finally { setBusy(false); }
  }

  if (!orders) return null;
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Moji potni nalogi</div>
      {orders.length === 0 && <div className="text-sm text-steel">Ni potnih nalogov.</div>}
      {orders.slice(0, 5).map((t) => (
        <div key={t.id} className="flex items-center justify-between rounded-tool border border-line bg-surface px-3 py-2">
          <div className="min-w-0">
            <div className="font-mono text-sm font-bold">{t.number ?? 'osnutek'}</div>
            <div className="truncate text-xs text-steel">{labelPurpose(t.purpose)}{t.destination ? ` · ${t.destination}` : ''}</div>
          </div>
          {t.status === 'draft' && <Button tone="go" onClick={() => start(t.id)} disabled={busy}>Začni</Button>}
          {t.status === 'in_progress' && <Button tone="info" onClick={() => finish(t.id)} disabled={busy}>Zaključi</Button>}
          {(t.status === 'completed' || t.status === 'exported') && <span className="text-xs font-semibold text-go">končano</span>}
        </div>
      ))}
    </Card>
  );
}

function MyLeave() {
  const [leave, setLeave] = useState<any[] | null>(null);
  useEffect(() => { api.attendance.myLeave().then(setLeave).catch(() => setLeave([])); }, []);
  if (!leave) return null;
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Moja odsotnost</div>
      {leave.length === 0 && <div className="text-sm text-steel">Ni zabeležene odsotnosti.</div>}
      {leave.slice(0, 5).map((l) => (
        <div key={l.id} className="flex items-center justify-between text-sm">
          <span>{labelLeave(l.leaveType)} · {l.startDate}→{l.endDate}</span>
          <span className={`font-semibold ${l.status === 'approved' ? 'text-go' : l.status === 'rejected' ? 'text-stop' : 'text-hold'}`}>{leaveStatus(l.status)}</span>
        </div>
      ))}
    </Card>
  );
}

/* ---- small label helpers (display only) ---- */
function labelFlag(f: string): string {
  const m: Record<string, string> = {
    break_too_short: 'Odmor pod 30 min na 6h+ dan', long_day: 'Dolg dan (10h+)',
    missing_clock_out: 'Še vedno prijavljen', overlapping_break: 'Prekrivajoči odmori',
    break_outside_shift: 'Odmor izven izmene', negative_duration: 'Preveri čase',
  };
  return m[f] ?? f;
}
function labelPurpose(p: string): string {
  const m: Record<string, string> = {
    field_repair: 'Terensko popravilo', field_repair_abroad: 'Terensko popravilo (tujina)',
    road_assistance: 'Pomoč na cesti', towing: 'Vleka', parts_pickup: 'Prevzem delov', customer_visit: 'Obisk stranke',
  };
  return m[p] ?? p;
}
function labelLeave(t: string): string {
  const m: Record<string, string> = {
    vacation: 'Dopust', sick_leave: 'Bolniška', personal_leave: 'Osebni dopust',
    business_leave: 'Službena odsotnost', public_holiday: 'Praznik', planned_absence: 'Načrtovana odsotnost',
  };
  return m[t] ?? t;
}
function leaveStatus(s: string): string {
  return s === 'approved' ? 'odobreno' : s === 'rejected' ? 'zavrnjeno' : s === 'pending' ? 'v obravnavi' : s;
}
