/**
 * Debt（貸借管理）のZodスキーマ定義
 * 
 * 借入・貸付の状態と進捗を管理するDebtモデルのバリデーションルールを
 * Zodスキーマとして定義するモジュールです。
 *
  */
import { z } from 'zod';
import { Decimal } from '../../utils/decimal';
import { DebtType } from '../../types/debt.types';
import { BusinessRuleErrorCode } from '../../errors/ErrorCodes';

/**
 * Debtの基本スキーマ定義
 * すべてのフィールドの基本バリデーションルールを定義します
 */
const baseDebtSchema = z.object({
  /** 
   * Debtの一意識別子
   * 
   * UUIDv4形式である必要があります
   */
  id: z.string().uuid(),
  
  /**
   * Debtのタイプ
   * 
   * 借入(borrow)/貸付(lend)を表します
   * 
   * @see DebtType 貸借タイプのEnum定義
   */
  type: z.nativeEnum(DebtType),
  
  /**
   * 起点となるEntryのID
   * 
   * 借入/貸付を記録したEntryと紐づけられます
   */
  rootEntryId: z.string().uuid(),
  
  /**
   * 発生日
   * 
   * 借入/貸付が行われた日付（ローカルタイム基準）
   */
  date: z.date(),
  
  /**
   * 金額（元本）
   * 
   * 正の数値（Decimal）である必要があります
   *
   * @throws 金額が0以下の場合はBusinessRuleErrorCode.INVALID_VALUE_RANGEエラー
   * @example
   * ```typescript
   * // 有効な金額
   * const validAmount = new Decimal(1000);
   * // 無効な金額（バリデーションエラー）
   * const invalidAmount = new Decimal(0); // エラー: 金額は0より大きい値である必要があります
   * ```
   */
  amount: z.instanceof(Decimal).superRefine((amount, ctx) => {
    if (amount.lessThanOrEqualTo(0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '貸借金額は0より大きい値である必要があります',
        path: ['amount'],
        params: {
          errorCode: BusinessRuleErrorCode.INVALID_VALUE_RANGE
        }
      });
      return false;
    }
  }),
  
  /**
   * 相手の名前や識別情報
   * 
   * 必須フィールドで、1文字以上である必要があります
   */
  counterpart: z.string().min(1, {
    message: '取引相手を入力してください'
  }),
  
  /**
   * 返済完了日
   * 
   * 完済した場合に設定されます。未返済の場合はnullまたはundefined
   */
  repaidAt: z.date().nullable().optional(),
  
  /**
   * 任意のメモ情報
   * 
   * 追加の備考や補足情報を記録するためのフィールド
   */
  memo: z.string().nullable().optional()
});

/**
 * Debtドメインオブジェクト用のZodスキーマ
 * 
 * ドメインモデルの不変条件を表現し、型安全性を確保します
 *
 * @throws 返済日が貸付/借入日より前の場合はBusinessRuleErrorCode.INVALID_DATE_RANGEエラー
 * @example
 * ```typescript
 * // 有効なDebtデータ
 * const validDebt = {
 *   id: "123e4567-e89b-12d3-a456-426614174000",
 *   type: DebtType.BORROW,
 *   rootEntryId: "123e4567-e89b-12d3-a456-426614174001",
 *   date: new Date("2025-01-01"),
 *   amount: new Decimal(10000),
 *   counterpart: "友人A",
 *   repaidAt: new Date("2025-02-01"), // 貸付日より後
 *   memo: "旅行費用"
 * };
 * 
 * // 無効なDebtデータ（返済日が貸付日より前）
 * const invalidDebt = {
 *   ...validDebt,
 *   repaidAt: new Date("2024-12-01") // エラー: 返済日は貸付/借入日より前の日付にはできません
 * };
 * ```
 */
export const DebtSchema = baseDebtSchema.superRefine((debt, ctx) => {
  // 返済日がある場合は、借入/貸付日以降である必要がある
  if (debt.repaidAt && debt.repaidAt < debt.date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '返済日は貸付/借入日より前の日付にはできません',
      path: ['repaidAt'],
      params: {
        errorCode: BusinessRuleErrorCode.INVALID_DATE_RANGE,
        debtDate: debt.date.toISOString(),
        repaidAt: debt.repaidAt.toISOString()
      }
    });
  }
});

/**
 * 返済マーク処理用のバリデーションスキーマ
 * 
 * すでに返済済みのDebtに対して再度返済マークを付けようとするとエラーになります
 * 
 * @throws 既に返済済みの借入/貸付に対して操作しようとした場合はBusinessRuleErrorCode.DEBT_ALREADY_REPAIDエラー
 * @example
 * ```typescript
 * // 返済済みのDebtに対して返済マークを付けようとすると失敗する
 * const repaidDebt = {
 *   ...validDebt,
 *   repaidAt: new Date()
 * };
 * try {
 *   DebtRepaymentSchema.parse(repaidDebt); // エラー: すでに返済済みの借入/貸付です
 * } catch (e) {
 *   console.error(e.message);
 * }
 * ```
 */
export const DebtRepaymentSchema = DebtSchema.refine(
  debt => !debt.repaidAt,
  {
    message: 'すでに返済済みの借入/貸付です',
    path: ['repaidAt'],
    params: {
      errorCode: BusinessRuleErrorCode.DEBT_ALREADY_REPAID
    }
  }
);

/**
 * Debt作成時の入力スキーマ
 * 
 * IDのみ任意（自動生成可能）、他は必須フィールドとなります
 * 
 * @throws 返済日が貸付/借入日より前の場合はBusinessRuleErrorCode.INVALID_DATE_RANGEエラー
 * @example
 * ```typescript
 * // Debt作成時のデータ（IDは省略可能）
 * const newDebt = {
 *   type: DebtType.LEND,
 *   rootEntryId: "123e4567-e89b-12d3-a456-426614174001",
 *   date: new Date(),
 *   amount: new Decimal(5000),
 *   counterpart: "同僚B",
 *   memo: "ランチ代"
 * };
 * 
 * const validatedDebt = DebtCreateSchema.parse(newDebt);
 * ```
 */
export const DebtCreateSchema = baseDebtSchema
  .omit({ 
    id: true 
  })
  .extend({ 
    id: z.string().uuid().optional() 
  })
  .superRefine((debt, ctx) => {
    // 返済日がある場合は、借入/貸付日以降である必要がある
    if (debt.repaidAt && debt.repaidAt < debt.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '返済日は貸付/借入日より前の日付にはできません',
        path: ['repaidAt'],
        params: {
          errorCode: BusinessRuleErrorCode.INVALID_DATE_RANGE,
          debtDate: debt.date.toISOString(),
          repaidAt: debt.repaidAt.toISOString()
        }
      });
    }
  });

/**
 * Debtの型定義
 */
export type Debt = z.infer<typeof DebtSchema>;

/**
 * Debt作成時の入力型定義
 */
export type DebtCreate = z.infer<typeof DebtCreateSchema>;