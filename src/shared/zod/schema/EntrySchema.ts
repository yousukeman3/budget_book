/**
 * Entry（収支記録）のZodスキーマ定義
 * 
 * 収入・支出・借入・貸付・返済など、すべての金銭の動きを表現するEntryモデルの
 * バリデーションルールをZodスキーマとして定義するモジュールです。
 * 
 * @module EntrySchema
 */
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { EntryType } from '../../types/entry.types';
import { BusinessRuleErrorCode } from '../../errors/ErrorCodes';

/**
 * Entryの基本スキーマ
 */
const baseEntrySchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(EntryType),
  date: z.date(),
  amount: z.instanceof(Decimal).superRefine((amount, ctx) => {
    if (amount.lessThanOrEqualTo(new Decimal(0))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '金額は0より大きい値を指定してください',
        path: ['amount'],
        params: {
          errorCode: BusinessRuleErrorCode.INVALID_VALUE_RANGE
        }
      });
    }
  }),
  methodId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  purpose: z.string().optional(),
  privatePurpose: z.string().optional(),
  note: z.string().optional(),
  evidenceNote: z.string().optional(),
  debtId: z.string().uuid().optional(),
  createdAt: z.date()
});

/**
 * Entryドメインオブジェクト用のZodスキーマ
 * ドメインモデルの不変条件を表現し、型安全性を確保する
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
 * Entry作成時の基本入力スキーマ（IDとcreatedAtを除く）
 */
const baseEntryCreateSchema = baseEntrySchema.omit({
  id: true,
  createdAt: true
}).extend({
  createdAt: z.date().optional().default(new Date())
});

/**
 * Entry作成時の入力スキーマ（バリデーションルール適用済み）
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
 * フロントエンドでの入力制限などに使用
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
 * 実際のチェックはリポジトリ層で行われるため、ここではスキーマ定義のみ
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
 * Entryの型定義（TypeScript型）
 */
export type Entry = z.infer<typeof EntrySchema>;

/**
 * Entry作成時の入力型定義（TypeScript型）
 */
export type EntryCreate = z.infer<typeof EntryCreateSchema>;