-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('NATURAL', 'LEGAL_ENTITY');

-- CreateEnum
CREATE TYPE "Salutation" AS ENUM ('HERR', 'FRAU', 'DIVERS');

-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('ORDENTLICH', 'PASSIV', 'EHREN', 'FOERDER', 'JUGEND');

-- CreateEnum
CREATE TYPE "HouseholdRole" AS ENUM ('HEAD', 'SPOUSE', 'CHILD', 'OTHER');

-- CreateEnum
CREATE TYPE "DeletionReason" AS ENUM ('AUSTRITT', 'AUSSCHLUSS', 'DATENSCHUTZ', 'SONSTIGES');

-- AlterEnum
BEGIN;
CREATE TYPE "ClubRole_new" AS ENUM ('OWNER', 'ADMIN', 'TREASURER', 'SECRETARY', 'MEMBER');
ALTER TABLE "club_users" ALTER COLUMN "roles" TYPE "ClubRole_new"[] USING ("roles"::text::"ClubRole_new"[]);
ALTER TYPE "ClubRole" RENAME TO "ClubRole_old";
ALTER TYPE "ClubRole_new" RENAME TO "ClubRole";
DROP TYPE "public"."ClubRole_old";
COMMIT;

-- DropIndex
DROP INDEX "members_clubId_email_key";

-- AlterTable
ALTER TABLE "members" DROP COLUMN "joinedAt",
DROP COLUMN "leftAt",
DROP COLUMN "name",
ADD COLUMN     "addressExtra" TEXT,
ADD COLUMN     "anonymizedAt" TIMESTAMP(3),
ADD COLUMN     "anonymizedBy" TEXT,
ADD COLUMN     "cancellationDate" DATE,
ADD COLUMN     "cancellationReceivedAt" TIMESTAMP(3),
ADD COLUMN     "contactFirstName" TEXT,
ADD COLUMN     "contactLastName" TEXT,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'DE',
ADD COLUMN     "deletionReason" "DeletionReason",
ADD COLUMN     "department" TEXT,
ADD COLUMN     "dsgvoRequestDate" DATE,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "houseNumber" TEXT,
ADD COLUMN     "householdId" TEXT,
ADD COLUMN     "householdRole" "HouseholdRole",
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "memberNumber" TEXT NOT NULL,
ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "organizationName" TEXT,
ADD COLUMN     "personType" "PersonType" NOT NULL DEFAULT 'NATURAL',
ADD COLUMN     "position" TEXT,
ADD COLUMN     "salutation" "Salutation",
ADD COLUMN     "statusChangeReason" TEXT,
ADD COLUMN     "statusChangedAt" TIMESTAMP(3),
ADD COLUMN     "statusChangedBy" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "vatId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "households" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryContactId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_periods" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "joinDate" DATE NOT NULL,
    "leaveDate" DATE,
    "membershipType" "MembershipType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "number_ranges" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '',
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "padLength" INTEGER NOT NULL DEFAULT 4,
    "yearReset" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "number_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "households_clubId_idx" ON "households"("clubId");

-- CreateIndex
CREATE INDEX "membership_periods_memberId_idx" ON "membership_periods"("memberId");

-- CreateIndex
CREATE INDEX "number_ranges_clubId_idx" ON "number_ranges"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "number_ranges_clubId_entityType_key" ON "number_ranges"("clubId", "entityType");

-- CreateIndex
CREATE INDEX "members_clubId_lastName_idx" ON "members"("clubId", "lastName");

-- CreateIndex
CREATE INDEX "members_clubId_status_idx" ON "members"("clubId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "members_clubId_memberNumber_key" ON "members"("clubId", "memberNumber");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_periods" ADD CONSTRAINT "membership_periods_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "number_ranges" ADD CONSTRAINT "number_ranges_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
