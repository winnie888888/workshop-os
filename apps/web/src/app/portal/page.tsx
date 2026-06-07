'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { portalApi, getPortalSession } from '@/lib/portal-api';
import { PortalCard, StatusPill, Progress } from './portal-ui';

/*
 * Portal home. What the customer should see first: who they are, anything that
 * needs action now (a pending approval is the most time-sensitive thing, so it
 * gets a loud banner), and their vehicles + current jobs. On desktop the cards
 * sit in a two-column grid; on a phone they stack.
 */
export default function PortalHome() {
  const session = getPortalSession();
  const { data: me } = useSWR('portal-me', () => portalApi.me().catch(() => null));
  const { data: vehicles } = useSWR('portal-vehicles', () => portalApi.vehicles().catch(() => []));
  const { data: openJobs } = useSWR('portal-open', () => portalApi.workOrders(true).catch(() => []));
  const { data: pending } = useSWR('portal-pending', () => portalApi.approvals(true).catch(() => []));

  const name = me?.name ?? session?.customerName ?? 'stranka';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">Pozdravljeni, {name}</h1>
          <p className="text-sm text-muted">Pregled vaših vozil in nalogov v delavnici.</p>
        </div>
        <Link href="/portal/appointments"
          className="inline-flex min-h-tap items-center gap-2 rounded-tool bg-brand px-5 font-bold text-white shadow-tool transition hover:bg-brand600 active:translate-y-px">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          Najava servisa
        </Link>
      </div>

      {(pending ?? []).length > 0 && (
        <Link href="/portal/approvals">
          <div className="flex items-start gap-3 rounded-card border border-safety bg-safety/15 p-4 transition hover:bg-safety/20">
            <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full bg-safety text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
            </span>
            <span>
              <span className="block font-bold text-hold">Potrebno je vaše ukrepanje</span>
              <span className="mt-0.5 block text-sm text-ink">
                Čaka {pending!.length} {pending!.length === 1 ? 'postavka' : 'postavk'} za odobritev. Tapnite za pregled.
              </span>
            </span>
          </div>
        </Link>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted2">Trenutno v delavnici</h2>
          {(openJobs ?? []).length === 0 ? (
            <PortalCard><p className="text-sm text-muted">Trenutno ni vozil v delavnici.</p></PortalCard>
          ) : (
            <div className="flex flex-col gap-3">
              {openJobs!.map((w: any) => (
                <Link key={w.id} href={`/portal/work-orders/${w.id}`}>
                  <PortalCard className="transition hover:border-brandring">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-bold text-ink">{w.makeModel ?? 'Vozilo'} {w.plate && <span className="num text-sm text-muted">· {w.plate}</span>}</span>
                      <StatusPill status={w.status} label={w.statusLabel} />
                    </div>
                    <p className="mb-2 line-clamp-1 text-sm text-muted">{w.complaint}</p>
                    <Progress value={w.progress} />
                  </PortalCard>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted2">Moja vozila</h2>
          {(vehicles ?? []).length === 0 ? (
            <PortalCard><p className="text-sm text-muted">Še ni vozil v evidenci.</p></PortalCard>
          ) : (
            <div className="flex flex-col gap-3">
              {vehicles!.map((v: any) => (
                <PortalCard key={v.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3">
                      <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-brandweak text-brand">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17h14M5 17a2 2 0 0 1-2-2V9l2-4h11l3 4v6a2 2 0 0 1-2 2M5 17v2M19 17v2"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/></svg>
                      </span>
                      <span>
                        <span className="block font-bold text-ink">{[v.make, v.model].filter(Boolean).join(' ') || 'Vozilo'}</span>
                        <span className="num block text-sm text-muted">{v.plate} {v.plateCountry && `· ${v.plateCountry}`}</span>
                      </span>
                    </span>
                    <span className="rounded-full bg-floor px-3 py-1 text-xs font-semibold capitalize text-steel">{v.type}</span>
                  </div>
                </PortalCard>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="flex gap-3">
        <Link href="/portal/invoices" className="flex-1 rounded-tool border border-line bg-surface py-3 text-center font-semibold text-ink transition hover:border-brandring">Računi</Link>
        <Link href="/portal/history" className="flex-1 rounded-tool border border-line bg-surface py-3 text-center font-semibold text-ink transition hover:border-brandring">Zgodovina servisov</Link>
      </div>
    </div>
  );
}
