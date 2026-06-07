# Pilot Execution Guide — A-SPRINT

*Purpose: turn the conditional pilot GO into a concrete plan A-SPRINT can run. The
guiding principle is that a first pilot earns trust gradually: it runs real work
through the system while keeping a human hand on anything that leaves the building —
money and integrations — until each has proven itself.*

---

## 1. Entry conditions (do not start the pilot until all are true)

The pilot may begin once the staging runtime gate (Staging Guide, Section 3) has
passed cleanly in a browser, a backup-and-restore has been tested once, real users
have been seeded with the correct roles, and storage and OIDC work end-to-end. Until
the staging walk is green, the pilot has no evidence base and should wait.

---

## 2. Scope: what the pilot uses, and how

The pilot should run the modules that are fully built and self-contained inside the
workshop first, then layer in the externally-facing pieces under supervision.

Run normally from day one: customer and vehicle records, work orders with labour and
parts, the warehouse (receiving, stock, suppliers), employee time and attendance,
vehicle rental, and the AI Workshop Manager (which is advisory by construction and
cannot change a record, so it is safe to rely on for insight immediately).

Run with a human checkpoint: invoicing and Minimax export. Every invoice should be
reviewed on screen before it is treated as final, and every Minimax export should be
reconciled by the accountant against Minimax until the live mapping has proven
itself over a meaningful number of documents. This is not because the engine is
suspect — the VAT and totals logic is the same tested engine used throughout — but
because the *export* to a live external system is the one path staging cannot fully
rehearse.

Frame as in-workshop only for now: the customer portal and any reminders. Because
SMS and email delivery are not yet implemented, the portal should be used as a
counter or tablet tool, and customers should not be promised automated
notifications until the notification adapter ships.

Treat as advisory with the fixture model: OCR, plate recognition, and voice. With
the offline fixture provider these produce deterministic sample output; once the
real EU model is wired (it can be wired during the pilot without code changes), they
become genuinely useful. In both cases a human confirms before anything is written,
so they are safe to use and learn from throughout.

---

## 3. Suggested phasing

A gentle ramp works best. In the first week, run a single advisor and one or two
mechanics on customers, vehicles, and work orders only, so the core flow and the
mobile experience are stress-tested on real jobs. In the second week, add the
warehouse and attendance. In the third, turn on invoicing with the human checkpoint
and begin reconciling Minimax. Bring in rental whenever A-SPRINT has a rental to
process. Keep the AI Manager visible to the owner throughout, since it costs nothing
and surfaces issues early.

---

## 4. Roles and the human-in-the-loop

The owner watches the AI Manager and the profitability picture. The advisor creates
work and reviews invoices before they are sent. The accountant owns the Minimax
reconciliation and is the final authority on anything financial. Mechanics use the
mobile screens and the airlocked AI inputs. The clear rule for everyone: the system
proposes and records, but a named person approves anything that affects money or
leaves the workshop.

---

## 5. What to measure

Measure the things that tell you whether the product is doing its job: how long a
work order takes from open to invoice, how often the AI airlocks (OCR, plate, voice)
save typing versus need correction, whether the AI Manager's flags prove accurate
when investigated, whether any tenant-isolation or permission surprise ever occurs
(should be never), and the accountant's confidence in the Minimax reconciliation
over time. Capture friction points in the mobile UX, since reducing clicks and
typing is the founding promise of the product.

---

## 6. Stop conditions

Pause the pilot and fix before continuing if any of these occur: data from one
tenant is ever visible to another (a security stop — should be impossible under
RLS, but treat any sighting as critical), an invoice is issued with incorrect VAT or
totals that the engine should have caught, the migration or a deployment leaves the
database in an inconsistent state, or the audit trail shows a gap. Ordinary bugs and
UX friction are expected and logged, not stop conditions.

---

## 7. Exit: from pilot to production

The pilot succeeds when A-SPRINT has run real work for several weeks with no stop
condition, the accountant trusts the Minimax export without manual reconciliation,
the real AI model is wired and its quality measured, and the notification adapter is
live so the portal can finally reach customers. At that point the production
checklist (Deployment Guide, Section 7) becomes the gate to unattended production.
