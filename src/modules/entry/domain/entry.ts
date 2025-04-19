/**
 * Entry（収支記録）のドメインモデル
 * 
 * 収入・支出・借入・貸付・返済など、すべての金銭の動きを記録する基本単位です。
 * このドメインモデルは金銭の流れを表現し、残高計算・レポート集計の基礎となります。
 */
import { Decimal, toDecimal } from '../../../shared/utils/decimal';
import { BusinessRuleError } from '../../../shared/errors/AppError';
import { BusinessRuleErrorCode } from '../../../shared/errors/ErrorCodes';
import { EntryType } from '../../../shared/types/entry.types';
import type { Validator } from '../../../shared/validation/Validator';

/**
 * Entryモデル（収支記録）インターフェース
 * 金銭の流れを記録する基本単位の型定義
 */
export interface IEntry {
  /** 
   * エントリーの一意識別子（UUIDv4） 
   * 
   * @remarks
   * UUIDv4形式の文字列。新規作成時は`crypto.randomUUID()`で自動生成される。
   * すべての操作の追跡や参照に使用される一意の識別子。
   */
  id: string;
  
  /** 
   * エントリータイプ（収入/支出/借入/貸付/返済/返済受取/振替/初期残高） 
   * 
   * @remarks
   * EntryTypeは金銭の流れの性質を表す列挙型で、`'income'`、`'expense'`など
   * あらかじめ定義された値のみを取ることができる。
   * タイプごとに処理ロジックやUIでの表示方法が異なる。
   * {@link EntryType} の値が設定されます
   */
  type: EntryType;
  
  /** 
   * 発生日 
   * 
   * @remarks
   * 金銭の移動が発生した日付（ローカルタイム基準）
   * 日付はUTC日付からローカルタイムに変換して扱われる
   */
  date: Date;
  
  /** 
   * 金額（正の数）
   * 
   * @remarks
   * 0より大きい数値である必要がある
   * 内部的にはDecimal型で厳密に管理される
   */
  amount: Decimal;
  
  /** 
   * 支払い方法のID（Method.idへの参照） 
   * 
   * @remarks
   * UUIDv4形式の文字列で、アクティブな（archived=false）Methodである必要がある
   * この支払い方法の残高が実際に増減する
   */
  methodId: string;
  
  /** 
   * カテゴリID（任意、収支系のみ使用） 
   * 
   * @remarks
   * 収入/支出タイプのエントリーで使用される
   * UUIDv4形式の文字列で、存在するCategoryを参照する必要がある
   * レポート生成時のカテゴリ別集計に使用される
   */
  categoryId?: string | null;
  
  /** 
   * 表向きの使途 
   * 
   * @remarks
   * 集計やUI表示対象となる公開用の目的
   * 任意入力だが、レポートやフィルタリングに使用される重要な情報
   */
  purpose?: string | null;
  
  /** 
   * 非公開の実際の使途 
   * 
   * @remarks
   * UI非表示・集計対象外の非公開情報
   * レポートでは表示されず、必要な場合のみ詳細画面で確認できる
   */
  privatePurpose?: string | null;
  
  /** 
   * 補足情報・文脈情報 
   * 
   * @remarks
   * タグ、状況、文脈などの自由記述
   * 検索やフィルタリングに利用可能
   */
  note?: string | null;
  
  /** 
   * 証憑情報 
   * 
   * @remarks
   * アプリ内保存リソースへのURIが格納される場合がある
   * URIが含まれる場合は必ず内部リソースを参照する必要がある（外部URLは禁止）
   */
  evidenceNote?: string | null;
  
  /** 
   * 関連する借入/貸付ID 
   * 
   * @remarks
   * 借入／貸付／返済時に必須となるDebtモデルへの参照
   * UUIDv4形式の文字列で、type='borrow'/'lend'/'repayment'/'repayment_receive'の場合は必須
   */
  debtId?: string | null;
  
  /** 
   * 作成日時 
   * 
   * @remarks
   * このEntryレコードが作成された日時（システム管理用）
   */
  createdAt: Date;
}

/**
 * Entry作成用の入力型
 * 
 * @remarks
 * IEntryから'id'と'createdAt'フィールドを除いた型
 * 新規作成時にはIDと作成日時は自動生成されるため不要
 */
export type EntryCreateInput = Omit<IEntry, 'id' | 'createdAt'>;

/**
 * Entry更新用の入力型
 * 
 * @remarks
 * IEntryから'id'、'createdAt'、'type'フィールドを除いた部分的な型
 * 作成後に変更不可能な項目は除外されている
 */
export type EntryUpdateInput = Partial<Omit<IEntry, 'id' | 'createdAt' | 'type'>>;

/**
 * Entryのドメインバリデーション実行
 * ビジネスルールに反する場合はBusinessRuleErrorを投げます
 * 
 * @remarks
 * このバリデーション関数はEntryの不変条件を確認し、違反があればエラーを発生させます
 * 
 * @param entry - 検証対象のエントリ
 * @throws {@link BusinessRuleError} ビジネスルール違反時にBusinessRuleErrorをスローします
 */
export function validateEntryBusinessRules(entry: IEntry | EntryCreateInput): void {
  // 金額の検証（正の数であること）
  if (entry.amount.isNegative() || entry.amount.isZero()) {
    throw new BusinessRuleError(
      '金額は0より大きい値を入力してください',
      BusinessRuleErrorCode.INVALID_VALUE_RANGE,
      { field: 'amount', value: entry.amount }
    );
  }

  // 借入/貸付/返済系の場合はdebtIdが必要
  if ((entry.type === 'borrow' || entry.type === 'lend' || 
       entry.type === 'repayment' || entry.type === 'repayment_receive') && 
      !entry.debtId) {
    throw new BusinessRuleError(
      `${entry.type}タイプのエントリには借入/貸付IDが必要です`,
      BusinessRuleErrorCode.INVALID_INPUT,
      { field: 'debtId', type: entry.type }
    );
  }

  // 日付のバリデーション（省略）
  // ...
}

/**
 * 収支タイプによってカテゴリが必須かどうかを判定
 * 
 * @remarks
 * 収入と支出のエントリータイプの場合のみカテゴリ分類が必要
 * 
 * @param type - エントリータイプ（EntryType列挙型）
 * @returns カテゴリーが必須の場合true
 */
export function isCategoryRequired(type: EntryType): boolean {
  return type === 'income' || type === 'expense';
}

/**
 * 収支が借入/貸付系かどうかを判定
 * 
 * @remarks
 * 借入、貸付、返済、返済受取のいずれかのタイプであれば借入/貸付関連と判定
 * これらはすべてDebtオブジェクトと関連付けられる必要がある
 * 
 * @param type - エントリータイプ（EntryType列挙型）
 * @returns 借入/貸付系の場合true
 */
export function isDebtRelatedEntry(type: EntryType): boolean {
  return type === 'borrow' || type === 'lend' || 
         type === 'repayment' || type === 'repayment_receive';
}

/**
 * 収支が振替かどうかを判定
 * 
 * @remarks
 * 振替タイプの場合はTransferオブジェクトと関連付けられる必要がある
 * 
 * @param type - エントリータイプ（EntryType列挙型）
 * @returns 振替の場合true
 */
export function isTransferEntry(type: EntryType): boolean {
  return type === 'transfer';
}

/**
 * 収支が初期残高かどうかを判定
 * 
 * @remarks
 * 初期残高タイプはMethodの作成時に自動生成される特殊なエントリー
 * 
 * @param type - エントリータイプ（EntryType列挙型）
 * @returns 初期残高の場合true
 */
export function isInitialBalanceEntry(type: EntryType): boolean {
  return type === 'initial_balance';
}

/**
 * Entryドメインエンティティクラス
 * 収支記録の中核となるドメインモデル
 */
export class Entry implements IEntry {
  /**
   * Entryオブジェクトのコンストラクタ
   * 
   * @param id - エントリの一意識別子（UUIDv4形式）
   * @param type - エントリタイプ（EntryType列挙型で定義された値）
   * @param date - 発生日（Date型、ローカルタイム基準）
   * @param amount - 金額（Decimal型、0より大きい値が必須）
   * @param methodId - 支払い方法ID（UUIDv4形式、アクティブなMethodの参照）
   * @param categoryId - カテゴリID（任意、収入/支出タイプの場合に推奨）
   * @param purpose - 表向きの使途（任意、レポートに表示される）
   * @param privatePurpose - 非公開の使途（任意、レポートには表示されない）
   * @param note - 補足情報（任意、検索・フィルタリング可能）
   * @param evidenceNote - 証憑情報（任意、内部リソース参照のみ許可）
   * @param debtId - 関連する借入/貸付ID（借入/貸付/返済系タイプの場合は必須）
   * @param createdAt - 作成日時（デフォルトは現在時刻）
   * @param validator - オプションのバリデーター。指定された場合、追加のバリデーションを実行
   * @throws {@link BusinessRuleError} バリデーション失敗時にBusinessRuleErrorをスローします
   */
  constructor(
    public readonly id: string,
    public readonly type: EntryType,
    public readonly date: Date,
    public readonly amount: Decimal,
    public readonly methodId: string,
    public readonly categoryId?: string | null,
    public readonly purpose?: string | null,
    public readonly privatePurpose?: string | null,
    public readonly note?: string | null,
    public readonly evidenceNote?: string | null,
    public readonly debtId?: string | null,
    public readonly createdAt: Date = new Date(),
    validator?: Validator<unknown>
  ) {
    // 不変条件のチェック
    validateEntryBusinessRules({
      id,
      type,
      date,
      amount: amount, // validateEntryBusinessRulesはnumber型を期待
      methodId,
      categoryId,
      purpose,
      privatePurpose,
      note,
      evidenceNote,
      debtId,
      createdAt
    });

    // 外部から注入されたバリデーターがあれば使用
    if (validator) {
      validator.validate(this);
    }
  }

  /**
   * 入力データからEntryオブジェクトを作成するファクトリーメソッド
   * バリデーションも実施します
   * 
   * @remarks
   * IDが指定されていない場合は`crypto.randomUUID()`で自動生成します
   * 金額はDecimal型に変換され、0より大きい値であることが検証されます
   * 借入/貸付/返済系の場合はdebtIdの指定が必須です
   * 
   * @param data - エントリ作成のための入力データ
   * @param validator - オプションのバリデーター。入力データの検証に使用
   * @returns 新しいEntryオブジェクト
   * @throws {@link BusinessRuleError} バリデーション失敗時にBusinessRuleErrorをスローします
   */
  static create(
    data: {
      type: EntryType;
      date: Date;
      amount: Decimal | number | string;
      methodId: string;
      categoryId?: string | null;
      purpose?: string | null;
      privatePurpose?: string | null;
      note?: string | null;
      evidenceNote?: string | null;
      debtId?: string | null;
      id?: string;
      createdAt?: Date;
    },
    validator?: Validator<unknown>
  ): Entry {
    // id がない場合は UUID を生成
    const id = data.id || crypto.randomUUID();
    const createdAt = data.createdAt || new Date();
    
    try {
      // 金額をDecimal型に変換
      const amount = toDecimal(data.amount);
      
      // 入力データのバリデーション
      let validData = { ...data, amount, id, createdAt };
      
      // 外部から注入されたバリデーターがあれば使用
      if (validator) {
        validData = validator.validate(validData) as typeof validData;
      }
      
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
        validData.createdAt,
        validator // バリデーターを引き継ぐ
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
   * 
   * @remarks
   * 収入、借入、返済受取の場合は残高が増加するため収入系として扱う
   * 
   * @returns 収入系の場合true（収入、借入、返済受取）
   */
  isIncome(): boolean {
    return this.type === EntryType.INCOME || 
           this.type === EntryType.BORROW || 
           this.type === EntryType.REPAYMENT_RECEIVE;
  }

  /**
   * このエントリが支出系か判定
   * 
   * @remarks
   * 支出、貸付、返済の場合は残高が減少するため支出系として扱う
   * 
   * @returns 支出系の場合true（支出、貸付、返済）
   */
  isExpense(): boolean {
    return this.type === EntryType.EXPENSE || 
           this.type === EntryType.LEND || 
           this.type === EntryType.REPAYMENT;
  }

  /**
   * このエントリが転送系か判定
   * 
   * @remarks
   * 振替タイプの場合はTransferオブジェクトと関連付けられる
   * 
   * @returns 振替の場合true
   */
  isTransfer(): boolean {
    return this.type === EntryType.TRANSFER;
  }

  /**
   * このエントリが初期残高か判定
   * 
   * @remarks
   * 初期残高タイプはMethodの作成時に自動生成される特殊なエントリー
   * 
   * @returns 初期残高の場合true
   */
  isInitialBalance(): boolean {
    return this.type === EntryType.INITIAL_BALANCE;
  }

  /**
   * このエントリが貸借系か判定
   * 
   * @remarks
   * 借入、貸付、返済、返済受取のいずれかの場合、Debtオブジェクトと関連付けられる
   * 
   * @returns 貸借関連の場合true（借入、貸付、返済、返済受取）
   */
  isDebtRelated(): boolean {
    return this.type === EntryType.BORROW || 
           this.type === EntryType.LEND ||
           this.type === EntryType.REPAYMENT || 
           this.type === EntryType.REPAYMENT_RECEIVE;
  }

  /**
   * Method残高への影響額を計算
   * 
   * @remarks
   * このメソッドは指定されたmethodIdの残高にどのような影響を与えるかを計算します
   * 収入系はプラス、支出系はマイナスの影響を与えます
   * 振替の場合は、このメソッドだけでは完全な影響を判断できず、
   * 追加でTransferオブジェクトの参照が必要です
   * 
   * @returns 残高への影響額（Decimal）。収入系ならプラス、支出系ならマイナス
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