'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useState } from 'react';
import { portalApi } from '@/lib/portal-api';
import { PortalCard, StatusPill, Progress, Money } from '../portal-ui';

/*
 * The "Jobs" tab. By default it shows the vehicles currently in the workshop
 * (open jobs), with a toggle to show all jobs including completed ones, so the
 * same screen serves both "what is happening now" and "show me everything".
 * Each card is a tappable summary; tapping opens the status-tracking detail.
 */
export default function PortalWorkOrders() {
  const [openOnly, setOpenOnly] = useState(true);
  const { data: jobs, isLoading } = useSWR(['portal-wo', openOnly], () => portalApi.workOrders(openOnly).catch(() => []));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold">My jobs</h1>
        <div className="flex rounded-lg border border-line bg-panel p-0.5 text-xs font-semibold">
          <button onClick={() => setOpenOnly(true)} className={`rounded-md px-3 py-1.5 ${openOnly ? 'bg-info text-white' : 'text-steel'}`}>Active</button>
          <button onClick={() => setOpenOnly(false)} className={`rounded-md px-3 py-1.5 ${!openOnly ? 'bg-info text-white' : 'text-steel'}`}>All</button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-steel">Loading…</p>
      ) : (jobs ?? []).length === 0 ? (
        <PortalCard><p className="text-sm text-steel">{openOnly ? 'No vehicles in the workshop right now.' : 'No jobs on file yet.'}</p></PortalCard>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs!.map((w: any) => (
            <Link key={w.id} href={`/portal/work-orders/${w.id}`}>
              <PortalCard>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{w.makeModel ?? 'Vehicle'}</p>
                    {w.plate && <p className="font-mono text-sm text-steel">{w.plate}</p>}
                  </div>
                  <StatusPill status={w.status} label={w.statusLabel} />
                </div>
                <p className="mb-3 line-clamp-2 text-sm text-steel">{w.complaint}</p>
                <Progress value={w.progress} />
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-steel">{w.number ? `Order ${w.number}` : 'Draft'}</span>
                  <span className="font-semibold"><Money minor={w.totalGrossMinor} currency={w.currency} /></span>
                </div>
              </PortalCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
