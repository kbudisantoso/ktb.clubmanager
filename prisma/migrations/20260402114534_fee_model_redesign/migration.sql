-- CreateEnum
CREATE TYPE "HouseholdBillingModel" AS ENUM ('NONE', 'REDUCED_MEMBERS', 'FAMILY_PAYER', 'ALL_REDUCED');

-- CreateEnum
CREATE TYPE "FeeCategoryScope" AS ENUM ('ALL_MEMBERS', 'BY_MEMBERSHIP_TYPE', 'INDIVIDUAL');

-- DropIndex
DROP INDEX "fee_charges_billing_unique";

-- AlterTable
ALTER TABLE "clubs" DROP COLUMN "householdDiscountPercent",
DROP COLUMN "householdFeeMode",
DROP COLUMN "householdFlatAmount",
ADD COLUMN     "householdBillingModel" "HouseholdBillingModel" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "fee_categories" ADD COLUMN     "scope" "FeeCategoryScope" NOT NULL DEFAULT 'ALL_MEMBERS';

-- AlterTable
ALTER TABLE "fee_charges" ADD COLUMN     "feeTypeId" TEXT;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "feeTypeId" TEXT;

-- AlterTable
ALTER TABLE "membership_types" DROP COLUMN "billingInterval",
DROP COLUMN "feeAmount";

-- DropEnum
DROP TYPE "HouseholdFeeMode";

-- CreateTable
CREATE TABLE "fee_types" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_type_fee_types" (
    "id" TEXT NOT NULL,
    "membershipTypeId" TEXT NOT NULL,
    "feeTypeId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'ANNUALLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_type_fee_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_category_membership_types" (
    "id" TEXT NOT NULL,
    "feeCategoryId" TEXT NOT NULL,
    "membershipTypeId" TEXT NOT NULL,

    CONSTRAINT "fee_category_membership_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_types_clubId_idx" ON "fee_types"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "fee_types_clubId_name_key" ON "fee_types"("clubId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "membership_type_fee_types_membershipTypeId_feeTypeId_key" ON "membership_type_fee_types"("membershipTypeId", "feeTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "fee_category_membership_types_feeCategoryId_membershipTypeI_key" ON "fee_category_membership_types"("feeCategoryId", "membershipTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "fee_charges_billing_unique" ON "fee_charges"("memberId", "feeCategoryId", "membershipTypeId", "feeTypeId", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_feeTypeId_fkey" FOREIGN KEY ("feeTypeId") REFERENCES "fee_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_feeTypeId_fkey" FOREIGN KEY ("feeTypeId") REFERENCES "fee_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_types" ADD CONSTRAINT "fee_types_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_type_fee_types" ADD CONSTRAINT "membership_type_fee_types_membershipTypeId_fkey" FOREIGN KEY ("membershipTypeId") REFERENCES "membership_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_type_fee_types" ADD CONSTRAINT "membership_type_fee_types_feeTypeId_fkey" FOREIGN KEY ("feeTypeId") REFERENCES "fee_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_category_membership_types" ADD CONSTRAINT "fee_category_membership_types_feeCategoryId_fkey" FOREIGN KEY ("feeCategoryId") REFERENCES "fee_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_category_membership_types" ADD CONSTRAINT "fee_category_membership_types_membershipTypeId_fkey" FOREIGN KEY ("membershipTypeId") REFERENCES "membership_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

