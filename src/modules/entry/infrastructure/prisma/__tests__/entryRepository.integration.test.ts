import { PrismaClient, Entry as PrismaEntry, Prisma } from '@prisma/client';
import { PrismaEntryRepository } from '../entryRepository';
import { Entry, EntryType } from '../../../domain/entry';
import { Decimal } from '@prisma/client/runtime/library';
import { NotFoundError } from '../../../../../shared/errors/AppError';
import { ResourceType } from '../../../../../shared/errors/ErrorCodes';
import { fn, mocked } from 'jest-mock';

// Jestのモック機能を使用
const mockFindUnique = fn();
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
  entry: {
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
  }
} as unknown as PrismaClient;

// テストユーティリティ
const createMockPrismaEntry = (override?: Partial<PrismaEntry>): PrismaEntry => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  type: 'expense',
  date: new Date('2025-04-01'),
  amount: new Decimal(1000),
  methodId: 'method-123',
  categoryId: 'category-456',
  purpose: '買い物',
  privatePurpose: null,
  note: null,
  evidenceNote: null,
  debtId: null,
  createdAt: new Date('2025-04-01T10:00:00Z'),
  ...override
});

describe('PrismaEntryRepository', () => {
  let repository: PrismaEntryRepository;
  
  // 各テストの前にリポジトリとモックをリセット
  beforeEach(() => {
    resetAllMocks();
    repository = new PrismaEntryRepository(mockPrisma);
  });

  describe('findById', () => {
    test('存在するIDの場合、正しいEntryドメインオブジェクトを返す', async () => {
      const mockEntry = createMockPrismaEntry();
      mockFindUnique.mockResolvedValueOnce(mockEntry);
      
      const result = await repository.findById(mockEntry.id);
      
      expect(result).toBeInstanceOf(Entry);
      expect(result?.id).toBe(mockEntry.id);
      expect(result?.type).toBe(mockEntry.type);
      expect(result?.amount.toNumber()).toBe(mockEntry.amount.toNumber());
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: mockEntry.id }
      });
    });
    
    test('存在しないIDの場合、undefinedを返す', async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      
      const result = await repository.findById('non-existent-id');
      
      expect(result).toBeUndefined();
    });
  });
  
  describe('findByOptions', () => {
    test('検索オプションに基づいて適切なクエリが実行される', async () => {
      const mockEntries = [
        createMockPrismaEntry(),
        createMockPrismaEntry({ id: 'id-2', amount: new Decimal(2000) })
      ];
      
      mockFindMany.mockResolvedValueOnce(mockEntries);
      
      const searchOptions = {
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-04-30'),
        types: [EntryType.EXPENSE],
        methodIds: ['method-123'],
        limit: 10
      };
      
      const results = await repository.findByOptions(searchOptions);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(Entry);
      expect(results[1]).toBeInstanceOf(Entry);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          date: expect.objectContaining({
            gte: searchOptions.startDate,
            lte: searchOptions.endDate
          }),
          type: expect.objectContaining({
            in: searchOptions.types
          }),
          methodId: expect.objectContaining({
            in: searchOptions.methodIds
          })
        }),
        take: 10
      }));
    });
    
    test('プライベート目的のエントリを含まないオプションで正しくフィルタリングされる', async () => {
      const mockEntries = [
        createMockPrismaEntry({ privatePurpose: null })
      ];
      
      mockFindMany.mockResolvedValueOnce(mockEntries);
      
      await repository.findByOptions({ includePrivate: false });
      
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          privatePurpose: null
        })
      }));
    });
  });
  
  describe('create', () => {
    test('Entryドメインオブジェクトから正しくPrismaエントリが作成される', async () => {
      const entryToCreate = new Entry(
        'new-id',
        EntryType.EXPENSE,
        new Date('2025-04-05'),
        new Decimal(1500),
        'method-456',
        'category-789',
        '食費'
      );
      
      const createdPrismaEntry = createMockPrismaEntry({
        id: entryToCreate.id,
        amount: entryToCreate.amount,
        methodId: entryToCreate.methodId
      });
      
      mockCreate.mockResolvedValueOnce(createdPrismaEntry);
      
      const result = await repository.create(entryToCreate);
      
      expect(result).toBeInstanceOf(Entry);
      expect(result.id).toBe(entryToCreate.id);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: entryToCreate.type,
          date: entryToCreate.date,
          amount: entryToCreate.amount,
          methodId: entryToCreate.methodId,
          categoryId: entryToCreate.categoryId,
          purpose: entryToCreate.purpose
        })
      });
    });
  });
  
  describe('update', () => {
    test('存在するEntryの更新が正しく行われる', async () => {
      const entryToUpdate = new Entry(
        '123e4567-e89b-12d3-a456-426614174000',
        EntryType.EXPENSE,
        new Date('2025-04-05'),
        new Decimal(2000), // 金額更新
        'method-123',
        'category-456',
        '更新後の目的'
      );
      
      const updatedPrismaEntry = createMockPrismaEntry({
        amount: entryToUpdate.amount,
        purpose: entryToUpdate.purpose
      });
      
      mockUpdate.mockResolvedValueOnce(updatedPrismaEntry);
      
      const result = await repository.update(entryToUpdate);
      
      expect(result).toBeInstanceOf(Entry);
      expect(result.amount.toNumber()).toBe(2000);
      expect(result.purpose).toBe('更新後の目的');
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: entryToUpdate.id },
        data: expect.objectContaining({
          amount: entryToUpdate.amount,
          purpose: entryToUpdate.purpose
        })
      });
    });
    
    test('存在しないEntryの更新でNotFoundErrorがスローされる', async () => {
      const nonExistentEntry = new Entry(
        'non-existent-id',
        EntryType.EXPENSE,
        new Date(),
        new Decimal(1000),
        'method-123'
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
        await repository.update(nonExistentEntry);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).code).toBe(`${ResourceType.ENTRY}_NOT_FOUND`);
      }
      
      // モック呼び出しの検証
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: nonExistentEntry.id },
        data: expect.objectContaining({
          amount: nonExistentEntry.amount
        })
      });
    });
  });
  
  describe('delete', () => {
    test('存在するEntryの削除が成功する', async () => {
      mockDelete.mockResolvedValueOnce(createMockPrismaEntry());
      
      const result = await repository.delete('123e4567-e89b-12d3-a456-426614174000');
      
      expect(result).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' }
      });
    });
    
    test('存在しないEntryの削除はfalseを返す', async () => {
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
  });

  describe('calculateBalance', () => {
    test('期間内のエントリが正しく集計される', async () => {
      // 異なるタイプのエントリを含むモックデータ
      const mockEntries = [
        createMockPrismaEntry({
          id: '1',
          type: 'income',
          amount: new Decimal(1000),
          date: new Date('2025-04-01')
        }),
        createMockPrismaEntry({
          id: '2',
          type: 'expense',
          amount: new Decimal(500),
          date: new Date('2025-04-02')
        }),
        createMockPrismaEntry({
          id: '3',
          type: 'borrow',
          amount: new Decimal(2000),
          date: new Date('2025-04-03'),
          debtId: 'debt-1'
        })
      ];
      
      mockFindMany.mockResolvedValueOnce(mockEntries);
      
      const methodId = 'method-123';
      const startDate = new Date('2025-04-01');
      const endDate = new Date('2025-04-30');
      
      const balance = await repository.calculateBalance(methodId, startDate, endDate);
      
      // income(+1000) + expense(-500) + borrow(+2000) = +2500
      expect(balance.toNumber()).toBe(2500);
      
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          methodId,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });
    });
  });
});