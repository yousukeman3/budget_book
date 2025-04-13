/**
 * Method（支払い方法）のZodスキーマ定義
 * 
 * 口座、現金、電子マネーなど、支払い手段を表現するMethodモデルのバリデーションルールを
 * Zodスキーマとして定義するモジュールです。
  */
import { z } from 'zod';
import { Decimal } from '../../utils/decimal';
import { BusinessRuleErrorCode } from '../../errors/ErrorCodes';

/**
 * Methodの基本スキーマ定義
 * すべてのフィールドの基本バリデーションルールを定義します
 */
const baseMethodSchema = z.object({
  /**
   * Methodの一意識別子
   * 
   * @remarks
   * UUIDv4形式である必要があります
   */
  id: z.string().uuid(),
  
  /**
   * 表示名
   * 
   * @remarks
   * 必須かつ1文字以上の文字列である必要があります
   * 
   * @throws 空文字列の場合やテキストが長すぎる場合はBusinessRuleErrorCode.INVALID_INPUTエラー
   * 
   * @example
   * ```typescript
   * // 有効な名前
   * const validName = "現金財布";
   * 
   * // 無効な名前（エラー）
   * const emptyName = "";  // エラー: 支払い方法名を入力してください
   * const tooLongName = "A".repeat(51);  // エラー: 支払い方法名は50文字以内で入力してください
   * ```
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
   * 初期残高
   * 
   * @remarks
   * 設定されている場合は数値型(Decimal)である必要があります
   * このMethodが最初に作成された時点での残高を表します
   */
  initialBalance: z.instanceof(Decimal).nullable().optional(),
  
  /**
   * アーカイブ状態（非表示）
   * 
   * @remarks
   * trueの場合、UIでの表示から除外されます
   * アーカイブされたMethodは通常の操作では選択できなくなります
   */
  archived: z.boolean().default(false)
});

/**
 * Methodドメインオブジェクト用のZodスキーマ
 * 
 * ドメインモデルの不変条件を表現し、型安全性を確保します
 * 
 * @example
 * ```typescript
 * // 有効なMethodデータ
 * const validMethod = {
 *   id: "123e4567-e89b-12d3-a456-426614174000",
 *   name: "クレジットカード",
 *   initialBalance: null,
 *   archived: false
 * };
 * 
 * const validated = MethodSchema.parse(validMethod);
 * ```
 */
export const MethodSchema = baseMethodSchema;

/**
 * アーカイブ済みMethodの利用を禁止するためのバリデーションスキーマ
 * 
 * アーカイブされたMethodを使用しようとするとエラーになります
 * 
 * @throws Methodがアーカイブされている場合はBusinessRuleErrorCode.METHOD_ARCHIVEDエラー
 * 
 * @example
 * ```typescript
 * // アーカイブされた支払い方法を使用しようとするとエラーになる
 * const archivedMethod = {
 *   id: "123e4567-e89b-12d3-a456-426614174000",
 *   name: "古い財布",
 *   archived: true
 * };
 * 
 * try {
 *   ActiveMethodSchema.parse(archivedMethod);
 * } catch (error) {
 *   console.error('この支払い方法はアーカイブされているため使用できません');
 * }
 * ```
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
 * Method作成時の入力スキーマ
 * 
 * IDのみ任意（自動生成可能）、他は必須フィールドとなります
 * 
 * @example
 * ```typescript
 * // Method作成時のデータ（IDは省略可能）
 * const newMethod = {
 *   name: "新しい財布",
 *   initialBalance: new Decimal(10000),
 *   archived: false
 * };
 * 
 * const validatedMethod = MethodCreateSchema.parse(newMethod);
 * ```
 */
export const MethodCreateSchema = baseMethodSchema
  .omit({ 
    id: true 
  })
  .extend({ 
    id: z.string().uuid().optional() 
  });

/**
 * Methodの型定義
 */
export type Method = z.infer<typeof MethodSchema>;

/**
 * Method作成時の入力型定義
 */
export type MethodCreate = z.infer<typeof MethodCreateSchema>;