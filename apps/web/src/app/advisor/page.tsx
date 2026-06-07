'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { api, type WorkOrderListItem } from '@/lib/api';
import { displayPlate, statusLabel, statusTone } from '@/lib/format';
import { Card, SoftChip, Spinner } from '@/components/ui';

/*
 * The Today board — the advisor's default landing. It answers "what is the
 * state of every open job and what needs me right now". Jobs are grouped into
 * bay lanes plus an unassigned lane, and an always-visible Attention panel
 * derives the actions the advisor must take (approvals, ready-to-invoice,
 * parts arrived). No money figures on the board itself; it is operational.
 */

const OPEN_STATUSES = ['open', 'in_progress', 'awaiting_approval', 'awaiting_parts', 'on_hold', 'ready'];

export default function TodayBoard() {
  const { data, isLoading } = useSWR(
    'advisor-today',
    () => api.workOrders.list({ statuses: OPEN_STATUSES, limit: 200 }),
    { refreshInterval: 15000 },
  );

  const attention = (data ?? []).filter((w) =>
    w.status === 'awaiting_approval' || w.status === 'ready' || w.status === 'awaiting_parts');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Danes</h1>
        <span className="text-sm text-steel">{new Date().toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>

      {isLoading && <div className="flex justify-center py-16"><Spinner className="text-info" /></div>}

      {data && (
        <>
          <Lanes jobs={data} />
          <AttentionPanel jobs={attention} />
        </>
      )}
    </div>
  );
}

function Lanes({ jobs }: { jobs: WorkOrderListItem[] }) {
  // Group by location into bay lanes, with one lane for unplaced jobs. In a
  // full build the lanes come from the tenant's configured bays; here we group
  // by locationId and present the rest as "Unassigned".
  const byLane = new Map<string, WorkOrderListItem[]>();
  for (const j of jobs) {
    const key = j.locationId ?? 'unassigned';
    (byLane.get(key) ?? byLane.set(key, []).get(key)!).push(j);
  }
  const lanes = [...byLane.entries()];

  return (
    <div className="grid auto-cols-[16rem] grid-flow-col gap-4 overflow-x-auto pb-2">
      {lanes.map(([laneId, laneJobs]) => (
        <section key={laneId} className="flex flex-col gap-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-steel">
            {laneId === 'unassigned' ? 'Nerazporejeno' : `Boks ${laneId.slice(0, 4)}`}
          </h2>
          {laneJobs.map((j) => <BoardCard key={j.id} job={j} />)}
        </section>
      ))}
      {lanes.length === 0 && <Card className="p-6 text-steel">Ni odprtih nalogov.</Card>}
    </div>
  );
}

function BoardCard({ job }: { job: WorkOrderListItem }) {
  return (
    <Link href={`/advisor/work-orders/${job.id}`}>
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-steel">{job.number ?? 'draft'}</span>
          <SoftChip tone={job.clockedForMe || job.hasOpenClock ? 'go' : statusTone(job.status)}>
            {job.hasOpenClock ? 'V delu' : statusLabel(job.status)}
          </SoftChip>
        </div>
        <div className="mt-1 font-mono text-lg font-bold">{job.plate ? displayPlate(job.plate) : '—'}</div>
        <div className="truncate text-sm text-steel">{job.customerName ?? ''}</div>
      </Card>
    </Link>
  );
}

function AttentionPanel({ jobs }: { jobs: WorkOrderListItem[] }) {
  if (jobs.length === 0) {
    return <Card className="p-4 text-steel">Nič ne potrebuje tvoje pozornosti.</Card>;
  }
  return (
    <Card className="p-4">
      <h2 className="mb-3 font-display text-lg font-bold">Potrebuje pozornost ({jobs.length})</h2>
      <ul className="flex flex-col gap-2">
        {jobs.map((j) => (
          <li key={j.id}>
            <Link href={`/advisor/work-orders/${j.id}`}
              className="flex items-center justify-between rounded-tool border border-line px-3 py-2 hover:bg-floor">
              <span className="flex items-center gap-3">
                <SoftChip tone={statusTone(j.status)}>{statusLabel(j.status)}</SoftChip>
                <span className="font-mono font-bold">{j.plate ? displayPlate(j.plate) : j.number}</span>
                <span className="text-sm text-steel">{j.customerName}</span>
              </span>
              <span className="text-sm font-semibold text-info">
                {j.status === 'awaiting_approval' ? 'pošlji v odobritev →'
                  : j.status === 'ready' ? 'račun →'
                  : 'preveri dele →'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
