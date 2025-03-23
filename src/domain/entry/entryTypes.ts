// Entry の型定義
export type Entry = {
    date: string;            // ISO 日付文字列 (例："2025-03-22")
    type: "収入" | "支出" | "借入" | "返済" | "貸付" | "返済受取";
    amount: number;          // 0以上の数値
    transactionId: string;   // 貸借管理用のキー
    category: string;        // 収支タイプに合わせたカテゴリ
    method: string;          // 支払方法（口座名など）
    memo?: string;           // 任意のメモ
    receiptUrl?: string;     // レシートのURL
  };