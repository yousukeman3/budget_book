import type { Debt } from "./debt";
import type { DebtType } from "../../../shared/types/debt.types";

/**
 * Debt(貸借管理)リポジトリのインターフェース
 * 貸借データのアクセスを抽象化する
 */
export interface DebtRepository {
  /**
   * IDでDebtを取得する
   * @param id - 取得する貸借ID
   * @returns 見つかったDebtインスタンス、または未定義
   */
  findById(id: string): Promise<Debt | undefined>;

  /**
   * 指定した条件でDebtを検索する
   * @param options - 検索条件
   * @returns 条件に合致するDebtの配列
   */
  findByOptions(options: DebtSearchOptions): Promise<Debt[]>;

  /**
   * 特定のルートエントリに関連するDebtを取得
   * @param rootEntryId - 起点となるEntryのID
   * @returns 関連するDebt、または未定義
   */
  findByRootEntryId(rootEntryId: string): Promise<Debt | undefined>;

  /**
   * 返済が完了していないDebtを検索
   * @param type - 貸借タイプ（任意）
   * @returns 未返済のDebtの配列
   */
  findOutstandingDebts(type?: DebtType): Promise<Debt[]>;

  /**
   * 新しいDebtを作成する
   * @param debt - 作成するDebtインスタンス
   * @returns 作成されたDebt（ID付き）
   */
  create(debt: Debt): Promise<Debt>;

  /**
   * 既存のDebtを更新する
   * @param debt - 更新するDebtインスタンス
   * @returns 更新されたDebt
   */
  update(debt: Debt): Promise<Debt>;

  /**
   * Debtを完済状態に更新する
   * @param id - 完済するDebtのID
   * @param repaidAt - 完済日
   * @returns 更新されたDebt
   */
  markAsRepaid(id: string, repaidAt: Date): Promise<Debt>;

  /**
   * Debtを削除する（関連するエントリも含めて削除する場合がある）
   * @param id - 削除するDebtのID
   * @returns 削除が成功したかどうか
   */
  delete(id: string): Promise<boolean>;
}

/**
 * Debt検索のオプション
 */
export interface DebtSearchOptions {
  /** 
   * 借入/貸付タイプ 
   * 
   * {@link DebtType} の値が設定されます
   */
  type?: DebtType;
  counterpart?: string;
  startDate?: Date;
  endDate?: Date;
  isRepaid?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * まとめて取得するためのページネーション結果
 */
export interface PagedDebts {
  debts: Debt[];
  totalCount: number;
  hasMore: boolean;
}