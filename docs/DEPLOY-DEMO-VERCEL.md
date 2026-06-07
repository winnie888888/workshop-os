# Deploying the mobile demo to Vercel

This is the whole job on a connected laptop. The demo-mode code, fixtures, PWA
manifest, and icons are already committed; what remains is connecting the repo to
Vercel and clicking deploy. No backend, no database, no secrets.

## One-time setup (about 5 minutes)

1. Push this repository to GitHub/GitLab/Bitbucket if it is not already there.
2. Go to https://vercel.com, sign in, and click **Add New… → Project**.
3. Import this repository.
4. In the project settings, set:
   - **Root Directory**: `apps/web`
     (this is a monorepo; the web app lives there)
   - **Framework Preset**: Next.js (Vercel detects this automatically)
   - **Build Command**: leave default (`next build`)
   - **Install Command**: leave default — but if the install fails on the
     `workspace:*` dependency, set it to `npm install --workspaces=false` or run
     the install from the repo root. (The web app's only workspace dependency is
     `@workshop/shared`, which `transpilePackages` already handles.)
5. Add ONE environment variable:
   - **Name**: `NEXT_PUBLIC_DEMO`  **Value**: `1`
     This is the switch that turns on demo mode: it plants the demo session so
     there is no login, and routes the API client to in-memory fixtures so there
     is no backend to reach. Leave it unset for a real (non-demo) build.
6. Click **Deploy**.

After a minute or two Vercel gives you a public HTTPS URL like
`https://workshop-os-xxxx.vercel.app`. That is the link you share.

## Verify before sharing (1 minute, on your phone)

Open the URL on your own phone first:

- It should open straight into the app (the A-SPRINT launcher with interface
  links) — no login prompt, because demo mode planted a session.
- Tap into **Advisor → Today** to see the board, open the MAN brake job to see
  priced lines and the parts picker, and **Owner** to see the profitability
  insight. Data is the realistic A-SPRINT demo data.
- Use the browser menu → **Add to Home Screen**. The icon (a yellow hex nut on a
  dark tile) appears; launching it opens full-screen with no browser chrome.

## Re-deploys

Every push to the connected branch redeploys automatically, and every branch gets
its own preview URL — handy for showing a work-in-progress without touching the
main demo link.

## Regenerating the icons (only if you change the mark)

The home-screen icons are committed PNGs in `apps/web/public`. To regenerate them
(e.g. after a colour change), run from the repo root:

```
node scripts/generate-icons.mjs
```

It uses only Node's built-in zlib — no install needed — and rewrites the three
PNGs.

## Turning the demo OFF / going to a real environment

This demo build never talks to the backend. For a real hosted environment
(persistent data, live VAT and valuation engines), leave `NEXT_PUBLIC_DEMO` unset
and set `NEXT_PUBLIC_API_BASE_URL` to your deployed API's URL — that is the larger
"Option B" path described in `MOBILE-DEMO-PLAN.md`, and it is separate from this
quick demo.
