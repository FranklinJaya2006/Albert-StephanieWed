// Google Sheets: Extensions > Apps Script > paste this whole file > Save > reload the sheet.
// It fills the "token" column by itself for every row that has a name and no token yet, as soon as you type a name,
// and from the new menu "Wedding > Isi token kosong". A token is two random UUIDs without dashes = 64 lowercase hex characters,
// the format the invitation, the QR and the n8n workflow expect. It is written once as plain text and never changes afterwards.
// Do NOT use a RANDBETWEEN formula for this: formulas are recalculated, which would silently change every guest's link.
// The columns are found by their header names ("name" and "token" in row 1), so adding or moving other columns is fine.
const TOKEN_SHEET = 'Guests';

function newToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').toLowerCase();
}

function fillTokens_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(TOKEN_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map((h) => String(h).trim().toLowerCase());
  const nameCol = headers.indexOf('name') + 1;
  const tokenCol = headers.indexOf('token') + 1;
  if (!nameCol || !tokenCol) return;
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) return;
  try {
    const count = sheet.getLastRow() - 1;
    const names = sheet.getRange(2, nameCol, count, 1).getValues();
    const tokenRange = sheet.getRange(2, tokenCol, count, 1);
    const tokens = tokenRange.getValues();
    let changed = false;
    for (let i = 0; i < count; i++) {
      if (String(names[i][0]).trim() && !String(tokens[i][0]).trim()) { tokens[i][0] = newToken_(); changed = true; }
    }
    if (changed) tokenRange.setValues(tokens); // only the token column is written; nothing else in the sheet is touched
  } finally {
    lock.releaseLock();
  }
}

function onEdit(e) {
  if (e && e.range && e.range.getSheet().getName() === TOKEN_SHEET) fillTokens_();
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Wedding').addItem('Isi token kosong', 'fillTokens_').addToUi();
}
