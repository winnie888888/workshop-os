/**
 * Phase 4A core tests — production-readiness logic that must be correct:
 * PKCE derivation (pinned to the RFC 7636 vector), session lifecycle decisions,
 * attachment policy, storage-key safety, and search classification/ranking.
 *
 * Uses the repository's self-registering harness, like the other suites.
 */

import { test, assert, assertEqual, assertThrows } from "./harness.ts";
import {
  deriveChallengeS256,
  generateCodeVerifier,
  createPkcePair,
  buildAuthorizationUrl,
  base64UrlEncode,
} from "../src/auth/pkce.ts";
import {
  nextSessionAction,
  isAccessTokenExpired,
  shouldRefresh,
  isSessionExpired,
  expiryFromExpClaim,
} from "../src/auth/session-policy.ts";
import { validateAttachment, ATTACHMENT_POLICY } from "../src/storage/attachment-policy.ts";
import { buildObjectKey, sanitizeFilename, keyBelongsToTenant } from "../src/storage/object-key.ts";
import { classifyQuery, normalizePlate, normalizeQuery, rankHits } from "../src/search/query.ts";

/* ---------- PKCE ---------- */

test("pkce: matches RFC 7636 published S256 vector", () => {
  // RFC 7636 Appendix B test vector — the canonical correctness check.
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const expected = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
  assertEqual(deriveChallengeS256(verifier), expected);
});

test("pkce: base64url has no padding or url-unsafe chars", () => {
  const enc = base64UrlEncode(Buffer.from([251, 252, 253, 254, 255]));
  assert(!enc.includes("="), "no padding");
  assert(!enc.includes("+") && !enc.includes("/"), "url-safe alphabet");
});

test("pkce: generated verifier length is in range and challenge derives", () => {
  const v = generateCodeVerifier(64);
  assertEqual(v.length, 64);
  const pair = createPkcePair(50);
  assertEqual(pair.codeChallengeMethod, "S256");
  assertEqual(pair.codeChallenge, deriveChallengeS256(pair.codeVerifier));
});

test("pkce: verifier length bounds enforced", () => {
  assertThrows(() => generateCodeVerifier(10));
  assertThrows(() => generateCodeVerifier(200));
});

test("pkce: authorization url carries all required params", () => {
  const url = buildAuthorizationUrl({
    authorizationEndpoint: "https://id.example.eu/authorize",
    clientId: "workshop-web",
    redirectUri: "https://app.example.eu/auth/callback",
    scope: "openid profile email",
    state: "st",
    nonce: "no",
    codeChallenge: "cc",
  });
  const u = new URL(url);
  assertEqual(u.searchParams.get("response_type"), "code");
  assertEqual(u.searchParams.get("code_challenge_method"), "S256");
  assertEqual(u.searchParams.get("client_id"), "workshop-web");
  assertEqual(u.searchParams.get("code_challenge"), "cc");
});

/* ---------- Session policy ---------- */

test("session: fresh ok, near-expiry refresh, dead session reauth", () => {
  const now = 1_000_000_000_000;
  assertEqual(nextSessionAction({ accessTokenExpiresAt: now + 10 * 60_000 }, now), "ok");
  assertEqual(nextSessionAction({ accessTokenExpiresAt: now + 60_000 }, now), "refresh");
  const expiredAccess = { accessTokenExpiresAt: now - 1 };
  assertEqual(nextSessionAction(expiredAccess, now), "refresh");
  assert(isAccessTokenExpired(expiredAccess, now), "access expired");
  const dead = { accessTokenExpiresAt: now + 10 * 60_000, sessionExpiresAt: now - 1 };
  assertEqual(nextSessionAction(dead, now), "reauthenticate");
  assert(isSessionExpired(dead, now), "session expired");
  assertEqual(shouldRefresh(dead, now), false);
});

test("session: exp claim converts seconds to ms", () => {
  assertEqual(expiryFromExpClaim(1_700_000_000), 1_700_000_000_000);
});

/* ---------- Attachment policy ---------- */

test("attachment: accepts a normal phone photo", () => {
  const r = validateAttachment({ kind: "photo", contentType: "image/jpeg", byteSize: 3_500_000 });
  assert(r.ok, "photo accepted");
  assertEqual(r.extension, "jpg");
});

test("attachment: rejects bad type, oversize, and unknown kind", () => {
  assertEqual(validateAttachment({ kind: "photo", contentType: "image/gif", byteSize: 100 }).ok, false);
  assertEqual(
    validateAttachment({ kind: "photo", contentType: "image/jpeg", byteSize: ATTACHMENT_POLICY.photo.maxBytes + 1 }).ok,
    false,
  );
  assertEqual(validateAttachment({ kind: "scan", contentType: "image/jpeg", byteSize: 100 }).ok, false);
});

test("attachment: voice note content-type with codecs param is handled", () => {
  const r = validateAttachment({ kind: "voice_note", contentType: "audio/webm; codecs=opus", byteSize: 500_000 });
  assert(r.ok, "voice note accepted");
  assertEqual(r.extension, "webm");
});

/* ---------- Storage keys ---------- */

test("storage: builds a namespaced, dated key and checks tenant ownership", () => {
  const key = buildObjectKey({
    tenantId: "11111111-1111-1111-1111-111111111111",
    kind: "photo",
    objectId: "abc123",
    extension: "jpg",
    at: new Date(Date.UTC(2026, 5, 6)),
  });
  assertEqual(key, "tenants/11111111-1111-1111-1111-111111111111/photo/2026/06/abc123.jpg");
  assert(keyBelongsToTenant(key, "11111111-1111-1111-1111-111111111111"), "owner ok");
  assertEqual(keyBelongsToTenant(key, "22222222-2222-2222-2222-222222222222"), false);
});

test("storage: rejects unsafe segments (path traversal)", () => {
  assertThrows(() => buildObjectKey({ tenantId: "../etc", kind: "photo", objectId: "x", extension: "jpg" }));
  assertThrows(() => buildObjectKey({ tenantId: "t", kind: "photo", objectId: "a/b", extension: "jpg" }));
});

test("storage: filename sanitiser strips paths and dangerous chars", () => {
  assertEqual(sanitizeFilename("../../etc/passwd"), "passwd");
  assertEqual(sanitizeFilename('na"me<>.jpg'), "name.jpg");
  assertEqual(sanitizeFilename(""), "file");
  assertEqual(sanitizeFilename("a".repeat(300)).length, 120);
});

/* ---------- Search ---------- */

test("search: VIN/plate/WO/VAT/text classification", () => {
  assertEqual(classifyQuery("WDB9634032L123456".slice(0, 17)), "vin"); // 17 alnum
  assertEqual(classifyQuery("KP-AS-412"), "plate");
  assertEqual(classifyQuery("WO-0142"), "work_order");
  assertEqual(classifyQuery("2026-0142"), "work_order");
  assertEqual(classifyQuery("SI12345678"), "vat_id");
  assertEqual(classifyQuery("Špedicija Novak"), "text");
});

test("search: normalisers behave", () => {
  assertEqual(normalizePlate("kp as-412"), "KPAS412");
  assertEqual(normalizeQuery("  Novak   d.o.o. ").display, "Novak d.o.o.");
  assertEqual(normalizeQuery("  Novak   d.o.o. ").normalized, "novak d.o.o.");
});

test("search: ranking floats exact + intent-matching types first", () => {
  const hits = [
    { type: "customer" as const, id: "c1", label: "Novak", exact: false },
    { type: "vehicle" as const, id: "v1", label: "KP-AS-412", exact: true },
    { type: "work_order" as const, id: "w1", label: "WO-0140", exact: false },
  ];
  const ranked = rankHits(hits, "plate");
  assertEqual(ranked[0].id, "v1");
});
