# Deployment Guide — Workshop OS

*Audience: the engineer performing the first real deployment. This guide is grounded
in what the repository actually defines — its scripts, its config surface, and its
CI — not in generic advice.*

---

## 1. Architecture recap (so the deployment makes sense)

Workshop OS is a pnpm monorepo with three deployable concerns. The **API** is a
NestJS application (`apps/api`) that connects to Postgres and runs the HTTP server;
it also runs an **outbox worker** (`pnpm start:worker`) that drains integration
events (Minimax, e-invoice) reliably. The **web app** is a Next.js 14 App Router
application (`apps/web`) that talks to the API over `NEXT_PUBLIC_API_BASE_URL`. The
**shared core** (`packages/shared`) is dependency-free TypeScript consumed by both.
Postgres is the system of record and enforces tenant isolation through row-level
security; the API connects as a least-privilege role at runtime.

A natural first deployment is therefore: Postgres (managed, EU region), the API and
worker on a Node host or container platform, and the web app on Vercel. The API can
also run on Vercel as serverless functions, but a long-running host is simpler for
the outbox worker.

---

## 2. GitHub repository readiness

The repository already contains a CI workflow (`.github/workflows/ci.yml`) with two
jobs: one runs the dependency-free shared-core tests on Node 22 for every push and
pull request, and one provisions a real Postgres 16 service container and points a
`DATABASE_URL` at it for the API build. This means the runtime database gate the
audit identified is already scaffolded in CI and will exercise the migrations and
backend against a live Postgres the moment the repository runs on GitHub.

Readiness actions before pushing:
- Confirm `.gitignore` excludes `node_modules`, `.next`, `.env`, and `.storage`
  (it does).
- Ensure no secrets are committed; all secrets come from environment variables
  (verified — the only secrets referenced are env-sourced).
- Protect the `main` branch and require the CI checks to pass on pull requests.
- Tag the current state (for example `v0.9.0-pilot-rc`) so the pilot runs from a
  known commit.

---

## 3. Vercel deployment readiness (web app)

The Next config (`apps/web/next.config.js`) enables React strict mode and, crucially,
`transpilePackages: ['@workshop/shared']`, so the shared core compiles correctly in
the Vercel build. The web app reads exactly one public variable.

Vercel project settings:
- Root directory: `apps/web` (or set the monorepo build to target it).
- Build command: the default `next build` works; the install step must run at the
  workspace root so `@workshop/shared` resolves (`pnpm install` at repo root).
- Environment variable: `NEXT_PUBLIC_API_BASE_URL` → the public origin of the API.
- For the **demo** deployment specifically, the app runs entirely on in-memory
  fixtures (the demo client short-circuits all API calls), so a demo Vercel
  deployment needs no backend and no database — set the demo flag and deploy.

---

## 4. Environment variable inventory

These are the variables the API actually reads (from `apps/api/src/config`). The
web app reads only `NEXT_PUBLIC_API_BASE_URL`.

### Core runtime
- `NODE_ENV` — `production` in real environments.
- `PORT` — API listen port (default 3000).
- `DATABASE_URL` — Postgres connection (owner/superuser for migrations).
- `DB_APP_ROLE` — least-privilege runtime role (default `workshop_app`); the API
  switches to this via `SET LOCAL ROLE` for every tenant transaction.

### Authentication (OIDC; EU-resident IdP)
- `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URI` — token verification.
- `OIDC_CLIENT_ID`, `OIDC_SCOPES`, `OIDC_REDIRECT_URI`, `OIDC_DISCOVERY_URL` —
  public PKCE client for the web app.

### Public origins
- `PUBLIC_API_BASE_URL`, `WEB_APP_BASE_URL`, `PORTAL_BASE_URL` — used for signed
  URLs and redirect origins.

### AI gateway (must be EU-resident when processing PII)
- `AI_RESIDENCY` — keep `eu`.
- `AI_PROVIDER_BASE_URL`, `AI_DEFAULT_MODEL` — empty today (fixture provider); set
  to wire the real model.

### Storage (attachments, photos, PDFs)
- `STORAGE_DRIVER` — `local` or `s3`.
- Local: `LOCAL_STORAGE_DIR`, `LOCAL_STORAGE_SIGNING_SECRET`.
- S3-compatible: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`.
- `SIGNED_URL_TTL_SECONDS` — signed URL lifetime.

### Portal
- `PORTAL_TOKEN_SECRET` — signs customer-portal sessions.

### Integrations
- `VIES_BASE_URL` — EU VAT validation.
- `HR_FISCAL_BASE_URL`, `PEPPOL_AP_BASE_URL` — fiscalisation / PEPPOL access point.

### Outbox worker
- `OUTBOX_POLL_MS`, `OUTBOX_MAX_ATTEMPTS` — polling cadence and retry ceiling.

Action: copy `.env.example` to the deployment secret store and fill every value;
the `.env.example` already documents each with sensible defaults.

---

## 5. Database migration execution plan

The runner (`apps/api/scripts/migrate.js`) is forward-only and idempotent: it
creates `app.schema_migrations`, applies each `db/migrations/NNNN_*.sql` in order
inside its own transaction, and skips files already recorded. Re-running is safe.

Execution sequence for a fresh environment:
1. Provision Postgres (managed, EU region). Create the database and an owner role.
2. Create the least-privilege runtime role to match `DB_APP_ROLE`
   (`workshop_app`); the migrations `GRANT` it the needed table privileges.
3. Run `DATABASE_URL=<owner-url> pnpm migrate`. This applies 0001 through 0016.
4. Verify with `SELECT filename FROM app.schema_migrations ORDER BY filename;` —
   expect sixteen rows, `0001_foundation` through `0016_rental_management`.
5. Spot-check that row-level security is active:
   `SELECT relname FROM pg_class WHERE relrowsecurity;` should list the tenant
   tables.
6. Point the API's runtime `DATABASE_URL` at the *least-privilege* role for normal
   operation; keep the owner URL only for future migrations.

Forward-only means there are no down-migrations by design; rollback is handled at
the data layer (Section 8), not by reversing DDL.

---

## 6. Staging deployment checklist

1. Postgres provisioned (EU); owner and `workshop_app` roles created.
2. Migrations applied; sixteen rows in `schema_migrations`; RLS confirmed active.
3. API deployed with the full env set; `/health` returns OK.
4. Outbox worker running (`pnpm start:worker`).
5. Web app deployed with `NEXT_PUBLIC_API_BASE_URL` → staging API.
6. OIDC pointed at a staging realm; a test login completes via `/auth/callback`.
7. Storage configured (S3 bucket or local dir) and a test upload round-trips.
8. Run the **runtime verification gate** (see Staging Guide): create a customer,
   a vehicle, a work order, add lines and time, issue an invoice, render its PDF,
   run a rental lifecycle, and open the AI Manager dashboard — against the live
   stack, in a browser.

---

## 7. Production deployment checklist

1. All staging checks passed against a production-like dataset.
2. Secrets in a managed secret store, not in files; least-privilege DB role in use.
3. TLS everywhere; HSTS on the web and portal origins.
4. Backups configured and a restore tested (Section 8).
5. Monitoring: API uptime, DB connections, outbox depth and failure count, error
   rate. Alert on outbox events stuck past `OUTBOX_MAX_ATTEMPTS`.
6. Rate limiting / WAF in front of the public API and portal.
7. Log retention that preserves the hash-chained audit trail.
8. A tagged release and a documented rollback target (Section 8).
9. Real AI provider configured (Section 9.4) or the fixture explicitly accepted.
10. Minimax verified against the live tenant (Section 9.1).

---

## 8. Backup and rollback strategy

Because migrations are forward-only, rollback is a data-and-release concern, not a
schema-reversal concern.

**Backups.** Use the managed Postgres provider's automated daily backups plus
point-in-time recovery (PITR) with a retention window covering at least the pilot.
Take an explicit snapshot immediately before each migration run and each release.

**Application rollback.** Deployments are immutable tagged releases; rolling back the
API or web app is redeploying the previous tag. Because a newer migration may have
added columns the older code does not use, additive migrations (the pattern used
throughout — `ADD COLUMN IF NOT EXISTS`, new tables) are backward-compatible with
the prior release, so app-only rollback is safe without touching the schema.

**Data rollback.** For a bad data event, restore via PITR to just before the event.
The hash-chained audit trail helps identify the exact time and actor. Never hand-
edit official records to "undo"; prefer credit notes and corrections that preserve
the trail (the invoicing engine already supports credit notes).

**Tenant-scoped recovery.** Because every row carries `tenant_id`, a single tenant
can be exported or restored without affecting others if the provider supports
logical extraction.

---

## 9. Integration readiness checklists

### 9.1 Minimax verification checklist
- The backend emits `minimax.partner.upsert` and `minimax.invoice.upsert` outbox
  events; the mapper builds the partner and invoice payloads.
- Obtain live Minimax API credentials for a test organisation (EU).
- Map and confirm: partner (customer) fields, VAT id format, invoice line VAT
  rates, reverse-charge handling, document numbering, and currency.
- Push one test invoice end-to-end; confirm it appears correctly in Minimax and
  that the invoice→work-order traceability survives export.
- Confirm consolidated-invoice behaviour expectations (note: periodic/consolidated
  invoicing is a deferred feature; single-invoice export is what exists today).
- Define retry and failure handling using the outbox attempt ceiling.

### 9.2 Infobip integration preparation (SMS)
- The notification port exists with a stub adapter; an Infobip adapter implements
  the same port (no business-logic change required).
- Obtain Infobip account, API key, and a registered sender/number for Slovenia.
- Decide message types: portal access links, appointment reminders, ready-for-
  pickup, payment reminders (align with SMS & Communication Architecture spec).
- Build branded SMS landing pages (currently absent) for any link targets.
- Confirm GDPR/consent handling and opt-out.

### 9.3 Email provider preparation
- Same notification port; an email adapter (e.g. a transactional ESP with EU data
  residency) implements it.
- Create branded HTML email templates (currently absent): invoice delivery, portal
  invite, reminders.
- Configure SPF, DKIM, and DMARC for the sending domain.
- Decide attachments policy (invoice PDF inline vs portal link).

### 9.4 AI provider configuration checklist
- The gateway abstracts the model behind a port; today a deterministic fixture
  provider answers offline. Wiring the real model is configuration plus an adapter,
  not a redesign.
- Select an **EU-resident** model endpoint (the gateway enforces `AI_RESIDENCY=eu`
  and refuses non-EU when PII is present).
- Set `AI_PROVIDER_BASE_URL` and `AI_DEFAULT_MODEL`.
- Measure output quality per feature on real data: OCR extraction, plate reading,
  voice transcription/extraction, and the manager narrative. All are advisory or
  human-confirmed by architecture, so quality issues degrade gracefully.
- Confirm logging of `ai_interactions` and that PII handling matches policy.
