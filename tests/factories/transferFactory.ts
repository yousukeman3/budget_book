/**
 * Transfer入力データ型の定義
 */
export type TransferInput = {
  fromMethodId: string;
  toMethodId: string;
  date: Date;
  amount: number;
  note?: string;
};

/**
 * テスト用のTransferデータを作成するファクトリ関数
 * @param override - デフォルト値をオーバーライドする部分的なTransferInputデータ
 * @returns テスト用のTransferInputデータ
 */
export const createTransferData = (override: Partial<TransferInput> = {}): TransferInput => {
  // デフォルト値
  const defaultTransfer: TransferInput = {
    fromMethodId: 'from-method-id',
    toMethodId: 'to-method-id',
    date: new Date('2025-01-01T10:00:00Z'),
    amount: 5000,
    note: '口座間振替テスト'
  };

  // デフォルト値とオーバーライドを組み合わせ
  return {
    ...defaultTransfer,
    ...override
  };
};

/**
 * 特定の金額での振替データを作成するショートカット関数
 * @param amount - 振替金額
 * @param override - その他オーバーライドするデータ
 * @returns 指定金額の振替データ
 */
export const createTransferWithAmount = (
  amount: number, 
  override: Partial<Omit<TransferInput, 'amount'>> = {}
) => {
  return createTransferData({ amount, ...override });
};