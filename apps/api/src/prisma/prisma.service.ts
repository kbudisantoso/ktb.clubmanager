import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../../../prisma/generated/client/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createTenantExtension } from './extensions/tenant.extension.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // SEC-015: Enforce SSL for production database connections
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Returns a Prisma client scoped to a specific club.
   * All queries on tenant-scoped models will automatically include clubId filter.
   *
   * Per ADR-0010: Row-Level Tenant Isolation
   *
   * @param clubId - The club to scope queries to
   */
  forClub(clubId: string) {
    return this.$extends(createTenantExtension(clubId));
  }
}
