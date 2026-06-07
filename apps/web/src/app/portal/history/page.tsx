'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { portalApi } from '@/lib/portal-api';
import { PortalCard, Money } from '../portal-ui';

/*
 * History combines two things a customer reaches for after the fact: the SERVICE
 * HISTORY (every completed/invoiced job on their vehicles, newest first) and a
 * DOCUMENT ARCHIVE (their invoices as downloadable PDFs). Keeping them on one
 * screen matches how a customer thinks — "what was done, and where are my
 * papers" — and keeps the bottom nav to five clear tabs.
 */
export default function PortalHistory() {
  const { data: history, isLoading } = useSWR('portal-history', () => portalApi.serviceHistory().catch(() => []));
  const { data: documents } = useSWR('portal-documents', () => portalApi.documents().catch(() => []));

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h1 className="font-display text-2xl font-extrabold">Service history</h1>
        {isLoading ? (
          <p className="text-sm text-steel">Loading…</p>
        ) : (history ?? []).length === 0 ? (
          <PortalCard><p className="text-sm text-steel">No completed jobs yet.</p></PortalCard>
        ) : (
          history!.map((w: any) => (
            <Link key={w.id} href={`/portal/work-orders/${w.id}`}>
              <PortalCard>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold">{w.makeModel ?? 'Vehicle'}{w.plate && <span className="ml-1 font-mono text-sm text-steel">· {w.plate}</span>}</p>
                    <p className="line-clamp-1 text-sm text-steel">{w.complaint}</p>
                    <p className="mt-1 text-xs text-steel">{w.number ? `Order ${w.number}` : ''} · {w.statusLabel}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold"><Money minor={w.totalGrossMinor} currency={w.currency} /></span>
                </div>
              </PortalCard>
            </Link>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-extrabold">Documents</h2>
        {(documents ?? []).length === 0 ? (
          <PortalCard><p className="text-sm text-steel">No documents yet.</p></PortalCard>
        ) : (
          documents!.map((d: any) => {
            // The download path is relative to the API; build the absolute URL
            // via the same helper the invoice screen uses (id is the invoice id).
            const url = portalApi.invoicePdfUrl(d.id);
            return (
              <a key={d.id} href={url} target="_blank" rel="noopener noreferrer">
                <PortalCard className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{d.title}</p>
                    <p className="text-xs text-steel">{d.date ?? ''}</p>
                  </div>
                  <span className="text-sm font-semibold text-info">PDF ›</span>
                </PortalCard>
              </a>
            );
          })
        )}
      </section>
    </div>
  );
}
