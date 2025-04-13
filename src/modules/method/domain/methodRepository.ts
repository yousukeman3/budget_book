import type { Method } from './method';

/**
 * メソッド検索オプション
 * 
 * Methodの検索条件を定義するインターフェース
 */
export interface MethodSearchOptions {
  /**
   * アーカイブされたMethodも含めるかどうか
   * @defaultValue false
   */
  includeArchived?: boolean;

  /**
   * 名前の部分一致検索
   */
  nameContains?: string;

  /**
   * ソートフィールド
   */
  sortBy?: keyof Method;

  /**
   * ソート方向
   * @defaultValue 'asc'
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
 * MethodRepository（支払い方法リポジトリ）インターフェース
 * 
 * 支払い方法の永続化と取得を担当するリポジトリのインターフェース定義
 */
export interface MethodRepository {
  /**
   * IDによるMethod検索
   * 
   * @param id - 検索対象のMethodのID
   * @returns 見つかったMethodオブジェクト、見つからない場合はundefined
   */
  findById(id: string): Promise<Method | undefined>;

  /**
   * すべてのMethodを取得する
   * 
   * @param includeArchived - アーカイブされたMethodも含めるかどうか
   * @returns Methodオブジェクトの配列
   */
  findAll(includeArchived?: boolean): Promise<Method[]>;

  /**
   * 検索オプションによるMethod検索
   * 
   * @param options - 検索条件オプション
   * @returns 条件に合致するMethodオブジェクトの配列
   */
  findByOptions(options: MethodSearchOptions): Promise<Method[]>;

  /**
   * 新しいMethodを作成
   * 
   * @param method - 作成するMethodオブジェクト
   * @returns 作成されたMethodオブジェクト（IDが割り当てられている）
   */
  create(method: Method): Promise<Method>;

  /**
   * 既存のMethodを更新
   * 
   * @param method - 更新するMethodオブジェクト
   * @returns 更新されたMethodオブジェクト
   * @throws {@link NotFoundError} - 指定したIDのMethodが存在しない場合
   */
  update(method: Method): Promise<Method>;

  /**
   * Methodをアーカイブまたは復元する
   * 
   * @param id - 対象のMethodのID
   * @param archived - アーカイブ状態にするかどうか
   * @returns 更新されたMethodオブジェクト
   * @throws {@link NotFoundError} - 指定したIDのMethodが存在しない場合
   */
  setArchiveStatus(id: string, archived: boolean): Promise<Method>;

  /**
   * Methodを削除する
   * 
   * @param id - 削除するMethodのID
   * @returns 削除が成功した場合はtrue
   * @throws {@link BusinessRuleError} - Methodが他のリソースから参照されている場合
   * @throws {@link NotFoundError} - 指定したIDのMethodが存在しない場合
   */
  delete(id: string): Promise<boolean>;
}