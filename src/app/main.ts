import { validateAllEntries } from "./validateAllEntries";
import { validateEditedRow } from "./validateEditedRow";

function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Budget Book")
    .addItem("収支バリデーション", "validateAllEntries")
    .addToUi();
};

function onEdit(e: GoogleAppsScript.Events.SheetsOnEdit): void {
  try {
    validateEditedRow(e);
  } catch (error) {
    Logger.log(error);
  }
};

void validateAllEntries;