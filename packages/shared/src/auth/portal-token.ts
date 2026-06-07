/**
 * Portal access tokens (Customer Portal). A customer is not a staff member with
 * an OIDC login; they reach the portal through a deep link sent by SMS or email
 * ("open the customer portal to review and approve"). That link must let an
 * otherwise-unauthenticated request prove WHICH customer of WHICH tenant it
 * belongs to — without the server storing every link, and without anyone being
 * able to forge or tamper with one.
 *
 * The mechanism is a signed token: a compact payload {tenantId, customerId,
 * purpose, expiry, nonce} plus an HMAC-SHA256 signature computed with a server
 * secret. Anyone can read the payload, but only the holder of the secret can
 * produce a valid signature, so the payload cannot be altered (change the
 * customerId and the signature no longer matches). Verification recomputes the
 * signature and compares it in CONSTANT TIME, then checks the expiry. This is
 * the same family of mechanism as a password-reset link, and the pure transform
 * (payload -> signature) is what we test.
 *
 * Two token purposes:
 *   - 'magic'   : short-lived (minutes), e-mailed/texted; proves identity once
 *                 so the portal can mint a session.
 *   - 'session' : longer-lived; the portal carries it on each request.
 *
 * Dependency-free and runnable under the test runner; uses node:crypto like
 * audit-hash.ts and pkce.ts.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type PortalTokenPurpose = "magic" | "session";

export interface PortalTokenClaims {
  tenantId: string;
  customerId: string;
  purpose: PortalTokenPurpose;
  /** Seconds since epoch when the token expires. */
  exp: number;
  /** Random nonce so two tokens for the same customer differ (and are revocable by jti). */
  jti: string;
}

export class PortalTokenError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "PortalTokenError";
  }
}

/** base64url without padding (same convention as pkce.ts). */
function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

/** The signature over a payload string, given the server secret. */
function sign(payloadB64: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(payloadB64).digest());
}

/**
 * Create a signed token. The token is `payload.signature`, both base64url. The
 * payload is JSON of the claims; nothing secret is in it — the secret only ever
 * lives in the signature, which cannot be reproduced without it.
 */
export function createPortalToken(
  claims: Omit<PortalTokenClaims, "jti" | "exp"> & { ttlSeconds: number },
  secret: string,
  now: number = Date.now(),
): { token: string; claims: PortalTokenClaims } {
  if (!secret || secret.length < 16) {
    throw new PortalTokenError("Portal token secret must be set and at least 16 chars");
  }
  const full: PortalTokenClaims = {
    tenantId: claims.tenantId,
    customerId: claims.customerId,
    purpose: claims.purpose,
    exp: Math.floor(now / 1000) + claims.ttlSeconds,
    jti: b64url(randomBytes(12)),
  };
  const payloadB64 = b64url(JSON.stringify(full));
  const token = `${payloadB64}.${sign(payloadB64, secret)}`;
  return { token, claims: full };
}

/**
 * Verify a token: the signature must match (constant-time) and it must not be
 * expired and must be of the expected purpose. Returns the claims or throws.
 * Throwing rather than returning null forces callers to handle the failure.
 */
export function verifyPortalToken(
  token: string,
  secret: string,
  expectedPurpose: PortalTokenPurpose,
  now: number = Date.now(),
): PortalTokenClaims {
  if (!token || token.indexOf(".") < 0) throw new PortalTokenError("Malformed token");
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) throw new PortalTokenError("Malformed token");

  // Recompute the expected signature and compare in constant time. A length
  // mismatch is itself a failure; timingSafeEqual requires equal-length buffers.
  const expected = sign(payloadB64, secret);
  const a = Buffer.from(sigB64);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new PortalTokenError("Bad signature");
  }

  let claims: PortalTokenClaims;
  try {
    claims = JSON.parse(b64urlDecode(payloadB64).toString("utf8")) as PortalTokenClaims;
  } catch {
    throw new PortalTokenError("Unreadable payload");
  }
  if (claims.purpose !== expectedPurpose) {
    throw new PortalTokenError(`Wrong token purpose: expected ${expectedPurpose}, got ${claims.purpose}`);
  }
  if (!claims.exp || Math.floor(now / 1000) >= claims.exp) {
    throw new PortalTokenError("Token expired");
  }
  if (!claims.tenantId || !claims.customerId) {
    throw new PortalTokenError("Token missing tenant/customer");
  }
  return claims;
}

/** A random opaque session id (stored hashed server-side for revocation). */
export function newSessionSecret(): string {
  return b64url(randomBytes(24));
}
