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
    if (!description.trim()) { setError('Opišite, kaj potrebujete.'); return; }
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
      setError(e instanceof PortalApiError ? e.message : 'Zahteve ni bilo mogoče poslati. Poskusite znova.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">Najava servisa</h1>

      {sent && (
        <div className="rounded-2xl border-2 border-go bg-go/10 p-4">
          <p className="font-bold text-go">Zahteva poslana</p>
          <p className="mt-1 text-sm">Delavnica vas bo kontaktirala za potrditev termina. Zahtevo vidite spodaj.</p>
        </div>
      )}

      <PortalCard className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-muted">Vozilo</span>
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 focus:border-brand focus:outline-none">
            <option value="">— Izberite vozilo (neobvezno) —</option>
            {(vehicles ?? []).map((v: any) => (
              <option key={v.id} value={v.id}>{[v.make, v.model].filter(Boolean).join(' ')} · {v.plate}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-muted">Želeni datum</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 focus:border-brand focus:outline-none" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-muted">Kaj potrebujete?</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            placeholder="npr. servis pri 120.000 km, zvok zavor na sprednji osi…"
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 focus:border-brand focus:outline-none" />
        </label>

        {error && <p className="text-sm font-semibold text-stop">{error}</p>}

        <button onClick={submit} disabled={busy}
          className="min-h-[52px] rounded-xl bg-brand text-base font-bold text-white active:scale-[0.98] disabled:opacity-50">
          {busy ? 'Pošiljanje…' : 'Pošlji zahtevo'}
        </button>
      </PortalCard>

      {(requests ?? []).length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Vaše zahteve</h2>
          {requests!.map((r: any) => (
            <PortalCard key={r.id} className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{r.description || 'Zahteva za servis'}</p>
                <p className="text-xs text-muted">{r.preferred_date ? `Želeni: ${r.preferred_date}` : 'Brez datuma'}</p>
              </div>
              <StatusPill status={r.status === 'scheduled' ? 'ready' : r.status === 'declined' ? 'declined' : 'open'}
                label={r.status === 'scheduled' ? 'Načrtovano' : r.status === 'declined' ? 'Zavrnjeno' : 'Zahtevano'} />
            </PortalCard>
          ))}
        </section>
      )}
    </div>
  );
}
