# Phase 4B — Close the Operational Loop

## What was built

This phase closes the single gap the production-readiness review identified as the
only true blocker: the advisor could intake a job and the mechanic could work it,
but no one could turn that into a priced, issuable invoice through the interface,
and there was no way to create a customer or a vehicle in the application at all.
Phase 4B builds exactly the missing advisor surfaces — and the few thin backend
endpoints they required — so that a real job now runs end to end without anyone
touching the database by hand.

On the backend, the additions are deliberately small and follow the patterns the
existing code already established, because the brief was to build the missing UI
and not to recreate logic. Customers and vehicles each gained a partial-update
path: a repository method that writes only the columns supplied (every field
guarded by `COALESCE` so a patch never blanks an untouched column), a service
method that re-validates the *merged* result against the very same invariants
`create` enforces — so an edit can never leave a customer VAT-liable without a VAT
id — and a `PATCH` route under the same `CustomerManage` permission as create. The
customer edit also re-enqueues the Minimax partner upsert, so an edited customer
stays in step with the accounting system. Work orders gained four endpoints:
assignment of a responsible mechanic (and its clearing), a tenant-scoped listing of
assignable mechanics, an in-place line edit, and a line removal. The line edit and
removal are the important ones, and they reuse the tested core completely — money
is recomputed by the same `Pricing.priceLine` the add path already calls, and the
header totals by the same `recomputeTotals` — so this phase introduces no new
financial arithmetic whatsoever. Removal releases any stock the line had reserved
before deleting it, and both operations refuse to touch an issued line or a
stock-reserved line in place, which keeps inventory and billed state honest.

On the frontend, the advisor now has the create and edit screens for both
customers and vehicles, a customer hub that ties a customer to their vehicles,
their outstanding balance, and the actions that start work, and — the centrepiece —
an interactive line editor inside the work-order workspace. The editor lets the
advisor add a labour line as hours times an hourly rate and a part line as quantity
times a unit price, edit any line in place, and remove one, with a VAT rate on
each. The defining property of the editor is that the browser computes no money at
all: every add and edit posts the raw inputs and the server returns the line and
the work-order totals re-priced by the shared core, which the screen simply
re-reads. A mechanic-assignment control sits above the lines, populated from the
new mechanics endpoint, and assigning a mechanic is what finally makes a job appear
in that mechanic's "my jobs" list — the second half of the review's blocker. Two
latent bugs the review implied were also fixed in passing: the client now unwraps
the customer list's paginated envelope, and it passes the required customer id when
listing vehicles, which the previous code omitted.

## Why it was built this way

The decision that shapes everything here is that money lives in exactly one place.
The temptation in a line editor is to show a running total as the advisor types,
which means computing net, VAT, and gross in the browser — and then there are two
implementations of the pricing rules that will inevitably drift. Instead, the
editor treats the server as the single source of truth: it sends what the advisor
entered, the backend prices it through the same tested code that prices everything
else, and the screen reflects the result. This is slightly less flashy than live
client-side totals, but it is correct by construction and it means the invoice can
never disagree with what the advisor saw. The same instinct governs the backend
additions — rather than write new update logic, the edit paths re-run the existing
invariants and the existing pricing, so the edit surface is exactly as trustworthy
as the create surface it mirrors. And the guards on line edits (no in-place change
to issued or stock-reserved lines) exist because those are the cases where a
careless edit would silently desynchronise inventory or a fitted part from reality;
forcing a delete-and-re-add there keeps the reservation accounting clean.

## The complete loop

Every success criterion you set now has a path through the running application. A
new customer arrives and is created at Customers → New customer. A new vehicle is
created from that customer's hub. A work order is opened from the hub's New job
button, which pre-selects the customer and lists their vehicles. Labour and parts
are added and priced in the line editor on the work-order workspace. A mechanic is
assigned from the same workspace, which places the job on their bay list, where
they clock the work and mark it done. The advisor marks the job ready and issues
the invoice, which the existing engine prices, freezes, and — through the
transactional outbox built in Phase 1 — enqueues for synchronisation to Minimax.
The loop is whole.

## What is verified, and the honest caveat

The verifiable parts are verified. The shared tested core still passes all 62 of
its checks, confirming the pricing and invariant logic the new edit paths lean on
is unchanged and correct. All 85 backend files parse cleanly under Node's
type-stripping, including every new endpoint and its careful route ordering (the
static `mechanics` route is declared before the `:id` route so it is not captured
as an id). On the frontend I confirmed statically that all 36 distinct API calls
the screens make resolve to methods that exist on the client, and that every
internal import resolves to a real file, so the module graph is sound. The
unavoidable caveat is the same as in every prior phase: this environment has no
network to install dependencies, so I cannot run a Next.js build or a live NestJS
server here. The React and NestJS code is real production source written to compile
and run under CI and a normal install; it has not been bundled or executed in this
sandbox. The right next step before relying on it in production is precisely the
end-to-end dry run on real data that the review recommended — walking one actual
A-SPRINT job from a created customer through to an issued, Minimax-synced invoice on
a deployed instance.

## Remaining gaps

These are not blockers to the loop, but they are honest edges. Line edits use a
plain inline-row form rather than a richer parts catalogue; selecting a stocked part
by code (which would set the inventory item and reserve stock automatically) is the
natural enrichment once the Warehouse phase lands. Editing a stock-reserved line is
intentionally disallowed in place and requires remove-and-re-add, which is safe but
slightly more clicks. And the deferred items named in earlier reviews — server-side
upload scanning, server-side voice transcription, refresh-token rotation delegated
to the IdP — remain deferred, correctly, as later work rather than gates on this
loop. With Phase 4B complete, the system meets the bar the review set, and Warehouse
and Customer Portal development can proceed.
