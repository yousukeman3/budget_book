// filepath: /app/src/modules/entry/domain/entry.ts
import { Decimal } from '@prisma/client/runtime/library';
import { BusinessRuleError } from '../../../shared/errors/AppError';
import { BusinessRuleErrorCode } from '../../../shared/errors/ErrorCodes';
import { EntryType } from '../../../shared/types/entry.types';
import { EntrySchema, EntryCreateSchema } from '../../../shared/zod/schema/EntrySchema';
import { validateWithSchema } from '../../../shared/validation/validateWithSchema';

/**
 * Entryドメインエンティティ
 * 収支記録の中核となるドメインモデル
 */
export class Entry {
  constructor(
    public readonly id: string,
    public readonly type: EntryType,
    public readonly date: Date,
    public readonly amount: Decimal,
    public readonly methodId: string,
    public readonly categoryId?: string,
    public readonly purpose?: string,
    public readonly privatePurpose?: string,
    public readonly note?: string,
    public readonly evidenceNote?: string,
    public readonly debtId?: string,
    public readonly createdAt: Date = new Date()
  ) {
    // インスタンス作成時にZodスキーマでバリデーション
    validateWithSchema(EntrySchema, this);
  }

  /**
   * 入力データからEntryオブジェクトを作成するファクトリーメソッド
   * バリデーションも実施
   */
  static create(data: {
    type: EntryType;
    date: Date;
    amount: Decimal;
    methodId: string;
    categoryId?: string;
    purpose?: string;
    privatePurpose?: string;
    note?: string;
    evidenceNote?: string;
    debtId?: string;
    id?: string;
    createdAt?: Date;
  }): Entry {
    // id がない場合は UUID を生成
    const id = data.id || crypto.randomUUID();
    const createdAt = data.createdAt || new Date();
    
    // データを検証（これにより型安全性が確保される）
    const validData = validateWithSchema(EntryCreateSchema, {
      ...data,
      id, // 明示的にidを設定
      createdAt
    });
    
    return new Entry(
      id,
      validData.type,
      validData.date,
      validData.amount,
      validData.methodId,
      validData.categoryId,
      validData.purpose,
      validData.privatePurpose,
      validData.note,
      validData.evidenceNote,
      validData.debtId,
      validData.createdAt
    );
  }

  /**
   * このエントリが収入系か判定
   */
  isIncome(): boolean {
    return this.type === EntryType.INCOME || 
           this.type === EntryType.BORROW || 
           this.type === EntryType.REPAYMENT_RECEIVE;
  }

  /**
   * このエントリが支出系か判定
   */
  isExpense(): boolean {
    return this.type === EntryType.EXPENSE || 
           this.type === EntryType.LEND || 
           this.type === EntryType.REPAYMENT;
  }

  /**
   * このエントリが転送系か判定
   */
  isTransfer(): boolean {
    return this.type === EntryType.TRANSFER;
  }

  /**
   * このエントリが初期残高か判定
   */
  isInitialBalance(): boolean {
    return this.type === EntryType.INITIAL_BALANCE;
  }

  /**
   * このエントリが貸借系か判定
   */
  isDebtRelated(): boolean {
    return this.type === EntryType.BORROW || 
           this.type === EntryType.LEND ||
           this.type === EntryType.REPAYMENT ||
           this.type === EntryType.REPAYMENT_RECEIVE;
  }

  /**
   * Method残高への影響額を計算
   * 残高にどう影響するかを返す
   */
  getBalanceImpact(): Decimal {
    // 収入系は残高増加（プラス）
    if (this.isIncome()) {
      return this.amount;
    }
    // 支出系は残高減少（マイナス）
    else if (this.isExpense()) {
      return this.amount.negated();
    }
    // 転送系は対象methodに応じて計算（fromMethodは減少、toMethodは増加）
    else if (this.isTransfer()) {
      // ★ 注: TransferオブジェクトはEntryに紐づくため、このメソッドだけでは
      // 影響を完全に判断できない。entryId=rootEntryIdのTransferを参照して
      // fromMethod/toMethodどちらかを確認する必要がある
      return this.amount.negated(); // デフォルトはEntry.methodId=fromMethodIdとして減少
    }
    // 初期残高は常にプラス
    else if (this.isInitialBalance()) {
      return this.amount;
    }
    
    // 想定外のタイプ
    return new Decimal(0);
  }
}