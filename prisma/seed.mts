import crypto from 'node:crypto'
import { PrismaClient, EntryType, DebtType, CategoryType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 支払い方法（Method）
  const cash = await prisma.method.upsert({
    where: { id: 'cash' },
    update: {},
    create: {
      id: 'cash',
      name: '現金',
      initialBalance: 10000,
    },
  })

  const bank = await prisma.method.upsert({
    where: { id: 'bank' },
    update: {},
    create: {
      id: 'bank',
      name: '銀行口座',
      initialBalance: 50000,
    },
  })

  // カテゴリ（Category）
  const food = await prisma.category.upsert({
    where: { id: 'food' },
    update: {},
    create: {
      id: 'food',
      name: '食費',
      type: CategoryType.expense,
    },
  })

  const salary = await prisma.category.upsert({
    where: { id: 'salary' },
    update: {},
    create: {
      id: 'salary',
      name: '給与',
      type: CategoryType.income,
    },
  })

  // 貸借（Debt）
  const debt = await prisma.debt.create({
    data: {
      type: DebtType.borrow,
      date: new Date(),
      amount: 10000,
      counterpart: '山田太郎',
      memo: '友達からの借金',
      rootEntry: {
        create: {
          type: EntryType.borrow,
          date: new Date(),
          amount: 10000,
          method: { connect: { id: 'cash' } },
          purpose: '友達から借りた',
        },
      },
    },
    include: { rootEntry: true },
  })

  // 通常の収支 Entry
  await prisma.entry.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        type: EntryType.income,
        date: new Date(),
        amount: 3000,
        methodId: 'bank',
        categoryId: 'salary',
        purpose: 'バイト代',
      },
      {
        id: crypto.randomUUID(),
        type: EntryType.expense,
        date: new Date(),
        amount: 1200,
        methodId: 'cash',
        categoryId: 'food',
        purpose: 'ランチ',
      },
    ],
  })

  console.log('✅ Seed 完了！')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })