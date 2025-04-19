import { Debt } from './debt';
import { toDecimal } from '../../../shared/utils/decimal';
import { BusinessRuleError } from '../../../shared/errors/AppError';
import { BusinessRuleErrorCode } from '../../../shared/errors/ErrorCodes';
import { ZodValidator } from '../../../shared/validation/ZodValidator';
import { DebtType } from '../../../shared/types/debt.types';
import { z } from 'zod';

describe('Debt Domain Entity', () => {
  // コンストラクタテスト
  describe('constructor', () => {
    it('有効な値でインスタンスを作成できること', () => {
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(5000),
        '友人A',
        null,
        'テスト借入'
      );
      
      expect(debt.id).toBe('test-id');
      expect(debt.type).toBe(DebtType.BORROW);
      expect(debt.rootEntryId).toBe('entry-id');
      expect(debt.date).toEqual(new Date('2023-01-15'));
      expect(debt.amount.equals(toDecimal(5000))).toBe(true);
      expect(debt.counterpart).toBe('友人A');
      expect(debt.repaidAt).toBeNull();
      expect(debt.memo).toBe('テスト借入');
    });

    it('返済完了日付を指定してインスタンスを作成できること', () => {
      const date = new Date('2023-01-15');
      const repaidAt = new Date('2023-02-20');
      
      const debt = new Debt(
        'test-id',
        DebtType.LEND,
        'entry-id',
        date,
        toDecimal(5000),
        '友人B',
        repaidAt,
        'テスト貸付'
      );
      
      expect(debt.repaidAt).toEqual(repaidAt);
    });

    it('memoは省略可能であること', () => {
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(5000),
        '友人A',
        null
      );
      
      expect(debt.memo).toBeNull();
    });

    it('金額が0以下の場合はBusinessRuleErrorをスローすること', () => {
      expect(() => new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(0), // 無効な金額
        '友人A'
      )).toThrow(BusinessRuleError);
      
      try {
        new Debt(
          'test-id',
          DebtType.BORROW,
          'entry-id',
          new Date('2023-01-15'),
          toDecimal(-100), // 負の金額
          '友人A'
        );
        fail('例外がスローされるべきです');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect((error as BusinessRuleError).code).toBe(BusinessRuleErrorCode.INVALID_VALUE_RANGE);
      }
    });
    
    it('返済日が借入日より前の場合はBusinessRuleErrorをスローすること', () => {
      const date = new Date('2023-02-15');
      const repaidAt = new Date('2023-01-20'); // 借入日より前
      
      expect(() => new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        date,
        toDecimal(5000),
        '友人A',
        repaidAt
      )).toThrow(BusinessRuleError);
      
      try {
        new Debt(
          'test-id',
          DebtType.BORROW,
          'entry-id',
          date,
          toDecimal(5000),
          '友人A',
          repaidAt
        );
        fail('例外がスローされるべきです');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect((error as BusinessRuleError).code).toBe(BusinessRuleErrorCode.INVALID_DATE_RANGE);
      }
    });

    it('バリデーターが渡された場合はバリデーションを実行すること', () => {
      // モックバリデーター作成
      const mockValidator = {
        validate: jest.fn().mockReturnValue({})
      };

      new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date(),
        toDecimal(5000),
        '友人A',
        null,
        'テストメモ',
        mockValidator
      );
      
      expect(mockValidator.validate).toHaveBeenCalled();
    });
  });

  // createファクトリーメソッドのテスト
  describe('create', () => {
    it('有効なデータからインスタンスを作成できること', () => {
      const debt = Debt.create({
        type: DebtType.BORROW,
        rootEntryId: 'entry-id',
        date: new Date('2023-01-15'),
        amount: 5000,
        counterpart: '友人A',
        memo: 'テスト借入'
      });
      
      expect(debt.id).toBeDefined();
      expect(debt.type).toBe(DebtType.BORROW);
      expect(debt.rootEntryId).toBe('entry-id');
      expect(debt.date).toEqual(new Date('2023-01-15'));
      expect(debt.amount.equals(toDecimal(5000))).toBe(true);
      expect(debt.counterpart).toBe('友人A');
      expect(debt.repaidAt).toBeNull();
      expect(debt.memo).toBe('テスト借入');
    });

    it('文字列の金額からインスタンスを作成できること', () => {
      const debt = Debt.create({
        type: DebtType.LEND,
        rootEntryId: 'entry-id',
        date: new Date('2023-01-15'),
        amount: '5000',
        counterpart: '友人B'
      });
      
      expect(debt.amount.equals(toDecimal(5000))).toBe(true);
    });

    it('Decimal型の金額からインスタンスを作成できること', () => {
      const debt = Debt.create({
        type: DebtType.BORROW,
        rootEntryId: 'entry-id',
        date: new Date('2023-01-15'),
        amount: toDecimal(5000),
        counterpart: '友人A'
      });
      
      expect(debt.amount.equals(toDecimal(5000))).toBe(true);
    });

    it('IDを明示的に指定して作成できること', () => {
      const debtId = 'custom-id';
      const debt = Debt.create({
        id: debtId,
        type: DebtType.BORROW,
        rootEntryId: 'entry-id',
        date: new Date('2023-01-15'),
        amount: 5000,
        counterpart: '友人A'
      });
      
      expect(debt.id).toBe(debtId);
    });
    
    it('返済完了日を指定して作成できること', () => {
      const date = new Date('2023-01-15');
      const repaidAt = new Date('2023-02-20');
      
      const debt = Debt.create({
        type: DebtType.LEND,
        rootEntryId: 'entry-id',
        date: date,
        amount: 5000,
        counterpart: '友人B',
        repaidAt: repaidAt
      });
      
      expect(debt.repaidAt).toEqual(repaidAt);
    });
    
    it('金額が0以下の場合はBusinessRuleErrorをスローすること', () => {
      expect(() => Debt.create({
        type: DebtType.BORROW,
        rootEntryId: 'entry-id',
        date: new Date('2023-01-15'),
        amount: 0, // 無効な金額
        counterpart: '友人A'
      })).toThrow(BusinessRuleError);
      
      try {
        Debt.create({
          type: DebtType.BORROW,
          rootEntryId: 'entry-id',
          date: new Date('2023-01-15'),
          amount: -100, // 負の金額
          counterpart: '友人A'
        });
        fail('例外がスローされるべきです');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect((error as BusinessRuleError).code).toBe(BusinessRuleErrorCode.INVALID_VALUE_RANGE);
      }
    });

    it('バリデーターが渡された場合はバリデーションを実行すること', () => {
      const testSchema = z.object({
        type: z.enum(['borrow', 'lend']),
        rootEntryId: z.string().min(1),
        amount: z.number().positive(),
      });
      const validator = new ZodValidator(testSchema);
      
      const debt = Debt.create({
        type: DebtType.BORROW,
        rootEntryId: 'entry-id',
        date: new Date('2023-01-15'),
        amount: 5000,
        counterpart: '友人A'
      }, validator);
      
      expect(debt.type).toBe(DebtType.BORROW);
    });
  });

  // isRepaidメソッドのテスト
  describe('isRepaid', () => {
    it('返済完了日が設定されている場合はtrueを返すこと', () => {
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(5000),
        '友人A',
        new Date('2023-02-20')
      );
      
      expect(debt.isRepaid()).toBe(true);
    });

    it('返済完了日が設定されていない場合はfalseを返すこと', () => {
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(5000),
        '友人A',
        null
      );
      
      expect(debt.isRepaid()).toBe(false);
    });
  });

  // markAsRepaidメソッドのテスト
  describe('markAsRepaid', () => {
    it('返済完了日を設定した新しいインスタンスを返すこと', () => {
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(5000),
        '友人A',
        null
      );
      
      const repaidDate = new Date('2023-02-20');
      const repaidDebt = debt.markAsRepaid(repaidDate);
      
      expect(repaidDebt).not.toBe(debt); // 新しいインスタンスであることを確認
      expect(repaidDebt.id).toBe(debt.id);
      expect(repaidDebt.type).toBe(debt.type);
      expect(repaidDebt.rootEntryId).toBe(debt.rootEntryId);
      expect(repaidDebt.date).toEqual(debt.date);
      expect(repaidDebt.amount.equals(debt.amount)).toBe(true);
      expect(repaidDebt.counterpart).toBe(debt.counterpart);
      expect(repaidDebt.repaidAt).toEqual(repaidDate);
    });

    it('日付を指定しない場合は現在の日付が使用されること', () => {
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(5000),
        '友人A',
        null
      );
      
      const beforeDate = new Date();
      const repaidDebt = debt.markAsRepaid();
      const afterDate = new Date();
      
      expect(repaidDebt.repaidAt).toBeDefined();

      // 現在時刻の前後であることを確認
      expect(repaidDebt.repaidAt!.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());  // eslint-disable-line @typescript-eslint/no-non-null-assertion
      expect(repaidDebt.repaidAt!.getTime()).toBeLessThanOrEqual(afterDate.getTime());      // eslint-disable-line @typescript-eslint/no-non-null-assertion
    });

    it('既に返済済みの場合は例外をスローすること', () => {
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(5000),
        '友人A',
        new Date('2023-02-01') // 既に返済済み
      );
      
      try {
        debt.markAsRepaid(new Date('2023-03-01'));
        fail('例外がスローされるべきです');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect((error as BusinessRuleError).code).toBe(BusinessRuleErrorCode.DEBT_ALREADY_REPAID);
      }
    });
    
    it('指定した返済日が借入日より前の場合は例外をスローすること', () => {
      const debtDate = new Date('2023-02-15');
      const repaidAt = new Date('2023-01-20'); // 借入日より前
      
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        debtDate,
        toDecimal(5000),
        '友人A',
        null
      );
      
      try {
        debt.markAsRepaid(repaidAt);
        fail('例外がスローされるべきです');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect((error as BusinessRuleError).code).toBe(BusinessRuleErrorCode.INVALID_DATE_RANGE);
      }
    });

    it('バリデーターが渡された場合は新しいインスタンスで使用すること', () => {
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(5000),
        '友人A',
        null
      );
      
      const mockValidator = {
        validate: jest.fn().mockReturnValue({})
      };
      
      debt.markAsRepaid(new Date('2023-02-20'), mockValidator);
      
      expect(mockValidator.validate).toHaveBeenCalled();
    });
  });

  // updateMemoメソッドのテスト
  describe('updateMemo', () => {
    it('メモを更新した新しいインスタンスを返すこと', () => {
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(5000),
        '友人A',
        null,
        '元のメモ'
      );
      
      const updatedDebt = debt.updateMemo('更新後のメモ');
      
      expect(updatedDebt).not.toBe(debt); // 新しいインスタンスであることを確認
      expect(updatedDebt.id).toBe(debt.id);
      expect(updatedDebt.memo).toBe('更新後のメモ');
    });

    it('メモが変わらない場合は同じインスタンスを返すこと', () => {
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(5000),
        '友人A',
        null,
        'テストメモ'
      );
      
      const result = debt.updateMemo('テストメモ');
      
      expect(result).toBe(debt); // 同じインスタンスであることを確認
    });

    it('nullのメモで更新できること', () => {
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(5000),
        '友人A',
        null,
        'テストメモ'
      );
      
      const updatedDebt = debt.updateMemo(null);
      
      expect(updatedDebt.memo).toBeNull();
    });
    
    it('バリデーターが渡された場合は新しいインスタンスで使用すること', () => {
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(5000),
        '友人A',
        null,
        'テストメモ'
      );
      
      const mockValidator = {
        validate: jest.fn().mockReturnValue({})
      };
      
      debt.updateMemo('新しいメモ');
      
      expect(mockValidator.validate).toHaveBeenCalled();
    });
  });

  // updateCounterpartメソッドのテスト
  describe('updateCounterpart', () => {
    it('相手名を更新した新しいインスタンスを返すこと', () => {
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(5000),
        '友人A'
      );
      
      const updatedDebt = debt.updateCounterpart('友人B');
      
      expect(updatedDebt).not.toBe(debt); // 新しいインスタンスであることを確認
      expect(updatedDebt.id).toBe(debt.id);
      expect(updatedDebt.counterpart).toBe('友人B');
    });

    it('相手名が変わらない場合は同じインスタンスを返すこと', () => {
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(5000),
        '友人A'
      );
      
      const result = debt.updateCounterpart('友人A');
      
      expect(result).toBe(debt); // 同じインスタンスであることを確認
    });

    it('空の相手名は許可されないこと', () => {
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(5000),
        '友人A'
      );
      
      expect(() => debt.updateCounterpart('')).toThrow(BusinessRuleError);
      expect(() => debt.updateCounterpart('   ')).toThrow(BusinessRuleError);
    });
    
    it('バリデーターが渡された場合は新しいインスタンスで使用すること', () => {
      const debt = new Debt(
        'test-id',
        DebtType.BORROW,
        'entry-id',
        new Date('2023-01-15'),
        toDecimal(5000),
        '友人A'
      );
      
      const mockValidator = {
        validate: jest.fn().mockReturnValue({})
      };
      
      debt.updateCounterpart('友人B');
      
      expect(mockValidator.validate).toHaveBeenCalled();
    });
  });
});