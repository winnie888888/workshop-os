# AI Workshop OS — Foundation → Operational Loop → Warehouse → Customer Portal

An AI-native operating system for commercial-vehicle and fleet workshops (anchor pilot: A-SPRINT d.o.o., Slovenia). This repository implements **Phase 1 — Foundation**, **Phase 2 — Work Orders, the Bay, and Inventory**, **Phase 3 — Invoicing, VAT, AR & e-Invoicing**, the **Frontend Phase** (Mechanic, Advisor, and Owner interfaces), and **Phase 4A — Production Readiness** (real OIDC login, file uploads, search, profiles, sessions) of the approved Implementation Roadmap, following the Master Blueprint, PRD v1.0 and Architecture Blueprint.

## What is in the repository

**Phase 1 — Foundation.** Multi-tenant architecture on Postgres row-level security (enabled and forced), the dependency-free tested domain core (money, RBAC, gapless numbering, hash-chained audit, tenant context), OIDC authentication with tenant resolved from a verified membership, the transactional outbox with an idempotent worker, the Minimax anti-corruption integration, and the residency-guarded AI Gateway.

**Phase 2 — Work Orders, the Bay, and Inventory.** Fleets, vehicles, and time-bounded tractor/trailer pairings; the digital *Delovni nalog* (work order) with a guarded state machine, priced lines, mechanic time tracking, and a printable nalog document; an inventory foundation with per-location stock levels and an immutable movement ledger; and the offline-first sync layer (append-only change feed + idempotent mutation replay) that the bay tablet uses to work without connectivity. The genuinely tricky rules — the state machine, time costing, stock movement, and line pricing — live in the shared core and are covered by tests.

**Phase 3 — Invoicing, VAT, AR & e-Invoicing.** A deterministic VAT engine (domestic SI VAT, intra-EU B2B reverse charge with VAT-ID validation gating, non-EU export, EU B2C); invoice issuance from work orders billing standard book labour, with per-rate VAT grouping, gapless numbering, and database-enforced immutability of issued documents; credit notes that reverse without mutating; accounts receivable with oldest-first payment allocation and aging; Minimax invoice synchronisation; an e-invoicing architecture with a Croatia Fiskalizacija 2.0 channel (live) and a Slovenia eSLOG 2.0 / Peppol channel (2028), both EN 16931-aligned UBL behind a channel port; and financial reporting (VAT report, AR aging, revenue) plus the owner's clocked-vs-standard-vs-billed labour and profitability insights, where AI explains the deterministic anomaly flags as a human-in-the-loop suggestion. Migration 0004 adds these tables under forced row-level security. The VAT engine, invoice math, AR allocation/aging, and labour-variance flags are all in the shared core and covered by tests.

**Frontend Phase — Mechanic, Advisor, and Owner interfaces (`apps/web`).** A real Next.js 14 (App Router) application implementing three of the five approved UX specifications as working screens connected to the API above through a single typed client (Bearer token + `X-Tenant-Id`). The mechanic interface is an offline-first, gloves-and-sunlight shop-floor tool (job list, the job screen with the big clock and four field actions, capture sheets, "Me"), writing through the idempotent sync queue. The advisor interface is the intake desk (Today board, command bar, paper-Delovni-nalog intake, work-order workspace, invoice issue/detail, receivables). The owner dashboard is the analytical health view (revenue/VAT/AR tiles, aging, and the per-job clocked-vs-standard-vs-billed labour insight with the AI narrative). The industrial design system, the typed API client, and the offline spine live in `apps/web/src`. See `docs/FRONTEND-PHASE.md`.

**Phase 4A — Production Readiness.** The capabilities that separate a demo from software a mechanic uses daily: a real OpenID Connect Authorization Code + PKCE login flow (replacing the development sign-in) with proactive, skew-aware token refresh; a complete file-storage architecture (a storage port with an S3-compatible production adapter using presigned URLs and a local-filesystem development adapter) and an attachments API with a presign-then-complete workflow; the mechanic photo and voice-note upload workflows (audio plus on-device transcript), with offline fallback; a global search endpoint behind the advisor command bar with tested query classification and ranking; a customer-specific receivables endpoint reusing the tested aging core; user profile management (display name, phone, language) and session management (per-device visibility and revocation); and audit logging of every upload action on the existing hash-chain. Five new tested modules joined the shared core (PKCE pinned to the RFC 7636 vector, session policy, attachment policy, storage keys, search), and migration `0005` adds the attachments, profile, and session schema. See `docs/PHASE-4A-PRODUCTION-READINESS.md`.

**Phase 4B — Close the Operational Loop.** The advisor surfaces that complete the intake-to-invoice loop the readiness review found missing: create/edit customer and create/edit vehicle screens, a customer hub (vehicles, balance, next actions), an interactive work-order line editor (add/edit/remove labour and part lines, each priced server-side by the shared `Pricing` core — the browser computes no money), and a mechanic-assignment control that finally populates a mechanic's bay list. Thin, pattern-following backend extensions support these: `PATCH /customers/:id` and `PATCH /assets/:id` (partial updates that re-validate the same invariants as create and re-sync Minimax), `POST /work-orders/:id/assign`, `GET /work-orders/mechanics`, and line `PATCH`/`DELETE` (reusing `Pricing.priceLine` and `recomputeTotals`, releasing reserved stock on delete, refusing to edit issued or stock-reserved lines in place). No financial logic was recreated. The result is a whole loop: a new customer and vehicle, an opened work order, priced labour and parts, an assigned mechanic, completed work, an issued invoice, and Minimax synchronisation via the existing outbox. See `docs/PHASE-4B-CLOSE-THE-LOOP.md`.

**Phase 4C — Dry Run Fixes.** The fixes a simulated end-to-end A-SPRINT job surfaced. VAT-id validation now has a real home: migration `0006` adds `vat_id_validated` and its provenance (source, timestamp, actor, note) under a constraint that keeps the state honest; a VAT-id validation port carries a real VIES REST adapter (used when configured) and an audited manual-confirmation fallback; the advisor validates a VAT id from the customer hub, and every action is written to the audit chain. This unlocks the gate the (already-correct) VAT engine enforced — so a cross-border EU B2B invoice reverse-charges only once the VAT id is validated, while a domestic invoice keeps standard Slovenian VAT. A tested shared helper (`Vat.parseVatId` / `vatIdCountryMatches`) catches a VAT id whose country does not match the customer's. The seed now provisions a mechanic membership so assignment and clocking work on a fresh tenant, and HRK is removed from all currency choices (Croatia is on the euro). The executable dry run passes all eleven steps for both a Slovenian domestic and a Croatian cross-border customer. See `docs/PHASE-4C-DRY-RUN-FIXES.md`.

## Technology stack

TypeScript · NestJS 10 (modular monolith) · PostgreSQL 16 (RLS, pgcrypto, citext) · node-postgres · `jose` (OIDC) · class-validator · helmet · pnpm workspaces. The web client (later phase) reuses `@workshop/shared` so domain rules live in exactly one place.

## Verify the domain core now (no install needed)

The dependency-free domain core runs and tests under Node 22's TypeScript type-stripping:

```bash
node --experimental-strip-types packages/shared/test/run.ts
# 15/15 passed.
```

This proves the money math, gapless numbering, audit hash-chain (including tamper detection) and RBAC — the parts where correctness is non-negotiable.

## Build & run the full stack (requires network for dependencies)

```bash
pnpm install
docker compose up -d db            # local Postgres
cp .env.example .env               # then edit OIDC_* and AI_* for your environment
node apps/api/scripts/migrate.js   # apply migrations
psql "$DATABASE_URL" -f db/seed/0001_seed_tenant.sql   # optional pilot seed
pnpm --filter @workshop/api build
pnpm --filter @workshop/api start  # API on :3000
pnpm --filter @workshop/api worker # outbox worker (separate process)
```

> Note: the framework layer (NestJS/pg/jose) needs `pnpm install`, so it is not compiled inside the offline build sandbox. It is real production source, wired end-to-end, and built by CI (`.github/workflows/ci.yml`).

## Layout

```
packages/shared      # dependency-free domain core + types (tested)
apps/api/src
  config             # typed, fail-fast configuration
  common             # db (RLS tx), audit, outbox, errors, events, health
  auth               # OIDC verify + tenant binding + RBAC guard
  modules/customers  # first vertical: HTTP -> service -> repo (+ audit + outbox)
  integrations/minimax  # ACL port + HTTP adapter + outbox handler
  ai                 # provider-agnostic gateway + residency guard + provenance
  workers            # outbox worker (standalone process)
db/migrations        # SQL migrations
db/seed              # pilot seed
docs                 # phase documentation
```

See `docs/PHASE-1-FOUNDATION.md` for what was built, why, and what comes next.
