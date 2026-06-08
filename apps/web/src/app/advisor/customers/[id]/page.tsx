'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { DEMO_MODE } from '@/lib/demo';
import { displayPlate, formatMoneyMinor, statusLabel, statusTone, estimateStatusLabel, estimateStatusTone, docTotalsMinor } from '@/lib/format';
import { Button, Card, SoftChip, Spinner } from '@/components/ui';
import { downloadJson, dateStamp } from '@/lib/data-export';

/** Gather everything held about a customer for a GDPR access/portability export (Art. 15/20). */
async function gatherCustomerExport(id: string) {
  const [customer, vehicles, workOrders, invoices, estimates, appointments] = await Promise.all([
    api.customers.get(id),
    api.assets.list(id).catch(() => []),
    api.workOrders.list({ customerId: id }).catch(() => []),
    api.invoices.byCustomer(id).catch(() => []),
    api.estimates.list({ customerId: id }).catch(() => []),
    api.appointments.list({ customerId: id }).catch(() => []),
  ]);
  return { exportedAt: new Date().toISOString(), customer, vehicles, workOrders, invoices, estimates, appointments };
}

/*
 * The customer hub — ties the customer to their vehicles, outstanding balance,
 * and the actions that start real work (add a vehicle, open a job).
 */
export default function CustomerHub() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: customer, mutate: refreshCustomer } = useSWR(['customer', id], () => api.customers.get(id));
  const { data: vehicles } = useSWR(['cust-vehicles', id], () => api.assets.list(id).catch(() => []));
  const { data: wos } = useSWR(['cust-wos', id], () => api.workOrders.list({ customerId: id }).catch(() => []));
  const { data: invoices } = useSWR(['cust-invoices', id], () => api.invoices.byCustomer(id).catch(() => []));
  const { data: ar } = useSWR(['cust-ar', id], () => api.customerReceivables(id).catch(() => null));
  const [exporting, setExporting] = useState(false);

  async function exportGdpr() {
    setExporting(true);
    try {
      const data = await gatherCustomerExport(id);
      const safe = (((customer?.name as string) || 'stranka')).replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      downloadJson(`gdpr_${safe}_${dateStamp()}.json`, data);
    } finally {
      setExporting(false);
    }
  }

  if (!customer) return <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>;

  const arTotal = ar ? (ar.formatted?.total || formatMoneyMinor(ar.buckets.total)) : '';
  const ar90 = ar ? (ar.formatted?.d90_plus || formatMoneyMinor(ar.buckets.d90_plus)) : '';

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <button onClick={() => router.push('/advisor/customers')} className="self-start text-sm font-semibold text-muted hover:text-brand">‹ Stranke</button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">{customer.name}</h1>
          <p className="text-sm text-muted">
            {customer.country}{customer.vatId ? ` · ID za DDV ${customer.vatId}` : ''}
            {customer.paymentTermsDays != null ? ` · plačilni rok ${customer.paymentTermsDays} dni` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button tone="neutral" onClick={exportGdpr} disabled={exporting}>{exporting ? 'Izvažam…' : 'Izvozi (GDPR)'}</Button>
          <Link href={`/advisor/customers/${id}/edit`}><Button tone="neutral">Uredi</Button></Link>
          <Link href={`/advisor/work-orders/new?customerId=${id}`}><Button tone="info">+ Nov nalog</Button></Link>
        </div>
      </div>

      {customer.vatLiable && customer.vatId && (
        <VatStatusCard customer={customer} onChanged={() => refreshCustomer()} />
      )}

      {ar && ar.buckets.total !== '0' && (
        <Card className={`p-4 ${ar.buckets.d61_90 !== '0' || ar.buckets.d90_plus !== '0' ? 'border-stop/40 bg-stop/5' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-ink">Odprta terjatev</span>
            <span className="num text-lg font-extrabold text-ink">{arTotal}</span>
          </div>
          {(ar.buckets.d61_90 !== '0' || ar.buckets.d90_plus !== '0') && (
            <p className="mt-1 text-sm font-semibold text-stop">
              {ar90} je zapadlo nad 90 dni — pred novim delom preveri boniteto.
            </p>
          )}
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-base font-bold text-ink">Vozila</h2>
          <Link href={`/advisor/customers/${id}/vehicles/new`}>
            <Button tone="info">+ Dodaj vozilo</Button>
          </Link>
        </div>
        {!vehicles ? (
          <div className="flex justify-center p-6"><Spinner className="text-brand" /></div>
        ) : vehicles.length === 0 ? (
          <p className="p-8 text-center text-muted">Še ni vozil. Dodaj prvo, da zanj odpreš nalog.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
              <tr><th className="p-3 font-bold">Tablica</th><th className="p-3 font-bold">Znamka / model</th><th className="p-3 font-bold">VIN</th>
                <th className="p-3 font-bold">Tip</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {(vehicles as any[]).map((v) => (
                <tr key={v.id} className="border-t border-line hover:bg-surface2">
                  <td className="num p-3 font-bold text-ink">{v.plate ? displayPlate(v.plate) : '—'}</td>
                  <td className="p-3 text-ink">{[v.make, v.model].filter(Boolean).join(' ') || '—'}</td>
                  <td className="num p-3 text-xs text-muted">{v.vin ?? '—'}</td>
                  <td className="p-3"><SoftChip tone="neutral">{v.type ?? '—'}</SoftChip></td>
                  <td className="p-3 text-right">
                    <Link href={`/advisor/vehicles/${v.id}/edit`} className="text-sm font-semibold text-brand">uredi</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <WorkOrdersCard id={id} wos={wos} />
      <EstimatesCard id={id} />
      <AppointmentsCard id={id} />
      <InvoicesCard invoices={invoices} />
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * VAT status & validation. For a VAT-liable customer with a VAT id, this card
 * shows whether the id is validated and lets the advisor validate it (VIES or
 * an audited manual confirmation requiring a note).
 * -------------------------------------------------------------------------- */
function VatStatusCard({ customer, onChanged }: { customer: any; onChanged: () => void }) {
  const [mode, setMode] = useState<null | 'manual'>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const validated = customer.vatIdValidated === true;
  const source = customer.vatIdValidationSource as 'vies' | 'manual' | null;

  async function run(m: 'vies' | 'manual') {
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await api.customers.validateVat(customer.id, { mode: m, note: m === 'manual' ? note.trim() : undefined });
      if (r.validated) {
        setResult(`Potrjeno prek ${r.source}${r.viesName ? ` — ${r.viesName}` : ''}.`);
        setMode(null); setNote('');
        onChanged();
      } else {
        setError(r.reason || 'Preverjanje ni potrdilo ID za DDV.');
      }
    } catch (e: any) {
      setError(e?.message || 'Preverjanje ni uspelo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={`p-4 ${validated ? 'border-go/40 bg-go/5' : 'border-hold/40 bg-hold/5'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted2">Status ID za DDV</h3>
          <p className="mt-1 flex items-center gap-2 text-lg font-bold text-ink">
            <span className="num">{customer.vatId}</span>
            {validated
              ? <SoftChip tone="go">potrjen{source ? ` · ${source}` : ''}</SoftChip>
              : <SoftChip tone="hold">ni potrjen</SoftChip>}
          </p>
          {!validated && (
            <p className="mt-1 text-sm text-muted">
              Čezmejni računi v EU lahko uporabijo obrnjeno davčno obveznost šele po potrditvi tega ID za DDV.
              Do takrat je izdaja za EU poslovnega kupca iz druge države blokirana.
            </p>
          )}
        </div>
        {!validated && mode === null && (
          <div className="flex flex-col gap-2">
            <Button tone="go" onClick={() => run('vies')} disabled={busy}>Preveri prek VIES</Button>
            <Button tone="neutral" onClick={() => { setMode('manual'); setError(null); }} disabled={busy}>Potrdi ročno</Button>
          </div>
        )}
      </div>

      {error && <p className="mt-3 rounded-tool bg-stop/10 px-3 py-2 text-sm font-semibold text-stop">{error}</p>}
      {result && <p className="mt-3 rounded-tool bg-go/10 px-3 py-2 text-sm font-semibold text-go">{result}</p>}

      {mode === 'manual' && (
        <div className="mt-4 rounded-tool border border-line bg-surface p-3">
          <p className="mb-2 text-sm font-semibold text-ink">Ročna potrditev</p>
          <p className="mb-2 text-xs text-muted">
            Navedi, kaj si preveril (npr. preverjen portal VIES, potrdilo o DDV stranke v evidenci).
            Zabeleži se ob tvojem imenu v revizijski sledi.
          </p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            placeholder="npr. VIES portal preverjen 2026-06-07; potrdilo v evidenci"
            className="w-full rounded-tool border border-line bg-surface2 p-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brandring" />
          <div className="mt-2 flex justify-end gap-2">
            <Button tone="neutral" onClick={() => { setMode(null); setNote(''); }}>Prekliči</Button>
            <Button tone="go" onClick={() => run('manual')} disabled={busy || note.trim().length < 3}>
              {busy ? <Spinner /> : 'Potrdi in zabeleži'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* Linked work orders for this customer (cross-link). */
function WorkOrdersCard({ id, wos }: { id: string; wos: any[] | undefined }) {
  if (!DEMO_MODE) return null;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line p-4">
        <h2 className="text-base font-bold text-ink">Delovni nalogi</h2>
        <Link href={`/advisor/work-orders/new?customerId=${id}`}><Button tone="info">+ Nov nalog</Button></Link>
      </div>
      {!wos ? (
        <div className="flex justify-center p-6"><Spinner className="text-brand" /></div>
      ) : wos.length === 0 ? (
        <p className="p-8 text-center text-muted">Ni delovnih nalogov.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
            <tr><th className="p-3 font-bold">Št.</th><th className="p-3 font-bold">Vozilo</th><th className="p-3 font-bold">Status</th><th className="p-3 text-right font-bold">Znesek</th></tr>
          </thead>
          <tbody>
            {wos.map((w) => (
              <tr key={w.id} className="border-t border-line hover:bg-surface2">
                <td className="p-3"><Link href={`/advisor/work-orders/${w.id}`} className="num font-semibold text-brand hover:underline">{w.number ?? '—'}</Link></td>
                <td className="num p-3 text-muted">{w.plate ? displayPlate(w.plate) : '—'}</td>
                <td className="p-3"><SoftChip tone={statusTone(w.status)}>{statusLabel(w.status)}</SoftChip></td>
                <td className="num p-3 text-right font-semibold text-ink">{formatMoneyMinor(w.totalGrossMinor, w.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

const INV_LABEL: Record<string, string> = { draft: 'Osnutek', issued: 'Izdan', paid: 'Plačan', overdue: 'Zapadel', credited: 'Dobropis' };
const INV_TONE: Record<string, 'go' | 'hold' | 'stop' | 'info' | 'neutral'> = { draft: 'neutral', issued: 'info', paid: 'go', overdue: 'stop', credited: 'hold' };

/* Linked invoices for this customer (cross-link). */
function InvoicesCard({ invoices }: { invoices: any[] | undefined }) {
  if (!DEMO_MODE) return null;
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line p-4"><h2 className="text-base font-bold text-ink">Računi</h2></div>
      {!invoices ? (
        <div className="flex justify-center p-6"><Spinner className="text-brand" /></div>
      ) : invoices.length === 0 ? (
        <p className="p-8 text-center text-muted">Ni računov.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
            <tr><th className="p-3 font-bold">Št.</th><th className="p-3 font-bold">Datum</th><th className="p-3 font-bold">Status</th><th className="p-3 text-right font-bold">Znesek</th></tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-line hover:bg-surface2">
                <td className="p-3"><Link href={`/advisor/invoices/${inv.id}`} className="num font-semibold text-brand hover:underline">{inv.number ?? '—'}</Link></td>
                <td className="num p-3 text-muted">{inv.issueDate ?? '—'}</td>
                <td className="p-3"><SoftChip tone={INV_TONE[inv.status] ?? 'neutral'}>{INV_LABEL[inv.status] ?? inv.status}</SoftChip></td>
                <td className="num p-3 text-right font-semibold text-ink">{formatMoneyMinor(inv.totalGrossMinor, inv.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

/* Predračuni (estimates) cross-link — this customer's quotes, central-store backed.
 * Self-fetching so it stays additive; demo-only like the other cross-link cards. */
function EstimatesCard({ id }: { id: string }) {
  const { data: estimates } = useSWR(DEMO_MODE ? ['cust-estimates', id] : null, () => api.estimates.list({ customerId: id }).catch(() => []));
  if (!DEMO_MODE) return null;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line p-4">
        <h2 className="text-base font-bold text-ink">Predračuni</h2>
        <Link href="/advisor/quotes" className="text-sm font-semibold text-brand hover:underline">Vsi ›</Link>
      </div>
      {!estimates ? (
        <div className="flex justify-center p-6"><Spinner className="text-brand" /></div>
      ) : estimates.length === 0 ? (
        <p className="p-8 text-center text-muted">Ni predračunov.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
            <tr><th className="p-3 font-bold">Št.</th><th className="p-3 font-bold">Datum</th><th className="p-3 font-bold">Status</th><th className="p-3 text-right font-bold">Znesek</th></tr>
          </thead>
          <tbody>
            {(estimates as any[]).map((e) => (
              <tr key={e.id} className="border-t border-line hover:bg-surface2">
                <td className="p-3"><Link href={`/advisor/quotes/${e.id}`} className="num font-semibold text-brand hover:underline">{e.number ?? '—'}</Link></td>
                <td className="num p-3 text-muted">{e.createdAt ? String(e.createdAt).slice(0, 10) : '—'}</td>
                <td className="p-3"><SoftChip tone={estimateStatusTone(e.status)}>{estimateStatusLabel(e.status)}</SoftChip></td>
                <td className="num p-3 text-right font-semibold text-ink">{formatMoneyMinor(docTotalsMinor(e.lines).grossMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

/* Termini (appointments) cross-link — this customer's bookings, central-store
 * backed. Self-fetching, demo-only, mirrors the other cross-link cards. */
function AppointmentsCard({ id }: { id: string }) {
  const { data: appts } = useSWR(DEMO_MODE ? ['cust-appts', id] : null, () => api.appointments.list({ customerId: id }).catch(() => []));
  if (!DEMO_MODE) return null;
  const label = (s: string) => (s === 'done' ? 'Opravljeno' : s === 'cancelled' ? 'Preklicano' : 'Načrtovano');
  const tone = (s: string): 'go' | 'stop' | 'info' => (s === 'done' ? 'go' : s === 'cancelled' ? 'stop' : 'info');
  const rows = ((appts as any[] | undefined) ?? []).slice().sort((a, b) => String(a.start).localeCompare(String(b.start)));
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line p-4">
        <h2 className="text-base font-bold text-ink">Termini</h2>
        <Link href="/advisor/calendar" className="text-sm font-semibold text-brand hover:underline">Koledar ›</Link>
      </div>
      {!appts ? (
        <div className="flex justify-center p-6"><Spinner className="text-brand" /></div>
      ) : rows.length === 0 ? (
        <p className="p-8 text-center text-muted">Ni terminov.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
            <tr><th className="p-3 font-bold">Datum / ura</th><th className="p-3 font-bold">Storitev</th><th className="p-3 font-bold">Status</th></tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-line hover:bg-surface2">
                <td className="num p-3 text-ink">{String(a.start).slice(0, 10)} {String(a.start).slice(11, 16)}</td>
                <td className="p-3 text-ink">{a.title || '—'}</td>
                <td className="p-3"><SoftChip tone={tone(a.status ?? 'scheduled')}>{label(a.status ?? 'scheduled')}</SoftChip></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
