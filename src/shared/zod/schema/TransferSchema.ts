import { z } from 'zod';

/**
 * Transferドメインオブジェクト用のZodスキーマ
 * 振替の不変条件を型安全に表現する
 */
export const TransferSchema = z.object({
  id: z.string().uuid(),
  rootEntryId: z.string().uuid(),
  fromMethodId: z.string().uuid(),
  toMethodId: z.string().uuid(),
  date: z.date(),
  note: z.string().optional()
}).refine((data) => {
  // 振替元と振替先は異なる必要がある
  return data.fromMethodId !== data.toMethodId;
}, {
  message: '振替元と振替先の支払い方法は異なる必要があります',
  path: ['toMethodId']
});

/**
 * Transfer作成時の入力スキーマ（IDを除く）
 */
export const TransferCreateSchema = TransferSchema.omit({ id: true });

/**
 * Transferの型定義（TypeScript型）
 */
export type Transfer = z.infer<typeof TransferSchema>;

/**
 * Transfer作成時の入力型定義（TypeScript型）
 */
export type TransferCreate = z.infer<typeof TransferCreateSchema>;