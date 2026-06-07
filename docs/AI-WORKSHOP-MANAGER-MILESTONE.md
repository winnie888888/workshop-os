# AI Workshop Manager — Milestone Report

## 1. What was built

This phase delivers an AI-powered workshop management assistant that helps owners
and managers make better decisions using the data the system already holds. It is
the strongest form of the advisory principle this project has built toward: where
earlier AI features proposed an action a human then confirmed, the Workshop
Manager has no action to propose at all. It only reads, analyses, prioritises,
explains, and flags. It cannot issue an invoice, alter attendance, or change
stock — not because it is told not to, but because the module contains no code
path that writes to any official record.

It implements all eighteen requested analyses across five families. Profitability
and productivity: labour profitability, under- and over-billing detection, parts
margin, low-productivity detection, technician performance, and customer and
vehicle profitability. Inventory: anomaly detection, slow-moving stock, and
reorder recommendations. Attendance and travel consistency, reusing the tested
reconciliation from the attendance phase. Receivables and invoice risk: structural
invoice problems and overdue-receivable aging. And the summaries: a daily digest,
a weekly digest, and the owner dashboard that ties everything together with a
prioritised list and a plain headline.

## 2. AI architecture

The architecture rests on one decision that makes the assistant both safe and
trustworthy: the system computes every number deterministically, and the AI only
phrases and prioritises what the system computed. Eighteen analyses are, at heart,
eighteen pure detector functions in the tested shared core. Each takes data the
backend has read and emits structured findings — a severity, a title, a
plain-language explanation that includes the numbers, the raw metrics behind it,
and an advisory recommendation. Because these functions are pure (data in,
findings out, no database, no model), every figure an owner sees is reproducible
and auditable, and the AI cannot invent a financial fact, because it is never
asked to compute one.

The backend manager service is a read-only analyst. It assembles each detector's
input with tenant-scoped SELECT queries, runs the deterministic detectors,
prioritises the findings (deterministically, by severity then financial
magnitude, so the ordering is explainable), and only then asks the AI gateway to
rephrase the already-computed summary into a neutral narrative — flag-only, with
the deterministic headline standing if the model is unavailable. It records a
read-only snapshot for history and audit. The controller exposes only GET
endpoints; there is no POST, PATCH, or DELETE in the module, so the advisory-only
guarantee is visible even at the HTTP surface.

## 3. Advisory workflow

The owner opens the insights dashboard from their home screen and can switch
between today, this week, and the last thirty days. The screen leads with the
narrative headline so the situation is graspable at a glance, shows the count of
alerts, warnings, and informational items, and then lists the findings in the
backend's prioritised order. Each finding is colour-coded by severity, states its
explanation with the numbers, names its category, and offers an advisory
recommendation phrased as something to consider — escalate a collection, review a
price, raise a purchase order — never as something the system has done. A clean
period shows a reassuring "nothing needs your attention" rather than empty space.
Every recommendation requires the owner to act; the AI's role ends at surfacing
and explaining.

## 4. Remaining risks

The standing environment caveat holds and matters most. The deterministic engine
and the end-to-end analysis are proven by execution — 231 shared tests and a
74-check dry run that feeds a realistic month of A-SPRINT data through every
detector and the prioritiser — but the manager service's SQL queries and the React
dashboard are real production source verified by parse-checking and by column,
import, and route cross-checks, not by execution against a live database or
browser. The genuine final gate is deploying an instance, applying migration 0015,
and running the queries against real data.

Three substantive risks deserve naming. The data-assembly queries compute several
figures — parts cost from item cost times quantity, labour cost from time-entry
cost, customer profitability rolled up from jobs — and these are honest
approximations whose accuracy depends on the underlying data being captured
consistently; on a real instance they should be validated against the accountant's
own numbers before owners lean on them. The real EU-resident AI model is not yet
wired, so the summary narrative currently comes from the deterministic headline
with a fixture standing in; this is safe by design because the AI is advisory and
the numbers are computed without it, but narrative quality on real data is
unmeasured. And the thresholds throughout — what counts as a thin margin, low
utilisation, or slow-moving stock — are reasonable defaults, not tuned to a
particular workshop; they should be made configurable as the product matures.

## 5. Updated repository package

The repository now carries the AI Workshop Manager end to end: the shared
`workshop-insights` module and its tests, the read-only manager service with its
tenant-scoped data assembly, the GET-only controller and the module registered in
the application root, migration 0015 for the insight snapshots, the API client
methods, the owner insights dashboard with a link from the owner home, and the
demo handlers. The full verification gate passes on every layer.

## 6. AI Manager readiness assessment

Against the eight success criteria, the phase meets them at the level this
environment can prove. The owner receives actionable recommendations; the AI
identifies unusual patterns, profitability issues, inventory issues, attendance
inconsistencies, and receivable risks; the explanations remain understandable and
auditable because each carries its own numbers and traces back to a deterministic
calculation; and demo mode shows a realistic, prioritised set of insights on a
phone. The advisory-only requirements are met by construction: the module has no
write path, the controller is GET-only, and the detectors are pure functions, so
the AI never modifies a record, issues an invoice, alters attendance, or changes
inventory. The one true blocker before production reliance is validating the
data-assembly queries against real data and an accountant's figures, and wiring
the real EU-resident model behind the already-built advisory seam; until then the
engine, the prioritisation, the audit trail, and the dashboard are complete and
correct.

No Vehicle Rental work was begun; this phase stayed focused entirely on the AI
Workshop Manager.
