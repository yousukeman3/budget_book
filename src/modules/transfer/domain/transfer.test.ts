import { Transfer } from './transfer';
import { toDecimal } from '../../../shared/utils/decimal';
import { BusinessRuleError } from '../../../shared/errors/AppError';
import { BusinessRuleErrorCode } from '../../../shared/errors/ErrorCodes';
import { ZodValidator } from '../../../shared/validation/ZodValidator';
import { z } from 'zod';

describe('Transfer Domain Entity', () => {
  // コンストラクタテスト
  describe('constructor', () => {
    it('有効な値でインスタンスを作成できること', () => {
      const transfer = new Transfer(
        'test-id',
        'entry-id',
        'from-method-id',
        'to-method-id',
        new Date('2023-01-15'),
        'テスト振替'
      );
      
      expect(transfer.id).toBe('test-id');
      expect(transfer.rootEntryId).toBe('entry-id');
      expect(transfer.fromMethodId).toBe('from-method-id');
      expect(transfer.toMethodId).toBe('to-method-id');
      expect(transfer.date).toEqual(new Date('2023-01-15'));
      expect(transfer.note).toBe('テスト振替');
    });

    it('noteは省略可能であること', () => {
      const transfer = new Transfer(
        'test-id',
        'entry-id',
        'from-method-id',
        'to-method-id',
        new Date('2023-01-15')
      );
      
      expect(transfer.note).toBeNull();
    });

    it('同じMethod間の振替は許可されないこと', () => {
      expect(() => new Transfer(
        'test-id',
        'entry-id',
        'same-id', // 同じID
        'same-id', // 同じID
        new Date('2023-01-15')
      )).toThrow(BusinessRuleError);

      try {
        new Transfer(
          'test-id',
          'entry-id',
          'same-id',
          'same-id',
          new Date('2023-01-15')
        );
        fail('例外がスローされるべきです');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect((error as BusinessRuleError).code).toBe(BusinessRuleErrorCode.IDENTICAL_ACCOUNTS);
      }
    });

    it('バリデーターが渡された場合はバリデーションを実行すること', () => {
      // モックバリデーター作成
      const mockValidator = {
        validate: jest.fn().mockReturnValue({})
      };

      new Transfer(
        'test-id',
        'entry-id',
        'from-method-id',
        'to-method-id',
        new Date(),
        'テスト振替',
        mockValidator as any
      );
      
      expect(mockValidator.validate).toHaveBeenCalled();
    });
  });

  // createファクトリーメソッドのテスト
  describe('create', () => {
    it('有効なデータからインスタンスを作成できること', () => {
      const transfer = Transfer.create({
        rootEntryId: 'entry-id',
        fromMethodId: 'from-method-id',
        toMethodId: 'to-method-id',
        date: new Date('2023-01-15'),
        note: 'テスト振替'
      });
      
      expect(transfer.id).toBeDefined();
      expect(transfer.rootEntryId).toBe('entry-id');
      expect(transfer.fromMethodId).toBe('from-method-id');
      expect(transfer.toMethodId).toBe('to-method-id');
      expect(transfer.date).toEqual(new Date('2023-01-15'));
      expect(transfer.note).toBe('テスト振替');
    });

    it('IDを明示的に指定して作成できること', () => {
      const transferId = 'custom-id';
      const transfer = Transfer.create({
        id: transferId,
        rootEntryId: 'entry-id',
        fromMethodId: 'from-method-id',
        toMethodId: 'to-method-id',
        date: new Date('2023-01-15')
      });
      
      expect(transfer.id).toBe(transferId);
    });

    it('noteは省略可能であること', () => {
      const transfer = Transfer.create({
        rootEntryId: 'entry-id',
        fromMethodId: 'from-method-id',
        toMethodId: 'to-method-id',
        date: new Date('2023-01-15')
      });
      
      expect(transfer.note).toBeNull();
    });

    it('同じMethod間の振替は許可されないこと', () => {
      expect(() => Transfer.create({
        rootEntryId: 'entry-id',
        fromMethodId: 'same-id',
        toMethodId: 'same-id',
        date: new Date('2023-01-15')
      })).toThrow(BusinessRuleError);
      
      try {
        Transfer.create({
          rootEntryId: 'entry-id',
          fromMethodId: 'same-id',
          toMethodId: 'same-id',
          date: new Date('2023-01-15')
        });
        fail('例外がスローされるべきです');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect((error as BusinessRuleError).code).toBe(BusinessRuleErrorCode.IDENTICAL_ACCOUNTS);
      }
    });

    it('バリデーターが渡された場合はバリデーションを実行すること', () => {
      const testSchema = z.object({
        rootEntryId: z.string().min(1),
        fromMethodId: z.string().min(1),
        toMethodId: z.string().min(1),
      });
      const validator = new ZodValidator(testSchema);
      
      const transfer = Transfer.create({
        rootEntryId: 'entry-id',
        fromMethodId: 'from-method-id',
        toMethodId: 'to-method-id',
        date: new Date('2023-01-15')
      }, validator);
      
      expect(transfer.rootEntryId).toBe('entry-id');
    });
  });

  // ノート更新メソッドのテスト
  describe('ノート更新メソッド', () => {
    it('withNoteでノートを更新した新しいインスタンスを返す', () => {
      const transfer = new Transfer(
        'test-id',
        'root-entry-id',
        'from-method-id',
        'to-method-id',
        new Date('2023-01-15'),
        'テスト用ノート'
      );
      
      const updated = transfer.withNote('更新されたノート');
      
      // 元のインスタンスは変更されていない
      expect(transfer.note).toBe('テスト用ノート');
      
      // 新しいインスタンスは変更されている
      expect(updated.note).toBe('更新されたノート');
      
      // 他のプロパティは保持されている
      expect(updated.id).toBe(transfer.id);
      expect(updated.rootEntryId).toBe(transfer.rootEntryId);
      expect(updated.fromMethodId).toBe(transfer.fromMethodId);
      expect(updated.toMethodId).toBe(transfer.toMethodId);
      expect(updated.date).toEqual(transfer.date);
    });

    it('ノートをnullに設定できる', () => {
      const transfer = new Transfer(
        'test-id',
        'root-entry-id',
        'from-method-id',
        'to-method-id',
        new Date('2023-01-15'),
        'テスト用ノート'
      );
      
      const updated = transfer.withNote(null);
      
      expect(updated.note).toBeNull();
    });

    it('同じノートが指定された場合も新しいインスタンスを返す', () => {
      const transfer = new Transfer(
        'test-id',
        'root-entry-id',
        'from-method-id',
        'to-method-id',
        new Date('2023-01-15'),
        'テスト用ノート'
      );
      
      const updated = transfer.withNote('テスト用ノート');
      
      expect(updated).not.toBe(transfer); // 新しいインスタンスであることを確認
      expect(updated.note).toBe(transfer.note);
    });

    it('非常に長いノートが指定された場合はエラー', () => {
      const transfer = new Transfer(
        'test-id',
        'root-entry-id',
        'from-method-id',
        'to-method-id',
        new Date('2023-01-15'),
        'テスト用ノート'
      );
      
      const longNote = 'あ'.repeat(1001); // 1001文字のノート
      
      expect(() => transfer.withNote(longNote)).toThrow();
    });
  });

  // 日付更新メソッドのテスト
  describe('日付更新メソッド', () => {
    it('withDateで日付を更新した新しいインスタンスを返す', () => {
      const oldDate = new Date('2023-01-15');
      const newDate = new Date('2023-02-20');
      
      const transfer = new Transfer(
        'test-id',
        'root-entry-id',
        'from-method-id',
        'to-method-id',
        oldDate,
        'テスト用ノート'
      );
      
      const updated = transfer.withDate(newDate);
      
      // 元のインスタンスは変更されていない
      expect(transfer.date).toEqual(oldDate);
      
      // 新しいインスタンスは変更されている
      expect(updated.date).toEqual(newDate);
      
      // 他のプロパティは保持されている
      expect(updated.id).toBe(transfer.id);
      expect(updated.rootEntryId).toBe(transfer.rootEntryId);
      expect(updated.fromMethodId).toBe(transfer.fromMethodId);
      expect(updated.toMethodId).toBe(transfer.toMethodId);
      expect(updated.note).toBe(transfer.note);
    });

    it('同じ日付が指定された場合も新しいインスタンスを返す', () => {
      const date = new Date('2023-01-15');
      const transfer = new Transfer(
        'test-id',
        'root-entry-id',
        'from-method-id',
        'to-method-id',
        date,
        'テスト用ノート'
      );
      
      const updated = transfer.withDate(new Date('2023-01-15'));
      
      expect(updated).not.toBe(transfer); // 新しいインスタンスであることを確認
      expect(updated.date.getTime()).toBe(transfer.date.getTime());
    });

    it('未来の日付も許可される', () => {
      const transfer = new Transfer(
        'test-id',
        'root-entry-id',
        'from-method-id',
        'to-method-id',
        new Date('2023-01-15'),
        'テスト用ノート'
      );
      
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1); // 1年後
      
      const updated = transfer.withDate(futureDate);
      
      expect(updated.date).toEqual(futureDate);
    });
  });
});