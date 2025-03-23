export function getSheetData(sheetName: string): any[][] {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
        throw new Error(`${sheetName} が見つかりません。`);
    }
    return sheet.getDataRange().getValues();
}

export function extractColumnIndexes(headers: any[]): { [key: string]: number } {
    const requiredColumns = ["日付", "収支タイプ", "金額", "取引ID", "カテゴリ", "支払方法", "メモ", "レシートURL"];
    const indexes: { [key: string]: number } = {};
    requiredColumns.forEach((col) => {
        const index = headers.indexOf(col);
        indexes[col] = index;
    });
    return indexes;
}

export function setCellBackground(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number, col: number, color: string): void {
    sheet.getRange(row, col).setBackground(color);
  }
  
  export function resetCellBackground(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number, col: number): void {
    sheet.getRange(row, col).setBackground(null);
  }