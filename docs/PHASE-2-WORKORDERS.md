# Phase 2 — Work Orders, the Bay, and Inventory (Milestone Report)

Status: **complete**. This report follows the required structure: what was built, why it was built this way, what comes next, and the updated package.

---

## 1. What was built

Phase 2 turns the foundation into a working shop floor. Every one of the ten requested areas is implemented as real domain logic, real migrations, and real APIs, and the parts where a mistake would quietly cost money or break the law are proven by executable tests.

The **verified domain core** in `packages/shared` grew four new pieces, each pure and unit-tested. The work-order state machine encodes exactly which status may follow which, with terminal states and business guards (you cannot mark a job *ready* while a mechanic is still clocked in, and you cannot invoice a job with no billable lines). Time tracking computes clocked duration in whole seconds and labour cost in exact money, and refuses to let one mechanic be clocked onto two jobs at once. The inventory reducer enforces the two numbers that must never drift — on-hand and reserved — so the system can never promise a part it does not have. Line pricing computes base, discount, net, VAT, and gross on top of the already-tested money primitives, with a worked example (2.5 hours at €65, 10% discount, 22% VAT → net €146.25, VAT €32.18, gross €178.43) locked in as a test. The suite now runs **31/31 green**.

The **database migration** `0002_workorders_inventory.sql` adds fleets (and wires the asset→fleet foreign key), work orders, work-order lines, time entries, inventory items, per-location stock levels, an immutable stock-movement ledger, the offline change feed, and the device-mutation idempotency table. It keeps every Phase 1 convention: `tenant_id` on every row, row-level security enabled **and** forced, money as bigint minor units, optimistic `version` columns, and `updated_at` triggers. Two invariants are pushed all the way down into Postgres as defence in depth: a partial unique index guarantees at most one open time entry per mechanic, and check constraints guarantee `reserved ≤ on_hand`.

The **API layer** adds the modules you listed. Customers gained fleets and vehicles alongside them; vehicles carry plate normalisation and structural VIN validation, and tractor/trailer pairing is modelled as a time-bounded relationship because the same tractor pulls different trailers on different days. The work-orders module is the centrepiece: it creates the digital *Delovni nalog* with a gapless work-order number, adds priced lines that reserve stock in the same transaction, advances status through the guarded state machine, tracks mechanic clock-on/clock-off with exact labour costing, and assembles the full nalog document for printing. Inventory exposes catalogue, goods receipt, and stock queries, and lends its transactional `move` to the work-order flow so reservations are atomic with the line that causes them. The sync module gives the offline bay app its two directions: a cursor-based pull of everything that changed, and an idempotent replay of queued mutations that runs through the *same* domain services as the online path, so there is no weaker second code path.

---

## 2. Why it was built this way

The guiding choice, carried over from Phase 1, is that correctness-critical rules live in one pure, tested place and are imported by everyone who needs them. A state machine that is just a column and some scattered `if` statements drifts the moment two developers touch it; written as one explicit transition table with tests, it cannot. The same reasoning puts money, stock, and time arithmetic in the shared core: these are exactly the calculations a workshop owner would never forgive us for getting subtly wrong, so they are the calculations we execute and assert rather than trust.

Reserving stock and recording labour inside the work order's own database transaction is what makes the shop-floor numbers trustworthy. If adding a part line and reserving the part could happen in separate steps, a crash between them would leave either a promise with no stock or stock held for a line that does not exist. By doing both atomically, the books are always consistent with reality. Pushing the hardest invariants into the database too — one open clock per mechanic, reserved never exceeding on-hand — means even a future bug in application code cannot corrupt the ledger.

The offline design treats the change feed as an append-only log with a monotonic cursor because "catch me up since I was last online" then becomes a single ordered scan, and gaps in that log are harmless (unlike invoice numbers, which is why those use a locked counter instead). Routing replayed mutations through the identical `WorkOrdersService` is a deliberate refusal to build a second, weaker offline path; the device gets exactly the same validation, pricing, and state rules as the counter, with idempotency keys making retries safe.

---

## 3. What comes next

Phase 3 should take the work order the last mile to money and compliance. That means the invoice issuance vertical built on the gapless counter, audit chain, and outbox already in place; the deterministic VAT engine that decides domestic versus intra-EU reverse charge versus export (never an AI guess); accounts-receivable and dunning against the 30/60-day terms A-SPRINT's hauliers run on; and the e-invoicing path — Croatian Fiskalizacija 2.0, which is already mandatory and already affects A-SPRINT's hundred-plus Croatian customers, followed by Slovenian eSLOG/Peppol ahead of the 2028 deadline. Alongside that, the one MVP AI feature chosen by the Phase-0 spike should be built on the residency-guarded AI Gateway, and the bay PWA's conflict-resolution UX should be exercised against the sync endpoints under real intermittent connectivity. Finally, the integration tests that need a live Postgres — proving RLS actually rejects a cross-tenant read, and that two concurrent issuers never get the same number — should join the core tests in CI.

---

## 4. Updated repository package

The repository now contains the Phase 1 foundation plus everything above. The shared core, the two migrations, and all new modules are included; `apps/api/scripts/migrate.js` applies `0002` automatically after `0001`. The honest constraint from Phase 1 still holds: the dependency-free domain core is verified here by execution (31/31 tests), while the NestJS layer is real production source that CI builds with a live database, since this sandbox has no network to install framework dependencies. The delivered archive is `workshop-os-phase2.zip`, with this report and the new migration copied out for quick reading.
