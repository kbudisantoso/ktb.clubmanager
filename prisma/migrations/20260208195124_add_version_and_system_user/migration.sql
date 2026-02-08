-- AlterTable
ALTER TABLE "auth_users" ADD COLUMN     "isSystemUser" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;
