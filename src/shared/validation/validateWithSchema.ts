/**
 * Zodスキーマを使用した共通バリデーション関数モジュール
 * 
 * このモジュールは、アプリケーション全体で一貫したバリデーション処理を提供します。
 * Zodスキーマを使用してデータの検証と型安全な変換を行います。
 * 
 * @module validateWithSchema
 */
import { ZodSchema } from 'zod';
import { ValidationError } from '../errors/AppError';
import { ValidationErrorCode } from '../errors/ErrorCodes';

/**
 * Zodスキーマを使用してデータを検証する汎用関数
 * 
 * この関数はZodスキーマに対するデータの検証を行い、検証に成功した場合は
 * バリデーション済みの型安全なデータを返します。失敗した場合は
 * ValidationErrorとして詳細なエラー情報を提供します。
 * 
 * @template T - スキーマの出力型
 * @param {ZodSchema<T>} schema - 検証に使用するZodスキーマ
 * @param {unknown} data - 検証対象のデータ
 * @returns {T} 検証に成功した型安全なデータ
 * @throws {ValidationError} バリデーションエラー（詳細なフィールドエラーを含む）
 * 
 * @example
 * ```typescript
 * // スキーマ定義
 * const userSchema = z.object({
 *   name: z.string().min(3),
 *   age: z.number().positive()
 * });
 * 
 * // 検証実行
 * try {
 *   const validUser = validateWithSchema(userSchema, userInput);
 *   // validUser は型安全（{ name: string, age: number }型）
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.log(error.validationErrors); // { name: ["文字列が短すぎます"], ... }
 *   }
 * }
 * ```
 */
export function validateWithSchema<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    // スキーマを使用してデータを検証・変換
    return schema.parse(data);
  } catch (error : any) {
    // Zodのエラー形式からアプリケーション固有のValidationErrorに変換
    if (error.name === 'ZodError') {
      // エラーメッセージの詳細マップを作成
      const validationErrors: Record<string, string[]> = {};
      
      for (const issue of error.errors) {
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
    
    // 予期しないエラーの場合はそのままスロー
    throw error;
  }
}

/**
 * Zodスキーマでバリデーションし、問題があればカスタムメッセージとしてフォーマット
 * 主にサーバーアクション内で使用することを想定
 * 
 * @param schema バリデーション用のZodスキーマ
 * @param data バリデーション対象のデータ
 * @param customErrorMessage カスタムエラーメッセージ（省略可）
 * @returns バリデーションに成功した場合、型付けされたデータを返す
 */
export function validateOrThrow<T>(
  schema: ZodSchema<T>,
  data: unknown,
  customErrorMessage = '入力内容に問題があります'
): T {
  return validateWithSchema(schema, data);
}

/**
 * Zodバリデーションエラーを人間が読みやすい形式に変換
 * 主にUIコンポーネントでのエラー表示に使用
 * 
 * @param error ValidationError オブジェクト
 * @returns フィールド名をキーとし、エラーメッセージ配列を値とするオブジェクト
 */
export function formatValidationErrors(error: ValidationError): Record<string, string[]> {
  if (!error.details || typeof error.details !== 'object') {
    return { _form: ['不明なエラーが発生しました'] };
  }
  
  return error.details as Record<string, string[]>;
}