-- Migration: Expand Member Lifecycle
-- Adds PROBATION, DORMANT, SUSPENDED to MemberStatus
-- Replaces MembershipType enum with MembershipType entity model
-- Adds MemberStatusTransition audit trail model
-- Adds LeftCategory enum for departure categorization

-- =============================================================================
-- Step 1: Create new enums and tables FIRST (before modifying existing ones)
-- =============================================================================

-- Create LeftCategory enum
CREATE TYPE "LeftCategory" AS ENUM ('VOLUNTARY', 'EXCLUSION', 'DEATH', 'OTHER');

-- Create MembershipType entity table (new model, replaces enum)
CREATE TABLE "membership_types" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "vote" BOOLEAN NOT NULL DEFAULT true,
    "assemblyAttendance" BOOLEAN NOT NULL DEFAULT true,
    "eligibleForOffice" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "membership_types_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "membership_types_clubId_idx" ON "membership_types"("clubId");
CREATE UNIQUE INDEX "membership_types_clubId_code_key" ON "membership_types"("clubId", "code");

ALTER TABLE "membership_types" ADD CONSTRAINT "membership_types_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create MemberStatusTransition table
CREATE TABLE "member_status_transitions" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "fromStatus" "MemberStatus" NOT NULL,
    "toStatus" "MemberStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "leftCategory" "LeftCategory",
    "effectiveDate" DATE NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "member_status_transitions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "member_status_transitions_memberId_idx" ON "member_status_transitions"("memberId");
CREATE INDEX "member_status_transitions_clubId_idx" ON "member_status_transitions"("clubId");
CREATE INDEX "member_status_transitions_clubId_createdAt_idx" ON "member_status_transitions"("clubId", "createdAt");

ALTER TABLE "member_status_transitions" ADD CONSTRAINT "member_status_transitions_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- Step 2: Seed default MembershipType rows for each existing club
-- =============================================================================

INSERT INTO "membership_types" ("id", "clubId", "name", "code", "description", "isDefault", "sortOrder", "isActive", "vote", "assemblyAttendance", "eligibleForOffice", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text, c.id,
    'Ordentliches Mitglied', 'ORDENTLICH',
    'Vollmitglied mit allen Rechten und Pflichten',
    true, 0, true, true, true, true, NOW(), NOW()
FROM clubs c WHERE c."deletedAt" IS NULL;

INSERT INTO "membership_types" ("id", "clubId", "name", "code", "description", "isDefault", "sortOrder", "isActive", "vote", "assemblyAttendance", "eligibleForOffice", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text, c.id,
    'Passives Mitglied', 'PASSIV',
    'Mitglied ohne aktive Teilnahme',
    false, 1, true, false, true, false, NOW(), NOW()
FROM clubs c WHERE c."deletedAt" IS NULL;

INSERT INTO "membership_types" ("id", "clubId", "name", "code", "description", "isDefault", "sortOrder", "isActive", "vote", "assemblyAttendance", "eligibleForOffice", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text, c.id,
    'Ehrenmitglied', 'EHREN',
    'Ehrenmitglied (in der Regel beitragsfrei)',
    false, 2, true, true, true, false, NOW(), NOW()
FROM clubs c WHERE c."deletedAt" IS NULL;

INSERT INTO "membership_types" ("id", "clubId", "name", "code", "description", "isDefault", "sortOrder", "isActive", "vote", "assemblyAttendance", "eligibleForOffice", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text, c.id,
    'Foerdermitglied', 'FOERDER',
    'Unterstuetzendes Mitglied (nur finanzielle Foerderung)',
    false, 3, true, false, false, false, NOW(), NOW()
FROM clubs c WHERE c."deletedAt" IS NULL;

INSERT INTO "membership_types" ("id", "clubId", "name", "code", "description", "isDefault", "sortOrder", "isActive", "vote", "assemblyAttendance", "eligibleForOffice", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text, c.id,
    'Jugendmitglied', 'JUGEND',
    'Jugendmitglied (altersabhaengig)',
    false, 4, true, false, true, false, NOW(), NOW()
FROM clubs c WHERE c."deletedAt" IS NULL;

-- =============================================================================
-- Step 3: Migrate MembershipPeriod.membershipType enum -> FK
-- =============================================================================

-- Add the new FK column (nullable)
ALTER TABLE "membership_periods" ADD COLUMN "membershipTypeId" TEXT;

-- Migrate data: map old enum values to the new entity rows
-- PostgreSQL UPDATE...FROM syntax (no JOIN in UPDATE target)
UPDATE "membership_periods"
SET "membershipTypeId" = mt.id
FROM "membership_types" mt, "members" m
WHERE m.id = "membership_periods"."memberId"
  AND mt."clubId" = m."clubId"
  AND mt."code" = "membership_periods"."membershipType"::text;

-- Drop old enum column
ALTER TABLE "membership_periods" DROP COLUMN "membershipType";

-- Add FK constraint
ALTER TABLE "membership_periods" ADD CONSTRAINT "membership_periods_membershipTypeId_fkey"
    FOREIGN KEY ("membershipTypeId") REFERENCES "membership_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- Step 4: Migrate Club.defaultMembershipType enum -> FK
-- =============================================================================

-- Add the new FK column
ALTER TABLE "clubs" ADD COLUMN "defaultMembershipTypeId" TEXT;

-- Migrate data: map old enum value to the entity FK
UPDATE "clubs"
SET "defaultMembershipTypeId" = mt.id
FROM "membership_types" mt
WHERE mt."clubId" = "clubs".id
  AND mt."code" = "clubs"."defaultMembershipType"::text
  AND "clubs"."defaultMembershipType" IS NOT NULL;

-- Drop old enum column
ALTER TABLE "clubs" DROP COLUMN "defaultMembershipType";

-- Add FK constraint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_defaultMembershipTypeId_fkey"
    FOREIGN KEY ("defaultMembershipTypeId") REFERENCES "membership_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop the old MembershipType enum (no longer needed)
DROP TYPE "MembershipType";

-- =============================================================================
-- Step 5: Migrate MemberStatus: INACTIVE -> DORMANT, add new values
-- =============================================================================

-- PostgreSQL enum migration: create new type, alter columns, drop old
ALTER TABLE "members" ALTER COLUMN "status" DROP DEFAULT;

CREATE TYPE "MemberStatus_new" AS ENUM ('PENDING', 'PROBATION', 'ACTIVE', 'DORMANT', 'SUSPENDED', 'LEFT');

-- Convert: INACTIVE -> DORMANT, everything else stays the same
ALTER TABLE "members" ALTER COLUMN "status" TYPE "MemberStatus_new"
    USING (CASE WHEN "status"::text = 'INACTIVE' THEN 'DORMANT'::"MemberStatus_new"
                ELSE "status"::text::"MemberStatus_new" END);

-- Convert transition table columns
ALTER TABLE "member_status_transitions" ALTER COLUMN "fromStatus" TYPE "MemberStatus_new"
    USING ("fromStatus"::text::"MemberStatus_new");
ALTER TABLE "member_status_transitions" ALTER COLUMN "toStatus" TYPE "MemberStatus_new"
    USING ("toStatus"::text::"MemberStatus_new");

-- Swap types
ALTER TYPE "MemberStatus" RENAME TO "MemberStatus_old";
ALTER TYPE "MemberStatus_new" RENAME TO "MemberStatus";
DROP TYPE "MemberStatus_old";

-- Restore default
ALTER TABLE "members" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"MemberStatus";

-- =============================================================================
-- Step 6: Create synthetic MemberStatusTransition records for existing members
-- =============================================================================

INSERT INTO "member_status_transitions" ("id", "memberId", "clubId", "fromStatus", "toStatus", "reason", "effectiveDate", "actorId", "createdAt")
SELECT
    gen_random_uuid()::text,
    m.id,
    m."clubId",
    m."status",
    m."status",
    'Initiale Migration',
    COALESCE(m."statusChangedAt"::date, m."createdAt"::date),
    'system',
    COALESCE(m."statusChangedAt", m."createdAt")
FROM "members" m
WHERE m."deletedAt" IS NULL;
