/**
 * Method（支払い方法）のドメインモデル
 * 
 * 口座、現金、電子マネーなど、支払い手段を表現するドメインモデルです。
 * 各収支エントリ(Entry)に関連付けられ、残高計算の基準点となります。
 * 
 * @module Method
 */
import { Decimal } from '@prisma/client/runtime/library';
import { BusinessRuleError } from '../../../shared/errors/AppError';
import { BusinessRuleErrorCode } from '../../../shared/errors/ErrorCodes';
import { validateWithSchema } from '../../../shared/validation/validateWithSchema';
import { MethodSchema, MethodCreateSchema, ActiveMethodSchema } from '../../../shared/zod/schema/MethodSchema';

/**
 * Method（支払い方法）のドメインインターフェース
 * 口座、現金、電子マネーなどの支払い手段
 */
export interface IMethod {
  /** 一意な識別子 */
  id: string;
  /** 表示名 */
  name: string;
  /** 初期残高（任意） */
  initialBalance?: number | null;
  /** アーカイブ状態（非表示） */
  archived?: boolean | null;
}

/**
 * Method作成用の入力型
 */
export type MethodCreateInput = Omit<IMethod, 'id'>;

/**
 * Method更新用の入力型
 */
export type MethodUpdateInput = Partial<Omit<IMethod, 'id'>>;

/**
 * Methodドメインエンティティクラス
 * 支払い手段の管理と状態を扱う
 */
export class Method {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly initialBalance: Decimal | null = null,
    public readonly archived: boolean = false
  ) {
    // インスタンス作成時にZodスキーマでバリデーション
    // Zodスキーマで全てのバリデーションを実行
    validateWithSchema(MethodSchema, this);
  }

  /**
   * 入力データからMethodオブジェクトを作成するファクトリーメソッド
   */
  static create(data: {
    name: string;
    initialBalance?: Decimal | null;
    archived?: boolean;
    id?: string;
  }): Method {
    // id がない場合は UUID を生成
    const id = data.id || crypto.randomUUID();
    
    try {
      // データを検証
      const validData = validateWithSchema(MethodCreateSchema, {
        ...data,
        id // 明示的にidを設定
      });
      
      return new Method(
        id,
        validData.name,
        validData.initialBalance || null,
        validData.archived || false
      );
    } catch (error) {
      // エラーを BusinessRuleError にラップ
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
   * この支払い方法がアーカイブされているかを確認
   * @returns アーカイブされている場合true
   */
  isArchived(): boolean {
    return this.archived;
  }

  /**
   * アーカイブされている場合にエラーを投げる
   * 重要な操作の前にこのチェックを行う
   */
  ensureActive(): void {
    validateWithSchema(ActiveMethodSchema, this);
  }

  /**
   * アーカイブ状態を変更した新しいMethodオブジェクトを生成
   * @param archived アーカイブ状態
   * @returns アーカイブ状態を変更した新しいMethodオブジェクト
   */
  setArchived(archived: boolean): Method {
    if (this.archived === archived) {
      return this; // 状態が変わらなければ自身を返す
    }
    
    return new Method(
      this.id,
      this.name,
      this.initialBalance,
      archived
    );
  }

  /**
   * 名前を変更した新しいMethodオブジェクトを生成
   * @param name 新しい名前
   * @returns 名前を変更した新しいMethodオブジェクト
   */
  rename(name: string): Method {
    if (this.name === name) {
      return this; // 名前が変わらなければ自身を返す
    }
    
    // 名前のバリデーションはZodスキーマに委譲
    return new Method(
      this.id,
      name,
      this.initialBalance,
      this.archived
    );
  }

  /**
   * 初期残高を変更した新しいMethodオブジェクトを生成
   * @param initialBalance 新しい初期残高
   * @returns 初期残高を変更した新しいMethodオブジェクト
   */
  setInitialBalance(initialBalance: Decimal | null): Method {
    if ((this.initialBalance === null && initialBalance === null) ||
        (this.initialBalance && initialBalance && this.initialBalance.equals(initialBalance))) {
      return this; // 初期残高が変わらなければ自身を返す
    }
    
    return new Method(
      this.id,
      this.name,
      initialBalance,
      this.archived
    );
  }
}