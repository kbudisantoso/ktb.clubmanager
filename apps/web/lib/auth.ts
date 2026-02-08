import { betterAuth } from 'better-auth';
import { createAuthMiddleware, APIError } from 'better-auth/api';
import { captcha } from 'better-auth/plugins';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '../../../prisma/generated/client/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnDePackage from '@zxcvbn-ts/language-de';

// Initialize zxcvbn with German + common dictionaries (runs once at module load)
zxcvbnOptions.setOptions({
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnDePackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnDePackage.translations,
});

// Lazy-initialized singleton to avoid SSG issues
let prismaInstance: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    const pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
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
 * - Server-side password strength validation (zxcvbn score >= 3)
 * - Super Admin bootstrap on first user registration
 * - Optional Cloudflare Turnstile CAPTCHA protection
 *
 * Note: Prisma is lazily initialized to avoid SSG issues.
 */
export const auth = betterAuth({
  // Base URL for callbacks and redirects
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

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

  // SEC-004: Server-side password strength validation
  // Enforces zxcvbn score >= 3 on email signup to prevent weak passwords.
  // This complements the client-side check but cannot be bypassed via API.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/sign-up/email') {
        const password = ctx.body?.password;
        const email = ctx.body?.email;
        if (password) {
          const userInputs = email ? [email] : [];
          const result = zxcvbn(password, userInputs);
          if (result.score < 3) {
            throw new APIError('BAD_REQUEST', {
              message: 'Passwort ist zu schwach. Bitte waehle ein staerkeres Passwort.',
            });
          }
        }
      }
    }),
  },

  // SEC-008/SEC-020: CAPTCHA plugin for bot protection (conditionally loaded)
  // Requires TURNSTILE_SECRET_KEY env var to activate Cloudflare Turnstile
  plugins: [
    ...(process.env.TURNSTILE_SECRET_KEY
      ? [
          captcha({
            provider: 'cloudflare-turnstile',
            secretKey: process.env.TURNSTILE_SECRET_KEY,
            endpoints: ['/sign-up/email', '/sign-in/email', '/forget-password'],
          }),
        ]
      : []),
  ],

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
    // SEC-005: Explicit cookie flags for defense-in-depth
    // httpOnly prevents XSS access, secure ensures HTTPS-only in prod,
    // sameSite 'lax' prevents CSRF while allowing top-level navigations
    defaultCookieAttributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },

  // Trust proxy for correct IP address detection
  trustedOrigins: process.env.NEXT_PUBLIC_APP_URL
    ? [process.env.NEXT_PUBLIC_APP_URL]
    : ['http://localhost:33000'],
});

// Export type for client usage
export type Auth = typeof auth;
