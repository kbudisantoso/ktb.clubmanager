import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Prisma CLI loads DATABASE_URL from .env automatically when not set
    url: process.env.DATABASE_URL,
  },
});
