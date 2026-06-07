/**
 * e-Invoicing port (Master Blueprint §10, §13).
 *
 * Legal e-invoicing differs by jurisdiction and is on different clocks:
 *   - Croatia (Fiskalizacija 2.0): mandatory B2B since 2026-01-01. A-SPRINT's
 *     ~100 Croatian customers are affected today.
 *   - Slovenia (eSLOG 2.0 / Peppol, EN 16931): mandatory from 2028.
 *
 * We model each outbound legal transmission as a channel that can (1) BUILD the
 * jurisdiction-specific document from our invoice and (2) TRANSMIT it to the
 * authority/network, returning the authority reference (HR JIR/ZKI, or a Peppol
 * message id). The domain depends only on this interface; the protocol details
 * live in adapters and can evolve without touching invoicing.
 */

export type EInvoiceChannelId = 'hr_fiscalization' | 'si_eslog_peppol';

export interface InvoiceForEInvoice {
  id: string;
  kind: 'invoice' | 'credit_note' | string;
  number: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  reverseCharge: boolean;
  vatNote: string | null;
  supplier: { name: string; country: string; vatId: string | null };
  customer: { name: string; country: string; vatId: string | null; address: string | null };
  netMinor: string;
  vatMinor: string;
  grossMinor: string;
  lines: Array<{ description: string; quantity: string; netMinor: string; vatRatePct: string; vatMinor: string }>;
  vatBreakdown: Array<{ ratePct: string; reverseCharge: boolean; netMinor: string; vatMinor: string }>;
}

export interface BuiltDocument {
  format: string; // 'HR-FISKAL', 'eSLOG2.0', 'UBL'
  payload: string; // the generated XML (or canonical string)
}

export interface TransmitResult {
  authorityRef: string; // JIR/ZKI for HR; Peppol message id for SI
}

export interface EInvoiceChannel {
  readonly id: EInvoiceChannelId;
  build(invoice: InvoiceForEInvoice): Promise<BuiltDocument>;
  /** Sign + transmit the built document; throws TransientIntegrationError on retryable failures. */
  transmit(invoice: InvoiceForEInvoice, doc: BuiltDocument): Promise<TransmitResult>;
}

export const EINVOICE_CHANNELS = 'EINVOICE_CHANNELS';
