/**
 * Transfer（振替）のドメインモデル
 * 
 * 自分の支払い方法（Method）間での資金移動を表現するドメインモデルです。
 * Entryのtransferタイプと1:1で紐づき、fromMethodとtoMethodの間の資金移動を記録します。
 * 
 * @module Transfer
 *
 */
import { BusinessRuleError } from '../../../shared/errors/AppError';
import { BusinessRuleErrorCode } from '../../../shared/errors/ErrorCodes';
import { validateWithSchema } from '../../../shared/validation/validateWithSchema';
import { TransferSchema, TransferCreateSchema, SufficientFundsTransferSchema } from '../../../shared/zod/schema/TransferSchema';

/**
 * Transferモデル（振替）
 * 自分の口座（Method）間での資金移動を記録
 */
export interface ITransfer {
  /** 一意な識別子 */
  id: string;
  /** 紐づくEntryのID（type: 'transfer'のエントリ） */
  rootEntryId: string;
  /** 振替元のMethodのID */
  fromMethodId: string;
  /** 振替先のMethodのID */
  toMethodId: string;
  /** 発生日 */
  date: Date;
  /** 任意のメモ情報 */
  note?: string | null;
}

/**
 * Transfer作成用の入力型
 */
export type TransferCreateInput = Omit<ITransfer, 'id'>;

/**
 * Transfer更新用の入力型
 */
export type TransferUpdateInput = Partial<Omit<ITransfer, 'id' | 'rootEntryId'>>;

/**
 * Transferドメインエンティティクラス
 * 支払い方法間の資金移動を管理する
 */
export class Transfer {
  constructor(
    public readonly id: string,
    public readonly rootEntryId: string,
    public readonly fromMethodId: string,
    public readonly toMethodId: string,
    public readonly date: Date,
    public readonly note: string | null = null
  ) {
    // インスタンス作成時にZodスキーマでバリデーション
    // これによりすべての不変条件をチェックする
    validateWithSchema(TransferSchema, this);
  }

  /**
   * 入力データからTransferオブジェクトを作成するファクトリメソッド
   * バリデーションも実施
   */
  static create(data: {
    rootEntryId: string;
    fromMethodId: string;
    toMethodId: string;
    date: Date;
    note?: string | null;
    id?: string;
  }): Transfer {
    // id がない場合は UUID を生成
    const id = data.id || crypto.randomUUID();
    
    try {
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
        validData.note || null
      );
    } catch (error) {
      // エラーを BusinessRuleError にラップ
      if (error instanceof BusinessRuleError) {
        throw error;
      } else {
        throw new BusinessRuleError(
          '振替の作成に失敗しました',
          BusinessRuleErrorCode.INVALID_INPUT,
          { originalError: error }
        );
      }
    }
  }

  /**
   * 振替元の残高が十分かをチェック
   * 実際の残高チェックはリポジトリ層で行われますが、このメソッドはその前に呼び出されるべき
   */
  checkSufficientFunds(): void {
    // SufficientFundsTransferSchemaは実際のチェックはリポジトリ層に委ねる
    validateWithSchema(SufficientFundsTransferSchema, this);
  }

  /**
   * 振替元と振替先のMethodを入れ替えた新しいTransferオブジェクトを生成
   * 金額自体は変わらないが、口座間の移動方向が逆になる
   * 
   * @returns 方向を逆にしたTransferオブジェクト
   */
  reverse(): Transfer {
    return new Transfer(
      this.id,
      this.rootEntryId,
      this.toMethodId, // fromとtoを入れ替え
      this.fromMethodId,
      this.date,
      this.note
    );
  }

  /**
   * 振替元と振替先が指定のMethodと一致するか確認
   * 
   * @param methodId 確認するMethodのID
   * @returns fromMethodまたはtoMethodが一致する場合true
   */
  involvesMethod(methodId: string): boolean {
    return this.fromMethodId === methodId || this.toMethodId === methodId;
  }
}