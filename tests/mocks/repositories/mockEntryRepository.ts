import { EntryInput } from '../../factories/entryFactory';

/**
 * EntryRepositoryのインターフェース
 * 実際の実装とモックの間で一貫性を保つための型定義
 */
export interface IEntryRepository {
  create(data: EntryInput): Promise<any>;
  findById(id: string): Promise<any | null>;
  findByIdWithRelations(id: string): Promise<any | null>;
  update(id: string, data: Partial<EntryInput>): Promise<any>;
  delete(id: string): Promise<boolean>;
  findByFilters(filters: any): Promise<any[]>;
  // 他のメソッドも必要に応じて追加
}

/**
 * EntryRepositoryのモック実装
 * テストで使用するために、実際のデータベースではなくメモリ内にデータを保持
 */
export class MockEntryRepository implements IEntryRepository {
  private entries: Map<string, any> = new Map();
  private currentId = 1;

  /**
   * 新しいエントリを作成
   * @param data エントリデータ
   * @returns 作成されたエントリ
   */
  async create(data: EntryInput): Promise<any> {
    const id = `entry-${this.currentId++}`;
    const entry = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.entries.set(id, entry);
    return entry;
  }

  /**
   * IDによるエントリの検索
   * @param id エントリID
   * @returns エントリ、存在しない場合はnull
   */
  async findById(id: string): Promise<any | null> {
    return this.entries.get(id) || null;
  }

  /**
   * 関連データを含めたエントリの検索
   * @param id エントリID
   * @returns 関連データを含むエントリ、存在しない場合はnull
   */
  async findByIdWithRelations(id: string): Promise<any | null> {
    const entry = this.entries.get(id);
    if (!entry) return null;
    
    // ここで関連データをシミュレート（実際のテストケースに応じて拡張）
    return {
      ...entry,
      method: { id: entry.methodId, name: 'モックメソッド' },
      category: entry.categoryId ? { id: entry.categoryId, name: 'モックカテゴリ' } : null
    };
  }

  /**
   * エントリの更新
   * @param id 更新するエントリのID
   * @param data 更新データ
   * @returns 更新されたエントリ
   */
  async update(id: string, data: Partial<EntryInput>): Promise<any> {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`Entry with ID ${id} not found`);
    }
    
    const updated = {
      ...entry,
      ...data,
      updatedAt: new Date()
    };
    
    this.entries.set(id, updated);
    return updated;
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
   * フィルタによるエントリの検索
   * @param filters 検索フィルタ
   * @returns フィルタに一致するエントリの配列
   */
  async findByFilters(filters: any): Promise<any[]> {
    // 実際のフィルタリングロジックをテストケースに合わせて実装
    return Array.from(this.entries.values()).filter(entry => {
      // dateフィルタ
      if (filters.startDate && new Date(entry.date) < new Date(filters.startDate)) {
        return false;
      }
      if (filters.endDate && new Date(entry.date) > new Date(filters.endDate)) {
        return false;
      }
      
      // typeフィルタ
      if (filters.type && entry.type !== filters.type) {
        return false;
      }
      
      // methodIdフィルタ
      if (filters.methodId && entry.methodId !== filters.methodId) {
        return false;
      }
      
      // categoryIdフィルタ
      if (filters.categoryId && entry.categoryId !== filters.categoryId) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * テスト前にモックをリセット
   */
  reset(): void {
    this.entries.clear();
    this.currentId = 1;
  }
}