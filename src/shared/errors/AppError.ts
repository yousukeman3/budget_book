import { BusinessRuleErrorCode, SystemErrorCode, ResourceType } from './errorCodes';

/**
 * アプリケーション共通の基底エラークラス
 * すべてのカスタムエラーはこのクラスを継承します
 */
export abstract class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number = 400,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * バリデーションエラー
 * 入力値の検証に失敗した場合に発生するエラー
 * 主にZodスキーマのパースエラーから生成される
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

/**
 * ビジネスルールエラー
 * アプリケーションのドメインルールに違反した場合に発生するエラー
 */
export class BusinessRuleError extends AppError {
  constructor(message: string, code: BusinessRuleErrorCode) {
    super(message, code, 400);
  }
}

/**
 * リソース未検出エラー
 * 要求されたリソースが見つからない場合に発生するエラー
 */
export class NotFoundError extends AppError {
  constructor(resource: ResourceType, id?: string) {
    super(
      `${resource}${id ? ` (${id})` : ''}が見つかりません`,
      'RESOURCE_NOT_FOUND',
      404
    );
  }
}

/**
 * システムエラー
 * アプリケーション内部やインフラストラクチャレベルのエラー
 * ユーザー操作では回避できない問題を表す
 */
export class SystemError extends AppError {
  constructor(message: string, code: SystemErrorCode = 'UNKNOWN_ERROR', originalError?: unknown) {
    super(
      message || 'システムエラーが発生しました',
      code,
      500,
      originalError
    );
    
    // エラーロギング（本番環境では適切なロガーを使用）
    console.error(`SystemError: ${message}`, {
      code,
      originalError,
      stack: this.stack
    });
  }
}