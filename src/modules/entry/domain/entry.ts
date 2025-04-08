// filepath: /app/src/modules/entry/domain/entry.ts
import { Decimal } from '@prisma/client/runtime/library';
import { BusinessRuleError } from '../../../shared/errors/AppError';
import { BusinessRuleErrorCode } from '../../../shared/errors/ErrorCodes';

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

/**
 * Entryドメインエンティティ
 * 収支記録の中核となるドメインモデル
 */
export class Entry {
  constructor(
    public readonly id: string,
    public readonly type: EntryType,
    public readonly date: Date,
    public readonly amount: Decimal,
    public readonly methodId: string,
    public readonly categoryId?: string,
    public readonly purpose?: string,
    public readonly privatePurpose?: string,
    public readonly note?: string,
    public readonly evidenceNote?: string,
    public readonly debtId?: string,
    public readonly createdAt: Date = new Date()
  ) {
    this.validateAmount();
    this.validateTypeConsistency();
  }

  /**
   * 金額のバリデーション
   * 金額は必ず0より大きい必要がある
   */
  private validateAmount(): void {
    if (this.amount.lte(new Decimal(0))) {
      throw new BusinessRuleError(
        '金額は0より大きい値を指定してください',
        BusinessRuleErrorCode.INVALID_VALUE_RANGE,
        { field: 'amount', value: this.amount.toString() }
      );
    }
  }

  /**
   * タイプの整合性チェック
   * EntryTypeに応じて必要なフィールドが存在するか確認
   */
  private validateTypeConsistency(): void {
    // 借入・貸付の場合はdebtIdが必須
    if ((this.type === EntryType.BORROW || this.type === EntryType.LEND) && !this.debtId) {
      throw new BusinessRuleError(
        `${this.type === EntryType.BORROW ? '借入' : '貸付'}の場合は対応するDebtが必要です`,
        BusinessRuleErrorCode.INVALID_INPUT,
        { field: 'debtId', type: this.type }
      );
    }

    // 返済・返済受取の場合もdebtIdが必須
    if ((this.type === EntryType.REPAYMENT || this.type === EntryType.REPAYMENT_RECEIVE) && !this.debtId) {
      throw new BusinessRuleError(
        `${this.type === EntryType.REPAYMENT ? '返済' : '返済受取'}の場合は対応するDebtが必要です`,
        BusinessRuleErrorCode.INVALID_INPUT,
        { field: 'debtId', type: this.type }
      );
    }

    // その他のタイプ固有のバリデーション
    // (transfer, initial_balanceなどの追加的なバリデーションはここに実装)
  }

  /**
   * このエントリが収入系か判定
   */
  isIncome(): boolean {
    return this.type === EntryType.INCOME || 
           this.type === EntryType.BORROW || 
           this.type === EntryType.REPAYMENT_RECEIVE;
  }

  /**
   * このエントリが支出系か判定
   */
  isExpense(): boolean {
    return this.type === EntryType.EXPENSE || 
           this.type === EntryType.LEND || 
           this.type === EntryType.REPAYMENT;
  }

  /**
   * このエントリが転送系か判定
   */
  isTransfer(): boolean {
    return this.type === EntryType.TRANSFER;
  }

  /**
   * このエントリが初期残高か判定
   */
  isInitialBalance(): boolean {
    return this.type === EntryType.INITIAL_BALANCE;
  }

  /**
   * このエントリが貸借系か判定
   */
  isDebtRelated(): boolean {
    return this.type === EntryType.BORROW || 
           this.type === EntryType.LEND ||
           this.type === EntryType.REPAYMENT ||
           this.type === EntryType.REPAYMENT_RECEIVE;
  }

  /**
   * Method残高への影響額を計算
   * 残高にどう影響するかを返す
   */
  getBalanceImpact(): Decimal {
    // 収入系は残高増加（プラス）
    if (this.isIncome()) {
      return this.amount;
    }
    // 支出系は残高減少（マイナス）
    else if (this.isExpense()) {
      return this.amount.negated();
    }
    // 転送系は対象methodに応じて計算（fromMethodは減少、toMethodは増加）
    else if (this.isTransfer()) {
      // ★ 注: TransferオブジェクトはEntryに紐づくため、このメソッドだけでは
      // 影響を完全に判断できない。entryId=rootEntryIdのTransferを参照して
      // fromMethod/toMethodどちらかを確認する必要がある
      return this.amount.negated(); // デフォルトはEntry.methodId=fromMethodIdとして減少
    }
    // 初期残高は常にプラス
    else if (this.isInitialBalance()) {
      return this.amount;
    }
    
    // 想定外のタイプ
    return new Decimal(0);
  }
}

/**
 * DebtTypeの定義
 * 貸借タイプを表すenum
 */
export enum DebtType {
  BORROW = 'borrow',
  LEND = 'lend'
}

/**
 * Debtドメインエンティティ
 * 借入・貸付の記録と状態を表すドメインモデル
 */
export class Debt {
  constructor(
    public readonly id: string,
    public readonly type: DebtType,
    public readonly rootEntryId: string,
    public readonly date: Date,
    public readonly amount: Decimal,
    public readonly counterpart: string,
    public readonly repaidAt?: Date,
    public readonly memo?: string,
  ) {
    this.validateAmount();
    this.validateDates();
  }

  /**
   * 金額のバリデーション
   */
  private validateAmount(): void {
    if (this.amount.lte(new Decimal(0))) {
      throw new BusinessRuleError(
        '金額は0より大きい値を指定してください',
        BusinessRuleErrorCode.INVALID_VALUE_RANGE,
        { field: 'amount', value: this.amount.toString() }
      );
    }
  }

  /**
   * 日付の整合性チェック
   */
  private validateDates(): void {
    if (this.repaidAt && this.date > this.repaidAt) {
      throw new BusinessRuleError(
        '返済日は発生日以降である必要があります',
        BusinessRuleErrorCode.INVALID_DATE_RANGE,
        { borrowDate: this.date, repaidAt: this.repaidAt }
      );
    }
  }

  /**
   * このDebtが返済済みか判定
   */
  isRepaid(): boolean {
    return !!this.repaidAt;
  }

  /**
   * このDebtが借入か判定
   */
  isBorrow(): boolean {
    return this.type === DebtType.BORROW;
  }

  /**
   * このDebtが貸付か判定
   */
  isLend(): boolean {
    return this.type === DebtType.LEND;
  }
}