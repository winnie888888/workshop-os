/**
 * Roles & Permissions — RBAC (PRD §14, Master Blueprint §7).
 *
 * Authorization is enforced server-side; the tenant scope is derived from the
 * access token, never the client. RLS is defence-in-depth beneath this.
 *
 * Note: we model roles and permissions as `const` objects + union types
 * (not TS enums) so this module is executable under Node type-stripping and
 * usable verbatim by both the API and the (future) web client.
 */

export const Role = {
  Owner: "owner",
  Advisor: "advisor",
  Mechanic: "mechanic",
  Warehouse: "warehouse",
  Accountant: "accountant",
  ReadOnly: "read_only",
  Admin: "admin",
  FleetManager: "fleet_manager", // external portal user (enterprise)
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Permission = {
  WorkOrderCreate: "workorder:create",
  WorkOrderEdit: "workorder:edit",
  WorkOrderLineTime: "workorder:line_time", // mechanics: add lines / time only
  InvoiceIssue: "invoice:issue",
  PricingEdit: "pricing:edit",
  StockReceive: "stock:receive",
  // Warehouse permissions (Phase 5.0). Receiving already exists; adjusting and
  // transferring stock, and managing purchasing, are distinct capabilities so
  // they can be granted independently of one another.
  StockAdjust: "stock:adjust",       // stocktake corrections + standalone adjustments
  StockTransfer: "stock:transfer",   // move stock between locations
  PurchaseManage: "purchase:manage", // create/approve purchase orders
  AnalyticsFinancialView: "analytics:financial_view",
  TenantManage: "tenant:manage",
  IntegrationsManage: "integrations:manage",
  AiApproveFinancial: "ai:approve_financial", // approve AI output touching money/VAT
  CustomerManage: "customer:manage",
  // Employee Time & Attendance (Phase 9). Clocking yourself is implicit for any
  // member; these gate the management capabilities. AttendanceManage covers
  // audited corrections to official records; LeaveApprove gates approving leave;
  // TravelOrderManage gates creating/closing travel orders and service vehicles;
  // PayrollExport gates generating the accountant/payroll exports.
  AttendanceManage: "attendance:manage",
  LeaveApprove: "leave:approve",
  TravelOrderManage: "travel_order:manage",
  PayrollExport: "payroll:export",
  RentalManage: "rental:manage", // create rental vehicles, reserve, handover/return, invoice
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

/** Authoritative capability matrix. Absence = deny. */
const MATRIX: Record<Role, ReadonlySet<Permission>> = {
  [Role.Owner]: new Set([
    Permission.WorkOrderCreate,
    Permission.WorkOrderEdit,
    Permission.WorkOrderLineTime,
    Permission.InvoiceIssue,
    Permission.PricingEdit,
    Permission.StockReceive,
    Permission.StockAdjust,
    Permission.StockTransfer,
    Permission.PurchaseManage,
    Permission.AnalyticsFinancialView,
    Permission.AiApproveFinancial,
    Permission.CustomerManage,
    Permission.AttendanceManage,
    Permission.LeaveApprove,
    Permission.TravelOrderManage,
    Permission.PayrollExport,
    Permission.RentalManage,
  ]),
  [Role.Advisor]: new Set([
    Permission.WorkOrderCreate,
    Permission.WorkOrderEdit,
    Permission.WorkOrderLineTime,
    Permission.InvoiceIssue,
    Permission.AiApproveFinancial,
    Permission.CustomerManage,
    Permission.TravelOrderManage,
    Permission.LeaveApprove,
    Permission.RentalManage,
  ]),
  [Role.Mechanic]: new Set([Permission.WorkOrderLineTime]),
  [Role.Warehouse]: new Set([
    Permission.StockReceive,
    Permission.StockAdjust,
    Permission.StockTransfer,
    Permission.PurchaseManage,
  ]),
  [Role.Accountant]: new Set([
    Permission.InvoiceIssue,
    Permission.AnalyticsFinancialView,
    Permission.AiApproveFinancial,
    Permission.PayrollExport,
  ]),
  [Role.ReadOnly]: new Set<Permission>([]),
  [Role.Admin]: new Set([
    Permission.WorkOrderCreate,
    Permission.WorkOrderEdit,
    Permission.WorkOrderLineTime,
    Permission.InvoiceIssue,
    Permission.PricingEdit,
    Permission.StockReceive,
    Permission.StockAdjust,
    Permission.StockTransfer,
    Permission.PurchaseManage,
    Permission.AnalyticsFinancialView,
    Permission.TenantManage,
    Permission.IntegrationsManage,
    Permission.AiApproveFinancial,
    Permission.CustomerManage,
    Permission.AttendanceManage,
    Permission.LeaveApprove,
    Permission.TravelOrderManage,
    Permission.PayrollExport,
    Permission.RentalManage,
  ]),
  [Role.FleetManager]: new Set<Permission>([]), // portal-only; no console permissions
};

export function hasPermission(roles: Role[], permission: Permission): boolean {
  return roles.some((r) => MATRIX[r]?.has(permission));
}

export function permissionsFor(roles: Role[]): Permission[] {
  const out = new Set<Permission>();
  for (const r of roles) MATRIX[r]?.forEach((p) => out.add(p));
  return [...out];
}

export function isValidRole(value: string): value is Role {
  return (Object.values(Role) as string[]).includes(value);
}
