import { Method } from './method';
import { toDecimal } from '../../../shared/utils/decimal';
import { BusinessRuleError } from '../../../shared/errors/AppError';
import { ZodValidator } from '../../../shared/validation/ZodValidator';
import { z } from 'zod';

describe('Method Domain Entity', () => {
  // コンストラクタテスト
  describe('constructor', () => {
    it('有効な値でインスタンスを作成できること', () => {
      const method = new Method(
        'test-id',
        '現金',
        toDecimal(10000),
        false
      );
      
      expect(method.id).toBe('test-id');
      expect(method.name).toBe('現金');
      expect(method.initialBalance.equals(toDecimal(10000))).toBe(true);
      expect(method.archived).toBe(false);
    });

    it('初期残高なしでインスタンスを作成できること', () => {
      const method = new Method(
        'test-id',
        'クレジットカード',
        null,
        false
      );
      
      expect(method.initialBalance).toBeNull();
    });

    it('アーカイブ状態でインスタンスを作成できること', () => {
      const method = new Method(
        'test-id',
        '古い口座',
        toDecimal(5000),
        true
      );
      
      expect(method.archived).toBe(true);
    });

    it('名前が空の場合はBusinessRuleErrorをスローすること', () => {
      expect(() => new Method(
        'test-id',
        '', // 空の名前
        toDecimal(1000),
        false
      )).toThrow(BusinessRuleError);
      
      expect(() => new Method(
        'test-id',
        '   ', // 空白のみの名前
        toDecimal(1000),
        false
      )).toThrow(BusinessRuleError);
    });

    it('バリデーターが渡された場合はバリデーションを実行すること', () => {
      // モックバリデーター作成
      const mockValidator = {
        validate: jest.fn().mockReturnValue({})
      };

      new Method(
        'test-id',
        '銀行口座',
        toDecimal(5000),
        false,
        mockValidator as any
      );
      
      expect(mockValidator.validate).toHaveBeenCalled();
    });
  });

  // createファクトリーメソッドのテスト
  describe('create', () => {
    it('有効なデータからインスタンスを作成できること', () => {
      const method = Method.create({
        name: '銀行口座',
        initialBalance: 5000,
        archived: false
      });
      
      expect(method.id).toBeDefined();
      expect(method.name).toBe('銀行口座');
      expect(method.initialBalance?.equals(toDecimal(5000))).toBe(true);
      expect(method.archived).toBe(false);
    });

    it('文字列の初期残高からインスタンスを作成できること', () => {
      const method = Method.create({
        name: '銀行口座',
        initialBalance: '5000'
      });
      
      expect(method.initialBalance?.equals(toDecimal(5000))).toBe(true);
    });

    it('Decimal型の初期残高からインスタンスを作成できること', () => {
      const method = Method.create({
        name: '銀行口座',
        initialBalance: toDecimal(5000)
      });
      
      expect(method.initialBalance?.equals(toDecimal(5000))).toBe(true);
    });

    it('初期残高なしでインスタンスを作成できること', () => {
      const method = Method.create({
        name: 'クレジットカード'
      });
      
      expect(method.initialBalance).toBeNull();
    });

    it('IDを明示的に指定して作成できること', () => {
      const methodId = 'custom-id';
      const method = Method.create({
        id: methodId,
        name: '銀行口座'
      });
      
      expect(method.id).toBe(methodId);
    });
    
    it('アーカイブ状態を指定して作成できること', () => {
      const method = Method.create({
        name: '古い口座',
        archived: true
      });
      
      expect(method.archived).toBe(true);
    });
    
    it('デフォルトではアーカイブ状態はfalseであること', () => {
      const method = Method.create({
        name: '新しい口座'
      });
      
      expect(method.archived).toBe(false);
    });

    it('バリデーターが渡された場合はバリデーションを実行すること', () => {
      const testSchema = z.object({
        name: z.string().min(1),
        initialBalance: z.number().optional(),
      });
      const validator = new ZodValidator(testSchema);
      
      const method = Method.create({
        name: '銀行口座',
        initialBalance: 5000
      }, validator);
      
      expect(method.name).toBe('銀行口座');
    });

    it('名前が空の場合はBusinessRuleErrorをスローすること', () => {
      expect(() => Method.create({
        name: '', // 空の名前
        initialBalance: 1000
      })).toThrow(BusinessRuleError);
      
      expect(() => Method.create({
        name: '   ', // 空白のみの名前
        initialBalance: 1000
      })).toThrow(BusinessRuleError);
    });
  });

  // isArchivedメソッドのテスト
  describe('isArchived', () => {
    it('archivedがtrueの場合はtrueを返すこと', () => {
      const method = new Method(
        'test-id',
        '古い口座',
        null,
        true
      );
      
      expect(method.isArchived()).toBe(true);
    });

    it('archivedがfalseの場合はfalseを返すこと', () => {
      const method = new Method(
        'test-id',
        '現役口座',
        null,
        false
      );
      
      expect(method.isArchived()).toBe(false);
    });
  });

  // archiveメソッドのテスト
  describe('archive', () => {
    it('アーカイブ状態にした新しいインスタンスを返すこと', () => {
      const method = new Method(
        'test-id',
        '銀行口座',
        toDecimal(5000),
        false
      );
      
      const archivedMethod = method.archive();
      
      expect(archivedMethod).not.toBe(method); // 新しいインスタンスであることを確認
      expect(archivedMethod.id).toBe(method.id);
      expect(archivedMethod.name).toBe(method.name);
      expect(archivedMethod.initialBalance?.equals(method.initialBalance!)).toBe(true);
      expect(archivedMethod.archived).toBe(true);
    });

    it('既にアーカイブ状態の場合は同じインスタンスを返すこと', () => {
      const method = new Method(
        'test-id',
        '古い口座',
        null,
        true // 既にアーカイブ済み
      );
      
      const result = method.archive();
      
      expect(result).toBe(method); // 同じインスタンスであることを確認
    });

    it('バリデーターが渡された場合は新しいインスタンスで使用すること', () => {
      const method = new Method(
        'test-id',
        '銀行口座',
        null,
        false
      );
      
      const mockValidator = {
        validate: jest.fn().mockReturnValue({})
      };
      
      method.archive(mockValidator as any);
      
      expect(mockValidator.validate).toHaveBeenCalled();
    });
  });

  // unarchiveメソッドのテスト
  describe('unarchive', () => {
    it('アーカイブ解除した新しいインスタンスを返すこと', () => {
      const method = new Method(
        'test-id',
        '古い口座',
        toDecimal(5000),
        true
      );
      
      const unarchivedMethod = method.unarchive();
      
      expect(unarchivedMethod).not.toBe(method); // 新しいインスタンスであることを確認
      expect(unarchivedMethod.id).toBe(method.id);
      expect(unarchivedMethod.name).toBe(method.name);
      expect(unarchivedMethod.initialBalance?.equals(method.initialBalance!)).toBe(true);
      expect(unarchivedMethod.archived).toBe(false);
    });

    it('既にアーカイブ解除状態の場合は同じインスタンスを返すこと', () => {
      const method = new Method(
        'test-id',
        '現役口座',
        null,
        false // 既にアーカイブ解除済み
      );
      
      const result = method.unarchive();
      
      expect(result).toBe(method); // 同じインスタンスであることを確認
    });

    it('バリデーターが渡された場合は新しいインスタンスで使用すること', () => {
      const method = new Method(
        'test-id',
        '銀行口座',
        null,
        true
      );
      
      const mockValidator = {
        validate: jest.fn().mockReturnValue({})
      };
      
      method.unarchive(mockValidator as any);
      
      expect(mockValidator.validate).toHaveBeenCalled();
    });
  });

  // updateNameメソッドのテスト
  describe('updateName', () => {
    it('名前を更新した新しいインスタンスを返すこと', () => {
      const method = new Method(
        'test-id',
        '旧名称',
        toDecimal(5000),
        false
      );
      
      const updatedMethod = method.updateName('新名称');
      
      expect(updatedMethod).not.toBe(method); // 新しいインスタンスであることを確認
      expect(updatedMethod.id).toBe(method.id);
      expect(updatedMethod.name).toBe('新名称');
      expect(updatedMethod.initialBalance?.equals(method.initialBalance!)).toBe(true);
      expect(updatedMethod.archived).toBe(method.archived);
    });

    it('名前が変わらない場合は同じインスタンスを返すこと', () => {
      const method = new Method(
        'test-id',
        '銀行口座',
        null,
        false
      );
      
      const result = method.updateName('銀行口座');
      
      expect(result).toBe(method); // 同じインスタンスであることを確認
    });

    it('空の名前は許可されないこと', () => {
      const method = new Method(
        'test-id',
        '銀行口座',
        null,
        false
      );
      
      expect(() => method.updateName('')).toThrow(BusinessRuleError);
      expect(() => method.updateName('   ')).toThrow(BusinessRuleError);
    });
    
    it('バリデーターが渡された場合は新しいインスタンスで使用すること', () => {
      const method = new Method(
        'test-id',
        '銀行口座',
        null,
        false
      );
      
      const mockValidator = {
        validate: jest.fn().mockReturnValue({})
      };
      
      method.updateName('新名称', mockValidator as any);
      
      expect(mockValidator.validate).toHaveBeenCalled();
    });
  });

  // hasInitialBalanceメソッドのテスト
  describe('hasInitialBalance', () => {
    it('初期残高があればtrueを返すこと', () => {
      const method = new Method(
        'test-id',
        '口座',
        toDecimal(5000),
        false
      );
      
      expect(method.hasInitialBalance()).toBe(true);
    });

    it('初期残高がなければfalseを返すこと', () => {
      const method = new Method(
        'test-id',
        '口座',
        null,
        false
      );
      
      expect(method.hasInitialBalance()).toBe(false);
    });
  });
  
  // updateInitialBalanceメソッドのテスト
  describe('updateInitialBalance', () => {
    it('初期残高を更新した新しいインスタンスを返すこと', () => {
      const method = new Method(
        'test-id',
        '銀行口座',
        toDecimal(5000),
        false
      );
      
      const updatedMethod = method.updateInitialBalance(toDecimal(8000));
      
      expect(updatedMethod).not.toBe(method); // 新しいインスタンスであることを確認
      expect(updatedMethod.id).toBe(method.id);
      expect(updatedMethod.name).toBe(method.name);
      expect(updatedMethod.initialBalance?.equals(toDecimal(8000))).toBe(true);
      expect(updatedMethod.archived).toBe(method.archived);
    });

    it('数値から初期残高を更新できること', () => {
      const method = new Method(
        'test-id',
        '銀行口座',
        toDecimal(5000),
        false
      );
      
      const updatedMethod = method.updateInitialBalance(8000);
      
      expect(updatedMethod.initialBalance?.equals(toDecimal(8000))).toBe(true);
    });

    it('文字列から初期残高を更新できること', () => {
      const method = new Method(
        'test-id',
        '銀行口座',
        toDecimal(5000),
        false
      );
      
      const updatedMethod = method.updateInitialBalance('8000');
      
      expect(updatedMethod.initialBalance?.equals(toDecimal(8000))).toBe(true);
    });

    it('初期残高をnullに設定できること', () => {
      const method = new Method(
        'test-id',
        '銀行口座',
        toDecimal(5000),
        false
      );
      
      const updatedMethod = method.updateInitialBalance(null);
      
      expect(updatedMethod.initialBalance).toBeNull();
    });

    it('初期残高が変わらない場合は同じインスタンスを返すこと', () => {
      const method = new Method(
        'test-id',
        '銀行口座',
        toDecimal(5000),
        false
      );
      
      const result = method.updateInitialBalance(toDecimal(5000));
      
      expect(result).toBe(method); // 同じインスタンスであることを確認
    });
    
    it('バリデーターが渡された場合は新しいインスタンスで使用すること', () => {
      const method = new Method(
        'test-id',
        '銀行口座',
        toDecimal(5000),
        false
      );
      
      const mockValidator = {
        validate: jest.fn().mockReturnValue({})
      };
      
      method.updateInitialBalance(8000, mockValidator as any);
      
      expect(mockValidator.validate).toHaveBeenCalled();
    });
  });

  describe('アーカイブ状態の管理', () => {
    it('デフォルトではarchivedがfalseである', () => {
      const method = new Method('test-id', 'テスト口座');
      expect(method.archived).toBe(false);
    });

    it('コンストラクタでarchivedを指定できる', () => {
      const method = new Method('test-id', 'テスト口座', null, true);
      expect(method.archived).toBe(true);
    });

    it('withArchivedで新しいインスタンスを返す', () => {
      const method = new Method('test-id', 'テスト口座');
      const archived = method.withArchived(true);
      
      // 元のインスタンスは変更されていない
      expect(method.archived).toBe(false);
      // 新しいインスタンスは変更されている
      expect(archived.archived).toBe(true);
      // その他のプロパティは保持されている
      expect(archived.id).toBe(method.id);
      expect(archived.name).toBe(method.name);
    });

    it('既にtrueの場合もwithArchivedで新しいインスタンスを返す', () => {
      const method = new Method('test-id', 'テスト口座', null, true);
      const stillArchived = method.withArchived(true);
      
      // 同じ値でも新しいインスタンスを返す
      expect(stillArchived).not.toBe(method);
      expect(stillArchived.archived).toBe(true);
    });

    it('アーカイブ状態からwithArchivedでfalseに変更できる', () => {
      const method = new Method('test-id', 'テスト口座', null, true);
      const unarchived = method.withArchived(false);
      
      expect(method.archived).toBe(true);  // 元のインスタンスは変更されない
      expect(unarchived.archived).toBe(false);
    });
  });

  describe('名前の更新', () => {
    it('withNameで名前を更新した新しいインスタンスを返す', () => {
      const method = new Method('test-id', 'テスト口座');
      const updated = method.withName('新しい名前');
      
      // 元のインスタンスは変更されていない
      expect(method.name).toBe('テスト口座');
      // 新しいインスタンスは変更されている
      expect(updated.name).toBe('新しい名前');
      // その他のプロパティは保持されている
      expect(updated.id).toBe(method.id);
      expect(updated.initialBalance).toBe(method.initialBalance);
    });

    it('同じ名前でもwithNameで新しいインスタンスを返す', () => {
      const method = new Method('test-id', 'テスト口座');
      const sameName = method.withName('テスト口座');
      
      // 同じ値でも新しいインスタンスを返す
      expect(sameName).not.toBe(method);
      expect(sameName.name).toBe('テスト口座');
    });

    it('空の名前はエラーになる', () => {
      const method = new Method('test-id', 'テスト口座');
      expect(() => method.withName('')).toThrow();
    });
    
    it('とても長い名前はエラーになる', () => {
      const method = new Method('test-id', 'テスト口座');
      const longName = 'あ'.repeat(51);  // 51文字の名前
      expect(() => method.withName(longName)).toThrow();
    });
  });

  describe('初期残高の管理', () => {
    it('initialBalanceがnullでない場合はtrue', () => {
      const method = new Method('test-id', 'テスト口座', toDecimal(1000));
      expect(method.initialBalance).not.toBeNull();
    });

    it('initialBalanceがnullの場合はfalse', () => {
      const method = new Method('test-id', 'テスト口座');
      expect(method.initialBalance).toBeNull();
    });
  });

  describe('初期残高の更新', () => {
    it('withInitialBalanceで初期残高を更新した新しいインスタンスを返す', () => {
      const method = new Method('test-id', 'テスト口座');
      const updated = method.withInitialBalance(toDecimal(1000));
      
      // 元のインスタンスは変更されていない
      expect(method.initialBalance).toBeNull();
      // 新しいインスタンスは変更されている
      expect(updated.initialBalance?.equals(toDecimal(1000))).toBe(true);
    });

    it('withInitialBalanceでnullを指定できる', () => {
      const method = new Method('test-id', 'テスト口座', toDecimal(1000));
      const updated = method.withInitialBalance(null);
      
      expect(method.initialBalance?.equals(toDecimal(1000))).toBe(true); // 元のインスタンスは変更されない
      expect(updated.initialBalance).toBeNull();
    });

    it('負の初期残高はエラーになる', () => {
      const method = new Method('test-id', 'テスト口座');
      expect(() => method.withInitialBalance(toDecimal(-1000))).toThrow();
    });

    it('ゼロの初期残高は許容される', () => {
      const method = new Method('test-id', 'テスト口座');
      const updated = method.withInitialBalance(toDecimal(0));
      expect(updated.initialBalance?.equals(toDecimal(0))).toBe(true);
    });

    it('とても大きな初期残高も許容される', () => {
      const method = new Method('test-id', 'テスト口座');
      const updated = method.withInitialBalance(toDecimal(10000000000)); // 100億円
      expect(updated.initialBalance?.equals(toDecimal(10000000000))).toBe(true);
    });
  });
});