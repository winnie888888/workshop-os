# Phase 4A — Production Readiness

## What was built

This phase closes the distance between a working demonstration and a system a
mechanic can rely on every day. It adds ten capabilities that were missing, and
it does so by extending the existing repository rather than rewriting any of it:
the shared domain core gained five new tested modules, the backend gained four
new modules and one new database migration, and the frontend gained a real login
flow together with the upload, search, and profile surfaces that the new
endpoints make possible.

The foundation of the phase is real authentication. The browser now performs a
proper OpenID Connect Authorization Code flow with PKCE, which is the correct
pattern for a public single-page application that holds no client secret. The
launcher's development sign-in is gone; in its place a user is sent to the
workshop's identity provider, returns to a dedicated callback route, and has
their tokens exchanged and stored. Immediately afterwards the application asks
the new `/auth/me` endpoint who the user is and which tenants they may act in,
and if they belong to more than one workshop it offers a tenant picker. The
genuinely error-prone part of this — deciding when an access token is too close
to expiry and must be refreshed, allowing for clock skew — lives in a new shared
`SessionPolicy` module that is unit-tested against those boundary cases, and the
API client consults it before every request so a long-lived screen refreshes
quietly instead of failing a call.

The second pillar is files. There is now a complete attachments capability: a
storage architecture built as a clean port with two adapters, an S3-compatible
adapter for production that issues presigned URLs so large phone photos upload
straight to the bucket without passing through the API, and a local-filesystem
adapter for development that serves the same workflow through HMAC-signed URLs so
the whole feature runs on a laptop with no cloud account. On top of that sits the
attachments module, whose two-step presign-then-complete contract mirrors how
object stores actually work, and whose every step — issuing an upload URL,
confirming storage, and granting a download URL — is recorded on the existing
tamper-evident audit chain, which is the tenth item on the list. The mechanic's
photo and voice-note capture, previously held only on the device, now run this
real workflow: a photo uploads with its SHA-256 checksum, and a voice note
uploads the recorded audio alongside the on-device transcript so the words are
searchable and visible. Both fall back to the durable local queue when offline,
preserving the offline-first promise.

The remaining items round out the daily experience. A global search endpoint
backs the advisor's command bar, classifying what was typed — a VIN, a plate, a
work-order number, a VAT id, or free text — with tested logic so the right kind
of result rises to the top, then querying customers, vehicles, and work orders
under row-level security and ranking the merged results; the command bar now
debounces keystrokes and shows a live dropdown that navigates to the chosen
entity. A customer-specific receivables endpoint reuses the exact open-invoice
query the shop-wide report already uses, scoped to one customer and fed through
the same tested aging function, so the advisor's overdue banner now warns about
the balance of the customer in front of them rather than a shop-wide figure. User
profile management lets a person change their display name, phone, and working
language, which persists server-side and follows them between devices. And
session management records each signed-in device so a user can see and revoke
them, with logout revoking the current one.

## Why it was built this way

The deciding principle throughout was to keep correctness-critical logic in the
dependency-free shared core where it can be executed and tested, and to keep the
framework code — the NestJS modules and the React screens — as thin, honest glue
around that proven centre. This is why five new modules joined the shared package:
the PKCE challenge derivation, the session-refresh decision, the attachment
upload policy, the storage-key construction, and the search classification and
ranking are exactly the places where a subtle mistake would be expensive and
silent, so each is covered by tests that run in this environment. The PKCE module
is pinned to the published RFC 7636 test vector, which means our login speaks the
same cryptographic language as any conformant identity provider rather than
merely matching our own expectations.

The storage design is a port with adapters for the same reason every external
dependency in this system is: the attachments service depends only on an
interface, so the choice between cloud object storage and a local disk is a
deployment decision, not a code change, and the production path keeps large files
out of the API process entirely. Auditing every upload action on the existing
hash-chain rather than inventing a separate log keeps the security story in one
place. And the per-customer receivables endpoint deliberately introduces no new
financial arithmetic — it routes a narrower query into the identical aging
function the owner's dashboard uses — because the one thing a workshop's money
figures must never do is disagree with themselves depending on which screen asked.

A structural decision worth noting is the second, tenant-less authentication
middleware. The original middleware correctly demands a chosen tenant for every
business route, but the login-time endpoints exist precisely so the user can
discover and choose a tenant, so they needed a path that authenticates the person
without yet binding a workshop. The two middlewares now sit side by side, with the
public configuration route and the HMAC-signed storage route excluded from both,
and this separation is what lets a freshly logged-in browser learn who it is
before it has chosen where to work.

## What is verified, and the honest caveats

The shared core is proven by execution: the full suite now runs sixty-two checks,
the twenty-three from earlier phases still green and the new Phase 4A logic
alongside them. Every new and edited backend file passes a TypeScript syntax
gate, every API method the screens call exists on the client, and every internal
import resolves. As in the earlier phases, what cannot be done in this
environment is a full NestJS boot or a Next.js build, because there is no network
to install dependencies; the framework layer is therefore real production source
that the continuous-integration pipeline compiles and runs, not something
exercised here.

Several honest gaps remain by design. There is no server-side virus or malware
scanning of uploads yet; the attachment lifecycle reserves a `quarantined` status
for exactly that future scanner, but nothing populates it today. Voice notes are
transcribed on the device rather than on the server, so the stored transcript is
only as good as the phone's recognition and there is no server-side
transcription fallback. Refresh-token rotation is delegated to the identity
provider — the `user_sessions` table gives visibility and revocation of devices,
but it is not itself a token store. The local storage driver is for development
only and refuses to run in production. And the whole login flow naturally
requires a configured identity provider to exercise end to end; the code is
complete and standards-correct, but it needs a real issuer, client id, and JWKS
endpoint to come alive.

## Updated repository package

The attached archive is the full repository at the end of Phase 4A, excluding
build artifacts and dependencies. The shared core and its tests run immediately
with `node --experimental-strip-types packages/shared/test/run.ts`. The backend
and frontend build under a normal `pnpm install` with the new environment
variables documented in `.env.example`; the new database objects are in
`db/migrations/0005_attachments_profiles_sessions.sql`.
