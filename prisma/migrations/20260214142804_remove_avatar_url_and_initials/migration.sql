-- AlterTable: Remove redundant avatar fields (replaced by logoFileId + client-side initials derivation)
ALTER TABLE "clubs" DROP COLUMN "avatarInitials",
DROP COLUMN "avatarUrl";
