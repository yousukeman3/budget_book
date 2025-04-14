/**
 * バリデーションインターフェース
 * 
 * このインターフェースは、ドメインモデルと特定のバリデーションライブラリ（Zodなど）の
 * 依存関係を分離するために使用します。ドメインモデルはこのインターフェースに依存し、
 * 具体的な実装はインフラ層で提供されます。
 */
export interface Validator<T> {
  /**
   * データを検証します
   * 
   * @param data - 検証するデータ
   * @returns 検証済みのデータ（型安全）
   * @throws エラーが発生した場合は例外をスロー
   */
  validate(data: unknown): T;
}