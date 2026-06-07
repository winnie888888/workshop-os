# OCR Delivery Notes — Milestone Report

## 1. What was built

This phase delivers OCR-assisted warehouse receiving: a clerk photographs a
supplier delivery note or invoice, the system reads it, matches what it read to
our own records, and prepares a DRAFT goods receipt that a human reviews and
confirms before any stock moves. It was built as a thin orchestration on top of
existing capabilities — the goods-receipt draft-then-post workflow, the AI
gateway, the attachments pipeline, the suppliers and catalogue, and the costed-
receive chokepoint — rather than as a new subsystem.

The new pieces are four. In the shared core, two tested, dependency-free modules:
`ocr-extraction` (normalization — turning messy model output into clean typed
values: European and English number formats, several date layouts, quantities
with trailing units, VAT rates, plus per-field confidence tiers and review
flags), and `ocr-matching` (the matching engine — supplier by VAT id then fuzzy
name, catalogue item by the supplier's own part code then OEM reference then our
SKU then description similarity, and purchase order by referenced number, each
with an explicit confidence and a human-readable reason). In the backend, the AI
gateway's document-extraction seam was wired (with a real EU-resident HTTP
provider path and a deterministic fixture provider so the flow runs offline), and
an OCR receiving service orchestrates extract → normalize → match → draft, never
posting. A migration adds an `ocr_extractions` store for the full extraction, for
audit and later re-review. In the frontend, a phone-first warehouse review screen
lets the clerk photograph a document, see the prepared draft with every low-
confidence field and unresolved line clearly highlighted, and confirm.

## 2. OCR architecture — the airlock

The governing idea is an **airlock** between an untrusted input (a creased photo
in a dim warehouse) and a trusted ledger (the immutable stock movements and
moving-average cost). Everything upstream may propose; only a human may commit.
The architecture enforces this physically, in three separated stages.

The **upstream door** is extraction, owned by the AI gateway. The gateway gets
bytes to a model and returns the model's structured JSON plus provenance (model,
residency, latency, cost), applying the same EU-residency guard as every other AI
call and logging every interaction. It deliberately does not know what a delivery
note is — giving the raw JSON meaning is not its job.

The **middle** is the shared OCR core: normalization and matching, both pure,
deterministic, and tested by execution. This is where the messy strings become
clean values and where the document is related to our records, with confidence
tiers throughout. Keeping this in the dependency-free shared core is what lets the
hard logic be proven by running it, independent of any model or database.

The **downstream door** is the existing goods-receipt workflow. The OCR service
assembles a draft and calls the existing `createDraft` — the same validated
endpoint manual receiving uses — and it physically cannot post, because posting is
a separate method on a separate controller. A draft can only contain lines that
resolved to a catalogue item with a whole-number quantity and a readable cost;
anything ambiguous is handed back as a review item, never smuggled into the draft.
When the receipt is finally posted by a human, stock moves through the one costed-
receive chokepoint, so the ledger and moving-average cost are maintained exactly
as before. OCR adds a new caller of that chokepoint, never a bypass.

## 3. Human review workflow

The clerk opens the warehouse screen, chooses the document type, and photographs
the note. The system extracts and matches, then shows a review panel: the matched
supplier and purchase order at the top (green when matched, amber when not), the
document number and date, and each line as a card. Every line carries a match
badge — Matched, Confirm, or New item — and any field read with low confidence or
that could not be parsed is highlighted in amber with a plain-language reason
("Low extraction confidence", "Unit price could not be read", "No catalogue item
matched"). A banner appears whenever anything needs attention. The clerk corrects
what is wrong, confirms the supplier and lines, and only then presses Confirm &
receive stock, which posts the draft through the standard workflow. The screen
never computes money or moves stock itself; it is purely the review-and-confirm
surface. The whole extraction, including the lines that were not draftable, is
stored so the clerk can revisit it without re-running extraction.

## 4. Remaining risks

The standing environment caveat holds: the shared OCR core and the end-to-end
pipeline are proven by execution (151 shared tests; a dry-run scenario that takes
the fixture delivery note through normalization and matching to a flagged draft),
but the NestJS modules and the React screen are real production source verified by
parse-check and import/route cross-checks, not by a live model, database, or
browser. The real final gate is running against a deployed instance with
migration 0011 applied and a real EU-resident multimodal model configured.

Three substantive risks deserve naming. First, **extraction quality is only as
good as the model**, which is not wired yet — today the fixture provider stands in,
so the pipeline is exercised but real-world accuracy on creased, multilingual,
photographed notes is unmeasured. Second, and most important, **fuzzy description
matching can confidently confuse two genuinely different parts** whose names differ
by one word — the test phase surfaced "Oil filter element" scoring 0.89 against
"Air filter element". This is precisely why item matching prefers exact
identifiers (supplier SKU, OEM reference) over description similarity, and why the
human-review step is non-negotiable rather than a convenience; a description-only
match should always be treated as a suggestion to confirm. Third, **the receiving
location is defaulted, not inferred** — the clerk should confirm where stock lands,
and a fuller build would let them pick among the tenant's locations on the draft.

## 5. Minimax compatibility

Nothing in this phase changes the accounting boundary. OCR produces a goods
receipt, which is an inventory event, not an accounting document; the Minimax
direction concerns supplier invoices as payables, which remains deliberately
deferred (only a reserved reference column exists). Because OCR feeds the same
goods-receipt workflow and the same costed-receive chokepoint, the figures that
would ever flow to accounting are produced identically whether a receipt was
created by hand or from a photograph, so Minimax compatibility is unaffected.

## 6. OCR readiness assessment

Against the ten success criteria, the phase meets them at the level this
environment can prove. A clerk can photograph a delivery note; the system extracts
structured data; the supplier is matched (by VAT id in the demonstrated case);
catalogue items are matched (by supplier SKU and OEM reference); a draft goods
receipt is created; the clerk reviews and can correct; the clerk confirms;
inventory is updated only through the existing posting workflow; the OCR result is
audit-logged (both as a hash-chain entry and as a stored extraction); and low-
confidence fields are clearly marked for review. The end-to-end pipeline is proven
by execution against the fixture, and the flow is demonstrable on a phone in demo
mode. The one true blocker before real-world use is configuring a real EU-resident
multimodal model behind the gateway's already-wired seam; until then the airlock,
the matching, and the review workflow are complete and correct, but extraction
accuracy on real paper is unmeasured.

No plate recognition, voice work orders, employee time tracking, or vehicle rental
was begun.
