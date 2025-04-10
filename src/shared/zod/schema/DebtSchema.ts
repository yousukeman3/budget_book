import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { DebtType } from '../../types/debt.types';

/**
 * Debtドメインオブジェクト用のZodスキーマ
 * 貸借の不変条件を型安全に表現する
 */
export const DebtSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(DebtType),
  rootEntryId: z.string().uuid(),
  date: z.date(),
  amount: z.instanceof(Decimal).refine(amount => amount.gt(new Decimal(0)), {
    message: '金額は0より大きい値を指定してください'
  }),
  counterpart: z.string().min(1, { message: '相手先は必須です' }),
  repaidAt: z.date().optional(),
  memo: z.string().optional()
}).refine((data) => {
  // 返済日がある場合は、発生日以降であること
  if (data.repaidAt && data.date > data.repaidAt) {
    return false;
  }
  return true;
}, {
  message: '返済日は発生日以降である必要があります',
  path: ['repaidAt']
});

/**
 * Debt作成時の入力スキーマ（IDを除く）
 */
export const DebtCreateSchema = DebtSchema.omit({ id: true });

/**
 * Debtの型定義（TypeScript型）
 */
export type Debt = z.infer<typeof DebtSchema>;

/**
 * Debt作成時の入力型定義（TypeScript型）
 */
export type DebtCreate = z.infer<typeof DebtCreateSchema>;