import { Injectable } from '@nestjs/common';

/**
 * Configuration — fail fast on boot if required env is missing
 * (Architecture Blueprint §3.4 EU residency is enforced via AI_RESIDENCY).
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') throw new Error(`Missing required env var: ${name}`);
  return v;
}
function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

@Injectable()
export class AppConfig {
  readonly nodeEnv = optional('NODE_ENV', 'development');
  readonly port = parseInt(optional('PORT', '3000'), 10);

  /**
   * Local-only auth shortcut. When DEV_AUTH=1 (and NOT production) the API boots
   * without a real IdP and the auth middleware skips token verification, acting
   * as the seed owner. Never honoured when NODE_ENV=production.
   */
  readonly devAuth = optional('DEV_AUTH', '') === '1' && optional('NODE_ENV', 'development') !== 'production';
  readonly devAuthSubject = optional('DEV_AUTH_SUBJECT', 'oidc|seed-owner');

  // Database
  readonly databaseUrl = required('DATABASE_URL');
  readonly dbAppRole = optional('DB_APP_ROLE', 'workshop_app');

  // Auth (OIDC). JWKS is fetched from the IdP; tokens verified by `jose`.
  // In DEV_AUTH mode these are not required (the verifier is never invoked).
  readonly oidcIssuer = this.devAuth ? optional('OIDC_ISSUER', 'http://dev.local') : required('OIDC_ISSUER');
  readonly oidcAudience = this.devAuth ? optional('OIDC_AUDIENCE', 'dev') : required('OIDC_AUDIENCE');
  readonly oidcJwksUri = optional('OIDC_JWKS_URI', `${this.oidcIssuer}/.well-known/jwks.json`);

  // AI Gateway
  readonly aiResidency = optional('AI_RESIDENCY', 'eu'); // 'eu' enforced for PII
  readonly aiProviderBaseUrl = optional('AI_PROVIDER_BASE_URL', '');
  readonly aiDefaultModel = optional('AI_DEFAULT_MODEL', '');

  // Worker
  readonly outboxPollMs = parseInt(optional('OUTBOX_POLL_MS', '1000'), 10);
  readonly outboxMaxAttempts = parseInt(optional('OUTBOX_MAX_ATTEMPTS', '12'), 10);

  // Self-serve auth (Faza A). Empty secret => /public endpoints answer 503 in
  // production (honest) and use a fixed dev secret outside production.
  readonly authLocalSecret = optional('AUTH_LOCAL_SECRET', '');
  readonly turnstileSecret = optional('TURNSTILE_SECRET', '');
  readonly trialDays = parseInt(optional('TRIAL_DAYS', '14'), 10);

  // Transactional e-mail (Resend). Empty key => email routes to the log stub,
  // so dev/demo environments work end-to-end without sending anything.
  readonly resendApiKey = optional('RESEND_API_KEY', '');
  readonly emailFrom = optional('EMAIL_FROM', 'A-SPRINT GARAGE <obvestila@asprint-garage.si>');

  // Default labour rate (minor units) used to cost time entries at clock-out
  // until per-tenant/per-mechanic rate cards arrive in a later phase.
  readonly defaultLabourRateMinor = BigInt(optional('DEFAULT_LABOUR_RATE_MINOR', '6500'));

  // ---- Phase 3: invoicing / VAT / AR / e-invoicing ----
  /** Internal cost of one clocked labour hour (wage + overhead) for margin. */
  readonly internalCostRateMinorPerHour = BigInt(optional('INTERNAL_COST_RATE_MINOR', '3000'));
  /** Standard domestic VAT rate (SI). The reduced rate is per-line. */
  readonly defaultVatRatePct = optional('DEFAULT_VAT_RATE_PCT', '22');
  /** Default customer payment terms if not set on the customer. */
  readonly defaultPaymentTermsDays = parseInt(optional('DEFAULT_PAYMENT_TERMS_DAYS', '30'), 10);
  /** VIES base URL for EU VAT-ID validation (EU-resident service). */
  readonly viesBaseUrl = optional('VIES_BASE_URL', '');
  /** HR Fiskalizacija 2.0 endpoint (live mandate since 2026-01-01). */
  readonly hrFiscalBaseUrl = optional('HR_FISCAL_BASE_URL', '');
  /** SI eSLOG/Peppol access-point endpoint (mandate from 2028). */
  readonly peppolApBaseUrl = optional('PEPPOL_AP_BASE_URL', '');

  // ---- Public origins (Phase 4A) -----------------------------------------
  // The API's own public base URL (used to build local signed-storage URLs and
  // to validate OIDC redirect origins). The browser app's origin, for CORS.
  readonly publicApiBaseUrl = optional('PUBLIC_API_BASE_URL', `http://localhost:${this.port}`);
  readonly webAppBaseUrl = optional('WEB_APP_BASE_URL', 'http://localhost:3001');

  // ---- OIDC client config served to the browser (Phase 4A) ---------------
  // The verifier (issuer/audience/JWKS) already exists above. These are the
  // PUBLIC client parameters the SPA needs to start an Authorization Code +
  // PKCE flow. The client id is public by design in PKCE (no secret).
  readonly oidcClientId = optional('OIDC_CLIENT_ID', '');
  readonly oidcScopes = optional('OIDC_SCOPES', 'openid profile email offline_access');
  readonly oidcRedirectUri = optional('OIDC_REDIRECT_URI', `${this.webAppBaseUrl}/auth/callback`);
  // Discovery document; the SPA reads endpoints from here so we don't hardcode them.
  readonly oidcDiscoveryUrl = optional('OIDC_DISCOVERY_URL', `${this.oidcIssuer}/.well-known/openid-configuration`);

  // ---- File storage (Phase 4A) -------------------------------------------
  readonly storageDriver = optional('STORAGE_DRIVER', 's3'); // 's3' | 'local'
  readonly signedUrlTtlSeconds = parseInt(optional('SIGNED_URL_TTL_SECONDS', '600'), 10);

  // S3-compatible (EU residency: pick an EU region/endpoint).
  readonly s3Bucket = optional('S3_BUCKET', '');
  readonly s3Region = optional('S3_REGION', 'eu-central-1');
  readonly s3Endpoint = optional('S3_ENDPOINT', ''); // empty => AWS; set for MinIO/OVH/Scaleway
  readonly s3AccessKeyId = optional('S3_ACCESS_KEY_ID', '');
  readonly s3SecretAccessKey = optional('S3_SECRET_ACCESS_KEY', '');
  readonly s3ForcePathStyle = optional('S3_FORCE_PATH_STYLE', '') === 'true';

  // Local dev driver.
  readonly localStorageDir = optional('LOCAL_STORAGE_DIR', '.storage');
  readonly localStorageSigningSecret = optional('LOCAL_STORAGE_SIGNING_SECRET', 'dev-only-secret-change-me');

  // Customer-portal magic-link / session signing secret. MUST be set to a long
  // random value in production; the default is for local development only.
  readonly portalTokenSecret = optional('PORTAL_TOKEN_SECRET', 'dev-only-portal-secret-change-me-please');
  // Where the portal lives, for building deep links sent by SMS/email.
  readonly portalBaseUrl = optional('PORTAL_BASE_URL', 'http://localhost:3001/portal');
}
