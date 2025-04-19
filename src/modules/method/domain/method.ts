/**
 * Method（支払い方法）のドメインモデル
 * 
 * 口座、現金、電子マネーなどの支払い方法を表現し、
 * その残高管理と状態追跡を行うためのドメインモデル。
 */
import { toDecimal } from '../../../shared/utils/decimal';
import type { Decimal } from '../../../shared/utils/decimal';
import { BusinessRuleError } from '../../../shared/errors/AppError';
import { BusinessRuleErrorCode } from '../../../shared/errors/ErrorCodes';
import type { Validator } from '../../../shared/validation/Validator';

/**
 * Method（支払い方法）のドメインインターフェース
 * 口座、現金、電子マネーなどの支払い方法を表す型定義
 */
export interface IMethod {
  /** 
   * 支払い方法の一意識別子（UUIDv4）
   * 
   * @remarks
   * UUIDv4形式の文字列。新規作成時は`crypto.randomUUID()`で自動生成される。
   */
  id: string;
  
  /** 
   * 支払い方法の名前
   * 
   * @remarks
   * 表示用の名称（「現金」「三井住友銀行」など）
   * 空でなく、50文字以下である必要がある
   */
  name: string;
  
  /**
   * 初期残高
   * 
   * @remarks
   * 任意。支払い方法作成時の初期残高を設定可能
   * 指定された場合はDecimal型に変換されて管理される
   */
  initialBalance?: Decimal | null;
  
  /**
   * アーカイブ状態
   * 
   * @remarks
   * 使用停止状態かどうか
   * アーカイブされたMethodは新規Entryで使用不可
   * @defaultValue false
   */
  archived?: boolean;
}

/**
 * Method作成用の入力型
 * 
 * @remarks
 * IMethodから`id`フィールドを除いた型
 * 新規作成時にはIDは自動生成されるため不要
 */
export type MethodCreateInput = Omit<IMethod, 'id'>;

/**
 * Method更新用の入力型
 * 
 * @remarks
 * IMethodの部分更新用の型
 * 更新時には変更する項目のみを含む
 */
export type MethodUpdateInput = Partial<Omit<IMethod, 'id'>>;

/**
 * Methodドメインエンティティクラス
 * 支払い方法を表現し、残高追跡とアーカイブ管理を行うドメインモデル
 */
export class Method implements IMethod {
  /**
   * Methodオブジェクトのコンストラクタ
   * 
   * @param id - 支払い方法の一意識別子（UUIDv4形式）
   * @param name - 支払い方法の表示名称（空でなく、50文字以内）
   * @param initialBalance - 初期残高（任意、Decimal型で管理）
   * @param archived - アーカイブ状態（任意、デフォルトは`false`）
   * @param validator - オプションのバリデーター。指定された場合、追加のバリデーションを実行
   * @throws {@link BusinessRuleError} バリデーション失敗時にBusinessRuleErrorをスローします
   */
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly initialBalance: Decimal | null = null,
    public readonly archived: boolean = false,
    validator?: Validator<unknown>
  ) {
    // 名前は空でないことを確認（ドメインの不変条件）
    if (!name.trim()) {
      throw new BusinessRuleError(
        '支払い方法名を入力してください',
        BusinessRuleErrorCode.INVALID_INPUT,
        { field: 'name' }
      );
    }

    // 名前の長さは50文字以下（ドメインの不変条件）
    if (name.length > 50) {
      throw new BusinessRuleError(
        '支払い方法名は50文字以内で入力してください',
        BusinessRuleErrorCode.INVALID_INPUT,
        { field: 'name', length: name.length }
      );
    }

    // 外部から注入されたバリデーターがあれば使用
    if (validator) {
      validator.validate(this);
    }
  }

  /**
   * 入力データからMethodオブジェクトを作成するファクトリーメソッド
   * バリデーションも実施します
   * 
   * @remarks
   * IDが指定されていない場合は`crypto.randomUUID()`で自動生成します
   * 
   * @param data - 支払い方法作成のための入力データ
   * @param validator - オプションのバリデーター。入力データの検証に使用
   * @returns 新しいMethodオブジェクト
   * @throws {@link BusinessRuleError} バリデーション失敗時にBusinessRuleErrorをスローします
   */
  static create(
    data: {
      name: string;
      initialBalance?: Decimal | number | string | null;
      archived?: boolean;
      id?: string;
    },
    validator?: Validator<unknown>
  ): Method {
    // id がない場合は UUID を生成
    const id = data.id || crypto.randomUUID();
    
    try {
      // 初期残高があればDecimal型に変換
      const initialBalance = data.initialBalance !== undefined && data.initialBalance !== null
        ? toDecimal(data.initialBalance)
        : null;
      
      // アーカイブ状態のデフォルトは`false`
      const archived = data.archived ?? false;
      
      // 入力データのバリデーション
      let validData = { 
        ...data,
        initialBalance,
        archived,
        id
      };
      
      // 外部から注入されたバリデーターがあれば使用
      if (validator) {
        validData = validator.validate(validData) as typeof validData;
      }
      
      return new Method(
        id,
        validData.name,
        validData.initialBalance,
        validData.archived,
        validator // バリデーターを引き継ぐ
      );
    } catch (error) {
      // エラーを明示的に BusinessRuleError にラップして詳細を追加
      if (error instanceof BusinessRuleError) {
        throw error;  // すでにBusinessRuleErrorならそのままスロー
      } else {
        throw new BusinessRuleError(
          '支払い方法の作成に失敗しました',
          BusinessRuleErrorCode.INVALID_INPUT,
          { originalError: error }
        );
      }
    }
  }

  /**
   * アーカイブされているかどうかを確認
   * @returns アーカイブされている場合`true`
   */
  isArchived(): boolean {
    return this.archived;
  }

  /**
   * アーカイブされている場合にエラーを投げる
   * @param validator - オプションのバリデーター。アーカイブ状態を検証する
   * @throws {@link BusinessRuleError} アーカイブされている場合にBusinessRuleErrorコード`METHOD_ARCHIVED`をスローします
   * 
   * @remarks
   * 重要な操作の前にこのチェックを行います
   * Entryの登録時など、アクティブなMethodのみが許可される操作で使用
   */
  ensureActive(validator?: Validator<unknown>): void {
    // アーカイブされているかをチェック（ドメインの不変条件）
    if (this.archived) {
      throw new BusinessRuleError(
        'この支払い方法はアーカイブされているため使用できません',
        BusinessRuleErrorCode.METHOD_ARCHIVED,
        { methodId: this.id }
      );
    }
    
    // 追加のバリデーションがあれば実行
    if (validator) {
      validator.validate(this);
    }
  }

  /**
   * アーカイブ状態を変更したMethodオブジェクトを生成
   * 
   * @remarks
   * 不変性を保つため、元のオブジェクトは変更せず新しいインスタンスを返します
   * 
   * @param archived - アーカイブ状態（`true`でアーカイブ）
   * @param validator - オプションのバリデーター
   * @returns 新しく設定された状態のMethodオブジェクト
   */
  setArchived(archived: boolean, validator?: Validator<unknown>): Method {
    if (this.archived === archived) {
      return this; // 状態が変わらなければ自身を返す
    }
    
    return new Method(
      this.id,
      this.name,
      this.initialBalance,
      archived,
      validator // バリデーターを引き継ぐ
    );
  }

  /**
   * 名前を変更したMethodオブジェクトを生成
   * 
   * @remarks
   * 不変性を保つため、元のオブジェクトは変更せず新しいインスタンスを返します
   * 名前は空でなく50文字以内である必要があります
   * 
   * @param name - 新しい名前
   * @param validator - オプションのバリデーター
   * @returns 新しい名前を持つMethodオブジェクト
   * @throws {@link BusinessRuleError} バリデーション失敗時にBusinessRuleErrorをスローします
   */
  rename(name: string, validator?: Validator<unknown>): Method {
    if (this.name === name) {
      return this; // 名前が変わらなければ自身を返す
    }
    
    return new Method(
      this.id,
      name,
      this.initialBalance,
      this.archived,
      validator // バリデーターを引き継ぐ
    );
  }

  /**
   * 初期残高を変更した新しいMethodオブジェクトを生成
   * 
   * @remarks
   * 不変性を保つため、元のオブジェクトは変更せず新しいインスタンスを返します
   * 設定された初期残高はDecimal型に変換されます
   * 
   * @param initialBalance - 新しい初期残高（Decimal、数値または文字列からDecimalに変換、または`null`）
   * @param validator - オプションのバリデーター
   * @returns 初期残高を変更した新しいMethodオブジェクト
   */
  setInitialBalance(initialBalance: Decimal | number | string | null, validator?: Validator<unknown>): Method {
    // nullでない場合はDecimal型に変換
    const decimalBalance = initialBalance != null ? toDecimal(initialBalance) : null;
    
    if ((this.initialBalance === null && decimalBalance === null) ||
        (this.initialBalance && decimalBalance && this.initialBalance.equals(decimalBalance))) {
      return this; // 初期残高が変わらなければ自身を返す
    }
    
    return new Method(
      this.id,
      this.name,
      decimalBalance,
      this.archived,
      validator // バリデーターを引き継ぐ
    );
  }
}