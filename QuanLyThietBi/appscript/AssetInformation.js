function updateAssetInformationSchema_() {
  const sheet = equipmentSheet_(db_(), "Assets");
  if (!sheet || !sheet.getLastRow()) throw Error("Chưa có DanhMucThietBi.");
  const width = sheet.getLastColumn(), count = sheet.getLastRow(),
    before = sheet.getRange(1, 1, count, width).getValues(),
    headers = before[0].map(String);
  // Reject ambiguous aliases before writing any header.
  equipmentColumnMap_("Assets", headers);
  const oldIndex = headers.findIndex(h => h.trim() === "chiTiet");
  if (oldIndex >= 0) sheet.getRange(1, oldIndex + 1).setValue("thongSoKyThuat");
  ensureStore_();
  SpreadsheetApp.flush();
  const after = sheet.getRange(1, 1, count, width).getValues();
  if (equipmentDataDigest_(before.slice(1)) !== equipmentDataDigest_(after.slice(1)))
    throw Error("Dữ liệu danh mục đã thay đổi đồng thời. Cần kiểm tra lại.");
  return {success:true,sheet:"DanhMucThietBi",rows:count-1,preserved:true,
    columns:sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0]};
}
function capNhatThongTinThietBi() {
  requireSetupOwner_();
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {return updateAssetInformationSchema_();} finally {lock.releaseLock();}
}
