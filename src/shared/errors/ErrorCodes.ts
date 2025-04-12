// filepath: /app/src/shared/errors/ErrorCodes.ts
/**
 * エラーコード定義モジュール
 * アプリケーション全体で使用する型安全なエラーコードを定義します。
 * 自己説明的なコード名を使用し、型システムと連携させることで安全なエラー処理を実現します。
 */

/**
 * バリデーションエラーコード
 * フォームデータやAPIリクエストなど、入力値の検証に関するエラー
 */
export const ValidationErrorCode = {
  /** 一般的な無効な入力値エラー */
  INVALID_INPUT: 'INVALID_INPUT',
  /** 必須フィールドが未入力 */
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  /** データ形式不正（日付形式、メールアドレスなど） */
  INVALID_FORMAT: 'INVALID_FORMAT',
  /** 値の範囲外エラー（最小値/最大値など） */
  INVALID_VALUE_RANGE: 'INVALID_VALUE_RANGE',
} as const;
export type ValidationErrorCode = typeof ValidationErrorCode[keyof typeof ValidationErrorCode];

/**
 * ビジネスルールエラーコード
 * データ自体は有効だが、業務ルール上許可されない操作に関するエラー
 */
export const BusinessRuleErrorCode = {
  // 方法関連
  /** アーカイブ済みの支払い方法を使用しようとした */
  METHOD_ARCHIVED: 'METHOD_ARCHIVED',
  /** 使用中の支払い方法を削除/無効化しようとした */
  METHOD_IN_USE: 'METHOD_IN_USE',
  
  // エントリー関連
  /** 同じ内容のエントリがすでに存在する */
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  /** 残高がマイナスになる操作を行おうとした */
  NEGATIVE_BALANCE: 'NEGATIVE_BALANCE',
  /** 有効な日付範囲外（例：未来日付の入力禁止など） */
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  
  // 借金・貸付関連
  /** すでに完済済みの借金/貸付に対する操作 */
  DEBT_ALREADY_REPAID: 'DEBT_ALREADY_REPAID',
  /** 返済金額が残高を超えている */
  EXCESS_REPAYMENT_AMOUNT: 'EXCESS_REPAYMENT_AMOUNT',
  
  // 移動関連
  /** 同じ口座間での振替を試みた */
  IDENTICAL_ACCOUNTS: 'IDENTICAL_ACCOUNTS',
  /** 振替元口座の残高不足 */
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  /** 値の組み合わせが無効（例：金額と日付の組み合わせが不正など） */
  INVALID_VALUE_COMBINATION: 'INVALID_VALUE_COMBINATION',
  
  // ドメイン検証用（entry.tsで使用）
  /** 値が許容範囲外（金額が負数など） */
  INVALID_VALUE_RANGE: 'INVALID_VALUE_RANGE',
  /** 入力値が無効（型エラーなど） */
  INVALID_INPUT: 'INVALID_INPUT',
} as const;
export type BusinessRuleErrorCode = typeof BusinessRuleErrorCode[keyof typeof BusinessRuleErrorCode];

/**
 * システムエラーコード
 * システム内部や外部連携の問題によるエラー、ユーザー操作では回避できないもの
 */
export const SystemErrorCode = {
  /** データベース接続やクエリの実行エラー */
  DATABASE_ERROR: 'DATABASE_ERROR',
  /** ネットワーク接続の問題 */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** 認証・認可に関するエラー */
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  /** 外部APIとの連携エラー */
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  /** その他予期せぬシステムエラー */
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
} as const;
export type SystemErrorCode = typeof SystemErrorCode[keyof typeof SystemErrorCode];

/**
 * リソース種別（NotFoundError用）
 * 存在しないリソースへのアクセスを表現するためのリソースタイプ
 */
export const ResourceType = {
  /** 収支記録 */
  ENTRY: 'ENTRY',
  /** カテゴリ */
  CATEGORY: 'CATEGORY',
  /** 支払い方法 */
  METHOD: 'METHOD',
  /** 借入・貸付 */
  DEBT: 'DEBT',
  /** 振替 */
  TRANSFER: 'TRANSFER',
  /** ユーザー */
  USER: 'USER',
} as const;
export type ResourceType = typeof ResourceType[keyof typeof ResourceType];