/**
 * Domain enums (PRD §4). Modeled as `const` objects + union types so they are
 * executable under Node type-stripping and shared verbatim with the web client.
 */

export const WorkOrderStatus = {
  Draft: "draft",
  Open: "open",
  InProgress: "in_progress",
  AwaitingApproval: "awaiting_approval",
  AwaitingParts: "awaiting_parts",
  Ready: "ready",
  Invoiced: "invoiced",
  Closed: "closed",
  OnHold: "on_hold",
  Cancelled: "cancelled",
} as const;
export type WorkOrderStatus = (typeof WorkOrderStatus)[keyof typeof WorkOrderStatus];

export const LineType = {
  Labour: "labour",
  Part: "part",
  Sublet: "sublet",
  Kit: "kit",
  Fee: "fee",
  Core: "core",
  Discount: "discount",
} as const;
export type LineType = (typeof LineType)[keyof typeof LineType];

export const InvoiceType = {
  Invoice: "invoice",
  CreditNote: "credit_note",
  Proforma: "proforma",
} as const;
export type InvoiceType = (typeof InvoiceType)[keyof typeof InvoiceType];

/** VAT treatment outcomes (Master Blueprint §10 decision table). */
export const VatTreatment = {
  StandardSiVat: "standard_si_vat",
  ReverseChargeEu: "reverse_charge_eu",
  IntraEuSupply: "intra_eu_supply",
  ExportZero: "export_zero",
  OutsideScopeOrSi: "outside_scope_or_si",
} as const;
export type VatTreatment = (typeof VatTreatment)[keyof typeof VatTreatment];

export const AssetType = {
  Tractor: "tractor",
  Truck: "truck",
  Van: "van",
  Trailer: "trailer",
  Other: "other",
} as const;
export type AssetType = (typeof AssetType)[keyof typeof AssetType];

export const CustomerType = {
  Individual: "individual",
  Company: "company",
} as const;
export type CustomerType = (typeof CustomerType)[keyof typeof CustomerType];

/** EU member states (for VAT routing). Non-exhaustive of the world, exhaustive of EU. */
export const EU_COUNTRIES = new Set<string>([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
]);

export function isEuCountry(code: string): boolean {
  return EU_COUNTRIES.has(code.toUpperCase());
}
