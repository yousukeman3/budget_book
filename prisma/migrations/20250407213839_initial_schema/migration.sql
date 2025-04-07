-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('income', 'expense', 'borrow', 'lend', 'repayment', 'repaymentReceive', 'transfer', 'initial_balance');

-- CreateEnum
CREATE TYPE "DebtType" AS ENUM ('borrow', 'lend');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('income', 'expense');

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "type" "EntryType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "methodId" TEXT NOT NULL,
    "categoryId" TEXT,
    "purpose" TEXT,
    "privatePurpose" TEXT,
    "note" TEXT,
    "evidenceNote" TEXT,
    "debtId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL,
    "type" "DebtType" NOT NULL,
    "rootEntryId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "counterpart" TEXT NOT NULL,
    "repaidAt" TIMESTAMP(3),
    "memo" TEXT,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Method" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initialBalance" DECIMAL(65,30),
    "archived" BOOLEAN,

    CONSTRAINT "Method_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "Debt_rootEntryId_key" ON "Debt"("rootEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "Method_name_key" ON "Method"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_rootEntryId_key" ON "Transfer"("rootEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EntryTypeMeta_label_key" ON "EntryTypeMeta"("label");

-- CreateIndex
CREATE UNIQUE INDEX "DebtTypeMeta_label_key" ON "DebtTypeMeta"("label");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTypeMeta_label_key" ON "CategoryTypeMeta"("label");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "Method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
