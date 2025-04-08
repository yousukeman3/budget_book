import { PrismaClient, Debt as PrismaDebt, Prisma } from '@prisma/client';
import { PrismaDebtRepository } from '../debtRepository';
import { Debt, DebtType } from '../../../domain/entry';
import { Decimal } from '@prisma/client/runtime/library';
import { NotFoundError } from '../../../../../shared/errors/AppError';
import { ResourceType } from '../../../../../shared/errors/ErrorCodes';

// Jestのモック機能を使用
const mockFindUnique = jest.fn();
const mockFindMany = fn();
const mockCreate = fn();
const mockUpdate = fn();
const mockDelete = fn();

// モック関数のリセット用ヘルパー
const resetAllMocks = () => {
  mockFindUnique.mockClear();
  mockFindMany.mockClear();
  mockCreate.mockClear();
  mockUpdate.mockClear();
  mockDelete.mockClear();
};

// モックPrismaClientを作成
const mockPrisma = {
  debt: {
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
  }
} as unknown as PrismaClient;

// テストユーティリティ
const createMockPrismaDebt = (override?: Partial<PrismaDebt>): PrismaDebt => ({
  id: '123e4567-e89b-12d3-a456-426614174111',
  type: 'borrow',
  rootEntryId: '123e4567-e89b-12d3-a456-426614174000',
  date: new Date('2025-04-01'),
  amount: new Decimal(5000),
  counterpart: '山田太郎',
  repaidAt: null,
  memo: '友人からの借入',
  ...override
});

describe('PrismaDebtRepository', () => {
  let repository: PrismaDebtRepository;
  
  // 各テストの前にリポジトリとモックをリセット
  beforeEach(() => {
    resetAllMocks();
    repository = new PrismaDebtRepository(mockPrisma);
  });

  describe('findById', () => {
    test('存在するIDの場合、正しいDebtドメインオブジェクトを返す', async () => {
      const mockDebt = createMockPrismaDebt();
      mockFindUnique.mockResolvedValueOnce(mockDebt);
      
      const result = await repository.findById(mockDebt.id);
      
      expect(result).toBeInstanceOf(Debt);
      expect(result?.id).toBe(mockDebt.id);
      expect(result?.type).toBe(mockDebt.type);
      expect(result?.amount.toNumber()).toBe(mockDebt.amount.toNumber());
      expect(result?.counterpart).toBe(mockDebt.counterpart);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: mockDebt.id }
      });
    });
    
    test('存在しないIDの場合、undefinedを返す', async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      
      const result = await repository.findById('non-existent-id');
      
      expect(result).toBeUndefined();
    });
  });

  describe('findByRootEntryId', () => {
    test('存在するルートエントリIDの場合、対応するDebtを返す', async () => {
      const mockDebt = createMockPrismaDebt();
      mockFindUnique.mockResolvedValueOnce(mockDebt);
      
      const result = await repository.findByRootEntryId(mockDebt.rootEntryId);
      
      expect(result).toBeInstanceOf(Debt);
      expect(result?.rootEntryId).toBe(mockDebt.rootEntryId);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { rootEntryId: mockDebt.rootEntryId }
      });
    });
    
    test('存在しないルートエントリIDの場合、undefinedを返す', async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      
      const result = await repository.findByRootEntryId('non-existent-entry-id');
      
      expect(result).toBeUndefined();
    });
  });
  
  describe('findByOptions', () => {
    test('検索オプションに基づいて適切なクエリが実行される', async () => {
      const mockDebts = [
        createMockPrismaDebt(),
        createMockPrismaDebt({ id: 'debt-2', counterpart: '鈴木花子' })
      ];
      
      mockFindMany.mockResolvedValueOnce(mockDebts);
      
      const searchOptions = {
        type: 'borrow',
        counterpart: '山田',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-04-30'),
        isRepaid: false,
        limit: 10,
        sortBy: 'date',
        sortDirection: 'desc' as const
      };
      
      const results = await repository.findByOptions(searchOptions);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(Debt);
      expect(results[1]).toBeInstanceOf(Debt);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          type: searchOptions.type,
          counterpart: expect.objectContaining({
            contains: searchOptions.counterpart
          }),
          date: expect.objectContaining({
            gte: searchOptions.startDate,
            lte: searchOptions.endDate
          }),
          repaidAt: null
        }),
        orderBy: { date: 'desc' },
        take: 10
      }));
    });
    
    test('返済済み（isRepaid=true）のフィルタリングが正しく動作する', async () => {
      const mockDebts = [
        createMockPrismaDebt({ repaidAt: new Date('2025-05-01') })
      ];
      
      mockFindMany.mockResolvedValueOnce(mockDebts);
      
      await repository.findByOptions({ isRepaid: true });
      
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          repaidAt: { not: null }
        })
      }));
    });
  });

  describe('findOutstandingDebts', () => {
    test('未返済の借入を正しく取得する', async () => {
      const mockDebts = [
        createMockPrismaDebt(),
        createMockPrismaDebt({ id: 'debt-2', counterpart: '鈴木花子' })
      ];
      
      mockFindMany.mockResolvedValueOnce(mockDebts);
      
      const results = await repository.findOutstandingDebts('borrow');
      
      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(Debt);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          repaidAt: null,
          type: 'borrow'
        },
        orderBy: { date: 'asc' }
      });
    });
    
    test('タイプ指定なしでも全未返済債務を取得する', async () => {
      const mockDebts = [
        createMockPrismaDebt(),
        createMockPrismaDebt({ id: 'debt-2', type: 'lend' })
      ];
      
      mockFindMany.mockResolvedValueOnce(mockDebts);
      
      const results = await repository.findOutstandingDebts();
      
      expect(results).toHaveLength(2);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          repaidAt: null
        },
        orderBy: { date: 'asc' }
      });
    });
  });
  
  describe('create', () => {
    test('Debtドメインオブジェクトから正しくPrismaデータが作成される', async () => {
      const debtToCreate = new Debt(
        'new-debt-id',
        DebtType.BORROW,
        'entry-123',
        new Date('2025-04-05'),
        new Decimal(10000),
        '山田太郎',
        undefined,
        'テスト用借入'
      );
      
      const createdPrismaDebt = createMockPrismaDebt({
        id: debtToCreate.id,
        amount: debtToCreate.amount,
        counterpart: debtToCreate.counterpart
      });
      
      mockCreate.mockResolvedValueOnce(createdPrismaDebt);
      
      const result = await repository.create(debtToCreate);
      
      expect(result).toBeInstanceOf(Debt);
      expect(result.id).toBe(debtToCreate.id);
      expect(result.counterpart).toBe(debtToCreate.counterpart);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: debtToCreate.type,
          rootEntryId: debtToCreate.rootEntryId,
          date: debtToCreate.date,
          amount: debtToCreate.amount,
          counterpart: debtToCreate.counterpart,
          memo: debtToCreate.memo
        })
      });
    });
  });
  
  describe('update', () => {
    test('存在するDebtの更新が正しく行われる', async () => {
      const debtToUpdate = new Debt(
        '123e4567-e89b-12d3-a456-426614174111',
        DebtType.BORROW,
        '123e4567-e89b-12d3-a456-426614174000',
        new Date('2025-04-01'),
        new Decimal(6000), // 金額更新
        '山田太郎',
        undefined,
        '金額修正済み' // メモ更新
      );
      
      const updatedPrismaDebt = createMockPrismaDebt({
        amount: debtToUpdate.amount,
        memo: debtToUpdate.memo
      });
      
      mockUpdate.mockResolvedValueOnce(updatedPrismaDebt);
      
      const result = await repository.update(debtToUpdate);
      
      expect(result).toBeInstanceOf(Debt);
      expect(result.amount.toNumber()).toBe(6000);
      expect(result.memo).toBe('金額修正済み');
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: debtToUpdate.id },
        data: expect.objectContaining({
          amount: debtToUpdate.amount,
          memo: debtToUpdate.memo
        })
      });
    });
    
    test('存在しないDebtの更新でNotFoundErrorがスローされる', async () => {
      const nonExistentDebt = new Debt(
        'non-existent-id',
        DebtType.BORROW,
        'entry-123',
        new Date(),
        new Decimal(1000),
        '存在しない借入'
      );
      
      // Prismaエラーをモック
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '4.0.0'
      });
      
      // モックの設定
      mockUpdate.mockImplementation(() => {
        throw prismaError;
      });
      
      // テスト実行 - 一度だけ呼び出し
      try {
        await repository.update(nonExistentDebt);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).code).toBe(`${ResourceType.DEBT}_NOT_FOUND`);
      }
      
      // モック呼び出しの検証
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: nonExistentDebt.id },
        data: expect.objectContaining({
          amount: nonExistentDebt.amount
        })
      });
    });
  });

  describe('markAsRepaid', () => {
    test('Debtを返済済み状態に正しく更新する', async () => {
      const debtId = '123e4567-e89b-12d3-a456-426614174111';
      const repaidAt = new Date('2025-05-15');
      
      const updatedPrismaDebt = createMockPrismaDebt({
        repaidAt: repaidAt
      });
      
      mockUpdate.mockResolvedValueOnce(updatedPrismaDebt);
      
      const result = await repository.markAsRepaid(debtId, repaidAt);
      
      expect(result).toBeInstanceOf(Debt);
      expect(result.repaidAt).toEqual(repaidAt);
      expect(result.isRepaid()).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: debtId },
        data: { repaidAt: repaidAt }
      });
    });
    
    test('存在しないDebtを返済済みに更新しようとするとNotFoundErrorがスローされる', async () => {
      const nonExistentId = 'non-existent-id';
      const repaidAt = new Date();
      
      // Prismaエラーをモック
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '4.0.0'
      });
      
      // モックの設定
      mockUpdate.mockImplementation(() => {
        throw prismaError;
      });
      
      // テスト実行
      try {
        await repository.markAsRepaid(nonExistentId, repaidAt);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).code).toBe(`${ResourceType.DEBT}_NOT_FOUND`);
      }
      
      // モック呼び出しの検証
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: nonExistentId },
        data: { repaidAt: repaidAt }
      });
    });
  });
  
  describe('delete', () => {
    test('存在するDebtの削除が成功する', async () => {
      mockDelete.mockResolvedValueOnce(createMockPrismaDebt());
      
      const result = await repository.delete('123e4567-e89b-12d3-a456-426614174111');
      
      expect(result).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174111' }
      });
    });
    
    test('存在しないDebtの削除はfalseを返す', async () => {
      // Prismaエラーをモック
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '4.0.0'
      });
      
      // モックの設定
      mockDelete.mockImplementation(() => {
        throw prismaError;
      });
      
      const result = await repository.delete('non-existent-id');
      
      expect(result).toBe(false);
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' }
      });
    });

    test('その他のエラーが発生した場合は例外をスローする', async () => {
      // その他のPrismaエラーをモック
      const otherError = new Error('Database error');
      
      mockDelete.mockRejectedValueOnce(otherError);
      
      await expect(repository.delete('valid-id')).rejects.toThrow('Database error');
    });
  });
});