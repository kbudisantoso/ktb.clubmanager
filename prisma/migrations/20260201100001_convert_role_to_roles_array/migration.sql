-- Migration: Convert role (single) to roles (array)
-- Depends on: 20260201100000_add_club_role_enum_values

-- Step 1: Add the new roles column as an array
ALTER TABLE "club_users" ADD COLUMN "roles" "ClubRole"[];

-- Step 2: Migrate existing data from role to roles array
-- VIEWER becomes MEMBER, others stay the same
UPDATE "club_users"
SET "roles" = CASE
    WHEN "role" = 'VIEWER' THEN ARRAY['MEMBER']::"ClubRole"[]
    ELSE ARRAY["role"]::"ClubRole"[]
END;

-- Step 3: Set roles to empty array where null (shouldn't happen but safe)
UPDATE "club_users" SET "roles" = '{}' WHERE "roles" IS NULL;

-- Step 4: Make roles non-nullable
ALTER TABLE "club_users" ALTER COLUMN "roles" SET NOT NULL;

-- Step 5: Drop the old role column
ALTER TABLE "club_users" DROP COLUMN "role";

-- Note: VIEWER enum value remains in the enum but is no longer used
-- PostgreSQL doesn't support removing enum values easily
