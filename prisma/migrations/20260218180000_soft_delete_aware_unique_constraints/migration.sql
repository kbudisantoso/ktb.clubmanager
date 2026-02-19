-- Soft-delete-aware unique constraints (CONV-006)
--
-- Replace strict unique indexes with partial unique indexes that only enforce
-- uniqueness among non-deleted (active) records. This allows soft-deleted
-- records to coexist without blocking identifier reuse.
--
-- Only applied to transient/reusable identifiers:
--   - Club.inviteCode: transient join code, regenerable on demand
--
-- Permanent identifiers are intentionally kept strictly unique:
--   - Club.slug: public URL identifier, external references
--   - Member [clubId, memberNumber]: permanent per German Vereinswesen
--   - LedgerAccount [clubId, code]: immutable SKR42 codes for audit/tax

-- Drop the existing strict unique constraint on inviteCode
DROP INDEX IF EXISTS "clubs_inviteCode_key";

-- Create partial unique index: uniqueness only among active (non-deleted) records
CREATE UNIQUE INDEX "clubs_inviteCode_active_key"
  ON "clubs" ("inviteCode")
  WHERE "deletedAt" IS NULL;
