// モジュールのインポート
import { getSheetData, extractColumnIndexes, setCellBackground, resetCellBackground } from "../common/utils/sheetUtils"; 
import { validateEntry } from "../domain/entry/entryValidator";
import { createEntryFromRow } from "../domain/entry/entryFactory";
import { Entry } from "../domain/entry/entryTypes"; 

export function validateAllEntries(): void {
    const sheetName = "収支記録";
    const data = getSheetData(sheetName);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
  
    if (data.length < 2) {
      SpreadsheetApp.getUi().alert("レコードがありません。");
      return;
    }
  
    if (sheet === null) {
      throw new Error("シートが見つかりません。");
  }
  
    const headers = data[0];
    const colIndexes = extractColumnIndexes(headers);
  
    // 必須項目：「日付」「収支タイプ」「金額」「カテゴリ」「支払方法」
    const requiredCols = ["日付", "収支タイプ", "金額", "カテゴリ", "支払方法"];
    let errorMessages: string[] = [];
    
    // まずシート全体の背景色をリセット
    sheet.getDataRange().setBackground(null);
    
    // 最下行は入力中とみなすためスキップ
    const lastRowIndex = data.length - 1;
    
    for (let i = 1; i < data.length; i++) {
      // 入力中の最下行はスキップ
      if (i === lastRowIndex) continue;
  
      const row = data[i];
      const entry: Entry = createEntryFromRow(row, colIndexes);
      
      // 必須項目チェック
      let rowErrors: { field: string; message: string }[] = [];
      requiredCols.forEach(col => {
        const idx = colIndexes[col];
        if (row[idx] === null || row[idx] === "") {
          rowErrors.push({ field: col, message: `${col}が未入力です。` });
          setCellBackground(sheet, i + 1, idx + 1, "red");
        } else {
          resetCellBackground(sheet, i + 1, idx + 1);
        }
      });
      
      // すべての必須項目が入力されていない場合、（ただし最下行以外はエラー）
      if (rowErrors.length > 0) {
        errorMessages.push(`行 ${i + 1}:\n` + rowErrors.map(e => `${e.field}: ${e.message}`).join("\n"));
        continue;
      }
      
      // ドメイン固有のバリデーションを実施
      const domainErrors = validateEntry(entry);
      if (domainErrors.length > 0) {
        domainErrors.forEach(err => {
          const idx = colIndexes[err.field];
          if (idx !== undefined && idx !== -1) {
            setCellBackground(sheet, i + 1, idx + 1, "red");
          }
        });
        errorMessages.push(`行 ${i + 1}:\n` + domainErrors.map(e => `${e.field}: ${e.message}`).join("\n"));
      }
    }
  
    if (errorMessages.length > 0) {
      SpreadsheetApp.getUi().alert("バリデーションエラー:\n\n" + errorMessages.join("\n\n"));
    } else {
      SpreadsheetApp.getUi().alert("全てのレコードが正しく入力されています。");
    }
  }
  