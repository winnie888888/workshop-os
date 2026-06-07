# Frontend Phase — Milestone Document

## What was built

This phase delivers a real Next.js 14 application, `apps/web`, that turns three
of the five approved UX specifications into working, connected screens: the
Mechanic Mobile Interface, the Service Advisor Interface, and the Workshop Owner
Dashboard. It is genuine production source — an App Router project with
TypeScript, Tailwind, SWR for reads, and an offline-first write path — not a
prototype or a set of mockups. Every screen talks to the NestJS API built in
Phases 1 through 3 through a single typed client whose methods correspond
one-to-one with real routes, and whose payloads match the backend DTOs field for
field, so the application is connected to the system that already exists rather
than to an invented contract.

The mechanic interface is the deepest, as the principles demanded. It is a flat,
mobile-first application of four screens — the job list, the job screen, the
capture sheets, and a minimal "Me" screen — built around large gloved-finger
targets, status conveyed as colour blocks for sun legibility, and an offline-first
spine. The job screen carries the large clock control, the four field-action
tiles (Photo, Note, Part, Done), and the quieter "found extra work" path, with no
prices, no VAT, and no invoices anywhere in sight, exactly as the Mechanic UX
Principles require. The clock starts instantly from local state so it works with
no signal, and the mechanic's writes — clock-on, clock-off, add part, transition
— are recorded locally and replayed through the idempotent sync endpoint, so a
dead-signal bay never blocks the work and a flaky connection never double-applies
anything.

The advisor interface is the intake funnel: a persistent navigation rail, a
global command bar, a Today board that groups open jobs into bay lanes with a
derived attention panel, a new-job intake form that captures the same fields as
the paper Delovni nalog and creates a real work order, the work-order workspace
showing the connected customer-vehicle-complaint-lines-totals chain, and the
invoice issue-and-detail flow where the VAT treatment is shown as the engine's
decision and issuing is presented as the irreversible act it is. A receivables
screen reads the real aging report and records payments against a customer.

The owner dashboard is the analytical one-glance health view: revenue, output
VAT, and money-owed tiles built on the real reporting endpoints, a receivables
aging card, a VAT-by-rate card, and a list of recent jobs each linking to the
per-job labour insight. That insight screen is where your Phase 3 business rule
becomes visible — the clocked, standard, and billed hours shown side by side, the
profitability metrics, the deterministic flags, and the AI narrative that
explains and prioritises those flags as analysis the owner can read or ignore,
never as an automatic action.

## Why it is built this way

The design direction is industrial and utilitarian because the context demanded
it, not as decoration. A truck workshop is a place of floodlights, sun glare,
gloves, and grease, and the same aesthetic that serves the mechanic — heavy
type, high contrast, generous targets, status you can read across a bay — also
gives the advisor and owner screens a coherent, tool-like character that reads as
purpose-built rather than generic. The single typed API client exists so there is
exactly one place where the frontend's understanding of the backend lives, which
is what keeps the two honest with each other as both evolve. The offline-first
write path for the mechanic is not a nicety; it is the direct implementation of
the principle that the tool must work with poor internet, and it reuses the
idempotent sync foundation built in Phase 2 precisely so that optimistic local
writes are safe to replay.

A small backend addition was necessary and is included: a read-only,
RLS-protected list endpoint for work orders (`GET /work-orders` with status and
mechanic filters), because the mechanic job list, the advisor Today board, and the
owner attention feed are all list views and the backend previously exposed only
fetch-by-id. Building "working screens connected to existing APIs" was not
possible for any board without it, so adding it was the responsible way to honour
the instruction rather than fake the data.

## What is verified, and the honest caveat

The pure, framework-independent logic is verified by execution: the money, time,
clock, status, and plate formatting helpers pass their checks under Node's
TypeScript stripping, and the backend files extended this phase parse cleanly. I
also statically verified that every API method the screens call exists on the
client, and that every internal import resolves to a real file, so the module
graph is sound. What I cannot do in this environment is run a Next.js build or a
browser, because there is no network to install dependencies and no build step
available offline. The React and Next.js code is therefore real production source
written to compile and run under CI and a normal `pnpm install`, but it has not
been bundled or rendered here. This is the same honest division as the backend
phases: correctness-critical logic proven by running it, and the framework layer
delivered as real source that the continuous-integration pipeline builds.

## What comes next

The natural Phase 4 work falls into two groups. The first is the backend
dependencies these screens are ready for: an attachments upload endpoint so the
mechanic's photos and voice notes persist server-side rather than queuing
locally, a search endpoint behind the advisor command bar, and a per-customer
receivables figure so the overdue banner is customer-specific rather than reading
the shop-wide aging as a proxy. The second is the remaining product surface: the
Warehouse and Customer Portal interfaces from the approved specs, the real OIDC
login that replaces the development sign-in, and the deeper owner analytics
(profitability by fleet, productivity by job type) that the dashboard's
architecture already anticipates. None of these block what is delivered here; the
three interfaces are coherent and usable as built, and each gap is named so it can
be planned rather than discovered.
