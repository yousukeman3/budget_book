import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Methodドメインオブジェクト用のZodスキーマ
 * 支払い方法の不変条件を型安全に表現する
 */
export const MethodSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, { message: '支払い方法名は必須です' }),
  initialBalance: z.instanceof(Decimal).optional(),
  archived: z.boolean().optional().default(false)
});

/**
 * Method作成時の入力スキーマ（IDを除く）
 */
export const MethodCreateSchema = MethodSchema.omit({ id: true });

/**
 * Methodの型定義（TypeScript型）
 */
export type Method = z.infer<typeof MethodSchema>;

/**
 * Method作成時の入力型定義（TypeScript型）
 */
export type MethodCreate = z.infer<typeof MethodCreateSchema>;