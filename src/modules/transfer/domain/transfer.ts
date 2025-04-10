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
  static create(data: {
    rootEntryId: string;
    fromMethodId: string;
    toMethodId: string;
    date: Date;
    note?: string;
    id?: string;
  }): Transfer {
    // id がない場合は UUID を生成
    const id = data.id || crypto.randomUUID();
    
    // データを検証
    const validData = validateWithSchema(TransferCreateSchema, {
      ...data,
      id // 明示的にidを設定
    });
    
    return new Transfer(
      id,
      validData.rootEntryId,
      validData.fromMethodId,
      validData.toMethodId,
      validData.date,
      validData.note
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