# Vercel Deployment Instructions — Workshop OS Demo

*The demo is the easiest possible deployment: it needs no backend, no database, and
no secrets. The whole application runs in the browser on in-memory fixtures when one
environment variable is set. These instructions get a public demo URL live in
minutes.*

---

## 1. Why the demo deployment is so simple

In normal operation Workshop OS talks to a NestJS API and a Postgres database. But
the demo build flips a single flag, `NEXT_PUBLIC_DEMO=1`, which does two things: it
plants a ready-made A-SPRINT owner session so there is no login, and it routes every
API call to in-memory fixtures instead of the network. So a demo deployment is just
the Next.js web app, by itself, on Vercel. There is nothing else to stand up.

## 2. Prerequisites

A GitHub account with the repository pushed, and a Vercel account (the free tier is
sufficient for a demo). No database, no API host, no identity provider, no API keys.

## 3. Step-by-step

1. Push the repository to GitHub if it is not already there.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Set the **Root Directory** to `apps/web`. (The repo is a pnpm monorepo; the web
   app is the deployable.)
4. Vercel auto-detects Next.js. Leave the build command as the default `next build`;
   ensure the install runs at the workspace root so the shared package resolves
   (Vercel handles pnpm workspaces automatically when the root directory is set).
5. Under **Environment Variables**, add exactly one:
   `NEXT_PUBLIC_DEMO` = `1`.
   (You do **not** need `NEXT_PUBLIC_API_BASE_URL` for the demo, because no calls
   leave the browser.)
6. Click **Deploy**. In a minute or two Vercel returns a URL like
   `https://workshop-os-demo.vercel.app`.
7. Open it. You should land directly on the signed-in A-SPRINT launcher — no login —
   with the logo, the four interface tiles, and the Share card.

## 4. Confirm the deploy

Open the URL and walk one flow (for example: Advisor → Invoices → an invoice, and
watch the Minimax sync panel complete). Confirm the Share card appears on the
landing page. If the app loads to a login screen instead of the launcher, the
`NEXT_PUBLIC_DEMO` variable was not set or not applied — redeploy after setting it.

## 5. Updating the demo

Every push to the connected branch redeploys automatically. To freeze a version for
a presentation, deploy from a tagged commit (for example `v0.9.0-demo`) and use that
deployment's URL.

## 6. Separation from production

This demo deployment is completely independent of any real deployment. It holds no
data, connects to nothing, and cannot affect a pilot or production environment.
That isolation is exactly why it is safe to share the demo URL widely.
