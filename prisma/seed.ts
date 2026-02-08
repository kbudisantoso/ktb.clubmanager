import { PrismaClient } from './generated/client/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Production guard: seed must never run in production
if (process.env.NODE_ENV === 'production') {
  throw new Error('Seed must not run in production');
}

// WARNING: Fallback for local development only. In CI/production, DATABASE_URL must be set.
const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://clubmanager:clubmanager@localhost:35432/clubmanager',
});

// Initialize Prisma with PostgreSQL adapter
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  console.log('Seeding database...');

  // Seed default tiers
  await seedTiers();

  // Seed system user for automated actions
  await seedSystemUser();

  console.log('Seeding complete.');
}

/**
 * Seed default tiers for club feature limits.
 *
 * Creates two seeded tiers:
 * - 'all': Full functionality, unlimited everything
 * - 'minimal': Basic features for small clubs
 *
 * Seeded tiers have isSeeded=true and cannot be deleted.
 */
async function seedTiers() {
  // Tier: all - Full functionality, unlimited
  const allTier = await prisma.tier.upsert({
    where: { name: 'all' },
    update: {},
    create: {
      name: 'all',
      description: 'Volle Funktionalität ohne Einschränkungen',
      isVisible: true,
      isSeeded: true,
      sortOrder: 0,
      color: 'green',
      icon: 'crown',
      // No limits (all null = unlimited)
      usersLimit: null,
      membersLimit: null,
      storageLimit: null,
      // All features enabled
      sepaEnabled: true,
      reportsEnabled: true,
      bankImportEnabled: true,
    },
  });
  console.log(`Seeded tier: ${allTier.name}`);

  // Tier: minimal - Restricted features/limits
  const minimalTier = await prisma.tier.upsert({
    where: { name: 'minimal' },
    update: {},
    create: {
      name: 'minimal',
      description: 'Grundfunktionen für kleine Vereine',
      isVisible: true,
      isSeeded: true,
      sortOrder: 100,
      color: 'gray',
      icon: 'users',
      // Restricted limits
      usersLimit: 3,
      membersLimit: 50,
      storageLimit: 100, // 100 MB
      // Limited features
      sepaEnabled: false,
      reportsEnabled: true,
      bankImportEnabled: false,
    },
  });
  console.log(`Seeded tier: ${minimalTier.name}`);
}

/**
 * Seed the system user for automated actions (e.g., scheduler, migrations).
 *
 * Uses SYSTEM_USER_EMAIL_DOMAIN env var for the email domain,
 * defaulting to 'noreply.localhost' for local development.
 */
async function seedSystemUser() {
  const emailDomain = process.env.SYSTEM_USER_EMAIL_DOMAIN || 'noreply.localhost';
  const systemEmail = `system@${emailDomain}`;

  const systemUser = await prisma.user.upsert({
    where: { email: systemEmail },
    update: {}, // Don't overwrite if already exists
    create: {
      email: systemEmail,
      emailVerified: true,
      name: 'System',
      isSystemUser: true,
    },
  });
  console.log(`Seeded system user: ${systemUser.email} (${systemUser.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
