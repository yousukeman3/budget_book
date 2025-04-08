// filepath: /app/src/modules/entry/domain/__tests__/entry.test.ts
import { Decimal } from '@prisma/client/runtime/library';
import { Entry, EntryType, Debt, DebtType } from '../entry';
import { BusinessRuleError } from '../../../../shared/errors/AppError';
import { BusinessRuleErrorCode } from '../../../../shared/errors/ErrorCodes';

// テストユーティリティ
const createValidEntryParams = (override?: Partial<Omit<Entry, 'isIncome' | 'isExpense' | 'isTransfer' | 'isInitialBalance' | 'isDebtRelated' | 'getBalanceImpact' | 'validateAmount' | 'validateTypeConsistency'>>) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  type: EntryType.EXPENSE,
  date: new Date('2025-04-01'),
  amount: new Decimal(1000),
  methodId: 'method-123',
  categoryId: 'category-456',
  purpose: '買い物',
  privatePurpose: undefined,
  note: undefined,
  evidenceNote: undefined,
  debtId: undefined,
  createdAt: new Date('2025-04-01T10:00:00Z'),
  ...override
});

const createValidDebtParams = (override?: Partial<Omit<Debt, 'isRepaid' | 'isBorrow' | 'isLend' | 'validateAmount' | 'validateDates'>>) => ({
  id: '123e4567-e89b-12d3-a456-426614174111',
  type: DebtType.BORROW,
  rootEntryId: '123e4567-e89b-12d3-a456-426614174000',
  date: new Date('2025-04-01'),
  amount: new Decimal(5000),
  counterpart: '山田太郎',
  repaidAt: undefined,
  memo: '友人からの借入',
  ...override
});

describe('Entry Domain Entity', () => {
  describe('コンストラクタバリデーション', () => {
    test('有効なパラメータでEntryが正しく作成される', () => {
      const params = createValidEntryParams();
      const entry = new Entry(
        params.id,
        params.type,
        params.date,
        params.amount,
        params.methodId,
        params.categoryId,
        params.purpose
      );

      expect(entry).toBeInstanceOf(Entry);
      expect(entry.id).toBe(params.id);
      expect(entry.type).toBe(EntryType.EXPENSE);
      expect(entry.amount).toEqual(new Decimal(1000));
    });

    test('金額が0以下の場合はエラーをスロー', () => {
      const params = createValidEntryParams({ amount: new Decimal(0) });
      
      expect(() => {
        new Entry(
          params.id,
          params.type,
          params.date,
          params.amount,
          params.methodId,
          params.categoryId,
          params.purpose
        );
      }).toThrow(BusinessRuleError);
    });

    test('金額がマイナスの場合はエラーをスロー', () => {
      const params = createValidEntryParams({ amount: new Decimal(-100) });
      
      expect(() => {
        new Entry(
          params.id,
          params.type,
          params.date,
          params.amount,
          params.methodId,
          params.categoryId,
          params.purpose
        );
      }).toThrow(BusinessRuleError);
    });

    test('借入タイプでdebtIdがない場合はエラーをスロー', () => {
      const params = createValidEntryParams({ 
        type: EntryType.BORROW,
        debtId: undefined 
      });
      
      expect(() => {
        new Entry(
          params.id,
          params.type,
          params.date,
          params.amount,
          params.methodId,
          params.categoryId,
          params.purpose,
          params.privatePurpose,
          params.note,
          params.evidenceNote,
          params.debtId
        );
      }).toThrow(BusinessRuleError);
    });

    test('貸付タイプでdebtIdがない場合はエラーをスロー', () => {
      const params = createValidEntryParams({ 
        type: EntryType.LEND,
        debtId: undefined 
      });
      
      expect(() => {
        new Entry(
          params.id,
          params.type,
          params.date,
          params.amount,
          params.methodId,
          params.categoryId,
          params.purpose,
          params.privatePurpose,
          params.note,
          params.evidenceNote,
          params.debtId
        );
      }).toThrow(BusinessRuleError);
    });

    test('返済タイプでdebtIdがない場合はエラーをスロー', () => {
      const params = createValidEntryParams({ 
        type: EntryType.REPAYMENT,
        debtId: undefined 
      });
      
      expect(() => {
        new Entry(
          params.id,
          params.type,
          params.date,
          params.amount,
          params.methodId,
          params.categoryId,
          params.purpose,
          params.privatePurpose,
          params.note,
          params.evidenceNote,
          params.debtId
        );
      }).toThrow(BusinessRuleError);
    });
  });

  describe('残高計算ロジック', () => {
    test('収入系エントリはプラスの残高影響を返す', () => {
      // 収入のEntryを作成
      const incomeEntry = new Entry(
        '1',
        EntryType.INCOME,
        new Date(),
        new Decimal(1000),
        'method-1'
      );

      expect(incomeEntry.getBalanceImpact().toNumber()).toBe(1000);
    });

    test('支出系エントリはマイナスの残高影響を返す', () => {
      // 支出のEntryを作成
      const expenseEntry = new Entry(
        '2',
        EntryType.EXPENSE,
        new Date(),
        new Decimal(1000),
        'method-1'
      );

      expect(expenseEntry.getBalanceImpact().toNumber()).toBe(-1000);
    });

    test('借入エントリはプラスの残高影響を返す', () => {
      // 借入のEntryを作成
      const borrowEntry = new Entry(
        '3',
        EntryType.BORROW,
        new Date(),
        new Decimal(5000),
        'method-1',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'debt-1'
      );

      expect(borrowEntry.getBalanceImpact().toNumber()).toBe(5000);
    });

    test('貸付エントリはマイナスの残高影響を返す', () => {
      // 貸付のEntryを作成
      const lendEntry = new Entry(
        '4',
        EntryType.LEND,
        new Date(),
        new Decimal(3000),
        'method-1',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'debt-2'
      );

      expect(lendEntry.getBalanceImpact().toNumber()).toBe(-3000);
    });

    test('振替エントリはデフォルトで出金側（マイナス）の残高影響を返す', () => {
      // 振替のEntryを作成
      const transferEntry = new Entry(
        '5',
        EntryType.TRANSFER,
        new Date(),
        new Decimal(2000),
        'method-from'  // fromMethodIdを示す
      );

      expect(transferEntry.getBalanceImpact().toNumber()).toBe(-2000);
    });

    test('初期残高エントリはプラスの残高影響を返す', () => {
      // 初期残高のEntryを作成
      const initialBalanceEntry = new Entry(
        '6',
        EntryType.INITIAL_BALANCE,
        new Date(),
        new Decimal(10000),
        'method-1'
      );

      expect(initialBalanceEntry.getBalanceImpact().toNumber()).toBe(10000);
    });
  });

  describe('判定メソッド', () => {
    test('isIncome(): 収入系エントリを正しく判定する', () => {
      const incomeEntry = new Entry(
        '1',
        EntryType.INCOME,
        new Date(),
        new Decimal(1000),
        'method-1'
      );

      const borrowEntry = new Entry(
        '2',
        EntryType.BORROW,
        new Date(),
        new Decimal(1000),
        'method-1',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'debt-1'
      );

      const repayReceiveEntry = new Entry(
        '3',
        EntryType.REPAYMENT_RECEIVE,
        new Date(),
        new Decimal(1000),
        'method-1',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'debt-2'
      );

      const expenseEntry = new Entry(
        '4',
        EntryType.EXPENSE,
        new Date(),
        new Decimal(1000),
        'method-1'
      );

      expect(incomeEntry.isIncome()).toBe(true);
      expect(borrowEntry.isIncome()).toBe(true);
      expect(repayReceiveEntry.isIncome()).toBe(true);
      expect(expenseEntry.isIncome()).toBe(false);
    });

    test('isExpense(): 支出系エントリを正しく判定する', () => {
      const expenseEntry = new Entry(
        '1',
        EntryType.EXPENSE,
        new Date(),
        new Decimal(1000),
        'method-1'
      );

      const lendEntry = new Entry(
        '2',
        EntryType.LEND,
        new Date(),
        new Decimal(1000),
        'method-1',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'debt-1'
      );

      const repaymentEntry = new Entry(
        '3',
        EntryType.REPAYMENT,
        new Date(),
        new Decimal(1000),
        'method-1',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'debt-2'
      );

      const incomeEntry = new Entry(
        '4',
        EntryType.INCOME,
        new Date(),
        new Decimal(1000),
        'method-1'
      );

      expect(expenseEntry.isExpense()).toBe(true);
      expect(lendEntry.isExpense()).toBe(true);
      expect(repaymentEntry.isExpense()).toBe(true);
      expect(incomeEntry.isExpense()).toBe(false);
    });

    test('isTransfer(): 振替エントリを正しく判定する', () => {
      const transferEntry = new Entry(
        '1',
        EntryType.TRANSFER,
        new Date(),
        new Decimal(1000),
        'method-1'
      );

      const expenseEntry = new Entry(
        '2',
        EntryType.EXPENSE,
        new Date(),
        new Decimal(1000),
        'method-1'
      );

      expect(transferEntry.isTransfer()).toBe(true);
      expect(expenseEntry.isTransfer()).toBe(false);
    });

    test('isInitialBalance(): 初期残高エントリを正しく判定する', () => {
      const initialBalanceEntry = new Entry(
        '1',
        EntryType.INITIAL_BALANCE,
        new Date(),
        new Decimal(1000),
        'method-1'
      );

      const incomeEntry = new Entry(
        '2',
        EntryType.INCOME,
        new Date(),
        new Decimal(1000),
        'method-1'
      );

      expect(initialBalanceEntry.isInitialBalance()).toBe(true);
      expect(incomeEntry.isInitialBalance()).toBe(false);
    });

    test('isDebtRelated(): 貸借関連エントリを正しく判定する', () => {
      const borrowEntry = new Entry(
        '1',
        EntryType.BORROW,
        new Date(),
        new Decimal(1000),
        'method-1',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'debt-1'
      );

      const lendEntry = new Entry(
        '2',
        EntryType.LEND,
        new Date(),
        new Decimal(1000),
        'method-1',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'debt-2'
      );

      const repaymentEntry = new Entry(
        '3',
        EntryType.REPAYMENT,
        new Date(),
        new Decimal(1000),
        'method-1',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'debt-3'
      );

      const incomeEntry = new Entry(
        '4',
        EntryType.INCOME,
        new Date(),
        new Decimal(1000),
        'method-1'
      );

      expect(borrowEntry.isDebtRelated()).toBe(true);
      expect(lendEntry.isDebtRelated()).toBe(true);
      expect(repaymentEntry.isDebtRelated()).toBe(true);
      expect(incomeEntry.isDebtRelated()).toBe(false);
    });
  });
});

describe('Debt Domain Entity', () => {
  describe('コンストラクタバリデーション', () => {
    test('有効なパラメータでDebtが正しく作成される', () => {
      const params = createValidDebtParams();
      const debt = new Debt(
        params.id,
        params.type,
        params.rootEntryId,
        params.date,
        params.amount,
        params.counterpart,
        params.repaidAt,
        params.memo
      );

      expect(debt).toBeInstanceOf(Debt);
      expect(debt.id).toBe(params.id);
      expect(debt.type).toBe(DebtType.BORROW);
      expect(debt.amount).toEqual(new Decimal(5000));
    });

    test('金額が0以下の場合はエラーをスロー', () => {
      const params = createValidDebtParams({ amount: new Decimal(0) });
      
      expect(() => {
        new Debt(
          params.id,
          params.type,
          params.rootEntryId,
          params.date,
          params.amount,
          params.counterpart,
          params.repaidAt,
          params.memo
        );
      }).toThrow(BusinessRuleError);
    });

    test('返済日が発生日より前の場合はエラーをスロー', () => {
      const borrowDate = new Date('2025-04-15');
      const repaidAt = new Date('2025-04-10'); // 発生日より前
      
      const params = createValidDebtParams({
        date: borrowDate,
        repaidAt: repaidAt
      });
      
      expect(() => {
        new Debt(
          params.id,
          params.type,
          params.rootEntryId,
          params.date,
          params.amount,
          params.counterpart,
          params.repaidAt,
          params.memo
        );
      }).toThrow(BusinessRuleError);
    });
  });

  describe('Debt状態検証メソッド', () => {
    test('isRepaid(): 返済完了状態を正しく判定', () => {
      // 未返済のDebt
      const unpaidDebt = new Debt(
        '1',
        DebtType.BORROW,
        'entry-1',
        new Date('2025-04-01'),
        new Decimal(5000),
        '山田太郎'
      );
      
      // 返済済みのDebt
      const paidDebt = new Debt(
        '2',
        DebtType.BORROW,
        'entry-2',
        new Date('2025-04-01'),
        new Decimal(5000),
        '山田太郎',
        new Date('2025-05-01') // 返済日あり
      );
      
      expect(unpaidDebt.isRepaid()).toBe(false);
      expect(paidDebt.isRepaid()).toBe(true);
    });

    test('isBorrow() / isLend(): 借入・貸付タイプを正しく判定', () => {
      // 借入のDebt
      const borrowDebt = new Debt(
        '1',
        DebtType.BORROW,
        'entry-1',
        new Date('2025-04-01'),
        new Decimal(5000),
        '山田太郎'
      );
      
      // 貸付のDebt
      const lendDebt = new Debt(
        '2',
        DebtType.LEND,
        'entry-2',
        new Date('2025-04-01'),
        new Decimal(3000),
        '鈴木花子'
      );
      
      expect(borrowDebt.isBorrow()).toBe(true);
      expect(borrowDebt.isLend()).toBe(false);
      
      expect(lendDebt.isBorrow()).toBe(false);
      expect(lendDebt.isLend()).toBe(true);
    });
  });
});