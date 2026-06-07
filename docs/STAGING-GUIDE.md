# Staging Guide — Workshop OS

*Purpose: stand up a staging environment and, through it, discharge the one gate no
offline check can: proving the framework layer (NestJS services, SQL, React UI)
works against a live database, a live HTTP server, and a real browser. Everything
the offline build verified — 246 shared tests, 142 parse-clean backend files, an
87-check dry run — is necessary but not sufficient; staging is where it becomes
sufficient.*

---

## 1. Why staging is the pivotal step

Throughout the build, correctness-critical logic was proven by execution, but the
framework layer was verified structurally — by parse-checking, import resolution,
route and column cross-checks — because the offline environment had no network, no
Postgres, and no build toolchain. That is an honest and deliberate boundary, not a
shortcut, but it means a class of issues can only surface at runtime: a query that
references a column that moved, an RLS policy that is stricter or looser than
intended, an OIDC round-trip that misconfigures a redirect, a PDF that renders
malformed bytes. Staging exists to find these cheaply, before the pilot.

---

## 2. Bring-up sequence

1. **Database.** Provision Postgres 16 in an EU region. Create the database, an
   owner role, and the least-privilege `workshop_app` role. (The CI workflow's
   Postgres 16 service container is a working reference for versions and settings.)
2. **Migrate.** `DATABASE_URL=<owner-url> pnpm migrate`. Confirm sixteen rows in
   `app.schema_migrations` and that `pg_class.relrowsecurity` lists the tenant
   tables.
3. **API.** Deploy `apps/api` with the full environment set from the Deployment
   Guide. Use the `workshop_app` role URL for the runtime `DATABASE_URL`. Confirm
   `/health`.
4. **Worker.** Start the outbox worker. Confirm it polls without error.
5. **Web.** Deploy `apps/web` with `NEXT_PUBLIC_API_BASE_URL` → staging API.
6. **Auth.** Point OIDC at a staging realm; seed one user per role (owner, advisor,
   mechanic, warehouse, accountant) so permission paths can be exercised.
7. **Storage.** Configure S3 (or local) and confirm a signed upload/download
   round-trips.

---

## 3. The runtime verification gate (walk this in a browser)

Each step below exercises a layer the offline checks could not. Treat any failure
as a staging finding to fix before the pilot.

**Tenancy & auth.** Log in as the owner via `/auth/callback`. Confirm the session,
the role, and that data from a second seeded tenant is never visible (the core
multi-tenant guarantee, now enforced live by RLS).

**Customer → vehicle → work order.** Create a customer (try the company lookup),
add a vehicle, open a work order, add a labour line and a part line, clock time,
and transition the order. Confirm each write appears and is audited.

**Invoicing & PDF.** Issue an invoice from the work order. Confirm the VAT
treatment (including a reverse-charge case with an EU customer), then open the
invoice PDF and confirm it renders as a valid, branded document. Render a portal
invoice PDF too. *(PDF generators are dependency-free and parse-clean; this step
confirms they emit valid bytes at runtime.)*

**Warehouse.** Receive stock, adjust it, and confirm the on-hand-non-negative
constraint actually rejects an over-issue at the database.

**OCR / plate / voice.** Run each AI airlock with the fixture provider: upload a
delivery-note image (OCR), scan a plate, dictate a work order. Confirm each
*proposes* and waits for human confirmation before writing.

**Attendance.** Clock in and out as a mechanic; confirm attendance is recorded
separately from work-order time.

**Rental.** Walk the full lifecycle: create a rental vehicle, reserve, create the
contract, hand over (with a signature photo upload), return (with mileage, fuel,
damage photo), review the computed charges, generate the invoice through the
existing engine, and open the contract PDF.

**AI Manager.** Open the owner insights dashboard; confirm it reads live data and
that every figure is reproducible from the records.

**Outbox/integrations.** Confirm that issuing an invoice enqueues the Minimax and
e-invoice outbox events and that the worker attempts them (they will no-op or fail
gracefully until the real adapters are configured).

---

## 4. What to record

For each step: pass/fail, any error, and a screenshot for the demo and pilot
materials. A clean pass of Section 3 is the evidence that converts the master
report's "verified by parse-check" into "verified in staging" and is the precondition
for the conditional pilot GO.

---

## 5. Demo deployment (separate, simpler)

The demo does not need any of the above. The web app's demo mode answers every call
from in-memory fixtures, so a demo deployment is just the web app on Vercel with the
demo flag set — no API, no database. Use it for commercial presentation while
staging is being validated in parallel.
