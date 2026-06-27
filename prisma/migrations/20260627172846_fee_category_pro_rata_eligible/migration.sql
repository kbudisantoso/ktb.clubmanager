-- Add opt-in pro-rata flag to fee categories.
-- Default false preserves current behaviour (category fees are charged in full);
-- set true for recurring add-ons that should be pro-rated for mid-period joins
-- when the club uses MONTHLY_PRO_RATA.
ALTER TABLE "fee_categories" ADD COLUMN "proRataEligible" BOOLEAN NOT NULL DEFAULT false;
