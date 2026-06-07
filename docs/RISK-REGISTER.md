# Risk Register — Workshop OS Deployment & Pilot

*Each risk is rated for likelihood and impact and paired with a mitigation and an
owner. The register is ordered roughly by exposure (likelihood × impact). None of
these is a reason not to proceed to staging and a supervised pilot; they are the
things to watch and discharge along the way.*

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|------|:----------:|:------:|------------|-------|
| R1 | Framework layer behaves differently against a live DB/HTTP/browser than parse-checks imply (a moved column, an RLS edge, an OIDC redirect) | Moderate | High | The staging runtime gate (Staging Guide §3) exists precisely to surface these cheaply before the pilot; CI already provisions Postgres | Eng |
| R2 | Minimax field/VAT/partner mapping differs from the live tenant | Moderate | High (accountant is a primary user) | Minimax verification checklist (Deployment Guide §9.1); human reconciliation during the pilot until proven | Accountant + Eng |
| R3 | Customer-facing communication cannot be delivered (SMS/email are stubs) | Certain (today) | Medium | Frame portal/reminders as in-workshop during the pilot; implement Infobip + email adapters against the existing port (no redesign) | Eng |
| R4 | Real EU AI model not yet wired; fixture provider in use | Certain (today) | Medium (contained — all AI is advisory/airlocked) | AI provider checklist (Deployment Guide §9.4); wire and measure during the pilot without code changes | Eng |
| R5 | Billing-policy assumptions (rental day-count rounds up, fee conventions) may not match A-SPRINT terms | Certain to need confirmation | Low if caught early | Confirm with A-SPRINT before turning on rental invoicing; conventions are isolated in the tested charge engine | Owner + Eng |
| R6 | Deferred spec items (consolidated/periodic invoicing, leave & travel mobile UI, multi-format payroll export) are needed sooner than expected | Moderate | Medium | Documented as deferred, not regressions; prioritise from real pilot demand | Product |
| R7 | Four permissions defined but unenforced because their endpoints do not exist yet | Low | Low (no exposed surface today) | Enforce each when its endpoint is built; `AiApproveFinancial` must gate the first AI financial write if ever added | Eng |
| R8 | Data loss or a bad data event in production | Low | High | Managed daily backups + PITR; pre-migration and pre-release snapshots; corrections via credit notes preserving the audit trail (Deployment Guide §8) | Ops |
| R9 | Branding polish incomplete (no logo image asset; no branded login/email/SMS surfaces) | Certain (today) | Low | Add logo SVG and branded surfaces as those features land; current surfaces are consistently branded | Design |
| R10 | Demo lacks a visible Minimax step | Certain (today) | Low (cosmetic for demo) | Optionally add an "exported to Minimax" confirmation to the invoice demo flow | Eng |
| R11 | Outbox events stuck/failing silently in production | Low–Moderate | Medium | Monitor outbox depth and failures; alert past `OUTBOX_MAX_ATTEMPTS` (Deployment Guide §7) | Ops |

## Standing structural note

The dominant theme across R1, R2, and R4 is the same: the offline build proved the
deterministic core by execution and the framework layer by structure, so the
residual risk concentrates wherever the system meets a live runtime or an external
party. This is why the staging pass is the highest-leverage single action available
— it converts the largest risk (R1) from open to closed and de-risks the
integration work that follows.
