import type { PrismaClient } from '@prisma/client';
import { PrismaEntryRepository } from './entryRepository';
import { Entry } from '../../domain/entry';
import { EntryType } from '../../../../shared/types/entry.types';
import { toDecimal } from '../../../../shared/utils/decimal';
import { NotFoundError } from '../../../../shared/errors/AppError';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Prismaクライアントのモック
const mockPrisma = mockDeep<PrismaClient>();

describe('PrismaEntryRepository', () => {
  let repository: PrismaEntryRepository;
  
  beforeEach(() => {
    mockReset(mockPrisma);
    repository = new PrismaEntryRepository(mockPrisma as unknown as PrismaClient);
  });

  // サンプルEntryの準備
  const testEntryId = 'test-entry-id';
  const testMethodId = 'test-method-id';
  const testCategoryId = 'test-category-id';
  const testDebtId = 'test-debt-id';
  const testDate = new Date('2023-01-15');
  const testAmount = toDecimal(5000);
  
  const createTestEntry = () => {
    return new Entry(
      testEntryId,
      EntryType.EXPENSE,
      testDate,
      testAmount,
      testMethodId,
      testCategoryId,
      '食費',
      null,
      'スーパーでの買い物',
      null,
      null,
      new Date('2023-01-15T12:00:00Z')
    );
  };

  // Prismaから返されるモックデータ
  const mockPrismaEntry = {
    id: testEntryId,
    type: EntryType.EXPENSE, // 文字列リテラルではなくEnumを使用
    date: testDate,
    amount: {
      toNumber: () => 5000,
      toString: () => '5000',
    }, // Prismaのdecimal型をモック
    methodId: testMethodId,
    categoryId: testCategoryId,
    purpose: '食費',
    privatePurpose: null,
    note: 'スーパーでの買い物',
    evidenceNote: null,
    debtId: null,
    createdAt: new Date('2023-01-15T12:00:00Z')
  };

  describe('findById', () => {
    it('指定したIDのエントリーを返すこと', async () => {
      // Prismaのモック設定
      mockPrisma.entry.findUnique.mockResolvedValue(mockPrismaEntry);
      
      // テスト実行
      const result = await repository.findById(testEntryId);
      
      // 検証
      expect(mockPrisma.entry.findUnique).toHaveBeenCalledWith({
        where: { id: testEntryId }
      });
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(testEntryId);
      expect(result?.type).toBe(EntryType.EXPENSE);
      expect(result?.amount.equals(testAmount)).toBe(true);
    });
    
    it('存在しないIDの場合はundefinedを返すこと', async () => {
      // 存在しないIDのモック
      mockPrisma.entry.findUnique.mockResolvedValue(null);
      
      // テスト実行
      const result = await repository.findById('non-existent-id');
      
      // 検証
      expect(result).toBeUndefined();
    });

    it('データベースエラーの場合はSystemErrorをスローすること', async () => {
      // エラーのモック
      const dbError = new Error('Database connection error');
      mockPrisma.entry.findUnique.mockRejectedValue(dbError);
      
      // テスト実行と検証
      await expect(repository.findById(testEntryId))
        .rejects
        .toThrow('データベース操作中にエラーが発生しました');
    });
  });

  describe('findByOptions', () => {
    it('検索条件に基づいてエントリーのリストを返すこと', async () => {
      // 複数エントリーのモック
      mockPrisma.entry.findMany.mockResolvedValue([mockPrismaEntry]);
      
      // テスト実行
      const result = await repository.findByOptions({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        types: [EntryType.EXPENSE],
        methodIds: [testMethodId],
        categoryIds: [testCategoryId],
      });
      
      // 検証
      expect(mockPrisma.entry.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(testEntryId);
    });
    
    it('検索結果が空の場合は空配列を返すこと', async () => {
      // 検索結果なしのモック
      mockPrisma.entry.findMany.mockResolvedValue([]);
      
      // テスト実行
      const result = await repository.findByOptions({});
      
      // 検証
      expect(result).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('新しいエントリーを作成できること', async () => {
      // 重複チェック（重複なし）
      mockPrisma.entry.findFirst.mockResolvedValue(null);
      
      // 作成成功のモック
      mockPrisma.entry.create.mockResolvedValue(mockPrismaEntry);
      
      // テスト用エントリー
      const newEntry = createTestEntry();
      
      // テスト実行
      const result = await repository.create(newEntry);
      
      // 検証
      expect(mockPrisma.entry.create).toHaveBeenCalled();
      expect(result.id).toBe(testEntryId);
    });
    
    it('重複するエントリーが存在する場合はエラーを投げること', async () => {
      // 重複ありのモック
      mockPrisma.entry.findFirst.mockResolvedValue(mockPrismaEntry);
      
      // テスト用エントリー
      const newEntry = createTestEntry();
      
      // テスト実行と検証
      await expect(repository.create(newEntry))
        .rejects
        .toThrow('同じ内容のエントリがすでに存在する可能性があります');
    });
  });

  describe('update', () => {
    it('既存のエントリーを更新できること', async () => {
      // 既存エントリーのモック
      mockPrisma.entry.findUnique.mockResolvedValue(mockPrismaEntry);
      
      // 更新成功のモック
      mockPrisma.entry.update.mockResolvedValue({
        ...mockPrismaEntry,
        purpose: '更新された目的'
      });
      
      // テスト用エントリー
      const updatedEntry = createTestEntry();
      
      // テスト実行
      const result = await repository.update(updatedEntry);
      
      // 検証
      expect(mockPrisma.entry.update).toHaveBeenCalled();
      expect(result.purpose).toBe('更新された目的');
    });
    
    it('存在しないエントリーの更新はNotFoundErrorをスローすること', async () => {
      // 存在しないエントリーのモック
      mockPrisma.entry.findUnique.mockResolvedValue(null);
      
      // テスト用エントリー
      const nonExistentEntry = createTestEntry();
      
      // テスト実行と検証
      await expect(repository.update(nonExistentEntry))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('既存のエントリーを削除できること', async () => {
      // 既存エントリーのモック
      mockPrisma.entry.findUnique.mockResolvedValue(mockPrismaEntry);
      
      // 削除成功のモック
      mockPrisma.entry.delete.mockResolvedValue(mockPrismaEntry);
      
      // テスト実行
      const result = await repository.delete(testEntryId);
      
      // 検証
      expect(mockPrisma.entry.delete).toHaveBeenCalledWith({
        where: { id: testEntryId }
      });
      expect(result).toBe(true);
    });
    
    it('存在しないエントリーの削除はfalseを返すこと', async () => {
      // 存在しないエントリーのモック
      mockPrisma.entry.findUnique.mockResolvedValue(null);
      
      // テスト実行
      const result = await repository.delete('non-existent-id');
      
      // 検証
      expect(mockPrisma.entry.delete).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('calculateBalance', () => {
    it('指定された期間の残高を正しく計算できること', async () => {
      // 複数エントリーのモック（収入と支出）
      const mockEntries = [
        {
          ...mockPrismaEntry,
          type: 'income',
          amount: { toNumber: () => 10000, toString: () => '10000' }
        },
        {
          ...mockPrismaEntry,
          type: 'expense',
          amount: { toNumber: () => 3000, toString: () => '3000' }
        },
        {
          ...mockPrismaEntry,
          type: 'income',
          amount: { toNumber: () => 2000, toString: () => '2000' }
        }
      ];
      
      mockPrisma.entry.findMany.mockResolvedValue(mockEntries);
      
      // テスト実行
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      const result = await repository.calculateBalance(testMethodId, startDate, endDate);
      
      // 検証
      expect(mockPrisma.entry.findMany).toHaveBeenCalledWith({
        where: {
          methodId: testMethodId,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      
      // 収入10000 + 2000 - 支出3000 = 9000のはず
      expect(result.toString()).toBe('9000');
    });
  });
});