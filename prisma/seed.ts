import { PrismaClient } from './generated/client/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Create pg pool for Prisma adapter
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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
