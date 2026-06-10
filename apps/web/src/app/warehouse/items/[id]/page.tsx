'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { formatMoneyMinor } from '@/lib/format';
import { Button, Card, SoftChip, Spinner } from '@/components/ui';
import { NumberField, TextField } from '@/components/form';
import { ItemForm } from '../item-form';

const KIND_LABEL: Record<string, string> = { part: 'Del', consumable: 'Potrošni material', fluid: 'Tekočina / olje', tyre: 'Pnevmatika', other: 'Drugo' };

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: item, isLoading, mutate } = useSWR(['item', id], () => api.inventory.get(id));


  if (isLoading || !item) return <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>;
  if (!item.id) return <div className="mx-auto max-w-3xl"><Card className="p-6"><p className="text-muted">Artikel ni najden.</p><Link href="/warehouse/items" className="mt-3 inline-block text-sm font-semibold text-brand">‹ Postavke</Link></Card></div>;

  const available = Math.max(0, (item.onHand ?? 0) - (item.reserved ?? 0));
  const low = (item.reorderPoint ?? 0) > 0 && (item.onHand ?? 0) <= item.reorderPoint;
  const lineValue = (item.onHand ?? 0) * (item.costMinor ?? item.priceMinor ?? 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <button onClick={() => history.back()} className="self-start text-sm font-semibold text-muted hover:text-brand">‹ Postavke</button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">{item.name}</h1>
          <p className="text-sm text-muted">
            <span className="num">{item.sku}</span> · {KIND_LABEL[item.kind] ?? item.kind}{item.category ? ` · ${item.category}` : ''}
            {item.bin ? ` · predal ${item.bin}` : ''}
          </p>
        </div>
        {low && <SoftChip tone="stop">nizka zaloga</SoftChip>}
      </div>

      {/* Stock summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3"><span className="block text-xs text-muted2">Na zalogi</span><span className="num text-xl font-extrabold text-ink">{item.onHand ?? 0}</span> <span className="text-sm text-muted">{item.unit}</span></Card>
        <Card className="p-3"><span className="block text-xs text-muted2">Rezervirano</span><span className="num text-xl font-extrabold text-ink">{item.reserved ?? 0}</span></Card>
        <Card className="p-3"><span className="block text-xs text-muted2">Razpoložljivo</span><span className={`num text-xl font-extrabold ${low ? 'text-stop' : 'text-go'}`}>{available}</span></Card>
        <Card className="p-3"><span className="block text-xs text-muted2">Vrednost zaloge</span><span className="num text-xl font-extrabold text-ink">{formatMoneyMinor(String(lineValue))}</span></Card>
      </div>

      <ReceiveCard itemId={id} unit={item.unit} onDone={() => mutate()} />

      {/* Batches */}
      {Array.isArray(item.batches) && item.batches.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-line p-4"><h2 className="text-base font-bold text-ink">Šarže / serije</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
              <tr><th className="p-3 font-bold">Šarža</th><th className="p-3 text-right font-bold">Količina</th><th className="p-3 font-bold">Rok uporabe</th><th className="p-3 text-right font-bold">Nabava</th></tr>
            </thead>
            <tbody>
              {item.batches.map((b: any) => (
                <tr key={b.id} className="border-t border-line">
                  <td className="num p-3 font-semibold text-ink">{b.batchNo ?? '—'}</td>
                  <td className="num p-3 text-right text-ink">{b.qty} {item.unit}</td>
                  <td className="num p-3 text-muted">{b.expiry ?? '—'}</td>
                  <td className="num p-3 text-right text-muted">{b.costMinor != null ? formatMoneyMinor(String(b.costMinor)) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Edit master data */}
      <div className="pt-2">
        <h2 className="mb-3 text-base font-bold text-ink">Uredi artikel</h2>
        <ItemForm mode="edit" initial={item} />
      </div>
    </div>
  );
}

/* Inline receive (goods-in) — increments stock, optionally as a tracked batch. */
function ReceiveCard({ itemId, unit, onDone }: { itemId: string; unit: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [expiry, setExpiry] = useState('');
  const [costEur, setCostEur] = useState('');
  const [busy, setBusy] = useState(false);

  async function receive() {
    const q = parseFloat(qty) || 0;
    if (q <= 0) return;
    setBusy(true);
    try {
      await api.inventory.receive({
        itemId, quantity: q,
        batchNo: batchNo.trim() || undefined,
        expiry: expiry.trim() || undefined,
        costMinor: costEur ? Math.round((parseFloat(costEur) || 0) * 100) : undefined,
      });
      setQty(''); setBatchNo(''); setExpiry(''); setCostEur(''); setOpen(false);
      onDone();
    } finally { setBusy(false); }
  }

  if (!open) {
    return <div><Button tone="info" onClick={() => setOpen(true)}>+ Prejem zaloge</Button></div>;
  }
  return (
    <Card className="border-brandring p-4">
      <h2 className="mb-3 text-base font-bold text-ink">Prejem zaloge</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label={`Količina (${unit})`} value={qty} onChange={setQty} required />
        <NumberField label="Nabavna cena/kos (€)" value={costEur} onChange={setCostEur} hint="neobvezno" />
        <TextField label="Št. šarže" value={batchNo} onChange={setBatchNo} mono placeholder="neobvezno" />
        <TextField label="Rok uporabe" value={expiry} onChange={setExpiry} type="date" />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button tone="neutral" onClick={() => setOpen(false)}>Prekliči</Button>
        <Button tone="go" onClick={receive} disabled={busy || !(parseFloat(qty) > 0)}>{busy ? <Spinner /> : 'Knjiži prejem'}</Button>
      </div>
    </Card>
  );
}
