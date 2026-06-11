'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api, ApiError, type WorkOrderListItem } from '@/lib/api';
import { displayPlate, formatMoneyMinor, statusLabel, statusTone } from '@/lib/format';
import { Button, Card, ProblemBanner, SoftChip, Spinner, StatusChip } from '@/components/ui';

/*
 * Vozilo — detail (mockup, jun 2026). Ena stran, ki o vozilu pove vse, kar
 * sistem RES ve: identiteta (tablica, znamka/model, VIN, letnik, števec),
 * odprti delovni nalogi vozila, zadnji zaključen nalog in zgodovina iz
 * /assets/:id/history (izrisana defenzivno, ker oblika še ni tipizirana).
 * "Nov nalog" je en klik: nalog se ustvari neposredno za to vozilo in stranko
 * (workOrders.create z assetId) — najmanj možnih dejanj, kot zahteva spec.
 * Servisni intervali ("Olje") in računi po vozilu so zavestno izpuščeni,
 * dokler backend teh podatkov ne vodi.
 */

const OPEN_STATUSES = ['open', 'in_progress', 'awaiting_approval', 'awaiting_parts', 'on_hold', 'ready'];
const DONE_STATUSES = ['invoiced', 'closed'];

const TYPE_LABEL: Record<string, string> = {
  truck: 'Tovornjak', tractor: 'Vlačilec', trailer: 'Priklopnik', van: 'Kombi', other: 'Drugo',
};

/** Tablici odstrani presledke/vezaje za zanesljivo primerjavo. */
function normPlate(p: string | null | undefined): string {
  return (p ?? '').replace(/[\s-]/g, '').toUpperCase();
}

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Isti SWR ključ kot edit stran -> en sam zahtevek, ko skačeš med njima.
  const { data: vehicle } = useSWR(['vehicle', id], () => api.assets.get(id));
  const customerId: string | undefined = vehicle?.customerId ?? vehicle?.customer_id ?? undefined;
  const { data: customer } = useSWR(customerId ? ['customer', customerId] : null,
    () => api.customers.get(customerId!).catch(() => null));
  const { data: customerWos } = useSWR(customerId ? ['vehicle-wos', customerId] : null,
    () => api.workOrders.list({ customerId, limit: 200 }).catch(() => []));
  const { data: history } = useSWR(['vehicle-history', id], () => api.assets.history(id).catch(() => null));

  const plate = normPlate(vehicle?.plate);
  const mine = useMemo(
    () => ((customerWos ?? []) as WorkOrderListItem[]).filter((w) => plate && normPlate(w.plate) === plate),
    [customerWos, plate],
  );
  const openWos = useMemo(() => mine.filter((w) => OPEN_STATUSES.includes(w.status)), [mine]);
  const lastDone = useMemo(() => mine.find((w) => DONE_STATUSES.includes(w.status)) ?? null, [mine]);

  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  async function newWorkOrder() {
    if (!customerId) return;
    setCreating(true); setError(null);
    try {
      const wo = await api.workOrders.create({ customerId, assetId: id, clientId: crypto.randomUUID() });
      router.push(`/advisor/work-orders/${wo.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Naloga ni bilo mogoče ustvariti.');
      setCreating(false);
    }
  }

  if (!vehicle) return <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>;

  const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
  const country = vehicle.countryOfPlate ?? vehicle.country_of_plate ?? null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <button onClick={() => router.back()} className="self-start text-sm font-semibold text-steel hover:text-ink">‹ Nazaj</button>

      {error && <ProblemBanner message={error} />}

      {/* Glava: tablica + znamka/model + čipi + akciji */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="num rounded-tool border-2 border-linestrong bg-surface px-3 py-1 text-2xl font-extrabold tracking-wide text-ink shadow-tool">
              {vehicle.plate ? displayPlate(vehicle.plate) : '—'}
            </span>
            {country && <SoftChip tone="neutral">{country}</SoftChip>}
            <SoftChip tone="info">{TYPE_LABEL[vehicle.type] ?? vehicle.type ?? '—'}</SoftChip>
            {openWos.length > 0 && <StatusChip tone="hold">{openWos.length} {openWos.length === 1 ? 'odprt nalog' : 'odprti nalogi'}</StatusChip>}
          </div>
          <h1 className="mt-2 truncate text-3xl font-extrabold tracking-tight text-ink">{makeModel || 'Vozilo'}</h1>
          {customer && (
            <Link href={`/advisor/customers/${customerId}`} className="mt-0.5 inline-block text-sm font-semibold text-brand hover:underline">
              {customer.name ?? 'Stranka'} →
            </Link>
          )}
        </div>
        <div className="flex flex-none gap-2">
          <Button tone="neutral" onClick={() => router.push(`/advisor/vehicles/${id}/edit`)}>Uredi</Button>
          <Button tone="info" onClick={newWorkOrder} disabled={creating || !customerId}>
            {creating ? <Spinner /> : '+ Nov nalog'}
          </Button>
        </div>
      </div>

      {/* Podatki o vozilu */}
      <Card className="p-5">
        <h2 className="mb-3 text-base font-bold text-ink">Podatki o vozilu</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <Fact label="Tip" value={TYPE_LABEL[vehicle.type] ?? vehicle.type ?? '—'} />
          <Fact label="Letnik" value={vehicle.year ? String(vehicle.year) : '—'} num />
          <Fact label="Števec" value={vehicle.odometerLast ? `${Number(vehicle.odometerLast).toLocaleString('sl-SI')} km` : '—'} num />
          <Fact label="Država tablice" value={country ?? '—'} />
          <div className="col-span-2 sm:col-span-4">
            <Fact label="VIN" value={vehicle.vin ?? '—'} num />
          </div>
        </dl>
      </Card>

      {/* Odprti nalogi vozila */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-bold text-ink">Odprti nalogi</h2>
          <Link href="/advisor/work-orders" className="text-xs font-bold uppercase tracking-wide text-brand hover:underline">Vsi nalogi</Link>
        </div>
        {!customerWos ? <div className="p-6"><Spinner className="text-brand" /></div> : openWos.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">Vozilo trenutno nima odprtih nalogov.</p>
        ) : (
          <ul className="divide-y divide-line">
            {openWos.map((w) => (
              <li key={w.id}>
                <Link href={`/advisor/work-orders/${w.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-floor">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="num font-bold text-ink">{w.number ?? 'osnutek'}</span>
                    <span className="truncate text-sm text-muted">{w.complaint ?? ''}</span>
                  </span>
                  <span className="flex flex-none items-center gap-3">
                    <SoftChip tone={statusTone(w.status)}>{statusLabel(w.status)}</SoftChip>
                    <span className="num text-sm font-semibold text-ink">{formatMoneyMinor(w.totalGrossMinor, w.currency)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Zadnji zaključen nalog */}
      <Card className="p-5">
        <h2 className="mb-3 text-base font-bold text-ink">Zadnji zaključen servis</h2>
        {!customerWos ? <Spinner className="text-brand" /> : !lastDone ? (
          <p className="text-sm text-muted">Za to vozilo še ni zaključenih nalogov.</p>
        ) : (
          <Link href={`/advisor/work-orders/${lastDone.id}`} className="flex items-center justify-between gap-3 rounded-tool border border-line px-4 py-3 transition hover:border-brandring hover:bg-floor">
            <span className="flex min-w-0 items-center gap-3">
              <span className="num font-bold text-ink">{lastDone.number ?? '—'}</span>
              <span className="truncate text-sm text-muted">{lastDone.complaint ?? ''}</span>
            </span>
            <span className="flex flex-none items-center gap-3">
              <SoftChip tone={statusTone(lastDone.status)}>{statusLabel(lastDone.status)}</SoftChip>
              <span className="num text-sm font-semibold text-ink">{formatMoneyMinor(lastDone.totalGrossMinor, lastDone.currency)}</span>
            </span>
          </Link>
        )}
      </Card>

      {/* Zgodovina iz /assets/:id/history — defenzivni izris (oblika še ni tipizirana) */}
      <HistoryCard history={history} />
    </div>
  );
}

function Fact({ label, value, num }: { label: string; value: string; num?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.7rem] font-bold uppercase tracking-wide text-muted2">{label}</dt>
      <dd className={`mt-0.5 truncate font-semibold text-ink ${num ? 'num' : ''}`}>{value}</dd>
    </div>
  );
}

/**
 * Zgodovina vozila. Endpoint obstaja, a njegova oblika v klientu še ni
 * tipizirana — zato izrisujemo samo zapise, ki jih prepoznamo (objekt s
 * number/status/createdAt ipd.); neznano obliko raje skrijemo kot pokvarimo.
 * TODO: tipizirati, ko backend obliko potrdi.
 */
function HistoryCard({ history }: { history: unknown }) {
  const rows = useMemo(() => {
    const arr = Array.isArray(history) ? history : Array.isArray((history as any)?.items) ? (history as any).items : null;
    if (!arr) return null;
    return (arr as any[]).filter((r) => r && typeof r === 'object' && ('number' in r || 'status' in r || 'createdAt' in r)).slice(0, 12);
  }, [history]);
  if (!rows || rows.length === 0) return null;
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-5 py-3">
        <h2 className="text-base font-bold text-ink">Zgodovina</h2>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r: any, i: number) => (
          <li key={r.id ?? i} className="flex items-center justify-between gap-3 px-5 py-3">
            <span className="flex min-w-0 items-center gap-3">
              <span className="num font-bold text-ink">{r.number ?? r.workOrderNumber ?? '—'}</span>
              {r.createdAt && <span className="num text-xs text-muted2">{new Date(r.createdAt).toLocaleDateString('sl-SI')}</span>}
              {(r.complaint || r.description) && <span className="truncate text-sm text-muted">{r.complaint ?? r.description}</span>}
            </span>
            {r.status && <SoftChip tone={statusTone(String(r.status))}>{statusLabel(String(r.status))}</SoftChip>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
