'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api, type WorkOrderListItem } from '@/lib/api';
import { getSession } from '@/lib/session';
import { anyActiveClock } from '@/lib/clock';
import { displayPlate, formatClock, statusLabel, statusTone } from '@/lib/format';
import { useNow } from '@/lib/hooks';
import { Card, SoftChip, Spinner, Button } from '@/components/ui';

/*
 * "My work orders." Shows only this mechanic's actionable jobs today, the most
 * likely next one first, with the top card exposing Start work directly so the
 * morning's first action is two taps. No search, no filter, no money.
 */

// Statuses a mechanic can act on. Finished/cancelled jobs never appear.
const ACTIVE = ['open', 'in_progress', 'awaiting_parts', 'on_hold', 'awaiting_approval'];

export default function MechanicJobList() {
  const session = getSession();
  const mechanicId = session?.user.mechanicId;

  const { data, error, isLoading } = useSWR(
    mechanicId ? ['mech-jobs', mechanicId] : null,
    () => api.workOrders.list({ statuses: ACTIVE, clockedMechanicId: mechanicId, limit: 100 }),
    { refreshInterval: 20000 },
  );

  // Safety net: a clock left running from a previous session.
  const [stale, setStale] = useState<{ workOrderId: string; startedAt: string } | null>(null);
  useEffect(() => { setStale(anyActiveClock()); }, []);

  if (!mechanicId) {
    return <NeedSession />;
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="px-1 pt-1 font-display text-3xl font-extrabold tracking-tight">Moji nalogi</h1>

      {stale && !data?.some((w) => w.id === stale.workOrderId) && (
        <Link href={`/mechanic/job/${stale.workOrderId}`}>
          <Card className="border-hold/40 bg-hold/10 p-4">
            <p className="font-semibold text-hold">Še vedno tečeš uro na nalogu — dotakni se za ustavitev.</p>
          </Card>
        </Link>
      )}

      {isLoading && <div className="flex justify-center py-10"><Spinner className="text-info" /></div>}
      {error && <Card className="border-stop/40 bg-stop/10 p-4 text-stop">Nalogov ni bilo mogoče naložiti. Povleci za ponoven poskus.</Card>}

      {data && data.length === 0 && (
        <Card className="p-6 text-center text-steel">Trenutno nimaš dodeljenih nalogov.</Card>
      )}

      <div className="stagger flex flex-col gap-3">
        {data?.map((wo, i) => <JobCard key={wo.id} wo={wo} primary={i === 0 && wo.status !== 'awaiting_parts'} />)}
      </div>
    </div>
  );
}

function JobCard({ wo, primary }: { wo: WorkOrderListItem; primary: boolean }) {
  const running = wo.clockedForMe;

  return (
    <Link href={`/mechanic/job/${wo.id}`}>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="num text-xs font-semibold text-muted2">{wo.number ?? 'osnutek'}</div>
            <div className="truncate text-xl font-extrabold tracking-tight text-ink">
              {wo.makeModel ?? (wo.plate ? displayPlate(wo.plate) : '—')}
            </div>
            {wo.plate && <div className="num text-sm text-muted">{displayPlate(wo.plate)}</div>}
            {wo.complaint && <div className="mt-1 line-clamp-2 text-sm text-steel">{wo.complaint}</div>}
          </div>
          <SoftChip tone={running ? 'go' : statusTone(wo.status)}>{running ? 'V delu' : statusLabel(wo.status)}</SoftChip>
        </div>

        {running && <RunningRow workOrderId={wo.id} />}
        {primary && !running && (
          <div className="mt-3"><Button tone="go" size="lg" full><span className="inline-flex items-center gap-2"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Začni delo</span></Button></div>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm font-bold text-brand">
          <span>ODPRI NALOG</span>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </Card>
    </Link>
  );
}

function RunningRow({ workOrderId }: { workOrderId: string }) {
  const now = useNow();
  const startedAt = anyActiveClock()?.workOrderId === workOrderId ? anyActiveClock()!.startedAt : null;
  const elapsed = startedAt ? Math.floor((now - Date.parse(startedAt)) / 1000) : 0;
  return (
    <div className="mt-3 flex items-center justify-between rounded-tool bg-go/10 px-4 py-3">
      <span className="font-mono text-2xl font-bold text-go">{startedAt ? formatClock(elapsed) : '—'}</span>
      <span className="font-display font-bold text-go">dotakni se za ustavitev</span>
    </div>
  );
}

function NeedSession() {
  return (
    <Card className="p-6 text-center">
      <p className="mb-3 font-semibold text-ink">Ni aktivne seje.</p>
      <Link href="/"><Button tone="info">Prijava</Button></Link>
    </Card>
  );
}
