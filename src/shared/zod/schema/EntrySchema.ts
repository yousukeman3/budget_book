import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { EntryType } from '../../types/entry.types';

/**
 * Entryドメインオブジェクト用のZodスキーマ
 * ドメインモデルの不変条件を表現し、型安全性を確保する
 */
export const EntrySchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(EntryType),
  date: z.date(),
  // Decimalは直接検証できないため文字列化して検証
  amount: z.instanceof(Decimal).refine(amount => amount.gt(new Decimal(0)), {
    message: '金額は0より大きい値を指定してください'
  }),
  methodId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  purpose: z.string().optional(),
  privatePurpose: z.string().optional(),
  note: z.string().optional(),
  evidenceNote: z.string().optional(),
  debtId: z.string().uuid().optional(),
  createdAt: z.date()
}).refine(data => {
  // 借入／貸付の場合、debtIdは必須
  if ((data.type === EntryType.BORROW || data.type === EntryType.LEND) && !data.debtId) {
    return false;
  }
  // 返済／返済受取の場合、debtIdは必須
  if ((data.type === EntryType.REPAYMENT || data.type === EntryType.REPAYMENT_RECEIVE) && !data.debtId) {
    return false;
  }
  return true;
}, {
  message: '借入／貸付／返済系のエントリには関連するdebtIdが必須です',
  path: ['debtId']
});

/**
 * Entry作成時の入力スキーマ（IDとcreatedAtを除く）
 */
export const EntryCreateSchema = EntrySchema.omit({ 
  id: true,
  createdAt: true 
}).extend({
  createdAt: z.date().optional().default(new Date())
});

/**
 * Entryの型定義（TypeScript型）
 */
export type Entry = z.infer<typeof EntrySchema>;

/**
 * Entry作成時の入力型定義（TypeScript型）
 */
export type EntryCreate = z.infer<typeof EntryCreateSchema>;