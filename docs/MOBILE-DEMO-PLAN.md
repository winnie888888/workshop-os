# Mobile Demo Distribution Plan — Viber-shareable PWA

## 1. Demo readiness assessment

The application is closer to a shareable mobile demo than it may feel, because the
three properties that usually make demos hard are already favourable.

The frontend is a **Next.js 14 app**, which is the most readily hostable kind of
web frontend: a platform like Vercel builds it straight from a Git repository and
serves it on HTTPS at a public URL that behaves identically on Android Chrome and
iPhone Safari. The API endpoint the browser talks to is **already configurable at
build time** through `NEXT_PUBLIC_API_BASE_URL`, so the same code can point at a
real backend, a demo backend, or nothing at all. And the user **session is just a
small object in `localStorage`** written after login — there is no deeper coupling
to the identity provider — so a demo can place a ready-made session there and skip
login entirely.

Three things are genuinely missing for the target workflow, and they are the work
to be done:

- **Login cannot be completed by a stranger.** The app uses real OIDC PKCE against
  a company identity provider. Your brother cannot authenticate, so the demo needs
  a *demo-mode* path that seeds a session instead of logging in. This is the single
  most important blocker.
- **The backend is not trivially public.** The screens fetch from a NestJS API
  backed by Postgres with row-level security. A "real" hosted demo means deploying
  three components (web, API, database) and seeding them. For *showing* the app, a
  lighter approach (demo data served without the real stack) is dramatically
  faster and carries no data-security risk.
- **There is no PWA manifest yet.** Full-screen "Add to Home Screen" behaviour
  needs a web app manifest (name, icons, `display: standalone`, theme colour) and a
  viewport meta. Next.js 14 supports this with a single `app/manifest.ts` plus a
  small metadata addition; it is perhaps an hour of work including icons.

Nothing here requires new product features or warehouse work. It is packaging.

## 2. Recommended deployment method

There are two honestly different demos, and the right choice depends on whether you
want to *show the screens* or *let him exercise the real engine*.

**Option A — Frontend-only demo with baked-in demo data (recommended, fastest).**
Build the existing Next.js frontend in a "demo mode" that (a) writes a demo session
into `localStorage` on first load so there is no login, and (b) answers the API
client from in-memory fixtures instead of calling the network. Deploy that single
frontend to Vercel. The result is one public HTTPS link, no database, no API
server, no secrets, nothing to leak, and nothing for your brother to set up. It
shows every screen — the advisor board, a work order with priced lines, the parts
picker, the owner insight — with realistic A-SPRINT data. Its limit is that actions
are demonstrative rather than truly persisted, which for a "show my brother on his
phone" goal is exactly the right trade.

**Option B — Full hosted stack (real, slower).** Deploy the web app to Vercel, the
NestJS API to a container host (Railway, Render, or Fly), and Postgres to a managed
provider (Neon or Supabase), run the migrations and the seed, and add a demo-login
button that mints a demo session against the seeded tenant. This is a genuine
end-to-end environment where data persists and the VAT/valuation engines run live.
It is the right thing for a pilot with A-SPRINT, but it is more moving parts, real
secrets, and an afternoon-to-a-day of infrastructure rather than an hour.

Both options answer requirement set B: the app *can* be a hosted demo (A and B), a
preview deployment (Vercel gives every Git branch its own preview URL), a temporary
public demo (A is exactly that), and a mobile-accessible test environment (both).
For a Viber link to your brother, Option A is the recommendation.

## 3. What must be completed before the first shareable demo (answer to C)

For the recommended Option A, four small pieces of work, none of them large:

1. **Demo session bootstrap.** A tiny client module that, when a `demo` flag is on,
   writes a valid `Session` object (the seeded owner, the A-SPRINT tenant, a
   far-future token expiry) into `localStorage` before the first render, so the
   app behaves as logged-in. This reuses the existing `setSession` shape exactly.
2. **Demo data adapter.** A switch in `lib/api.ts` that, in demo mode, resolves
   each call from fixtures (built from the same realistic A-SPRINT data the dry run
   uses) instead of `fetch`. Read calls return canned data; write calls update the
   in-memory store so the screen reacts, then reset on reload.
3. **PWA manifest + icons.** An `app/manifest.ts` (name "AI Workshop OS", short
   name, `display: standalone`, theme/background colours, 192px and 512px icons)
   and a viewport/theme-colour metadata addition, so "Add to Home Screen" opens
   full-screen with no browser chrome. This is what satisfies requirement 4.
4. **A Vercel project.** Connect the repository, set the web app as the project
   root, set `NEXT_PUBLIC_DEMO=1`, and deploy. Vercel returns a public HTTPS link.

For Option B, additionally: a managed Postgres with migrations + seed applied, the
API deployed with its environment configured, CORS allowing the web origin, and a
demo-login endpoint that issues a session for the seeded user.

## 4. Estimated time remaining (answer to D)

For **Option A**, the realistic remaining effort is **roughly half a day of focused
work**: an hour or two for the demo session bootstrap and the data adapter, an hour
for the manifest and icons, and well under an hour to connect Vercel and deploy and
test on a real phone. After that you have a link you can paste into Viber. Note that
this build and deploy cannot happen inside the current offline environment — it
needs a machine with network access to `npm install`, build, and push to Vercel —
so the "half a day" is on a normal connected laptop, not here.

For **Option B**, add roughly **half a day to a full day** for the database, API
hosting, secrets, CORS, and the demo-login endpoint.

## 5. Mobile sharing workflow (the target flow, confirmed)

Once Option A is deployed, the workflow you described works exactly as written:

1. You receive the Vercel demo link.
2. You paste it into a Viber message to your brother. Viber shows it as a tappable
   link; HTTPS links open fine from Viber on both Android and iPhone.
3. He taps it; it opens in his phone's browser (Chrome on Android, Safari on
   iPhone). Because it is a normal web page, there is no installation.
4. The app works immediately — the demo session means no login, and the demo data
   means no backend to reach. It is mobile-friendly already (the UI was built with
   touch targets and a phone-first advisor/mechanic layout).
5. Optionally he uses the browser's "Add to Home Screen" (Safari: Share → Add to
   Home Screen; Chrome: menu → Add to Home screen). With the manifest in place it
   then launches full-screen, like an installed app.

## 6. The fastest path, in one line

Add a demo-mode session bootstrap and a fixtures adapter, add a PWA manifest with
icons, deploy the existing Next.js frontend to Vercel with `NEXT_PUBLIC_DEMO=1`,
and share the resulting HTTPS link in Viber. No backend, no database, no login, no
setup for your brother — roughly half a day on a connected laptop.

---

### A note on what I can prepare here vs. there

This environment has no network, so I cannot `npm install`, run a Next.js build, or
deploy to Vercel from inside it. What I *can* do here, if you want, is write the
demo-mode code (the session bootstrap, the fixtures adapter, the PWA manifest, the
icons, and a short deploy README) as real source committed to the repository, so
that on a connected laptop the entire remaining task is "connect Vercel and click
deploy". That turns the half-day into mostly a deploy step. Say the word and I will
prepare those files as the next step — without touching warehouse development.
