import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

/**
 * JWT payload from GoTrue OIDC tokens.
 */
export interface JwtPayload {
  sub: string; // GoTrue user UUID
  email: string;
  aud: string; // Audience (should be "authenticated")
  role: string; // GoTrue role
  iat: number; // Issued at
  exp: number; // Expiration
}

/**
 * User context attached to request after JWT validation.
 */
export interface UserPayload {
  externalId: string; // GoTrue user UUID (from sub claim)
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService) {
    const gotrueUrl = configService.getOrThrow<string>('GOTRUE_URL');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,

      // JWKS-based validation (RS256 asymmetric)
      // Fetches public keys from GoTrue JWKS endpoint
      secretOrKeyProvider: passportJwtSecret({
        cache: true, // Cache public keys
        cacheMaxEntries: 5, // Max cached keys
        cacheMaxAge: 600000, // 10 minutes cache TTL
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${gotrueUrl}/.well-known/jwks.json`,
      }),

      // Validate issuer and audience
      issuer: gotrueUrl,
      audience: 'authenticated',
      algorithms: ['RS256'],
    });
  }

  /**
   * Validate JWT payload and return user context.
   * Called after JWT signature verification succeeds.
   */
  async validate(payload: JwtPayload): Promise<UserPayload> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return user context for controllers
    return {
      externalId: payload.sub,
      email: payload.email,
    };
  }
}
