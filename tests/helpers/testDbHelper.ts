import { PrismaClient } from '@prisma/client';

/**
 * テスト用のPrismaClientインスタンス
 * 各テストは独立したデータベース状態で実行されるべき
 */
let prisma: PrismaClient;

/**
 * テスト用のPrismaClientを初期化
 * テスト実行前に呼び出す
 */
export async function initializeTestDb(): Promise<PrismaClient> {
  // 既存のコネクションがあれば切断
  if (prisma) {
    await prisma.$disconnect();
  }

  // 新しいPrismaClientインスタンスを作成
  prisma = new PrismaClient({
    // テスト実行時にSQLクエリをログ出力するには以下をコメント解除
    // log: ['query', 'info', 'warn', 'error'],
  });

  return prisma;
}

/**
 * テスト用データベースをクリーンアップ
 * 各テストの後に呼び出す
 */
export async function cleanupTestDb(): Promise<void> {
  if (!prisma) return;

  // テーブルをクリア（順序に注意）
  // 外部キー制約を考慮して削除順序を設定

  // トランザクションを使用してアトミックに削除
  await prisma.$transaction([
    prisma.transfer.deleteMany(),
    prisma.debt.deleteMany(),
    prisma.entry.deleteMany(),
    prisma.category.deleteMany(),
    prisma.method.deleteMany(),
    // 他のテーブルも必要に応じてクリア
  ]);
}

/**
 * テスト終了時のクリーンアップ
 * 全テスト完了後に呼び出す
 */
export async function closeTestDb(): Promise<void> {
  if (!prisma) return;
  await prisma.$disconnect();
}

/**
 * テスト用のトランザクションを作成
 * テスト内で使用するとテスト終了時に自動でロールバック
 */
export async function createTestTransaction<T>(
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  if (!prisma) {
    await initializeTestDb();
  }

  // @prisma/client v4.10.0以降では以下のようにトランザクションを使用
  return await prisma.$transaction(async (tx) => {
    return await callback(tx as unknown as PrismaClient);
  });
}

/**
 * テスト用の共通セットアップ
 * 基本データ（カテゴリや支払方法など）をセットアップ
 */
export async function setupBaseTestData(): Promise<{
  categories: any[];
  methods: any[];
}> {
  if (!prisma) {
    await initializeTestDb();
  }

  // 基本カテゴリの作成
  const categories = await prisma.category.createMany({
    data: [
      { name: '食費', type: 'expense' },
      { name: '交通費', type: 'expense' },
      { name: '給料', type: 'income' },
      { name: 'その他収入', type: 'income' }
    ],
    skipDuplicates: true,
  });

  // 基本支払い方法の作成
  const methods = await prisma.method.createMany({
    data: [
      { name: '現金', initialBalance: 10000 },
      { name: '銀行口座', initialBalance: 50000 },
      { name: 'クレジットカード', initialBalance: 0 }
    ],
    skipDuplicates: true,
  });

  // 作成したデータの詳細を取得して返す
  return {
    categories: await prisma.category.findMany(),
    methods: await prisma.method.findMany()
  };
}