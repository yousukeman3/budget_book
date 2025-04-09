/**
 * EntryTypeの定義
 * 収支タイプを表すenum
 */
export enum EntryType {
  INCOME = 'income',
  EXPENSE = 'expense',
  BORROW = 'borrow',
  LEND = 'lend',
  REPAYMENT = 'repayment',
  REPAYMENT_RECEIVE = 'repaymentReceive',
  TRANSFER = 'transfer',
  INITIAL_BALANCE = 'initial_balance'
}