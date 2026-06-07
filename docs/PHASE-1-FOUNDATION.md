# Phase 1 — Foundation (Milestone Report)

Status: **complete**. This document follows the required structure: what was built, why it was built this way, what comes next, and documentation updates.

---

## 1. What was built

A working modular-monolith foundation implementing every item in the Phase 1 scope.

**Repository & stack.** pnpm monorepo: `packages/shared` (dependency-free domain core) + `apps/api` (NestJS modular monolith) + `db` (SQL migrations/seed) + `docs`. Stack: TypeScript, NestJS 10, PostgreSQL 16, node-postgres, `jose` (OIDC), class-validator, helmet. CI runs the core tests, applies migrations against a real Postgres service, and builds.

**Domain core (verified — `packages/shared`).**
- `money.ts` — integer minor units as `bigint`; exact decimal multiplication (round-half-away), percentage, and remainder-safe `allocate` (never loses a cent).
- `roles.ts` — the PRD §14 RBAC matrix with `hasPermission` / `permissionsFor`.
- `sequence.ts` — gapless document numbering logic (per-tenant, per-type, yearly reset, refuses to move backwards).
- `audit-hash.ts` — SHA-256 hash-chain with `appendEntry` / `verifyChain` and tamper detection.
- `tenant-context.ts` — `AsyncLocalStorage` request context (tenant/user/roles).
- `domain/*` — enums (as const unions), customer/asset types and invariants.
- **15/15 unit tests pass** via `node --experimental-strip-types packages/shared/test/run.ts`.

**Database schema (`db/migrations/0001_foundation.sql`).** Tenants, users, memberships, locations, customers, assets, time-bounded asset links, document counters, hash-chained append-only audit log (UPDATE/DELETE blocked by rule), transactional outbox, AI interaction/suggestion provenance, and encrypted integration credentials. **RLS is enabled and forced** on every tenant-scoped table via a `tenant_isolation` policy keyed on `app.current_tenant_id()`, plus a least-privilege `workshop_app` role.

**Authentication & multi-tenancy.** `AuthTenantMiddleware` verifies the OIDC bearer token against the IdP JWKS, resolves the user by token subject, verifies an **active membership** for the requested tenant, loads that membership's roles, and binds the request context. `PgService.withTenant` opens a transaction, sets `app.current_tenant_id` and the `workshop_app` role with `SET LOCAL`, so **RLS enforces isolation even if application code forgets a filter**.

**Audit logging.** `AuditService.append` locks the tenant's latest audit row `FOR UPDATE`, computes the next chained hash via the shared core, and inserts an append-only row — all inside the caller's transaction.

**Minimax integration foundation.** Anti-corruption `MinimaxPort`, a `MinimaxHttpAdapter` performing real authenticated HTTP with an idempotency key and transient/permanent error classification, a mapper from our `Customer` to the Minimax partner shape, and an outbox handler that writes the Minimax partner id back.

**AI Gateway foundation.** Provider-agnostic `AiGatewayService` with an **EU residency guard** (blocks PII to non-EU providers unless a DPA flag is set), provenance logging to `ai_interactions`, and human-in-the-loop `recordSuggestion` / `recordDecision`. A config-driven `HttpLlmProvider` sits behind the `LLM_PROVIDER` token.

**Outbox worker.** Standalone process that claims due rows with `FOR UPDATE SKIP LOCKED`, dispatches to registered handlers by event type, and applies exponential backoff with dead-lettering.

**First vertical (Customers).** `POST/GET /customers` → service → repository, where a single transaction writes the customer, appends the audit entry, and enqueues `minimax.partner.upsert`. This proves the connected core end-to-end.

---

## 2. Why it was built this way

- **RLS + forced policies** make tenant isolation a database invariant, not a coding convention — the highest-leverage safety decision in a shared-schema multi-tenant SaaS (Architecture §3.3).
- **Dependency-free, tested domain core** means the parts where mistakes cost money or legal standing (rounding, gapless numbering, audit integrity, permissions) are proven by execution and reused verbatim by the web client — the concrete payoff of the TypeScript/shared-types stack decision (Architecture §9).
- **Transactional outbox + idempotent worker** guarantees that no external system (Minimax, e-invoicing) can ever block the workshop, while still delivering events exactly once in intent (Architecture §1.5, §6; Master Blueprint §6).
- **Hash-chained, append-only audit** gives tamper-evidence for financial/compliance events that regulators and disputes require (Master Blueprint §8).
- **Anti-corruption ports** keep Minimax's quirks (and Seyfor's lack of integration support) from leaking into the domain and keep the ledger swappable (Master Blueprint §9).
- **AI behind a residency-guarded gateway with provenance** enforces GDPR data-residency and the human-in-the-loop rule structurally, not by policy alone (Master Blueprint §5, §8).
- **Tenant derived from a verified membership** closes the most common multi-tenant auth hole (trusting a client-supplied tenant id).

---

## 3. What comes next (Phase 2 — Work Orders & the bay)

1. **Work Order aggregate + state machine** (PRD §4.4): statuses, lines (labour/part/sublet/kit/fee/core), clock on/off → real labour cost; digital *Delovni nalog* replacing the paper form.
2. **Offline-first bay PWA**: open job, clock on/off, add lines, attach photos; sync queue + conflict resolution (the hardest invariant — resourced as its own track).
3. **Inventory foundation**: stock reservation/decrement on issue; manual goods receipt (OCR receipt comes with the AI feature).
4. **Invoice issuance vertical** wired to the gapless counter + audit + outbox → Minimax push, with SI-domestic VAT and intra-EU reverse-charge flagged for human confirmation.
5. **The one MVP AI feature** chosen by the Phase-0 spike (voice intake vs delivery-note OCR), built on the AI Gateway already in place.
6. **Architecture tests in CI** asserting module boundaries; an integration test that proves RLS rejects cross-tenant reads.

This keeps us on the roadmap's critical path to the MVP goal: A-SPRINT running 30 days zero-paper with invoices the accountant accepts in Minimax.

---

## 4. Documentation updates

- Added this milestone report (`docs/PHASE-1-FOUNDATION.md`) and the repository `README.md` (build/run, verification, layout).
- No change required to the Master Blueprint, PRD, Architecture or Roadmap: the implementation follows them as approved. The three Phase-0 `[ASSUMPTION]` items remain open and unblocking for this phase — stack confirmed as the documented TypeScript default; EUR-only and greenfield-vs-Odoo are not yet exercised by foundation code.
