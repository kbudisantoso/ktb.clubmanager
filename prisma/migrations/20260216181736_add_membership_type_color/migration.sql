-- CreateEnum
CREATE TYPE "MemberTypeColor" AS ENUM ('BLUE', 'GREEN', 'PURPLE', 'AMBER', 'ROSE', 'TEAL', 'SLATE', 'INDIGO');

-- AlterTable
ALTER TABLE "membership_types" ADD COLUMN     "color" "MemberTypeColor" NOT NULL DEFAULT 'BLUE';
