# Warehouse Phase — Milestone Report

## What was built

The Warehouse phase delivers the procurement and stock-movement system the
approved architecture designed, built as an extension of the Phase 2 inventory
foundation rather than a replacement for it. Step 5.0's enabling changes (transfer
movements, moving-average valuation, the multimodal AI seam, warehouse
permissions, and numbering scopes) were confirmed complete, and on top of them the
full set of domain modules now exists as real production source.

Suppliers and the supplier-to-item catalogue came first: a `Supplier` domain type
with tested invariants in the shared core, a service that validates on both create
and update and audits every change, and the cross-reference that records who
supplies which part, under what part number, at what price and lead time, with at
most one preferred supplier per item enforced at the database. Purchase orders
followed, governed by a tested state machine (draft, sent, partially received,
received, cancelled) that the service consults rather than setting status by hand;
a PO is priced line by line through the same shared `Pricing` core that prices
invoices, and it draws its gapless number when it is sent, so abandoned drafts
never consume a number. The goods-receipt workflow is the heart of the phase: a
receipt is created as a draft and then posted, and posting is the single action
that moves stock, driving every line through the existing `applyCostedReceipt`
chokepoint so the immutable ledger and the moving-average cost are maintained
exactly as Step 5.0 built them, advancing the linked PO lines and recomputing the
PO status from the shared state machine. Goods receipts carry OCR-ready fields —
source, scanned-attachment reference, and per-line confidence and match status —
so the future delivery-note automation drops in without any schema change.

Stock operations completed the movement surface: standalone adjustments with
mandatory reasons and audit, and a stocktake-counting workflow that snapshots
system quantities, accepts counted figures, and on close posts one variance
adjustment per line through the chokepoint as a single audited action. Warehouse
reporting added stock valuation (on-hand times moving-average cost), the low-stock
scan against reorder points, and supplier-grouped suggested purchase orders. On
the frontend, the advisor parts picker now connects a work-order part line to real
inventory: the advisor searches the catalogue, sees availability by location, and
adds a line that reserves stock through the path that already existed — closing
the reservation gap the earlier review identified. The API client gained the five
warehouse method groups, and the inventory service gained the catalogue search the
picker needs.

## How it honours the constraints

Every requirement you set was treated as load-bearing. All stock changes continue
to flow through the single `InventoryService.move()` chokepoint and the pure
reducer — goods receipt, counting, adjustments, and reservations are new callers,
never new bypasses, so nothing writes `stock_levels` directly. Moving-average
valuation is maintained because posting a receipt is the only costed-receive path
and it recomputes the average through the tested function; an adjustment
deliberately changes quantity but not the average, because a count correction is a
quantity fact, not a repricing. The movement ledger remains immutable, every new
table has forced row-level security and tenant isolation, and every state-changing
action — supplier edits, PO transitions, receipt postings, adjustments, and count
closes — appends to the hash-chain audit. The receiving workflow is built
human-in-the-loop by construction: an OCR draft can only ever be created, never
posted, so a person always confirms before stock moves; AI never touches the
chokepoint.

## Verification results

All available tests pass. The shared core is green at 97 of 97, including the new
supplier-invariant and purchase-order state-machine tests. All 110 backend files
parse cleanly under Node's type-stripping, including every new module and its route
ordering. On the frontend, every `@/` import resolves to a real file and every API
group the screens call is defined on the client. The executable A-SPRINT dry run
was extended with the full part lifecycle and now passes all 28 checks with zero
failures: it receives four units at €240 then two at €270 and confirms the moving
average blends to exactly €250, reserves and issues a unit, values the remaining
five units at €1,250, and confirms the reducer refuses an over-reservation — all
computed by the same shared functions the backend calls.

## Remaining risks and deferred work

The standing environment caveat is unchanged and must be stated honestly: this
sandbox has no network, so the shared logic is proven by execution but the NestJS
modules and the React screens are real production source verified by parse-check
and import resolution, not by a live database, server, or browser. The genuine
final gate remains running the warehouse flows on a deployed instance with
migrations 0008 and 0009 applied. The clerk-facing warehouse interface (receiving,
counting, and valuation screens) is supported by the API client but the screens
themselves are a natural next increment; the advisor parts picker is the one
warehouse UI delivered in this phase because it closes the work-order loop. The OCR
delivery-note pipeline is prepared for but not wired — the seam, the draft-then-post
workflow, and the schema fields are all in place, awaiting a multimodal model behind
the gateway. And the Minimax payables direction (received supplier invoices) remains
deferred, with only a reserved reference column, exactly as planned.

No Customer Portal, plate recognition, or voice work-order work was begun.
