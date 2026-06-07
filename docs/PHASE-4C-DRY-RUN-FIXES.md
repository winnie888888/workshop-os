## Phase 4C — Dry Run Fixes

### What was fixed

The dry run found three things standing between A-SPRINT and a real cross-border
job, and this phase fixes all three. The central one was VAT-id validation. The
invoice engine had always made the legally correct decision — it refuses to
reverse-charge an intra-EU B2B supply unless the customer's VAT id is validated —
but the flag it read, `customer.vat_id_validated`, had no column behind it, no way
to be set, and no VIES integration, so it was permanently false and every foreign
hauler's invoice was blocked. Migration `0006` gives that flag a real home along
with its provenance (how it was validated, when, and by whom), guarded by a
constraint so a validated id can never exist without recording its source. A new
VAT-id validation port sits behind the customers service with two adapters: a real
VIES REST adapter used whenever an endpoint is configured, and an "unavailable"
adapter that reports itself absent so the service falls back to an audited manual
confirmation. The advisor now has a clear workflow on the customer hub — a VAT
status card that shows whether the id is validated and offers either a VIES check
or a manual confirmation that requires a note describing what was verified — and
every validation action, success or failure, VIES or manual, is written to the
tamper-evident audit chain. A small, tested helper in the shared core parses a VAT
id and confirms its country prefix matches the customer's country, so a Croatian
customer carrying a Slovenian id is caught before it can drive the wrong treatment.

The second fix was the empty bay. The seed provisioned only an owner, so there was
no mechanic to assign or to clock the job; it now seeds a real Mehanik membership
(Marko Kovač) so assignment and clocking work the moment the tenant is created. The
third was cosmetic but real: the currency dropdowns still offered HRK, but Croatia
has used the euro since 2023, so HRK is removed everywhere and EUR is the only
choice.

### Why it was fixed this way

The validation design rests on one conviction: whether a VAT id is genuine is a
correctness-critical fact that gates a tax decision, so it must be authoritative
where possible and accountable where not. Hence the port, not a hard-coded VIES
call — when the EU service is wired, its authoritative yes/no decides the outcome
and a "no" leaves the customer unvalidated; when it is not wired, the system does
not silently pretend, it routes the advisor to a deliberate manual attestation that
names what they checked and is recorded against them on the audit chain. That is
the honest interim posture for a workshop that cannot always reach VIES, and it
upgrades transparently to full automation the day an endpoint is configured,
because the rest of the system depends only on the flag, which the invoice engine
already read. Crucially, no VAT or pricing logic was rewritten — the engine,
already correct, simply now receives a flag that can become true through a
legitimate, audited path. Reverse charge is unlocked only by validation, never by
an override, so the gate cannot be casually bypassed.

### Dry run result after fixes

The same executable dry run — running the real shared pricing, VAT, state-machine,
and profitability code — now passes all eleven steps for both customers. The
domestic Slovenian haulier issues with standard 22% Slovenian VAT (€102.85 on
€467.50 net). The cross-border Croatian haulier, once its VAT id is validated,
issues with reverse charge at 0% (net equals gross at €467.50, VAT €0.00) and the
correct legal note. In both, a seeded mechanic is assigned and clocks 4.17 hours
against 3.5 booked, the work order moves open → in_progress → ready, the Minimax
sync event is enqueued atomically inside the issue transaction, and the owner insight
reports 84% efficiency with a €102.50 margin and no anomaly flags. Every success
criterion you set is met.

### Remaining risks

Two honest edges remain. First, until a VIES endpoint is actually configured,
cross-border reverse charge rests on the advisor's manual attestation rather than an
authoritative external check; this is acceptable only because the attestation is
mandatory, note-bearing, and audited, and it should be upgraded to real VIES before
volume grows. Second, the standing environment caveat is unchanged: this dry run
executed the computational core but could not exercise the live database, HTTP, and
browser, so the final gate is still to run the same job on a deployed instance with
migration `0006` applied and the seed loaded. The deferred items from earlier reviews
(server-side upload scanning, voice transcription, a standard-times catalogue for
sharper labour insight) remain correctly deferred and do not block the loop.

With these fixes the system clears the bar the production-readiness review set, and
Warehouse development can begin.
