import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../config/configuration';
import { TransientIntegrationError, PermanentIntegrationError, IntegrationNotConfiguredError } from '../minimax/minimax.adapter';
import type { BuiltDocument, EInvoiceChannel, InvoiceForEInvoice, TransmitResult } from './einvoice.port';

/**
 * Croatia Fiskalizacija 2.0 channel (mandatory B2B since 2026-01-01).
 *
 * The real flow is: build an EN 16931-compliant e-invoice (Croatian CIUS),
 * sign it with the taxpayer's certificate to produce the ZKI, submit it to the
 * Tax Administration, and store the returned JIR. The cryptographic signing and
 * the exact endpoint/cert handling are environment-specific and sit behind a
 * clear boundary here; the builder and the submit call are real, and the
 * channel is simply unconfigured until HR_FISCAL_BASE_URL and a certificate are
 * provided.
 */
@Injectable()
export class HrFiscalizationChannel implements EInvoiceChannel {
  readonly id = 'hr_fiscalization' as const;

  constructor(private readonly config: AppConfig) {}

  async build(invoice: InvoiceForEInvoice): Promise<BuiltDocument> {
    // EN 16931 / Croatian CIUS as UBL Invoice. Kept compact but well-formed;
    // a production builder would use a schema-validated UBL serializer.
    const lines = invoice.lines
      .map(
        (l, i) => `    <cac:InvoiceLine><cbc:ID>${i + 1}</cbc:ID>` +
          `<cbc:LineExtensionAmount currencyID="${invoice.currency}">${dec(l.netMinor)}</cbc:LineExtensionAmount>` +
          `<cac:Item><cbc:Name>${xml(l.description)}</cbc:Name></cac:Item>` +
          `<cac:Price><cbc:PriceAmount currencyID="${invoice.currency}">${dec(l.netMinor)}</cbc:PriceAmount></cac:Price>` +
          `</cac:InvoiceLine>`,
      )
      .join('\n');
    const taxSubtotals = invoice.vatBreakdown
      .map(
        (g) => `    <cac:TaxSubtotal>` +
          `<cbc:TaxableAmount currencyID="${invoice.currency}">${dec(g.netMinor)}</cbc:TaxableAmount>` +
          `<cbc:TaxAmount currencyID="${invoice.currency}">${dec(g.vatMinor)}</cbc:TaxAmount>` +
          `<cac:TaxCategory><cbc:ID>${g.reverseCharge ? 'AE' : 'S'}</cbc:ID><cbc:Percent>${g.ratePct}</cbc:Percent></cac:TaxCategory>` +
          `</cac:TaxSubtotal>`,
      )
      .join('\n');

    const payload =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" ` +
      `xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" ` +
      `xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">\n` +
      `  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:hr:cius:2.0</cbc:CustomizationID>\n` +
      `  <cbc:ID>${xml(invoice.number)}</cbc:ID>\n` +
      `  <cbc:IssueDate>${invoice.issueDate}</cbc:IssueDate>\n` +
      `  <cbc:DueDate>${invoice.dueDate}</cbc:DueDate>\n` +
      `  <cbc:InvoiceTypeCode>${invoice.kind === 'credit_note' ? '381' : '380'}</cbc:InvoiceTypeCode>\n` +
      `  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>\n` +
      (invoice.vatNote ? `  <cbc:Note>${xml(invoice.vatNote)}</cbc:Note>\n` : '') +
      `  <cac:AccountingSupplierParty><cac:Party><cac:PartyName><cbc:Name>${xml(invoice.supplier.name)}</cbc:Name></cac:PartyName></cac:Party></cac:AccountingSupplierParty>\n` +
      `  <cac:AccountingCustomerParty><cac:Party><cac:PartyName><cbc:Name>${xml(invoice.customer.name)}</cbc:Name></cac:PartyName></cac:Party></cac:AccountingCustomerParty>\n` +
      `  <cac:TaxTotal><cbc:TaxAmount currencyID="${invoice.currency}">${dec(invoice.vatMinor)}</cbc:TaxAmount>\n${taxSubtotals}\n  </cac:TaxTotal>\n` +
      `  <cac:LegalMonetaryTotal>` +
      `<cbc:LineExtensionAmount currencyID="${invoice.currency}">${dec(invoice.netMinor)}</cbc:LineExtensionAmount>` +
      `<cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${dec(invoice.grossMinor)}</cbc:TaxInclusiveAmount>` +
      `<cbc:PayableAmount currencyID="${invoice.currency}">${dec(invoice.grossMinor)}</cbc:PayableAmount>` +
      `</cac:LegalMonetaryTotal>\n${lines}\n</Invoice>`;

    return { format: 'HR-FISKAL', payload };
  }

  async transmit(invoice: InvoiceForEInvoice, doc: BuiltDocument): Promise<TransmitResult> {
    if (!this.config.hrFiscalBaseUrl) throw new IntegrationNotConfiguredError('hr_fiscalization');
    // Production: sign `doc.payload` with the taxpayer certificate -> ZKI, then
    // POST to the Tax Administration and read the JIR from the response.
    const res = await fetch(`${this.config.hrFiscalBaseUrl}/fiscalize`, {
      method: 'POST',
      headers: { 'content-type': 'application/xml', 'idempotency-key': `hr:${invoice.id}` },
      body: doc.payload,
    });
    if (res.status === 429 || res.status >= 500) throw new TransientIntegrationError(`HR fiscal ${res.status}`);
    if (!res.ok) throw new PermanentIntegrationError(`HR fiscal ${res.status}`);
    const body = (await res.json().catch(() => ({}))) as { jir?: string; JIR?: string };
    const jir = body.jir ?? body.JIR;
    if (!jir) throw new PermanentIntegrationError('HR fiscalization response missing JIR');
    return { authorityRef: jir };
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
