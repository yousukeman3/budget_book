// filepath: /app/src/modules/method/domain/method.ts
import { Decimal } from "@prisma/client/runtime/library";
import { MethodSchema, MethodCreateSchema } from "../../../shared/zod/schema/MethodSchema";
import { validateWithSchema } from "../../../shared/validation/validateWithSchema";

/**
 * Methodドメインエンティティ
 * 支払い方法を表すドメインモデル
 */
export class Method {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly initialBalance?: Decimal,
    public readonly archived: boolean = false
  ) {
    // Zodスキーマによるバリデーション
    validateWithSchema(MethodSchema, this);
  }

  /**
   * 入力データからMethodオブジェクトを作成するファクトリーメソッド
   * バリデーションも実施
   */
  static create(data: Omit<Method, 'id'> & { id?: string }): Method {
    const validatedData = validateWithSchema(MethodCreateSchema, {
      ...data,
      id: data.id || crypto.randomUUID()
    });
    
    return new Method(
      validatedData.id,
      validatedData.name,
      validatedData.initialBalance,
      validatedData.archived ?? false
    );
  }

  /**
   * このMethodがアーカイブされているか確認
   */
  isArchived(): boolean {
    return this.archived;
  }

  /**
   * Methodをアーカイブ状態に更新した新しいインスタンスを返す
   */
  archive(): Method {
    return new Method(
      this.id,
      this.name,
      this.initialBalance,
      true
    );
  }

  /**
   * Methodをアーカイブ解除した新しいインスタンスを返す
   */
  unarchive(): Method {
    return new Method(
      this.id,
      this.name,
      this.initialBalance,
      false
    );
  }
}