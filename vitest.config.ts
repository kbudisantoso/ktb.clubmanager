import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests from all packages
    projects: ['packages/*', 'apps/*', 'prisma'],
  },
});
