/*
  Warnings:

  - You are about to alter the column `amount` on the `Debt` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `amount` on the `Entry` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `initialBalance` on the `Method` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EntryType" ADD VALUE 'repayment';
ALTER TYPE "EntryType" ADD VALUE 'repaymentReceive';
ALTER TYPE "EntryType" ADD VALUE 'transfer';

-- DropForeignKey
ALTER TABLE "Debt" DROP CONSTRAINT "Debt_rootEntryId_fkey";

-- AlterTable
ALTER TABLE "Debt" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Entry" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Method" ALTER COLUMN "initialBalance" SET DATA TYPE DECIMAL(65,30);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "rootEntryId" TEXT NOT NULL,
    "fromMethodId" TEXT NOT NULL,
    "toMethodId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryTypeMeta" (
    "type" "EntryType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER,

    CONSTRAINT "EntryTypeMeta_pkey" PRIMARY KEY ("type")
);

-- CreateTable
CREATE TABLE "DebtTypeMeta" (
    "type" "DebtType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER,

    CONSTRAINT "DebtTypeMeta_pkey" PRIMARY KEY ("type")
);

-- CreateTable
CREATE TABLE "CategoryTypeMeta" (
    "type" "CategoryType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER,

    CONSTRAINT "CategoryTypeMeta_pkey" PRIMARY KEY ("type")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_rootEntryId_key" ON "Transfer"("rootEntryId");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_type_fkey" FOREIGN KEY ("type") REFERENCES "EntryTypeMeta"("type") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_type_fkey" FOREIGN KEY ("type") REFERENCES "DebtTypeMeta"("type") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_rootEntryId_fkey" FOREIGN KEY ("rootEntryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromMethodId_fkey" FOREIGN KEY ("fromMethodId") REFERENCES "Method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toMethodId_fkey" FOREIGN KEY ("toMethodId") REFERENCES "Method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_rootEntryId_fkey" FOREIGN KEY ("rootEntryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_type_fkey" FOREIGN KEY ("type") REFERENCES "CategoryTypeMeta"("type") ON DELETE CASCADE ON UPDATE CASCADE;
