import type { PrismaClient } from '@prisma/client';
import { Method } from '../../domain/method';
import { PrismaMethodRepository } from './methodRepository';
import { NotFoundError, BusinessRuleError } from '../../../../shared/errors/AppError';
import { initializeTestDb, cleanupTestDb, closeTestDb } from '../../../../../tests/helpers/testDbHelper';
import { toDecimal } from '../../../../shared/utils/decimal';

describe('PrismaMethodRepository', () => {
  let prisma: PrismaClient;
  let repository: PrismaMethodRepository;
  let testMethod: Method;

  // テスト前の準備
  beforeAll(async () => {
    prisma = await initializeTestDb();
    repository = new PrismaMethodRepository(prisma);
  });

  // 各テストの前にテスト用のMethodを作成
  beforeEach(async () => {
    // テスト用のMethodを作成
    testMethod = Method.create({
      name: 'テスト用口座',
      initialBalance: 1000,
    });
    
    // データベースに保存
    testMethod = await repository.create(testMethod);
  });

  // 各テスト後にデータをクリーンアップ
  afterEach(async () => {
    await cleanupTestDb();
  });

  // テスト終了後にPrismaを切断
  afterAll(async () => {
    await closeTestDb();
  });

  describe('findById', () => {
    it('存在するIDのMethodを取得できる', async () => {
      // Act
      const found = await repository.findById(testMethod.id);

      // Assert
      expect(found).toBeDefined();
      expect(found?.id).toBe(testMethod.id);
      expect(found?.name).toBe(testMethod.name);
      expect(found?.initialBalance?.equals(toDecimal(1000))).toBe(true);
      expect(found?.archived).toBe(false);
    });

    it('存在しないIDの場合undefinedを返す', async () => {
      // Act
      const found = await repository.findById('non-existent-id');

      // Assert
      expect(found).toBeUndefined();
    });
  });

  describe('create', () => {
    it('新しいMethodを作成できる', async () => {
      // Arrange
      const newMethod = Method.create({
        name: '新しい口座',
        initialBalance: 5000,
      });

      // Act
      const created = await repository.create(newMethod);

      // Assert
      expect(created).toBeDefined();
      expect(created.id).toBe(newMethod.id);
      expect(created.name).toBe('新しい口座');
      expect(created.initialBalance?.equals(toDecimal(5000))).toBe(true);
      expect(created.archived).toBe(false);

      // データベースから直接確認
      const fromDb = await prisma.method.findUnique({
        where: { id: created.id }
      });
      expect(fromDb).toBeDefined();
      expect(fromDb?.name).toBe('新しい口座');
    });

    it('同名のMethodが存在する場合はエラーになる', async () => {
      // Arrange
      const duplicateMethod = Method.create({
        name: 'テスト用口座', // 既に存在する名前
        initialBalance: 2000,
      });

      // Act & Assert
      await expect(repository.create(duplicateMethod))
        .rejects
        .toThrow(BusinessRuleError);
    });
  });

  describe('update', () => {
    it('既存のMethodを更新できる', async () => {
      // Arrange
      const updatedMethod = testMethod.rename('更新後の名前');

      // Act
      const result = await repository.update(updatedMethod);

      // Assert
      expect(result.name).toBe('更新後の名前');
      
      // データベースから直接確認
      const fromDb = await prisma.method.findUnique({
        where: { id: testMethod.id }
      });
      expect(fromDb?.name).toBe('更新後の名前');
    });

    it('存在しないMethodを更新しようとするとNotFoundErrorが発生する', async () => {
      // Arrange
      const nonExistentMethod = new Method(
        'non-existent-id',
        '存在しない口座',
        toDecimal(1000)
      );

      // Act & Assert
      await expect(repository.update(nonExistentMethod))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('setArchiveStatus', () => {
    it('Methodをアーカイブにできる', async () => {
      // Act
      const archived = await repository.setArchiveStatus(testMethod.id, true);

      // Assert
      expect(archived.archived).toBe(true);
      expect(archived.id).toBe(testMethod.id);
      expect(archived.name).toBe(testMethod.name);
      
      // データベースから直接確認
      const fromDb = await prisma.method.findUnique({
        where: { id: testMethod.id }
      });
      expect(fromDb?.archived).toBe(true);
    });

    it('アーカイブされているMethodを復元できる', async () => {
      // Arrange - まずアーカイブする
      await repository.setArchiveStatus(testMethod.id, true);
      
      // Act - 復元する
      const restored = await repository.setArchiveStatus(testMethod.id, false);

      // Assert
      expect(restored.archived).toBe(false);
      
      // データベースから直接確認
      const fromDb = await prisma.method.findUnique({
        where: { id: testMethod.id }
      });
      expect(fromDb?.archived).toBe(false);
    });

    it('存在しないMethodをアーカイブしようとするとNotFoundErrorが発生する', async () => {
      // Act & Assert
      await expect(repository.setArchiveStatus('non-existent-id', true))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('使用されていないMethodを削除できる', async () => {
      // Act
      const result = await repository.delete(testMethod.id);

      // Assert
      expect(result).toBe(true);
      
      // データベースから直接確認
      const fromDb = await prisma.method.findUnique({
        where: { id: testMethod.id }
      });
      expect(fromDb).toBeNull();
    });

    it('存在しないMethodを削除しようとするとfalseを返す', async () => {
      // Act
      const result = await repository.delete('non-existent-id');

      // Assert
      expect(result).toBe(false);
    });

    it('使用中のMethodを削除しようとするとBusinessRuleErrorが発生する', async () => {
      // Arrange - Entryを作成して関連付ける
      await prisma.entry.create({
        data: {
          id: 'test-entry',
          type: 'expense',
          date: new Date(),
          amount: 500,
          methodId: testMethod.id,
          purpose: 'テスト',
        }
      });

      // Act & Assert
      await expect(repository.delete(testMethod.id))
        .rejects
        .toThrow(BusinessRuleError);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // 追加のMethodを作成
      await repository.create(Method.create({
        name: '追加の口座1',
        initialBalance: 2000,
      }));
      
      // アーカイブされたMethodを作成
      const archivedMethod = await repository.create(Method.create({
        name: 'アーカイブされた口座',
        initialBalance: 3000,
      }));
      await repository.setArchiveStatus(archivedMethod.id, true);
    });

    it('すべてのアクティブなMethodを取得できる', async () => {
      // Act
      const methods = await repository.findAll(false);

      // Assert
      expect(methods.length).toBe(2); // testMethodと追加の口座1
      expect(methods.every(m => !m.archived)).toBe(true);
    });

    it('アーカイブされたMethodを含むすべてのMethodを取得できる', async () => {
      // Act
      const methods = await repository.findAll(true);

      // Assert
      expect(methods.length).toBe(3); // testMethod、追加の口座1、アーカイブされた口座
      expect(methods.some(m => m.archived)).toBe(true);
    });
  });

  describe('findByOptions', () => {
    beforeEach(async () => {
      // 追加のMethodを作成
      await repository.create(Method.create({
        name: '追加の口座ABC',
        initialBalance: 2000,
      }));
      
      await repository.create(Method.create({
        name: '追加の口座XYZ',
        initialBalance: 3000,
      }));
      
      // アーカイブされたMethodを作成
      const archivedMethod = await repository.create(Method.create({
        name: 'アーカイブABC口座',
        initialBalance: 4000,
      }));
      await repository.setArchiveStatus(archivedMethod.id, true);
    });

    it('名前の部分一致で検索できる', async () => {
      // Act
      const methods = await repository.findByOptions({
        nameContains: 'ABC',
        includeArchived: true
      });

      // Assert
      expect(methods.length).toBe(2); // '追加の口座ABC'と'アーカイブABC口座'
      expect(methods.some(m => m.name.includes('ABC'))).toBe(true);
    });

    it('アーカイブされたMethodを除外して検索できる', async () => {
      // Act
      const methods = await repository.findByOptions({
        nameContains: 'ABC',
        includeArchived: false
      });

      // Assert
      expect(methods.length).toBe(1); // '追加の口座ABC'のみ
      expect(methods[0].name).toContain('ABC');
      expect(methods[0].archived).toBe(false);
    });

    it('ソート順を指定して検索できる', async () => {
      // Act
      const methods = await repository.findByOptions({
        includeArchived: true,
        sortBy: 'name',
        sortDirection: 'desc'
      });

      // Assert
      expect(methods.length).toBe(4);
      // 名前の降順になっていることを確認
      expect(methods[0].name > methods[1].name).toBe(true);
    });

    it('オフセットとリミットを指定して検索できる', async () => {
      // Act
      const methods = await repository.findByOptions({
        includeArchived: true,
        offset: 1,
        limit: 2
      });

      // Assert
      expect(methods.length).toBe(2); // 全4件のうち、オフセット1から2件取得
    });
  });
});