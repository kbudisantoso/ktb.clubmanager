-- AlterTable: Remove fromStatus (derived data, now computed on read) and add cascade tracking
ALTER TABLE "member_status_transitions" DROP COLUMN "fromStatus",
ADD COLUMN     "deletedByTransitionId" TEXT;
