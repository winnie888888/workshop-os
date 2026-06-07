# Workshop OS — Full System Audit

*Audit date: 7 June 2026. Scope: entire repository, Project Knowledge, demo
experience, branding, architecture, and all completed phases. No feature code was
written or changed during this audit; it is verification and reporting only.*

---

## A. A note on the audit scope versus what exists

The audit scope names four governing documents — a Master Blueprint, a PRD, an
Architecture Blueprint, and a Roadmap. In the interest of an honest audit, none of
those four exist as documents in Project Knowledge. What exists is the MINDSET
document, which carries the mission, the user roles, the core module list, and the
AI-first design philosophy, and so functions as the de-facto blueprint; alongside
it sit focused specifications and principle documents: Consolidated Invoicing,
Employee Time & Attendance (and its Slovenian-compliance companion), Customer
Creation & Company Lookup, SMS & Communication Architecture, the Zero-Paper
Principle, the Workshop-Owner Principles, the Mechanic-UX Principles, and a Minimax
customer-export spreadsheet. There is no Vehicle Rental specification in Project
Knowledge; that module was built to the detailed specification given directly in
the build request. The system was therefore audited against the documents that
genuinely exist, and this report flags requirements drawn from them.

---

## B. Full verification — the ten checks

Every check below was executed against the repository on disk during this audit.

| # | Check | Result |
|---|-------|--------|
| 1 | Shared-core test suite | **PASS** — 246 / 246 tests pass |
| 2 | Backend parse-check | **PASS** — all 142 backend `.ts` files parse clean |
| 3 | Frontend import resolution | **PASS** — all 14 distinct `@/` imports resolve |
| 4 | Frontend API-call verification | **PASS** — every API group the screens call is defined in the client |
| 5 | Demo-mode verification | **PASS** — handlers exist for every staff area; the portal has its own demo path |
| 6 | Migration consistency | **PASS** — 16 migrations, sequential 0001–0016, no gaps or duplicates |
| 7 | Dry-run verification | **PASS** — 87 / 87 scenario checks pass |
| 8 | Dependency verification | **PASS** — no forbidden frontend dependencies present |
| 9 | Route verification | **PASS** — backend controllers cover the full surface the frontend calls |
| 10 | Permission verification | **PASS with a caveat** — 24 permissions defined; most enforced; four declared-and-granted but not yet enforced (see Technical Debt) |

The headline is that every machine-verifiable layer is green. The one caveat, in
check 10, is a genuine finding rather than a failure and is detailed below.

---

## C. Implementation matrix — modules

The system comprises 21 backend feature modules plus seven cross-cutting
subsystems (AI gateway, auth, common, config, integrations, portal, storage,
workers). Each row states whether the module has a tested shared core, a backend,
a frontend, a demo path, and a migration.

| Module | Shared core | Backend | Frontend | Demo | Migration |
|--------|:----------:|:-------:|:--------:|:----:|:---------:|
| Foundation (tenancy, RLS, audit, counter) | ✓ | ✓ | n/a | ✓ | 0001 |
| Customers & company lookup | ✓ | ✓ | ✓ | ✓ | 0001 |
| Vehicles / assets | ✓ | ✓ | ✓ | ✓ | 0002 |
| Work orders | ✓ | ✓ | ✓ | ✓ | 0002 |
| Inventory & stock ops | ✓ | ✓ | ✓ | ✓ | 0002/0007 |
| Invoicing, AR & e-invoice | ✓ | ✓ | ✓ | ✓ | 0004 |
| VAT engine | ✓ | ✓ | n/a | ✓ | n/a |
| Attachments & photos | partial | ✓ | ✓ | ✓ | 0005 |
| Suppliers | ✓ | ✓ | ✓ (advisor) | ✓ | 0008 |
| Purchasing & receiving | ✓ | ✓ | partial | ✓ | 0009 |
| Customer portal | ✓ | ✓ | ✓ | ✓ | 0010 |
| OCR delivery notes | ✓ | ✓ | ✓ (warehouse) | ✓ | 0011 |
| Plate recognition | ✓ | ✓ | ✓ | ✓ | 0012 |
| Employee time & attendance | ✓ | ✓ | ✓ | ✓ | 0013 |
| Travel orders & service vehicles | ✓ | ✓ | partial | ✓ | 0013 |
| Voice work orders | ✓ | ✓ | ✓ | ✓ | 0014 |
| AI Workshop Manager | ✓ | ✓ | ✓ | ✓ | 0015 |
| Vehicle rental | ✓ | ✓ | ✓ | ✓ | 0016 |
| Minimax integration | n/a | ✓ | n/a | **not surfaced** | n/a |
| Reporting & analytics | ✓ | ✓ | ✓ (owner) | ✓ | n/a |
| Sync / outbox | n/a | ✓ | n/a | n/a | n/a |

---

## D. Feature completion matrix — against Project Knowledge requirements

| Requirement (source doc) | Status | Note |
|--------------------------|:------:|------|
| Customer creation & company lookup | **Full** | shared normalisation + backend + UI + demo |
| Work orders end-to-end | **Full** | create → lines → time → transition → invoice |
| Inventory, stock movements, valuation | **Full** | moving-average valuation tested; immutable ledger |
| Consolidated invoicing (Consolidated Invoicing.pdf) | **Partial** | invoicing engine + per-WO invoices full; per-period/per-fleet *consolidation* grouping not built |
| VAT incl. EU reverse-charge | **Full** | decideLineVat tested; human-confirm gate for unvalidated EU VAT |
| Minimax export compatibility | **Partial** | backend adapter, mapper, outbox events present; not demoed; not run against live Minimax |
| Customer portal (history, approvals, invoices) | **Full** | own auth + demo fixtures |
| OCR delivery-note processing | **Full** | extract → match → human-confirm receipt |
| Plate recognition → vehicle/customer/WO | **Full** | recognise → match → open/suggest |
| Voice work orders | **Full** | transcribe → extract → confirm |
| Employee time & attendance (Slovenian compliance) | **Full** | attendance ledger separate from WO time; consistency checks |
| Leave management | **Partial** | permissions + approve path exist; full leave UI limited |
| Field service / travel orders / service vehicles | **Partial** | travel consistency + data model present; mobile start/finish UI limited |
| Payroll & accountant export (PDF/Excel/CSV) | **Partial** | reporting present; full multi-format payroll export not confirmed |
| AI Workshop Manager (18 analyses) | **Full** | advisory-only, deterministic detectors + narrative |
| Vehicle rental (16 features) | **Full** | catalogue → reserve → contract → handover → return → invoice → PDF |
| SMS & communication (SMS & Communication Architecture.pdf) | **Missing** | notification port exists but adapter is a stub; no SMS/email templates |
| Zero-paper principle (Zero Paper Principle.pdf) | **Full (in spirit)** | OCR, voice, photo attachments, e-invoice, PDFs all reduce paper |

---

## E. Missing functionality (built to less than the specification)

The following are genuinely incomplete relative to Project Knowledge, listed from
most to least material for a pilot.

1. **SMS and email delivery.** The notification layer is a clean port with only a
   stub adapter. No real SMS sending, no branded email templates, and no SMS
   landing pages exist, although the SMS & Communication Architecture document
   specifies them. The portal and reminders that would use this are therefore not
   end-to-end.
2. **Live Minimax synchronisation.** The integration is architecturally complete —
   adapter, mappers for partners and invoices, and outbox events are emitted — but
   it has never run against a live Minimax tenant, and the demo does not surface
   it, so its real-world correctness is unproven.
3. **Consolidated / periodic invoicing.** Per-work-order invoicing is complete, but
   the daily/weekly/monthly and per-fleet/per-vehicle *consolidation* described in
   the Consolidated Invoicing document is not yet built.
4. **Leave management and travel-order mobile UI.** The data models and permissions
   exist, but the employee-facing leave request/approval flow and the mobile
   start/finish for travel orders are limited.
5. **Multi-format payroll/accountant exports.** Reporting exists; the full
   PDF/Excel/CSV payroll and travel/mileage export set is not confirmed.

---

## F. Technical debt

1. **Four unenforced permissions.** `PricingEdit`, `IntegrationsManage`,
   `TenantManage`, and `AiApproveFinancial` are defined and correctly granted in
   the role matrix but are not checked by any controller, guard, or service. The
   capability vocabulary is ahead of its enforcement. This is harmless today —
   the endpoints they would protect either do not exist yet or are gated by a
   different permission — but each must be wired before the corresponding
   capability ships, especially `AiApproveFinancial`, which is meant to gate AI
   output touching money.
2. **Attachments shared core is partial.** Upload works and is used across OCR,
   voice, plate, and rental, but the shared-core coverage is lighter than other
   modules.
3. **No live-execution proof for the framework layer.** This is the standing
   structural caveat of the whole build, not a defect: deterministic logic is
   proven by 246 tests and an 87-check dry run, but NestJS services, SQL, and the
   React UI are verified by parse-checking and cross-checks, never executed against
   a live Postgres, HTTP server, or browser, because the build environment has no
   network, database, or build toolchain. Every "ready" judgement in this report is
   bounded by that fact.
4. **Favicon and logo assets.** App icons exist (192/512/apple-touch) but there is
   no `app/icon` or `app/favicon` file and no logo image asset; branding is a
   typographic wordmark, so the browser tab and installed-app polish are
   incomplete.

---

## G. Risk list

1. **Live database and runtime behaviour is unverified.** The single largest risk.
   Schema, RLS policies, and query correctness are real source but unexecuted. A
   staging deployment that applies all 16 migrations and walks each workflow is the
   true gate. *Likelihood of surprises: moderate. Impact: high.*
2. **Minimax real-world mismatch.** Field mappings or VAT/partner expectations may
   differ from a live Minimax tenant. *Likelihood: moderate. Impact: high for the
   accountant, who is a primary user.*
3. **AI provider not wired.** Every AI feature runs on a deterministic offline
   fixture provider; the real EU-resident model is not connected. The advisory
   airlocks make this safe, but real-model output quality is unmeasured.
   *Likelihood: certain to need work. Impact: medium, contained by design.*
4. **Communication gap.** Without SMS/email, customer-facing reminders and portal
   notifications cannot actually be delivered in a pilot. *Likelihood: certain.
   Impact: medium.*
5. **Billing-policy assumptions.** The rental day-count (any started day rounds up)
   and similar conventions are deliberate choices that must be confirmed against
   A-SPRINT's real terms. *Likelihood: certain to need confirmation. Impact: low
   if caught early.*

---

## H. Branding readiness assessment

**Where branding is implemented.** The A-SPRINT / Workshop OS identity is applied
consistently across the staff application — the advisor, mechanic, employee, and
warehouse layouts all carry it — and across the landing page, the owner dashboard,
the rental screens, and the customer portal. The PWA manifest is properly branded:
the installed-app name is "A-SPRINT Workshop OS", the short name "Workshop OS", with
a coherent dark theme (`#14181d`). App icons exist at 192 and 512 pixels with an
Apple touch icon. The generated PDFs — the rental contract and the portal invoice —
carry the A-SPRINT name and the SI45598711 VAT identifier, so the documents a
customer receives are branded.

**Where branding is missing or thin.** There is no logo *image* asset in the
project; the brand is rendered as a typographic wordmark in the display font rather
than the actual A-SPRINT logo graphic that exists in Project Knowledge. There is no
`app/favicon` or `app/icon` route file, so the browser tab relies on the manifest
and public icons and may fall back to a default in some browsers. There is no
dedicated, branded staff login page — authentication is via an OAuth/magic-link
callback — so the "login page" branding item has no surface to live on yet. Email
templates and SMS landing pages are not implemented at all (the notification
adapter is a stub), so those branded surfaces do not exist.

**Inconsistencies.** None material were found in the surfaces that *are* built; the
wordmark and theme are used uniformly. The inconsistency is one of *coverage*, not
of conflicting styles: branded where built, absent where the underlying feature is
a stub.

**Recommended improvements.** Add the real A-SPRINT logo as an SVG asset and place
it in the layouts and PDF headers; add an `app/icon` and favicon so the tab and
installed app are polished; build a branded staff login screen when real auth lands;
and design branded email and SMS templates as part of closing the communication
gap.

**Branding readiness: ready for demo and commercial presentation; not yet complete
for production.** What a viewer or pilot user will see — the app, the portal, the
PDFs, the installed PWA — is consistently branded. The gaps are in surfaces that do
not exist yet (email, SMS, login) or in polish (logo graphic, favicon).

---

## I. Demo readiness assessment

**Completeness.** The demo answers every staff area from in-memory fixtures and the
default handler never throws, so untailored screens still render. Confirmed demo
workflows exist for: work orders; warehouse (inventory, stock operations, goods
receipts, suppliers, purchase orders); OCR delivery notes; plate recognition; voice
work orders; the customer portal (through its own `portal-demo` path); employee time
& attendance; the AI Workshop Manager; vehicle rental; and invoicing. The dry run —
87 checks across these domains — passes entirely.

**Missing demo flows.** The Minimax workflow is the one item on the requested demo
list with no demonstrable surface: the backend emits the right outbox events, but
the demo does not visualise an export or a sync result, so a viewer cannot *see*
Minimax working. This is the main demo gap.

**Broken paths.** None were detected. Every called API group resolves to a defined
client method, every staff area has a demo handler, the portal has its own, and the
forbidden-dependency and import checks are clean.

**Demo readiness: ready.** The demo showcases the full product end to end with the
single exception of a visible Minimax step. Adding a small "exported to Minimax"
confirmation to the invoice demo flow would close that gap.

---

## J. Production readiness assessment

The system is **not yet production-ready, and is not expected to be at this stage** —
it is at the end of feature construction, before runtime hardening. The blocking
work is concrete and known: deploy to a staging environment, apply all 16
migrations against a real Postgres, and execute each workflow against live HTTP and
a real browser, because none of the framework layer has ever run; connect and test
the real EU-resident AI provider behind the advisory airlocks that already exist;
validate Minimax against a live tenant; and implement the SMS/email delivery the
communication features depend on. The deterministic core, the data model, the
security model (forced tenant RLS, hash-chained audit, permission matrix), and the
API surface are complete and internally consistent, which is the right foundation —
but "verified by parse-check and tests" is not "verified in production".

## K. Pilot readiness assessment

A **controlled A-SPRINT pilot is feasible soon, after the staging deployment pass**,
with two honest constraints. First, the pilot should run with a human in the loop on
every external integration: invoices reviewed before they are trusted as final, AI
outputs treated as advisory (which the architecture already enforces), and Minimax
export reconciled manually until the live mapping is proven. Second, customer-facing
communication (SMS/email reminders) will not work until the notification adapter is
real, so the portal and reminders should be framed as in-workshop tools during the
pilot rather than customer-notification channels. Within those constraints — and
they are normal for a first pilot — the breadth of working functionality is more
than sufficient to run real work orders, inventory, attendance, rental, and
invoicing at A-SPRINT.

---

## L. Recommended next steps, in priority order

1. **Stand up a staging deployment** and run the real end-to-end gate: apply all 16
   migrations, exercise every workflow against live Postgres, HTTP, and a browser.
   This converts every "parse-checked" judgement into a runtime-verified one and is
   the highest-value next action by a wide margin.
2. **Wire and test the real EU-resident AI provider** behind the existing gateway
   seam, and measure output quality on real data for OCR, voice, plate, and the
   manager narrative.
3. **Validate Minimax against a live tenant** and add a visible Minimax step to the
   demo.
4. **Implement the notification adapter** (SMS + branded email templates) to close
   the communication gap the portal and reminders depend on.
5. **Wire the four unenforced permissions**, prioritising `AiApproveFinancial`.
6. **Confirm billing-policy conventions** (rental day-count, fees) with A-SPRINT.
7. **Finish branding polish**: real logo SVG, favicon/`app/icon`, branded login,
   email/SMS templates.
8. **Build the deferred specification items** as the pilot reveals their priority:
   consolidated/periodic invoicing, leave and travel-order mobile UI, and the full
   payroll export set.

---

## M. Overall verdict

Across nine modules' worth of construction the system is internally coherent,
consistently branded where surfaces exist, fully demonstrable but for a visible
Minimax step, and green on every check that can be run without a live runtime. It is
**ready for final demo deployment and commercial presentation now**, and **ready for
an A-SPRINT pilot after a staging deployment pass and the closing of the
communication gap**. It is **not yet production-hardened**, which is expected at the
close of feature work; the path to production is the concrete, ordered list above,
led by the one step that matters most — running the whole thing, for the first time,
against a real database and browser.
