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
 * アプリケーション全体で一貫したエラー処理を提供するフック
 * コンポーネント内でのエラー状態管理と表示を簡素化します
 */
export function useErrorHandler() {
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [businessError, setBusinessError] = useState<{
    code: string;
    message: string;
    details?: unknown;
  } | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);

  /**
   * エラーオブジェクトを適切に処理してステートを更新する
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
   * 特定のビジネスルールエラーかどうかを判定するヘルパー
   */
  const isBusinessError = (code: BusinessRuleErrorCode): boolean => {
    return businessError?.code === code;
  };

  /**
   * エラー状態をリセットする
   */
  const resetErrors = () => {
    setValidationErrors({});
    setBusinessError(null);
    setSystemError(null);
  };

  /**
   * 特定のフィールドのバリデーションエラーメッセージを取得
   */
  const getFieldError = (fieldName: string): string | undefined => {
    const errors = validationErrors[fieldName];
    return errors && errors.length > 0 ? errors[0] : undefined;
  };

  /**
   * 特定のフィールドにエラーがあるかを判定
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