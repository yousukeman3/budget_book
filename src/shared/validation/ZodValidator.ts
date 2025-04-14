import type { z } from 'zod';
import type { Validator } from './Validator';
import { ValidationError } from '../errors/AppError';
import { ValidationErrorCode } from '../errors/ErrorCodes';

/**
 * Zodを使用したバリデータ実装
 * 
 * Zodスキーマを利用して入力データを検証するバリデータの実装です。
 * ドメインモデルはこの具体的な実装には依存せず、インターフェースのみに依存します。
 */
export class ZodValidator<T> implements Validator<T> {
  /**
   * コンストラクタ
   * 
   * @param schema - 検証に使用するZodスキーマ
   */
  constructor(private schema: z.ZodSchema<T>) {}

  /**
   * データを検証します
   * 
   * @param data - 検証するデータ
   * @returns 検証済みのデータ（型安全）
   * @throws ValidationError バリデーション失敗時
   */
  validate(data: unknown): T {
    try {
      return this.schema.parse(data);
    } catch (error) {
      if ((error as z.ZodError).name === 'ZodError') {
        const validationErrors: Record<string, string[]> = {};
        
        for (const issue of (error as z.ZodError).errors) {
          const path = issue.path.join('.');
          if (!validationErrors[path]) {
            validationErrors[path] = [];
          }
          validationErrors[path].push(issue.message);
        }
        
        throw new ValidationError(
          'バリデーションエラーが発生しました',
          validationErrors,
          ValidationErrorCode.INVALID_INPUT
        );
      }
      
      throw error;
    }
  }
}