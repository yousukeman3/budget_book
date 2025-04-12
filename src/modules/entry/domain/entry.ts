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
    
    // 追加のドメインルールバリデーション
    this.validateAmount();
    this.validateTypeConsistency();
  }

  /**
   * 金額が正の値であるかを検証
   */
  private validateAmount(): void {
    if (this.amount.lessThanOrEqualTo(0)) {
      throw new BusinessRuleError(
        '金額は0より大きい値である必要があります',
        BusinessRuleErrorCode.INVALID_VALUE_RANGE,
        { field: 'amount', value: this.amount.toString() }
      );
    }
  }

  /**
   * エントリタイプとその他の項目の整合性を検証
   */
  private validateTypeConsistency(): void {
    // 借入/貸付/返済系の場合はdebtIdが必須
    if ((this.type === EntryType.BORROW || 
         this.type === EntryType.LEND || 
         this.type === EntryType.REPAYMENT || 
         this.type === EntryType.REPAYMENT_RECEIVE) && 
        !this.debtId) {
      throw new BusinessRuleError(
        `${this.getEntryTypeLabel()}には借金/貸付IDが必要です`,
        BusinessRuleErrorCode.INVALID_VALUE_COMBINATION,
        { field: 'debtId', entryType: this.type }
      );
    }

    // 収入/支出の場合はカテゴリが推奨（必須ではない）
    // ここでは警告レベルだが、必要に応じてエラーに変更可能
  }

  /**
   * エントリタイプの表示名を取得
   */
  private getEntryTypeLabel(): string {
    switch (this.type) {
      case EntryType.INCOME: return '収入';
      case EntryType.EXPENSE: return '支出';
      case EntryType.BORROW: return '借入';
      case EntryType.LEND: return '貸付';
      case EntryType.REPAYMENT: return '返済';
      case EntryType.REPAYMENT_RECEIVE: return '返済受取';
      case EntryType.TRANSFER: return '振替';
      case EntryType.INITIAL_BALANCE: return '初期残高';
      default: return 'エントリ';
    }
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
    
    try {
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
    } catch (error) {
      // エラーを明示的に BusinessRuleError にラップして詳細を追加
      if (error instanceof BusinessRuleError) {
        throw error;  // すでにBusinessRuleErrorならそのままスロー
      } else {
        throw new BusinessRuleError(
          'エントリの作成に失敗しました',
          BusinessRuleErrorCode.INVALID_INPUT,
          { originalError: error }
        );
      }
    }
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