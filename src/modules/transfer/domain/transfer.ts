// filepath: /app/src/modules/transfer/domain/transfer.ts
import { Decimal } from "@prisma/client/runtime/library";
import { BusinessRuleError } from "../../../shared/errors/AppError";
import { BusinessRuleErrorCode } from "../../../shared/errors/ErrorCodes";
import { TransferSchema, TransferCreateSchema } from "../../../shared/zod/schema/TransferSchema";
import { validateWithSchema } from "../../../shared/validation/validateWithSchema";

/**
 * Transferドメインエンティティ
 * 資金の振替（Method間の移動）を表すドメインモデル
 */
export class Transfer {
  constructor(
    public readonly id: string,
    public readonly rootEntryId: string,
    public readonly fromMethodId: string,
    public readonly toMethodId: string,
    public readonly date: Date,
    public readonly note?: string
  ) {
    // Zodスキーマによるバリデーション
    validateWithSchema(TransferSchema, this);
    this.validateSameMethod();
  }

  /**
   * 入力データからTransferオブジェクトを作成するファクトリーメソッド
   * バリデーションも実施
   */
  static create(data: Omit<Transfer, 'id'> & { id?: string }): Transfer {
    const validatedData = validateWithSchema(TransferCreateSchema, {
      ...data,
      id: data.id || crypto.randomUUID()
    });
    
    return new Transfer(
      validatedData.id,
      validatedData.rootEntryId,
      validatedData.fromMethodId,
      validatedData.toMethodId,
      validatedData.date,
      validatedData.note
    );
  }

  /**
   * 同一Method間の振替でないことを確認
   * (ZodSchemaでも検証しているが、ドメインロジックとしても明示)
   */
  private validateSameMethod(): void {
    if (this.fromMethodId === this.toMethodId) {
      throw new BusinessRuleError(
        '振替元と振替先の支払い方法は異なる必要があります',
        BusinessRuleErrorCode.INVALID_VALUE_COMBINATION,
        { fromMethodId: this.fromMethodId, toMethodId: this.toMethodId }
      );
    }
  }
}