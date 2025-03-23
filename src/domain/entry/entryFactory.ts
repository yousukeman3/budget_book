import { Entry } from "./entryTypes";

export function createEntryFromRow(row: any[], colIndexes: { [key: string]: number }): Entry {
    const rawType = row[colIndexes["収支タイプ"]] ? String(row[colIndexes["収支タイプ"]]) : "";

    if (rawType === "") {
        throw new Error("収支タイプが空です。必須項目です。");
    }
    return {
        date: row[colIndexes["日付"]] ? String(row[colIndexes["日付"]]) : "",
        type: rawType as "収入" | "支出" | "借入" | "返済" | "貸付" | "返済受取" ,
        amount: row[colIndexes["金額"]] ? Number(row[colIndexes["金額"]]) : 0,
        transactionId: row[colIndexes["取引ID"]] ? String(row[colIndexes["取引ID"]]) : "",
        category: row[colIndexes["カテゴリ"]] ? String(row[colIndexes["カテゴリ"]]) : "",
        method: row[colIndexes["支払方法"]] ? String(row[colIndexes["支払方法"]]) : "",
        memo: row[colIndexes["メモ"]] ? String(row[colIndexes["メモ"]]) : "",
        receiptUrl: row[colIndexes["レシートURL"]] ? String(row[colIndexes["レシートURL"]]) : ""
    };
}