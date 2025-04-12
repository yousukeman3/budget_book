// filepath: /app/src/shared/hooks/useErrorHandler.ts
import { useState } from 'react';
import { 
  BusinessRuleErrorCode, 
  SystemErrorCode, 
  ValidationErrorCode 
} from '../errors/ErrorCodes';
import { 
  AppError, 
  BusinessRuleError, 
  SystemError, 
  ValidationError 
} from '../errors/AppError';

/**
 * エラーハンドリングフックの戻り値の型定義
 */
interface ErrorHandlerHookResult {
  /** バリデーションエラーのマップ（フィールド名 -> エラーメッセージ配列） */
  validationErrors: Record<string, string[]>;
  
  /** ビジネスルールエラーの情報 */
  businessError: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
  
  /** システムエラーメッセージ */
  systemError: string | null;
  
  /**
   * エラーオブジェクトを適切に処理する関数
   * @param error 処理対象のエラーオブジェクト
   */
  handleError: (error: unknown) => void;
  
  /**
   * 特定のビジネスルールエラーかどうかを判定する関数
   * @param code 判定するビジネスルールエラーコード
   * @returns エラーコードが一致する場合true
   */
  isBusinessError: (code: BusinessRuleErrorCode) => boolean;
  
  /** すべてのエラー状態をリセットする関数 */
  resetErrors: () => void;
  
  /**
   * 特定のフィールドのバリデーションエラーメッセージを取得する関数
   * @param fieldName フィールド名
   * @returns エラーメッセージまたはundefined
   */
  getFieldError: (fieldName: string) => string | undefined;
  
  /**
   * 特定のフィールドにエラーがあるかを判定する関数
   * @param fieldName フィールド名
   * @returns エラーがある場合true
   */
  hasFieldError: (fieldName: string) => boolean;
}

/**
 * アプリケーション全体で一貫したエラー処理を提供するフック
 * コンポーネント内でのエラー状態管理と表示を簡素化します
 * 
 * 使用例:
 * ```tsx
 * const { validationErrors, businessError, systemError, handleError, getFieldError } = useErrorHandler();
 * 
 * const handleSubmit = async (data) => {
 *   try {
 *     await saveData(data);
 *   } catch (error) {
 *     handleError(error);
 *   }
 * };
 * 
 * return (
 *   <form>
 *     <input name="amount" />
 *     {getFieldError('amount') && <p className="error">{getFieldError('amount')}</p>}
 *     {businessError && <div className="alert">{businessError.message}</div>}
 *     {systemError && <div className="alert-danger">{systemError}</div>}
 *   </form>
 * );
 * ```
 * 
 * @returns エラー状態と操作関数を含むオブジェクト
 */
export function useErrorHandler(): ErrorHandlerHookResult {
  // バリデーションエラー状態（フィールド名 -> エラーメッセージ配列）
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  
  // ビジネスルールエラー状態
  const [businessError, setBusinessError] = useState<{
    code: string;
    message: string;
    details?: unknown;
  } | null>(null);
  
  // システムエラー状態
  const [systemError, setSystemError] = useState<string | null>(null);

  /**
   * エラーオブジェクトを適切に処理してステートを更新する
   * 受け取ったエラーの種類に応じて適切なステートを更新します
   * 
   * @param error 処理対象のエラーオブジェクト
   */
  const handleError = (error: unknown) => {
    // すべてのエラー状態をリセット
    setValidationErrors({});
    setBusinessError(null);
    setSystemError(null);

    if (!error) return;

    // エラータイプに基づいた処理
    if (error instanceof ValidationError) {
      setValidationErrors(error.validationErrors || {});
      return;
    }

    if (error instanceof BusinessRuleError) {
      setBusinessError({
        code: error.code,
        message: error.message,
        details: error.details
      });
      return;
    }

    if (error instanceof SystemError) {
      setSystemError(error.message || 'システムエラーが発生しました');
      // システムエラーはログにも記録
      console.error('システムエラー:', error);
      return;
    }

    // その他のエラー（AppErrorではないもの）
    let message = '予期しないエラーが発生しました';
    if (error instanceof Error) {
      message = error.message || message;
    } else if (typeof error === 'string') {
      message = error;
    }
    
    setSystemError(message);
    console.error('未分類エラー:', error);
  };

  /**
   * 特定のビジネスルールエラーかどうかを判定する
   * 
   * @param code 判定するビジネスルールエラーコード
   * @returns エラーコードが一致する場合true
   */
  const isBusinessError = (code: BusinessRuleErrorCode): boolean => {
    return businessError?.code === code;
  };

  /**
   * すべてのエラー状態をリセットする
   */
  const resetErrors = () => {
    setValidationErrors({});
    setBusinessError(null);
    setSystemError(null);
  };

  /**
   * 特定のフィールドのバリデーションエラーメッセージを取得する
   * 
   * @param fieldName フィールド名
   * @returns エラーメッセージまたはundefined
   */
  const getFieldError = (fieldName: string): string | undefined => {
    const errors = validationErrors[fieldName];
    return errors && errors.length > 0 ? errors[0] : undefined;
  };

  /**
   * 特定のフィールドにエラーがあるかを判定する
   * 
   * @param fieldName フィールド名
   * @returns エラーがある場合true
   */
  const hasFieldError = (fieldName: string): boolean => {
    return !!getFieldError(fieldName);
  };

  return {
    validationErrors,
    businessError,
    systemError,
    handleError,
    isBusinessError,
    resetErrors,
    getFieldError,
    hasFieldError
  };
}