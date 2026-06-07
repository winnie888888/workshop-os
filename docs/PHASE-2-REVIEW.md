# Phase 2 — Senior Code Review & Fixes

This document records the pre-Phase-3 review of the Phase 2 work: the defects found, which were fixed now, and which are deliberately deferred with a recommendation. No new features were added; this was a correctness and integrity pass.

## Critical defects — fixed

**1. Guaranteed crash when adding a work-order line.** The audit entry's `after`
payload spread a `Money` object whose `minor` field is a `bigint`, and the audit
writer called `JSON.stringify`, which throws on `bigint`. Every line-add aborted.
Fixed by serializing the audited figures as decimal strings, and — as defence in
depth — by making both the audit writer (`safeJson`) and the shared hash-chain
canonicalizer coerce `bigint` to string so this class of bug cannot recur at any
call site. Covered by a new core regression test.

**2. Stock corruption from a reserve/issue location mismatch.** A part line
reserved stock at the location given when it was added, but `issueLine` issued at
a *separately supplied* location, with no guarantee the two matched — decrementing
`reserved` at one location and `on_hand` at another. Fixed by adding
`work_order_lines.reserved_location_id` (migration 0003), recording it on reserve,
and issuing against that stored location only. The issue endpoint no longer takes
a location at all, removing the chance to pass the wrong one.

**3. Offline-sync idempotency hole.** The "seen this mutation?" check, the effect,
and the recording of the idempotency key ran in three separate transactions, so a
crash between effect and record could re-run the effect: a part billed and reserved
twice (`add_line`), or a mutation that could never be acknowledged (`transition`,
`clock_off`). Fixed by making each replayable operation idempotent *by
construction*, which is the correct offline-first principle: `add_line` accepts a
client-supplied line id and no-ops if it already exists; `transition` treats a move
to the current state as a successful no-op; `clock_on` returns the existing entry if
the mechanic is already clocked onto that work order; `clock_off` acknowledges when
there is no open entry. The `sync_mutations` table is now a result cache, not the
correctness mechanism.

## High-severity — fixed

**4. Implicit transition was invisible.** When `clock_on` auto-advanced a job from
`open` to `in_progress`, it wrote neither an audit row nor a change-feed row, so the
tamper-evident trail had a gap and offline devices never learned the job had
started. The implicit transition is now audited and published like any explicit one.

**5. Parts could be issued on a non-editable work order.** `issueLine` had no status
guard, so stock could move against a closed or cancelled job. It now requires the
work order to be in an editable status.

## Medium — documented, deferred to Phase 3 (not bugs to fix blindly)

**A. Clocked labour does not flow into billing.** Clock-off computes and stores a
labour cost on the time entry, but that cost never becomes a work-order line, so it
is absent from totals and the eventual invoice. This is a legitimate design choice —
shops typically bill *book/standard* hours and track *clocked* hours for payroll and
productivity — but the choice must be made explicitly in Phase 3's invoicing design
rather than left as a silent gap. Decision required: bill clocked time, bill book
time, or bill book time with clocked-vs-book variance surfaced to the advisor.

**B. Offline clock timestamps reflect replay time, not bay time.** `clock_on` and
`clock_off` stamp server time at the moment of replay, so labour clocked offline and
synced hours later records almost no duration. The correct fix carries a trusted
client event timestamp with server-side clamping (reject future times, cap absurd
durations). That is closer to new work than a fix, so it is scheduled for Phase 3
alongside the broader offline-time-accuracy work, and flagged as a known limitation
until then.

**C. `countBillableLines` counts every line, including discounts.** The
"cannot invoice an empty job" guard would pass on a work order containing only a
discount line. Low impact today (no flow creates a discount-only order), but the
invoicing phase must define "billable" precisely (at least one positive-net,
non-discount line) and rename the check accordingly.

## Test coverage

The shared core suite is green at **32/32** (was 31), with two new regression tests:
the audit hash-chain now provably tolerates a `bigint` Money payload, and every
work-order state is asserted to forbid a self-transition (the invariant that makes
the new idempotent no-op safe). Service-level fixes (location integrity, idempotent
replay) require the database and are scheduled for the Phase 3 integration-test
track in CI, together with the RLS cross-tenant rejection test already planned.
