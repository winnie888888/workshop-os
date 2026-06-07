# Final Demo Readiness Report — Workshop OS

*Date: 7 June 2026. This phase prepared the demo experience for presentation and
pilot evaluation. No business features were built. Three demo-and-UX additions were
made — a brand logo, one-click sharing, and a visible Minimax demonstration — each
verified and each leaving the full test gate green (246 shared tests, 142 backend
files, 87 dry-run checks, all frontend imports resolving, no forbidden deps).*

---

## 1. The objective, and whether it is met

The objective was that a person receives a Viber message, taps one link, and opens
the complete Workshop OS on a phone or computer with no setup or training. As of
this phase that path exists end to end. The demo build runs the entire application
without a backend or login — a ready-made A-SPRINT owner session is planted, and the
API client answers from in-memory fixtures — so the link resolves instantly to a
working, signed-in app. The landing page now carries a one-tap Share card (Viber,
WhatsApp, Email, native share, copy link) that hands the live URL to the next
person, closing the loop the objective describes. Nothing about this affects the
production build, which still uses real OIDC and the real API.

## 2. What changed this phase

Three additions, all confined to demo quality, branding, and user experience:

First, a brand logo. A clean, font-independent SVG mark (`/logo.svg`) was created in
the brand blue and placed beside the wordmark in the landing header. It is a
presentable placeholder-grade mark; A-SPRINT's official logo file can replace
`/logo.svg` with no code change.

Second, one-click sharing. A new `DemoShare` component provides one-tap links to
Viber, WhatsApp, and Email, plus the native share sheet where the device offers it
and a copy-link fallback. It reads the live URL at runtime, so it always shares
whatever address the demo is deployed at. It appears only in demo mode.

Third, a visible Minimax demonstration. The invoice detail screen now shows, in demo
mode, the real outbox sequence the backend performs when an invoice is issued —
queued as a `minimax.invoice.upsert` event, delivered by the worker, then synced
with a Minimax document reference and the work-order link preserved. This closes the
one demo gap every prior audit identified. It visualises an existing backend event;
it issues and alters nothing.

## 3. Per-flow verification

Each required demo flow was verified to have a working, fixture-backed path that
renders and does not error. All eleven are present.

The workshop core (customer, vehicle, work order with labour and parts) runs from
the advisor and mechanic areas. The warehouse flow (inventory, stock operations,
goods receipts, suppliers, purchasing) runs from the warehouse area. OCR receiving,
plate recognition, and voice work orders each run their human-confirmed airlock with
the deterministic fixture provider. The customer portal runs through its own demo
path (a separate per-host client by design). Employee time and attendance runs from
the employee and owner areas. The AI Workshop Manager renders a realistic,
prioritised insight set. Vehicle rental walks the full lifecycle to a computed bill,
an invoice, and a contract PDF. Invoicing renders the issued document with its frozen
VAT breakdown, and the Minimax workflow is now demonstrated visibly on that screen.

## 4. Demo data quality

The fixtures are realistic and tailored to A-SPRINT rather than placeholder text:
the manager demo surfaces a genuine overdue receivable, a loss-making job, and a
low-stock reorder; the rental demo computes a coherent return bill; the invoice
demo shows a real VAT breakdown and now a Minimax sync. This is the standard a demo
meant to persuade should meet.

## 5. Known demo limitations (stated plainly)

The AI features run on the deterministic offline fixture provider, so their output
is representative rather than live; this is correct for a zero-setup demo and is
indistinguishable to a viewer. The Minimax panel is a faithful demonstration of the
real outbox flow, not a live push to an actual Minimax organisation. Email and SMS
delivery are not exercised because those adapters are stubs (the Share feature uses
the device's own Viber/WhatsApp/email apps, which is a different, working mechanism).
None of these limits the demo's ability to showcase the complete product.

## 6. Verdict

**The demo is ready for deployment, presentation, and pilot evaluation.** Every
required flow works on fixtures, the data is realistic, the branding is consistent,
and the one-tap sharing fulfils the core objective. The mobile and PWA polish should
be confirmed once on real devices (see the Mobile Readiness Report), which is the
only check that cannot be completed offline.
