export function loadCategoryConfig(): Map<string, string[]> {
    const sheet = SpreadsheetApp.getActive().getSheetByName("設定");
    if (!sheet) {
        throw new Error("設定シート『設定』が見つかりません。シート名が変更されていないか確認してください。");
    }
    const data = sheet.getRange("A2:B").getValues();
    const map = new Map<string, string[]>();
    for (const [type, category] of data) {
        if (!type || !category) continue;
        if (!map.has(type)) map.set(type, []);
        map.get(type)!.push(category);
    }
    return map;
}

export function loadMethodList(): string[] {
    const sheet = SpreadsheetApp.getActive().getSheetByName("設定");
    if (!sheet) {
        throw new Error("設定シート『設定』が見つかりません。シート名が変更されていないか確認してください。");
    }
    // Array.prototype.flat() を使用するので、tsconfig.json の lib に "es2019" を含める必要があります。
    const data = sheet.getRange("D2:D").getValues().flat();
    return data.filter((m) => m && typeof m === "string");
}