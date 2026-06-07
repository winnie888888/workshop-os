/**
 * PKCE (Proof Key for Code Exchange, RFC 7636) — the security mechanism that
 * lets a browser app perform the OIDC Authorization Code flow without a client
 * secret. The app generates a high-entropy `code_verifier`, derives a
 * `code_challenge` from it, and sends only the challenge when starting login;
 * at token exchange it proves possession by sending the original verifier.
 *
 * This module is dependency-free and runnable under the test runner. It uses
 * node:crypto for hashing and randomness (the same choice as audit-hash.ts).
 * The browser build re-implements the random/hash parts with Web Crypto; the
 * pure transform (verifier -> challenge) is identical and is what we test
 * against the RFC's published vector.
 */

import { createHash, randomBytes } from "node:crypto";

/** RFC 7636 §4.1: unreserved characters for the verifier. */
const UNRESERVED = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

/** Base64url without padding, per RFC 7636 §A. */
export function base64UrlEncode(input: Buffer | Uint8Array): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Derive the S256 code_challenge from a code_verifier.
 * challenge = base64url( SHA256( ASCII(verifier) ) ).
 * This is the one piece every PKCE implementation must agree on, so it is the
 * piece we pin with the RFC test vector.
 */
export function deriveChallengeS256(codeVerifier: string): string {
  const digest = createHash("sha256").update(codeVerifier, "ascii").digest();
  return base64UrlEncode(digest);
}

/**
 * Generate a fresh code_verifier of the requested length (43–128 chars per the
 * RFC). Uses rejection-free mapping of random bytes onto the unreserved set.
 */
export function generateCodeVerifier(length = 64): string {
  if (length < 43 || length > 128) {
    throw new Error("PKCE code_verifier length must be between 43 and 128");
  }
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += UNRESERVED[bytes[i] % UNRESERVED.length];
  }
  return out;
}

/** An opaque, URL-safe random value for the OAuth `state`/`nonce` parameters. */
export function generateRandomToken(byteLength = 32): string {
  return base64UrlEncode(randomBytes(byteLength));
}

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
}

/** Produce a complete verifier+challenge pair ready for an auth request. */
export function createPkcePair(length = 64): PkcePair {
  const codeVerifier = generateCodeVerifier(length);
  return {
    codeVerifier,
    codeChallenge: deriveChallengeS256(codeVerifier),
    codeChallengeMethod: "S256",
  };
}

/**
 * Build the OIDC authorization URL the browser redirects to. Pure string
 * assembly so it can be unit-tested; the browser supplies the random values.
 */
export function buildAuthorizationUrl(params: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const u = new URL(params.authorizationEndpoint);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("scope", params.scope);
  u.searchParams.set("state", params.state);
  u.searchParams.set("nonce", params.nonce);
  u.searchParams.set("code_challenge", params.codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}
