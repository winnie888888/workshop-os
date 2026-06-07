# @workshop/web — Workshop OS frontend

A Next.js 14 (App Router) application implementing three of the approved
interfaces against the existing NestJS API:

- **Mechanic Mobile** (`/mechanic`) — the shop-floor tool: job list, the job
  screen with the large clock control and four field actions, capture sheets,
  and a minimal "Me" screen. Offline-first.
- **Service Advisor** (`/advisor`) — the intake desk: Today board, command bar,
  new-job intake, the work-order workspace, invoice issue/detail, and
  receivables with payment capture.
- **Workshop Owner** (`/owner`) — the dashboard: revenue/VAT/AR health tiles,
  aging, and the per-job labour insight (clocked vs standard vs billed) with the
  AI narrative.

## Architecture

- **`src/lib/api.ts`** — the single typed boundary to the backend. Every method
  maps to a real route; every payload matches a backend DTO. Auth is a Bearer
  token plus an `X-Tenant-Id` header, taken from the session.
- **`src/lib/session.ts`** — token + tenant + identity. Replace this one file
  with the real OIDC callback to wire production login.
- **`src/lib/offline-queue.ts` + `clock.ts`** — the mechanic's offline-first
  spine: optimistic local writes replayed through the idempotent `/sync`
  endpoint, and an instant local timer.
- **`src/components/ui.tsx`** — the industrial design system (gloves/sunlight
  ergonomics, status-as-colour-block, large tap targets).

## Run

```bash
pnpm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL to your API origin
pnpm --filter @workshop/web dev
```

Sign in on the launcher with an access token and tenant id from your identity
provider (development bootstrap), then enter any interface.

## Known backend dependencies (Phase 4)

- **Attachments upload** — the mechanic's photo/voice-note capture works on the
  device and queues locally, pending an upload endpoint.
- **Search endpoint** — the advisor command bar is ready for a search route.
- **Per-customer AR** — the overdue banner currently reads the shop-wide aging
  report as a proxy.
- **OIDC login** — replaces the development sign-in bootstrap.
