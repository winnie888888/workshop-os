'use client';

import { createLocalCollection, newId } from './local-store';

/*
 * Predračuni (estimates) — types, totals and persistence. The page only calls
 * `quoteStore` + `quoteTotals`. To go live, back the store with /quotes and let
 * "Pretvori v nalog" call the real work-order create (already wired via api when
 * a customer is selected; otherwise a clearly-marked demo link).
 */

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'converted';

export interface QuoteLine {
  id: string;
  description: string;
  qty: string;          // input-friendly strings
  unitPriceEur: string;
  vatRatePct: string;
}

export interface Quote {
  id: string;
  createdAt: string;
  number: string;
  customerId?: string;
  customerName: string;
  vehicle: string;
  lines: QuoteLine[];
  note: string;
  status: QuoteStatus;
  workOrderId?: string;
}

export const quoteStore = createLocalCollection<Quote>('wos.quotes.v1');

export function newQuoteLine(): QuoteLine {
  return { id: newId('ql'), description: '', qty: '1', unitPriceEur: '', vatRatePct: '22' };
}

export function makeQuote(): Quote {
  return {
    id: newId('quote'),
    createdAt: new Date().toISOString(),
    number: `PR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
    customerName: '',
    vehicle: '',
    lines: [newQuoteLine()],
    note: '',
    status: 'draft',
  };
}

export function quoteTotals(lines: QuoteLine[]): { netMinor: number; vatMinor: number; grossMinor: number } {
  let net = 0, vat = 0;
  for (const l of lines) {
    const q = parseFloat((l.qty || '0').replace(',', '.')) || 0;
    const p = parseFloat((l.unitPriceEur || '0').replace(',', '.')) || 0;
    const r = parseFloat((l.vatRatePct || '0').replace(',', '.')) || 0;
    const lineNet = q * p;
    net += lineNet;
    vat += lineNet * r / 100;
  }
  return { netMinor: Math.round(net * 100), vatMinor: Math.round(vat * 100), grossMinor: Math.round((net + vat) * 100) };
}

export function quoteStatusLabel(s: QuoteStatus): string {
  return s === 'draft' ? 'osnutek' : s === 'sent' ? 'poslan' : s === 'accepted' ? 'sprejet' : 'pretvorjen';
}
