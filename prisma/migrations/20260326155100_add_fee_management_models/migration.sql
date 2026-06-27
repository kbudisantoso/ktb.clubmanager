-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('MANUAL', 'BANK_IMPORT', 'SEPA');

-- CreateEnum
CREATE TYPE "FeeOverrideType" AS ENUM ('EXEMPT', 'CUSTOM_AMOUNT', 'ADDITIONAL');

-- CreateEnum
CREATE TYPE "ProRataMode" AS ENUM ('FULL', 'MONTHLY_PRO_RATA');

-- CreateEnum
CREATE TYPE "HouseholdFeeMode" AS ENUM ('NONE', 'PERCENTAGE', 'FLAT');

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "householdDiscountPercent" INTEGER,
ADD COLUMN     "householdFeeMode" "HouseholdFeeMode" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "householdFlatAmount" DECIMAL(10,2),
ADD COLUMN     "proRataMode" "ProRataMode" NOT NULL DEFAULT 'FULL';

-- AlterTable
ALTER TABLE "membership_types" ADD COLUMN     "billingInterval" "BillingInterval" NOT NULL DEFAULT 'ANNUALLY',
ADD COLUMN     "feeAmount" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "fee_categories" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'ANNUALLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOneTime" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_fee_overrides" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "feeCategoryId" TEXT,
    "overrideType" "FeeOverrideType" NOT NULL,
    "customAmount" DECIMAL(10,2),
    "reason" TEXT,
    "isBaseFee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_fee_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_charges" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "feeCategoryId" TEXT,
    "membershipTypeId" TEXT,
    "description" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "discountAmount" DECIMAL(10,2),
    "discountReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "feeChargeId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAt" DATE NOT NULL,
    "source" "PaymentSource" NOT NULL DEFAULT 'MANUAL',
    "reference" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_categories_clubId_idx" ON "fee_categories"("clubId");

-- CreateIndex
CREATE INDEX "member_fee_overrides_memberId_idx" ON "member_fee_overrides"("memberId");

-- CreateIndex
CREATE INDEX "fee_charges_clubId_idx" ON "fee_charges"("clubId");

-- CreateIndex
CREATE INDEX "fee_charges_memberId_idx" ON "fee_charges"("memberId");

-- CreateIndex
CREATE INDEX "fee_charges_clubId_dueDate_idx" ON "fee_charges"("clubId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "fee_charges_billing_unique" ON "fee_charges"("memberId", "feeCategoryId", "membershipTypeId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "payments_feeChargeId_idx" ON "payments"("feeChargeId");

-- AddForeignKey
ALTER TABLE "fee_categories" ADD CONSTRAINT "fee_categories_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_fee_overrides" ADD CONSTRAINT "member_fee_overrides_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_fee_overrides" ADD CONSTRAINT "member_fee_overrides_feeCategoryId_fkey" FOREIGN KEY ("feeCategoryId") REFERENCES "fee_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_feeCategoryId_fkey" FOREIGN KEY ("feeCategoryId") REFERENCES "fee_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_membershipTypeId_fkey" FOREIGN KEY ("membershipTypeId") REFERENCES "membership_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_feeChargeId_fkey" FOREIGN KEY ("feeChargeId") REFERENCES "fee_charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
