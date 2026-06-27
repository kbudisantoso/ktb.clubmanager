-- Soft-delete-aware billing dedupe index (CONV-006)
--
-- The billing dedupe index `fee_charges_billing_unique` previously enforced
-- uniqueness across ALL rows (including soft-deleted ones). Once charges can be
-- soft-deleted (e.g. a future cancellation/Storno endpoint), re-running a period
-- would silently produce 0 new charges: the `count where deletedAt IS NULL` guard
-- passes, but `createMany({ skipDuplicates: true })` collides with the
-- soft-deleted rows still occupying the index.
--
-- Make the index partial on `deletedAt IS NULL` so only active charges are
-- deduplicated, while keeping NULLS NOT DISTINCT so re-running a period is a true
-- no-op among active rows (Postgres 15+). Follows the existing pattern used for
-- ClubUser, AccessRequest, Club.inviteCode and Member.

DROP INDEX "fee_charges_billing_unique";
CREATE UNIQUE INDEX "fee_charges_billing_unique"
  ON "fee_charges"("memberId", "feeCategoryId", "membershipTypeId", "feeTypeId", "periodStart", "periodEnd")
  NULLS NOT DISTINCT
  WHERE "deletedAt" IS NULL;
