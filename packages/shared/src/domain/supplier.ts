/**
 * Supplier domain (Warehouse 5.1). A supplier is the source of stock: who we buy
 * parts from, in what currency, on what terms, with what typical lead time. The
 * invariants here are the same kind of guardrails the Customer domain enforces —
 * a country is two letters, a currency three, terms and lead times are
 * non-negative, and a VAT id (if given) is at least structurally plausible — so
 * a malformed supplier can never reach the database, whether it arrives from the
 * UI or, later, from an OCR'd supplier invoice.
 *
 * Pure and transport-independent: no I/O, fully unit-testable.
 */

import { isStructurallyValidVatId } from "./customer";

export type SupplierStatus = "active" | "inactive";

export interface Supplier {
  id: string;
  tenantId: string;
  code: string | null;
  name: string;
  country: string; // ISO 3166-1 alpha-2
  vatId: string | null;
  currency: string; // ISO 4217
  paymentTermsDays: number;
  defaultLeadTimeDays: number;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  minimaxPartnerId: string | null;
  status: SupplierStatus;
}

export class SupplierError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "SupplierError";
  }
}

/**
 * Validate the parts of a supplier that must always hold. Called by the service
 * on both create and update (against the merged result), so an edit can never
 * leave a supplier in a state create would have rejected.
 */
export function assertSupplierInvariants(
  s: Pick<Supplier, "name" | "country" | "currency" | "vatId" | "paymentTermsDays" | "defaultLeadTimeDays">,
): void {
  if (!s.name || s.name.trim().length === 0) {
    throw new SupplierError("Supplier name is required");
  }
  if (!/^[A-Za-z]{2}$/.test(s.country)) {
    throw new SupplierError("Country must be a 2-letter ISO code");
  }
  if (!/^[A-Za-z]{3}$/.test(s.currency)) {
    throw new SupplierError("Currency must be a 3-letter ISO code");
  }
  if (!Number.isInteger(s.paymentTermsDays) || s.paymentTermsDays < 0) {
    throw new SupplierError("Payment terms must be a non-negative whole number of days");
  }
  if (!Number.isInteger(s.defaultLeadTimeDays) || s.defaultLeadTimeDays < 0) {
    throw new SupplierError("Lead time must be a non-negative whole number of days");
  }
  if (s.vatId && !isStructurallyValidVatId(s.vatId)) {
    throw new SupplierError("VAT id is not structurally valid");
  }
}
