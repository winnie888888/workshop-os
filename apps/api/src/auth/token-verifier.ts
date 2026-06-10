import { createRemoteJWKSet, jwtVerify, JWTPayload, SignJWT } from 'jose';
import { AppConfig } from '../config/configuration';

/**
 * Local (self-serve) tokens: HS256 with AUTH_LOCAL_SECRET, subject
 * 'local|<userId>' written into users.external_subject at provisioning. Both
 * middlewares stay untouched — they just call verify(), which now accepts the
 * local issuer alongside the OIDC IdP. OIDC remains first-class for
 * enterprise SSO later.
 */
export const LOCAL_ISSUER = 'workshop-local';

export async function signLocalToken(secret: string, userId: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(`local|${userId}`)
    .setIssuer(LOCAL_ISSUER)
    .setAudience(LOCAL_ISSUER)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key);
}

/**
 * Verifies OIDC access tokens against the IdP's JWKS (Architecture §5.1,
 * standards-based OIDC; portable across managed IdP / Keycloak / Ory).
 */
export class TokenVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly config: AppConfig) {
    this.jwks = createRemoteJWKSet(new URL(config.oidcJwksUri));
  }

  async verify(token: string): Promise<JWTPayload> {
    // Self-serve tokens first (cheap symmetric check), then the OIDC IdP.
    const localSecret = this.config.authLocalSecret
      || (this.config.nodeEnv !== 'production' ? 'dev-only-local-auth-secret' : '');
    if (localSecret) {
      try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(localSecret), {
          issuer: LOCAL_ISSUER,
          audience: LOCAL_ISSUER,
        });
        if (payload.sub) return payload;
      } catch {
        /* not a local token — fall through to OIDC */
      }
    }
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.config.oidcIssuer,
      audience: this.config.oidcAudience,
    });
    if (!payload.sub) throw new Error('Token missing subject');
    return payload;
  }
}
