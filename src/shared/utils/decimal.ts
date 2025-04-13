/**
 * Decimalユーティリティ
 * 
 * Prismaに依存しない高精度計算のためのDecimal型を提供します。
 * アプリケーション全体でDecimalの使用を統一し、適切な型変換を行うためのユーティリティ関数です。
  */
import { Decimal as DecimalJS } from 'decimal.js';
import { Decimal as PrismaDecimal } from '@prisma/client/runtime/library';

/**
 * アプリケーション全体で使用するDecimal型
 * 
 * @remarks
 * decimal.jsのDecimal型をエクスポートして、アプリケーション全体で一貫して使用します
 */
export type Decimal = DecimalJS;
export const Decimal = DecimalJS;

/**
 * PrismaのDecimal型をアプリケーションのDecimal型に変換します
 * 
 * @remarks
 * Prismaの内部実装に依存しないよう、明示的な型変換を行うためのヘルパー関数です
 * 
 * @param value - 変換元の値（PrismaのDecimal、文字列、または数値）
 * @returns アプリケーションで使用するDecimal型のインスタンス
 * 
 * @example
 * ```typescript
 * // Prismaから取得したデータを変換する
 * const amount = fromPrismaDecimal(prismaEntry.amount);
 * ```
 */
export const fromPrismaDecimal = (value: PrismaDecimal | string | number): Decimal => {
  return new Decimal(value.toString());
};

/**
 * 任意の値をDecimal型に変換します
 * 
 * @remarks
 * さまざまな型（Decimal、PrismaのDecimal、文字列、数値）からDecimal型へ変換するためのユーティリティ関数です
 * 
 * @param value - 変換元の値
 * @returns Decimal型のインスタンス
 * 
 * @example
 * ```typescript
 * // 数値からDecimalへ変換
 * const price = toDecimal(1000);
 * 
 * // 文字列からDecimalへ変換
 * const tax = toDecimal('100.5');
 * ```
 */
export const toDecimal = (value: Decimal | PrismaDecimal | string | number): Decimal => {
  if (value instanceof Decimal) {
    return value;
  }
  return new Decimal(value.toString());
};

/**
 * アプリケーションのDecimal型をPrismaのDecimal型に変換します
 * 
 * @remarks
 * リポジトリレイヤーでデータベース保存時に使用するヘルパー関数です。
 * Prismaは内部的に独自のDecimal実装を使用するため、この変換が必要です。
 * 
 * @param value - 変換元の値
 * @returns PrismaのDecimal型のインスタンス
 * 
 * @example
 * ```typescript
 * // リポジトリでエンティティを保存する前の変換
 * const prismaData = {
 *   ...entryData,
 *   amount: toPrismaDecimal(entryData.amount)
 * };
 * ```
 */
export const toPrismaDecimal = (value: Decimal | PrismaDecimal | string | number): PrismaDecimal => {
  if (value instanceof PrismaDecimal) {
    return value;
  }
  return new PrismaDecimal(value.toString());
};