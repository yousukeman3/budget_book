import { Entry } from "./entryTypes";
import { loadCategoryConfig } from "../../infrastructure/sheet/configSheet";
import { loadMethodList } from "../../infrastructure/sheet/configSheet";
import { ValidationError } from "../error/validationError";

export function validateEntry(entry: Entry): ValidationError[] {
    const errors: ValidationError[] = [];

    // 日付チェック：必須 & 過去日付
    if (!entry.date) {
        errors.push({ field: "日付", message: "日付が未入力です。", errorId: "E1011" }); // E1011: 日付未入力
    } else {
        const entryDate = new Date(entry.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (entryDate.getTime() > today.getTime()) {
            errors.push({ field: "日付", message: "収支記録の日付は本日以前でなければなりません。", errorId: "E1012" }); // E1012: 未来日入力
        }
    }

    // 金額チェック
    if (entry.amount == null || isNaN(entry.amount) || entry.amount < 0) {
        errors.push({ field: "金額", message: "金額が不正です。", errorId: "E1013" }); // E1013: 金額不正
    }

    // 収支タイプに応じた取引IDのチェック
    if (entry.type === "収入" || entry.type === "支出") {
        if (entry.transactionId && entry.transactionId.trim() !== "") {
            errors.push({ field: "取引ID", message: "収入・支出の場合は取引IDは不要です。", errorId: "E1015" }); // E1015: 不要な取引ID
        }
    } else if (entry.type === "借入" || entry.type === "返済") {
        const kariRegex = /^(KARI)-\d{8}-\d{3}$/;
        if (!entry.transactionId || !kariRegex.test(entry.transactionId)) {
            errors.push({ field: "取引ID", message: "借入・返済の場合、取引IDは「KARI-YYYYMMDD-XXX」の形式で入力してください。", errorId: "E1015" }); // E1015: 取引ID形式不正
        }
    } else if (entry.type === "貸付" || entry.type === "返済受取") {
        const kasiRegex = /^(KASI)-\d{8}-\d{3}$/;
        if (!entry.transactionId || !kasiRegex.test(entry.transactionId)) {
            errors.push({ field: "取引ID", message: "貸付・返済受取の場合、取引IDは「KASI-YYYYMMDD-XXX」の形式で入力してください。", errorId: "E1015" }); // E1015: 取引ID形式不正
        }
    }

    // カテゴリチェック：設定シートから読み込む
    try {
        const config = loadCategoryConfig();
        const allowedCategories = config.get(entry.type);
        if (!allowedCategories) {
            errors.push({ field: "収支タイプ", message: `不正な収支タイプ: ${entry.type}`, errorId: "E1014" }); // E1014: 不正な収支タイプ
        } else if (!allowedCategories.includes(entry.category)) {
            errors.push({ field: "カテゴリ", message: `収支タイプ「${entry.type}」に対して、カテゴリ「${entry.category}」は許可されていません。`, errorId: "E1016" }); // E1016: カテゴリ不一致
        }
    } catch (e: any) {
        errors.push({ field: "カテゴリ", message: "設定シートからカテゴリ設定を読み込めませんでした: " + e.message, errorId: "E2031" }); // E2031: カテゴリ設定読込失敗
    }

    // 支払方法チェック：設定シートのD列から取得
    try {
        const allowedMethods = loadMethodList();
        if (!allowedMethods.includes(entry.method)) {
            errors.push({ field: "支払方法", message: `支払方法「${entry.method}」は許可されていません。`, errorId: "E1017" }); // E1017: 支払方法不正
        }
    } catch (e: any) {
        errors.push({ field: "支払方法", message: "設定シートから支払方法設定を読み込めませんでした: " + e.message, errorId: "E2032" }); // E2032: 支払方法設定読込失敗
    }

    return errors;
}

export function validateEntries(entries: Entry[]): string[] {
    let errorMessages: string[] = [];
    entries.forEach((entry, index) => {
        const errors = validateEntry(entry);
        if (errors.length > 0) {
            errorMessages.push(`行 ${index + 2}:\n${errors.join("\n")}`);
        }
    });
    return errorMessages;
}

