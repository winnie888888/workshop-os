'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { getSession } from '@/lib/session';
import { displayPlate, statusLabel, statusTone } from '@/lib/format';
import { Card, SoftChip, Spinner, Button } from '@/components/ui';

/*
 * "Zgodovina" — the mechanic's recently finished work, read-only. Mirrors the
 * job list but filters to completed statuses, so the bottom-nav History tab has
 * a real destination (tapping a row reopens that job in read-only form).
 */
const DONE = ['ready', 'invoiced', 'closed'];

export default function MechanicHistory() {
  const session = getSession();
  const mechanicId = session?.user.mechanicId;

  const { data, isLoading } = useSWR(
    mechanicId ? ['mech-history', mechanicId] : null,
    () => api.workOrders.list({ statuses: DONE, clockedMechanicId: mechanicId, limit: 100 }),
  );

  if (!mechanicId) {
    return (
      <Card className="p-6 text-center">
        <p className="mb-3 font-semibold text-ink">Ni aktivne seje.</p>
        <Link href="/"><Button tone="info">Prijava</Button></Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="px-1 pt-1 text-3xl font-extrabold tracking-tight">Zgodovina</h1>

      {isLoading && <div className="flex justify-center py-10"><Spinner className="text-info" /></div>}
      {data && data.length === 0 && (
        <Card className="p-6 text-center text-steel">Še ni zaključenih nalogov.</Card>
      )}

      <div className="stagger flex flex-col gap-3">
        {data?.map((wo) => (
          <Link key={wo.id} href={`/mechanic/job/${wo.id}`}>
            <Card className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="num text-xs font-semibold text-muted2">{wo.number ?? '—'}</div>
                <div className="truncate text-lg font-bold text-ink">
                  {wo.makeModel ?? (wo.plate ? displayPlate(wo.plate) : '—')}
                </div>
                {wo.plate && <div className="num text-sm text-muted">{displayPlate(wo.plate)}</div>}
              </div>
              <SoftChip tone={statusTone(wo.status)}>{statusLabel(wo.status)}</SoftChip>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
