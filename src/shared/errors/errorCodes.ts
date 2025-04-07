/**
 * ビジネスルールエラーコード
 * ドメインのビジネスルール違反に関するエラーコードを定義します。
 * BusinessRuleErrorクラスと組み合わせて使用します。
 */
export const BusinessRuleErrorCode = {
  /** アーカイブ済みのMethodは使用できません */
  METHOD_ARCHIVED: 'METHOD_ARCHIVED',
  
  /** 同一日・同一金額・同一目的のEntryが既に存在します */
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  /** すでに完済されているDebtに対して返済操作はできません */
  DEBT_ALREADY_REPAID: 'DEBT_ALREADY_REPAID',
  
  /** 返済額が借入/貸付残高を超えています */
  REPAYMENT_EXCEEDS_BALANCE: 'REPAYMENT_EXCEEDS_BALANCE',
  
  /** 同一のMethod間では振替操作はできません */
  SAME_METHOD_TRANSFER: 'SAME_METHOD_TRANSFER',
  
  /** アーカイブ済みのMethod間では振替操作はできません */
  TRANSFER_WITH_ARCHIVED_METHOD: 'TRANSFER_WITH_ARCHIVED_METHOD',
  
  /** カテゴリとEntryTypeの分類が一致していません */
  CATEGORY_TYPE_MISMATCH: 'CATEGORY_TYPE_MISMATCH',
} as const;

export type BusinessRuleErrorCode = typeof BusinessRuleErrorCode[keyof typeof BusinessRuleErrorCode];

/**
 * システムエラーコード
 * アプリケーション内部や外部連携に関するエラーコードを定義します。
 * SystemErrorクラスと組み合わせて使用します。
 */
export const SystemErrorCode = {
  /** データベース操作エラー */
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  /** 外部API連携エラー */
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  
  /** ファイル操作エラー */
  FILE_OPERATION_ERROR: 'FILE_OPERATION_ERROR',
  
  /** 認証・認可エラー */
  AUTH_ERROR: 'AUTH_ERROR',
  
  /** 不明なシステムエラー */
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type SystemErrorCode = typeof SystemErrorCode[keyof typeof SystemErrorCode];

/**
 * リソース種別
 * NotFoundErrorで使用するリソース種別を定義します。
 */
export const ResourceType = {
  ENTRY: 'Entry',
  DEBT: 'Debt',
  METHOD: 'Method',
  CATEGORY: 'Category',
  TRANSFER: 'Transfer',
} as const;

export type ResourceType = typeof ResourceType[keyof typeof ResourceType];