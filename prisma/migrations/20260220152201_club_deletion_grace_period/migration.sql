-- DropIndex
DROP INDEX "clubs_inviteCode_active_key";

-- DropIndex
DROP INDEX "members_clubId_userId_active_key";

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivatedBy" TEXT,
ADD COLUMN     "gracePeriodDays" INTEGER,
ADD COLUMN     "scheduledDeletionAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "club_deletion_logs" (
    "id" TEXT NOT NULL,
    "clubName" TEXT NOT NULL,
    "clubSlug" TEXT NOT NULL,
    "initiatedBy" TEXT NOT NULL,
    "deactivatedAt" TIMESTAMP(3) NOT NULL,
    "scheduledDeletionAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "memberCount" INTEGER NOT NULL,
    "notificationEvents" JSONB NOT NULL DEFAULT '[]',
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_deletion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "club_deletion_logs_clubSlug_idx" ON "club_deletion_logs"("clubSlug");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
