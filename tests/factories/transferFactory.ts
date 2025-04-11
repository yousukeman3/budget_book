import { Decimal } from '@prisma/client/runtime/library';
import { Transfer } from '../../src/modules/transfer/domain/transfer';

/**
 * テスト用のTransferデータを作成するファクトリ関数
 * @param override - デフォルト値をオーバーライドする部分的なデータ
 * @returns テスト用のTransferオブジェクト
 */
export const createTransferData = (override: Partial<Parameters<typeof Transfer.create>[0]> = {}): Transfer => {
  // テスト用エントリID
  const rootEntryId = override.rootEntryId || 'test-entry-id';
  
  // デフォルト値
  const defaultTransfer = {
    rootEntryId,
    fromMethodId: 'from-method-id',
    toMethodId: 'to-method-id',
    date: new Date('2025-01-01T10:00:00Z'),
    note: '口座間振替テスト'
  };

  // デフォルト値とオーバーライドを組み合わせ
  const transferData = {
    ...defaultTransfer,
    ...override
  };

  // Transfer.createファクトリメソッドを使用して正規のTransferオブジェクトを作成
  return Transfer.create(transferData);
};

/**
 * 特定のメソッド間の振替データを作成するショートカット関数
 * @param fromMethodId - 振替元メソッドID 
 * @param toMethodId - 振替先メソッドID
 * @param override - その他オーバーライドするデータ
 * @returns 指定メソッド間の振替データ
 */
export const createTransferBetweenMethods = (
  fromMethodId: string,
  toMethodId: string,
  override: Partial<Omit<Parameters<typeof Transfer.create>[0], 'fromMethodId' | 'toMethodId'>> = {}
): Transfer => {
  return createTransferData({ fromMethodId, toMethodId, ...override });
};