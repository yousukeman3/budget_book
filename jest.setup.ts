import '@testing-library/jest-dom';
import 'jest-extended';
import { jest } from '@jest/globals';

// オリジナルの Date オブジェクトを保存
const OriginalDate = global.Date;

// テスト実行前のグローバル設定
beforeEach(() => {
  // グローバルな設定やモックの初期化
  jest.clearAllMocks();
});

// Date のモック用ヘルパー
export const mockDate = (date: Date): void => {
  // @ts-expect-error Date のモック
  global.Date = class extends OriginalDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        // 引数なしの場合は指定された日付を使用
        super(date.getTime());
        return this;
      }
      // 親クラスのコンストラクタを適切に呼び出す
      // @ts-expect-error 親クラスに引数を渡す
      super(...args);
      return this;
    }
  };
  
  global.Date.now = jest.fn(() => date.getTime());
};

// Date のモックをリセット
export const resetMockDate = (): void => {
  global.Date = OriginalDate;
};

// PrismaClient のモックに関するセットアップは、
// テスト用の独立した設定ファイルに移動し、必要に応じて import できるようにする