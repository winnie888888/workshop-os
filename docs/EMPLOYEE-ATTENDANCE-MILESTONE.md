# Employee Time & Attendance — Milestone Report

## 1. What was built

This phase delivers a complete employee time, attendance, field-service,
travel-order and payroll-preparation module, built directly from the two
specifications in Project Knowledge — the general module description and the
tighter Slovenian compliance note. An employee can clock in and out, record
breaks, and request leave; a field mechanic or towing operator can be assigned a
company service vehicle, create and run a travel order from a phone, and have its
mileage reimbursement computed automatically; a manager can generate a monthly
timesheet, download an accountant export, approve leave, and run an AI
consistency check that reconciles attendance against actual work. Throughout, the
module honours the one rule both specifications repeat: attendance is a separate
ledger from work-order time, and the AI may only flag inconsistencies, never
alter an official record.

The work spans all four layers of the system. In the tested shared core, two new
dependency-free modules encode the correctness-critical logic: `attendance`
(computing a day's net worked time from clock and break events, the Slovenian
labour-law flags, the regular/overtime split, leave classification, and the
monthly roll-up) and `travel-consistency` (the travel-order time-and-mileage
computation and the consistency reconciliation). Twenty-five new tests prove them
by execution. In the backend, migration 0013 adds six tenant-isolated tables, and
a new attendance module exposes the workflow through a repository, three focused
services, and two controllers. In the frontend, a mobile-first employee screen is
built around a single large clock control, and an owner management screen handles
timesheets, exports, consistency, leave approval and vehicles. Demo mode carries
the full flow, and the executable dry run demonstrates the whole day-to-payroll
chain end to end.

## 2. Architecture overview

The governing decision, stated in both specifications, is that attendance must be
separate from work-order time, and it is worth being precise about why these are
genuinely different things rather than two views of one clock. Work-order time,
which already existed in the system, answers a job-centric question — how long did
this specific repair take, and what should we cost or bill for it — and it feeds
pricing and profitability. Attendance answers a person-centric question — was this
employee present at work, for how long, net of breaks, and does that satisfy
Slovenian working-time evidence requirements — and it feeds payroll and legal
compliance. The same wall-clock hour legitimately appears in both ledgers, and
that is not double counting; it is two different measurements. The module
therefore keeps attendance in its own tables, computed only from clock and break
events, and never merges it with the work-order ledger. The single place the two
meet is the consistency check, which reads both and reports the difference.

The correctness-critical arithmetic lives in the shared core, where it can be
proven by running it, exactly as in previous phases. `computeAttendanceDay` turns
a clock-in, a clock-out, and a list of breaks into gross, break, and net seconds,
and attaches labour-law flags; `rollUpMonth` aggregates a month of those days plus
approved leave into the totals payroll needs; `computeTravelOrder` produces a
trip's time breakdown and its mileage reimbursement in minor units; and
`checkConsistency` reconciles the attendance figure against the work-order,
field-service, and travel figures to produce an unaccounted-time gap and a
severity. The backend services are deliberately thin orchestration over this
core: they record raw events, call the shared functions to derive every figure,
and persist nothing that the core could compute, so a timesheet is always
reproducible and a correction is always transparent. Money is handled in minor
units everywhere, and times are handled as epoch seconds in the core so the
arithmetic is timezone-agnostic, with the presentation layer localising to
Ljubljana. Every state change — every clock event, correction, leave decision,
vehicle assignment, and travel-order transition — is written to the existing
hash-chain audit log, and every query runs inside the tenant row-level-security
mechanism, so multi-tenant isolation and audit logging are maintained without
new machinery.

The AI consistency check deserves a specific note because of how carefully the
specifications constrain it. The reconciliation itself is fully deterministic and
computed by the shared core; the AI gateway is consulted only to phrase a
human-readable narrative around numbers that were already decided, and even that
is best-effort, so if the model is unavailable the computed result still stands.
The check has no power to write to any official record, and the test suite
enforces this by asserting that its summary never contains words implying a
mutation. This is the same airlock principle the OCR and plate-recognition phases
established, applied here to payroll evidence.

## 3. Slovenian compliance considerations

The compliance specification is short but pointed, and the module addresses each
of its requirements. Attendance is recorded separately from work-order time, as
discussed. Clock-in, clock-out, and break recording are first-class operations.
The leave types the spec enumerates — vacation, sick leave, personal leave,
business leave, public holiday, and planned absence — are all modelled, with the
distinction that planned absence is not treated as paid presence-equivalent in the
monthly total while the others are. A monthly timesheet per employee is generated
from the roll-up, the employee can see their own records, the accountant export is
produced as CSV, and corrections to official records are written to the audit log,
which is the ZEPDSV "audit log for corrections" the spec asks for.

Beyond the spec's checklist, the shared core encodes several statutory thresholds
from the Employment Relationships Act (ZDR-1) as named, sourced constants, so they
are visible and verifiable rather than buried in logic. A working day longer than
six hours that records less than a thirty-minute break is flagged, reflecting the
Article 154 break entitlement; a day longer than ten hours is flagged for review
against the working-time limits; insufficient daily rest between consecutive days
is detectable against the Article 155 twelve-hour rule; and overtime is split
against the eight-hour standard day. It is important to be clear about what these
flags are and are not. They are conservative evidence thresholds that surface
conditions for a human to consider; they are not legal advice, and the module
never blocks an action or auto-corrects a record on their basis. A workshop's
collective agreement may be more generous than the statutory floor, which the
module tolerates — it flags breaches of the floor, it does not enforce a ceiling.
A Slovenian accountant or labour-law adviser should review the thresholds against
the workshop's specific collective agreement before the figures are relied upon
for payroll.

## 4. Remaining risks

The standing environment caveat continues to apply and is the most important one
to state plainly. The shared core and the full day-to-payroll chain are proven by
execution — 196 shared tests and a dry run that clocks a day, rolls a month,
computes a travel order, and runs the consistency check on the spec's own example
— but the NestJS services and controllers and the React screens are real
production source verified by parse-checking and by import and route
cross-checks, not by running against a live database, HTTP server, or browser.
The genuine final gate is deploying an instance with migration 0013 applied and
exercising the endpoints against real Postgres with row-level security active.

Several risks are specific to this phase. The Slovenian labour thresholds, as
discussed above, are conservative defaults that need professional review against
the workshop's collective agreement; treating them as authoritative without that
review would be a mistake. The accountant export is currently CSV, which is a
real, usable export an accountant can open in Excel or import elsewhere, but the
specification's fuller vision of PDF and native Excel outputs, automatic email
delivery to the accountant, and live two-way synchronization with Minimax are
prepared as future seams rather than built — the CSV export is structured so that
Minimax preparation is a transformation step away, but that step is not written.
The AI consistency narrative depends on a model that is not yet wired; the
deterministic reconciliation works without it, but the polished human-readable
phrasing is best-effort until a real EU-resident model is configured. GPS
tracking and verification, which the general spec lists as optional, are not
built. Finally, the monthly timesheet currently keys on an employee identifier
passed explicitly; wiring it to resolve the signed-in user's own identity for the
self-service view, and to a roster for the management view, is a small but real
piece of remaining integration.

## 5. Multi-tenant security and audit

These properties are maintained in full and without new mechanisms. Every one of
the six new tables carries a tenant identifier, has row-level security enabled and
forced, and is reached only through the existing `withTenant` transaction
mechanism, so a query can never see another tenant's attendance, leave, vehicles,
or travel orders. Self-service actions are available to any authenticated member
because recording one's own presence needs no privilege, while corrections, leave
decisions, vehicle management, exports, and the consistency check each sit behind
a dedicated permission added to the role matrix in this phase — Owner and Admin
hold all of them, the Accountant holds the payroll-export permission, and an
Advisor acting as front-desk manager holds the travel and leave-management
permissions. Every state change is appended to the hash-chain audit log with
before-and-after values, which simultaneously satisfies the operational audit
requirement and the Slovenian requirement that corrections to time records be
logged.

## 6. Readiness assessment

Against the eight success criteria, the phase meets them at the level this
environment can prove. An employee can clock in and out; vacation and sick leave
are supported alongside the other statutory leave types; travel orders are
supported end to end, from creation through mobile start and finish to a computed
reimbursement; service vehicles are tracked and assignable; monthly timesheets are
generated from the roll-up; the accountant export is produced as a downloadable
CSV; the AI consistency check works, reconciling attendance against the work
ledgers and flagging gaps without ever editing a record; and demo mode carries the
whole workflow on a phone, including a stateful clock that responds to clock-in,
break, and clock-out. The shared logic is proven by execution, the backend and
frontend are real source verified structurally, and the module integrates cleanly
with everything built before it — 196 shared tests, 132 backend files parsing
clean, all frontend imports resolving, and 56 dry-run checks passing.

The honest readiness statement is that the module is functionally complete and
internally proven, and that two things stand between it and production use: a
deployment that exercises it against live Postgres with the new migration, and a
professional review of the Slovenian labour thresholds against the specific
collective agreement, together with a decision on which of the fuller-vision
exports (PDF, Excel, automatic accountant email, live Minimax sync) the business
actually needs first. Until those are done, the clock, the leave, the travel
orders, the timesheet, the export, and the flag-only consistency check are
complete and correct in their logic, but the payroll figures should be validated
by a human before they are paid against.

No Vehicle Rental or AI Workshop Manager work was begun.
