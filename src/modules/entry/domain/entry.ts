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
import { EntrySchema, EntryCreateSchema } from '../../../shared/zod/schema/EntrySchema';
import { validateWithSchema } from '../../../shared/validation/validateWithSchema';

/**
 * Entryモデル（収支記録）インターフェース
 * 金銭の流れを記録する基本単位の型定義
 */
export interface IEntry {
  /** エントリーの一意識別子（UUIDv4） */
  id: string;
  
  /** 
   * エントリータイプ（収入/支出/借入/貸付/返済/返済受取/振替/初期残高） 
   * {@link EntryType} の値が設定されます
   */
  type: EntryType;
  
  /** 
   * 発生日 
   * 
   * 金銭の移動が発生した日付（ローカルタイム基準）
   */
  date: Date;
  
  /** 
   * 金額（正の数）
   * 
   * 0より大きい数値である必要があります 
   */
  amount: number;
  
  /** 支払い方法のID（Method.idへの参照） */
  methodId: string;
  
  /** 
   * カテゴリID（任意、収支系のみ使用） 
   * 
   * 収入/支出タイプのエントリーで使用されます
   */
  categoryId?: string | null;
  
  /** 
   * 表向きの使途 
   * 
   * 集計やUI表示対象となる公開用の目的
   */
  purpose?: string | null;
  
  /** 
   * 非公開の実際の使途 
   * 
   * UI非表示・集計対象外の非公開情報
   */
  privatePurpose?: string | null;
  
  /** 
   * 補足情報・文脈情報 
   * 
   * タグ、状況、文脈などの自由記述
   */
  note?: string | null;
  
  /** 
   * 証憑情報 
   * 
   * アプリ内保存リソースへのURIが格納される場合があります
   */
  evidenceNote?: string | null;
  
  /** 
   * 関連する借入/貸付ID 
   * 
   * 借入／貸付／返済時に必須となるDebtモデルへの参照
   */
  debtId?: string | null;
  
  /** 作成日時 */
  createdAt: Date;
}

/**
 * Entry作成用の入力型
 * 
 * IEntryから'id'と'createdAt'フィールドを除いた型
 */
export type EntryCreateInput = Omit<IEntry, 'id' | 'createdAt'>;

/**
 * Entry更新用の入力型
 * 
 * IEntryから'id'、'createdAt'、'type'フィールドを除いた部分的な型
 */
export type EntryUpdateInput = Partial<Omit<IEntry, 'id' | 'createdAt' | 'type'>>;

/**
 * Entryのドメインバリデーション実行
 * ビジネスルールに反する場合はBusinessRuleErrorを投げます
 * 
 * @param entry - 検証対象のエントリ
 * @throws ビジネスルール違反時にBusinessRuleErrorをスローします
 */
export function validateEntryBusinessRules(entry: IEntry | EntryCreateInput): void {
  // 金額の検証（正の数であること）
  if (entry.amount <= 0) {
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
 * @param type - エントリータイプ
 * @returns カテゴリーが必須の場合true
 */
export function isCategoryRequired(type: EntryType): boolean {
  return type === 'income' || type === 'expense';
}

/**
 * 収支が借入/貸付系かどうかを判定
 * 
 * @param type - エントリータイプ
 * @returns 借入/貸付系の場合true
 */
export function isDebtRelatedEntry(type: EntryType): boolean {
  return type === 'borrow' || type === 'lend' || 
         type === 'repayment' || type === 'repayment_receive';
}

/**
 * 収支が振替かどうかを判定
 * 
 * @param type - エントリータイプ
 * @returns 振替の場合true
 */
export function isTransferEntry(type: EntryType): boolean {
  return type === 'transfer';
}

/**
 * 収支が初期残高かどうかを判定
 * 
 * @param type - エントリータイプ
 * @returns 初期残高の場合true
 */
export function isInitialBalanceEntry(type: EntryType): boolean {
  return type === 'initial_balance';
}

/**
 * Entryドメインエンティティクラス
 * 収支記録の中核となるドメインモデル
 */
export class Entry {
  /**
   * Entryオブジェクトのコンストラクタ
   * 
   * @param id - エントリの一意識別子
   * @param type - エントリタイプ
   * @param date - 発生日
   * @param amount - 金額（Decimal）
   * @param methodId - 支払い方法ID
   * @param categoryId - カテゴリID（任意）
   * @param purpose - 表向きの使途（任意）
   * @param privatePurpose - 非公開の使途（任意）
   * @param note - 補足情報（任意）
   * @param evidenceNote - 証憑情報（任意）
   * @param debtId - 関連する借入/貸付ID（任意）
   * @param createdAt - 作成日時
   * @throws バリデーション失敗時にBusinessRuleErrorをスローします
   */
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
    // インスタンス作成時にZodスキーマでバリデーションを一元的に行う
    // Zodスキーマには金額の正値チェックやエントリタイプと関連フィールドの整合性チェックが含まれている
    validateWithSchema(EntrySchema, this);
  }

  /**
   * 入力データからEntryオブジェクトを作成するファクトリーメソッド
   * バリデーションも実施します
   * 
   * @param data - エントリ作成のための入力データ
   * @returns 新しいEntryオブジェクト
   * @throws バリデーション失敗時にBusinessRuleErrorをスローします
   */
  static create(data: {
    type: EntryType;
    date: Date;
    amount: Decimal | number | string;
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
      // 金額をDecimal型に変換
      const amount = toDecimal(data.amount);
      
      // データを検証（これにより型安全性が確保される）
      const validData = validateWithSchema(EntryCreateSchema, {
        ...data,
        amount,
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
   * @returns 収入系の場合true（収入、借入、返済受取）
   */
  isIncome(): boolean {
    return this.type === EntryType.INCOME || 
           this.type === EntryType.BORROW || 
           this.type === EntryType.REPAYMENT_RECEIVE;
  }

  /**
   * このエントリが支出系か判定
   * @returns 支出系の場合true（支出、貸付、返済）
   */
  isExpense(): boolean {
    return this.type === EntryType.EXPENSE || 
           this.type === EntryType.LEND || 
           this.type === EntryType.REPAYMENT;
  }

  /**
   * このエントリが転送系か判定
   * @returns 振替の場合true
   */
  isTransfer(): boolean {
    return this.type === EntryType.TRANSFER;
  }

  /**
   * このエントリが初期残高か判定
   * @returns 初期残高の場合true
   */
  isInitialBalance(): boolean {
    return this.type === EntryType.INITIAL_BALANCE;
  }

  /**
   * このエントリが貸借系か判定
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
   * @returns 残高への影響額（Decimal）。収入系ならプラス、支出系ならマイナス
   * 
   * 振替の場合は、このメソッドだけでは完全な影響を判断できません。
   * entryId=rootEntryIdのTransferを参照してfromMethod/toMethodどちらかを確認する必要があります。
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