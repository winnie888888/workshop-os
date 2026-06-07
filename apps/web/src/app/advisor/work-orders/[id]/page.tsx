'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api, ApiError, type WorkOrderDetail, type WorkOrderLine, type WorkOrderStatus } from '@/lib/api';
import { formatMoneyMinor, statusLabel, statusTone } from '@/lib/format';
import { Button, Card, ProblemBanner, SoftChip, Spinner, StatusChip } from '@/components/ui';
import { TextField, NumberField } from '@/components/form';

/*
 * The advisor's primary workspace. Header carries the WO number + status and an
 * action menu filtered to legal transitions. The body shows the connected
 * chain — customer (with VAT + overdue banner), vehicle, complaint, priced
 * lines, and live totals. Issuing is a separate confirm screen.
 */
export default function WorkOrderWorkspace() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: wo, isLoading, mutate } = useSWR(['wo-advisor', id], () => api.workOrders.get(id));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function transition(to: WorkOrderStatus) {
    setBusy(true); setError(null);
    try { await api.workOrders.transition(id, to); await mutate(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Sprememba stanja ni uspela'); }
    finally { setBusy(false); }
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner className="text-info" /></div>;
  if (!wo) return <Card className="p-6 text-muted">Delovni nalog ni najden.</Card>;

  const editable = !['invoiced', 'closed', 'cancelled'].includes(wo.status);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <nav className="flex items-center gap-2 text-xs font-semibold text-muted">
        <button onClick={() => router.push('/advisor')} className="hover:text-brand">Delovni nalogi</button>
        <span className="text-muted2">/</span>
        <span className="num text-ink">{wo.number ?? 'OSNUTEK'}</span>
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Delovni nalog <span className="num">{wo.number ?? ''}</span></h1>
        <StatusChip tone={statusTone(wo.status)}>{statusLabel(wo.status)}</StatusChip>
      </div>

      {error && <ProblemBanner message={error} />}

      <OverdueBanner customerId={wo.customerId} />

      <div className="grid grid-cols-2 gap-4">
        <CustomerBlock workOrderId={id} />
        <VehicleBlock workOrderId={id} odometer={wo.odometer} />
      </div>

      <ComplaintBlock workOrderId={id} />

      <MechanicAssign workOrderId={id} assignedMechanicId={(wo as any).assignedMechanicId ?? null} editable={editable} onChanged={() => mutate()} />

      <LinesBlock wo={wo} editable={editable} onChanged={() => mutate()} />

      {/* Action row — legal transitions + issue path */}
      <div className="flex flex-wrap items-center gap-3">
        {wo.status === 'ready' && (
          <Button tone="go" size="lg" onClick={() => router.push(`/advisor/invoices/issue/${id}`)}>Izstavi račun →</Button>
        )}
        {wo.status === 'awaiting_approval' && (
          <Button tone="hold" onClick={() => transition('in_progress')} disabled={busy}>Odobreno → nadaljuj</Button>
        )}
        {wo.status === 'in_progress' && (
          <Button tone="info" onClick={() => transition('ready')} disabled={busy}>Označi pripravljeno</Button>
        )}
        {wo.status === 'open' && (
          <Button tone="info" onClick={() => transition('in_progress')} disabled={busy}>Začni</Button>
        )}
        {editable && (
          <Button tone="stop" onClick={() => transition('cancelled')} disabled={busy} className="ml-auto">Prekliči</Button>
        )}
      </div>
    </div>
  );
}

function OverdueBanner({ customerId }: { customerId: string }) {
  // The owner-protection rule, now customer-specific (item 6): surface THIS
  // customer's overdue balance before more work is opened on credit, using the
  // per-customer receivables endpoint rather than the shop-wide aging.
  const { data } = useSWR(['cust-receivables', customerId], () =>
    api.customerReceivables(customerId).catch(() => null));
  if (!data) return null;
  const hasOverdue = data.buckets.d1_30 !== '0' || data.buckets.d31_60 !== '0'
    || data.buckets.d61_90 !== '0' || data.buckets.d90_plus !== '0';
  if (!hasOverdue) return null;
  const severe = data.buckets.d61_90 !== '0' || data.buckets.d90_plus !== '0';
  return (
    <div className={`rounded-tool border px-4 py-3 text-sm font-semibold ${severe ? 'border-stop/40 bg-stop/10 text-stop' : 'border-hold/40 bg-hold/10 text-hold'}`}>
      ⚠ Stranka ima odprtih obveznosti {data.formatted.total}
      {data.buckets.d90_plus !== '0' && `, od tega ${data.formatted.d90_plus} nad 90 dni`}.
      Preveri kreditno izpostavljenost pred dodajanjem dela.
    </div>
  );
}

function CustomerBlock({ workOrderId }: { workOrderId: string }) {
  const { data } = useSWR(['nalog', workOrderId], () => api.workOrders.nalog(workOrderId).catch(() => null));
  const d = data as any;
  return (
    <Card className="flex items-start gap-3 p-4">
      <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-brandweak text-brand">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
      </span>
      <div className="min-w-0">
        <h3 className="text-[0.7rem] font-bold uppercase tracking-wide text-muted2">Stranka</h3>
        <p className="mt-0.5 text-lg font-bold text-ink">{d?.issuedFor?.customer ?? '—'}</p>
        {d?.issuedFor?.vatId && (
          <p className="mt-0.5 flex items-center gap-2 text-sm text-muted"><span className="num">DDV {d.issuedFor.vatId}</span> <SoftChip tone="go">v evidenci</SoftChip></p>
        )}
        {d?.issuedFor?.address && <p className="text-sm text-muted">{d.issuedFor.address}</p>}
      </div>
    </Card>
  );
}

function VehicleBlock({ workOrderId, odometer }: { workOrderId: string; odometer: number | null }) {
  const { data } = useSWR(['nalog', workOrderId], () => api.workOrders.nalog(workOrderId).catch(() => null));
  const v = (data as any)?.vehicle;
  return (
    <Card className="flex items-start gap-3 p-4">
      <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-brandweak text-brand">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17h14M5 17a2 2 0 0 1-2-2V9l2-4h11l3 4v6a2 2 0 0 1-2 2M5 17v2M19 17v2"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/></svg>
      </span>
      <div className="min-w-0">
        <h3 className="text-[0.7rem] font-bold uppercase tracking-wide text-muted2">Vozilo</h3>
        {v ? (
          <>
            <p className="mt-0.5 text-lg font-bold text-ink">{v.makeModel}</p>
            <p className="num text-sm text-muted">{v.plate} · VIN {v.vin}</p>
            <p className="text-sm text-muted">Števec <span className="num">{odometer?.toLocaleString() ?? '—'}</span> km</p>
          </>
        ) : <p className="mt-0.5 text-muted">Ni povezanega vozila</p>}
      </div>
    </Card>
  );
}

function ComplaintBlock({ workOrderId }: { workOrderId: string }) {
  const { data } = useSWR(['nalog', workOrderId], () => api.workOrders.nalog(workOrderId).catch(() => null));
  const complaint = (data as any)?.complaint;
  return (
    <Card className="p-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-steel">Opis težave</h3>
      <p className="mt-1 text-base">{complaint || '—'}</p>
    </Card>
  );
}

function LinesBlock({ wo, editable, onChanged }: { wo: WorkOrderDetail; editable: boolean; onChanged: () => void }) {
  return <LineEditor wo={wo} editable={editable} onChanged={onChanged} />;
}

/* ----------------------------------------------------------------------------
 * Mechanic assignment — the missing link the readiness review named. Picks an
 * assignee from the tenant's mechanics; assignment is what makes a job appear
 * in that mechanic's "my jobs" list. The control is light: it never changes the
 * work-order status, only who is responsible.
 * -------------------------------------------------------------------------- */
function MechanicAssign({
  workOrderId, assignedMechanicId, editable, onChanged,
}: {
  workOrderId: string; assignedMechanicId: string | null; editable: boolean; onChanged: () => void;
}) {
  const { data: mechanics } = useSWR('mechanics', () => api.workOrders.mechanics().catch(() => []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assign(value: string) {
    setBusy(true); setError(null);
    try {
      await api.workOrders.assign(workOrderId, value || null);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Mehanika ni bilo mogoče dodeliti');
    } finally {
      setBusy(false);
    }
  }

  const current = (mechanics ?? []).find((m) => m.id === assignedMechanicId);

  return (
    <Card className="flex items-center justify-between gap-4 p-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-steel">Dodeljen mehanik</h3>
        <p className="mt-1 font-display text-lg font-bold">
          {current ? current.name : <span className="text-muted">Nedodeljeno</span>}
        </p>
        {error && <p className="mt-1 text-sm font-semibold text-stop">{error}</p>}
      </div>
      {editable && (
        <select
          value={assignedMechanicId ?? ''}
          disabled={busy}
          onChange={(e) => assign(e.target.value)}
          className="min-h-tap min-w-48 rounded-tool border border-linestrong bg-surface px-3 text-base
            focus:border-brandring focus:outline-none"
        >
          <option value="">Nedodeljeno</option>
          {(mechanics ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      )}
    </Card>
  );
}

/* ----------------------------------------------------------------------------
 * The line editor — the heart of Phase 4B. The advisor builds the billable job
 * here: labour lines (hours × hourly rate) and part lines (quantity × unit
 * price), each with a VAT rate. Crucially, NO money is computed in the browser:
 * every add/edit posts the raw inputs and the server returns the line and the
 * work-order totals re-priced by the tested shared Pricing core, which the
 * screen then re-reads. That is what keeps one source of truth for money.
 * -------------------------------------------------------------------------- */
function LineEditor({ wo, editable, onChanged }: { wo: WorkOrderDetail; editable: boolean; onChanged: () => void }) {
  const [adding, setAdding] = useState<null | 'labour' | 'part'>(null);
  const [picking, setPicking] = useState(false);
  const [pkg, setPkg] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
        <h3 className="font-display text-lg font-bold">Postavke</h3>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button tone="info" onClick={() => { setPkg(true); setPicking(false); setAdding(null); setEditingId(null); }}>+ Paket</Button>
            <Button tone="info" onClick={() => { setAdding('labour'); setPkg(false); setPicking(false); setEditingId(null); }}>+ Delo</Button>
            <Button tone="go" onClick={() => { setPicking(true); setPkg(false); setAdding(null); setEditingId(null); }}>+ Del iz zaloge</Button>
            <Button tone="neutral" onClick={() => { setAdding('part'); setPkg(false); setPicking(false); setEditingId(null); }}>+ Drug del</Button>
          </div>
        )}
      </div>

      {editable && <QuickAddBar wo={wo} onAdded={onChanged} onError={setError} />}

      {error && <div className="px-4 pt-3"><ProblemBanner message={error} /></div>}

      {picking && (
        <div className="border-b border-line p-4">
          <PartsPicker wo={wo}
            onCancel={() => setPicking(false)}
            onAdded={() => { setPicking(false); onChanged(); }}
            onError={setError} />
        </div>
      )}

      {pkg && (
        <div className="border-b border-line p-4">
          <PackagePicker wo={wo}
            onCancel={() => setPkg(false)}
            onAdded={() => { setPkg(false); onChanged(); }}
            onError={setError} />
        </div>
      )}

      <table className="w-full text-sm">
        <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="p-3">#</th><th className="p-3">Vrsta</th><th className="p-3">Opis</th>
            <th className="p-3 text-right">Količina</th><th className="p-3 text-right">Cena/EM</th>
            <th className="p-3 text-right">Neto</th><th className="p-3 text-right">DDV</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {wo.lines.map((l) => (
            editingId === l.id ? (
              <LineEditRow key={l.id} wo={wo} line={l}
                onCancel={() => setEditingId(null)}
                onSaved={() => { setEditingId(null); onChanged(); }}
                onError={setError} />
            ) : (
              <tr key={l.id} className="border-t border-line">
                <td className="p-3 font-mono">{l.lineNo}</td>
                <td className="p-3"><SoftChip tone={l.type === 'labour' ? 'info' : 'neutral'}>{l.type === 'labour' ? 'Delo' : 'Del'}</SoftChip></td>
                <td className="p-3">{l.description}{l.issued && <span className="ml-2 text-xs text-go">vgrajeno</span>}</td>
                <td className="p-3 text-right font-mono">{l.quantity}</td>
                <td className="p-3 text-right font-mono">{formatMoneyMinor(l.unitPriceMinor, wo.currency)}</td>
                <td className="p-3 text-right font-mono">{formatMoneyMinor(l.netMinor, wo.currency)}</td>
                <td className="p-3 text-right font-mono">{l.vatRatePct}%</td>
                <td className="p-3 text-right">
                  {editable && !l.issued && !l.reservedLocationId && (
                    <button onClick={() => { setEditingId(l.id); setAdding(null); }}
                      className="mr-3 text-sm font-semibold text-brand">uredi</button>
                  )}
                  {editable && !l.issued && (
                    <RemoveLineButton wo={wo} lineId={l.id} onRemoved={onChanged} onError={setError} />
                  )}
                </td>
              </tr>
            )
          ))}
          {wo.lines.length === 0 && (
            <tr><td colSpan={8} className="p-6 text-center text-steel">Ni postavk. Dodaj delo in dele za sestavo naloga.</td></tr>
          )}
          {adding && (
            <LineAddRow wo={wo} kind={adding}
              onCancel={() => setAdding(null)}
              onAdded={() => { setAdding(null); onChanged(); }}
              onError={setError} />
          )}
        </tbody>
        <tfoot className="border-t border-line bg-surface2">
          <tr className="font-bold">
            <td className="p-3" colSpan={5}>Vsote</td>
            <td className="p-3 text-right font-mono">{formatMoneyMinor(wo.totalNetMinor, wo.currency)}</td>
            <td className="p-3 text-right font-mono">{formatMoneyMinor(wo.totalVatMinor, wo.currency)}</td>
            <td></td>
          </tr>
          <tr>
            <td className="p-3 text-right text-steel" colSpan={6}>Za plačilo (z DDV)</td>
            <td className="p-3 text-right font-mono text-lg font-bold" colSpan={2}>{formatMoneyMinor(wo.totalGrossMinor, wo.currency)}</td>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}

/**
 * Convert a decimal-euro string the advisor types (e.g. "65" or "65.50") into
 * integer minor units for the API. All money crosses the wire as minor units;
 * this is the only place the UI touches the conversion, and it rounds rather
 * than trusting float maths.
 */
function eurosToMinor(input: string): number | null {
  const n = parseFloat(input.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function LineAddRow({ wo, kind, onCancel, onAdded, onError }: {
  wo: WorkOrderDetail; kind: 'labour' | 'part'; onCancel: () => void; onAdded: () => void; onError: (m: string | null) => void;
}) {
  // Labour is "hours × rate"; a part is "quantity × unit price". The field
  // labels differ but both map to the same {quantity, unitPriceMinor} the
  // backend's addLine expects, so the server prices them identically.
  const [description, setDescription] = useState(kind === 'labour' ? 'Delo' : '');
  const [qty, setQty] = useState(kind === 'labour' ? '1' : '1');
  const [unit, setUnit] = useState('');
  const [vat, setVat] = useState('22');
  const [busy, setBusy] = useState(false);

  async function add() {
    const unitMinor = eurosToMinor(unit);
    if (!description.trim() || unitMinor === null) { onError('Vnesi opis in veljavno ceno.'); return; }
    setBusy(true); onError(null);
    try {
      await api.workOrders.addLine(wo.id, {
        lineId: crypto.randomUUID(), // idempotent: a retried add cannot duplicate
        type: kind,
        description: description.trim(),
        quantity: qty || '1',
        unitPriceMinor: unitMinor,
        vatRatePct: vat || '22',
      });
      onAdded();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Postavke ni bilo mogoče dodati');
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-line bg-info/5">
      <td className="p-2 text-center font-mono text-steel">+</td>
      <td className="p-2"><SoftChip tone={kind === 'labour' ? 'info' : 'neutral'}>{kind === 'labour' ? 'Delo' : 'Del'}</SoftChip></td>
      <td className="p-2">
        <input value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder={kind === 'labour' ? 'npr. Pregled zavor' : 'npr. Komplet zavornih ploščic'}
          className="w-full rounded border border-linestrong bg-surface px-2 py-2 focus:border-brandring focus:outline-none" />
      </td>
      <td className="p-2">
        <input value={qty} inputMode="decimal" onChange={(e) => setQty(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
          className="w-16 rounded border border-linestrong bg-surface px-2 py-2 text-right font-mono focus:border-brandring focus:outline-none"
          title={kind === 'labour' ? 'ure' : 'količina'} />
      </td>
      <td className="p-2">
        <input value={unit} inputMode="decimal" onChange={(e) => setUnit(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
          placeholder={kind === 'labour' ? '€/h' : '€'}
          className="w-20 rounded border border-linestrong bg-surface px-2 py-2 text-right font-mono focus:border-brandring focus:outline-none" />
      </td>
      <td className="p-2 text-right text-steel">—</td>
      <td className="p-2">
        <input value={vat} inputMode="decimal" onChange={(e) => setVat(e.target.value.replace(/[^0-9.]/g, ''))}
          className="w-14 rounded border border-linestrong bg-surface px-2 py-2 text-right font-mono focus:border-brandring focus:outline-none" />
      </td>
      <td className="p-2 text-right">
        <button onClick={add} disabled={busy} className="mr-2 font-semibold text-go">{busy ? '…' : 'dodaj'}</button>
        <button onClick={onCancel} className="font-semibold text-steel">prekliči</button>
      </td>
    </tr>
  );
}

function LineEditRow({ wo, line, onCancel, onSaved, onError }: {
  wo: WorkOrderDetail; line: WorkOrderLine; onCancel: () => void; onSaved: () => void; onError: (m: string | null) => void;
}) {
  const [description, setDescription] = useState(line.description);
  const [qty, setQty] = useState(line.quantity);
  const [unit, setUnit] = useState((Number(line.unitPriceMinor) / 100).toString());
  const [vat, setVat] = useState(line.vatRatePct);
  const [busy, setBusy] = useState(false);

  async function save() {
    const unitMinor = eurosToMinor(unit);
    if (!description.trim() || unitMinor === null) { onError('Vnesi opis in veljavno ceno.'); return; }
    setBusy(true); onError(null);
    try {
      await api.workOrders.updateLine(wo.id, line.id, {
        description: description.trim(), quantity: qty || '1', unitPriceMinor: unitMinor, vatRatePct: vat || '22',
      });
      onSaved();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Postavke ni bilo mogoče shraniti');
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-line bg-hold/5">
      <td className="p-2 font-mono">{line.lineNo}</td>
      <td className="p-2"><SoftChip tone={line.type === 'labour' ? 'info' : 'neutral'}>{line.type === 'labour' ? 'Delo' : 'Del'}</SoftChip></td>
      <td className="p-2">
        <input value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border border-linestrong bg-surface px-2 py-2 focus:border-brandring focus:outline-none" />
      </td>
      <td className="p-2">
        <input value={qty} inputMode="decimal" onChange={(e) => setQty(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
          className="w-16 rounded border border-linestrong bg-surface px-2 py-2 text-right font-mono focus:border-brandring focus:outline-none" />
      </td>
      <td className="p-2">
        <input value={unit} inputMode="decimal" onChange={(e) => setUnit(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
          className="w-20 rounded border border-linestrong bg-surface px-2 py-2 text-right font-mono focus:border-brandring focus:outline-none" />
      </td>
      <td className="p-2 text-right text-steel">—</td>
      <td className="p-2">
        <input value={vat} inputMode="decimal" onChange={(e) => setVat(e.target.value.replace(/[^0-9.]/g, ''))}
          className="w-14 rounded border border-linestrong bg-surface px-2 py-2 text-right font-mono focus:border-brandring focus:outline-none" />
      </td>
      <td className="p-2 text-right">
        <button onClick={save} disabled={busy} className="mr-2 font-semibold text-go">{busy ? '…' : 'shrani'}</button>
        <button onClick={onCancel} className="font-semibold text-steel">prekliči</button>
      </td>
    </tr>
  );
}

function RemoveLineButton({ wo, lineId, onRemoved, onError }: {
  wo: WorkOrderDetail; lineId: string; onRemoved: () => void; onError: (m: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true); onError(null);
    try { await api.workOrders.removeLine(wo.id, lineId); onRemoved(); }
    catch (e) { onError(e instanceof ApiError ? e.message : 'Postavke ni bilo mogoče odstraniti'); setBusy(false); }
  }
  return (
    <button onClick={remove} disabled={busy} className="text-sm font-semibold text-stop">{busy ? '…' : 'odstrani'}</button>
  );
}

/* ----------------------------------------------------------------------------
 * Parts picker (Warehouse 5.1) — the screen that finally connects a work-order
 * part line to REAL inventory. The advisor searches the catalogue; choosing an
 * item loads its stock by location so they can see what is actually available
 * (available = on hand − reserved) and reserve from a location that has it. The
 * line is added with the catalogue item id, the chosen location, and the item's
 * sell price, which is exactly the shape the backend's addLine reserves against
 * — so adding the line creates a real stock reservation through the chokepoint.
 * No money is computed here; the server re-prices the line as always.
 * -------------------------------------------------------------------------- */
function PartsPicker({ wo, onCancel, onAdded, onError }: {
  wo: WorkOrderDetail; onCancel: () => void; onAdded: () => void; onError: (m: string | null) => void;
}) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [qty, setQty] = useState('1');
  const [locationId, setLocationId] = useState('');
  const [busy, setBusy] = useState(false);

  // Live catalogue search (keyed by the query so it refetches as they type).
  const { data: results } = useSWR(['catalogue', q], () => api.inventory.search(q).catch(() => []));
  // When an item is chosen, load its stock across locations.
  const { data: stock } = useSWR(
    selected ? ['item-stock', selected.id] : null,
    () => api.inventory.stock(selected.id).catch(() => []),
  );

  async function add() {
    if (!selected) { onError('Najprej izberi del iz kataloga.'); return; }
    if (!locationId) { onError('Izberi lokacijo za rezervacijo dela.'); return; }
    const n = parseInt(qty, 10);
    if (!Number.isInteger(n) || n <= 0) { onError('Količina mora biti celo število kosov.'); return; }
    setBusy(true); onError(null);
    try {
      await api.workOrders.addLine(wo.id, {
        lineId: crypto.randomUUID(),      // idempotent add
        type: 'part',
        description: selected.name,
        inventoryItemId: selected.id,      // <- ties the line to the catalogue item
        locationId,                        // <- reserves from this location
        quantity: String(n),
        unitPriceMinor: Number(selected.priceMinor),
        vatRatePct: selected.vatRatePct ?? '22',
      });
      onAdded();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Dela ni bilo mogoče dodati');
      setBusy(false);
    }
  }

  return (
    <div className="rounded-tool border border-go/30 bg-go/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-bold uppercase tracking-wide text-steel">Dodaj del iz zaloge</h4>
        <button onClick={onCancel} className="text-sm font-semibold text-steel">prekliči</button>
      </div>

      {!selected ? (
        <div>
          <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus
            placeholder="Iskanje po nazivu, SKU ali OEM…"
            className="w-full rounded-tool border border-linestrong bg-surface px-3 py-2 focus:border-brandring focus:outline-none" />
          <div className="mt-2 max-h-56 overflow-auto rounded-tool border border-line bg-surface">
            {(results ?? []).length === 0 ? (
              <p className="p-3 text-sm text-steel">Ni ustreznih delov v katalogu.</p>
            ) : (results ?? []).map((it: any) => (
              <button key={it.id} onClick={() => { setSelected(it); onError(null); }}
                className="flex w-full items-center justify-between border-b border-line px-3 py-2 text-left last:border-0 hover:bg-floor">
                <span>
                  <span className="font-semibold">{it.name}</span>
                  {it.sku && <span className="ml-2 font-mono text-xs text-steel">{it.sku}</span>}
                </span>
                <span className="font-mono text-sm">{formatMoneyMinor(it.priceMinor, wo.currency)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between rounded-tool border border-line bg-surface px-3 py-2">
            <span className="font-semibold">{selected.name}{selected.sku && <span className="ml-2 font-mono text-xs text-steel">{selected.sku}</span>}</span>
            <button onClick={() => { setSelected(null); setLocationId(''); }} className="text-sm font-semibold text-info">zamenjaj</button>
          </div>

          <div className="mt-3">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-steel">Rezerviraj z lokacije</span>
            {!stock ? (
              <p className="text-sm text-steel">Nalagam zalogo…</p>
            ) : (stock as any[]).length === 0 ? (
              <p className="text-sm font-semibold text-hold">Tega dela ni nikjer na zalogi. Najprej ga prevzemi ali uporabi »Drug del«.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {(stock as any[]).map((s) => {
                  const avail = s.available ?? (s.onHand - s.reserved);
                  return (
                    <label key={s.locationId}
                      className={`flex cursor-pointer items-center justify-between rounded-tool border px-3 py-2 ${locationId === s.locationId ? 'border-info bg-info/5' : 'border-line bg-surface'}`}>
                      <span className="flex items-center gap-2">
                        <input type="radio" name="loc" checked={locationId === s.locationId}
                          onChange={() => setLocationId(s.locationId)} disabled={avail <= 0} />
                        <span className="font-mono text-xs">{s.locationId.slice(0, 8)}</span>
                      </span>
                      <span className={`text-sm font-semibold ${avail > 0 ? 'text-go' : 'text-stop'}`}>
                        {avail} na voljo <span className="text-muted2">({s.onHand} skupaj, {s.reserved} rezervirano)</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-steel">Količina</span>
              <input value={qty} inputMode="numeric"
                onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-24 rounded-tool border border-linestrong bg-surface px-3 py-2 text-right font-mono focus:border-brandring focus:outline-none" />
            </label>
            <Button tone="go" onClick={add} disabled={busy || !locationId}>
              {busy ? <Spinner /> : 'Dodaj in rezerviraj'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Package picker — applies a service package (preset) to the work order in one
 * click. Packages are filtered by the work order vehicle's class + powertrain
 * (resolved via the asset), so an electric vehicle never sees a diesel oil
 * service. Part-line prices are resolved LIVE from the catalogue at apply time;
 * labour lines use the price stored on the package.
 */
function PackagePicker({ wo, onCancel, onAdded, onError }: {
  wo: WorkOrderDetail; onCancel: () => void; onAdded: () => void; onError: (m: string | null) => void;
}) {
  const assetId = (wo as any).assetId as string | null | undefined;
  const { data: vehicle } = useSWR(assetId ? ['wo-veh', assetId] : null, () => api.assets.get(assetId as string).catch(() => null));
  const { data: presets } = useSWR('all-presets', () => api.presets.list().catch(() => []));
  const { data: catalog } = useSWR(['catalog-all'], () => api.inventory.search('').catch(() => []));
  const [showAll, setShowAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const vType = (vehicle as any)?.type as string | undefined;
  const vPower = (vehicle as any)?.powertrain as string | undefined;

  const CLASS_LABEL: Record<string, string> = { tractor: 'Vlačilec', truck: 'Tovornjak', van: 'Kombi', trailer: 'Priklopnik', other: 'Drugo' };
  const POWER_LABEL: Record<string, string> = { diesel: 'Dizel', petrol: 'Bencin', electric: 'Električno', hybrid: 'Hibrid', cng: 'CNG', lng: 'LNG', hydrogen: 'Vodik', other: 'Drugo' };

  function matchFn(p: any): boolean {
    const okC = !(p.vehicleClasses?.length) || (vType && p.vehicleClasses.includes(vType));
    const okP = !(p.powertrains?.length) || (vPower && p.powertrains.includes(vPower));
    return !!(okC && okP);
  }
  const all = (presets ?? []).filter((p: any) => p.active !== false);
  const matching = all.filter(matchFn);
  const shown = showAll ? all : matching;

  function gross(p: any): number {
    return (p.lines ?? []).reduce((s: number, l: any) => s + Math.round((l.qty ?? 0) * (l.unitPriceMinor ?? 0) * (1 + (l.vatRatePct ?? 0) / 100)), 0);
  }

  async function apply(p: any) {
    setBusyId(p.id); onError(null);
    try {
      for (const l of (p.lines ?? [])) {
        const cat = l.itemId ? (catalog as any[])?.find((i) => i.id === l.itemId) : null;
        const unitMinor = cat ? Number(cat.priceMinor) : (l.unitPriceMinor ?? 0);
        const vat = cat ? String(cat.vatRatePct ?? l.vatRatePct ?? '22') : String(l.vatRatePct ?? '22');
        await api.workOrders.addLine(wo.id, {
          lineId: crypto.randomUUID(),
          type: l.kind, description: l.description,
          inventoryItemId: l.itemId, quantity: String(l.qty ?? 1),
          unitPriceMinor: unitMinor, vatRatePct: vat,
        });
      }
      onAdded();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Paketa ni bilo mogoče dodati');
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-ink">Dodaj servisni paket</h4>
        <button onClick={onCancel} className="text-sm font-semibold text-muted hover:text-brand">prekliči</button>
      </div>
      <p className="text-xs text-muted">
        Vozilo: {vType ? (CLASS_LABEL[vType] ?? vType) : 'neznano'}{vPower ? ` · ${POWER_LABEL[vPower] ?? vPower}` : ''}. Prikazani so paketi za to vozilo.
      </p>

      {shown.length === 0 ? (
        <div className="rounded-tool border border-line bg-surface2 p-4 text-sm text-muted">
          Ni paketov za to vozilo.{!showAll && all.length > 0 && <> <button onClick={() => setShowAll(true)} className="font-semibold text-brand">Prikaži vse</button></>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((p: any) => {
            const off = !matchFn(p);
            return (
              <div key={p.id} className={`flex items-center justify-between gap-3 rounded-tool border border-line p-3 ${off ? 'opacity-60' : ''}`}>
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{p.name}{off && <span className="ml-2 text-xs text-muted2">(drugo vozilo)</span>}</div>
                  <div className="text-xs text-muted">{(p.lines ?? []).length} postavk · {formatMoneyMinor(String(gross(p)), wo.currency)}</div>
                </div>
                <Button tone="go" onClick={() => apply(p)} disabled={busyId !== null}>{busyId === p.id ? 'Dodajanje…' : 'Dodaj'}</Button>
              </div>
            );
          })}
          {!showAll && all.length > matching.length && (
            <button onClick={() => setShowAll(true)} className="self-start text-sm font-semibold text-brand">Prikaži vse pakete ({all.length})</button>
          )}
          {showAll && (
            <button onClick={() => setShowAll(false)} className="self-start text-sm font-semibold text-muted">Pokaži samo ustrezne</button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Quick-add bar — one-tap chips for the items flagged "hitri vnos" in the
 * catalogue. Tapping adds that part line to the work order with the item's live
 * price/VAT. The mechanic's most common consumables, one tap away.
 */
function QuickAddBar({ wo, onAdded, onError }: { wo: WorkOrderDetail; onAdded: () => void; onError: (m: string | null) => void }) {
  const { data: favs } = useSWR('quick-add', () => api.inventory.quickAdd().catch(() => []));
  const [busyId, setBusyId] = useState<string | null>(null);
  if (!favs || favs.length === 0) return null;

  async function add(it: any) {
    setBusyId(it.id); onError(null);
    try {
      await api.workOrders.addLine(wo.id, {
        lineId: crypto.randomUUID(), type: 'part', description: it.name,
        inventoryItemId: it.id, quantity: '1',
        unitPriceMinor: Number(it.priceMinor), vatRatePct: String(it.vatRatePct ?? '22'),
      });
      onAdded();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Postavke ni bilo mogoče dodati');
    } finally { setBusyId(null); }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface2 px-4 py-2.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted2">Hitri vnos</span>
      {(favs as any[]).map((it) => (
        <button key={it.id} type="button" disabled={busyId !== null} onClick={() => add(it)}
          className="tool-tap rounded-full border border-linestrong bg-surface px-3 py-1 text-sm font-semibold text-ink hover:border-brand disabled:opacity-50">
          {busyId === it.id ? '…' : `+ ${it.name}`}
        </button>
      ))}
    </div>
  );
}
