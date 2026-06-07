# README for the Programmer — Workshop OS

This file is the quick orientation for a developer receiving the repository for
technical review or deployment. Fuller detail lives in `README.md` and in `docs/`.

## 1. What the project is

Workshop OS is an AI-native SaaS platform for commercial-vehicle and truck
workshops (initially Slovenia and the wider CEE / Western Balkans region; the
anchor customer is A-SPRINT d.o.o.). It runs the whole operation as one connected
system: customers link to vehicles, vehicles to work orders, work orders to
inventory and to invoices, and invoices to accounting (Minimax). AI features assist
throughout — OCR delivery notes, licence-plate recognition, voice work orders, and
an advisory "AI Workshop Manager" — but every AI action is advisory or
human-confirmed and never mutates an official record on its own.

It is a **pnpm monorepo** with three parts:
- `apps/web` — Next.js 14 (App Router) front end. React + SWR + Tailwind. Deps are
  deliberately minimal (next, react, react-dom, swr only).
- `apps/api` — NestJS back end on PostgreSQL. Multi-tenant with **forced row-level
  security**; the runtime connects as a least-privilege role per tenant transaction.
- `packages/shared` — dependency-free, fully tested TypeScript domain core (money,
  VAT, invoicing, rental charges, insights, etc.). This is where correctness-critical
  logic lives and is proven by tests.
- `db/migrations` — forward-only SQL migrations (0001–0016).

## 2. Main modules

Backend feature modules include: customers, assets (vehicles), work orders,
inventory & stock operations, suppliers, purchasing & receiving, invoicing + AR +
e-invoice, the VAT engine, attachments/photos, the customer portal, OCR delivery
notes, plate recognition, employee time & attendance (Slovenian-compliant), travel
orders, voice work orders, the AI Workshop Manager (advisory analytics), and
vehicle rental. Cross-cutting subsystems: an AI gateway (provider-abstracted, EU
residency enforced), auth (OIDC), a reliable outbox/worker for integrations
(Minimax, e-invoice), and storage (local or S3).

## 3. How to install dependencies

```bash
# Node 22+ and pnpm 9+ required.
pnpm install        # at the repo root; installs the whole workspace
```

## 4. How to run tests

```bash
pnpm test:shared    # runs the dependency-free shared-core suite (246 tests)
```

The shared suite runs on Node's native TypeScript stripping
(`node --experimental-strip-types`) with no build step. CI
(`.github/workflows/ci.yml`) additionally spins up a real Postgres 16 and builds
the API against it.

## 5. How to run the demo

The demo runs the **entire app in the browser with no backend and no database**. A
single flag plants a signed-in A-SPRINT session and routes all API calls to
in-memory fixtures.

```bash
# locally:
NEXT_PUBLIC_DEMO=1 pnpm --filter @workshop/web dev
# then open the printed localhost URL — you land straight on the launcher, no login.
```

## 6. How to deploy the demo to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Set **Root Directory** = `apps/web`.
3. Add one environment variable: `NEXT_PUBLIC_DEMO=1`.
4. Deploy. The resulting URL opens directly to the signed-in demo — shareable to any
   phone, no setup. (Full detail: `docs/DEMO-VERCEL-DEPLOYMENT.md`.)

For a **real** (non-demo) deployment, see `docs/DEPLOYMENT-GUIDE.md`: provision
Postgres, run `pnpm migrate`, deploy the API + outbox worker, and deploy the web app
pointed at the API.

## 7. Important environment variables

Demo needs only `NEXT_PUBLIC_DEMO=1`. A real deployment uses (see `.env.example`):
- **Database:** `DATABASE_URL` (owner role for migrations), `DB_APP_ROLE`
  (least-privilege runtime role, e.g. `workshop_app`).
- **Auth (OIDC, EU IdP):** `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URI`,
  `OIDC_CLIENT_ID`, `OIDC_REDIRECT_URI`, `OIDC_SCOPES`.
- **Web → API:** `NEXT_PUBLIC_API_BASE_URL`.
- **AI gateway (EU-resident):** `AI_RESIDENCY=eu`, `AI_PROVIDER_BASE_URL`,
  `AI_DEFAULT_MODEL` (empty = offline fixture provider).
- **Storage:** `STORAGE_DRIVER` (`local`/`s3`) and the matching `LOCAL_STORAGE_*` or
  `S3_*` keys; `SIGNED_URL_TTL_SECONDS`.
- **Portal:** `PORTAL_TOKEN_SECRET`. **Outbox:** `OUTBOX_POLL_MS`,
  `OUTBOX_MAX_ATTEMPTS`. **Integrations:** `VIES_BASE_URL`, `PEPPOL_AP_BASE_URL`.

## 8. Current readiness status

Every check that can run without a live runtime is green: **246/246** shared tests
pass, all **142** backend files parse-clean, all frontend imports resolve, the
A-SPRINT dry run passes **87/87**, migrations are sequential 0001–0016, and there are
no forbidden frontend dependencies. Security foundations are verified: tenant
isolation is enforced by Postgres RLS (16 force-RLS tables), audit logging is
hash-chained across 16 modules, and the schema carries 83 CHECK / 148 FK / 87 unique
constraints.

Honest caveat: the deterministic core is proven by execution, but the framework
layer (NestJS services, SQL, React UI) is verified by parse-check and cross-checks,
**not yet executed against a live Postgres / HTTP / browser**, because the build
environment had no network or database. The single most valuable next step is a
**staging deployment** that applies the migrations and walks each workflow live
(see `docs/STAGING-GUIDE.md`). The real EU AI model and the Minimax/SMS/email
adapters are abstracted behind ports but not yet wired to live providers.

**Status summary:** demo deployment and commercial presentation — ready now;
staging — ready now; A-SPRINT pilot — ready after a staging pass with a human in the
loop on invoicing/Minimax; unattended production — pending the ordered hardening
list in `docs/PRODUCTION-READINESS-REPORT.md`.
