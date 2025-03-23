export type SystemError = {
    errorId: string;  // E2xxxまたはE9xxx
    message: string;
    detail?: any;
};