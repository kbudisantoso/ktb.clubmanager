-- AlterTable
ALTER TABLE "club_users" ADD COLUMN "isExternal" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex (partial unique index - not expressible in Prisma schema)
-- Ensures a user can only be linked to one active member per club
CREATE UNIQUE INDEX "members_clubId_userId_active_key"
  ON "members" ("clubId", "userId")
  WHERE "userId" IS NOT NULL AND "deletedAt" IS NULL;
