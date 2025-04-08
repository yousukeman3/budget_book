// filepath: /app/src/modules/entry/domain/entryRepository.ts
import { Decimal } from "@prisma/client/runtime/library";
import { Entry } from "./entry";

/**
 * Entry(収支記録)リポジトリのインターフェース
 * データ永続化層との通信を抽象化する
 */
export interface EntryRepository {
  /**
   * IDでEntryを取得する
   * @param id 取得するエントリーID
   * @returns 見つかったEntryインスタンス、または未定義
   */
  findById(id: string): Promise<Entry | undefined>;

  /**
   * 指定した条件でEntryを検索する
   * @param options 検索条件（日付範囲やタイプなど）
   * @returns 条件に合致するEntryの配列
   */
  findByOptions(options: EntrySearchOptions): Promise<Entry[]>;

  /**
   * 特定の支払い方法に関連するEntryをすべて取得
   * @param methodId 支払い方法のID
   * @returns 指定した支払い方法に関連するEntryの配列
   */
  findByMethodId(methodId: string): Promise<Entry[]>;

  /**
   * 特定のカテゴリに関連するEntryをすべて取得
   * @param categoryId カテゴリID
   * @returns 指定したカテゴリに関連するEntryの配列
   */
  findByCategoryId(categoryId: string): Promise<Entry[]>;

  /**
   * 特定のDebtに関連するEntryをすべて取得
   * @param debtId 債務ID
   * @returns 指定したDebtに関連するEntryの配列
   */
  findByDebtId(debtId: string): Promise<Entry[]>;

  /**
   * 新しいEntryを作成する
   * @param entry 作成するEntryインスタンス
   * @returns 作成されたEntry（ID付き）
   */
  create(entry: Entry): Promise<Entry>;

  /**
   * 既存のEntryを更新する
   * @param entry 更新するEntryインスタンス
   * @returns 更新されたEntry
   */
  update(entry: Entry): Promise<Entry>;

  /**
   * Entryを削除する
   * @param id 削除するEntryのID
   * @returns 削除が成功したかどうか
   */
  delete(id: string): Promise<boolean>;

  /**
   * 日付範囲内のEntryの合計を計算する
   * @param methodId 対象のMethod ID
   * @param startDate 集計開始日
   * @param endDate 集計終了日
   * @returns 合計金額（収入はプラス、支出はマイナス）
   */
  calculateBalance(methodId: string, startDate: Date, endDate: Date): Promise<Decimal>;
}

/**
 * Entry検索のオプション
 */
export interface EntrySearchOptions {
  startDate?: Date;
  endDate?: Date;
  types?: string[];
  methodIds?: string[];
  categoryIds?: string[];
  debtId?: string;
  includePrivate?: boolean; // privatePurposeを含めるかどうか
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * まとめて取得するためのページネーション結果
 */
export interface PagedEntries {
  entries: Entry[];
  totalCount: number;
  hasMore: boolean;
}