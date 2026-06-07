# Production Readiness & Deployment Preparation — Master Report

*Date: 7 June 2026. This phase performed verification, hardening review, and
deployment preparation only. No new business features were built, and no module
was added. Where the prior Full System Audit was too harsh, this report corrects
it with evidence gathered directly from the repository.*

---

## 1. Executive verdict

The system is internally complete and coherent across nine modules of
construction, and every check that can be run without a live runtime is green. The
foundations that matter most for a multi-tenant commercial product — database-
enforced tenant isolation, hash-chained audit logging, a least-privilege runtime
role, and a dense layer of schema integrity constraints — are present and verified.
The single remaining gate before any production reliance is unchanged and
expected: the framework layer has never executed against a live database, HTTP
server, or browser, because this build environment has no network, Postgres, or
build toolchain. Notably, the project's own CI already provisions a real Postgres
container to close exactly that gate the moment it runs on GitHub.

The go/no-go recommendations, in brief: **GO for final demo deployment and
commercial presentation now; GO for staging deployment now; conditional GO for the
A-SPRINT pilot** after a staging pass and with a human kept in the loop on
invoicing and Minimax; and **not yet for unattended production**, which is the
correct posture at the close of feature work. Section 9 details each.

---

## 2. Resolution of audit findings

Every finding from the Full System Audit was re-examined against the code. The
outcome of each:

**Four "unenforced" permissions — RESOLVED by verification, no change needed.**
The audit flagged `PricingEdit`, `IntegrationsManage`, `TenantManage`, and
`AiApproveFinancial` as defined-and-granted but unenforced. Direct inspection
confirms there is no price-mutation endpoint and no financial write path anywhere
in the AI gateway, so these permissions are not unenforced through oversight — they
correctly await endpoints that do not exist yet. Wiring them now would create a
seam guarding nothing. The right action is to enforce each the moment its endpoint
is built; `AiApproveFinancial` specifically must gate the first AI-proposed
financial action if one is ever added. `InvoiceIssue` is already referenced in the
invoices module.

**Favicon and app icons — RESOLVED by verification; audit was too harsh.** The root
layout's metadata declares the icon and Apple-touch links pointing at committed
PNGs, and the manifest declares the maskable Android icons. Next.js emits the
correct favicon and home-screen tags from this. The browser tab and installed PWA
are branded. The only true remaining branding gap is the absence of a logo *image*
asset (the brand is a typographic wordmark) and the surfaces that do not exist yet
(email, SMS, a dedicated login screen).

**SMS / email delivery — CONFIRMED missing, correctly out of scope here.** The
notification layer is a clean port with a stub adapter. This phase prepares the
integration (Section 7) rather than implementing it, per the instruction not to
build features.

**Live Minimax — CONFIRMED architecturally complete, runtime-unproven.** Adapter,
mappers, and outbox events exist; a live tenant test is in the integration
checklist (Section 7) and the demo lacks a visible Minimax step (Section 8).

**Consolidated invoicing, leave/travel UI, payroll exports — CONFIRMED partial.**
These are deferred specification items, not regressions; they appear in the Risk
Register and the next-steps list, not as blockers for a pilot.

---

## 3. The ten verification checks (re-run this phase)

| # | Check | Result |
|---|-------|--------|
| 1 | Shared-core test suite | **PASS** — 246 / 246 |
| 2 | Backend parse-check | **PASS** — 142 / 142 files |
| 3 | Frontend import resolution | **PASS** — all 14 distinct `@/` imports |
| 4 | Frontend API-call verification | **PASS** — every called group defined |
| 5 | Demo-mode verification | **PASS** — all staff areas + portal own path |
| 6 | Migration consistency | **PASS** — 0001–0016, no gaps |
| 7 | Dry-run verification | **PASS** — 87 / 87 |
| 8 | Dependency verification | **PASS** — no forbidden deps |
| 9 | Route verification | **PASS** — controllers cover frontend |
| 10 | Permission verification | **PASS** — 24 defined; unenforced four explained above |

---

## 4. Security & integrity verification (deep checks this phase)

**Tenant isolation — VERIFIED at the database layer.** `PgService.withTenant` opens
a transaction, sets `app.current_tenant_id` as a transaction-local config value,
and switches to the least-privilege `workshop_app` role via `SET LOCAL ROLE`.
Sixteen tables carry `FORCE ROW LEVEL SECURITY` with tenant-isolation policies, so
isolation is enforced by Postgres itself rather than by application code that could
forget a `WHERE tenant_id`. This is the correct, defence-in-depth design.

**Audit logging — VERIFIED broad.** Sixteen feature modules call
`AuditService.append`, covering essentially every mutating module (work orders,
invoices, inventory, stock-ops, attendance, customers, assets, suppliers,
purchasing, receiving, rental, voice, OCR, plate, fleets, and the manager's
read-only snapshot). The audit trail is hash-chained.

**Data integrity — VERIFIED dense.** The schema carries 83 CHECK constraints, 148
foreign-key references, and 87 unique/primary-key constraints — including the
on-hand-non-negative check, immutable stock movements, and gapless document
counters. Integrity is enforced in the database, not merely in services.

**Migration safety — VERIFIED.** The runner is forward-only, records applied files
in `app.schema_migrations`, and skips what is already applied, so re-running is
idempotent.

---

## 5. Per-module readiness (tasks 9–17)

Each module was verified for the presence of a tested core (where applicable), a
parse-clean backend, a frontend surface, a demo path, and audit coverage. All are
**ready for staging** under the standing runtime caveat.

| Module | Readiness | Note |
|--------|:---------:|------|
| PDF generation | Ready (parse + structure) | dependency-free generators for rental contract and portal invoice; emit bytes; runtime render to confirm in staging |
| Customer Portal | Ready | own auth + own demo path; per-host tenant |
| Warehouse | Ready | inventory, stock-ops, receiving, suppliers, purchasing; non-negative-stock enforced |
| OCR delivery notes | Ready | extract → match → human-confirm; audited |
| Plate recognition | Ready | recognise → match → open/suggest |
| Voice work orders | Ready | transcribe → extract → confirm airlock |
| Employee time & attendance | Ready | DB-separate from WO time; consistency checks |
| Vehicle rental | Ready | full lifecycle; charges tested; invoice via existing engine |
| AI Workshop Manager | Ready | advisory-only by construction; GET-only; deterministic detectors |

The one cross-cutting caveat for every row: real-model AI is not yet wired (offline
fixture provider), and live runtime behaviour is unproven until staging.

---

## 6. Go / No-Go summary (full detail in Section 9)

| Target | Recommendation |
|--------|----------------|
| Final demo deployment | **GO** |
| Commercial presentation | **GO** |
| Staging deployment | **GO** |
| A-SPRINT pilot | **CONDITIONAL GO** — after staging pass + human-in-loop on invoicing/Minimax + communication framed as in-workshop |
| Unattended production | **NO-GO (yet)** — complete the ordered hardening list first |

---

## 7. What changed in this phase

In keeping with the instruction to harden and prepare rather than build, the only
repository changes are documentation: this report and the accompanying Deployment
Guide, Staging Guide, Pilot Execution Guide, Risk Register, and Branding & Demo
Readiness Assessment. No business logic, schema, API, or UI was altered, because
verification showed the resolvable findings were resolved by confirmation (icons,
permissions) and the remaining findings are integration implementations explicitly
out of scope for this phase. Avoiding gratuitous code change in a readiness phase is
itself a risk-management decision: the system is green, and the highest-value next
action is to run it, not to perturb it.

---

## 8. Cross-references

- Deployment mechanics, env inventory, integration checklists → **Deployment Guide**
- Staging bring-up and the runtime verification gate → **Staging Guide**
- Pilot plan, constraints, and success metrics → **Pilot Execution Guide**
- Full risk table with likelihood/impact/mitigation → **Risk Register**
- Branding gap analysis and demo workflow verification → **Branding & Demo Readiness**

---

## 9. Go / No-Go reasoning

**Final demo deployment and commercial presentation — GO.** The demo answers every
staff area from fixtures, never throws on untailored screens, and the customer
portal has its own demo path. The dry run passes 87 checks. Branding is consistent
across every surface that exists. The only visible demo gap is a Minimax export
confirmation, which is cosmetic for a demo and addressed as a recommendation, not a
blocker.

**Staging deployment — GO.** Everything needed to stand up staging exists: a
forward-only idempotent migration runner, a documented environment surface, a CI
pipeline that already provisions Postgres, and a clean dependency profile. Staging
is precisely where the standing runtime caveat gets discharged, so deploying there
is not just safe but the most valuable next step.

**A-SPRINT pilot — CONDITIONAL GO.** The breadth of working functionality is more
than enough to run real work orders, inventory, attendance, rental, and invoicing.
The conditions are honest and normal for a first pilot: complete a staging pass that
exercises every workflow against live Postgres and a browser; keep a human in the
loop on every invoice and on Minimax export until the live mapping is reconciled;
treat AI output as advisory (already enforced by architecture); and frame the portal
and reminders as in-workshop tools until SMS/email delivery is implemented.

**Unattended production — NO-GO yet.** This is expected at the end of feature
construction, not a failure. The path is the ordered list: staging runtime pass →
real EU AI provider wired and measured → Minimax validated against a live tenant →
notification adapter implemented → deferred spec items as the pilot prioritises
them. Until the runtime pass in particular is done, "verified by parse-check and
tests" must not be mistaken for "verified in production."
