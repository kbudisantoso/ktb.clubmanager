// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Disable rules that conflict with Prettier
  prettier,

  // Ignore patterns
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.d.ts',
      // Config files (not part of tsconfig projects)
      'eslint.config.js',
      'prettier.config.js',
      '**/vitest.config.ts',
      'prisma.config.ts',
      // Generated files
      'prisma/generated/**',
      // Compiled JS output in shared package
      'packages/shared/src/**/*.js',
      // Prisma seed script (not in tsconfig)
      'prisma/seed.ts',
      // Hidden directories (except .github, .devcontainer)
      '.*/**',
    ],
  },

  // TypeScript-specific rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/*/tsconfig.json', './apps/*/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Allow unused vars prefixed with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Enforce consistent type imports
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      // Allow explicit any in tests (we'll be stricter in prod code)
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
