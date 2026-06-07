import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { AppConfig } from '../config/configuration';

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
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.config.oidcIssuer,
      audience: this.config.oidcAudience,
    });
    if (!payload.sub) throw new Error('Token missing subject');
    return payload;
  }
}
