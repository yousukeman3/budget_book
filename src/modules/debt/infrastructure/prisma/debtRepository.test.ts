import type { PrismaClient } from '@prisma/client';
import { Debt } from '../../domain/debt';
import { PrismaDebtRepository } from './debtRepository';
import { NotFoundError, BusinessRuleError } from '../../../../shared/errors/AppError';
import { Decimal } from 'decimal.js';
import { toDecimal } from '../../../../shared/utils/decimal';
import { DebtType } from '../../../../shared/types/debt.types';
import { mockDeep, mockReset } from 'jest-mock-extended';

const mockPrisma = mockDeep<PrismaClient>();

describe('PrismaDebtRepository', () => {
  let repository: PrismaDebtRepository;
  let testDebt: Debt;
  
  // テスト前の準備
  beforeAll(async () => {
    mockReset(mockPrisma);
    repository = new PrismaDebtRepository(mockPrisma as unknown as PrismaClient);
  });

  // 各テスト前にテスト用のデータを作成
  beforeEach(async () => {
    // テスト用のMethod（支払い方法）を作成
    await mockPrisma.method.create({
      data: {
        id: 'test-method-id',
        name: 'テスト口座',
        initialBalance: 10000
      }
    });
    
    // テスト用のEntryを作成（借入用）
    await mockPrisma.entry.create({
      data: {
        id: 'test-entry-id',
        type: 'borrow',
        date: new Date('2023-01-15'),
        amount: 5000,
        methodId: 'test-method-id',
        purpose: '借入テスト'
      }
    });
    
    // テスト用のDebtオブジェクトを作成
    testDebt = Debt.create({
      id: 'test-debt-id',
      type: DebtType.BORROW,
      rootEntryId: 'test-entry-id',
      date: new Date('2023-01-15'),
      amount: 5000,
      counterpart: '友人A',
      memo: 'テスト借入'
    });
    
    // データベースに保存
    testDebt = await repository.create(testDebt);
  });

  describe('create', () => {
    it('新しいDebtを作成できる', async () => {
      // 別のEntryとDebtを準備
      await mockPrisma.entry.create({
        data: {
          id: 'new-entry-id',
          type: 'lend',
          date: new Date('2023-02-10'),
          amount: 3000,
          methodId: 'test-method-id',
          purpose: '新しい貸付'
        }
      });

      const newDebt = Debt.create({
        type: DebtType.LEND,
        rootEntryId: 'new-entry-id',
        date: new Date('2023-02-10'),
        amount: 3000,
        counterpart: '友人B',
        memo: '新しいテスト貸付'
      });

      // Act
      const created = await repository.create(newDebt);

      // Assert
      expect(created).toBeDefined();
      expect(created.id).toBe(newDebt.id);
      expect(created.type).toBe(DebtType.LEND);
      expect(created.rootEntryId).toBe('new-entry-id');
      expect(created.counterpart).toBe('友人B');
      expect(created.amount.equals(toDecimal(3000))).toBe(true);
      expect(created.memo).toBe('新しいテスト貸付');
      
      // データベースから直接確認
      const fromDb = await mockPrisma.debt.findUnique({
        where: { id: created.id }
      });
      expect(fromDb).toBeDefined();
      expect(fromDb?.counterpart).toBe('友人B');
      expect(fromDb?.rootEntryId).toBe('new-entry-id');
    });
    
    it('同一EntryIDが既に存在する場合はエラーになる', async () => {
      // 既存のrootEntryIdを使った新しい貸借を作成
      const duplicateDebt = Debt.create({
        type: DebtType.BORROW,
        rootEntryId: 'test-entry-id', // 既に使われているID
        date: new Date('2023-03-01'),
        amount: 2000,
        counterpart: '友人C'
      });

      // Act & Assert
      await expect(repository.create(duplicateDebt))
        .rejects
        .toThrow(BusinessRuleError);
    });
  });
  
  describe('findById', () => {
    it('存在するIDのDebtを取得できる', async () => {
      // Act
      const found = await repository.findById(testDebt.id);

      // Assert
      expect(found).toBeDefined();
      expect(found?.id).toBe(testDebt.id);
      expect(found?.type).toBe(testDebt.type);
      expect(found?.rootEntryId).toBe(testDebt.rootEntryId);
      expect(found?.counterpart).toBe(testDebt.counterpart);
      expect(found?.amount.equals(testDebt.amount)).toBe(true);
      expect(found?.memo).toBe(testDebt.memo);
    });

    it('存在しないIDの場合undefinedを返す', async () => {
      // Act
      const found = await repository.findById('non-existent-id');

      // Assert
      expect(found).toBeUndefined();
    });
  });
  
  describe('findByRootEntryId', () => {
    it('対応するrootEntryIdのDebtを取得できる', async () => {
      // Act
      const found = await repository.findByRootEntryId(testDebt.rootEntryId);

      // Assert
      expect(found).toBeDefined();
      expect(found?.id).toBe(testDebt.id);
      expect(found?.rootEntryId).toBe(testDebt.rootEntryId);
    });

    it('存在しないrootEntryIdの場合undefinedを返す', async () => {
      // Act
      const found = await repository.findByRootEntryId('non-existent-entry-id');

      // Assert
      expect(found).toBeUndefined();
    });
  });
  
  describe('update', () => {
    it('既存のDebtを更新できる', async () => {
      // Arrange
      const updatedDebt = testDebt.updateMemo('更新されたメモ').updateCounterpart('更新された友人');

      // Act
      const result = await repository.update(updatedDebt);

      // Assert
      expect(result.memo).toBe('更新されたメモ');
      expect(result.counterpart).toBe('更新された友人');
      
      // データベースから直接確認
      const fromDb = await mockPrisma.debt.findUnique({
        where: { id: testDebt.id }
      });
      expect(fromDb?.memo).toBe('更新されたメモ');
      expect(fromDb?.counterpart).toBe('更新された友人');
    });

    it('返済完了状態に更新できる', async () => {
      // Arrange
      const repaidDate = new Date('2023-02-20');
      const repaidDebt = testDebt.markAsRepaid(repaidDate);

      // Act
      const result = await repository.update(repaidDebt);

      // Assert
      expect(result.repaidAt).toEqual(repaidDate);
      
      // データベースから直接確認
      const fromDb = await mockPrisma.debt.findUnique({
        where: { id: testDebt.id }
      });
      expect(fromDb?.repaidAt).toEqual(repaidDate);
    });

    it('存在しないDebtを更新しようとするとNotFoundErrorが発生する', async () => {
      // Arrange
      const nonExistentDebt = new Debt(
        'non-existent-id',
        DebtType.BORROW,
        'entry-id',
        new Date(),
        toDecimal(1000),
        '友人X'
      );

      // Act & Assert
      await expect(repository.update(nonExistentDebt))
        .rejects
        .toThrow(NotFoundError);
    });
  });
  
  describe('delete', () => {
    it('存在するDebtを削除できる', async () => {
      // Act
      const result = await repository.delete(testDebt.id);

      // Assert
      expect(result).toBe(true);
      
      // データベースから直接確認
      const fromDb = await mockPrisma.debt.findUnique({
        where: { id: testDebt.id }
      });
      expect(fromDb).toBeNull();
    });

    it('存在しないDebtを削除しようとするとfalseを返す', async () => {
      // Act
      const result = await repository.delete('non-existent-id');

      // Assert
      expect(result).toBe(false);
    });

    it('関連するEntryが存在する場合は削除できない', async () => {
      // Arrange
      // 返済エントリーを作成して関連付ける
      await mockPrisma.entry.create({
        data: {
          id: 'repayment-entry-id',
          type: 'repayment',
          date: new Date(),
          amount: 2000,
          methodId: 'test-method-id',
          debtId: testDebt.id, // 削除しようとするDebtに関連付け
          purpose: '返済'
        }
      });

      // Act & Assert
      await expect(repository.delete(testDebt.id))
        .rejects
        .toThrow(BusinessRuleError);
    });
  });
  
  describe('findByOptions', () => {
    beforeEach(() => {
      // 複数のデータを返すモックを設定
      const mockDebts = [
        {
          id: 'debt-1',
          type: DebtType.BORROW,
          date: new Date('2023-01-01'),
          amount: new Decimal(10000),
          counterpart: '友人A',
          repaidAt: null,
          rootEntryId: 'entry-1',
          memo: '旅行費用'
        },
        {
          id: 'debt-2',
          type: DebtType.LEND,
          date: new Date('2023-02-01'),
          amount: new Decimal(5000),
          counterpart: '友人B', 
          repaidAt: new Date('2023-03-01'),
          rootEntryId: 'entry-2',
          memo: '立替'
        }
      ];

      mockPrisma.debt.findMany.mockResolvedValue(mockDebts);
    });

    it('すべてのDebtを取得できる', async () => {
      // Act
      const debts = await repository.findByOptions({});

      // Assert
      expect(debts).toHaveLength(2);
      expect(debts[0].id).toBe('debt-1');
      expect(debts[1].id).toBe('debt-2');
    });

    it('typeでフィルタリングできる', async () => {
      // Act
      const debts = await repository.findByOptions({
        type: DebtType.BORROW
      });
      expect(debts).toHaveLength(1);
      expect(debts[0].id).toBe('debt-1');
      expect(debts[0].type).toBe(DebtType.BORROW);

      // 引数を検証
      expect(mockPrisma.debt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: DebtType.BORROW
          })
        })
      );
    });

    it('返済状況でフィルタリングできる', async () => {
      // Act - 返済済みのみ取得
      const repaidDebts = await repository.findByOptions({
        isRepaid: true
      });

      // Assert
      expect(repaidDebts).toHaveLength(1);
      expect(repaidDebts[0].id).toBe('debt-2');
      expect(repaidDebts[0].repaidAt).not.toBeNull();

      // Act - 未返済のみ取得
      const unrepaidDebts = await repository.findByOptions({
        isRepaid: false
      });

      // Assert
      expect(unrepaidDebts).toHaveLength(1);
      expect(unrepaidDebts[0].id).toBe('debt-1');
      expect(unrepaidDebts[0].repaidAt).toBeNull();
    });
    
    it('相手名で部分一致検索できる', async () => {
      // Act
      const debts = await repository.findByOptions({
        counterpart: '友人'
      });

      // Assert
      expect(debts).toHaveLength(1);
      expect(debts[0].id).toBe('debt-1');
      expect(debts[0].counterpart).toContain('友人');
    });
    
    it('日付範囲でフィルタリングできる', async () => {
      // Act
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-03-31');
      const debts = await repository.findByOptions({
        startDate: startDate,
        endDate: endDate
      });

      // Assert
      expect(debts).toHaveLength(2);
      expect(debts[0].id).toBe('debt-1');
      expect(debts[1].id).toBe('debt-2');
      expect(debts[0].date.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
      expect(debts[1].date.getTime()).toBeLessThanOrEqual(endDate.getTime());
    });
    
    it('ソートできる', async () => {
      // Act - 日付の降順
      await repository.findByOptions({
        sortBy: 'date',
        sortDirection: 'desc'
      });

      // Assert
      expect(mockPrisma.debt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            date: 'desc'
          }
        })
      );
    });
  });
  
  describe('markAsRepaid', () => {
    it('Debtを返済済みとしてマークできる', async () => {
      // Arrange
      const repaidDate = new Date('2023-02-20');
      
      // Act
      const repaidDebt = await repository.markAsRepaid(testDebt.id, repaidDate);
      
      // Assert
      expect(repaidDebt.repaidAt).toEqual(repaidDate);
      expect(repaidDebt.isRepaid()).toBe(true);
      
      // データベースから直接確認
      const fromDb = await mockPrisma.debt.findUnique({
        where: { id: testDebt.id }
      });
      expect(fromDb?.repaidAt).toEqual(repaidDate);
    });
    
    it('日付を指定しない場合は現在の日付が使用される', async () => {
      // Act
      const beforeDate = new Date();
      const repaidDebt = await repository.markAsRepaid(testDebt.id, );
      const afterDate = new Date();
      
      // Assert
      expect(repaidDebt.repaidAt).toBeDefined();
      // 現在時刻の前後であることを確認
      expect(repaidDebt.repaidAt!.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());  // eslint-disable-line @typescript-eslint/no-non-null-assertion
      expect(repaidDebt.repaidAt!.getTime()).toBeLessThanOrEqual(afterDate.getTime());      // eslint-disable-line @typescript-eslint/no-non-null-assertion
    });
    
    it('存在しないDebtIDの場合はNotFoundErrorをスローする', async () => {
      // Act & Assert
      await expect(repository.markAsRepaid('non-existent-id', new Date()))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('既に返済済みのDebtを再度マークするとBusinessRuleErrorをスローする', async () => {
      // Arrange - まず返済済みにする
      await repository.markAsRepaid(testDebt.id, new Date());
      
      // Act & Assert
      await expect(repository.markAsRepaid(testDebt.id, new Date()))
        .rejects
        .toThrow(BusinessRuleError);
    });
  });
});