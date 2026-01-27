import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://clubmanager:clubmanager@localhost:35432/clubmanager',
  },
})
