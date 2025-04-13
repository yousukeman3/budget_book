/**
 * Debt（貸借管理）関連の型定義
 * 
 * 借入・貸付の種類やステータスを表す列挙型や関連する型を定義します。
 * 
 */

/**
 * 貸借の種別を表す列挙型
 */
export enum DebtType {
  /** 
   * 借入：他人からお金を借りた状態
   * 
   * @remarks
   * 自分が借りた金銭を表すタイプです。借入額は正の数値で表します。
   * 
   * @example
   * ```typescript
   * const borrowDebt = {
   *   type: DebtType.BORROW,
   *   amount: new Decimal(10000),
   *   counterpart: '友人A',
   *   // その他の必須フィールド...
   * };
   * ```
   */
  BORROW = 'borrow',
  
  /** 
   * 貸付：他人にお金を貸した状態
   * 
   * @remarks
   * 自分が貸した金銭を表すタイプです。貸付額は正の数値で表します。
   * 
   * @example
   * ```typescript
   * const lendDebt = {
   *   type: DebtType.LEND,
   *   amount: new Decimal(5000),
   *   counterpart: '友人B',
   *   // その他の必須フィールド...
   * };
   * ```
   */
  LEND = 'lend'
}

/**
 * 貸借の状態を表す列挙型
 */
export enum DebtStatus {
  /** 
   * 未返済：まだ全額返済されていない状態
   * 
   * @remarks
   * 返済が一切行われていない初期状態です。
   */
  OUTSTANDING = 'outstanding',
  
  /** 
   * 一部返済：一部が返済されているが、まだ完済していない状態
   * 
   * @remarks
   * 一部の返済が行われたが、まだ残債がある状態です。
   */
  PARTIALLY_REPAID = 'partially_repaid',
  
  /** 
   * 完済：全額返済済みの状態
   * 
   * @remarks
   * 借入・貸付金額が全額返済され、債務が消滅した状態です。
   */
  REPAID = 'repaid'
}

/**
 * 貸借タイプの型定義（TypeScriptの型）
 * 
 * @example
 * ```typescript
 * // 貸借タイプの文字列表現を取得
 * function getDebtTypeString(type: DebtType): DebtTypeString {
 *   return DebtType[type] as DebtTypeString;
 * }
 * 
 * // 逆変換の例
 * function stringToDebtType(typeStr: DebtTypeString): DebtType {
 *   return DebtType[typeStr];
 * }
 * ```
 */
export type DebtTypeString = keyof typeof DebtType;

/**
 * 貸借ステータスの型定義（TypeScriptの型）
 * 
 * @example
 * ```typescript
 * // 貸借ステータスに基づいた表示色を取得する関数の例
 * function getStatusColor(status: DebtStatus): string {
 *   switch (status) {
 *     case DebtStatus.OUTSTANDING:
 *       return 'red';
 *     case DebtStatus.PARTIALLY_REPAID:
 *       return 'orange';
 *     case DebtStatus.REPAID:
 *       return 'green';
 *     default:
 *       return 'gray';
 *   }
 * }
 * ```
 */
export type DebtStatusString = keyof typeof DebtStatus;