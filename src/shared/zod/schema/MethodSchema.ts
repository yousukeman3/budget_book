/**
 * Method（支払い方法）のZodスキーマ定義
 * 
 * 口座、現金、電子マネーなど、支払い手段を表現するMethodモデルのバリデーションルールを
 * Zodスキーマとして定義するモジュールです。
 * 
 * @module MethodSchema
 */
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { BusinessRuleErrorCode } from '../../errors/ErrorCodes';

/**
 * Methodの基本スキーマ定義
 * すべてのフィールドの基本バリデーションルールを定義します
 */
const baseMethodSchema = z.object({
  /**
   * Methodの一意識別子
   * UUIDv4形式である必要があります
   */
  id: z.string().uuid(),
  
  /**
   * 表示名
   * 必須かつ1文字以上の文字列である必要があります
   */
  name: z.string().superRefine((name, ctx) => {
    if (!name.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '支払い方法名を入力してください',
        path: ['name'],
        params: {
          errorCode: BusinessRuleErrorCode.INVALID_INPUT
        }
      });
    }

    if (name.length > 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '支払い方法名は50文字以内で入力してください',
        path: ['name'],
        params: {
          errorCode: BusinessRuleErrorCode.INVALID_INPUT
        }
      });
    }
  }),
  
  /**
   * 初期残高（任意）
   * 設定されている場合は数値である必要があります
   */
  initialBalance: z.instanceof(Decimal).nullable().optional(),
  
  /**
   * アーカイブ状態（非表示）
   * trueの場合、UIでの表示から除外されます
   */
  archived: z.boolean().default(false)
});

/**
 * Methodドメインオブジェクト用のZodスキーマ
 * ドメインモデルの不変条件を表現し、型安全性を確保します
 */
export const MethodSchema = baseMethodSchema;

/**
 * アーカイブ済みMethodの利用を禁止するためのバリデーションスキーマ
 * アーカイブされたMethodを使用しようとするとエラーになります
 */
export const ActiveMethodSchema = MethodSchema.refine(
  method => !method.archived,
  {
    message: 'この支払い方法はアーカイブされているため使用できません',
    path: ['archived'],
    params: {
      errorCode: BusinessRuleErrorCode.METHOD_ARCHIVED
    }
  }
);

/**
 * Method作成時の入力スキーマ（IDのみ任意、他は必須）
 */
export const MethodCreateSchema = baseMethodSchema
  .omit({ 
    id: true 
  })
  .extend({ 
    id: z.string().uuid().optional() 
  });

/**
 * Methodの型定義（TypeScript型）
 */
export type Method = z.infer<typeof MethodSchema>;

/**
 * Method作成時の入力型定義（TypeScript型）
 */
export type MethodCreate = z.infer<typeof MethodCreateSchema>;