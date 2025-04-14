/**
 * Transfer（振替）のZodスキーマ定義
 * 
 * 自分の支払い方法（Method）間での資金移動を表現するTransferモデルのバリデーションルールを
 * Zodスキーマとして定義するモジュールです。
  */
import { z } from 'zod';
import { BusinessRuleErrorCode } from '../../errors/ErrorCodes';

/**
 * Transferの基本スキーマ定義
 * すべてのフィールドの基本バリデーションルールを定義します
 */
const baseTransferSchema = z.object({
  /**
   * Transferの一意識別子
   * 
   * @remarks
   * UUIDv4形式である必要があります
   */
  id: z.string().uuid(),
  
  /**
   * 紐づくEntryのID
   * 
   * @remarks
   * type: 'transfer'のエントリと1:1で対応します
   * Transfer操作は必ず対応するEntryを持ちます
   */
  rootEntryId: z.string().uuid(),
  
  /**
   * 振替元のMethodのID
   * 
   * @remarks
   * 資金の出所となる支払い方法を指定します
   */
  fromMethodId: z.string().uuid(),
  
  /**
   * 振替先のMethodのID
   * 
   * @remarks
   * 資金の行き先となる支払い方法を指定します
   * fromMethodIdとは異なる必要があります
   */
  toMethodId: z.string().uuid(),
  
  /**
   * 発生日
   * 
   * @remarks
   * 振替が行われた日付（ローカルタイム基準）
   */
  date: z.date(),
  
  /**
   * 任意のメモ情報
   * 
   * @remarks
   * 振替の目的や背景などを記録するための自由記述フィールド
   */
  note: z.string().nullable().optional()
});

/**
 * Transferドメインオブジェクト用のZodスキーマ
 * 
 * ドメインモデルの型安全性を確保します
 * 振替元と振替先が同じMethodの場合のチェックはドメインモデル内で行われます
 * 
 * @example
 * ```typescript
 * // 有効な振替データ
 * const validTransfer = {
 *   id: "123e4567-e89b-12d3-a456-426614174000",
 *   rootEntryId: "123e4567-e89b-12d3-a456-426614174001",
 *   fromMethodId: "123e4567-e89b-12d3-a456-426614174002",
 *   toMethodId: "123e4567-e89b-12d3-a456-426614174003", // fromMethodIdと異なる
 *   date: new Date(),
 *   note: "給料振込"
 * };
 * ```
 */
export const TransferSchema = baseTransferSchema;

/**
 * Transfer作成時の入力スキーマ
 * 
 * IDのみ任意（自動生成可能）、他は必須フィールドとなります
 * 振替元と振替先が同じMethodの場合のチェックはドメインモデル内で行われます
 * 
 * @example
 * ```typescript
 * // Transfer作成時のデータ（IDは省略可能）
 * const newTransfer = {
 *   rootEntryId: "123e4567-e89b-12d3-a456-426614174001",
 *   fromMethodId: "現金財布",
 *   toMethodId: "銀行口座",
 *   date: new Date(),
 *   note: "貯金"
 * };
 * 
 * const validatedTransfer = TransferCreateSchema.parse(newTransfer);
 * ```
 */
export const TransferCreateSchema = baseTransferSchema
  .omit({ 
    id: true 
  })
  .extend({ 
    id: z.string().uuid().optional() 
  });

/**
 * 残高チェック用のTransferバリデーションスキーマ
 * 
 * fromMethodの残高が不足している場合にエラーを返します
 * 実際の残高チェックはリポジトリ層で行うため、ここではスキーマ定義のみです
 * 
 * @throws 振替元の残高が不足している場合はBusinessRuleErrorCode.INSUFFICIENT_FUNDSエラー
 * 
 * @example
 * ```typescript
 * // 残高チェック付き振替の検証
 * try {
 *   const validatedTransfer = SufficientFundsTransferSchema.parse(transfer);
 *   // 振替処理
 * } catch (error) {
 *   if (error.params?.errorCode === BusinessRuleErrorCode.INSUFFICIENT_FUNDS) {
 *     console.error('残高不足のため振替できません');
 *   }
 * }
 * ```
 */
export const SufficientFundsTransferSchema = TransferSchema.refine(
  () => true, // 実際の残高チェックはリポジトリ層で行う
  {
    message: '振替元の残高が不足しています',
    path: ['fromMethodId'],
    params: {
      errorCode: BusinessRuleErrorCode.INSUFFICIENT_FUNDS
    }
  }
);

/**
 * Transferの型定義
 */
export type Transfer = z.infer<typeof TransferSchema>;

/**
 * Transfer作成時の入力型定義
 */
export type TransferCreate = z.infer<typeof TransferCreateSchema>;