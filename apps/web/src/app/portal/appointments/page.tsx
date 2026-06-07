'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { portalApi, PortalApiError } from '@/lib/portal-api';
import { PortalCard, StatusPill } from '../portal-ui';

/*
 * Appointment requests. This is a REQUEST, not a confirmed booking: the customer
 * proposes a vehicle, a preferred date, and what they need, and the workshop
 * turns it into a real work order and confirms separately. Keeping it a request
 * (rather than letting customers write to the workshop's calendar) is the safe,
 * honest model — the workshop stays in control of its own schedule. Past
 * requests are listed below with their status so the customer can see what they
 * have already asked for.
 */
export default function PortalAppointments() {
  const { data: vehicles } = useSWR('portal-vehicles', () => portalApi.vehicles().catch(() => []));
  const { data: requests, mutate } = useSWR('portal-appointments', () => portalApi.appointments().catch(() => []));

  const [assetId, setAssetId] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!description.trim()) { setError('Please describe what you need.'); return; }
    setBusy(true); setError(null);
    try {
      await portalApi.requestAppointment({
        assetId: assetId || undefined,
        preferredDate: date || undefined,
        description: description.trim(),
      });
      setSent(true); setDescription(''); setDate(''); setAssetId('');
      await mutate();
    } catch (e) {
      setError(e instanceof PortalApiError ? e.message : 'Could not send your request. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-extrabold">Book a service</h1>

      {sent && (
        <div className="rounded-2xl border-2 border-go bg-go/10 p-4">
          <p className="font-bold text-go">Request sent</p>
          <p className="mt-1 text-sm">The workshop will be in touch to confirm a time. You can see the request below.</p>
        </div>
      )}

      <PortalCard className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-steel">Vehicle</span>
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)}
            className="w-full rounded-xl border border-line bg-panel px-4 py-3 focus:border-info focus:outline-none">
            <option value="">— Select a vehicle (optional) —</option>
            {(vehicles ?? []).map((v: any) => (
              <option key={v.id} value={v.id}>{[v.make, v.model].filter(Boolean).join(' ')} · {v.plate}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-steel">Preferred date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-line bg-panel px-4 py-3 focus:border-info focus:outline-none" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-steel">What do you need?</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            placeholder="e.g. 120,000 km service, brake noise on the front axle…"
            className="w-full rounded-xl border border-line bg-panel px-4 py-3 focus:border-info focus:outline-none" />
        </label>

        {error && <p className="text-sm font-semibold text-stop">{error}</p>}

        <button onClick={submit} disabled={busy}
          className="min-h-[52px] rounded-xl bg-info text-base font-bold text-white active:scale-[0.98] disabled:opacity-50">
          {busy ? 'Sending…' : 'Send request'}
        </button>
      </PortalCard>

      {(requests ?? []).length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-steel">Your requests</h2>
          {requests!.map((r: any) => (
            <PortalCard key={r.id} className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{r.description || 'Service request'}</p>
                <p className="text-xs text-steel">{r.preferred_date ? `Preferred: ${r.preferred_date}` : 'No date given'}</p>
              </div>
              <StatusPill status={r.status === 'scheduled' ? 'ready' : r.status === 'declined' ? 'declined' : 'open'}
                label={r.status === 'scheduled' ? 'Scheduled' : r.status === 'declined' ? 'Declined' : 'Requested'} />
            </PortalCard>
          ))}
        </section>
      )}
    </div>
  );
}
