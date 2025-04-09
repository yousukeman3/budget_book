import { z } from 'zod';
import { EntryCreateInputWithRules } from '../../src/shared/zod/entryCustomSchema';

// エントリタイプの定義
type EntryType = 'income' | 'expense' | 'transfer';

// エントリ入力データ型の定義
export type EntryInput = {
  type: EntryType;
  date: Date;
  amount: number;
  methodId: string;
  categoryId?: string;
  purpose?: string;
  note?: string;
};

/**
 * テスト用のEntryデータを作成するファクトリ関数
 * @param override - デフォルト値をオーバーライドする部分的なEntryInputデータ
 * @returns テスト用のEntryInputデータ
 */
export const createEntryData = (override: Partial<EntryInput> = {}): EntryInput => {
  // デフォルト値
  const defaultEntry: EntryInput = {
    type: 'expense',
    date: new Date('2025-01-01T10:00:00Z'),
    amount: 1000,
    methodId: 'default-method-id',
    categoryId: 'default-category-id',
    purpose: 'テスト用エントリ',
    note: 'テスト用メモ'
  };

  // デフォルト値とオーバーライドを組み合わせ
  return {
    ...defaultEntry,
    ...override
  };
};

/**
 * Zodスキーマに基づくバリデーション済みのエントリデータを作成
 * @param override - デフォルト値をオーバーライドするデータ
 * @returns バリデーション済みのエントリデータ
 */
export const createValidatedEntryData = (override: Partial<EntryInput> = {}) => {
  const entryData = createEntryData(override);
  return EntryCreateInputWithRules.parse(entryData);
};

/**
 * 収入エントリを作成するショートカット関数
 * @param override - デフォルト値をオーバーライドするデータ
 * @returns 収入タイプのエントリデータ
 */
export const createIncomeEntryData = (override: Partial<Omit<EntryInput, 'type'>> = {}) => {
  return createEntryData({ type: 'income', ...override });
};

/**
 * 支出エントリを作成するショートカット関数
 * @param override - デフォルト値をオーバーライドするデータ
 * @returns 支出タイプのエントリデータ
 */
export const createExpenseEntryData = (override: Partial<Omit<EntryInput, 'type'>> = {}) => {
  return createEntryData({ type: 'expense', ...override });
};