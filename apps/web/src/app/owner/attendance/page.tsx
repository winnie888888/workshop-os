'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getSession } from '@/lib/session';
import { Button, Card, Spinner, ProblemBanner } from '@/components/ui';

/*
 * Attendance management (owner/manager). This is the gated side of the module:
 * generate a monthly timesheet, download the accountant CSV export, run the AI
 * consistency check (advisory only — it never edits records), approve pending
 * leave, and manage service vehicles. Each action maps to a permission-gated
 * admin endpoint; the screen simply surfaces them.
 *
 * The consistency panel deliberately frames its result as advisory: it shows the
 * computed gap and a severity, and reminds the manager that AI may flag but never
 * change official records — the contract both specs insist on.
 */

const SEVERITY_TONE: Record<string, string> = {
  ok: 'text-go', info: 'text-info', warn: 'text-hold', alert: 'text-stop',
};

export default function OwnerAttendancePage() {
  const session = typeof window !== 'undefined' ? getSession() : null;
  const defaultUser = session?.user.id ?? '';
  const thisMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 p-4">
      <h1 className="font-display text-2xl font-extrabold">Time & Attendance</h1>
      <TimesheetPanel defaultUser={defaultUser} defaultMonth={thisMonth} />
      <ConsistencyPanel defaultUser={defaultUser} defaultMonth={thisMonth} />
      <PendingLeavePanel />
      <ServiceVehiclesPanel />
    </div>
  );
}

function TimesheetPanel({ defaultUser, defaultMonth }: { defaultUser: string; defaultMonth: string }) {
  const [userId, setUserId] = useState(defaultUser);
  const [month, setMonth] = useState(defaultMonth);
  const [ts, setTs] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true); setError(null);
    try { setTs(await api.attendanceAdmin.timesheet(userId, month)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not generate timesheet'); }
    finally { setBusy(false); }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="font-display text-lg font-bold">Monthly timesheet</div>
      {error && <ProblemBanner message={error} />}
      <div className="flex flex-wrap gap-2">
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="employee id"
          className="min-w-0 flex-1 rounded-tool border-2 border-line px-3 py-2 text-sm" />
        <input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="yyyy-mm"
          className="w-28 rounded-tool border-2 border-line px-3 py-2 text-sm" />
        <Button tone="info" onClick={generate} disabled={busy}>{busy ? <Spinner /> : 'Generate'}</Button>
      </div>

      {ts && (
        <div className="flex flex-col gap-1 rounded-tool bg-floor p-3 text-sm">
          <Row label="Worked hours" value={ts.workedHours} />
          <Row label="Regular" value={ts.regularHours} />
          <Row label="Overtime" value={ts.overtimeHours} />
          <Row label="Total leave" value={ts.totalLeaveHours} />
          <Row label="Paid hours" value={ts.paidHours} />
          <Row label="Days worked / on leave" value={`${ts.daysWorked} / ${ts.daysOnLeave}`} />
          <a href={api.attendanceAdmin.exportUrl(userId, month)}
            className="tool-tap mt-2 inline-flex items-center justify-center rounded-tool bg-go px-4 py-2 font-display font-bold text-white">
            ⬇ Download accountant export (CSV)
          </a>
        </div>
      )}
    </Card>
  );
}

function ConsistencyPanel({ defaultUser, defaultMonth }: { defaultUser: string; defaultMonth: string }) {
  const [userId, setUserId] = useState(defaultUser);
  const [result, setResult] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = `${defaultMonth}-01`;
  const to = `${defaultMonth}-28`;

  async function check() {
    setBusy(true); setError(null);
    try { setResult(await api.attendanceAdmin.consistency(userId, from, to)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not run check'); }
    finally { setBusy(false); }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="font-display text-lg font-bold">AI consistency check</div>
      <p className="text-xs text-steel">Reconciles attendance against work-order, field-service and travel time.
        Advisory only — it flags differences for review and never changes official records.</p>
      {error && <ProblemBanner message={error} />}
      <div className="flex gap-2">
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="employee id"
          className="min-w-0 flex-1 rounded-tool border-2 border-line px-3 py-2 text-sm" />
        <Button tone="info" onClick={check} disabled={busy}>{busy ? <Spinner /> : 'Run check'}</Button>
      </div>
      {result && (
        <div className="rounded-tool bg-floor p-3 text-sm">
          <div className={`font-display text-lg font-bold uppercase ${SEVERITY_TONE[result.severity] ?? 'text-ink'}`}>{result.severity}</div>
          <p className="mt-1">{result.narrative ?? result.summary}</p>
          <div className="mt-2 text-xs text-steel">
            accounted {result.accountedHours}h · unaccounted {result.unaccountedHours}h · overbooked {result.overbookedHours}h
          </div>
          <div className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-steel">Advisory only — no records were changed</div>
        </div>
      )}
    </Card>
  );
}

function PendingLeavePanel() {
  const [pending, setPending] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() { api.attendanceAdmin.pendingLeave().then(setPending).catch(() => setPending([])); }
  useEffect(() => { load(); }, []);

  async function decide(id: string, decision: 'approved' | 'rejected') {
    setBusy(true); setError(null);
    try { await api.attendanceAdmin.decideLeave(id, { decision }); load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not decide'); }
    finally { setBusy(false); }
  }

  if (!pending) return null;
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="font-display text-lg font-bold">Pending leave</div>
      {error && <ProblemBanner message={error} />}
      {pending.length === 0 && <div className="text-sm text-steel">No pending requests.</div>}
      {pending.map((l) => (
        <div key={l.id} className="flex items-center justify-between rounded-tool border-2 border-line px-3 py-2 text-sm">
          <span>{l.leaveType} · {l.startDate}→{l.endDate}</span>
          <span className="flex gap-2">
            <Button tone="go" onClick={() => decide(l.id, 'approved')} disabled={busy}>Approve</Button>
            <Button tone="neutral" onClick={() => decide(l.id, 'rejected')} disabled={busy}>Reject</Button>
          </span>
        </div>
      ))}
    </Card>
  );
}

function ServiceVehiclesPanel() {
  const [vehicles, setVehicles] = useState<any[] | null>(null);
  useEffect(() => { api.attendanceAdmin.listVehicles().then(setVehicles).catch(() => setVehicles([])); }, []);
  if (!vehicles) return null;
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="font-display text-lg font-bold">Service vehicles</div>
      {vehicles.length === 0 && <div className="text-sm text-steel">No service vehicles yet.</div>}
      {vehicles.map((v) => (
        <div key={v.id} className="flex items-center justify-between text-sm">
          <span className="font-mono font-bold">{v.registrationNumber}</span>
          <span className="text-steel">{[v.make, v.model].filter(Boolean).join(' ')} · {v.currentMileageKm} km · {v.status}</span>
        </div>
      ))}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-steel">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
