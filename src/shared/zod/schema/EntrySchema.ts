/**
 * Entry（収支記録）のZodスキーマ定義
 * 
 * 収入・支出・借入・貸付・返済など、すべての金銭の動きを表現するEntryモデルの
 * バリデーションルールをZodスキーマとして定義するモジュールです。
  */
import { z } from 'zod';
import { Decimal } from '../../../shared/utils/decimal';
import { EntryType } from '../../types/entry.types';
import { BusinessRuleErrorCode } from '../../errors/ErrorCodes';

/**
 * Entryの基本スキーマ定義
 * すべてのフィールドの基本バリデーションルールを定義します
 */
const baseEntrySchema = z.object({
  /** 
   * Entryの一意識別子
   * 
   * @remarks
   * UUIDv4形式である必要があります
   */
  id: z.string().uuid(),
  
  /** 
   * エントリタイプ
   * 
   * @remarks
   * 収入・支出・借入・貸付・返済など、金銭の流れの種別を表します
   */
  type: z.nativeEnum(EntryType),
  
  /**
   * 発生日
   * 
   * @remarks
   * 金銭の移動が発生した日付（ローカルタイム基準）
   */
  date: z.date(),
  
  /**
   * 金額
   * 
   * @remarks
   * Decimal型の値を受け付けます
   * 値の検証（正の値であることなど）はドメインモデル内で行われます
   */
  amount: z.instanceof(Decimal),
  
  /**
   * 支払い方法ID
   * 
   * @remarks
   * Methodモデルへの参照を表すUUID
   */
  methodId: z.string().uuid(),
  
  /**
   * カテゴリID
   * 
   * @remarks
   * オプション。収支タイプのエントリで使用されます
   */
  categoryId: z.string().uuid().optional(),
  
  /**
   * 表向きの使途
   * 
   * @remarks
   * 集計やUI表示対象となる公開用の目的
   */
  purpose: z.string().optional(),
  
  /**
   * 非公開な実際の使途
   * 
   * @remarks
   * 集計・表示からは除外される非公開情報
   */
  privatePurpose: z.string().optional(),
  
  /**
   * 補足情報
   * 
   * @remarks
   * タグ、状況、文脈などの自由記述
   */
  note: z.string().optional(),
  
  /**
   * 証憑に関する情報
   * 
   * @remarks
   * URIが含まれる場合、それはアプリ内に保存されたリソースでなければなりません（外部URL禁止）
   */
  evidenceNote: z.string().optional(),
  
  /**
   * 関連する債務ID
   * 
   * @remarks
   * 借入／貸付／返済時に必須となるDebtモデルへの参照
   */
  debtId: z.string().uuid().optional(),
  
  /**
   * Entryを作成した日時
   */
  createdAt: z.date()
});

/**
 * Entryドメインオブジェクト用のZodスキーマ
 * 
 * ドメインモデルの不変条件を表現し、型安全性を確保します
 * 
 * @throws 借入/貸付/返済時にdebtIdがない場合はBusinessRuleErrorCode.INVALID_VALUE_COMBINATIONエラー
 * @throws 不正なevidenceNoteのURLが指定された場合はBusinessRuleErrorCode.INVALID_INPUTエラー
 */
export const EntrySchema = baseEntrySchema.superRefine((data, ctx) => {
  // 借入／貸付の場合、debtIdは必須
  if ((data.type === EntryType.BORROW || data.type === EntryType.LEND) && !data.debtId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '借入／貸付のエントリには関連するdebtIdが必須です',
      path: ['debtId'],
      params: {
        errorCode: BusinessRuleErrorCode.INVALID_VALUE_COMBINATION
      }
    });
  }
  
  // 返済／返済受取の場合、debtIdは必須
  if ((data.type === EntryType.REPAYMENT || data.type === EntryType.REPAYMENT_RECEIVE) && !data.debtId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '返済系のエントリには関連するdebtIdが必須です',
      path: ['debtId'],
      params: {
        errorCode: BusinessRuleErrorCode.INVALID_VALUE_COMBINATION
      }
    });
  }

  // evidenceNoteにURIが含まれる場合、それはアプリ内に保存されたリソースでなければならない
  if (data.evidenceNote && data.evidenceNote.startsWith('http')) {
    const isInternalURI = data.evidenceNote.includes('/storage/receipt/');
    
    if (!isInternalURI) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '証憑情報には内部リソースのURLのみ使用できます',
        path: ['evidenceNote'],
        params: {
          errorCode: BusinessRuleErrorCode.INVALID_INPUT
        }
      });
    }
  }
});

/**
 * Entry作成時の基本入力スキーマ
 * 
 * IDとcreatedAtを除いた、エントリ作成時に必要な情報のスキーマです
 */
const baseEntryCreateSchema = baseEntrySchema.omit({
  id: true,
  createdAt: true
}).extend({
  /** 
   * 作成日時
   * 
   * @remarks
   * 省略時は現在の日時が設定されます
   */
  createdAt: z.date().optional().default(new Date())
});

/**
 * Entry作成時の入力スキーマ
 * 
 * エントリ作成時に使用するスキーマ。バリデーションルール適用済み
 * 
 * @throws 借入/貸付/返済時にdebtIdがない場合はBusinessRuleErrorCode.INVALID_VALUE_COMBINATIONエラー
 * @throws 不正なevidenceNoteのURLが指定された場合はBusinessRuleErrorCode.INVALID_INPUTエラー
 */
export const EntryCreateSchema = baseEntryCreateSchema.superRefine((data, ctx) => {
  // 借入／貸付の場合、debtIdは必須
  if ((data.type === EntryType.BORROW || data.type === EntryType.LEND) && !data.debtId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '借入／貸付のエントリには関連するdebtIdが必須です',
      path: ['debtId'],
      params: {
        errorCode: BusinessRuleErrorCode.INVALID_VALUE_COMBINATION
      }
    });
  }
  
  // 返済／返済受取の場合、debtIdは必須
  if ((data.type === EntryType.REPAYMENT || data.type === EntryType.REPAYMENT_RECEIVE) && !data.debtId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '返済系のエントリには関連するdebtIdが必須です',
      path: ['debtId'],
      params: {
        errorCode: BusinessRuleErrorCode.INVALID_VALUE_COMBINATION
      }
    });
  }

  // evidenceNoteにURIが含まれる場合、それはアプリ内に保存されたリソースでなければならない
  if (data.evidenceNote && data.evidenceNote.startsWith('http')) {
    const isInternalURI = data.evidenceNote.includes('/storage/receipt/');
    
    if (!isInternalURI) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '証憑情報には内部リソースのURLのみ使用できます',
        path: ['evidenceNote'],
        params: {
        errorCode: BusinessRuleErrorCode.INVALID_INPUT
        }
      });
    }
  }
});

/**
 * 日付が未来でないかを検証するスキーマ
 * 
 * フロントエンドでの入力制限などに使用します
 * 
 * @throws 日付が現在よりも未来の場合はBusinessRuleErrorCode.INVALID_DATE_RANGEエラー
 */
export const NonFutureDateEntrySchema = EntrySchema.refine(
  entry => entry.date <= new Date(),
  {
    message: '未来の日付は指定できません',
    path: ['date'],
    params: {
      errorCode: BusinessRuleErrorCode.INVALID_DATE_RANGE
    }
  }
);

/**
 * 重複エントリをチェックするスキーマ
 * 
 * 実際のチェックはリポジトリ層で行われるため、ここではスキーマ定義のみです
 * 
 * @throws 同一内容のエントリが既に存在する場合はBusinessRuleErrorCode.DUPLICATE_ENTRYエラー
 */
export const UniqueEntrySchema = EntrySchema.refine(
  () => true,  // 実際のチェックはリポジトリ層で行う
  {
    message: '同じ内容のエントリが既に存在します',
    path: ['purpose'],
    params: {
      errorCode: BusinessRuleErrorCode.DUPLICATE_ENTRY
    }
  }
);

/**
 * Entryの型定義
 */
export type Entry = z.infer<typeof EntrySchema>;

/**
 * Entry作成時の入力型定義
 */
export type EntryCreate = z.infer<typeof EntryCreateSchema>;