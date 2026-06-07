'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api, ApiError } from '@/lib/api';
import { formatMoneyMinor } from '@/lib/format';
import { Button, Card, ProblemBanner, Spinner } from '@/components/ui';

/*
 * Issue invoice — a review-and-confirm surface, not a data-entry one. The VAT
 * treatment is the engine's decision (shown, not chosen) and the figures arrive
 * from the work order. The single consequential control states its irreversible
 * consequences before the advisor commits. If the treatment needs human
 * confirmation (e.g. an unvalidated EU VAT id) the backend rejects the issue and
 * we surface exactly that, so the advisor validates first rather than mis-issuing.
 */
export default function IssueInvoice() {
  const { id } = useParams<{ id: string }>(); // work order id
  const router = useRouter();
  const { data: wo, isLoading } = useSWR(['wo-issue', id], () => api.workOrders.get(id));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function issue() {
    setBusy(true); setError(null);
    try {
      const inv = await api.invoices.issue({ workOrderId: id });
      router.push(`/advisor/invoices/${inv.id}`);
    } catch (e) {
      // The VAT engine's "needs confirmation" path arrives as a 409 conflict.
      setError(e instanceof ApiError ? e.message : 'Računa ni bilo mogoče izstaviti');
      setBusy(false);
    }
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>;
  if (!wo) return <Card className="p-6 text-muted">Naloga ni mogoče najti.</Card>;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <button onClick={() => router.back()} className="self-start text-sm font-semibold text-muted">‹ Nazaj</button>
      <h1 className="text-2xl font-extrabold tracking-tight">Izstavi račun za {wo.number}</h1>

      {error && <ProblemBanner message={error} />}

      <Card className="p-5">
        <Row label="Neto" value={formatMoneyMinor(wo.totalNetMinor, wo.currency)} />
        <Row label="DDV" value={formatMoneyMinor(wo.totalVatMinor, wo.currency)} />
        <div className="my-2 border-t border-line" />
        <Row label="Skupaj" value={formatMoneyMinor(wo.totalGrossMinor, wo.currency)} big />
        <p className="mt-4 text-sm text-muted">
          Davčno obravnavo sistem določi iz stranke in dobave ter jo zamrzne na računu. Ob izstavitvi
          se dokument zaklene, pošlje v Minimax in odda kot e-račun. Izdanih računov ni mogoče
          urejati — popravki gredo prek dobropisa.
        </p>
      </Card>

      <div className="flex justify-end gap-3">
        <Button tone="neutral" onClick={() => router.back()}>Prekliči</Button>
        <Button tone="go" size="lg" onClick={issue} disabled={busy}>
          {busy ? <Spinner /> : 'Izstavi račun'}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={big ? 'text-lg font-bold text-ink' : 'text-muted'}>{label}</span>
      <span className={`num ${big ? 'text-2xl font-bold' : ''}`}>{value}</span>
    </div>
  );
}
