import { SystemError } from "./systemError";
import { notifyAdmin } from "../../infrastructure/notify/notifier";

export function handleSystemError(errorId: string, message: string, detail?: any): SystemError {
    Logger.log(`Error [${errorId}]: ${message} Detail: ${JSON.stringify(detail)}`);
    notifyAdmin(errorId, message, detail);
    return { errorId, message, detail };
}