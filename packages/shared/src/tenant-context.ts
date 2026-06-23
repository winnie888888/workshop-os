/**
 * Cross-cutting primitives: ID generation and tenant context.
 *
 * Tenant context uses AsyncLocalStorage so that every DB call within a request
 * can set the Postgres RLS GUC (app.current_tenant_id) without threading the
 * tenant id through every function signature (Architecture Blueprint §1.4, §3.2).
 *
 * Uses node builtins; runnable, not tsc-checked offline.
 */

import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

export function newId(): string {
  return randomUUID();
}

export interface RequestContext {
  tenantId: string;
  userId: string | null;
  roles: string[];
  requestId: string;
  /**
   * The authenticated CUSTOMER, set only on customer-portal requests. Staff
   * requests leave this undefined. The portal service filters every query by it,
   * so a customer is isolated within a tenant as well as across tenants (RLS).
   */
  customerId?: string | null;
  /**
   * Konkretne pravice API ključa, set IZKLJUČNO ko je zahtevek avtenticiran z
   * API ključem, ki nosi permissions[] (per-permission scoping). Človeški
   * zahtevki in ključi samo z vlogami pustijo to neopredeljeno. Ko je
   * opredeljeno, guard dovoli pravico, če je v tem naboru ALI izhaja iz vlog —
   * tako ostane nazaj-združljivo (ključ samo z vlogami se obnaša kot prej).
   */
  keyPermissions?: string[];
}

const als = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return als.run(ctx, fn);
}

export function getContext(): RequestContext {
  const ctx = als.getStore();
  if (!ctx) throw new Error("No request context bound (tenant scope missing)");
  return ctx;
}

export function tryGetContext(): RequestContext | undefined {
  return als.getStore();
}

export function currentTenantId(): string {
  return getContext().tenantId;
}
