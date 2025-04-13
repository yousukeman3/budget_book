// filepath: /app/src/shared/errors/AppError.ts
import { BusinessRuleErrorCode, SystemErrorCode, ResourceType, ValidationErrorCode } from './ErrorCodes';
import type { ZodError } from 'zod';

/**
 * アプリケーション全体で使用する基底エラークラス
 * すべてのカスタムエラークラスはこのクラスを継承します
 */
export abstract class AppError extends Error {
  /**
   * AppErrorコンストラクタ
   * @param message - エラーメッセージ
   * @param code - エラーコード
   * @param httpStatus - HTTPステータスコード
   * @param details - エラーに関する追加情報
   */
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
  /**
   * ValidationErrorコンストラクタ
   * @param message - エラーメッセージ
   * @param validationErrors - フィールド名をキーとするエラーメッセージの配列
   * @param code - バリデーションエラーコード
   */
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
   * @param zodError - Zodが生成したエラーオブジェクト
   * @returns ValidationErrorインスタンス
   */
  static fromZodError(zodError : ZodError): ValidationError {
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
  /**
   * BusinessRuleErrorコンストラクタ
   * @param message - エラーメッセージ
   * @param code - ビジネスルールエラーコード
   * @param details - エラーに関する追加情報
   */
  constructor(
    message: string,
    code: BusinessRuleErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message, code, 400, details);
  }
  
  // ビジネスエラーコードに基づくヘルパーメソッド
  /**
   * アーカイブされた支払い方法に関するエラーかどうかを判定
   * @returns エラーコードがMETHOD_ARCHIVEDの場合true
   */
  isMethodArchived(): boolean {
    return this.code === BusinessRuleErrorCode.METHOD_ARCHIVED;
  }
  
  /**
   * 重複エントリに関するエラーかどうかを判定
   * @returns エラーコードがDUPLICATE_ENTRYの場合true
   */
  isDuplicateEntry(): boolean {
    return this.code === BusinessRuleErrorCode.DUPLICATE_ENTRY;
  }
  
  /**
   * すでに完済された借金/貸付に関するエラーかどうかを判定
   * @returns エラーコードがDEBT_ALREADY_REPAIDの場合true
   */
  isDebtAlreadyRepaid(): boolean {
    return this.code === BusinessRuleErrorCode.DEBT_ALREADY_REPAID;
  }
  
  /**
   * 返済金額が残高を超えているエラーかどうかを判定
   * @returns エラーコードがEXCESS_REPAYMENT_AMOUNTの場合true
   */
  isExcessRepaymentAmount(): boolean {
    return this.code === BusinessRuleErrorCode.EXCESS_REPAYMENT_AMOUNT;
  }
  
  /**
   * 同一口座間での振替エラーかどうかを判定
   * @returns エラーコードがIDENTICAL_ACCOUNTSの場合true
   */
  isIdenticalAccounts(): boolean {
    return this.code === BusinessRuleErrorCode.IDENTICAL_ACCOUNTS;
  }
  
  /**
   * 残高不足エラーかどうかを判定
   * @returns エラーコードがINSUFFICIENT_FUNDSの場合true
   */
  isInsufficientFunds(): boolean {
    return this.code === BusinessRuleErrorCode.INSUFFICIENT_FUNDS;
  }
}

/**
 * 存在しないリソースへのアクセスを表すエラークラス
 */
export class NotFoundError extends AppError {
  /**
   * NotFoundErrorコンストラクタ
   * @param resourceType - リソースタイプ
   * @param resourceId - リソースの識別子（オプション）
   */
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
  /**
   * SystemErrorコンストラクタ
   * @param message - エラーメッセージ
   * @param code - システムエラーコード
   * @param originalError - 原因となったエラーオブジェクト（オプション）
   */
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
 * @param resourceType - リソースタイプ
 * @returns リソースの日本語表示名
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