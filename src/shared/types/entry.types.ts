/**
 * Entry（収支記録）関連の型定義
 * 
 * 収支記録のタイプ（収入/支出/借入等）を表す列挙型や関連する型を定義します。
 * 
 */

/**
 * エントリータイプの列挙型
 * すべての金銭の流れの種類を表します
 */
export enum EntryType {
  /** 
   * 収入：給与、副収入など
   * 
   * @remarks
   * 収入として記録される金銭の入金を表します。個人的な働きの対価としての収入を含みます。
   */
  INCOME = 'income',
  
  /** 
   * 支出：買い物、食費など
   *
   * @remarks
   * 支出として記録される金銭の出金を表します。生活費、消費支出などを含みます。
   */
  EXPENSE = 'expense',
  
  /** 
   * 借入：他人からお金を借りる
   * 
   * @remarks
   * 他者からの借入を表します。Debtモデルと関連付けられます。
   * 
   * @see DebtType 借入タイプとの関連性
   */
  BORROW = 'borrow',
  
  /** 
   * 貸付：他人にお金を貸す
   * 
   * @remarks
   * 他者への貸付を表します。Debtモデルと関連付けられます。
   * 
   * @see DebtType 貸付タイプとの関連性
   */
  LEND = 'lend',
  
  /** 
   * 返済：借りたお金を返す
   * 
   * @remarks
   * 借入の返済を表します。必ずDebtモデルと関連付けられます。
   */
  REPAYMENT = 'repayment',
  
  /** 
   * 返済受取：貸したお金が返ってくる
   * 
   * @remarks
   * 貸付の返済を受け取ることを表します。必ずDebtモデルと関連付けられます。
   */
  REPAYMENT_RECEIVE = 'repayment_receive',
  
  /** 
   * 振替：自分の口座間でお金を移動
   * 
   * @remarks
   * 自分が所有する口座間で資金を移動させることを表します。Transferモデルと関連付けられます。
   * 
   * @see Transfer 振替モデルとの関連性
   */
  TRANSFER = 'transfer',
  
  /** 
   * 初期残高：支払い方法の初期設定用
   * 
   * @remarks
   * 支払い方法の初期設定時に初期残高を記録するためのタイプです。
   */
  INITIAL_BALANCE = 'initial_balance'
}

/**
 * 収入系のエントリータイプ
 * 残高がプラスに影響するタイプ
 * 
 * @remarks
 * 口座残高が増加する操作を表すエントリータイプの集合です。
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
 * 
 * @remarks
 * 口座残高が減少する操作を表すエントリータイプの集合です。
 */
export const ExpenseEntryTypes = [
  EntryType.EXPENSE,
  EntryType.LEND,
  EntryType.REPAYMENT
] as const;

/**
 * 借入/貸付関連のエントリータイプ
 * Debtモデルと関連するタイプ
 * 
 * @remarks
 * Debtモデルと関連付けられるエントリータイプの集合です。
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
 * 
 * @remarks
 * カテゴリによる分類が必要なエントリータイプの集合です。
 */
export const CategoryUsedEntryTypes = [
  EntryType.INCOME,
  EntryType.EXPENSE
] as const;

/**
 * 収入系タイプの型定義（TypeScriptの型）
 * 
 * @example
 * ```typescript
 * // 収入系のエントリータイプかどうかをチェックする関数
 * function isIncomeType(type: EntryType): type is IncomeEntryType {
 *   return (IncomeEntryTypes as readonly EntryType[]).includes(type);
 * }
 * ```
 */
export type IncomeEntryType = typeof IncomeEntryTypes[number];

/**
 * 支出系タイプの型定義（TypeScriptの型）
 * 
 * @example
 * ```typescript
 * // 支出系のエントリータイプかどうかをチェックする関数
 * function isExpenseType(type: EntryType): type is ExpenseEntryType {
 *   return (ExpenseEntryTypes as readonly EntryType[]).includes(type);
 * }
 * ```
 */
export type ExpenseEntryType = typeof ExpenseEntryTypes[number];

/**
 * 借入/貸付関連タイプの型定義（TypeScriptの型）
 * 
 * @example
 * ```typescript
 * // 借入/貸付関連のエントリータイプかどうかをチェックする関数
 * function isDebtRelatedType(type: EntryType): type is DebtRelatedEntryType {
 *   return (DebtRelatedEntryTypes as readonly EntryType[]).includes(type);
 * }
 * ```
 */
export type DebtRelatedEntryType = typeof DebtRelatedEntryTypes[number];

/**
 * カテゴリ使用タイプの型定義（TypeScriptの型）
 * 
 * @example
 * ```typescript
 * // カテゴリを使用するエントリータイプかどうかをチェックする関数
 * function isCategoryUsedType(type: EntryType): type is CategoryUsedEntryType {
 *   return (CategoryUsedEntryTypes as readonly EntryType[]).includes(type);
 * }
 * 
 * // カテゴリの必須チェック
 * function validateCategoryRequired(entry: { type: EntryType, categoryId?: string }) {
 *   if (isCategoryUsedType(entry.type) && !entry.categoryId) {
 *     throw new Error('このエントリータイプではカテゴリの指定が必須です');
 *   }
 * }
 * ```
 */
export type CategoryUsedEntryType = typeof CategoryUsedEntryTypes[number];