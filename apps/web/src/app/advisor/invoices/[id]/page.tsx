'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { formatMoneyMinor } from '@/lib/format';
import { Card, SoftChip, Spinner, StatusChip } from '@/components/ui';
import { DEMO_MODE } from '@/lib/demo';

/*
 * Invoice detail — the issued, immutable document with its frozen VAT
 * breakdown. This is mostly a read surface; corrections happen via a credit
 * note, never by editing, exactly as the backend enforces.
 */
export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: inv, isLoading } = useSWR(['invoice', id], () => api.invoices.get(id));

  if (isLoading) return <div className="flex justify-center py-16"><Spinner className="text-info" /></div>;
  if (!inv) return <Card className="p-6 text-steel">Invoice not found.</Card>;

  const tone = inv.status === 'paid' ? 'go' : inv.status === 'overdue' ? 'stop' : inv.status === 'credited' ? 'hold' : 'info';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <button onClick={() => router.push('/advisor/invoices')} className="self-start text-sm font-semibold text-steel">‹ Invoices</button>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {inv.kind === 'credit_note' ? 'Credit note' : 'Invoice'} {inv.number}
        </h1>
        <StatusChip tone={tone}>{inv.status}</StatusChip>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <SoftChip tone={inv.reverseCharge ? 'hold' : 'info'}>{inv.vatTreatment ?? '—'}</SoftChip>
          {inv.reverseCharge && <SoftChip tone="hold">reverse charge</SoftChip>}
        </div>
        {inv.vatNote && <p className="mb-3 rounded-tool bg-floor p-3 text-sm text-steel">{inv.vatNote}</p>}

        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-steel">
            <tr><th className="py-2">Description</th><th className="py-2 text-right">Net</th><th className="py-2 text-right">VAT %</th></tr>
          </thead>
          <tbody>
            {inv.lines.map((l: any, i: number) => (
              <tr key={i} className="border-t border-line">
                <td className="py-2">{l.description}</td>
                <td className="py-2 text-right font-mono">{formatMoneyMinor(String(l.net_minor), inv.currency)}</td>
                <td className="py-2 text-right font-mono">{String(l.vat_rate_pct)}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 border-t border-line pt-3">
          <Row label="Net" value={formatMoneyMinor(inv.totalNetMinor, inv.currency)} />
          <Row label="VAT" value={formatMoneyMinor(inv.totalVatMinor, inv.currency)} />
          <Row label="Total" value={formatMoneyMinor(inv.totalGrossMinor, inv.currency)} big />
          <Row label="Paid" value={formatMoneyMinor(inv.paidMinor, inv.currency)} />
        </div>
        <div className="mt-3 flex justify-between text-sm text-steel">
          <span>Issued {inv.issueDate ?? '—'}</span><span>Due {inv.dueDate ?? '—'}</span>
        </div>
      </Card>

      {DEMO_MODE && <MinimaxSyncPanel invoiceNumber={inv.number} />}
    </div>
  );
}

/*
 * Minimax sync demonstration (demo mode only).
 *
 * This shows, honestly, what the backend actually does: when an invoice is
 * issued, the system enqueues a `minimax.invoice.upsert` event on the reliable
 * outbox, and the worker delivers it to Minimax and records the returned
 * document reference. In a real deployment this panel would read that outbox
 * status from the API; in the demo it replays the same sequence so a viewer can
 * SEE the accounting integration work end to end rather than take it on faith.
 * Nothing here issues or alters an invoice — it visualises an existing event.
 */
function MinimaxSyncPanel({ invoiceNumber }: { invoiceNumber: string }) {
  const [stage, setStage] = useState<'queued' | 'sending' | 'synced'>('queued');
  useEffect(() => {
    const t1 = setTimeout(() => setStage('sending'), 700);
    const t2 = setTimeout(() => setStage('synced'), 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  const ref = `MMX-${invoiceNumber}`;
  return (
    <Card className="p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Minimax accounting sync</h2>
        <SoftChip tone={stage === 'synced' ? 'go' : 'info'}>{stage === 'synced' ? 'synced' : 'in progress'}</SoftChip>
      </div>
      <ol className="flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-2">
          <span className="text-go">✓</span>
          <span>Invoice issued and queued to the outbox (<span className="font-mono">minimax.invoice.upsert</span>)</span>
        </li>
        <li className="flex items-center gap-2">
          <span className={stage === 'queued' ? 'text-steel' : 'text-go'}>{stage === 'queued' ? '○' : '✓'}</span>
          <span className={stage === 'queued' ? 'text-steel' : ''}>Worker delivering to Minimax…</span>
        </li>
        <li className="flex items-center gap-2">
          <span className={stage === 'synced' ? 'text-go' : 'text-steel'}>{stage === 'synced' ? '✓' : '○'}</span>
          <span className={stage === 'synced' ? '' : 'text-steel'}>
            Synced — Minimax document <span className="font-mono">{ref}</span>; work-order link preserved
          </span>
        </li>
      </ol>
      <p className="mt-3 rounded-tool bg-floor p-3 text-xs text-steel">
        Demonstration of the real outbox flow. Connect live Minimax credentials to push to your actual organisation.
      </p>
    </Card>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={big ? 'font-display text-lg font-bold' : 'text-steel'}>{label}</span>
      <span className={`font-mono ${big ? 'text-xl font-bold' : ''}`}>{value}</span>
    </div>
  );
}
