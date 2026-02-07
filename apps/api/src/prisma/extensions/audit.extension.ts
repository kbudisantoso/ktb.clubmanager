import type { PrismaClient } from '../../../../../prisma/generated/client/index.js';
import {
  Prisma,
  type Prisma as PrismaNamespace,
} from '../../../../../prisma/generated/client/index.js';

/**
 * Context for audit logging - who/where/how the action was performed.
 */
export interface AuditContext {
  userId?: string;
  clubId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Models to audit. Can be configured based on requirements.
 */
const AUDITED_MODELS = [
  'Club',
  'ClubUser',
  'Tier',
  'Member',
  'Household',
  'MembershipPeriod',
  'NumberRange',
  'LedgerAccount',
  // Add more as needed
] as const;

type AuditedModel = (typeof AUDITED_MODELS)[number];

function isAudited(model: string): model is AuditedModel {
  return AUDITED_MODELS.includes(model as AuditedModel);
}

const WRITE_OPERATIONS = [
  'create',
  'createMany',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
];

/**
 * Creates a Prisma Client Extension that logs all write operations
 * to the audit_logs table.
 *
 * Per ADR-0010: Audit Logging requirement
 *
 * @param context - Who/where performed the action
 * @param prisma - Base Prisma client for writing audit logs (to avoid recursion)
 */
export function createAuditExtension(context: AuditContext, prisma: PrismaClient) {
  return Prisma.defineExtension({
    name: 'audit-logging',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Execute the original query
          const result = await query(args);

          // Only audit write operations on audited models
          // Note: AuditLog is not in AUDITED_MODELS, so no recursion concern
          if (!isAudited(model) || !WRITE_OPERATIONS.includes(operation)) {
            return result;
          }

          try {
            // Determine entity ID from result or args
            let entityId = 'unknown';
            const typedArgs = args as { where?: { id?: unknown }; data?: unknown };

            if (result && typeof result === 'object' && 'id' in result) {
              entityId = String(result.id);
            } else if (typedArgs.where && 'id' in typedArgs.where) {
              entityId = String(typedArgs.where.id);
            } else if (operation.includes('Many')) {
              entityId = 'batch';
            }

            // Prepare changes data (sanitized)
            const changes = sanitizeForAudit({
              operation,
              data: typedArgs.data,
              where: typedArgs.where,
            });

            // Write audit log using base client (not extended)
            await prisma.auditLog.create({
              data: {
                entityType: model,
                entityId,
                action: operation,
                userId: context.userId,
                clubId: context.clubId,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                changes: changes as PrismaNamespace.InputJsonValue,
              },
            });
          } catch (error) {
            // Don't fail the main operation if audit logging fails
            console.error('[AuditLog] Failed to log:', error);
          }

          return result;
        },
      },
    },
  });
}

/**
 * Remove sensitive fields from audit data.
 * Never log passwords, tokens, or other secrets.
 */
function sanitizeForAudit(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['password', 'accessToken', 'refreshToken', 'idToken', 'secret', 'token'];

  const sanitize = (obj: unknown): unknown => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (sensitiveFields.some((f) => key.toLowerCase().includes(f))) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = sanitize(value);
      }
    }
    return result;
  };

  return sanitize(data) as Record<string, unknown>;
}
