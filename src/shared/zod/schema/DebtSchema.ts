/**
 * Debt（貸借管理）のZodスキーマ定義
 * 
 * 借入・貸付の状態と進捗を管理するDebtモデルのバリデーションルールを
 * Zodスキーマとして定義するモジュールです。
 * 
 * @module DebtSchema
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
   * UUIDv4形式である必要があります
   */
  id: z.string().uuid(),
  
  /**
   * Debtのタイプ
   * 借入/貸付を表します
   */
  type: z.nativeEnum(DebtType),
  
  /**
   * 起点となるEntryのID
   * 借入/貸付を記録したEntryと紐づけられます
   */
  rootEntryId: z.string().uuid(),
  
  /**
   * 発生日
   * 借入/貸付が行われた日付
   */
  date: z.date(),
  
  /**
   * 金額（元本）
   * 正の数である必要があります
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
   * 必須フィールドです
   */
  counterpart: z.string().min(1, {
    message: '取引相手を入力してください'
  }),
  
  /**
   * 返済完了日（あれば）
   * 完済した場合に設定されます
   */
  repaidAt: z.date().nullable().optional(),
  
  /**
   * 任意のメモ情報
   */
  memo: z.string().nullable().optional()
});

/**
 * Debtドメインオブジェクト用のZodスキーマ
 * ドメインモデルの不変条件を表現し、型安全性を確保します
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
 * すでに返済済みのDebtに対して再度返済マークを付けようとするとエラー
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
 * Debt作成時の入力スキーマ（IDのみ任意、他は必須）
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
 * Debtの型定義（TypeScript型）
 */
export type Debt = z.infer<typeof DebtSchema>;

/**
 * Debt作成時の入力型定義（TypeScript型）
 */
export type DebtCreate = z.infer<typeof DebtCreateSchema>;