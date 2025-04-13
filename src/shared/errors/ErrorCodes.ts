// filepath: /app/src/shared/errors/ErrorCodes.ts
/**
 * エラーコード定義モジュール
 * アプリケーション全体で使用する型安全なエラーコードを定義します。
 * 自己説明的なコード名を使用し、型システムと連携させることで安全なエラー処理を実現します。
 * 
 */

/**
 * バリデーションエラーコード
 * フォームデータやAPIリクエストなど、入力値の検証に関するエラー
 */
export const ValidationErrorCode = {
  /** 
   * 一般的な無効な入力値エラー
   * 
   * @remarks
   * 入力値がバリデーションルールに適合しない場合に使用します。
   * 
   * @example
   * ```typescript
   * // 入力値がバリデーションに失敗した場合
   * throw new ValidationError('入力値が無効です', { email: ['有効なメールアドレス形式ではありません'] }, ValidationErrorCode.INVALID_INPUT);
   * ```
   */
  INVALID_INPUT: 'INVALID_INPUT',
  
  /** 
   * 必須フィールドが未入力
   * 
   * @remarks
   * 必須入力項目が空白または未入力の場合に使用します。
   * 
   * @example
   * ```typescript
   * // 必須フィールドが未入力の場合
   * throw new ValidationError('必須項目を入力してください', { name: ['名前は必須です'] }, ValidationErrorCode.REQUIRED_FIELD);
   * ```
   */
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  
  /** 
   * データ形式不正（日付形式、メールアドレスなど）
   * 
   * @remarks
   * 入力値の書式やフォーマットが正しくない場合に使用します。
   * 
   * @example
   * ```typescript
   * // 日付形式が不正な場合
   * throw new ValidationError('データ形式が不正です', { date: ['yyyy-MM-dd形式で入力してください'] }, ValidationErrorCode.INVALID_FORMAT);
   * ```
   */
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  /** 
   * 値の範囲外エラー（最小値/最大値など）
   * 
   * @remarks
   * 値が許容範囲を超えている場合に使用します。
   * 
   * @example
   * ```typescript
   * // 金額が範囲外の場合
   * throw new ValidationError('値が範囲外です', { amount: ['金額は1〜1000000の間で入力してください'] }, ValidationErrorCode.INVALID_VALUE_RANGE);
   * ```
   */
  INVALID_VALUE_RANGE: 'INVALID_VALUE_RANGE',
} as const;
export type ValidationErrorCode = typeof ValidationErrorCode[keyof typeof ValidationErrorCode];

/**
 * ビジネスルールエラーコード
 * データ自体は有効だが、業務ルール上許可されない操作に関するエラー
 */
export const BusinessRuleErrorCode = {
  // 方法関連
  /** 
   * アーカイブ済みの支払い方法を使用しようとした
   * 
   * @remarks
   * 無効化済みの支払い方法でエントリーを登録しようとした場合などに使用します。
   * 
   * @example
   * ```typescript
   * // アーカイブ済みの支払い方法を使用しようとした場合
   * throw new BusinessRuleError('この支払い方法はアーカイブされているため使用できません', BusinessRuleErrorCode.METHOD_ARCHIVED);
   * ```
   */
  METHOD_ARCHIVED: 'METHOD_ARCHIVED',
  
  /** 
   * 使用中の支払い方法を削除/無効化しようとした
   * 
   * @remarks
   * エントリーで使用されている支払い方法を削除しようとした場合などに使用します。
   * 
   * @example
   * ```typescript
   * // 既に使用されている支払い方法を削除しようとした場合
   * throw new BusinessRuleError('この支払い方法は使用中のため削除できません', BusinessRuleErrorCode.METHOD_IN_USE);
   * ```
   */
  METHOD_IN_USE: 'METHOD_IN_USE',
  
  // エントリー関連
  /** 
   * 同じ内容のエントリがすでに存在する
   * 
   * @remarks
   * 同一の日付・金額・目的を持つエントリがすでに登録されている場合などに使用します。
   * 
   * @example
   * ```typescript
   * // 重複するエントリを登録しようとした場合
   * throw new BusinessRuleError('同じ内容のエントリが既に存在します', BusinessRuleErrorCode.DUPLICATE_ENTRY);
   * ```
   */
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  /** 
   * 残高がマイナスになる操作を行おうとした
   * 
   * @remarks
   * 残高を超える支出や振替を行おうとした場合などに使用します。
   * 
   * @example
   * ```typescript
   * // 残高を超える引き出しを行おうとした場合
   * throw new BusinessRuleError('残高不足のため操作を完了できません', BusinessRuleErrorCode.NEGATIVE_BALANCE);
   * ```
   */
  NEGATIVE_BALANCE: 'NEGATIVE_BALANCE',
  
  /** 
   * 有効な日付範囲外（例：未来日付の入力禁止など）
   * 
   * @remarks
   * システムで許可されていない日付範囲の値が指定された場合に使用します。
   * 
   * @example
   * ```typescript
   * // 未来日付のエントリを登録しようとした場合
   * throw new BusinessRuleError('未来の日付は指定できません', BusinessRuleErrorCode.INVALID_DATE_RANGE);
   * ```
   */
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  
  // 借金・貸付関連
  /** 
   * すでに完済済みの借金/貸付に対する操作
   * 
   * @remarks
   * 返済完了済みの債務に対して返済操作を行おうとした場合などに使用します。
   * 
   * @example
   * ```typescript
   * // 返済済みの借金に対して返済を記録しようとした場合
   * throw new BusinessRuleError('この借金/貸付はすでに完済済みです', BusinessRuleErrorCode.DEBT_ALREADY_REPAID);
   * ```
   */
  DEBT_ALREADY_REPAID: 'DEBT_ALREADY_REPAID',
  
  /** 
   * 返済金額が残高を超えている
   * 
   * @remarks
   * 借入/貸付の残高を超える返済額が指定された場合に使用します。
   * 
   * @example
   * ```typescript
   * // 借金残高を超える返済を記録しようとした場合
   * throw new BusinessRuleError('返済金額が残高を超えています', BusinessRuleErrorCode.EXCESS_REPAYMENT_AMOUNT);
   * ```
   */
  EXCESS_REPAYMENT_AMOUNT: 'EXCESS_REPAYMENT_AMOUNT',
  
  // 移動関連
  /** 
   * 同じ口座間での振替を試みた
   * 
   * @remarks
   * 同一の支払い方法間で振替を実行しようとした場合に使用します。
   * 
   * @example
   * ```typescript
   * // 同じ口座間で振替を行おうとした場合
   * throw new BusinessRuleError('同じ口座間での振替はできません', BusinessRuleErrorCode.IDENTICAL_ACCOUNTS);
   * ```
   */
  IDENTICAL_ACCOUNTS: 'IDENTICAL_ACCOUNTS',
  
  /** 
   * 振替元口座の残高不足
   * 
   * @remarks
   * 振替元の支払い方法に十分な残高がない場合に使用します。
   * 
   * @example
   * ```typescript
   * // 残高不足の口座から振替を行おうとした場合
   * throw new BusinessRuleError('振替元口座の残高が不足しています', BusinessRuleErrorCode.INSUFFICIENT_FUNDS);
   * ```
   */
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  
  /** 
   * 値の組み合わせが無効（例：金額と日付の組み合わせが不正など）
   * 
   * @remarks
   * 個々の値は有効でも、組み合わせとして不正な場合に使用します。
   * 
   * @example
   * ```typescript
   * // 不正な値の組み合わせを使用した場合
   * throw new BusinessRuleError('金額と日付の組み合わせが不正です', BusinessRuleErrorCode.INVALID_VALUE_COMBINATION);
   * ```
   */
  INVALID_VALUE_COMBINATION: 'INVALID_VALUE_COMBINATION',
  
  // ドメイン検証用（entry.tsで使用）
  /** 
   * 値が許容範囲外（金額が負数など）
   * 
   * @remarks
   * ドメインロジックで定義された値の許容範囲を超えた場合に使用します。
   * 
   * @example
   * ```typescript
   * // 負の金額を入力しようとした場合
   * throw new BusinessRuleError('金額は0より大きい値を入力してください', BusinessRuleErrorCode.INVALID_VALUE_RANGE);
   * ```
   */
  INVALID_VALUE_RANGE: 'INVALID_VALUE_RANGE',
  
  /** 
   * 入力値が無効（型エラーなど）
   * 
   * @remarks
   * ドメインモデルの不変条件に違反する入力値の場合に使用します。
   * 
   * @example
   * ```typescript
   * // 無効な入力値を指定した場合
   * throw new BusinessRuleError('入力値が不正です', BusinessRuleErrorCode.INVALID_INPUT);
   * ```
   */
  INVALID_INPUT: 'INVALID_INPUT',
} as const;
export type BusinessRuleErrorCode = typeof BusinessRuleErrorCode[keyof typeof BusinessRuleErrorCode];

/**
 * システムエラーコード
 * システム内部や外部連携の問題によるエラー、ユーザー操作では回避できないもの
 */
export const SystemErrorCode = {
  /** 
   * データベース接続やクエリの実行エラー
   * 
   * @remarks
   * データベース操作に関連するエラーが発生した場合に使用します。
   * 
   * @example
   * ```typescript
   * // データベース接続エラー時
   * throw new SystemError('データベース操作中にエラーが発生しました', SystemErrorCode.DATABASE_ERROR, originalError);
   * ```
   */
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  /** 
   * ネットワーク接続の問題
   * 
   * @remarks
   * ネットワーク通信に関連するエラーが発生した場合に使用します。
   * 
   * @example
   * ```typescript
   * // API呼び出し中のネットワークエラー時
   * throw new SystemError('ネットワーク接続に問題があります', SystemErrorCode.NETWORK_ERROR, originalError);
   * ```
   */
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  /** 
   * 認証・認可に関するエラー
   * 
   * @remarks
   * ユーザー認証や権限に関連するエラーが発生した場合に使用します。
   * 
   * @example
   * ```typescript
   * // 認証失敗時
   * throw new SystemError('認証に失敗しました。再ログインしてください', SystemErrorCode.AUTHENTICATION_ERROR);
   * ```
   */
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  
  /** 
   * 外部APIとの連携エラー
   * 
   * @remarks
   * 外部サービスとの連携中にエラーが発生した場合に使用します。
   * 
   * @example
   * ```typescript
   * // 外部APIからエラーレスポンスを受け取った場合
   * throw new SystemError('外部サービスとの連携中にエラーが発生しました', SystemErrorCode.EXTERNAL_API_ERROR, apiResponse);
   * ```
   */
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  
  /** 
   * その他予期せぬシステムエラー
   * 
   * @remarks
   * 他のカテゴリに分類できない予期しないシステムエラーの場合に使用します。
   * 
   * @example
   * ```typescript
   * // 想定外のエラー発生時
   * throw new SystemError('予期しないエラーが発生しました', SystemErrorCode.UNEXPECTED_ERROR, originalError);
   * ```
   */
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
} as const;
export type SystemErrorCode = typeof SystemErrorCode[keyof typeof SystemErrorCode];

/**
 * リソース種別（NotFoundError用）
 * 存在しないリソースへのアクセスを表現するためのリソースタイプ
 */
export const ResourceType = {
  /** 
   * 収支記録
   * 
   * @remarks
   * エントリー（収入・支出・借入・貸付・返済など）のリソース種別です。
   * 
   * @example
   * ```typescript
   * // 存在しないエントリを検索した場合
   * throw new NotFoundError(ResourceType.ENTRY, entryId);
   * ```
   */
  ENTRY: 'ENTRY',
  
  /** 
   * カテゴリ
   * 
   * @remarks
   * 収支カテゴリのリソース種別です。
   * 
   * @example
   * ```typescript
   * // 存在しないカテゴリを参照した場合
   * throw new NotFoundError(ResourceType.CATEGORY, categoryId);
   * ```
   */
  CATEGORY: 'CATEGORY',
  
  /** 
   * 支払い方法
   * 
   * @remarks
   * 支払い方法（現金、口座、電子マネーなど）のリソース種別です。
   * 
   * @example
   * ```typescript
   * // 存在しない支払い方法を参照した場合
   * throw new NotFoundError(ResourceType.METHOD, methodId);
   * ```
   */
  METHOD: 'METHOD',
  
  /** 
   * 借入・貸付
   * 
   * @remarks
   * 借入・貸付情報のリソース種別です。
   * 
   * @example
   * ```typescript
   * // 存在しない借入/貸付を参照した場合
   * throw new NotFoundError(ResourceType.DEBT, debtId);
   * ```
   */
  DEBT: 'DEBT',
  
  /** 
   * 振替
   * 
   * @remarks
   * 支払い方法間の資金移動のリソース種別です。
   * 
   * @example
   * ```typescript
   * // 存在しない振替記録を参照した場合
   * throw new NotFoundError(ResourceType.TRANSFER, transferId);
   * ```
   */
  TRANSFER: 'TRANSFER',
  
  /** 
   * ユーザー
   * 
   * @remarks
   * システムユーザーのリソース種別です。
   * 
   * @example
   * ```typescript
   * // 存在しないユーザーを参照した場合
   * throw new NotFoundError(ResourceType.USER, userId);
   * ```
   */
  USER: 'USER',
} as const;
export type ResourceType = typeof ResourceType[keyof typeof ResourceType];