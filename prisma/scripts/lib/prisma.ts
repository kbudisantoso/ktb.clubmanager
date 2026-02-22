import { PrismaClient } from '../../generated/client/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const DEFAULT_URL = 'postgresql://clubmanager:clubmanager@localhost:35432/clubmanager';

let pool: pg.Pool | null = null;
let client: PrismaClient | null = null;

export function createPrismaClient(): PrismaClient {
  if (client) return client;

  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || DEFAULT_URL,
  });

  client = new PrismaClient({
    adapter: new PrismaPg(pool),
  });

  return client;
}

export async function disconnect(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = null;
  }
  if (pool) {
    await pool.end();
    pool = null;
  }
}
