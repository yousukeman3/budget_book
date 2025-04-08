// filepath: /app/src/shared/errors/AppError.ts
import { BusinessRuleErrorCode, SystemErrorCode, ResourceType, ValidationErrorCode } from './ErrorCodes';

/**
 * アプリケーション全体で使用する基底エラークラス
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
    // Error継承時のプロトタイプチェーンを正しく保つため
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * バリデーションエラークラス
 * フォームデータやAPIリクエストの入力値検証に関するエラー
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>,
    code: ValidationErrorCode = ValidationErrorCode.INVALID_INPUT
  ) {
    // detailsにvalidationErrorsを渡すようにして二重代入を避ける
    super(message, code, 400, validationErrors);
  }

  /**
   * Zodのバリデーションエラーから変換するファクトリメソッド
   */
  static fromZodError(zodError: any): ValidationError {
    // Zodエラーからフィールド名と対応するエラーメッセージの辞書を作成
    const validationErrors: Record<string, string[]> = {};
    
    if (zodError.errors) {
      for (const error of zodError.errors) {
        const path = error.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(error.message);
      }
    }
    
    return new ValidationError(
      '入力内容に誤りがあります',
      validationErrors
    );
  }
}

/**
 * ビジネスルールエラークラス
 * データ自体は有効だが、業務ルール上許可されない操作に関するエラー
 */
export class BusinessRuleError extends AppError {
  constructor(
    message: string,
    code: BusinessRuleErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message, code, 400, details);
  }
  
  // ビジネスエラーコードに基づくヘルパーメソッド
  isMethodArchived(): boolean {
    return this.code === BusinessRuleErrorCode.METHOD_ARCHIVED;
  }
  
  isDuplicateEntry(): boolean {
    return this.code === BusinessRuleErrorCode.DUPLICATE_ENTRY;
  }
  
  isDebtAlreadyRepaid(): boolean {
    return this.code === BusinessRuleErrorCode.DEBT_ALREADY_REPAID;
  }
  
  isExcessRepaymentAmount(): boolean {
    return this.code === BusinessRuleErrorCode.EXCESS_REPAYMENT_AMOUNT;
  }
  
  isIdenticalAccounts(): boolean {
    return this.code === BusinessRuleErrorCode.IDENTICAL_ACCOUNTS;
  }
  
  isInsufficientFunds(): boolean {
    return this.code === BusinessRuleErrorCode.INSUFFICIENT_FUNDS;
  }
}

/**
 * 存在しないリソースへのアクセスを表すエラークラス
 */
export class NotFoundError extends AppError {
  constructor(
    resourceType: ResourceType,
    resourceId?: string | number
  ) {
    const resourceName = getResourceDisplayName(resourceType);
    const message = `${resourceName}${resourceId ? ` (${resourceId})` : ''}が見つかりません`;
    super(message, `${resourceType}_NOT_FOUND`, 404);
  }
}

/**
 * システム内部や外部連携の問題によるエラークラス
 */
export class SystemError extends AppError {
  constructor(
    message: string,
    code: SystemErrorCode = SystemErrorCode.UNEXPECTED_ERROR,
    originalError?: unknown
  ) {
    super(message || 'システムエラーが発生しました', code, 500, originalError);
    
    // エラーログ記録
    console.error(`SystemError(${code}):`, message, originalError);
  }
}

/**
 * リソース種別の日本語表示名を取得
 */
function getResourceDisplayName(resourceType: ResourceType): string {
  switch (resourceType) {
    case ResourceType.ENTRY: return '記録';
    case ResourceType.CATEGORY: return 'カテゴリ';
    case ResourceType.METHOD: return '支払い方法';
    case ResourceType.DEBT: return '借金/貸付';
    case ResourceType.TRANSFER: return '振替';
    case ResourceType.USER: return 'ユーザー';
    default: return 'リソース';
  }
}