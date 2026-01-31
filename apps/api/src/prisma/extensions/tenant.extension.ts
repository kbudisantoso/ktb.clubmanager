import { Prisma } from '../../../../../prisma/generated/client/index.js';

/**
 * Models that are scoped to a specific club (tenant).
 * All queries to these models will have clubId automatically injected.
 */
const TENANT_SCOPED_MODELS = [
  'Member',
  'LedgerAccount',
  // Future models: Transaction, TransactionLine, FeeCategory, etc.
] as const;

type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

function isTenantScoped(model: string): model is TenantScopedModel {
  return TENANT_SCOPED_MODELS.includes(model as TenantScopedModel);
}

/**
 * Creates a Prisma Client Extension that automatically injects clubId
 * into all queries on tenant-scoped models.
 *
 * Per ADR-0010: Row-Level Tenant Isolation
 *
 * @param clubId - The club ID to scope all queries to
 */
export function createTenantExtension(clubId: string) {
  return Prisma.defineExtension({
    name: 'tenant-isolation',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!isTenantScoped(model)) {
            return query(args);
          }

          // Clone args to avoid mutation
          const modifiedArgs = { ...args } as Record<string, unknown>;

          // Inject clubId into WHERE for read operations
          if (
            [
              'findMany',
              'findFirst',
              'findUnique',
              'count',
              'aggregate',
              'groupBy',
            ].includes(operation)
          ) {
            modifiedArgs.where = {
              ...(modifiedArgs.where as object | undefined),
              clubId,
            };
          }

          // Inject clubId into CREATE data
          if (operation === 'create') {
            modifiedArgs.data = {
              ...(modifiedArgs.data as object | undefined),
              clubId,
            };
          }

          if (operation === 'createMany') {
            const data = modifiedArgs.data;
            if (Array.isArray(data)) {
              modifiedArgs.data = data.map((d: Record<string, unknown>) => ({
                ...d,
                clubId,
              }));
            } else {
              modifiedArgs.data = {
                ...(data as object | undefined),
                clubId,
              };
            }
          }

          // Inject clubId into WHERE for update/delete
          if (
            [
              'update',
              'updateMany',
              'delete',
              'deleteMany',
              'upsert',
            ].includes(operation)
          ) {
            modifiedArgs.where = {
              ...(modifiedArgs.where as object | undefined),
              clubId,
            };
          }

          return query(modifiedArgs);
        },
      },
    },
  });
}
