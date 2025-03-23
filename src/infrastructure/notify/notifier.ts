export function notifyAdmin(errorId: string, message: string, detail?: any): void {
    const adminEmail = "yousukeman3@gmail.com";
    const subject = `[エラー通知] ${errorId}`;
    const body = `エラーが発生しました。\n\nエラーID: ${errorId}\nメッセージ: ${message}\n詳細: ${JSON.stringify(detail)}`;
    GmailApp.sendEmail(adminEmail, subject, body);
}
// Compare this snippet from src/infrastructure/notify/notifier.ts: