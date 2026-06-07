# Warehouse — Architecture & Phase Planning (design only, no code yet)

This document designs the Warehouse system as an extension of the existing
Workshop OS core. It is deliberately written before any Warehouse code so the
design can be reviewed and corrected while it is still cheap to change. It
covers the review of what already exists, the changes that existing architecture
needs first, and the five requested deliverables: architecture, database design,
UX flow, OCR integration plan, and development roadmap.

---

## 0. Review of existing architecture (what Warehouse builds on)

The Phase 2 inventory foundation already provides more than half of what a
warehouse needs, and the Warehouse must extend it rather than replace it:

- **`app.inventory_items`** — the parts catalogue today: `sku`, `oem_ref`,
  `name`, `unit`, `cost_minor` (described as "last purchase cost"), `price_minor`
  (default sell), `currency`, `vat_rate_pct`, `is_core`, and a
  `minimax_article_id` link. Unique SKU per tenant, indexed by name.
- **`app.stock_levels`** — per `(item, location)`: `on_hand`, `reserved`,
  `reorder_point`, with database CHECKs that enforce `on_hand >= 0`,
  `reserved >= 0`, and `reserved <= on_hand`. So a per-location reorder point
  already exists.
- **`app.stock_movements`** — an **immutable** ledger (`ON UPDATE/DELETE DO
  INSTEAD NOTHING`), typed `receive | reserve | issue | release | adjust`, with
  `quantity`, an optional `work_order_line_id`, a `reason`, and `created_by`.
- **The shared `Inventory` reducer** (`packages/shared/src/domain/inventory.ts`)
  — a pure, tested function that applies one movement to a `{onHand, reserved}`
  state and refuses any move that would break the invariants. `available =
  on_hand − reserved`.
- **`InventoryService.move()`** — the single chokepoint through which every
  stock change already flows; `receive()` wraps it. This is the most important
  asset: there is exactly one place stock changes, and it is transactional.
- **`app.locations`** — sites/bays already usable as stock locations.
- **Cross-cutting machinery to reuse**: the outbox + handler registry (durable
  async integration), the append-only change feed + idempotent sync (offline
  mobile use in the yard), the hash-chain audit (sensitive corrections), gapless
  per-tenant numbering via `CounterService`/`Sequence` (PO and GRN numbers), the
  money minor-units primitives, the VAT engine, and the Phase 4A attachments +
  storage (where a delivery-note photo or supplier-invoice PDF already lands) and
  the EU-residency-guarded AI gateway (where extraction will run).

What does **not** exist yet, and the Warehouse adds: suppliers and supplier
catalogue cross-references, purchase orders, a goods-receipt workflow, inventory
transfers between locations, stocktake/counting, explicit stock valuation, richer
reorder data and low-stock alerts, and the OCR/AI-assisted receiving pipeline.

---

## Required changes to existing architecture BEFORE Warehouse development

These are the changes that must land first, because the Warehouse depends on
them and they touch the tested core or shared contracts. They are small and
surgical, and each is justified by a specific Warehouse need.

**R1 — Extend the movement vocabulary for transfers (shared reducer + SQL
CHECK).** Today the reducer and the `stock_movements` CHECK allow only
`receive/reserve/issue/release/adjust`. Inventory transfers between locations
need to be explicit in the ledger, so we add `transfer_out` (−on_hand at the
source, like an issue with no reservation change) and `transfer_in` (+on_hand at
the destination, like a receive). A transfer is an atomic *pair* of movements
inside one transaction, linked by a shared `transfer_id`, so the ledger always
shows both halves and never a half-completed move. Counting reuses `adjust`.
Because the reducer is tested, this change comes with new tested cases and a
migration that widens the CHECK constraint. This keeps the chokepoint principle
intact: transfers and counts become new *callers* of `move()`, never new
bypasses of it.

**R2 — Decide and implement stock valuation = moving weighted-average cost.**
Today `cost_minor` is "last purchase cost", a single number that cannot value
stock correctly when purchase prices change. We adopt **moving weighted-average
cost (MAC)** as the valuation method: on every costed receipt, the item's average
cost is recomputed as `(on_hand·old_avg + received_qty·receipt_unit_cost) /
(on_hand + received_qty)`. MAC is the right choice for a truck workshop — it is
far simpler than FIFO cost layers, it produces stable, explainable margins, and
it maps cleanly to how Minimax and a Slovenian accountant think about stock. This
requires (a) an `avg_cost_minor` on the item (keeping `cost_minor` as the
informational "last cost"), (b) a `unit_cost_minor` on receipt and transfer-in
movements so the ledger records what each unit actually cost, and (c) a small
**tested** shared function `Valuation.movingAverage(...)` so the recompute is
provably correct. Issues and the labour/profitability insight then value parts at
MAC, closing the gap the dry run noted where a manually added part had no cost.

**R3 — Extend the AI gateway port to multimodal document extraction.** Today the
`LlmProvider` port is text-in / JSON-out (`complete({prompt, outputSchema})`).
OCR of delivery notes and supplier invoices needs *image/PDF* input. We add an
`extractFromDocument({ documentRef, documentType, outputSchema })` capability to
the port (the `documentRef` is a Phase 4A attachment/storage key, so the photo
the warehouse clerk already uploaded is the input), keeping the same EU-residency
guard and `ai_usage` audit. This is the single change that makes the entire OCR
future possible, and making it now (as a port method, not a feature) means the
Warehouse can be built against the seam before any OCR model is wired.

**R4 — New numbering scopes and permissions.** Purchase orders and goods receipts
need gapless per-tenant-per-year numbers; we reuse `CounterService` with new
scopes (`purchase_order`, `goods_receipt`, `stock_count`) — no core change, just
new scope keys. And the RBAC matrix (tested `roles.ts`) gains `PurchaseManage`
(create/approve POs), `StockAdjust` (adjustments and closing counts), and
`StockTransfer`; the Warehouse role gets receive/transfer/adjust, the Owner/Admin
get purchasing. This is a tested-matrix change, so it ships with updated tests.

**R5 — Minimax direction note (no change now, flagged).** The current Minimax
integration is sales-side (partner upsert, issued-invoice sync). Supplier
invoices are *received* documents (prejeti račun) and a different Minimax
document type. We do **not** build this now, but the supplier and PO schema
reserve a `minimax_*` reference column so a later payables sync has somewhere to
record the link, exactly as items already carry `minimax_article_id`.

Everything else in the Warehouse is additive (new tables, new modules) and needs
no change to existing code.

---

## A. Warehouse Architecture

The Warehouse is a **bounded context** that owns procurement and stock movement,
sitting on the shared core and communicating with the rest of the system through
the same patterns already in use. Its non-negotiable architectural rule is the
one inherited from Phase 2: **all stock changes flow through the single tested
`move()` chokepoint and the pure reducer.** Goods receipt, issuing, transfers,
counting, and adjustments are all just different *callers* that compute a
movement and let the reducer enforce the invariants and the repository persist
the new level atomically. Nothing — not even the OCR pipeline — writes
`stock_levels` directly. This is what guarantees that on-hand and reserved can
never drift no matter how many new features arrive.

The context is organised as modules that mirror the existing style (controller →
service → repository, RLS via `withTenant`, audit + outbox inside the same
transaction):

- **Catalogue** extends `inventory_items` with categorisation, barcodes, and
  supersession links, and owns the parts-search the advisor's picker and the
  mechanic's scanner use.
- **Suppliers** owns supplier records and the supplier↔item cross-reference
  (supplier part number, price, pack size, lead time, preferred flag), which is
  the data that powers suggested purchase orders and goods-receipt matching.
- **Purchasing** owns purchase orders (a small state machine: draft → sent →
  partially_received → received, plus cancelled) and their lines.
- **Receiving** owns the goods-receipt note (GRN) workflow — the act of taking
  stock in, costed, against a PO or ad-hoc — and is the *only* writer of
  `receive` movements. The OCR pipeline produces a **draft** GRN that a human
  confirms; posting the GRN is what actually moves stock and recomputes MAC.
- **Stock operations** owns transfers, counting/stocktake, and adjustments —
  every one a caller of `move()`.
- **Replenishment** owns reorder data, the low-stock scan, and suggested POs.

Events flow through the existing outbox: posting a GRN can enqueue a
`minimax.article.cost_update` (so Minimax learns the new cost), closing a count
enqueues nothing but writes audit, and the low-stock scan emits a
`replenishment.low_stock` signal that surfaces on the owner dashboard and the
warehouse interface. Offline matters in the yard, so goods receipt and counting
are designed to work through the change-feed/sync path the bay app already uses —
a clerk can receive a pallet or count a shelf with no signal and have it reconcile
on reconnect, with the same idempotency guarantees.

The connected-system principle holds end to end: a supplier supplies items;
items have stock at locations; a purchase order to a supplier expects items; a
goods receipt against that PO increases stock and sets cost; a work-order part
line reserves and then issues that stock; issuing values the part at MAC, which
feeds the invoice and the owner's margin; and low stock against reorder points
generates the next suggested PO back to the supplier. The loop closes on itself.

---

## B. Warehouse Database Design

The following is the *design* of the schema (final DDL ships per roadmap step);
every new table carries `tenant_id` and RLS **enabled and forced** on
`app.current_tenant_id`, `created_at`/`updated_at`, and follows the existing
naming. Money is `bigint` minor units; quantities are integers in the item's
stocking unit (consumables modelled as smaller units), consistent with the
reducer.

**Alterations to existing tables**

```text
ALTER inventory_items
  ADD avg_cost_minor   bigint NOT NULL DEFAULT 0   -- moving weighted-average cost (R2)
  ADD category_id      uuid NULL                   -- parts category (catalogue)
  ADD barcode          text NULL                   -- scannable EAN/UPC
  ADD superseded_by_id uuid NULL                   -- supersession chain
  ADD preferred_supplier_id uuid NULL              -- default source for reorder
  -- cost_minor kept as informational "last purchase cost"

ALTER stock_levels
  ADD reorder_qty      int NOT NULL DEFAULT 0      -- target top-up quantity
  ADD max_qty          int NULL                    -- optional ceiling
  ADD bin              text NULL                    -- shelf/bin location within a site

ALTER stock_movements
  ADD unit_cost_minor  bigint NULL                 -- per-unit cost for receive/transfer_in (R2)
  ADD transfer_id      uuid NULL                    -- links the two halves of a transfer (R1)
  ADD source_ref       text NULL                    -- GRN id / count id / PO id provenance
  -- widen CHECK(type) to add 'transfer_out','transfer_in'
```

**New tables**

```text
suppliers
  id, tenant_id, code, name, country, vat_id, currency,
  payment_terms_days, default_lead_time_days, email, phone, address,
  minimax_partner_id NULL,            -- reserved for future payables sync (R5)
  status ('active'|'inactive'), created_*, updated_*

supplier_items                         -- supplier ↔ catalogue cross-reference
  id, tenant_id, supplier_id FK, item_id FK,
  supplier_sku, supplier_name, pack_size int, last_price_minor, currency,
  lead_time_days, preferred boolean,
  UNIQUE(tenant_id, supplier_id, item_id)

parts_categories
  id, tenant_id, name, parent_id NULL   -- shallow tree for catalogue browsing

purchase_orders
  id, tenant_id, number (gapless, CounterService scope 'purchase_order'),
  supplier_id FK, status ('draft'|'sent'|'partially_received'|'received'|'cancelled'),
  currency, expected_date, ship_to_location_id FK locations,
  total_net_minor, total_vat_minor, total_gross_minor,
  notes, created_by, created_*, updated_*, version

purchase_order_lines
  id, tenant_id, purchase_order_id FK, line_no,
  item_id FK, supplier_item_id NULL,
  description, qty_ordered int, qty_received int DEFAULT 0,
  unit_cost_minor, vat_rate_pct, net_minor, vat_minor, gross_minor

goods_receipts (GRN)
  id, tenant_id, number (gapless, scope 'goods_receipt'),
  supplier_id FK, purchase_order_id NULL FK,        -- null = ad-hoc receipt
  received_at, received_by,
  delivery_note_ref text,                            -- supplier's note number
  source ('manual'|'ocr'),                           -- provenance for audit
  ocr_attachment_id NULL FK attachments,             -- the scanned note (Phase 4A)
  ocr_confidence numeric NULL,
  status ('draft'|'posted'|'cancelled'),             -- draft until a human posts
  created_*, updated_*

goods_receipt_lines
  id, tenant_id, goods_receipt_id FK, line_no,
  purchase_order_line_id NULL FK,
  item_id FK, location_id FK,
  qty int, unit_cost_minor,
  ocr_raw_text NULL, ocr_confidence NULL,            -- per-line extraction trace
  match_status ('matched'|'unmatched'|'new_item')    -- catalogue match outcome

stock_counts                                          -- stocktake session
  id, tenant_id, number (scope 'stock_count'),
  scope ('location'|'item_subset'|'full'),
  location_id NULL FK, status ('open'|'counting'|'review'|'closed'|'cancelled'),
  started_by, started_at, closed_by, closed_at

stock_count_lines
  id, tenant_id, stock_count_id FK,
  item_id FK, location_id FK,
  system_qty int,                                     -- snapshot at count time
  counted_qty int NULL,
  variance int GENERATED (counted_qty - system_qty),
  adjustment_movement_id NULL FK stock_movements      -- set when closing posts the fix
```

**How the tables drive movements (the connected behaviour).** Posting a GRN
writes one `receive` movement per line (carrying `unit_cost_minor` and
`source_ref = grn_id`), updates `stock_levels.on_hand`, recomputes
`inventory_items.avg_cost_minor` via the tested MAC function, and bumps
`purchase_order_lines.qty_received` (advancing the PO to partially_received or
received). A transfer writes a `transfer_out`/`transfer_in` pair sharing a
`transfer_id`. Closing a count writes one `adjust` movement per non-zero variance
(`reason = 'stocktake'`, `source_ref = count_id`), each linked back to its count
line, and every adjustment is hash-chain audited. Reservations and issues are the
**existing** `reserve`/`issue`/`release` movements tied to `work_order_line_id` —
unchanged — so the advisor's parts picker and the mechanic's "fit part" feed
straight into the machinery that already works.

---

## C. Warehouse UX Flow

The Warehouse introduces the fifth persona from the approved UX set — the
**Warehouse Manager / parts clerk** — and connects to the advisor and mechanic
interfaces already built. The guiding principle matches the rest of the product:
reduce typing and clicking, scan and confirm rather than key in, and keep
destructive/financial actions deliberate and audited.

**Receiving goods (the centre of gravity).** A pallet arrives with a delivery
note. The clerk opens *Receive*, and either selects the open PO it fulfils or
starts an ad-hoc receipt. In the OCR-assisted path (the future), the clerk
photographs the delivery note; the system returns a **draft GRN** pre-filled with
the supplier, the note number, and a line per detected article, each already
matched to a catalogue item where possible and flagged where not. The clerk's job
becomes *confirmation*: tick the matched lines, resolve the unmatched ones (pick
the right item, or create a new catalogue entry inline), correct any quantity or
cost, and post. Posting moves stock and updates cost. Until posted, nothing has
changed — the draft is safe to abandon. The manual path is the same screen
without the photo: pick items, enter quantities and costs, post.

**Put-away and bins.** After receipt, stock lands at a location; the clerk can
assign a bin so pickers find it. Bins are optional text, not a rigid WMS, because
a truck workshop's store is shelves and a yard, not a robotic warehouse.

**Picking / reserving for a job.** This closes the loop the Phase 4B line editor
left open. In the advisor's work-order line editor, "add part" gains a **parts
picker**: search by name, SKU, OEM reference, or scanned barcode; the picker shows
availability by location (`available = on_hand − reserved`); choosing an item with
a location creates a reserving part line through the existing reserve movement. On
the bay side, the mechanic's existing "add part" gains the barcode scan so fitting
a part can issue stock. The warehouse interface shows the pick list — what is
reserved and awaiting issue across open jobs.

**Transfers.** A simple from-location → to-location → item → quantity flow, one
confirm, posting the linked transfer pair.

**Counting.** The clerk opens a count over a location or the whole store; the
system snapshots system quantities; the clerk walks the shelves entering counted
quantities (scan-and-count, offline-capable); a review screen shows variances with
their value at MAC; closing the count posts the adjustments in one audited action.

**Replenishment.** A low-stock view lists items at or below reorder point with
their preferred supplier, and offers to **draft a purchase order** grouped by
supplier with suggested quantities (up to `reorder_qty`/`max_qty`). The owner
dashboard surfaces the low-stock count and the value tied up in stock.

Every Warehouse screen carries the same money discipline as the rest of the
system: the clerk sees cost and stock value, the mechanic never sees cost, and the
advisor sees sell price — role-appropriate, enforced by permissions.

---

## D. OCR Integration Plan

The OCR future is designed as a **human-in-the-loop assist**, never an autonomous
writer — the same philosophy already proven for VAT treatment (the engine
proposes, a human confirms) and labour anomalies (AI explains, the owner decides).
AI reads paper faster than a human; humans remain accountable for what enters the
ledger.

**The seam (R3).** The AI gateway port gains `extractFromDocument({ documentRef,
documentType, outputSchema })`, where `documentRef` is a Phase 4A
attachment/storage key. So the existing upload pipeline (presign → store →
audit) *is* the OCR input pipeline; nothing new is needed to get a photo to the
model. The existing EU-residency guard and `ai_usage` audit apply unchanged, which
matters because supplier documents contain commercial PII.

**Delivery-note pipeline (AI-assisted goods receipt).** The clerk photographs the
note; the document is stored as an attachment; the gateway extracts a structured
proposal against a strict output schema — supplier identity, delivery-note number,
and a line array of `{ raw_text, detected_sku/oem, quantity, unit_cost,
confidence }`. The Warehouse then performs **catalogue matching** in our own code
(not the model): each detected line is matched to an `inventory_item` by SKU, OEM
reference, supplier SKU (via `supplier_items`), or barcode, producing
`matched | unmatched | new_item`. The result is written as a **draft GRN** with
per-line confidence and the raw text retained for audit. The clerk confirms, and
only the confirmed GRN posts through the normal costed-receive path. AI never
calls `move()`; it only proposes a draft a human turns into a posting.

**Supplier-invoice pipeline.** The same extraction applied to a supplier invoice
yields a payables proposal (supplier, invoice number, dates, net/VAT/gross, lines)
that can be reconciled against the matching PO/GRN (three-way match: ordered vs
received vs invoiced) and, later, synced to Minimax as a received invoice (R5). In
this phase it produces a confirmed cost document and flags price variances against
the PO; the Minimax payables sync is explicitly out of scope until the integration
direction is built.

**Automatic inventory updates** are therefore *automatic extraction with
confirmed posting*: the tedious transcription is automated, the stock-moving
decision stays human and audited. Confidence drives the UX — high-confidence,
fully-matched lines are pre-ticked; low-confidence or unmatched lines are
surfaced for attention. If the model is unavailable or extraction confidence is
poor, the clerk falls back to the manual GRN on the same screen, so OCR is an
accelerant, never a dependency.

---

## E. Warehouse Development Roadmap

The work is sequenced so the enabling changes land first, each step is shippable
and testable, and the correctness-critical logic goes into the runnable tested
shared core while framework code is built as real source.

**Step 5.0 — Enabling changes (the required-changes list above).** Extend the
movement reducer for transfers and add the tested `Valuation.movingAverage`
function (shared core, with tests); migration to widen the movement CHECK and add
the costing/valuation columns; extend the AI gateway port with the multimodal
extraction method (seam only, no model wired); add the new RBAC permissions and
numbering scopes. Nothing user-facing; this is the foundation the rest stands on.

**Step 5.1 — Catalogue & Suppliers.** Catalogue enrichment (categories, barcodes,
supersession), suppliers, and the supplier↔item cross-reference, with the parts
search the picker and scanner will use. This also delivers the advisor parts
picker and the mechanic barcode scan that close the Phase 4B reservation gap.

**Step 5.2 — Purchasing & Goods Receipt.** Purchase orders (with their small
state machine and numbering) and the manual goods-receipt workflow that posts
costed `receive` movements and recomputes MAC, advancing PO lines. This is the
first step where stock value becomes correct.

**Step 5.3 — Stock operations.** Transfers (the linked pair), stocktake/counting
(snapshot → count → review → audited close), and standalone adjustments with
reason codes. Stock valuation reporting (on-hand × MAC by item/location) for the
owner.

**Step 5.4 — Replenishment.** Reorder data, the low-stock scan and signal, the
low-stock view, and suggested purchase orders grouped by preferred supplier.

**Step 5.5 — OCR / AI-assisted receiving.** Wire a real multimodal model behind
the gateway seam, the delivery-note extraction → draft GRN → confirm → post flow,
catalogue matching, and the supplier-invoice extraction with three-way match (no
Minimax payables sync yet). This step is last on purpose: it accelerates a
receiving workflow that must already be correct and complete without it.

**Step 5.6 (later, flagged) — Minimax payables direction** and any deeper WMS
features (multi-bin picking optimisation, serial/lot tracking) only if A-SPRINT's
volume justifies them.

Each step should end the way every phase has: a verifiable shared-core test run,
a parse-clean framework layer, and — for the steps that touch money or stock — an
extension of the executable A-SPRINT dry run so the new behaviour is demonstrated
end to end rather than asserted.
