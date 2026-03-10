import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { SessionAuthGuard } from './guards/session-auth.guard';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Authentication module using Better Auth sessions.
 *
 * Session validation is done by querying the session table directly.
 * This replaces the previous JWT/JWKS-based validation with GoTrue.
 *
 * Guards:
 * - SessionAuthGuard: Validates Better Auth session tokens
 * - ThrottlerGuard: Rate limiting (3/1s, 20/10s, 100/60s)
 *
 * Use @Public() decorator to exclude routes from authentication.
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,

    // Rate limiting per CONTEXT.md
    // TODO: Rate limiting currently uses in-memory store (default).
    // For production multi-instance deployment, configure Redis adapter:
    // - Install @nestjs/throttler-storage-redis
    // - Configure ThrottlerModule with ThrottlerStorageRedisService
    // - Use REDIS_URL environment variable for connection
    // See: https://docs.nestjs.com/security/rate-limiting#distributed-stores
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000, // 60 seconds
        limit: 100,
      },
    ]),
  ],
  providers: [
    AuthService,
    // Apply session guard globally - use @Public() to exclude routes
    {
      provide: APP_GUARD,
      useClass: SessionAuthGuard,
    },
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
