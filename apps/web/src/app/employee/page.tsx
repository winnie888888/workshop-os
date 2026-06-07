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
      setError(e instanceof Error ? e.message : 'Could not load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function act(fn: () => Promise<any>) {
    setBusy(true); setError(null);
    try { setDay(await fn()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); }
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
            <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Clocked in</div>
            <div className="font-display text-3xl font-extrabold tabular-nums">{fmtHm(day?.netWorkedSeconds ?? 0)}</div>
            <div className="text-xs text-steel">net worked · {fmtHm(day?.breakSeconds ?? 0)} on break</div>
          </div>
          {onBreak ? (
            <button onClick={onEndBreak} disabled={busy}
              className="tool-tap flex h-20 w-full items-center justify-center rounded-tool bg-hold font-display text-2xl font-extrabold text-white disabled:opacity-50">
              {busy ? <Spinner className="text-white" /> : 'End break'}
            </button>
          ) : (
            <>
              <button onClick={onClockOut} disabled={busy}
                className="tool-tap flex h-20 w-full items-center justify-center rounded-tool bg-stop font-display text-2xl font-extrabold text-white disabled:opacity-50">
                {busy ? <Spinner className="text-white" /> : 'Clock out'}
              </button>
              <Button tone="neutral" onClick={onStartBreak} disabled={busy} className="w-full">Start break</Button>
            </>
          )}
        </>
      ) : (
        <>
          <div className="text-center">
            <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">Not clocked in</div>
            <div className="font-display text-xl font-bold text-steel">Tap to start your day</div>
          </div>
          <button onClick={onClockIn} disabled={busy}
            className="tool-tap flex h-24 w-full items-center justify-center rounded-tool bg-go font-display text-3xl font-extrabold text-white disabled:opacity-50">
            {busy ? <Spinner className="text-white" /> : 'Clock in'}
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
        <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">My service vehicle</div>
        <div className="font-mono text-lg font-bold">{v.registrationNumber}</div>
        <div className="text-sm text-steel">{[v.make, v.model].filter(Boolean).join(' ')} · {v.currentMileageKm} km</div>
      </div>
      <span className="text-2xl">🚐</span>
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
    catch (e) { onError(e instanceof Error ? e.message : 'Could not start'); }
    finally { setBusy(false); }
  }
  async function finish(id: string) {
    setBusy(true);
    try {
      // A minimal finish; a fuller screen would collect km/expenses. Here we
      // record the trip as completed so it is ready for accounting export.
      await api.attendance.finishTravelOrder(id, { travelSeconds: 0, workSeconds: 0, waitingSeconds: 0, km: 0 });
      load();
    } catch (e) { onError(e instanceof Error ? e.message : 'Could not finish'); }
    finally { setBusy(false); }
  }

  if (!orders) return null;
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">My travel orders</div>
      {orders.length === 0 && <div className="text-sm text-steel">No travel orders.</div>}
      {orders.slice(0, 5).map((t) => (
        <div key={t.id} className="flex items-center justify-between rounded-tool border-2 border-line bg-panel px-3 py-2">
          <div className="min-w-0">
            <div className="font-mono text-sm font-bold">{t.number ?? 'draft'}</div>
            <div className="truncate text-xs text-steel">{labelPurpose(t.purpose)}{t.destination ? ` · ${t.destination}` : ''}</div>
          </div>
          {t.status === 'draft' && <Button tone="go" onClick={() => start(t.id)} disabled={busy}>Start</Button>}
          {t.status === 'in_progress' && <Button tone="info" onClick={() => finish(t.id)} disabled={busy}>Finish</Button>}
          {(t.status === 'completed' || t.status === 'exported') && <span className="text-xs font-semibold text-go">done</span>}
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
      <div className="text-[0.65rem] font-bold uppercase tracking-wide text-steel">My leave</div>
      {leave.length === 0 && <div className="text-sm text-steel">No leave on record.</div>}
      {leave.slice(0, 5).map((l) => (
        <div key={l.id} className="flex items-center justify-between text-sm">
          <span>{labelLeave(l.leaveType)} · {l.startDate}→{l.endDate}</span>
          <span className={`font-semibold ${l.status === 'approved' ? 'text-go' : l.status === 'rejected' ? 'text-stop' : 'text-hold'}`}>{l.status}</span>
        </div>
      ))}
    </Card>
  );
}

/* ---- small label helpers (display only) ---- */
function labelFlag(f: string): string {
  const m: Record<string, string> = {
    break_too_short: 'Break under 30 min on a 6h+ day', long_day: 'Long day (10h+)',
    missing_clock_out: 'Still clocked in', overlapping_break: 'Overlapping breaks',
    break_outside_shift: 'Break outside shift', negative_duration: 'Check times',
  };
  return m[f] ?? f;
}
function labelPurpose(p: string): string {
  const m: Record<string, string> = {
    field_repair: 'Field repair', field_repair_abroad: 'Field repair (abroad)',
    road_assistance: 'Road assistance', towing: 'Towing', parts_pickup: 'Parts pickup', customer_visit: 'Customer visit',
  };
  return m[p] ?? p;
}
function labelLeave(t: string): string {
  const m: Record<string, string> = {
    vacation: 'Vacation', sick_leave: 'Sick leave', personal_leave: 'Personal leave',
    business_leave: 'Business leave', public_holiday: 'Public holiday', planned_absence: 'Planned absence',
  };
  return m[t] ?? t;
}
