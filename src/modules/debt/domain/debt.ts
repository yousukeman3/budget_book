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
  /** 
   * エントリーの一意識別子（UUIDv4） 
   * 
   * @remarks
   * UUIDv4形式の文字列。新規作成時は`crypto.randomUUID()`で自動生成される。
   */
  id: string;
  
  /** 
   * 借入/貸付タイプ 
   * 
   * @remarks
   * DebtTypeは'borrow'（借入）または'lend'（貸付）のいずれかのみ。
   * 借入は自分が他者からお金を借りた状態、貸付は自分が他者にお金を貸した状態を表す。
   * {@link DebtType} の値が設定されます
   */
  type: DebtType;
  
  /** 
   * 起点となるエントリーID 
   * 
   * @remarks
   * 借入/貸付を記録した元のEntry（type: 'borrow'または'lend'）と紐づけられる
   * UUIDv4形式の文字列で、必ず存在するEntryを参照する必要がある
   */
  rootEntryId: string;
  
  /** 
   * 発生日 
   * 
   * @remarks
   * 借入/貸付が行われた日付（ローカルタイム基準）
   * 日付はUTC日付からローカルタイムに変換して扱われる
   */
  date: Date;
  
  /** 
   * 金額（元本） 
   * 
   * @remarks
   * 0より大きい数値である必要がある
   * 内部的にはDecimal型で厳密に管理される
   */
  amount: Decimal;
  
  /** 
   * 相手情報 
   * 
   * @remarks
   * 名前、識別子など、取引相手を特定するための情報
   * 必須項目で空文字は許容されない
   */
  counterpart: string;
  
  /** 
   * 返済完了日 
   * 
   * @remarks
   * 完済した場合のみ設定される。未返済の場合はnullまたはundefined
   * 設定する場合は、必ず発生日（date）以降の日付である必要がある
   */
  repaidAt?: Date | null;
  
  /** 
   * 任意の備考 
   * 
   * @remarks
   * 追加情報を自由形式で記録する
   * 任意項目のため、nullまたはundefinedも許容される
   */
  memo?: string | null;
}

/**
 * Debt作成用の入力型
 * 
 * @remarks
 * IDebtから`id`フィールドを除いた型
 * 新規作成時にはIDは自動生成されるため不要
 */
export type DebtCreateInput = Omit<IDebt, 'id'>;

/**
 * Debt更新用の入力型
 * 
 * @remarks
 * IDebtから`id`, `rootEntryId`, `type`フィールドを除いた部分的な型
 * 作成後に変更不可能な項目は除外されている
 */
export type DebtUpdateInput = Partial<Omit<IDebt, 'id' | 'rootEntryId' | 'type'>>;

/**
 * Debtドメインエンティティクラス
 * 貸し借りの状態管理と返済追跡を行うドメインモデル
 */
export class Debt implements IDebt {
  /**
   * Debtオブジェクトのコンストラクタ
   * 
   * @param id - 貸借の一意識別子（UUIDv4形式）
   * @param type - 貸借タイプ（borrow:借入/lend:貸付）。DebtType列挙型で定義
   * @param rootEntryId - 起点となるエントリーID（UUIDv4形式）
   * @param date - 発生日（Date型）
   * @param amount - 金額（元本、Decimal型、0より大きい値が必須）
   * @param counterpart - 相手情報（必須、空でないこと）
   * @param repaidAt - 返済完了日（完済した場合のみ設定、date以降の日付が必須）
   * @param memo - 任意の備考（任意）
   * @param validator - オプションのバリデーター。指定された場合、追加のバリデーションを実行
   * @throws {@link BusinessRuleError} バリデーション失敗時にBusinessRuleErrorをスローします
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
   * @remarks
   * IDが指定されていない場合は`crypto.randomUUID()`で自動生成します
   * 金額はDecimal型に変換され、0より大きい値であることが検証されます
   * 
   * @param data - 貸借作成のための入力データ
   * @param validator - オプションのバリデーター。入力データの検証に使用
   * @returns 新しいDebtオブジェクト
   * @throws {@link BusinessRuleError} バリデーション失敗時にBusinessRuleErrorをスローします
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
   * 
   * @remarks
   * repaidAtフィールドの有無で判定します
   * 
   * @returns 完済している場合`true`
   */
  isRepaid(): boolean {
    return !!this.repaidAt;
  }

  /**
   * 借入かどうかを判定
   * 
   * @remarks
   * DebtTypeが'borrow'の場合に借入と判定します
   * 
   * @returns 借入の場合`true`
   */
  isBorrow(): boolean {
    return this.type === 'borrow';
  }

  /**
   * 貸付かどうかを判定
   * 
   * @remarks
   * DebtTypeが'lend'の場合に貸付と判定します
   * 
   * @returns 貸付の場合`true`
   */
  isLend(): boolean {
    return this.type === 'lend';
  }

  /**
   * 返済マークを付けたDebtオブジェクトを生成
   * 
   * @remarks
   * 不変性を保つため、元のオブジェクトは変更せず新しいインスタンスを返します
   * すでに返済済み（repaidAtが設定済み）の場合はエラーになります
   * 返済日は必ず発生日以降である必要があります
   * 
   * @param repaidAt - 返済日（指定がなければ現在日時）
   * @param validator - オプションのバリデーター。返済可能か検証する
   * @returns 返済済みマークが付いた新しいDebtオブジェクト
   * @throws {@link BusinessRuleError} すでに返済済みの場合にBusinessRuleErrorコード`DEBT_ALREADY_REPAID`をスローします
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

  /**
   * 債務のメモを更新したDebtオブジェクトを生成
   * 
   * @remarks
   * 不変性を保つため、元のオブジェクトは変更せず新しいインスタンスを返します
   * 
   * @param memo - 新しいメモ（nullまたはundefinedも許容）
   * @returns メモが更新された新しいDebtオブジェクト
   */
  updateMemo(memo: string | null): Debt {
    return new Debt(
      this.id,
      this.type,
      this.rootEntryId,
      this.date,
      this.amount,
      this.counterpart,
      this.repaidAt,
      memo,
      undefined // バリデーターは不要
    );
  }

  /**
   * 債務の相手情報を更新したDebtオブジェクトを生成
   * 
   * @remarks
   * 不変性を保つため、元のオブジェクトは変更せず新しいインスタンスを返します
   * 
   * @param counterpart - 新しい相手情報（空文字は許容されない）
   * @returns 相手情報が更新された新しいDebtオブジェクト
   */
  updateCounterpart(counterpart: string): Debt {
    if (counterpart === '') {
      throw new BusinessRuleError(
        '相手情報は空文字にできません',
        BusinessRuleErrorCode.INVALID_INPUT,
        { debtId: this.id }
      );
    }
    return new Debt(
      this.id,
      this.type,
      this.rootEntryId,
      this.date,
      this.amount,
      counterpart,
      this.repaidAt,
      this.memo,
      undefined // バリデーターは不要
    );
  }
}