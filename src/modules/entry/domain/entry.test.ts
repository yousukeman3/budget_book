import { Entry, validateEntryBusinessRules, isCategoryRequired, isDebtRelatedEntry, isTransferEntry, isInitialBalanceEntry } from './entry';
import { EntryType } from '../../../shared/types/entry.types';
import { toDecimal } from '../../../shared/utils/decimal';
import { BusinessRuleError } from '../../../shared/errors/AppError';
import { BusinessRuleErrorCode } from '../../../shared/errors/ErrorCodes'
import type { Validator } from '../../../shared/validation/Validator';
import { ZodValidator } from '../../../shared/validation/ZodValidator';
import { z } from 'zod';

describe('Entry Domain Entity', () => {
  // コンストラクタのテスト
  describe('constructor', () => {
    it('有効な値でインスタンスを作成できること', () => {
      const entry = new Entry(
        'test-id',
        EntryType.EXPENSE,
        new Date('2023-01-15'),
        toDecimal(5000),
        'method-id',
        'category-id',
        '食費',
        null,
        'スーパーでの買い物',
        null,
        null,
        new Date('2023-01-15T12:00:00Z')
      );
      
      expect(entry.id).toBe('test-id');
      expect(entry.type).toBe(EntryType.EXPENSE);
      expect(entry.date).toEqual(new Date('2023-01-15'));
      expect(entry.amount.equals(toDecimal(5000))).toBe(true);
      expect(entry.methodId).toBe('method-id');
      expect(entry.categoryId).toBe('category-id');
      expect(entry.purpose).toBe('食費');
      expect(entry.privatePurpose).toBeNull();
      expect(entry.note).toBe('スーパーでの買い物');
      expect(entry.evidenceNote).toBeNull();
      expect(entry.debtId).toBeNull();
      expect(entry.createdAt).toEqual(new Date('2023-01-15T12:00:00Z'));
    });

    it('金額が0以下の場合はBusinessRuleErrorをスローすること', () => {
      expect(() => new Entry(
        'test-id',
        EntryType.EXPENSE,
        new Date('2023-01-15'),
        toDecimal(0), // 無効な金額
        'method-id'
      )).toThrow(BusinessRuleError);
      
      try {
        new Entry(
          'test-id',
          EntryType.EXPENSE,
          new Date('2023-01-15'),
          toDecimal(-100), // 負の金額
          'method-id'
        );
        fail('例外がスローされるべきです');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect((error as BusinessRuleError).code).toBe(BusinessRuleErrorCode.INVALID_VALUE_RANGE);
      }
    });
    
    it('借入/貸付/返済系の場合はdebtIdが必須であること', () => {
      // 借入の場合
      expect(() => new Entry(
        'test-id',
        EntryType.BORROW,
        new Date('2023-01-15'),
        toDecimal(5000),
        'method-id',
        null, // categoryId
        null, // purpose
        null, // privatePurpose
        null, // note
        null, // evidenceNote
        null  // debtId が null (無効)
      )).toThrow(BusinessRuleError);
      
      try {
        new Entry(
          'test-id',
          EntryType.LEND,
          new Date('2023-01-15'),
          toDecimal(5000),
          'method-id',
          null, // categoryId
          null, // purpose
          null, // privatePurpose
          null, // note
          null, // evidenceNote
          null  // debtId が null (無効)
        );
        fail('例外がスローされるべきです');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect((error as BusinessRuleError).code).toBe(BusinessRuleErrorCode.INVALID_INPUT);
      }
      
      // 正常系：debtIdがある場合は例外を投げない
      const entry = new Entry(
        'test-id',
        EntryType.BORROW,
        new Date('2023-01-15'),
        toDecimal(5000),
        'method-id',
        null,
        null,
        null,
        null,
        null,
        'debt-id' // debtIdあり
      );
      expect(entry.debtId).toBe('debt-id');
    });

    it('バリデーターが渡された場合はバリデーションを実行すること', () => {
      // モックバリデーター作成
      const mockValidator = {
        validate: jest.fn().mockReturnValue({})
      };

      new Entry(
        'test-id',
        EntryType.EXPENSE,
        new Date('2023-01-15'),
        toDecimal(5000),
        'method-id',
        'category-id',
        '食費',
        null,
        null,
        null,
        null,
        new Date(),
        mockValidator as Validator<Entry>
      );
      
      expect(mockValidator.validate).toHaveBeenCalled();
    });
  });
  
  // createファクトリーメソッドのテスト
  describe('create', () => {
    it('有効なデータからインスタンスを作成できること', () => {
      const entry = Entry.create({
        type: EntryType.EXPENSE,
        date: new Date('2023-01-15'),
        amount: 5000,
        methodId: 'method-id',
        categoryId: 'category-id',
        purpose: '食費'
      });
      
      expect(entry.id).toBeDefined();
      expect(entry.type).toBe(EntryType.EXPENSE);
      expect(entry.date).toEqual(new Date('2023-01-15'));
      expect(entry.amount.equals(toDecimal(5000))).toBe(true);
      expect(entry.methodId).toBe('method-id');
      expect(entry.categoryId).toBe('category-id');
      expect(entry.purpose).toBe('食費');
      expect(entry.createdAt).toBeDefined();
    });

    it('文字列の金額からインスタンスを作成できること', () => {
      const entry = Entry.create({
        type: EntryType.INCOME,
        date: new Date('2023-01-15'),
        amount: '3000',
        methodId: 'method-id'
      });
      
      expect(entry.amount.equals(toDecimal(3000))).toBe(true);
    });

    it('Decimal型の金額からインスタンスを作成できること', () => {
      const entry = Entry.create({
        type: EntryType.INCOME,
        date: new Date('2023-01-15'),
        amount: toDecimal(3000),
        methodId: 'method-id'
      });
      
      expect(entry.amount.equals(toDecimal(3000))).toBe(true);
    });
    
    it('IDを明示的に指定して作成できること', () => {
      const entryId = 'custom-entry-id';
      const entry = Entry.create({
        id: entryId,
        type: EntryType.EXPENSE,
        date: new Date('2023-01-15'),
        amount: 5000,
        methodId: 'method-id'
      });
      
      expect(entry.id).toBe(entryId);
    });
    
    it('createdAtを明示的に指定して作成できること', () => {
      const createdAt = new Date('2023-01-10T09:00:00Z');
      const entry = Entry.create({
        type: EntryType.EXPENSE,
        date: new Date('2023-01-15'),
        amount: 5000,
        methodId: 'method-id',
        createdAt
      });
      
      expect(entry.createdAt).toEqual(createdAt);
    });
    
    it('バリデーターが渡された場合はバリデーションを実行すること', () => {
      const testSchema = z.object({
        type: z.enum([
          'income',
          'expense',
          'borrow',
          'lend',
          'repayment',
          'repayment_receive',
          'transfer',
          'initial_balance'
        ]),
        methodId: z.string().min(1),
        amount: z.number().positive(),
      });
      const validator = new ZodValidator(testSchema);
      
      const entry = Entry.create({
        type: EntryType.EXPENSE,
        date: new Date('2023-01-15'),
        amount: 5000,
        methodId: 'method-id'
      }, validator);
      
      expect(entry).toBeDefined();
    });
    
    it('借入/貸付/返済系の場合はdebtIdが必要であること', () => {
      expect(() => Entry.create({
        type: EntryType.REPAYMENT,
        date: new Date('2023-01-15'),
        amount: 5000,
        methodId: 'method-id'
        // debtId が未指定
      })).toThrow(BusinessRuleError);
      
      // 正常系：debtIdあり
      const entry = Entry.create({
        type: EntryType.REPAYMENT,
        date: new Date('2023-01-15'),
        amount: 5000,
        methodId: 'method-id',
        debtId: 'debt-id'
      });
      
      expect(entry.debtId).toBe('debt-id');
    });
  });

  // isIncomeメソッドのテスト
  describe('isIncome', () => {
    it('収入タイプの場合はtrueを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.INCOME,
        new Date(),
        toDecimal(5000),
        'method-id'
      );
      expect(entry.isIncome()).toBe(true);
    });
    
    it('借入タイプの場合はtrueを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.BORROW,
        new Date(),
        toDecimal(5000),
        'method-id',
        null,
        null,
        null,
        null,
        null,
        'debt-id' // 借入にはdebtIdが必要
      );
      expect(entry.isIncome()).toBe(true);
    });
    
    it('返済受取タイプの場合はtrueを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.REPAYMENT_RECEIVE,
        new Date(),
        toDecimal(5000),
        'method-id',
        null,
        null,
        null,
        null,
        null,
        'debt-id' // 返済受取にはdebtIdが必要
      );
      expect(entry.isIncome()).toBe(true);
    });
    
    it('支出タイプの場合はfalseを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.EXPENSE,
        new Date(),
        toDecimal(5000),
        'method-id'
      );
      expect(entry.isIncome()).toBe(false);
    });
  });
  
  // isExpenseメソッドのテスト
  describe('isExpense', () => {
    it('支出タイプの場合はtrueを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.EXPENSE,
        new Date(),
        toDecimal(5000),
        'method-id'
      );
      expect(entry.isExpense()).toBe(true);
    });
    
    it('貸付タイプの場合はtrueを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.LEND,
        new Date(),
        toDecimal(5000),
        'method-id',
        null,
        null,
        null,
        null,
        null,
        'debt-id' // 貸付にはdebtIdが必要
      );
      expect(entry.isExpense()).toBe(true);
    });
    
    it('返済タイプの場合はtrueを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.REPAYMENT,
        new Date(),
        toDecimal(5000),
        'method-id',
        null,
        null,
        null,
        null,
        null,
        'debt-id' // 返済にはdebtIdが必要
      );
      expect(entry.isExpense()).toBe(true);
    });
    
    it('収入タイプの場合はfalseを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.INCOME,
        new Date(),
        toDecimal(5000),
        'method-id'
      );
      expect(entry.isExpense()).toBe(false);
    });
  });
  
  // isTransferメソッドのテスト
  describe('isTransfer', () => {
    it('振替タイプの場合はtrueを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.TRANSFER,
        new Date(),
        toDecimal(5000),
        'method-id'
      );
      expect(entry.isTransfer()).toBe(true);
    });
    
    it('振替以外のタイプの場合はfalseを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.EXPENSE,
        new Date(),
        toDecimal(5000),
        'method-id'
      );
      expect(entry.isTransfer()).toBe(false);
    });
  });
  
  // isInitialBalanceメソッドのテスト
  describe('isInitialBalance', () => {
    it('初期残高タイプの場合はtrueを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.INITIAL_BALANCE,
        new Date(),
        toDecimal(5000),
        'method-id'
      );
      expect(entry.isInitialBalance()).toBe(true);
    });
    
    it('初期残高以外のタイプの場合はfalseを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.EXPENSE,
        new Date(),
        toDecimal(5000),
        'method-id'
      );
      expect(entry.isInitialBalance()).toBe(false);
    });
  });

  // isDebtRelatedメソッドのテスト
  describe('isDebtRelated', () => {
    it('借入タイプの場合はtrueを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.BORROW,
        new Date(),
        toDecimal(5000),
        'method-id',
        null,
        null,
        null,
        null,
        null,
        'debt-id'
      );
      expect(entry.isDebtRelated()).toBe(true);
    });
    
    it('貸付タイプの場合はtrueを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.LEND,
        new Date(),
        toDecimal(5000),
        'method-id',
        null,
        null,
        null,
        null,
        null,
        'debt-id'
      );
      expect(entry.isDebtRelated()).toBe(true);
    });
    
    it('返済タイプの場合はtrueを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.REPAYMENT,
        new Date(),
        toDecimal(5000),
        'method-id',
        null,
        null,
        null,
        null,
        null,
        'debt-id'
      );
      expect(entry.isDebtRelated()).toBe(true);
    });
    
    it('返済受取タイプの場合はtrueを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.REPAYMENT_RECEIVE,
        new Date(),
        toDecimal(5000),
        'method-id',
        null,
        null,
        null,
        null,
        null,
        'debt-id'
      );
      expect(entry.isDebtRelated()).toBe(true);
    });
    
    it('貸借関連以外のタイプの場合はfalseを返すこと', () => {
      const entry = new Entry(
        'test-id',
        EntryType.EXPENSE,
        new Date(),
        toDecimal(5000),
        'method-id'
      );
      expect(entry.isDebtRelated()).toBe(false);
    });
  });
  
  // getBalanceImpactメソッドのテスト
  describe('getBalanceImpact', () => {
    it('収入系の場合はプラスの影響額を返すこと', () => {
      const amount = toDecimal(5000);
      const entry = new Entry(
        'test-id',
        EntryType.INCOME,
        new Date(),
        amount,
        'method-id'
      );
      
      const impact = entry.getBalanceImpact();
      expect(impact.equals(amount)).toBe(true);
    });
    
    it('支出系の場合はマイナスの影響額を返すこと', () => {
      const amount = toDecimal(5000);
      const entry = new Entry(
        'test-id',
        EntryType.EXPENSE,
        new Date(),
        amount,
        'method-id'
      );
      
      const impact = entry.getBalanceImpact();
      expect(impact.equals(amount.negated())).toBe(true);
      expect(impact.toString()).toBe('-5000');
    });
    
    it('振替の場合はデフォルトでマイナスの影響額を返すこと', () => {
      const amount = toDecimal(5000);
      const entry = new Entry(
        'test-id',
        EntryType.TRANSFER,
        new Date(),
        amount,
        'method-id'
      );
      
      const impact = entry.getBalanceImpact();
      expect(impact.equals(amount.negated())).toBe(true);
    });
    
    it('初期残高の場合はプラスの影響額を返すこと', () => {
      const amount = toDecimal(5000);
      const entry = new Entry(
        'test-id',
        EntryType.INITIAL_BALANCE,
        new Date(),
        amount,
        'method-id'
      );
      
      const impact = entry.getBalanceImpact();
      expect(impact.equals(amount)).toBe(true);
    });
  });
  
  // 補助関数のテスト
  describe('helper functions', () => {
    describe('validateEntryBusinessRules', () => {
      it('有効なエントリに対しては例外を投げないこと', () => {
        const validEntry = {
          id: 'test-id',
          type: EntryType.EXPENSE,
          date: new Date(),
          amount: toDecimal(5000),
          methodId: 'method-id',
          categoryId: 'category-id'
        };
        
        expect(() => validateEntryBusinessRules(validEntry)).not.toThrow();
      });
      
      it('金額が0以下の場合は例外を投げること', () => {
        const invalidEntry = {
          id: 'test-id',
          type: EntryType.EXPENSE,
          date: new Date(),
          amount: toDecimal(0),
          methodId: 'method-id'
        };
        
        expect(() => validateEntryBusinessRules(invalidEntry)).toThrow(BusinessRuleError);
      });
    });
    
    describe('isCategoryRequired', () => {
      it('収入タイプの場合はtrueを返すこと', () => {
        expect(isCategoryRequired(EntryType.INCOME)).toBe(true);
      });
      
      it('支出タイプの場合はtrueを返すこと', () => {
        expect(isCategoryRequired(EntryType.EXPENSE)).toBe(true);
      });
      
      it('その他のタイプの場合はfalseを返すこと', () => {
        expect(isCategoryRequired(EntryType.TRANSFER)).toBe(false);
        expect(isCategoryRequired(EntryType.BORROW)).toBe(false);
        expect(isCategoryRequired(EntryType.LEND)).toBe(false);
      });
    });
    
    describe('isDebtRelatedEntry', () => {
      it('借入/貸付/返済/返済受取タイプの場合はtrueを返すこと', () => {
        expect(isDebtRelatedEntry(EntryType.BORROW)).toBe(true);
        expect(isDebtRelatedEntry(EntryType.LEND)).toBe(true);
        expect(isDebtRelatedEntry(EntryType.REPAYMENT)).toBe(true);
        expect(isDebtRelatedEntry(EntryType.REPAYMENT_RECEIVE)).toBe(true);
      });
      
      it('その他のタイプの場合はfalseを返すこと', () => {
        expect(isDebtRelatedEntry(EntryType.INCOME)).toBe(false);
        expect(isDebtRelatedEntry(EntryType.EXPENSE)).toBe(false);
        expect(isDebtRelatedEntry(EntryType.TRANSFER)).toBe(false);
        expect(isDebtRelatedEntry(EntryType.INITIAL_BALANCE)).toBe(false);
      });
    });
    
    describe('isTransferEntry', () => {
      it('振替タイプの場合はtrueを返すこと', () => {
        expect(isTransferEntry(EntryType.TRANSFER)).toBe(true);
      });
      
      it('その他のタイプの場合はfalseを返すこと', () => {
        expect(isTransferEntry(EntryType.INCOME)).toBe(false);
        expect(isTransferEntry(EntryType.EXPENSE)).toBe(false);
        expect(isTransferEntry(EntryType.BORROW)).toBe(false);
      });
    });
    
    describe('isInitialBalanceEntry', () => {
      it('初期残高タイプの場合はtrueを返すこと', () => {
        expect(isInitialBalanceEntry(EntryType.INITIAL_BALANCE)).toBe(true);
      });
      
      it('その他のタイプの場合はfalseを返すこと', () => {
        expect(isInitialBalanceEntry(EntryType.INCOME)).toBe(false);
        expect(isInitialBalanceEntry(EntryType.EXPENSE)).toBe(false);
        expect(isInitialBalanceEntry(EntryType.TRANSFER)).toBe(false);
      });
    });
  });
});