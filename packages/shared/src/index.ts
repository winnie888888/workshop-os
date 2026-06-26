/**
 * Shared package barrel. The web client and the API both import from here so
 * domain rules and types are defined exactly once (Architecture §9.1: the
 * shared-types advantage that tilts the stack choice to TypeScript).
 */

export * as Money from "./money";
export * as Audit from "./audit-hash";
export * as Sequence from "./sequence";
export * from "./roles";
export * from "./tenant-context";
export * from "./domain/enums";
export * from "./domain/customer";
export * from "./domain/zddv1-compliance";
export * from "./domain/supplier";
export * as PurchaseOrders from "./domain/purchase-order";
export * as WorkOrderState from "./domain/workorder-state";
export * as TimeTracking from "./domain/time-tracking";
export * as Inventory from "./domain/inventory";
export * as Valuation from "./domain/valuation";
export * as Pricing from "./domain/workorder-line";
export * as Vat from "./domain/vat";
export * as Invoicing from "./domain/invoice";
export * as Receivables from "./domain/receivables";
export * as LabourAnalysis from "./domain/labour-analysis";
export * as Pkce from "./auth/pkce";
export * as PortalToken from "./auth/portal-token";
export * as SessionPolicy from "./auth/session-policy";
export * as AttachmentPolicy from "./storage/attachment-policy";
export * as StorageKey from "./storage/object-key";
export * as Search from "./search/query";
export * as OcrExtraction from "./domain/ocr-extraction";
export * as OcrMatching from "./domain/ocr-matching";
export * as PlateRecognition from "./domain/plate-recognition";
export * as PlateMatch from "./domain/plate-match";
export * as VoiceWorkOrder from "./domain/voice-workorder";
export * as WorkshopInsights from "./domain/workshop-insights";
export * as RentalAvailability from "./domain/rental-availability";
export * as RentalCharges from "./domain/rental-charges";
export * as Attendance from "./domain/attendance";
export * as TravelConsistency from "./domain/travel-consistency";

/** RFC 9457 problem+json shape, used by API error responses. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Array<{ field: string; message: string }>;
}
