/**
 * Customer & Asset domain types (PRD §4.2, §4.3) + small, pure invariants.
 * Heavy persistence lives in the API repositories; this is the shared shape
 * and the validation that must hold regardless of transport.
 */

import { AssetType, CustomerType } from "./enums";

export interface Customer {
  id: string;
  tenantId: string;
  code: string | null;
  name: string;
  type: CustomerType;
  country: string; // ISO 3166-1 alpha-2
  address: string | null;
  postCode: string | null;
  city: string | null;
  /**
   * Mobilna številka za SMS obvestila (Customer Portal / SMS). 0030.
   * Opcijsko, da ne zlomi obstoječih konstruktorjev, ki je (še) ne nastavljajo;
   * API in UI ga uporabljata, kjer obstaja.
   */
  phone?: string | null;
  vatLiable: boolean;
  vatId: string | null; // e.g. SI12345678
  /** VAT-id validation state (Phase 4C). Gates EU reverse charge. */
  vatIdValidated?: boolean;
  vatIdValidationSource?: 'vies' | 'manual' | null;
  vatIdValidatedAt?: string | null;
  taxId: string | null;
  registrationNo: string | null;
  currency: string; // ISO 4217
  paymentTermsDays: number;
  discountPct: string; // decimal string, e.g. "0" or "5.5"
  priceListId: string | null;
  einvoiceCapable: boolean;
  peppolId: string | null;
  minimaxPartnerId: string | null;
  notes: string | null;
  status: "active" | "inactive";
}

export interface Asset {
  id: string;
  tenantId: string;
  customerId: string;
  fleetId: string | null;
  type: AssetType;
  plate: string;
  countryOfPlate: string; // ISO 3166-1 alpha-2
  vin: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  odometerLast: number | null;
  engineHoursLast: number | null;
  tecdocTypeId: string | null;
  status: "active" | "sold" | "scrapped";
}

/** Normalise a plate for storage/uniqueness: upper-case, strip spaces/dashes. */
export function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/[\s-]+/g, "");
}

/**
 * Validate a VAT ID shape for EU members (country prefix + body). This is a
 * cheap structural check only; semantic validity is confirmed via VIES.
 */
export function isStructurallyValidVatId(vatId: string): boolean {
  return /^[A-Z]{2}[0-9A-Z]{2,12}$/.test(vatId.toUpperCase());
}

/** Basic VIN structural check (17 chars, no I/O/Q). VIN absent is allowed. */
export function isStructurallyValidVin(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin.toUpperCase());
}

export function assertCustomerInvariants(c: Pick<Customer, "country" | "currency" | "vatLiable" | "vatId" | "paymentTermsDays">): void {
  if (!/^[A-Z]{2}$/.test(c.country)) throw new Error(`Invalid country code: ${c.country}`);
  if (!/^[A-Z]{3}$/.test(c.currency)) throw new Error(`Invalid currency: ${c.currency}`);
  if (c.paymentTermsDays < 0 || c.paymentTermsDays > 365) {
    throw new Error(`Implausible payment terms: ${c.paymentTermsDays}`);
  }
  if (c.vatLiable && c.vatId && !isStructurallyValidVatId(c.vatId)) {
    throw new Error(`Malformed VAT ID: ${c.vatId}`);
  }
}
