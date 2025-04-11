import { Decimal } from '@prisma/client/runtime/library';
import { Entry } from '../../src/modules/entry/domain/entry';
import { EntryType } from '../../src/shared/types/entry.types';
import { EntryCreateSchema } from '../../src/shared/zod/schema/EntrySchema';

/**
 * テスト用のEntryデータを作成するファクトリ関数
 * @param override - デフォルト値をオーバーライドする部分的なデータ
 * @returns テスト用のエントリオブジェクト
 */
export const createEntryData = (override: Partial<Parameters<typeof Entry.create>[0]> = {}): Entry => {
  // デフォルト値
  const defaultEntry = {
    type: EntryType.EXPENSE,
    date: new Date('2025-01-01T10:00:00Z'),
    amount: new Decimal(1000),
    methodId: 'default-method-id',
    categoryId: 'default-category-id',
    purpose: 'テスト用エントリ',
    note: 'テスト用メモ'
  };

  // デフォルト値とオーバーライドを組み合わせ
  const entryData = {
    ...defaultEntry,
    ...override
  };

  // Entry.createファクトリメソッドを使用して正規のEntryオブジェクトを作成
  return Entry.create(entryData);
};

/**
 * 収入エントリを作成するショートカット関数
 * @param override - デフォルト値をオーバーライドするデータ
 * @returns 収入タイプのエントリデータ
 */
export const createIncomeEntryData = (override: Partial<Omit<Parameters<typeof Entry.create>[0], 'type'>> = {}): Entry => {
  return createEntryData({ type: EntryType.INCOME, ...override });
};

/**
 * 支出エントリを作成するショートカット関数
 * @param override - デフォルト値をオーバーライドするデータ
 * @returns 支出タイプのエントリデータ
 */
export const createExpenseEntryData = (override: Partial<Omit<Parameters<typeof Entry.create>[0], 'type'>> = {}): Entry => {
  return createEntryData({ type: EntryType.EXPENSE, ...override });
};

/**
 * 特定の金額のエントリを作成するショートカット関数
 * @param amount - エントリ金額
 * @param override - その他オーバーライドするデータ
 * @returns 指定金額のエントリデータ
 */
export const createEntryWithAmount = (
  amount: number | Decimal, 
  override: Partial<Omit<Parameters<typeof Entry.create>[0], 'amount'>> = {}
): Entry => {
  const decimalAmount = amount instanceof Decimal ? amount : new Decimal(amount);
  return createEntryData({ amount: decimalAmount, ...override });
};