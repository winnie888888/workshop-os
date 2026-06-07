import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../config/configuration';
import { TransientIntegrationError, PermanentIntegrationError, IntegrationNotConfiguredError } from '../minimax/minimax.adapter';
import type { BuiltDocument, EInvoiceChannel, InvoiceForEInvoice, TransmitResult } from './einvoice.port';

/**
 * Slovenia eSLOG 2.0 / Peppol channel (mandatory from 2028, EN 16931).
 *
 * Slovenia's e-SLOG 2.0 is EN 16931-compliant and exchanged over Peppol. We
 * build an EN 16931 UBL document and transmit it through a Peppol Access Point.
 * The builder is shared in spirit with the HR channel (both are EN 16931), but
 * the customization id and the transport differ, which is exactly why each
 * jurisdiction is its own channel rather than a flag.
 */
@Injectable()
export class SiEslogPeppolChannel implements EInvoiceChannel {
  readonly id = 'si_eslog_peppol' as const;

  constructor(private readonly config: AppConfig) {}

  async build(invoice: InvoiceForEInvoice): Promise<BuiltDocument> {
    const taxSubtotals = invoice.vatBreakdown
      .map(
        (g) => `    <cac:TaxSubtotal>` +
          `<cbc:TaxableAmount currencyID="${invoice.currency}">${dec(g.netMinor)}</cbc:TaxableAmount>` +
          `<cbc:TaxAmount currencyID="${invoice.currency}">${dec(g.vatMinor)}</cbc:TaxAmount>` +
          `<cac:TaxCategory><cbc:ID>${g.reverseCharge ? 'AE' : 'S'}</cbc:ID><cbc:Percent>${g.ratePct}</cbc:Percent>` +
          `<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory>` +
          `</cac:TaxSubtotal>`,
      )
      .join('\n');

    const payload =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" ` +
      `xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" ` +
      `xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">\n` +
      `  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:eslog:2.0</cbc:CustomizationID>\n` +
      `  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>\n` +
      `  <cbc:ID>${xml(invoice.number)}</cbc:ID>\n` +
      `  <cbc:IssueDate>${invoice.issueDate}</cbc:IssueDate>\n` +
      `  <cbc:DueDate>${invoice.dueDate}</cbc:DueDate>\n` +
      `  <cbc:InvoiceTypeCode>${invoice.kind === 'credit_note' ? '381' : '380'}</cbc:InvoiceTypeCode>\n` +
      `  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>\n` +
      (invoice.vatNote ? `  <cbc:Note>${xml(invoice.vatNote)}</cbc:Note>\n` : '') +
      `  <cac:AccountingSupplierParty><cac:Party>` +
      `<cac:PartyName><cbc:Name>${xml(invoice.supplier.name)}</cbc:Name></cac:PartyName>` +
      (invoice.supplier.vatId ? `<cac:PartyTaxScheme><cbc:CompanyID>${xml(invoice.supplier.vatId)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : '') +
      `</cac:Party></cac:AccountingSupplierParty>\n` +
      `  <cac:AccountingCustomerParty><cac:Party>` +
      `<cac:PartyName><cbc:Name>${xml(invoice.customer.name)}</cbc:Name></cac:PartyName>` +
      (invoice.customer.vatId ? `<cac:PartyTaxScheme><cbc:CompanyID>${xml(invoice.customer.vatId)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : '') +
      `</cac:Party></cac:AccountingCustomerParty>\n` +
      `  <cac:TaxTotal><cbc:TaxAmount currencyID="${invoice.currency}">${dec(invoice.vatMinor)}</cbc:TaxAmount>\n${taxSubtotals}\n  </cac:TaxTotal>\n` +
      `  <cac:LegalMonetaryTotal>` +
      `<cbc:LineExtensionAmount currencyID="${invoice.currency}">${dec(invoice.netMinor)}</cbc:LineExtensionAmount>` +
      `<cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${dec(invoice.grossMinor)}</cbc:TaxInclusiveAmount>` +
      `<cbc:PayableAmount currencyID="${invoice.currency}">${dec(invoice.grossMinor)}</cbc:PayableAmount>` +
      `</cac:LegalMonetaryTotal>\n</Invoice>`;

    return { format: 'eSLOG2.0', payload };
  }

  async transmit(invoice: InvoiceForEInvoice, doc: BuiltDocument): Promise<TransmitResult> {
    if (!this.config.peppolApBaseUrl) throw new IntegrationNotConfiguredError('si_eslog_peppol');
    // Production: hand the UBL to a Peppol Access Point for AS4 transmission and
    // read back the transmission/message id.
    const res = await fetch(`${this.config.peppolApBaseUrl}/as4/outbound`, {
      method: 'POST',
      headers: { 'content-type': 'application/xml', 'idempotency-key': `peppol:${invoice.id}` },
      body: doc.payload,
    });
    if (res.status === 429 || res.status >= 500) throw new TransientIntegrationError(`Peppol AP ${res.status}`);
    if (!res.ok) throw new PermanentIntegrationError(`Peppol AP ${res.status}`);
    const body = (await res.json().catch(() => ({}))) as { messageId?: string };
    if (!body.messageId) throw new PermanentIntegrationError('Peppol AP response missing messageId');
    return { authorityRef: body.messageId };
  }
}

function dec(minor: string): string {
  const neg = minor.startsWith('-');
  const d = (neg ? minor.slice(1) : minor).padStart(3, '0');
  return `${neg ? '-' : ''}${d.slice(0, -2)}.${d.slice(-2)}`;
}
function xml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
}
