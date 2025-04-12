/**
 * Entry（収支記録）関連の型定義
 * 
 * 収支記録のタイプ（収入/支出/借入等）を表す列挙型や関連する型を定義します。
 * 
 * @module EntryTypes
 */

/**
 * エントリータイプの列挙型
 * すべての金銭の流れの種類を表します
 */
export enum EntryType {
  /** 収入：給与、副収入など */
  INCOME = 'income',
  
  /** 支出：買い物、食費など */
  EXPENSE = 'expense',
  
  /** 借入：他人からお金を借りる */
  BORROW = 'borrow',
  
  /** 貸付：他人にお金を貸す */
  LEND = 'lend',
  
  /** 返済：借りたお金を返す */
  REPAYMENT = 'repayment',
  
  /** 返済受取：貸したお金が返ってくる */
  REPAYMENT_RECEIVE = 'repayment_receive',
  
  /** 振替：自分の口座間でお金を移動 */
  TRANSFER = 'transfer',
  
  /** 初期残高：支払い方法の初期設定用 */
  INITIAL_BALANCE = 'initial_balance'
}

/**
 * 収入系のエントリータイプ
 * 残高がプラスに影響するタイプ
 */
export const IncomeEntryTypes = [
  EntryType.INCOME,
  EntryType.BORROW,
  EntryType.REPAYMENT_RECEIVE,
  EntryType.INITIAL_BALANCE
] as const;

/**
 * 支出系のエントリータイプ
 * 残高がマイナスに影響するタイプ
 */
export const ExpenseEntryTypes = [
  EntryType.EXPENSE,
  EntryType.LEND,
  EntryType.REPAYMENT
] as const;

/**
 * 借入/貸付関連のエントリータイプ
 * Debtモデルと関連するタイプ
 */
export const DebtRelatedEntryTypes = [
  EntryType.BORROW,
  EntryType.LEND,
  EntryType.REPAYMENT,
  EntryType.REPAYMENT_RECEIVE
] as const;

/**
 * カテゴリを使用するエントリータイプ
 * カテゴリ分類が必要なタイプ
 */
export const CategoryUsedEntryTypes = [
  EntryType.INCOME,
  EntryType.EXPENSE
] as const;

/**
 * 収入系タイプの型定義（TypeScriptの型）
 */
export type IncomeEntryType = typeof IncomeEntryTypes[number];

/**
 * 支出系タイプの型定義（TypeScriptの型）
 */
export type ExpenseEntryType = typeof ExpenseEntryTypes[number];

/**
 * 借入/貸付関連タイプの型定義（TypeScriptの型）
 */
export type DebtRelatedEntryType = typeof DebtRelatedEntryTypes[number];

/**
 * カテゴリ使用タイプの型定義（TypeScriptの型）
 */
export type CategoryUsedEntryType = typeof CategoryUsedEntryTypes[number];