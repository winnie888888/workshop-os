'use client';

import { api } from './api';

/**
 * OIDC login flow (Authorization Code + PKCE) for the browser. This is the real
 * login that replaces the development sign-in: it discovers the identity
 * provider's endpoints, starts an authorization request with a PKCE challenge,
 * and exchanges the returned code for tokens. The PKCE transform
 * (verifier -> S256 challenge) is the same one proven in the shared core
 * against the RFC 7636 vector; here we use Web Crypto for the browser runtime.
 *
 * No client secret is used or needed — that is the whole point of PKCE for a
 * public SPA. Tokens come back to the browser and are held by session.ts; the
 * backend trusts them because it verifies the issuer's signature via JWKS.
 */

interface OidcConfig {
  issuer: string; discoveryUrl: string; clientId: string; scopes: string; redirectUri: string;
}
interface Discovery {
  authorization_endpoint: string; token_endpoint: string; end_session_endpoint?: string;
}

const STORE = {
  verifier: 'wos.pkce.verifier',
  state: 'wos.pkce.state',
  nonce: 'wos.pkce.nonce',
  config: 'wos.oidc.config',
};

/* ---- Web Crypto helpers (mirror of the shared node:crypto implementation) ---- */

function base64Url(bytes: ArrayBuffer): string {
  const b = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function challengeS256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(digest);
}
function randomToken(byteLen = 32): string {
  const a = new Uint8Array(byteLen);
  crypto.getRandomValues(a);
  return base64Url(a.buffer);
}
function codeVerifier(len = 64): string {
  const unreserved = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => unreserved[x % unreserved.length]).join('');
}

async function discover(cfg: OidcConfig): Promise<Discovery> {
  const res = await fetch(cfg.discoveryUrl);
  if (!res.ok) throw new Error('Could not load identity provider discovery document');
  return res.json();
}

/** Begin login: build the authorization URL and redirect the browser to it. */
export async function beginLogin(): Promise<void> {
  const cfg = await api.auth.config();
  if (!cfg.clientId) throw new Error('OIDC client is not configured on the server');
  const disco = await discover(cfg);

  const verifier = codeVerifier(64);
  const state = randomToken();
  const nonce = randomToken();
  sessionStorage.setItem(STORE.verifier, verifier);
  sessionStorage.setItem(STORE.state, state);
  sessionStorage.setItem(STORE.nonce, nonce);
  sessionStorage.setItem(STORE.config, JSON.stringify(cfg));

  const url = new URL(disco.authorization_endpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('redirect_uri', cfg.redirectUri);
  url.searchParams.set('scope', cfg.scopes);
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', await challengeS256(verifier));
  url.searchParams.set('code_challenge_method', 'S256');
  window.location.assign(url.toString());
}

export interface TokenResult {
  accessToken: string; refreshToken?: string; idToken?: string; expiresAt: number;
}

/** Complete login on the callback page: validate state, exchange code. */
export async function handleCallback(params: URLSearchParams): Promise<TokenResult> {
  const error = params.get('error');
  if (error) throw new Error(params.get('error_description') || error);

  const code = params.get('code');
  const state = params.get('state');
  const expectedState = sessionStorage.getItem(STORE.state);
  const verifier = sessionStorage.getItem(STORE.verifier);
  const cfgRaw = sessionStorage.getItem(STORE.config);
  if (!code || !state || !verifier || !cfgRaw) throw new Error('Login session expired; please try again');
  if (state !== expectedState) throw new Error('State mismatch — possible tampering, login aborted');

  const cfg = JSON.parse(cfgRaw) as OidcConfig;
  const disco = await discover(cfg);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
    client_id: cfg.clientId,
    code_verifier: verifier,
  });
  const res = await fetch(disco.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('Token exchange failed');
  const tok = await res.json();

  // Clear single-use PKCE artifacts.
  sessionStorage.removeItem(STORE.verifier);
  sessionStorage.removeItem(STORE.state);
  sessionStorage.removeItem(STORE.nonce);

  return {
    accessToken: tok.access_token,
    refreshToken: tok.refresh_token,
    idToken: tok.id_token,
    expiresAt: Date.now() + (Number(tok.expires_in ?? 3600) * 1000),
  };
}

/** Refresh the access token using a stored refresh token (rotation-aware). */
export async function refreshTokens(refreshToken: string): Promise<TokenResult> {
  const cfgRaw = sessionStorage.getItem(STORE.config) ?? localStorage.getItem(STORE.config);
  if (!cfgRaw) throw new Error('No OIDC config for refresh');
  const cfg = JSON.parse(cfgRaw) as OidcConfig;
  const disco = await discover(cfg);
  const res = await fetch(disco.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token', refresh_token: refreshToken, client_id: cfg.clientId,
    }),
  });
  if (!res.ok) throw new Error('Refresh failed');
  const tok = await res.json();
  return {
    accessToken: tok.access_token,
    refreshToken: tok.refresh_token ?? refreshToken, // rotation: keep new if provided
    idToken: tok.id_token,
    expiresAt: Date.now() + (Number(tok.expires_in ?? 3600) * 1000),
  };
}
