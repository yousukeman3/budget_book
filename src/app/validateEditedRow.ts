import { validateEntry } from "../domain/entry/entryValidator";
import { resetCellBackground, setCellBackground, extractColumnIndexes } from "../common/utils/sheetUtils";
import { createEntryFromRow } from "../domain/entry/entryFactory";

/**
 * onEdit トリガーで呼ばれる関数。編集中のレコードだけ再検証します。
 * @param e onEdit イベントオブジェクト
 */
export function validateEditedRow(e: GoogleAppsScript.Events.SheetsOnEdit): void {
  const sheet = e.range.getSheet();
  // 対象シートが「収支記録シート」以外なら何もしない
  if (sheet.getName() !== "収支記録") return;
  
  const rowNum = e.range.getRow();
  // 最下行（入力中の可能性がある行）は検証しない
  if (rowNum === sheet.getLastRow()) return;
  
  // シート全体の列数を取得し、該当行のデータを取得
  const lastColumn = sheet.getLastColumn();
  const rowData = sheet.getRange(rowNum, 1, 1, lastColumn).getValues()[0];
  // ヘッダー行（1行目）を取得し、カラムのインデックスを抽出
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const colIndexes = extractColumnIndexes(headers);

  // ファクトリ関数で Entry オブジェクトを生成
  const entry = createEntryFromRow(rowData, colIndexes);

  // まず必須項目（「日付」「収支タイプ」「金額」「カテゴリ」「支払方法」）の入力チェック
  const requiredCols = ["日付", "収支タイプ", "金額", "カテゴリ", "支払方法"];
  let hasMissing = false;
  requiredCols.forEach(col => {
    const idx = colIndexes[col];
    if (rowData[idx] === null || rowData[idx] === "") {
      setCellBackground(sheet, rowNum, idx + 1, "red");
      hasMissing = true;
    } else {
      resetCellBackground(sheet, rowNum, idx + 1);
    }
  });
  
  // 必須項目が未入力なら、ここで終了（エラー表示は不要）
  if (hasMissing) return;
  
  // ドメイン固有のバリデーション
  const domainErrors = validateEntry(entry);
  
  // まずは、全セルの背景をリセット（必要に応じて元のフォーマットに戻す処理を入れてください）
  for (const field in colIndexes) {
    resetCellBackground(sheet, rowNum, colIndexes[field] + 1);
  }
  
  // エラーがある場合は、各エラーのフィールドに対応するセルを赤くハイライト
  domainErrors.forEach(err => {
    const field = err.field; // 例："日付", "収支タイプ", など
    if (colIndexes[field] !== undefined) {
      setCellBackground(sheet, rowNum, colIndexes[field] + 1, "red");
    }
  });
}
