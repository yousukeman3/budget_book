/**
 * Debt（貸借管理）のドメインモデル
 * 
 * 借入・貸付とその返済状況を管理するためのドメインモデル。
 * Entry（収支記録）と連携し、借入金・貸付金の状態を追跡します。
 */
import { toDecimal } from '../../../shared/utils/decimal';
import type { Decimal } from '../../../shared/utils/decimal';
import { BusinessRuleError } from '../../../shared/errors/AppError';
import { BusinessRuleErrorCode } from '../../../shared/errors/ErrorCodes';
import type { DebtType } from '../../../shared/types/debt.types';
import type { Validator } from '../../../shared/validation/Validator';

/**
 * Debt（貸借）のドメインインターフェース
 * 借入・貸付とその状態管理の型定義
 */
export interface IDebt {
  /** エントリーの一意識別子（UUIDv4） */
  id: string;
  
  /** 
   * 借入/貸付タイプ 
   * {@link DebtType} の値が設定されます
   */
  type: DebtType;
  
  /** 
   * 起点となるエントリーID 
   * 
   * 借入/貸付を記録したEntryと紐づけられます
   */
  rootEntryId: string;
  
  /** 
   * 発生日 
   * 
   * 借入/貸付が行われた日付（ローカルタイム基準）
   */
  date: Date;
  
  /** 
   * 金額（元本） 
   * 
   * 0より大きい数値である必要があります
   */
  amount: number;
  
  /** 
   * 相手情報 
   * 
   * 名前、識別子など、取引相手を特定するための情報
   */
  counterpart: string;
  
  /** 
   * 返済完了日 
   * 
   * 完済した場合のみ設定されます。未返済の場合はnullまたはundefined
   */
  repaidAt?: Date | null;
  
  /** 
   * 任意の備考 
   * 
   * 追加情報を自由形式で記録します
   */
  memo?: string | null;
}

/**
 * Debt作成用の入力型
 * 
 * IDebtから`id`フィールドを除いた型
 */
export type DebtCreateInput = Omit<IDebt, 'id'>;

/**
 * Debt更新用の入力型
 * 
 * IDebtから`id`, `rootEntryId`, `type`フィールドを除いた部分的な型
 */
export type DebtUpdateInput = Partial<Omit<IDebt, 'id' | 'rootEntryId' | 'type'>>;

/**
 * Debtドメインエンティティクラス
 * 貸し借りの状態管理と返済追跡を行うドメインモデル
 */
export class Debt {
  /**
   * Debtオブジェクトのコンストラクタ
   * 
   * @param id - 貸借の一意識別子
   * @param type - 貸借タイプ（borrow/lend）
   * @param rootEntryId - 起点となるエントリーID
   * @param date - 発生日
   * @param amount - 金額（元本、Decimal）
   * @param counterpart - 相手情報
   * @param repaidAt - 返済完了日（完済した場合のみ）
   * @param memo - 任意の備考
   * @param validator - オプションのバリデーター。指定された場合、追加のバリデーションを実行
   * @throws バリデーション失敗時にBusinessRuleErrorをスローします
   */
  constructor(
    public readonly id: string,
    public readonly type: DebtType,
    public readonly rootEntryId: string,
    public readonly date: Date,
    public readonly amount: Decimal,
    public readonly counterpart: string,
    public readonly repaidAt: Date | null = null,
    public readonly memo: string | null = null,
    validator?: Validator<unknown>
  ) {
    // 不変条件のチェック - 金額が0より大きい
    if (amount.lessThanOrEqualTo(0)) {
      throw new BusinessRuleError(
        '貸借金額は0より大きい値である必要があります',
        BusinessRuleErrorCode.INVALID_VALUE_RANGE,
        { field: 'amount', value: amount.toString() }
      );
    }
    
    // 返済日がある場合、発生日以降であることを確認
    if (repaidAt && repaidAt < date) {
      throw new BusinessRuleError(
        '返済日は貸付/借入日より前の日付にはできません',
        BusinessRuleErrorCode.INVALID_DATE_RANGE,
        { 
          field: 'repaidAt',
          debtDate: date.toISOString(),
          repaidAt: repaidAt.toISOString()
        }
      );
    }

    // 外部から注入されたバリデーターがあれば使用
    if (validator) {
      validator.validate(this);
    }
  }

  /**
   * 入力データからDebtオブジェクトを作成するファクトリーメソッド
   * バリデーションも実施します
   * 
   * @param data - 貸借作成のための入力データ
   * @param validator - オプションのバリデーター。入力データの検証に使用
   * @returns 新しいDebtオブジェクト
   * @throws バリデーション失敗時にBusinessRuleErrorをスローします
   */
  static create(
    data: {
      type: DebtType;
      rootEntryId: string;
      date: Date;
      amount: Decimal | number | string;
      counterpart: string;
      repaidAt?: Date | null;
      memo?: string | null;
      id?: string;
    },
    validator?: Validator<unknown>
  ): Debt {
    // id がない場合は UUID を生成
    const id = data.id || crypto.randomUUID();
    
    try {
      // 金額をDecimal型に変換
      const amount = toDecimal(data.amount);
      
      // 入力データのバリデーション
      let validData = { ...data, amount, id };
      
      // 外部から注入されたバリデーターがあれば使用
      if (validator) {
        validData = validator.validate(validData) as typeof validData;
      }
      
      return new Debt(
        id,
        validData.type,
        validData.rootEntryId,
        validData.date,
        validData.amount,
        validData.counterpart,
        validData.repaidAt || null,
        validData.memo || null,
        validator // バリデーターを引き継ぐ
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
   * @returns 完済している場合`true`
   */
  isRepaid(): boolean {
    return !!this.repaidAt;
  }

  /**
   * 借入かどうかを判定
   * @returns 借入の場合`true`
   */
  isBorrow(): boolean {
    return this.type === 'borrow';
  }

  /**
   * 貸付かどうかを判定
   * @returns 貸付の場合`true`
   */
  isLend(): boolean {
    return this.type === 'lend';
  }

  /**
   * 返済マークを付けたDebtオブジェクトを生成
   * 
   * @param repaidAt - 返済日（指定がなければ現在日時）
   * @param validator - オプションのバリデーター。返済可能か検証する
   * @returns 返済済みマークが付いた新しいDebtオブジェクト
   * @throws すでに返済済みの場合にBusinessRuleErrorをスローします
   * 
   * 実際の残高チェック等は呼び出し元で行う必要があります
   */
  markAsRepaid(repaidAt: Date = new Date(), validator?: Validator<unknown>): Debt {
    // 既に返済済みかチェック
    if (this.repaidAt) {
      throw new BusinessRuleError(
        'すでに返済済みの借入/貸付です',
        BusinessRuleErrorCode.DEBT_ALREADY_REPAID,
        { debtId: this.id, repaidAt: this.repaidAt }
      );
    }

    // バリデーターがあれば使用（追加の返済ルール検証など）
    if (validator) {
      validator.validate(this);
    }

    return new Debt(
      this.id,
      this.type,
      this.rootEntryId,
      this.date,
      this.amount,
      this.counterpart,
      repaidAt,
      this.memo,
      validator // バリデーターを引き継ぐ
    );
  }
}