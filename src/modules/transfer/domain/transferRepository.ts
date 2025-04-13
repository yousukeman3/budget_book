import type { Transfer } from './transfer';

/**
 * 振替検索オプション
 * 
 * Transferの検索条件を定義するインターフェース
 */
export interface TransferSearchOptions {
  /**
   * 開始日
   * この日付以降の振替を検索
   */
  startDate?: Date;

  /**
   * 終了日
   * この日付以前の振替を検索
   */
  endDate?: Date;

  /**
   * 特定のMethodから出金された振替を検索
   */
  fromMethodId?: string;

  /**
   * 特定のMethodへ入金された振替を検索
   */
  toMethodId?: string;

  /**
   * ソートフィールド
   */
  sortBy?: keyof Transfer;

  /**
   * ソート方向
   * @defaultValue 'desc'
   */
  sortDirection?: 'asc' | 'desc';

  /**
   * スキップする件数（ページネーション用）
   */
  offset?: number;

  /**
   * 取得する最大件数（ページネーション用）
   * @defaultValue 100
   */
  limit?: number;
}

/**
 * TransferRepository（振替リポジトリ）インターフェース
 * 
 * 口座間振替の永続化と取得を担当するリポジトリのインターフェース定義
 */
export interface TransferRepository {
  /**
   * IDによるTransfer検索
   * 
   * @param id - 検索対象のTransferのID
   * @returns 見つかったTransferオブジェクト、見つからない場合はundefined
   */
  findById(id: string): Promise<Transfer | undefined>;

  /**
   * ルートエントリIDによるTransfer検索
   * 
   * @param rootEntryId - 対応するEntryのID
   * @returns 見つかったTransferオブジェクト、見つからない場合はundefined
   */
  findByRootEntryId(rootEntryId: string): Promise<Transfer | undefined>;

  /**
   * 検索オプションによるTransfer検索
   * 
   * @param options - 検索条件オプション
   * @returns 条件に合致するTransferオブジェクトの配列
   */
  findByOptions(options: TransferSearchOptions): Promise<Transfer[]>;

  /**
   * 特定のMethod（fromMethodまたはtoMethod）に関連するTransferを検索
   * 
   * @param methodId - 検索対象のMethodのID
   * @returns 関連するTransferオブジェクトの配列
   */
  findByMethodId(methodId: string): Promise<Transfer[]>;

  /**
   * 新しいTransferを作成（Entryと一緒にトランザクション内で作成する必要あり）
   * 
   * @param transfer - 作成するTransferオブジェクト
   * @returns 作成されたTransferオブジェクト（IDが割り当てられている）
   * @throws {@link BusinessRuleError} - 同一口座間の振替など、ビジネスルール違反の場合
   */
  create(transfer: Transfer): Promise<Transfer>;

  /**
   * 既存のTransferを更新
   * 
   * @param transfer - 更新するTransferオブジェクト
   * @returns 更新されたTransferオブジェクト
   * @throws {@link NotFoundError} - 指定したIDのTransferが存在しない場合
   */
  update(transfer: Transfer): Promise<Transfer>;

  /**
   * Transferを削除（関連するEntryも削除する必要あり）
   * 
   * @param id - 削除するTransferのID
   * @returns 削除が成功した場合はtrue
   * @throws {@link NotFoundError} - 指定したIDのTransferが存在しない場合
   */
  delete(id: string): Promise<boolean>;
}