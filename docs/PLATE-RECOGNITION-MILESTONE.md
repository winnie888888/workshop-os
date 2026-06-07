# Plate Recognition — Milestone Report

## 1. What was built

This phase lets a service advisor photograph a vehicle's license plate so the
system identifies the vehicle and customer, detects whether an open work order
already exists, and — only on the advisor's confirmation — opens that job or
creates a new one. It was built as the same "airlock" the OCR phase established,
applied to vehicle identification rather than stock receiving: an untrusted
photograph is read by a model, the result is normalized and matched against our
own records, and a human confirms before anything is created or opened.

The new pieces are four, mirroring the OCR phase. In the shared core, two tested,
dependency-free modules: `plate-recognition` (canonicalizing a plate, modelling
the character confusions a camera makes — O↔0, I↔1, B↔8, S↔5, 4↔A and so on — and
inferring the likely country from the plate's shape across SI, HR, AT, DE, HU and
IT), and `plate-match` (ranking the tenant's vehicles against a recognized plate
with confidence tiers: an exact canonical match, a weaker match that only holds
after folding confusable characters, or no match). In the backend, the AI gateway
gained a focused `recognizePlate` seam (a plate is not a document, so it sits
beside `extractFromDocument` rather than overloading it), with a real provider
path and a deterministic fixture so the flow runs offline. A plate-recognition
service orchestrates read → normalize → match → detect-open-work-orders and
exposes two human-confirmed actions that delegate to the existing work-order
workflow. A migration records each recognition. In the frontend, a mobile-first
advisor scan screen handles all four outcomes (one confident match, several
candidates, no match, or a confusable read that must be confirmed), reachable from
the advisor command bar.

## 2. Plate recognition architecture — the airlock, reused

The governing idea is identical to OCR receiving, which is the point: a photograph
is an untrusted input, and creating or opening a work order is the irreversible
act that only a human may authorize. The architecture enforces this in separated
stages. The upstream door is the AI gateway's `recognizePlate`, which gets the
photo's bytes to a model and returns the plate text, an optional country, and a
confidence, applying the same EU-residency guard and provenance logging as every
other AI call (a vehicle photo is treated as PII because it may show people or a
location). The middle is the shared plate core — pure, deterministic, tested by
execution — where the messy read is canonicalized, the country is inferred, and
the candidates are ranked. The downstream door is the existing work-order
workflow: recognition itself mutates nothing, and the two confirm endpoints either
return an existing job to open (no mutation) or delegate to the existing
work-orders `create` (the same validated path manual intake uses). Plate
recognition adds new callers of that workflow, never a new bypass.

The one genuinely new piece of reasoning here, with no parallel in OCR, is
cross-border plate handling. A plate read from a photo carries two noises a typed
plate never does: character confusion (a dirty or angled plate makes a model
report O for 0, or A for 4) and country ambiguity (SI, HR, AT, DE, HU and IT
plates have genuinely different shapes). The shared core addresses the first by
folding confusable glyphs to a common key, so a misread "NMCKA18" still finds the
real "NMCK418" — but reports it as a confusion match the advisor must confirm,
never a silent acceptance. It addresses the second by inferring the country as a
ranked guess, boosted by known regional prefixes, rather than a fact.

## 3. Human review workflow

The advisor taps "Scan plate", photographs the plate, and the system reads and
matches it. The screen then shows one of four things. With a single confident
match it shows the vehicle, the customer, and any open jobs, so the advisor is one
tap from the right job — opening an existing job, or starting a new one. With
several candidates it shows a chooser. With a confusable read it shows the
candidate framed in amber with a "please confirm" note and the reason. With no
match it offers to register a new vehicle, pre-filling the recognized plate and
country. Nothing is created or opened until the advisor taps a confirm action;
recognition itself changes nothing, and every step — the recognition, opening a
job, creating a job — is written to the hash-chain audit, with the full
recognition also stored for re-review and accuracy analysis.

## 4. Remaining risks

The standing environment caveat holds: the shared plate core and the end-to-end
pipeline are proven by execution (171 shared tests; a dry-run scenario that takes
the fixture plate read through normalization, country inference, and matching,
including the confusable-misread and no-match cases), but the NestJS modules and
the React screen are real production source verified by parse-check and import/
route cross-checks, not by a live model, database, or browser. The real final gate
is running against a deployed instance with migration 0012 applied and a real
EU-resident vision model configured.

Three substantive risks deserve naming. First, recognition accuracy is only as
good as the model, which is not wired yet — the fixture stands in, so real-world
accuracy on angled, dirty, foreign plates is unmeasured. Second, and most
important, country inference from a plate's SHAPE is inherently uncertain, because
European plate formats genuinely overlap (a four-letter-plus-three-digit string
fits several countries); the code treats country as a ranked guess and the match
still works without it, but the country shown should be read as a hint, not a
fact. Third, the character-confusion folding is a deliberate trade: it recovers
real plates from misreads, but it also means two genuinely different plates that
differ only by a confusable character will both surface as candidates — which is
exactly why a confusion match is always flagged for confirmation rather than
auto-accepted, and why the human-confirm step is mandatory rather than a
convenience.

## 5. Multi-tenant security and audit

Unchanged in character from prior phases and fully maintained. Every read in the
plate service is tenant-scoped through the same `withTenant` mechanism, so the
vehicle candidates, the customer lookup, and the open-work-order detection can
only ever see the acting tenant's data. The confirm-existing path verifies the
work order belongs to the recognized vehicle before returning it. Recognition,
opening a job, and creating a job are each appended to the hash-chain audit, and
the AI interaction is logged with its provenance, so the trail runs from the
photograph through the read to the work order.

## 6. Plate recognition readiness assessment

Against the eight success criteria, the phase meets them at the level this
environment can prove. The advisor photographs a plate; the system extracts and
normalizes it; it finds the matching vehicle; it shows the customer and vehicle;
it detects whether an open work order exists; the advisor confirms; an existing
job opens or a new one is created through the existing workflow; and the full flow
runs in demo mode on a phone. The supported nationalities (SI, HR, AT, DE, HU, IT
and a graceful unknown) are covered by the country-inference tests, the multi-
match and no-match branches are implemented and demonstrated, and the no-match
path offers new-vehicle registration with the plate pre-filled. The pipeline is
proven end to end by execution against the fixture. The one true blocker before
real-world use is configuring a real EU-resident vision model behind the gateway's
already-wired `recognizePlate` seam; until then the airlock, the normalization,
the matching, and the review workflow are complete and correct, but recognition
accuracy on real plates is unmeasured.

No voice work orders, employee time tracking, or vehicle rental was begun.
