'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { portalApi } from '@/lib/portal-api';
import { PortalCard, Money, StatusPill } from '../../portal-ui';

/*
 * Invoice detail. It restates the totals and payment status, explains the VAT
 * treatment, and gives the one action a customer most wants from an invoice on
 * their phone: download the PDF. The PDF is a direct link to the server endpoint
 * (it streams a real generated PDF), opened in a new tab so the phone's browser
 * shows its native "save to Files / share" controls — which is how a customer
 * saves or forwards the document. We deliberately use a plain anchor here rather
 * than the API client, because the browser must fetch the binary itself.
 */
function paymentLabel(status: string): string {
  return status === 'paid' ? 'Paid'
    : status === 'partly_paid' ? 'Partly paid'
    : status === 'overdue' ? 'Overdue' : 'Unpaid';
}

export default function PortalInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: inv, isLoading } = useSWR(id ? ['portal-invoice', id] : null, () => portalApi.invoice(id).catch(() => null));

  if (isLoading) return <p className="text-sm text-steel">Loading…</p>;
  if (!inv || !inv.id) return <PortalCard><p className="text-sm text-steel">Invoice not found.</p></PortalCard>;

  const pdfUrl = portalApi.invoicePdfUrl(inv.id);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/portal/invoices" className="text-sm font-semibold text-info">‹ All invoices</Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">{inv.number ? `Invoice ${inv.number}` : 'Invoice'}</h1>
          <p className="text-sm text-steel">{inv.issueDate ?? '—'}{inv.dueDate ? ` · due ${inv.dueDate}` : ''}</p>
        </div>
        <StatusPill status={inv.paymentStatus} label={paymentLabel(inv.paymentStatus)} />
      </div>

      <PortalCard>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between"><span className="text-steel">Net</span><span className="font-mono"><Money minor={inv.totalNetMinor} currency={inv.currency} /></span></div>
          <div className="flex justify-between"><span className="text-steel">VAT</span><span className="font-mono"><Money minor={inv.totalVatMinor} currency={inv.currency} /></span></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><span>Total</span><span><Money minor={inv.totalGrossMinor} currency={inv.currency} /></span></div>
          {Number(inv.paidMinor) > 0 && (
            <div className="flex justify-between text-go"><span>Paid</span><span className="font-mono"><Money minor={inv.paidMinor} currency={inv.currency} /></span></div>
          )}
        </div>
        {inv.reverseCharge && (
          <p className="mt-3 rounded-lg bg-floor p-3 text-xs text-steel">
            {inv.vatNote || 'Reverse charge — VAT to be accounted for by the recipient.'}
          </p>
        )}
      </PortalCard>

      {/* The download. A plain anchor so the browser fetches the binary itself. */}
      <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
        className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-info text-base font-bold text-white active:scale-[0.98]">
        Download PDF
      </a>
      <p className="text-center text-xs text-steel">Opens the invoice as a PDF you can save or forward.</p>
    </div>
  );
}
