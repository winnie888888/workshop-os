'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { portalApi } from '@/lib/portal-api';
import { PortalCard, Money, StatusPill } from '../portal-ui';

/*
 * Invoice list. Each invoice shows its number, date, the gross amount, and a
 * payment-status pill (paid / partly paid / overdue / unpaid) computed on the
 * server from the paid amount and due date. Tapping opens the detail, where the
 * customer can download the PDF. A reverse-charge invoice (a cross-border EU
 * customer) is flagged so the zero VAT is not mistaken for an error.
 */
function paymentLabel(status: string): string {
  return status === 'paid' ? 'Paid'
    : status === 'partly_paid' ? 'Partly paid'
    : status === 'overdue' ? 'Overdue' : 'Unpaid';
}

export default function PortalInvoices() {
  const { data: invoices, isLoading } = useSWR('portal-invoices', () => portalApi.invoices().catch(() => []));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-extrabold">Invoices</h1>

      {isLoading ? (
        <p className="text-sm text-steel">Loading…</p>
      ) : (invoices ?? []).length === 0 ? (
        <PortalCard><p className="text-sm text-steel">No invoices yet.</p></PortalCard>
      ) : (
        <div className="flex flex-col gap-3">
          {invoices!.map((i: any) => (
            <Link key={i.id} href={`/portal/invoices/${i.id}`}>
              <PortalCard>
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="font-bold">{i.number ? `Invoice ${i.number}` : 'Invoice'}</p>
                    <p className="text-xs text-steel">{i.issueDate ?? '—'}{i.dueDate ? ` · due ${i.dueDate}` : ''}</p>
                  </div>
                  <StatusPill status={i.paymentStatus} label={paymentLabel(i.paymentStatus)} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-steel">{i.reverseCharge ? 'Reverse charge (0% VAT)' : 'incl. VAT'}</span>
                  <span className="text-lg font-bold"><Money minor={i.totalGrossMinor} currency={i.currency} /></span>
                </div>
              </PortalCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
