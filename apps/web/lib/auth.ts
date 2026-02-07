import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '../../../prisma/generated/client/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Lazy-initialized singleton to avoid SSG issues
let prismaInstance: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    const pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        'postgresql://clubmanager:clubmanager@localhost:35432/clubmanager',
    });
    prismaInstance = new PrismaClient({
      adapter: new PrismaPg(pool),
    });
  }
  return prismaInstance;
}

/**
 * Call NestJS API to check if user should be promoted to Super Admin.
 *
 * This is called after user creation to check bootstrap rules:
 * 1. If SUPER_ADMIN_EMAIL matches, promote to Super Admin
 * 2. If no Super Admin exists and this is the first user, promote
 *
 * Errors are logged but don't fail user creation.
 */
async function checkSuperAdminBootstrap(userId: string, email: string): Promise<void> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    await fetch(`${apiUrl}/api/admin/bootstrap/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email }),
    });
  } catch (error) {
    // Don't fail signup if bootstrap check fails
    console.error('[Bootstrap] Failed to check Super Admin:', error);
  }
}

/**
 * Better Auth server configuration.
 *
 * Features:
 * - Email/password authentication with bcrypt hashing
 * - Optional Google OAuth (when GOOGLE_CLIENT_ID is set)
 * - Database sessions via Prisma
 * - Session cookies with secure defaults
 * - Super Admin bootstrap on first user registration
 *
 * Note: Prisma is lazily initialized to avoid SSG issues.
 */
export const auth = betterAuth({
  database: prismaAdapter(getPrisma(), {
    provider: 'postgresql',
  }),

  // Email/password authentication
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 14, // 14 days
    updateAge: 60 * 60 * 24, // Refresh token if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache
    },
  },

  // Social providers (optional)
  socialProviders: process.env.GOOGLE_CLIENT_ID
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : undefined,

  // Database hooks for Super Admin bootstrap
  databaseHooks: {
    user: {
      create: {
        async after(user) {
          // Check if this user should be promoted to Super Admin
          await checkSuperAdminBootstrap(user.id, user.email);
        },
      },
    },
  },

  // Advanced configuration
  advanced: {
    // Use secure cookies in production
    useSecureCookies: process.env.NODE_ENV === 'production',
    // Cookie name prefix
    cookiePrefix: 'better-auth',
  },

  // Trust proxy for correct IP address detection
  trustedOrigins: process.env.NEXT_PUBLIC_APP_URL
    ? [process.env.NEXT_PUBLIC_APP_URL]
    : ['http://localhost:33000'],
});

// Export type for client usage
export type Auth = typeof auth;
