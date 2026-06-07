'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { portalApi, PortalApiError } from '@/lib/portal-api';
import { PortalCard, Money, StatusPill } from '../portal-ui';

/*
 * Approvals — the additional-work and estimate sign-off workflow. When the
 * workshop discovers extra work (or needs an up-front estimate approved), it
 * raises a request; the customer sees the proposed items and the total here and
 * either approves or declines, optionally with a note. The decision is recorded
 * and audited on the server. This is the screen the SMS "additional work
 * requires approval — open the customer portal to review and approve" links to.
 *
 * We show pending items first and prominently; already-answered items stay
 * visible below for a record of what was decided.
 */
export default function PortalApprovals() {
  const { data: all, isLoading, mutate } = useSWR('portal-approvals-all', () => portalApi.approvals(false).catch(() => []));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');

  async function respond(id: string, decision: 'approved' | 'declined') {
    setBusyId(id); setError(null);
    try {
      await portalApi.respond(id, decision, note.trim() || undefined);
      setNote(''); setNoteFor(null);
      await mutate(); // refresh so the item moves to its decided state
    } catch (e) {
      setError(e instanceof PortalApiError ? e.message : 'Could not record your decision. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  const pending = (all ?? []).filter((a: any) => a.status === 'pending');
  const answered = (all ?? []).filter((a: any) => a.status !== 'pending');

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-extrabold">Approvals</h1>

      {isLoading ? (
        <p className="text-sm text-steel">Loading…</p>
      ) : (all ?? []).length === 0 ? (
        <PortalCard><p className="text-sm text-steel">Nothing needs your approval right now.</p></PortalCard>
      ) : (
        <>
          {error && <p className="rounded-xl bg-stop/10 p-3 text-sm font-semibold text-stop">{error}</p>}

          {pending.map((a: any) => (
            <PortalCard key={a.id} className="border-2 border-hold">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-hold">
                  {a.kind === 'estimate' ? 'Estimate' : 'Additional work'}
                </span>
                <span className="text-xs text-steel">Order {a.workOrderNumber}</span>
              </div>
              <h2 className="mb-3 font-bold">{a.title}</h2>

              {/* The proposed items so the customer sees exactly what they approve. */}
              <div className="mb-3 flex flex-col divide-y divide-line rounded-xl bg-floor p-3">
                {(a.proposedItems ?? []).map((it: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                    <span>{it.description}{Number(it.quantity) !== 1 && <span className="text-steel"> × {it.quantity}</span>}</span>
                    <span className="font-mono">
                      <Money minor={Number(it.unitPriceMinor) * Number(it.quantity)} currency={a.currency} />
                    </span>
                  </div>
                ))}
              </div>

              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-steel">Total (incl. VAT)</span>
                <span className="text-lg font-bold"><Money minor={a.amountGrossMinor} currency={a.currency} /></span>
              </div>

              {noteFor === a.id && (
                <textarea value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note for the workshop (optional)…" rows={2}
                  className="mb-3 w-full rounded-xl border border-line bg-panel p-3 text-sm focus:border-info focus:outline-none" />
              )}

              <div className="flex gap-3">
                <button onClick={() => respond(a.id, 'approved')} disabled={busyId === a.id}
                  className="flex-1 rounded-xl bg-go py-3 font-bold text-white active:scale-[0.98] disabled:opacity-50">
                  {busyId === a.id ? '…' : 'Approve'}
                </button>
                <button
                  onClick={() => { if (noteFor === a.id) respond(a.id, 'declined'); else { setNoteFor(a.id); } }}
                  disabled={busyId === a.id}
                  className="flex-1 rounded-xl border border-stop py-3 font-bold text-stop active:scale-[0.98] disabled:opacity-50">
                  {noteFor === a.id ? 'Confirm decline' : 'Decline'}
                </button>
              </div>
            </PortalCard>
          ))}

          {answered.length > 0 && (
            <section>
              <h2 className="mb-2 mt-2 text-sm font-bold uppercase tracking-wide text-steel">Past decisions</h2>
              <div className="flex flex-col gap-3">
                {answered.map((a: any) => (
                  <PortalCard key={a.id}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{a.title}</p>
                        <p className="text-xs text-steel">Order {a.workOrderNumber}</p>
                      </div>
                      <StatusPill status={a.status} label={a.status === 'approved' ? 'Approved' : a.status === 'declined' ? 'Declined' : a.status} />
                    </div>
                  </PortalCard>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
