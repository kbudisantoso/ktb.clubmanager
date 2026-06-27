-- WARNING: This migration assumes there are NO pre-existing duplicate charge rows under
-- the new NULLS NOT DISTINCT semantics. With the old index, rows differing only in NULL
-- key columns (e.g. base-fee charges with feeCategoryId IS NULL, category charges with
-- membershipTypeId/feeTypeId IS NULL) were allowed to coexist. Recreating the index with
-- NULLS NOT DISTINCT will fail if such duplicates already exist. A developer running this
-- against a database with real data MUST de-duplicate those fee_charges rows first.

-- Make the billing dedupe index treat NULL key columns as equal so re-running a period is a true no-op (Postgres 15+).
DROP INDEX "fee_charges_billing_unique";
CREATE UNIQUE INDEX "fee_charges_billing_unique" ON "fee_charges"("memberId", "feeCategoryId", "membershipTypeId", "feeTypeId", "periodStart", "periodEnd") NULLS NOT DISTINCT;
