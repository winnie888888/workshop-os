# Branding & Demo Readiness Assessment — Workshop OS

*This document gathers the two readiness questions — is the A-SPRINT / Workshop OS
branding consistently applied, and does the demo showcase the complete product —
into one place, each with evidence and a clear verdict.*

---

## Part 1 — Branding readiness

### Where branding is implemented (verified present)

The A-SPRINT / Workshop OS identity is applied consistently across every surface
that actually exists. In the staff application, the advisor, mechanic, employee, and
warehouse layouts each carry the wordmark, as do the landing page, the owner
dashboard, the rental screens, and the customer portal. The installable app is
properly branded through both the web manifest and the root layout's metadata: the
manifest sets the app name to "A-SPRINT Workshop OS", the short name to "Workshop
OS", and a coherent dark theme (`#14181d`), and declares the maskable Android icons
at 192 and 512 pixels; the root layout's metadata declares the favicon and
Apple-touch links pointing at the committed PNG icons. This means the browser tab,
the iOS home-screen icon, and the Android installed icon are all branded — a point
the earlier audit understated. Finally, the documents a customer actually receives
are branded: the rental-contract and portal-invoice PDF generators emit the A-SPRINT
name and the SI45598711 VAT identifier in their headers.

### Where branding is missing or thin (verified absent)

Three gaps remain, and all three are gaps of *coverage* rather than of consistency.
First, there is no logo *image* asset anywhere in the project; the brand is rendered
as a typographic wordmark in the display font rather than the actual A-SPRINT logo
graphic that exists in Project Knowledge. Second, there is no dedicated, branded
staff login screen, because staff authentication is handled through an OIDC
callback rather than a first-party login page — so the "login page" branding item
has no surface to live on yet. Third, branded email templates and SMS landing pages
do not exist at all, because the notification layer is still a stub; those branded
surfaces will come into being only when the email and SMS adapters are implemented.

### Inconsistencies

No conflicting or mismatched branding was found on any surface that is built. The
wordmark, the dark theme, and the typography are used uniformly. The only
"inconsistency" is the expected one: surfaces that do not exist yet (email, SMS,
login) naturally carry no branding.

### Recommendations

Add the real A-SPRINT logo as an SVG asset and place it in the layouts and the PDF
headers, which would lift the brand from a wordmark to the genuine identity. When
real authentication and the notification adapters land, design a branded login
screen and branded email and SMS templates as part of that work. None of this blocks
a demo or a pilot.

### Branding verdict

**Ready for demo deployment and commercial presentation now.** Every surface a
viewer or pilot user will encounter — the app, the portal, the installed PWA, the
PDFs — is consistently branded. The remaining work is polish (the logo graphic) and
surfaces that await their underlying features (email, SMS, login).

---

## Part 2 — Demo readiness

### Verified demo workflows

The demo runs entirely on in-memory fixtures, the demo client short-circuits every
API call, and the default handler never throws, so even an untailored screen
renders rather than erroring. Against that backdrop, each requested workflow was
verified to have a working demo path:

Work orders, the warehouse in full (inventory, stock operations, goods receipts,
suppliers, and purchase orders), OCR delivery notes, plate recognition, voice work
orders, employee time and attendance, the AI Workshop Manager, vehicle rental, and
invoicing all answer from the staff demo handlers. The customer portal is also fully
demoable, though through its own separate demo path rather than the staff one,
because the portal uses a distinct per-host client by design. The 87-check dry run
exercises these domains end to end and passes entirely.

### Demo data quality

The fixtures are realistic and tailored to A-SPRINT: the AI Manager demo, for
instance, returns a believable prioritised set of insights — a real overdue
receivable, a loss-making job, a low-stock reorder — rather than placeholder text,
and the rental demo computes a coherent return bill. This is the right standard for
a demo meant to persuade.

### Missing and broken paths

One workflow on the requested list has no visible demo surface: the Minimax export.
The backend emits the correct outbox events when an invoice is issued, but the demo
does not *show* an export confirmation, so a viewer cannot see Minimax working. This
is the single demo gap, and it is cosmetic — a small "exported to Minimax"
confirmation added to the invoice demo flow would close it. No broken demo paths
were found: every API group the screens call resolves to a defined client method,
every staff area has a handler, the portal has its own, and the dependency and
import checks are clean.

### Mobile experience and PWA installation

The screens are built mobile-first with large tap targets and the workshop-oriented
design tokens, and the manifest plus metadata make the app installable to a phone
home screen with a branded icon. Both the mobile rendering and the install flow
should be confirmed once on a real device during the staging pass (Staging Guide),
since that is the one aspect the offline checks cannot fully exercise.

### Demo verdict

**Ready.** The demo showcases the complete product end to end, on fixtures, with the
single cosmetic exception of a visible Minimax step. It is suitable for commercial
presentation today, and a real-device pass during staging will confirm the mobile
and PWA polish.
