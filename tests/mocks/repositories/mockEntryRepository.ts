import { Decimal } from "@prisma/client/runtime/library";
import { Entry } from "../../../src/modules/entry/domain/entry";
import { randomUUID } from "crypto";
import { EntryRepository, EntrySearchOptions, PagedEntries } from "../../../src/modules/entry/domain/entryRepository";

/**
 * EntryRepositoryのモック実装
 * テストで使用するために、実際のデータベースではなくメモリ内にデータを保持
 */
export class MockEntryRepository implements EntryRepository {
  private entries: Map<string, Entry> = new Map();
  private currentId = 1;

  /**
   * IDによるエントリの検索
   * @param id エントリID
   * @returns エントリ、存在しない場合はundefined
   */
  async findById(id: string): Promise<Entry | undefined> {
    return this.entries.get(id) || undefined;
  }

  /**
   * 新しいエントリを作成
   * @param entry エントリデータ
   * @returns 作成されたエントリ
   */
  async create(entry: Entry): Promise<Entry> {
        const id = entry.id || randomUUID();
    const date = entry.date || new Date();
        const newEntry = Entry.create({...entry, date, id});
    this.entries.set(id, newEntry);
    return newEntry;
  }

  /**
   * 既存のエントリを更新する
   * @param entry 更新するエントリ
   * @returns 更新されたエントリ
   */
  async update(entry: Entry): Promise<Entry> {
    if (!this.entries.has(entry.id)) {
      throw new Error(`Entry with ID ${entry.id} not found`);
    }
    
    this.entries.set(entry.id, entry);
    return entry;
  }

  /**
   * エントリの削除
   * @param id 削除するエントリのID
   * @returns 削除成功の場合true、失敗の場合false
   */
  async delete(id: string): Promise<boolean> {
    return this.entries.delete(id);
  }

  /**
   * 指定した条件でEntryを検索する
   * @param options 検索条件（日付範囲やタイプなど）
   * @returns 条件に合致するEntryの配列
   */
  async findByOptions(options: EntrySearchOptions): Promise<Entry[]> {
    let results = Array.from(this.entries.values());
    
    // dateフィルタ
    if (options.startDate) {
      results = results.filter(entry => entry.date >= options.startDate!);
    }
    if (options.endDate) {
      results = results.filter(entry => entry.date <= options.endDate!);
    }
    
    // typesフィルタ
    if (options.types && options.types.length > 0) {
      results = results.filter(entry => options.types!.includes(entry.type));
    }
    
    // methodIdsフィルタ
    if (options.methodIds && options.methodIds.length > 0) {
      results = results.filter(entry => options.methodIds!.includes(entry.methodId));
    }
    
    // categoryIdsフィルタ
    if (options.categoryIds && options.categoryIds.length > 0) {
      results = results.filter(entry => entry.categoryId && options.categoryIds!.includes(entry.categoryId));
    }
    
    // debtIdフィルタ
    if (options.debtId) {
      results = results.filter(entry => entry.debtId === options.debtId);
    }
    
    // ソート
    if (options.sortBy) {
      const direction = options.sortDirection === 'desc' ? -1 : 1;
      results.sort((a: any, b: any) => {
        if (a[options.sortBy!] < b[options.sortBy!]) return -1 * direction;
        if (a[options.sortBy!] > b[options.sortBy!]) return 1 * direction;
        return 0;
      });
    }
    
    // ページネーション
    if (options.limit !== undefined) {
      const offset = options.offset || 0;
      results = results.slice(offset, offset + options.limit);
    }
    
    return results;
  }

  /**
   * ページング機能付きでEntryを検索する
   * @param options 検索条件とページネーション設定
   * @returns ページ分割されたエントリ結果
   */
  async findByOptionsWithPaging(options: EntrySearchOptions): Promise<PagedEntries> {
    // 全件取得（フィルター適用）
    let allResults = await this.findByOptions({
      ...options,
      limit: undefined, // 全件取得するためにlimitを無効化
      offset: undefined
    });
    
    // 総件数を記録
    const totalCount = allResults.length;
    
    // ページネーション適用（指定がある場合）
    const limit = options.limit || totalCount;
    const offset = options.offset || 0;
    const entries = allResults.slice(offset, offset + limit);
    
    // 次のページがあるかどうか
    const hasMore = offset + limit < totalCount;
    
    return {
      entries,
      totalCount,
      hasMore
    };
  }

  /**
   * 特定の支払い方法に関連するEntryをすべて取得
   * @param methodId 支払い方法のID
   * @returns 指定した支払い方法に関連するEntryの配列
   */
  async findByMethodId(methodId: string): Promise<Entry[]> {
    return Array.from(this.entries.values()).filter(entry => entry.methodId === methodId);
  }

  /**
   * 特定のカテゴリに関連するEntryをすべて取得
   * @param categoryId カテゴリID
   * @returns 指定したカテゴリに関連するEntryの配列
   */
  async findByCategoryId(categoryId: string): Promise<Entry[]> {
    return Array.from(this.entries.values()).filter(entry => entry.categoryId === categoryId);
  }

  /**
   * 特定のDebtに関連するEntryをすべて取得
   * @param debtId 債務ID
   * @returns 指定したDebtに関連するEntryの配列
   */
  async findByDebtId(debtId: string): Promise<Entry[]> {
    return Array.from(this.entries.values()).filter(entry => entry.debtId === debtId);
  }

  /**
   * 日付範囲内のEntryの合計を計算する
   * @param methodId 対象のMethod ID
   * @param startDate 集計開始日
   * @param endDate 集計終了日
   * @returns 合計金額（収入はプラス、支出はマイナス）
   */
  async calculateBalance(methodId: string, startDate: Date, endDate: Date): Promise<Decimal> {
    const entries = Array.from(this.entries.values()).filter(entry => {
      return entry.methodId === methodId && 
             entry.date >= startDate && 
             entry.date <= endDate;
    });
    
    // Entry.getBalanceImpact()を利用して、各エントリによる残高への影響を計算
    return entries.reduce((sum, entry) => {
      return sum.add(entry.getBalanceImpact());
    }, new Decimal(0));
  }

  /**
   * テスト前にモックをリセット
   */
  reset(): void {
    this.entries.clear();
    this.currentId = 1;
  }
}