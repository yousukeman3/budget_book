/**
 * Debt（貸借管理）関連の型定義
 * 
 * 借入・貸付の種類やステータスを表す列挙型や関連する型を定義します。
 * 
 * @module DebtTypes
 */

/**
 * 貸借の種別を表す列挙型
 */
export enum DebtType {
  /** 借入：他人からお金を借りた状態 */
  BORROW = 'borrow',
  
  /** 貸付：他人にお金を貸した状態 */
  LEND = 'lend'
}

/**
 * 貸借の状態を表す列挙型
 */
export enum DebtStatus {
  /** 未返済：まだ全額返済されていない状態 */
  OUTSTANDING = 'outstanding',
  
  /** 一部返済：一部が返済されているが、まだ完済していない状態 */
  PARTIALLY_REPAID = 'partially_repaid',
  
  /** 完済：全額返済済みの状態 */
  REPAID = 'repaid'
}

/**
 * 貸借タイプの型定義（TypeScriptの型）
 */
export type DebtTypeString = keyof typeof DebtType;

/**
 * 貸借ステータスの型定義（TypeScriptの型）
 */
export type DebtStatusString = keyof typeof DebtStatus;