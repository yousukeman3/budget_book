/**
 * Decimalユーティリティ
 * 
 * Prismaに依存しない高精度計算のためのDecimal型を提供します。
 * アプリケーション全体でDecimalの使用を統一し、適切な型変換を行うためのユーティリティ関数です。
 */
import { Decimal as DecimalJS } from 'decimal.js';
import { Decimal as PrismaDecimal } from '@prisma/client/runtime/library';

/**
 * Decimalのエクスポート
 * アプリケーション内では基本的にこのDecimalを使用します
 */
export type Decimal = DecimalJS;
export const Decimal = DecimalJS;

/**
 * Prismaの内部実装に依存しないよう、明示的な型変換を行うヘルパー関数
 */
export const fromPrismaDecimal = (value: PrismaDecimal | string | number): Decimal => {
  return new Decimal(value.toString());
};

/**
 * 任意の値をDecimalに変換します
 */
export const toDecimal = (value: Decimal | PrismaDecimal | string | number): Decimal => {
  if (value instanceof Decimal) {
    return value;
  }
  return new Decimal(value.toString());
};

/**
 * PrismaのリポジトリレイヤーでDB保存時に使用するヘルパー関数
 * (Prismaは内部的に独自のDecimal実装を使用するため)
 */
export const toPrismaDecimal = (value: Decimal | PrismaDecimal | string | number): PrismaDecimal => {
  if (value instanceof PrismaDecimal) {
    return value;
  }
  return new PrismaDecimal(value.toString());
};