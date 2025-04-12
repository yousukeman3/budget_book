// filepath: /app/src/modules/method/domain/method.ts
import { Decimal } from "@prisma/client/runtime/library";
import { BusinessRuleError } from "../../../shared/errors/AppError";
import { BusinessRuleErrorCode } from "../../../shared/errors/ErrorCodes";
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
    // ここでは直接オブジェクトを渡してバリデーション
    validateWithSchema(MethodSchema, {
      id,
      name,
      initialBalance,
      archived
    });
    
    // 名前の最小長チェック（Zodでも可能だが、ドメインルールとしても明示）
    if (name.trim().length < 1) {
      throw new BusinessRuleError(
        '支払い方法名を入力してください',
        BusinessRuleErrorCode.INVALID_INPUT,
        { field: 'name' }
      );
    }
  }

  /**
   * 入力データからMethodオブジェクトを作成するファクトリーメソッド
   * バリデーションも実施
   */
  static create(data: { 
    name: string; 
    initialBalance?: Decimal; 
    archived?: boolean;
    id?: string;
  }): Method {
    try {
      // id がない場合は UUID を生成
      const id = data.id || crypto.randomUUID();
      
      // バリデーション
      const validData = validateWithSchema(MethodCreateSchema, {
        ...data,
        id
      });
      
      return new Method(
        id,
        validData.name,
        validData.initialBalance,
        validData.archived ?? false
      );
    } catch (error) {
      // エラーを明示的に BusinessRuleError にラップ
      if (error instanceof BusinessRuleError) {
        throw error;
      } else {
        throw new BusinessRuleError(
          '支払い方法の作成に失敗しました',
          BusinessRuleErrorCode.INVALID_INPUT,
          { originalError: error }
        );
      }
    }
  }

  /**
   * このMethodがアーカイブされているか確認
   */
  isArchived(): boolean {
    return this.archived;
  }

  /**
   * アーカイブされたMethodを使用しようとした場合にエラーを発生させる
   */
  validateNotArchived(): void {
    if (this.archived) {
      throw new BusinessRuleError(
        `支払い方法「${this.name}」はアーカイブされているため使用できません`,
        BusinessRuleErrorCode.METHOD_ARCHIVED,
        { methodId: this.id, methodName: this.name }
      );
    }
  }

  /**
   * Methodをアーカイブ状態に更新した新しいインスタンスを返す
   */
  archive(): Method {
    if (this.archived) {
      return this; // 既にアーカイブ済みなら何もしない
    }
    
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
    if (!this.archived) {
      return this; // 既にアーカイブ解除済みなら何もしない
    }
    
    return new Method(
      this.id,
      this.name,
      this.initialBalance,
      false
    );
  }
}