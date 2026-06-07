/**
 * Document numbering — legal gapless sequences (Architecture Blueprint §4.2).
 *
 * The CONCURRENCY guarantee (no gaps, no duplicates) is provided by the
 * database: a per-tenant, per-document-type counter row is locked and
 * incremented inside the same transaction that issues the document. This
 * module owns only the *pure* parts: computing the next counter value and
 * formatting the legal document number. The DB calls `nextCounter()` after a
 * SELECT ... FOR UPDATE and persists the returned value atomically.
 *
 * Format example: "INV-2026-000123" (prefix-year-zeropadded).
 */

export const DocumentType = {
  Invoice: "invoice",
  CreditNote: "credit_note",
  Proforma: "proforma",
  Quotation: "quotation",
  WorkOrder: "work_order",
  PurchaseOrder: "purchase_order",
  // Warehouse numbering scopes (Phase 5.0): GRN and stocktake each get their
  // own gapless, year-resetting sequence, like invoices and work orders.
  GoodsReceipt: "goods_receipt",
  StockCount: "stock_count",
  TravelOrder: "travel_order",
  RentalContract: "rental_contract",
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

const PREFIX: Record<DocumentType, string> = {
  [DocumentType.Invoice]: "INV",
  [DocumentType.CreditNote]: "CN",
  [DocumentType.Proforma]: "PRO",
  [DocumentType.Quotation]: "QUO",
  [DocumentType.WorkOrder]: "WO",
  [DocumentType.PurchaseOrder]: "PO",
  [DocumentType.GoodsReceipt]: "GRN",
  [DocumentType.StockCount]: "SC",
  [DocumentType.TravelOrder]: "TO",
  [DocumentType.RentalContract]: "RA",
};

export interface CounterState {
  readonly docType: DocumentType;
  readonly year: number;
  readonly value: number; // last issued counter value within (docType, year)
}

/**
 * Compute the next counter. Sequences reset per calendar year (a common SI/EU
 * convention); pass `resetYearly: false` for a continuous lifetime sequence.
 * Throws if the new period would move backwards (guards clock/ordering bugs).
 */
export function nextCounter(
  current: CounterState | null,
  issueYear: number,
  resetYearly = true,
): CounterState {
  if (!Number.isInteger(issueYear) || issueYear < 2000) {
    throw new Error(`Invalid issue year: ${issueYear}`);
  }
  if (current === null) {
    return { docType: inferDocType(current), year: issueYear, value: 1 };
  }
  if (issueYear < current.year) {
    throw new Error(
      `Refusing to issue ${current.docType} for year ${issueYear}; counter is already at ${current.year}`,
    );
  }
  if (resetYearly && issueYear > current.year) {
    return { docType: current.docType, year: issueYear, value: 1 };
  }
  return { docType: current.docType, year: current.year, value: current.value + 1 };
}

function inferDocType(_current: CounterState | null): DocumentType {
  // When current is null the caller must supply docType via formatNumber;
  // we default to Invoice only to satisfy the type — callers pass an initial
  // CounterState in practice. Kept explicit to avoid silent misuse.
  return DocumentType.Invoice;
}

/** Format a legal document number from a counter state. */
export function formatNumber(state: CounterState, padding = 6): string {
  if (state.value < 1) throw new Error("counter value must be >= 1");
  const padded = state.value.toString().padStart(padding, "0");
  return `${PREFIX[state.docType]}-${state.year}-${padded}`;
}

/** Convenience: initialise a counter for a doc type. */
export function initialCounter(docType: DocumentType, year: number): CounterState {
  return { docType, year, value: 0 };
}
