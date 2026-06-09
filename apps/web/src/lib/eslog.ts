/*
 * e-invoice XML serializer — produces a UBL 2.1 Invoice aligned with EN 16931
 * (SIST EN 16931-1), which is one of the official mappings of the Slovenian
 * e-SLOG 2.0 standard (the others being UN/CEFACT CII and the native GZS XML).
 * UBL 2.1 is also the syntax used by PEPPOL BIS Billing 3.0.
 *
 * IMPORTANT — this is a DRAFT export for inspection / hand-off, not a certified
 * e-invoice. Before production use it must be validated against the official
 * e-SLOG 2.0 / EN 16931 schema (XSD + Schematron) and submitted through a
 * registered provider (UJP / PEPPOL access point, or Minimax / Pantheon), which
 * also handle the native e-SLOG XML conversion and, for cash payments, fiscal
 * verification. The function is intentionally dependency-free and pure so it can
 * later run unchanged on the server.
 */

function dec(minor: unknown): string {
  return ((Number(minor) || 0) / 100).toFixed(2);
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** EN 16931 VAT category code: AE = reverse charge, S = standard, Z = zero rated. */
function vatCategory(reverseCharge: boolean, ratePct: number): string {
  if (reverseCharge) return 'AE';
  if (ratePct > 0) return 'S';
  return 'Z';
}

export interface EslogIssuer {
  name?: string;
  address?: string;
  vatId?: string;
  iban?: string;
}

/** Build a UBL 2.1 (EN 16931) Invoice document string from a demo/real invoice projection. */
export function buildInvoiceUbl(inv: any, company: EslogIssuer | null, customer: any): string {
  const cur = inv?.currency || 'EUR';
  const number = inv?.number ?? '';
  const issue = inv?.issueDate ?? '';
  const due = inv?.dueDate ?? '';
  const service = inv?.serviceDate ?? inv?.deliveryDate ?? issue;
  const rc = !!inv?.reverseCharge;
  const ref = String(number).replace(/\D/g, '');

  const supName = company?.name ?? '';
  const supAddr = company?.address ?? '';
  const supVat = company?.vatId ?? '';
  const iban = (company?.iban ?? '').replace(/\s+/g, '');

  const buyerName = customer?.name ?? '';
  const buyerVat = customer?.vatId ?? '';
  const buyerAddr = customer?.address ?? '';
  const buyerCity = [customer?.postCode, customer?.city].filter(Boolean).join(' ');
  const buyerCountry = customer?.country ?? 'SI';

  // VAT breakdown → TaxSubtotal[]; fall back to a single subtotal from the totals.
  const breakdown: any[] = Array.isArray(inv?.vatBreakdown) && inv.vatBreakdown.length
    ? inv.vatBreakdown
    : [{ rate_pct: '22', reverse_charge: rc, net_minor: inv?.totalNetMinor ?? '0', vat_minor: inv?.totalVatMinor ?? '0' }];

  const taxSubtotals = breakdown.map((b) => {
    const rate = Number(b.rate_pct) || 0;
    const cat = vatCategory(!!b.reverse_charge || rc, rate);
    const exemption = cat === 'AE'
      ? '\n        <cbc:TaxExemptionReasonCode>VATEX-EU-AE</cbc:TaxExemptionReasonCode>\n        <cbc:TaxExemptionReason>Reverse charge / Obrnjena davcna obveznost</cbc:TaxExemptionReason>'
      : '';
    return `    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${cur}">${dec(b.net_minor)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${cur}">${dec(b.vat_minor)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${cat}</cbc:ID>
        <cbc:Percent>${rate}</cbc:Percent>${exemption}
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`;
  }).join('\n');

  // Lines; fall back to a single summary line when the projection has none.
  const rawLines: any[] = Array.isArray(inv?.lines) ? inv.lines : [];
  const lines = rawLines.length ? rawLines : [{
    description: 'Storitev po racunu',
    qty: 1,
    unit_price_minor: inv?.totalNetMinor ?? '0',
    net_minor: inv?.totalNetMinor ?? '0',
    vat_rate_pct: Number(breakdown[0]?.rate_pct) || 0,
  }];

  const invoiceLines = lines.map((l, i) => {
    const qty = Number(l.qty ?? l.quantity ?? 1) || 1;
    const disc = Number(l.discount_pct ?? l.discountPct) || 0;
    const unitNet = l.unit_price_minor ?? l.unitPriceMinor ?? l.net_minor ?? 0;
    const net = l.net_minor != null
      ? l.net_minor
      : Math.round(qty * (Number(unitNet) || 0) * (1 - disc / 100));
    const rate = Number(l.vat_rate_pct ?? l.vatRatePct) || 0;
    const cat = vatCategory(rc, rate);
    return `  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${qty}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${cur}">${dec(net)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${esc(l.description ?? l.name ?? 'Postavka')}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${cat}</cbc:ID>
        <cbc:Percent>${rate}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${cur}">${dec(unitNet)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`;
  }).join('\n');

  const paymentMeans = iban
    ? `\n  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
    <cbc:PaymentID>SI00 ${ref}</cbc:PaymentID>
    <cac:PayeeFinancialAccount><cbc:ID>${esc(iban)}</cbc:ID></cac:PayeeFinancialAccount>
  </cac:PaymentMeans>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- EN 16931 / UBL 2.1 e-invoice (e-SLOG 2.0-compatible semantics). DRAFT: validate against the official e-SLOG 2.0 / EN 16931 schema and submit via a registered provider (UJP/PEPPOL, Minimax, Pantheon) before production use. -->
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ID>${esc(number)}</cbc:ID>
  <cbc:IssueDate>${esc(issue)}</cbc:IssueDate>
  <cbc:DueDate>${esc(due)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>${inv?.kind === 'credit_note' ? '381' : '380'}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${cur}</cbc:DocumentCurrencyCode>
  <cac:InvoicePeriod><cbc:StartDate>${esc(service)}</cbc:StartDate><cbc:EndDate>${esc(service)}</cbc:EndDate></cac:InvoicePeriod>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyName><cbc:Name>${esc(supName)}</cbc:Name></cac:PartyName>
    <cac:PostalAddress><cbc:StreetName>${esc(supAddr)}</cbc:StreetName><cac:Country><cbc:IdentificationCode>SI</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    <cac:PartyTaxScheme><cbc:CompanyID>${esc(supVat)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
    <cac:PartyLegalEntity><cbc:RegistrationName>${esc(supName)}</cbc:RegistrationName></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cac:PartyName><cbc:Name>${esc(buyerName)}</cbc:Name></cac:PartyName>
    <cac:PostalAddress><cbc:StreetName>${esc(buyerAddr)}</cbc:StreetName><cbc:CityName>${esc(buyerCity)}</cbc:CityName><cac:Country><cbc:IdentificationCode>${esc(buyerCountry)}</cbc:IdentificationCode></cac:Country></cac:PostalAddress>${buyerVat ? `\n    <cac:PartyTaxScheme><cbc:CompanyID>${esc(buyerVat)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ''}
    <cac:PartyLegalEntity><cbc:RegistrationName>${esc(buyerName)}</cbc:RegistrationName></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingCustomerParty>${paymentMeans}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${cur}">${dec(inv?.totalVatMinor)}</cbc:TaxAmount>
${taxSubtotals}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${cur}">${dec(inv?.totalNetMinor)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${cur}">${dec(inv?.totalNetMinor)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${cur}">${dec(inv?.totalGrossMinor)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${cur}">${dec(inv?.totalGrossMinor)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${invoiceLines}
</Invoice>
`;
}
