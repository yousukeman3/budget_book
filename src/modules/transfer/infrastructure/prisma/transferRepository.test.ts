import { PrismaClient } from '@prisma/client';
import { Transfer } from '../../domain/transfer';
import { PrismaTransferRepository } from './transferRepository';
import { NotFoundError, BusinessRuleError } from '../../../../shared/errors/AppError';
import { ResourceType, BusinessRuleErrorCode } from '../../../../shared/errors/ErrorCodes';
import { initializeTestDb, cleanupTestDb, closeTestDb } from '../../../../../tests/helpers/testDbHelper';

describe('PrismaTransferRepository', () => {
  let prisma: PrismaClient;
  let repository: PrismaTransferRepository;
  let testTransfer: Transfer;
  
  // テスト前の準備
  beforeAll(async () => {
    prisma = await initializeTestDb();
    repository = new PrismaTransferRepository(prisma);
  });

  // 各テスト前にテスト用のメソッドと振替データを作成
  beforeEach(async () => {
    // テスト用のMethod（振替元と振替先）を作成
    const fromMethod = await prisma.method.create({
      data: {
        id: 'from-method-id',
        name: '振替元口座',
        initialBalance: 10000
      }
    });
    
    const toMethod = await prisma.method.create({
      data: {
        id: 'to-method-id',
        name: '振替先口座',
        initialBalance: 5000
      }
    });
    
    // テスト用のEntryを作成（振替用）
    const entry = await prisma.entry.create({
      data: {
        id: 'test-entry-id',
        type: 'transfer',
        date: new Date('2023-01-15'),
        amount: 3000,
        methodId: 'from-method-id', // 振替元の口座
        purpose: '振替テスト'
      }
    });
    
    // テスト用のTransferオブジェクトを作成
    testTransfer = Transfer.create({
      id: 'test-transfer-id',
      rootEntryId: 'test-entry-id',
      fromMethodId: 'from-method-id',
      toMethodId: 'to-method-id',
      date: new Date('2023-01-15'),
      note: 'テスト振替'
    });
    
    // データベースに保存
    testTransfer = await repository.create(testTransfer);
  });

  // 各テスト後にデータをクリーンアップ
  afterEach(async () => {
    await cleanupTestDb();
  });

  // テスト終了後にPrismaを切断
  afterAll(async () => {
    await closeTestDb();
  });

  describe('create', () => {
    it('新しいTransferを作成できる', async () => {
      // 別の振替データを準備
      const newEntry = await prisma.entry.create({
        data: {
          id: 'new-entry-id',
          type: 'transfer',
          date: new Date('2023-02-10'),
          amount: 2000,
          methodId: 'from-method-id',
          purpose: '新しい振替'
        }
      });

      const newTransfer = Transfer.create({
        rootEntryId: 'new-entry-id',
        fromMethodId: 'from-method-id',
        toMethodId: 'to-method-id',
        date: new Date('2023-02-10'),
        note: '新しい振替のテスト'
      });

      // Act
      const created = await repository.create(newTransfer);

      // Assert
      expect(created).toBeDefined();
      expect(created.id).toBe(newTransfer.id);
      expect(created.rootEntryId).toBe('new-entry-id');
      expect(created.fromMethodId).toBe('from-method-id');
      expect(created.toMethodId).toBe('to-method-id');
      expect(created.note).toBe('新しい振替のテスト');
      
      // データベースから直接確認
      const fromDb = await prisma.transfer.findUnique({
        where: { id: created.id }
      });
      expect(fromDb).toBeDefined();
      expect(fromDb?.rootEntryId).toBe('new-entry-id');
    });
    
    it('同一EntryIDが既に存在する場合はエラーになる', async () => {
      // 既存のrootEntryIdを使った新しい振替を作成
      const duplicateTransfer = Transfer.create({
        rootEntryId: 'test-entry-id', // 既に使われているID
        fromMethodId: 'from-method-id',
        toMethodId: 'to-method-id',
        date: new Date('2023-03-01')
      });

      // Act & Assert
      await expect(repository.create(duplicateTransfer))
        .rejects
        .toThrow(BusinessRuleError);
    });

    it('同じMethod間の振替は作成できない', async () => {
      // 新しいEntryを作成
      const newEntry = await prisma.entry.create({
        data: {
          id: 'another-entry-id',
          type: 'transfer',
          date: new Date('2023-03-15'),
          amount: 1000,
          methodId: 'from-method-id',
          purpose: '無効な振替'
        }
      });

      // 同じMethod間の振替を試みる
      const invalidTransfer = Transfer.create({
        rootEntryId: 'another-entry-id',
        fromMethodId: 'from-method-id',
        toMethodId: 'from-method-id', // 同じIDを使用
        date: new Date('2023-03-15')
      });

      // Act & Assert
      await expect(repository.create(invalidTransfer))
        .rejects
        .toThrow(BusinessRuleError);
    });
  });
  
  describe('findById', () => {
    it('存在するIDのTransferを取得できる', async () => {
      // Act
      const found = await repository.findById(testTransfer.id);

      // Assert
      expect(found).toBeDefined();
      expect(found?.id).toBe(testTransfer.id);
      expect(found?.rootEntryId).toBe(testTransfer.rootEntryId);
      expect(found?.fromMethodId).toBe(testTransfer.fromMethodId);
      expect(found?.toMethodId).toBe(testTransfer.toMethodId);
      expect(found?.note).toBe(testTransfer.note);
    });

    it('存在しないIDの場合undefinedを返す', async () => {
      // Act
      const found = await repository.findById('non-existent-id');

      // Assert
      expect(found).toBeUndefined();
    });
  });
  
  describe('findByRootEntryId', () => {
    it('対応するrootEntryIdのTransferを取得できる', async () => {
      // Act
      const found = await repository.findByRootEntryId(testTransfer.rootEntryId);

      // Assert
      expect(found).toBeDefined();
      expect(found?.id).toBe(testTransfer.id);
      expect(found?.rootEntryId).toBe(testTransfer.rootEntryId);
    });

    it('存在しないrootEntryIdの場合undefinedを返す', async () => {
      // Act
      const found = await repository.findByRootEntryId('non-existent-entry-id');

      // Assert
      expect(found).toBeUndefined();
    });
  });
  
  describe('update', () => {
    it('既存のTransferを更新できる', async () => {
      // Arrange
      const updatedTransfer = testTransfer.updateNote('更新されたノート');

      // Act
      const result = await repository.update(updatedTransfer);

      // Assert
      expect(result.note).toBe('更新されたノート');
      
      // データベースから直接確認
      const fromDb = await prisma.transfer.findUnique({
        where: { id: testTransfer.id }
      });
      expect(fromDb?.note).toBe('更新されたノート');
    });

    it('存在しないTransferを更新しようとするとNotFoundErrorが発生する', async () => {
      // Arrange
      const nonExistentTransfer = new Transfer(
        'non-existent-id',
        'entry-id',
        'from-method-id',
        'to-method-id',
        new Date()
      );

      // Act & Assert
      await expect(repository.update(nonExistentTransfer))
        .rejects
        .toThrow(NotFoundError);
    });
  });
  
  describe('delete', () => {
    it('存在するTransferを削除できる', async () => {
      // Act
      const result = await repository.delete(testTransfer.id);

      // Assert
      expect(result).toBe(true);
      
      // データベースから直接確認
      const fromDb = await prisma.transfer.findUnique({
        where: { id: testTransfer.id }
      });
      expect(fromDb).toBeNull();
    });

    it('存在しないTransferを削除しようとするとfalseを返す', async () => {
      // Act
      const result = await repository.delete('non-existent-id');

      // Assert
      expect(result).toBe(false);
    });
  });
  
  describe('findByOptions', () => {
    beforeEach(() => {
      // 複数のデータを返すモックを設定
      const mockTransfers = [
        {
          id: 'transfer-1',
          rootEntryId: 'entry-1',
          fromMethodId: 'method-1',
          toMethodId: 'method-2',
          date: new Date('2023-01-01'),
          note: 'テスト振替1'
        },
        {
          id: 'transfer-2',
          rootEntryId: 'entry-2',
          fromMethodId: 'method-2',
          toMethodId: 'method-3',
          date: new Date('2023-02-01'),
          note: 'テスト振替2'
        }
      ];

      mockPrisma.transfer.findMany.mockResolvedValue(mockTransfers);
    });

    it('すべてのTransferを取得できる', async () => {
      // Act
      const transfers = await repository.findByOptions({});

      // Assert
      expect(transfers).toHaveLength(2);
      expect(transfers[0].id).toBe('transfer-1');
      expect(transfers[1].id).toBe('transfer-2');
    });

    it('fromMethodIdでフィルタリングできる', async () => {
      // Act
      const transfers = await repository.findByOptions({
        fromMethodId: 'method-1'
      });

      // 引数を検証
      expect(mockPrisma.transfer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fromMethodId: 'method-1'
          })
        })
      );

      // 結果を検証
      expect(transfers.length).toBe(2); // モックが常に同じ配列を返すので2件
    });

    it('toMethodIdでフィルタリングできる', async () => {
      // Act
      const transfers = await repository.findByOptions({
        toMethodId: 'method-3'
      });

      // 引数を検証
      expect(mockPrisma.transfer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            toMethodId: 'method-3'
          })
        })
      );
    });

    it('日付範囲でフィルタリングできる', async () => {
      // Act
      const transfers = await repository.findByOptions({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-02-28')
      });

      // 引数を検証
      expect(mockPrisma.transfer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2023-01-01'),
              lte: new Date('2023-02-28')
            }
          })
        })
      );
    });
  });
});