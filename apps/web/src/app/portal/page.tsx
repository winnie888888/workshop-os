'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { portalApi, getPortalSession } from '@/lib/portal-api';
import { PortalCard, StatusPill, Progress, Money } from './portal-ui';

/*
 * Portal home. The first thing a customer should see on a phone is (1) who they
 * are, (2) anything that needs their action right now — a pending approval is
 * the single most time-sensitive thing in the whole portal, so it gets a loud
 * banner at the very top — and (3) their vehicles and current jobs. Everything
 * else lives one tap away in the bottom nav.
 */
export default function PortalHome() {
  const session = getPortalSession();
  const { data: me } = useSWR('portal-me', () => portalApi.me().catch(() => null));
  const { data: vehicles } = useSWR('portal-vehicles', () => portalApi.vehicles().catch(() => []));
  const { data: openJobs } = useSWR('portal-open', () => portalApi.workOrders(true).catch(() => []));
  const { data: pending } = useSWR('portal-pending', () => portalApi.approvals(true).catch(() => []));

  const name = me?.name ?? session?.customerName ?? 'there';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Hello, {name}</h1>
        <p className="text-sm text-steel">Here is what is happening with your vehicles.</p>
      </div>

      {/* Pending approvals — the most urgent thing, so it is first and loud. */}
      {(pending ?? []).length > 0 && (
        <Link href="/portal/approvals">
          <div className="rounded-2xl border-2 border-hold bg-hold/10 p-4">
            <p className="font-bold text-hold">Action needed</p>
            <p className="mt-1 text-sm text-ink">
              You have {pending!.length} item{pending!.length > 1 ? 's' : ''} waiting for your approval. Tap to review and approve.
            </p>
          </div>
        </Link>
      )}

      {/* Current jobs in progress. */}
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-steel">In the workshop now</h2>
        {(openJobs ?? []).length === 0 ? (
          <PortalCard><p className="text-sm text-steel">No vehicles in the workshop right now.</p></PortalCard>
        ) : (
          <div className="flex flex-col gap-3">
            {openJobs!.map((w: any) => (
              <Link key={w.id} href={`/portal/work-orders/${w.id}`}>
                <PortalCard>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-bold">{w.makeModel ?? 'Vehicle'} {w.plate && <span className="font-mono text-sm text-steel">· {w.plate}</span>}</span>
                    <StatusPill status={w.status} label={w.statusLabel} />
                  </div>
                  <p className="mb-2 line-clamp-1 text-sm text-steel">{w.complaint}</p>
                  <Progress value={w.progress} />
                </PortalCard>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Vehicles. */}
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-steel">My vehicles</h2>
        {(vehicles ?? []).length === 0 ? (
          <PortalCard><p className="text-sm text-steel">No vehicles on file yet.</p></PortalCard>
        ) : (
          <div className="flex flex-col gap-3">
            {vehicles!.map((v: any) => (
              <PortalCard key={v.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{[v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}</p>
                    <p className="font-mono text-sm text-steel">{v.plate} · {v.plateCountry}</p>
                  </div>
                  <span className="rounded-full bg-floor px-3 py-1 text-xs font-semibold capitalize text-steel">{v.type}</span>
                </div>
              </PortalCard>
            ))}
          </div>
        )}
      </section>

      <div className="flex gap-3">
        <Link href="/portal/invoices" className="flex-1 rounded-xl bg-floor py-3 text-center text-sm font-semibold text-ink border border-line">Invoices</Link>
        <Link href="/portal/appointments" className="flex-1 rounded-xl bg-info py-3 text-center text-sm font-semibold text-white">Book a service</Link>
      </div>
    </div>
  );
}
