-- AlterEnum
ALTER TYPE "LeftCategory" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "member_status_transitions" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT;

-- AlterTable
ALTER TABLE "membership_types" ALTER COLUMN "updatedAt" DROP DEFAULT;
