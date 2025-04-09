import { mockDate, resetMockDate } from '../../../jest.setup';

describe('Date モックのテスト', () => {
  const fixedDate = new Date('2025-01-01T12:00:00Z');
  
  beforeEach(() => {
    mockDate(fixedDate);
  });

  afterEach(() => {
    resetMockDate();
  });

  it('引数なしの new Date() がモックされた日付を返すこと', () => {
    const result = new Date();
    expect(result.toISOString()).toBe('2025-01-01T12:00:00.000Z');
  });

  it('Date.now() がモックされた日付のタイムスタンプを返すこと', () => {
    const result = Date.now();
    expect(result).toBe(fixedDate.getTime());
  });

  it('引数ありの new Date() は正常に動作すること', () => {
    const testDate = new Date('2024-05-15');
    expect(testDate.getFullYear()).toBe(2024);
    expect(testDate.getMonth()).toBe(4); // 0-based (5月)
    expect(testDate.getDate()).toBe(15);
  });
});