# Vehicle Rental Management — Milestone Report

## 1. What was built

This phase delivers a complete vehicle rental management module for the kinds of
vehicles A-SPRINT actually rents to customers — motorhomes, passenger cars,
replacement vehicles, and service vans — and it is the final module of the build.
It implements all sixteen requested capabilities: a rental vehicle catalogue, an
availability calendar, reservations, contract creation, the handover workflow, the
return workflow, mileage and fuel tracking, damage documentation, insurance and
deductible handling, deposit tracking, extra charges, rental invoice generation
through the existing engine, rental PDF documents, the customer signature
workflow, and Minimax compatibility inherited from the invoicing path.

A note on the specification, in the interest of honesty: there is no dedicated
Vehicle Rental document in Project Knowledge — a search returns the invoicing,
attendance, and mindset specs but nothing about rentals. The module was therefore
built to the detailed specification in your own request, which enumerates the
features, the full contract field list, and the return-workflow charges, and it
reuses the genuine engines the project knowledge does describe.

## 2. Rental architecture

The module follows the same shape that has served every phase: the
correctness-critical logic lives in the tested shared core, and the framework
layer composes it. Two pure modules carry the hard logic. Rental availability
implements half-open date-range overlap (a booking that ends exactly when another
begins does not conflict) and a day count where any started day rounds up, with a
minimum of one day. Rental charges is the deterministic engine that turns a
handover reading and a return reading into a set of charge lines — base rental,
extra kilometres beyond the per-day allowance, missing fuel measured in eighths of
a tank, late-return days, a cleaning fee, and damage — and then applies the
deposit to produce a balance due. Every charge is clamped so that returning the
vehicle with more fuel or fewer kilometres never becomes an automatic credit, and
damage is capped at the deductible when comprehensive (casco) cover applies and
charged in full when it does not. These rules are proven by twenty-four shared
tests and exercised again end to end in the dry run.

The persistence layer adds four tenant-isolated tables under forced row-level
security: the rental vehicles (the fleet, distinct from both customer vehicles and
the company's own service vehicles), reservations, contracts, and damages. The
contract table deliberately copies the vehicle's terms at the moment of creation
rather than referencing them live, so that later edits to a vehicle's daily rate
can never silently rewrite a signed contract. The backend service reads and writes
only through the tenant-scoped connection, draws gapless contract numbers from the
existing counter, and audits every state change.

## 3. Contract and invoice workflow

The workflow is a state machine that the backend enforces, so the mobile screen
cannot lead a user out of sequence. A reservation is checked against existing
bookings using the shared availability function and is refused, by name, if it
conflicts. A contract is then created from the reservation, copying the vehicle's
terms and drawing its RA-prefixed number. Handover records the starting mileage
and fuel and an optional signature photo, moves the contract to handed-over, and
marks the vehicle rented. Return records the closing mileage and fuel, a dirty
flag, any new damage with photos, and a signature; it runs the deterministic charge
engine, stores the result, moves the contract to returned, and frees the vehicle.
You cannot return what was never handed over, nor invoice what was never returned.

The crucial reuse is the invoice. Rather than inventing a parallel billing path,
the return charges are mapped into lines and passed to a new `issueFromLines`
method on the existing invoicing service, which runs them through the very same
VAT decision logic and total composition that ordinary work-order invoices use,
and emits the same Minimax and e-invoice outbox events. A rental invoice is, by
construction, a normal invoice — which is exactly why Minimax compatibility comes
for free and why the VAT treatment is correct without any rental-specific tax
code. The signature is captured as an image attachment through the existing upload
system; it is a photographed signature, not a cryptographic e-signature, which is
the appropriate honest scope for this stage.

## 4. Remaining risks

The standing environment caveat is the most important one and applies here as in
every phase. The deterministic charge and availability logic is proven by
execution — 246 shared tests and an 87-check dry run, including a full A-SPRINT
rental scenario that computes a realistic return bill and verifies the
deposit-and-balance arithmetic. The framework layer — the service's SQL, the
controller, the PDF generator, and the React workflow — is real production source
verified by parse-checking and by import, route, and column cross-checks, not by
execution against a live database or browser. The genuine final gate remains
deploying an instance, applying migration 0016, and walking the workflow against a
real Postgres and a real device.

Three substantive points deserve naming. The day-count convention, where any
started day rounds up to a full billed day, is a deliberate commercial choice that
matches how vehicle rental is normally priced; it should be confirmed against
A-SPRINT's actual rental terms, because it is a policy decision, not a
mathematical necessity. The signature is an attached photo rather than a legally
qualified electronic signature, which is fine for an internal record but should be
revisited if signed contracts ever need to stand on their own as legal
instruments. And the damage assessment relies on a human entering an estimated
repair cost at return; the system documents and charges it correctly within the
casco and deductible rules, but it cannot itself judge whether the estimate is
fair — which is the correct boundary, since that judgement belongs to a person.

## 5. Updated repository package

The repository now carries the rental module end to end: the two tested shared
modules and their twenty-four tests, migration 0016 with its four row-level-secured
tables, the backend service, controller, module, and PDF generator, the
`issueFromLines` extension to the invoicing engine, the API client group, the
mobile-first owner rental workflow screen, and the demo handlers that make the
whole flow work without a backend. The full verification gate passes on every
layer, and the migration ledger ends at 0016.

## 6. Vehicle Rental readiness assessment

Against the nine success criteria, the module meets them at the level this
environment can prove. A user can create a rental vehicle, reserve one, generate a
contract, complete handover, and complete return; the system calculates the extra
charges deterministically, generates the final invoice through the existing
invoicing engine, generates the rental PDF, and the demo supports the entire
workflow on a phone. The reuse requirements are satisfied directly: the module
builds on the existing customer module, the invoicing and VAT engines, the PDF
approach, and the attachment upload system, and it maintains audit logging and
multi-tenant security throughout. The one true blocker before production reliance
is the live deployment pass — applying the migration and running the workflow
against a real database and device — together with confirming the day-count
billing policy against A-SPRINT's terms.

This completes the planned build. As instructed, no new module was started after
Vehicle Rental; this is the final module.
