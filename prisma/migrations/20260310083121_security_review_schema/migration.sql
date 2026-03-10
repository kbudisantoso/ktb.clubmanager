-- AlterTable: Add soft-delete fields to access_requests
ALTER TABLE "access_requests" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT;

-- AlterTable: Add soft-delete fields to audit_logs
ALTER TABLE "audit_logs" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT;

-- AlterTable: Add soft-delete fields to club_users
ALTER TABLE "club_users" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT;

-- Replace strict unique indexes with partial indexes (active records only)
-- This allows re-invitation after soft-delete removal

-- DropIndex: club_users strict unique
DROP INDEX IF EXISTS "club_users_userId_clubId_key";

-- CreateIndex: club_users partial unique (active records only)
CREATE UNIQUE INDEX "club_users_userId_clubId_key" ON "club_users" ("userId", "clubId") WHERE "deletedAt" IS NULL;

-- DropIndex: access_requests strict unique
DROP INDEX IF EXISTS "access_requests_userId_clubId_key";

-- CreateIndex: access_requests partial unique (active records only)
CREATE UNIQUE INDEX "access_requests_userId_clubId_key" ON "access_requests" ("userId", "clubId") WHERE "deletedAt" IS NULL;

-- Clean orphaned records before adding FK constraints

-- Clean orphaned member_status_transitions
DELETE FROM "member_status_transitions"
  WHERE "clubId" NOT IN (SELECT "id" FROM "clubs");

-- Clean orphaned audit_logs (clubId)
DELETE FROM "audit_logs"
  WHERE "clubId" IS NOT NULL
  AND "clubId" NOT IN (SELECT "id" FROM "clubs");

-- Clean orphaned audit_logs (userId)
DELETE FROM "audit_logs"
  WHERE "userId" IS NOT NULL
  AND "userId" NOT IN (SELECT "id" FROM "auth_users");

-- AddForeignKey: audit_logs.userId -> auth_users.id (SET NULL on delete)
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: audit_logs.clubId -> clubs.id (SET NULL on delete)
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: member_status_transitions.clubId -> clubs.id (CASCADE on delete)
ALTER TABLE "member_status_transitions" ADD CONSTRAINT "member_status_transitions_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
