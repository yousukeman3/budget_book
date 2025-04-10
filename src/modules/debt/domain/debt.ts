import { Decimal } from '@prisma/client/runtime/library';
import { BusinessRuleError } from '../../../shared/errors/AppError';
import { BusinessRuleErrorCode } from '../../../shared/errors/ErrorCodes';
import { DebtType } from '../../../shared/types/debt.types';
import { DebtSchema, DebtCreateSchema } from '../../../shared/zod/schema/DebtSchema';
import { validateWithSchema } from '../../../shared/validation/validateWithSchema';

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
    // Zodスキーマによるバリデーション
    validateWithSchema(DebtSchema, this);
    this.validateAmount();
    this.validateDates();
  }

  /**
   * 入力データからDebtオブジェクトを作成するファクトリーメソッド
   * バリデーションも実施
   */
  static create(data: {
    type: DebtType;
    rootEntryId: string;
    date: Date;
    amount: Decimal;
    counterpart: string;
    repaidAt?: Date;
    memo?: string;
    id?: string;
  }): Debt {
    // id がない場合は UUID を生成
    const id = data.id || crypto.randomUUID();
    
    // データを検証
    const validData = validateWithSchema(DebtCreateSchema, {
      ...data,
      id // 明示的にidを設定
    });
    
    return new Debt(
      id,
      validData.type,
      validData.rootEntryId,
      validData.date,
      validData.amount,
      validData.counterpart,
      validData.repaidAt,
      validData.memo
    );
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