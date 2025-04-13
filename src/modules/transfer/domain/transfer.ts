/**
 * Transfer（口座間振替）のドメインモデル
 * 
 * 口座間の資金移動を表現し、その処理と状態管理を行うドメインモデル。
 * Entry（収支記録）と連携し、支払い方法間の資金移動を記録します。
 */
import { BusinessRuleError } from '../../../shared/errors/AppError';
import { BusinessRuleErrorCode } from '../../../shared/errors/ErrorCodes';
import { validateWithSchema } from '../../../shared/validation/validateWithSchema';
import { TransferSchema, TransferCreateSchema, SufficientFundsTransferSchema } from '../../../shared/zod/schema/TransferSchema';

/**
 * Transfer（口座間振替）のドメインインターフェース
 * ユーザーの所有する複数の支払い方法間の資金移動を記録する型定義
 */
export interface ITransfer {
  /** 振替の一意識別子（UUIDv4） */
  id: string;
  
  /** 
   * 対応するEntryのID 
   * 
   * Entry(type = transfer)と1対1で結びつく
   */
  rootEntryId: string;
  
  /** 
   * 振替元のMethodID 
   * 
   * 資金の出元となる支払い方法
   */
  fromMethodId: string;
  
  /** 
   * 振替先のMethodID 
   * 
   * 資金の受け取り先となる支払い方法
   */
  toMethodId: string;
  
  /** 
   * 振替日 
   * 
   * 振替が行われた日付（ローカルタイム基準）
   */
  date: Date;
  
  /** 
   * 備考 
   * 
   * 任意の補足説明（振替理由など）
   */
  note?: string | null;
}

/**
 * Transfer作成用の入力型
 * 
 * ITransferから`id`フィールドを除いた型
 */
export type TransferCreateInput = Omit<ITransfer, 'id'>;

/**
 * Transfer更新用の入力型
 * 
 * ITransferから`id`, `rootEntryId`, `fromMethodId`, `toMethodId`フィールドを除いた部分的な型
 */
export type TransferUpdateInput = Partial<Omit<ITransfer, 'id' | 'rootEntryId' | 'fromMethodId' | 'toMethodId'>>;

/**
 * Transferドメインエンティティクラス
 * 口座間の資金移動（振替）を表現し、その処理と追跡を行うドメインモデル
 */
export class Transfer {
  /**
   * Transferオブジェクトのコンストラクタ
   * 
   * @param id - 振替の一意識別子
   * @param rootEntryId - 対応するEntryのID
   * @param fromMethodId - 振替元のMethodID
   * @param toMethodId - 振替先のMethodID
   * @param date - 振替日
   * @param note - 備考（任意）
   * @throws バリデーション失敗時にBusinessRuleErrorをスローします
   */
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
   * 入力データからTransferオブジェクトを作成するファクトリーメソッド
   * バリデーションも実施します
   * 
   * @param data - 振替作成のための入力データ
   * @returns 新しいTransferオブジェクト
   * @throws バリデーション失敗時にBusinessRuleErrorをスローします
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
      // データを検証（これにより型安全性が確保される）
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
      // エラーを明示的に BusinessRuleError にラップして詳細を追加
      if (error instanceof BusinessRuleError) {
        throw error;  // すでにBusinessRuleErrorならそのままスロー
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
   * @throws 残高不足の場合にBusinessRuleErrorをスローします
   * 
   * 実際の残高チェックはリポジトリ層で行われますが、このメソッドはその前に呼び出されるべきです
   */
  checkSufficientFunds(): void {
    // SufficientFundsTransferSchemaは実際のチェックはリポジトリ層に委ねる
    validateWithSchema(SufficientFundsTransferSchema, this);
  }

  /**
   * 振替元と振替先のMethodを入れ替えた新しいTransferオブジェクトを生成
   * 金額自体は変わらないが、口座間の移動方向が逆になります
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
   * @param methodId - 確認するMethodのID
   * @returns fromMethodまたはtoMethodが一致する場合`true`
   */
  involvesMethod(methodId: string): boolean {
    return this.fromMethodId === methodId || this.toMethodId === methodId;
  }
}