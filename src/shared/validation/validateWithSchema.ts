import { ZodSchema } from 'zod';
import { ValidationError } from '../errors/AppError';

/**
 * Zodスキーマを使用してデータをバリデーションする共通関数
 * バリデーションエラーが発生した場合は、フォーマットしたエラー情報とともにValidationErrorをスローします
 * 
 * @param schema バリデーション用のZodスキーマ
 * @param data バリデーション対象のデータ
 * @returns バリデーションに成功した場合、型付けされたデータを返す
 * @throws ValidationError バリデーションに失敗した場合
 */
export function validateWithSchema<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const formattedErrors: Record<string, string[]> = {};
    
    result.error.errors.forEach(err => {
      const path = err.path.join('.');
      if (!formattedErrors[path]) {
        formattedErrors[path] = [];
      }
      formattedErrors[path].push(err.message);
    });
    
    throw new ValidationError('入力内容に問題があります', formattedErrors);
  }
  
  return result.data;
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