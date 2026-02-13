-- CreateEnum
CREATE TYPE "ClubPurpose" AS ENUM ('IDEALVEREIN', 'WIRTSCHAFTLICH');

-- CreateEnum
CREATE TYPE "ClubSpecialForm" AS ENUM ('KEINE', 'TRAEGERVEREIN', 'FOERDERVEREIN', 'DACHVERBAND');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING_UPLOAD', 'UPLOADED', 'DELETED', 'MISSING');

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "accountHolder" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "bic" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "clubPurpose" "ClubPurpose",
ADD COLUMN     "clubSpecialForm" "ClubSpecialForm",
ADD COLUMN     "defaultMembershipType" "MembershipType",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "fiscalYearStartMonth" INTEGER,
ADD COLUMN     "foundedAt" DATE,
ADD COLUMN     "houseNumber" TEXT,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "isNonProfit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRegistered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logoFileId" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "probationPeriodDays" INTEGER,
ADD COLUMN     "registryCourt" TEXT,
ADD COLUMN     "registryNumber" TEXT,
ADD COLUMN     "shortCode" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "taxNumber" TEXT,
ADD COLUMN     "taxOffice" TEXT,
ADD COLUMN     "vatId" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "etag" TEXT,
    "checksum" TEXT,
    "status" "FileStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "s3Key" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_files" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_files" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "files_status_idx" ON "files"("status");

-- CreateIndex
CREATE INDEX "club_files_clubId_idx" ON "club_files"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "club_files_clubId_fileId_key" ON "club_files"("clubId", "fileId");

-- CreateIndex
CREATE INDEX "user_files_userId_idx" ON "user_files"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_files_userId_fileId_key" ON "user_files"("userId", "fileId");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_logoFileId_key" ON "clubs"("logoFileId");

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_logoFileId_fkey" FOREIGN KEY ("logoFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_files" ADD CONSTRAINT "club_files_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_files" ADD CONSTRAINT "club_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_files" ADD CONSTRAINT "user_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_files" ADD CONSTRAINT "user_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

