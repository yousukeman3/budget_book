/**
 * Debt（貸借管理）のドメインモデル
 * 
 * 借入・貸付とその返済状況を管理するためのドメインモデル。
 * Entry（収支記録）と連携し、借入金・貸付金の状態を追跡します。
 * 
 * @module Debt
 */
import { Decimal, toDecimal } from '../../../shared/utils/decimal';
import { BusinessRuleError } from '../../../shared/errors/AppError';
import { BusinessRuleErrorCode } from '../../../shared/errors/ErrorCodes';
import { validateWithSchema } from '../../../shared/validation/validateWithSchema';
import { DebtSchema, DebtCreateSchema, DebtRepaymentSchema } from '../../../shared/zod/schema/DebtSchema';
import { DebtType } from '../../../shared/types/debt.types';

/**
 * Debt（貸借）のドメインインターフェース
 * 借入・貸付とその状態管理
 */
export interface IDebt {
  id: string;
  /** 借入/貸付タイプ */
  type: DebtType;
  /** 起点となるエントリーID */
  rootEntryId: string;
  /** 発生日 */
  date: Date;
  /** 金額（元本） */
  amount: number;
  /** 相手情報（名前、識別子など） */
  counterpart: string;
  /** 返済完了日（完済した場合のみ） */
  repaidAt?: Date | null;
  /** 任意の備考 */
  memo?: string | null;
}

/**
 * Debt作成用の入力型
 */
export type DebtCreateInput = Omit<IDebt, 'id'>;

/**
 * Debt更新用の入力型
 */
export type DebtUpdateInput = Partial<Omit<IDebt, 'id' | 'rootEntryId' | 'type'>>;

/**
 * Debtドメインエンティティクラス
 * 貸し借りの状態管理と返済追跡を行う
 */
export class Debt {
  constructor(
    public readonly id: string,
    public readonly type: DebtType,
    public readonly rootEntryId: string,
    public readonly date: Date,
    public readonly amount: Decimal,
    public readonly counterpart: string,
    public readonly repaidAt: Date | null = null,
    public readonly memo: string | null = null
  ) {
    // インスタンス作成時にZodスキーマでバリデーション
    // これによりすべての不変条件をチェックする
    validateWithSchema(DebtSchema, this);
  }

  /**
   * 入力データからDebtオブジェクトを作成するファクトリーメソッド
   * バリデーションも実施
   */
  static create(data: {
    type: DebtType;
    rootEntryId: string;
    date: Date;
    amount: Decimal | number | string;
    counterpart: string;
    repaidAt?: Date | null;
    memo?: string | null;
    id?: string;
  }): Debt {
    // id がない場合は UUID を生成
    const id = data.id || crypto.randomUUID();
    
    try {
      // 金額をDecimal型に変換
      const amount = toDecimal(data.amount);
      
      // データを検証（これにより型安全性が確保される）
      const validData = validateWithSchema(DebtCreateSchema, {
        ...data,
        amount,
        id // 明示的にidを設定
      });
      
      return new Debt(
        id,
        validData.type,
        validData.rootEntryId,
        validData.date,
        validData.amount,
        validData.counterpart,
        validData.repaidAt || null,
        validData.memo || null
      );
    } catch (error) {
      // エラーを明示的に BusinessRuleError にラップして詳細を追加
      if (error instanceof BusinessRuleError) {
        throw error;  // すでにBusinessRuleErrorならそのままスロー
      } else {
        throw new BusinessRuleError(
          '借入/貸付の作成に失敗しました',
          BusinessRuleErrorCode.INVALID_INPUT,
          { originalError: error }
        );
      }
    }
  }

  /**
   * 債務が完済済みかどうかを確認
   * @returns 完済している場合true
   */
  isRepaid(): boolean {
    return !!this.repaidAt;
  }

  /**
   * 借入かどうかを判定
   * @returns 借入の場合true
   */
  isBorrow(): boolean {
    return this.type === 'borrow';
  }

  /**
   * 貸付かどうかを判定
   * @returns 貸付の場合true
   */
  isLend(): boolean {
    return this.type === 'lend';
  }

  /**
   * 返済マークを付けたDebtオブジェクトを生成
   * 注: 実際の残高チェック等は呼び出し元で行う必要がある
   * 
   * @param repaidAt 返済日（指定がなければ現在日時）
   * @returns 返済済みマークが付いた新しいDebtオブジェクト
   */
  markAsRepaid(repaidAt: Date = new Date()): Debt {
    // 返済済みかどうかのチェックをZodスキーマで行う
    validateWithSchema(DebtRepaymentSchema, this);

    return new Debt(
      this.id,
      this.type,
      this.rootEntryId,
      this.date,
      this.amount,
      this.counterpart,
      repaidAt,
      this.memo
    );
  }
}