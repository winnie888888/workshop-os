# Branding Readiness Report — Workshop OS

*This report verifies that the A-SPRINT / Workshop OS branding is consistently
applied across every requested surface, reflects the logo added this phase, and
names honestly what remains.*

---

## 1. Surface-by-surface verification

The A-SPRINT / Workshop OS identity is applied consistently everywhere a surface
exists. Let me walk the requested list.

The **landing page** now leads with the new SVG logo mark beside the "A-SPRINT —
Workshop Operating System" wordmark. The **login** is handled through the OIDC
identity provider rather than a first-party page, so the brand lives on the landing
launcher that frames it; there is no separate branded login screen because there is
no separate login surface to brand. The **demo page** is the landing page in demo
mode, so it carries the same logo and wordmark, plus the new Share card. The
**staff application** — the advisor, mechanic, employee, and warehouse layouts —
each carry the wordmark consistently, and the **warehouse**, **AI Manager**, and
**vehicle rental** screens inherit that same shell. The **customer portal** is
branded through its own layout.

On the installable-app surfaces: the **PWA icons** and **mobile install icons** are
declared in the web manifest (192 and 512 pixels, with a maskable variant for
Android), the **favicon** and iOS home-screen icon are declared in the root layout's
metadata pointing at the committed PNGs, so the browser tab and the installed app
are both branded. The new `/logo.svg` additionally gives a crisp, scalable source
that A-SPRINT can use to regenerate these icons from their official mark.

On documents: the **PDF rental contracts** and the **customer-portal PDF invoices**
carry the A-SPRINT name and the SI45598711 VAT identifier in their headers, so the
documents a customer receives are branded. A dedicated **PDF reports** surface (for
example payroll or analytics exports) is part of the deferred reporting work and so
has no branded output yet.

## 2. What changed this phase

A brand logo now exists. Previously the branding was a typographic wordmark with no
logo image; this phase added a clean, font-independent SVG mark in the brand blue —
a motion swoosh echoing A-SPRINT's transport identity with a wrench motif for the
workshop — and placed it in the landing header. It is deliberately a presentable
placeholder: it gives the demo a real mark to show today, and it is wired so that
dropping A-SPRINT's official logo file in at `/logo.svg` replaces it everywhere with
no code change.

## 3. What remains (stated honestly)

Three items remain, and all are gaps of coverage rather than inconsistency. The
official A-SPRINT logo graphic has not been supplied, so the current mark is a
clean stand-in rather than the company's own artwork. **Email templates** and **SMS
landing pages** do not exist as branded surfaces because their adapters are stubs;
they will be branded when those integrations are implemented. And a branded PDF
reports surface awaits the deferred reporting-export work.

## 4. Inconsistencies

None were found on any built surface. The wordmark, the new logo, the dark theme
(`#14181d`), and the Archivo/IBM Plex typography are used uniformly across the staff
app, the portal, the demo, and the PDFs.

## 5. Recommendations

Supply A-SPRINT's official logo file and drop it in at `/logo.svg` (and regenerate
the PWA/favicon PNGs from it) to move from a stand-in to the real mark. Design
branded email and SMS templates as part of implementing those adapters. Add a
branded header to PDF reports when the reporting-export surface is built. None of
these blocks the demo, the presentation, or the pilot.

## 6. Verdict

**Branding is ready for demo deployment and commercial presentation.** Every surface
a viewer or pilot user encounters — the app, the portal, the installed PWA, the
PDFs, and now a logo mark — is consistently branded. The remaining work is supplying
the official artwork and branding surfaces that await their underlying features.
