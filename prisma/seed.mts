import crypto from 'node:crypto'

import { PrismaClient, EntryType, DebtType, CategoryType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // === EntryTypeMeta ===
  await prisma.entryTypeMeta.createMany({
    data: [
      { type: EntryType.income, label: '収入', color: '#4CAF50', icon: 'ArrowDownward', sortOrder: 1 },
      { type: EntryType.expense, label: '支出', color: '#F44336', icon: 'ArrowUpward', sortOrder: 2 },
      { type: EntryType.borrow, label: '借入', color: '#2196F3', icon: 'Download', sortOrder: 3 },
      { type: EntryType.lend, label: '貸付', color: '#9C27B0', icon: 'Upload', sortOrder: 4 },
      { type: EntryType.repayment, label: '返済', color: '#FF9800', icon: 'Undo', sortOrder: 5 },
      { type: EntryType.repaymentReceive, label: '返済受取', color: '#3F51B5', icon: 'Redo', sortOrder: 6 },
      { type: EntryType.transfer, label: '振替', color: '#607D8B', icon: 'SwapHoriz', sortOrder: 7 },
      { type: EntryType.initial_balance, label: '初期残高', color: '#009688', icon: 'Balance', sortOrder: 8 },
    ],
    skipDuplicates: true,
  });

  // === DebtTypeMeta ===
  await prisma.debtTypeMeta.createMany({
    data: [
      { type: DebtType.borrow, label: '借入', color: '#2196F3', icon: 'South', sortOrder: 1 },
      { type: DebtType.lend, label: '貸付', color: '#9C27B0', icon: 'North', sortOrder: 2 },
    ],
    skipDuplicates: true,
  });

  // === CategoryTypeMeta ===
  await prisma.categoryTypeMeta.createMany({
    data: [
      { type: CategoryType.income, label: '収入カテゴリ', color: '#4CAF50', icon: 'AttachMoney', sortOrder: 1 },
      { type: CategoryType.expense, label: '支出カテゴリ', color: '#F44336', icon: 'MoneyOff', sortOrder: 2 },
    ],
    skipDuplicates: true,
  });

  // === Category 初期値 ===
  await prisma.category.createMany({
    data: [
      { name: '不明収入', type: CategoryType.income },
      { name: '不明支出', type: CategoryType.expense },
      { name: '現金過不足', type: CategoryType.expense },
    ],
    skipDuplicates: true,
  });

  // === Method 初期値 ===
  await prisma.method.create({
    data: {
      name: '現金',
      initialBalance: 0,
      archived: false,
    },
  });

  console.log('✅ Seed 完了しました！');
}

main()
  .catch((e) => {
    console.error('❌ Seed 失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
