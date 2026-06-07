'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { portalApi } from '@/lib/portal-api';
import { PortalCard, StatusPill, Progress, Money } from '../../portal-ui';

/*
 * Work-order status tracking — the screen a customer opens when they want to
 * know "is my truck ready yet?". It shows the friendly status and a progress
 * bar, the visible stages of the job, what the workshop found (diagnosis), the
 * line items as plain descriptions with the customer-facing price only (never
 * any internal cost), and — if extra work is waiting on them — a prominent link
 * straight to the approval. The money shown is the gross the customer will be
 * billed; the backend never sends cost or margin to the portal.
 */

// The visible stages we map the internal status onto, in order.
const STAGES = [
  { key: 'open', label: 'Naročeno' },
  { key: 'in_progress', label: 'V delu' },
  { key: 'ready', label: 'Pripravljeno za prevzem' },
  { key: 'invoiced', label: 'Zaračunano' },
];

function stageIndex(status: string): number {
  if (status === 'draft') return -1;
  const i = STAGES.findIndex((s) => s.key === status);
  if (i >= 0) return i;
  if (status === 'closed') return STAGES.length - 1;
  return 0;
}

export default function PortalWorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: wo, isLoading } = useSWR(id ? ['portal-wo', id] : null, () => portalApi.workOrder(id).catch(() => null));
  const { data: pending } = useSWR(id ? ['portal-wo-appr', id] : null, () => portalApi.approvals(true).catch(() => []));

  if (isLoading) return <p className="text-sm text-muted">Nalaganje…</p>;
  if (!wo || !wo.id) return <PortalCard><p className="text-sm text-muted">Naloga ni mogoče najti.</p></PortalCard>;

  // Any pending approval that belongs to THIS work order.
  const woPending = (pending ?? []).filter((a: any) => a.workOrderId === wo.id);
  const current = stageIndex(wo.status);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/portal/work-orders" className="text-sm font-semibold text-brand">‹ Vsi nalogi</Link>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-extrabold">{wo.makeModel ?? 'Vozilo'}</h1>
          <StatusPill status={wo.status} label={wo.statusLabel} />
        </div>
        {wo.plate && <p className="num text-muted">{wo.plate}</p>}
        {wo.number && <p className="text-sm text-muted">Nalog {wo.number}</p>}
      </div>

      {/* If extra work needs approval, surface it before anything else. */}
      {woPending.length > 0 && (
        <Link href="/portal/approvals">
          <div className="rounded-2xl border-2 border-hold bg-hold/10 p-4">
            <p className="font-bold text-hold">Potrebna je vaša odobritev</p>
            <p className="mt-1 text-sm">Delavnica je našla dodatno delo na vozilu. Tapnite za pregled in odobritev.</p>
          </div>
        </Link>
      )}

      {/* Progress + stage list. */}
      <PortalCard>
        <Progress value={wo.progress} />
        <ol className="mt-4 flex flex-col gap-3">
          {STAGES.map((s, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li key={s.key} className="flex items-center gap-3">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  done ? 'bg-go text-white' : active ? 'bg-brand text-white' : 'bg-surface2 text-muted'}`}>
                  {done ? '✓' : i + 1}
                </span>
                <span className={`text-sm ${active ? 'font-bold text-ink' : done ? 'text-muted' : 'text-muted/60'}`}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      </PortalCard>

      {/* What was reported and found. */}
      <PortalCard>
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted">Prijavljeno</h2>
        <p className="text-sm">{wo.complaint || '—'}</p>
        {wo.diagnosis && (
          <>
            <h2 className="mb-1 mt-3 text-sm font-bold uppercase tracking-wide text-muted">Ugotovitve delavnice</h2>
            <p className="text-sm">{wo.diagnosis}</p>
          </>
        )}
      </PortalCard>

      {/* Line items: plain descriptions + customer-facing price only. */}
      {(wo.lines ?? []).length > 0 && (
        <PortalCard>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Delo &amp; deli</h2>
          <div className="flex flex-col divide-y divide-line">
            {wo.lines.map((l: any) => (
              <div key={l.lineNo} className="flex items-center justify-between gap-3 py-2">
                <span className="flex items-center gap-2 text-sm">
                  {l.done && <span className="text-go">✓</span>}
                  {l.description}
                  {Number(l.quantity) !== 1 && <span className="text-muted">× {l.quantity}</span>}
                </span>
                <span className="shrink-0 text-sm font-semibold"><Money minor={l.grossMinor} currency={wo.currency} /></span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="font-bold">Skupaj (z DDV)</span>
            <span className="font-bold"><Money minor={wo.totalGrossMinor} currency={wo.currency} /></span>
          </div>
        </PortalCard>
      )}
    </div>
  );
}
