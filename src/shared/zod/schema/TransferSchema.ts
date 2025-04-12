/**
 * Transfer（振替）のZodスキーマ定義
 * 
 * 自分の支払い方法（Method）間での資金移動を表現するTransferモデルのバリデーションルールを
 * Zodスキーマとして定義するモジュールです。
 * 
 * @module TransferSchema
 */
import { z } from 'zod';
import { BusinessRuleErrorCode } from '../../errors/ErrorCodes';

/**
 * Transferの基本スキーマ定義
 * すべてのフィールドの基本バリデーションルールを定義します
 */
const baseTransferSchema = z.object({
  /**
   * Transferの一意識別子
   * UUIDv4形式である必要があります
   */
  id: z.string().uuid(),
  
  /**
   * 紐づくEntryのID（type: 'transfer'のエントリ）
   * Transfer操作は必ず対応するEntryを持ちます
   */
  rootEntryId: z.string().uuid(),
  
  /**
   * 振替元のMethodのID
   * 資金の出所となる支払い方法を指定します
   */
  fromMethodId: z.string().uuid(),
  
  /**
   * 振替先のMethodのID
   * 資金の行き先となる支払い方法を指定します
   * fromMethodIdとは異なる必要があります
   */
  toMethodId: z.string().uuid(),
  
  /**
   * 発生日
   * 振替が行われた日付
   */
  date: z.date(),
  
  /**
   * 任意のメモ情報
   * 振替の目的や背景などを記録できます
   */
  note: z.string().nullable().optional()
});

/**
 * Transferドメインオブジェクト用のZodスキーマ
 * ドメインモデルの不変条件を表現し、型安全性を確保します
 */
export const TransferSchema = baseTransferSchema.superRefine((transfer, ctx) => {
  // 振替元と振替先のMethodは異なる必要がある
  if (transfer.fromMethodId === transfer.toMethodId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '同じ支払い方法間での振替はできません',
      path: ['toMethodId'],
      params: {
        errorCode: BusinessRuleErrorCode.IDENTICAL_ACCOUNTS,
        fromMethodId: transfer.fromMethodId,
        toMethodId: transfer.toMethodId
      }
    });
  }
});

/**
 * Transfer作成時の入力スキーマ（IDのみ任意、他は必須）
 */
export const TransferCreateSchema = baseTransferSchema
  .omit({ 
    id: true 
  })
  .extend({ 
    id: z.string().uuid().optional() 
  })
  .superRefine((transfer, ctx) => {
    // 振替元と振替先のMethodは異なる必要がある
    if (transfer.fromMethodId === transfer.toMethodId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '同じ支払い方法間での振替はできません',
        path: ['toMethodId'],
        params: {
          errorCode: BusinessRuleErrorCode.IDENTICAL_ACCOUNTS,
          fromMethodId: transfer.fromMethodId,
          toMethodId: transfer.toMethodId
        }
      });
    }
  });

/**
 * 残高チェック用のTransferバリデーションスキーマ
 * fromMethodの残高が不足している場合にエラーにします
 */
export const SufficientFundsTransferSchema = TransferSchema.refine(
  () => true, // 実際の残高チェックはリポジトリ層で行うため、ここではプレースホルダとして定義
  {
    message: '振替元の残高が不足しています',
    path: ['fromMethodId'],
    params: {
      errorCode: BusinessRuleErrorCode.INSUFFICIENT_FUNDS
    }
  }
);

/**
 * Transferの型定義（TypeScript型）
 */
export type Transfer = z.infer<typeof TransferSchema>;

/**
 * Transfer作成時の入力型定義（TypeScript型）
 */
export type TransferCreate = z.infer<typeof TransferCreateSchema>;