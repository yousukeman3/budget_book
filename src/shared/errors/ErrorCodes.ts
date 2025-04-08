// filepath: /app/src/shared/errors/ErrorCodes.ts
/**
 * バリデーションエラーコード
 * フォームデータやAPIリクエストなど、入力値の検証に関するエラー
 */
export const ValidationErrorCode = {
  INVALID_INPUT: 'INVALID_INPUT',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_VALUE_RANGE: 'INVALID_VALUE_RANGE',
} as const;
export type ValidationErrorCode = typeof ValidationErrorCode[keyof typeof ValidationErrorCode];

/**
 * ビジネスルールエラーコード
 * データ自体は有効だが、業務ルール上許可されない操作に関するエラー
 */
export const BusinessRuleErrorCode = {
  // 方法関連
  METHOD_ARCHIVED: 'METHOD_ARCHIVED',
  METHOD_IN_USE: 'METHOD_IN_USE',
  
  // エントリー関連
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  NEGATIVE_BALANCE: 'NEGATIVE_BALANCE',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  
  // 借金・貸付関連
  DEBT_ALREADY_REPAID: 'DEBT_ALREADY_REPAID',
  EXCESS_REPAYMENT_AMOUNT: 'EXCESS_REPAYMENT_AMOUNT',
  
  // 移動関連
  IDENTICAL_ACCOUNTS: 'IDENTICAL_ACCOUNTS',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  
  // ドメイン検証用（entry.tsで使用）
  INVALID_VALUE_RANGE: 'INVALID_VALUE_RANGE',
  INVALID_INPUT: 'INVALID_INPUT',
} as const;
export type BusinessRuleErrorCode = typeof BusinessRuleErrorCode[keyof typeof BusinessRuleErrorCode];

/**
 * システムエラーコード
 * システム内部や外部連携の問題によるエラー
 */
export const SystemErrorCode = {
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
} as const;
export type SystemErrorCode = typeof SystemErrorCode[keyof typeof SystemErrorCode];

/**
 * リソース種別（NotFoundError用）
 * 存在しないリソースへのアクセスを表現するためのリソースタイプ
 */
export const ResourceType = {
  ENTRY: 'ENTRY',
  CATEGORY: 'CATEGORY',
  METHOD: 'METHOD',
  DEBT: 'DEBT',
  TRANSFER: 'TRANSFER',
  USER: 'USER',
} as const;
export type ResourceType = typeof ResourceType[keyof typeof ResourceType];