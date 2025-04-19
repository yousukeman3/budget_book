import { PrismaClient } from '@prisma/client';
import { PrismaEntryRepository } from './entryRepository';
import { Entry } from '../../domain/entry';
import { EntryType } from '../../../../shared/types/entry.types';
import { toDecimal } from '../../../../shared/utils/decimal';
import { NotFoundError, BusinessRuleError } from '../../../../shared/errors/AppError';
import { BusinessRuleErrorCode } from '../../../../shared/errors/ErrorCodes';
import { setupTestDatabase, cleanupTestDatabase } from '../../../../../tests/helpers/testDbHelper';

describe('PrismaEntryRepository Integration', () => {
  let prisma: PrismaClient;
  let repository: PrismaEntryRepository;
  
  // 各テストで使用するデータ
  let testMethodId: string;
  let testCategoryId: string;
  
  beforeAll(async () => {
    // テスト用DBをセットアップ
    prisma = await setupTestDatabase();
    
    // テスト用のMethodとCategoryを作成
    const method = await prisma.method.create({
      data: {
        name: 'テスト用口座',
        initialBalance: 10000,
      }
    });
    testMethodId = method.id;
    
    const category = await prisma.category.create({
      data: {
        name: 'テスト用カテゴリ',
        type: 'expense',
      }
    });
    testCategoryId = category.id;
    
    repository = new PrismaEntryRepository(prisma);
  });
  
  afterAll(async () => {
    // テスト用DBをクリーンアップ
    await cleanupTestDatabase(prisma);
  });
  
  beforeEach(async () => {
    // 各テスト前にEntryテーブルをクリーンアップ
    await prisma.entry.deleteMany({});
  });
  
  // テストヘルパー：テストエントリの作成
  const createTestEntry = (
    type: EntryType = EntryType.EXPENSE,
    amount: number = 5000,
    options: { debtId?: string, id?: string } = {}
  ) => {
    return new Entry(
      options.id || crypto.randomUUID(),
      type,
      new Date(),
      toDecimal(amount),
      testMethodId,
      testCategoryId,
      '食費',
      null,
      'スーパーでの買い物',
      null,
      options.debtId,
      new Date()
    );
  };
  
  describe('create & findById', () => {
    it('新しいエントリーを作成し、IDで取得できること', async () => {
      // テスト用エントリーを生成
      const newEntry = createTestEntry();
      
      // エントリーを作成
      const createdEntry = await repository.create(newEntry);
      
      // IDで取得
      const foundEntry = await repository.findById(createdEntry.id);
      
      // 検証
      expect(foundEntry).toBeDefined();
      expect(foundEntry?.id).toBe(createdEntry.id);
      expect(foundEntry?.type).toBe(EntryType.EXPENSE);
      expect(foundEntry?.amount.equals(toDecimal(5000))).toBe(true);
      expect(foundEntry?.methodId).toBe(testMethodId);
      expect(foundEntry?.categoryId).toBe(testCategoryId);
    });
    
    it('存在しないIDの場合はundefinedを返すこと', async () => {
      const result = await repository.findById('non-existent-id');
      expect(result).toBeUndefined();
    });
  });
  
  describe('findByOptions', () => {
    // テスト用のエントリーを複数作成
    beforeEach(async () => {
      // 収入エントリー
      await repository.create(createTestEntry(EntryType.INCOME, 10000));
      
      // 支出エントリー（複数）
      await repository.create(createTestEntry(EntryType.EXPENSE, 3000));
      await repository.create(createTestEntry(EntryType.EXPENSE, 2000));
      
      // 借入エントリー
      const debtId = crypto.randomUUID();
      await repository.create(createTestEntry(EntryType.BORROW, 5000, { debtId }));
    });
    
    it('タイプでフィルタリングできること', async () => {
      const result = await repository.findByOptions({
        types: [EntryType.EXPENSE]
      });
      
      expect(result.length).toBe(2); // 支出エントリーは2つ
      expect(result[0].type).toBe(EntryType.EXPENSE);
      expect(result[1].type).toBe(EntryType.EXPENSE);
    });
    
    it('複数のタイプでフィルタリングできること', async () => {
      const result = await repository.findByOptions({
        types: [EntryType.INCOME, EntryType.BORROW]
      });
      
      expect(result.length).toBe(2); // 収入と借入で2つ
      expect([EntryType.INCOME, EntryType.BORROW]).toContain(result[0].type);
      expect([EntryType.INCOME, EntryType.BORROW]).toContain(result[1].type);
    });
    
    it('ページネーションが正しく動作すること', async () => {
      // limit=1, offset=1でリクエスト（2番目のエントリーのみ取得）
      const result = await repository.findByOptions({
        limit: 1,
        offset: 1,
        sortBy: 'amount',
        sortDirection: 'desc'
      });
      
      expect(result.length).toBe(1);
    });
  });
  
  describe('update', () => {
    it('既存のエントリーを更新できること', async () => {
      // テスト用エントリーを作成
      const newEntry = createTestEntry();
      const created = await repository.create(newEntry);
      
      // 金額と目的を変更
      const updatedEntry = new Entry(
        created.id,
        created.type,
        created.date,
        toDecimal(8000), // 金額を変更
        created.methodId,
        created.categoryId,
        '更新された目的', // 目的を変更
        created.privatePurpose,
        created.note,
        created.evidenceNote,
        created.debtId,
        created.createdAt
      );
      
      // 更新を実行
      const result = await repository.update(updatedEntry);
      
      // 検証
      expect(result.amount.equals(toDecimal(8000))).toBe(true);
      expect(result.purpose).toBe('更新された目的');
      
      // 実際にDBから取得して確認
      const foundEntry = await repository.findById(created.id);
      expect(foundEntry?.amount.equals(toDecimal(8000))).toBe(true);
      expect(foundEntry?.purpose).toBe('更新された目的');
    });
    
    it('存在しないエントリーの更新はNotFoundErrorをスローすること', async () => {
      const nonExistentEntry = createTestEntry(EntryType.EXPENSE, 1000, { id: 'non-existent-id' });
      
      await expect(repository.update(nonExistentEntry))
        .rejects
        .toThrow(NotFoundError);
    });
  });
  
  describe('delete', () => {
    it('既存のエントリーを削除できること', async () => {
      // テスト用エントリーを作成
      const newEntry = createTestEntry();
      const created = await repository.create(newEntry);
      
      // 削除を実行
      const result = await repository.delete(created.id);
      
      // 検証
      expect(result).toBe(true);
      
      // 実際にDBから確認
      const foundEntry = await repository.findById(created.id);
      expect(foundEntry).toBeUndefined();
    });
    
    it('存在しないエントリーの削除はfalseを返すこと', async () => {
      const result = await repository.delete('non-existent-id');
      expect(result).toBe(false);
    });
  });
  
  describe('calculateBalance', () => {
    beforeEach(async () => {
      // 様々なタイプのエントリーを作成
      // 収入: 10000
      await repository.create(createTestEntry(EntryType.INCOME, 10000));
      // 支出: 3000 + 2000 = 5000
      await repository.create(createTestEntry(EntryType.EXPENSE, 3000));
      await repository.create(createTestEntry(EntryType.EXPENSE, 2000));
      // 借入: 5000
      const debtId = crypto.randomUUID();
      await repository.create(createTestEntry(EntryType.BORROW, 5000, { debtId }));
    });
    
    it('期間内のすべての収支から残高を計算できること', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1); // 1日前から
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 1); // 1日後まで
      
      const balance = await repository.calculateBalance(testMethodId, startDate, endDate);
      
      // 収入10000 + 借入5000 - 支出(3000 + 2000) = 10000
      expect(balance.toString()).toBe('10000');
    });
  });
  
  describe('エラーケースの処理', () => {
    it('重複エントリーの作成は拒否されること', async () => {
      // 同じ日付、金額、目的、支払い方法のエントリーを2回作成
      const firstEntry = createTestEntry();
      await repository.create(firstEntry);
      
      // 完全に同一のエントリーを作成すると拒否される
      const duplicateEntry = createTestEntry();
      duplicateEntry.date = firstEntry.date;
      
      await expect(repository.create(duplicateEntry))
        .rejects
        .toThrow(BusinessRuleError);
    });
  });
});