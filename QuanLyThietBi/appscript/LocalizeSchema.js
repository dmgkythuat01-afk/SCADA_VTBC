/** Owner-only, idempotent rename of physical sheet names and header labels. */
function doiTenSheetVaCotTiengViet() {
  requireSetupOwner_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return migrateEquipmentVietnamese_(true);
  } finally {
    lock.releaseLock();
  }
}
function equipmentDataDigest_(values) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(values),
  )
    .map((b) => (b & 255).toString(16).padStart(2, "0"))
    .join("");
}
function migrateEquipmentVietnamese_(apply) {
  const ss = db_(),
    plans = [],
    recognized = new Set();
  Object.keys(EQUIPMENT_SHEETS).forEach((key) => {
    const sheet = equipmentSheet_(ss, key);
    if (!sheet) return;
    recognized.add(sheet.getSheetId());
    const values = sheet.getDataRange().getValues(),
      oldHeaders = values[0] || [],
      map = equipmentColumnMap_(key, oldHeaders),
      newHeaders = oldHeaders.slice();
    EQUIPMENT_SHEETS[key].forEach((field, i) => {
      if (map[field] < 0)
        throw Error(
          "Sheet " +
            sheet.getName() +
            " thiếu cột " +
            field +
            ". Chưa chuyển đổi.",
        );
      newHeaders[map[field]] = EQUIPMENT_STORAGE[key].columns[i];
    });
    if (
      newHeaders.some(
        (h) => !String(h).trim() || /[^A-Za-z0-9_]/.test(String(h)),
      )
    )
      throw Error(
        "Sheet " +
          sheet.getName() +
          " có cột bổ sung chưa được ánh xạ sang tiếng Việt không dấu.",
      );
    if (new Set(newHeaders).size !== newHeaders.length)
      throw Error("Tên cột mới bị trùng trong " + sheet.getName() + ".");
    plans.push({
      key,
      sheet,
      oldName: sheet.getName(),
      newName: EQUIPMENT_STORAGE[key].sheet,
      oldHeaders,
      newHeaders,
      beforeDigest: equipmentDataDigest_(values.slice(1)),
      rowCount: Math.max(0, values.length - 1),
      guide: false,
    });
  });
  let guide = ss.getSheetByName("HuongDan");
  ss.getSheets()
    .filter(
      (sh) => !recognized.has(sh.getSheetId()) && sh.getName() !== "HuongDan",
    )
    .forEach((sh) => {
      if (sh.getLastRow() > 0)
        throw Error(
          "Sheet " +
            sh.getName() +
            " có dữ liệu ngoài cấu trúc app. Cần kiểm tra trước khi đổi tên.",
        );
      if (guide)
        throw Error(
          "Có nhiều sheet trống ngoài cấu trúc app. Cần kiểm tra trước khi đổi tên.",
        );
      guide = sh;
      plans.push({
        sheet: sh,
        key: "Guide",
        oldName: sh.getName(),
        newName: "HuongDan",
        oldHeaders: [],
        newHeaders: ["muc", "noiDung"],
        rowCount: 0,
        beforeDigest: equipmentDataDigest_([]),
        guide: true,
      });
    });
  const summary = plans.map((p) => ({
    from: p.oldName,
    to: p.newName,
    rows: p.rowCount,
    columns: p.newHeaders,
  }));
  if (!apply) return { success: true, dryRun: true, plans: summary };
  const backup = plans.map((p) => ({
    sheetId: p.sheet.getSheetId(),
    name: p.oldName,
    headers: p.oldHeaders,
    digest: p.beforeDigest,
  }));
  props_().setProperty("SCHEMA_VI_MIGRATION_BACKUP", JSON.stringify(backup));
  const changed = [];
  try {
    plans.forEach((p) => {
      changed.push(p);
      if (p.oldName !== p.newName) p.sheet.setName(p.newName);
      p.sheet
        .getRange(1, 1, 1, p.newHeaders.length)
        .setValues([p.newHeaders])
        .setFontWeight("bold")
        .setBackground("#dcefe4");
      p.sheet.setFrozenRows(1);
      if (p.guide) {
        p.sheet.getRange(2, 1, 4, 2).setValues([
          ["ungDung", "Quản lý thiết bị: xưởng → khu vực → máy → bộ phận."],
          [
            "dangNhap",
            "Tài khoản ở sheet TaiKhoan; các cột tenDangNhap, matKhau, chucVu, hoTen.",
          ],
          [
            "duLieuMau",
            "Các dòng có ID DEMO_ hoặc nhãn [MẪU] là dữ liệu minh họa.",
          ],
          [
            "baoToanDuLieu",
            "Chỉ đổi tên sheet và tên cột; giữ nguyên ID, mật khẩu, lịch sử và các liên kết.",
          ],
        ]);
      }
    });
    SpreadsheetApp.flush();
    const checks = plans
      .filter((p) => !p.guide)
      .map((p) => {
        const after = p.sheet.getDataRange().getValues().slice(1),
          digest = equipmentDataDigest_(after);
        if (digest !== p.beforeDigest)
          throw Error("Dữ liệu thay đổi ngoài dự kiến ở " + p.newName + ".");
        return { sheet: p.newName, rows: after.length, preserved: true };
      });
    const assets = equipmentSheet_(ss, "Assets");
    if (assets) {
      ss.setActiveSheet(assets);
      ss.moveActiveSheet(1);
    }
    const account = equipmentSheet_(ss, "Account");
    if (account) {
      ss.setActiveSheet(account);
      ss.moveActiveSheet(2);
    }
    if (assets) ss.setActiveSheet(assets);
    props_().setProperty("SCHEMA_LANGUAGE", "vi-khong-dau");
    return { success: true, spreadsheet: ss.getUrl(), plans: summary, checks };
  } catch (error) {
    let rollbackError = "";
    changed.reverse().forEach((p) => {
      try {
        if (p.sheet.getName() !== p.oldName) p.sheet.setName(p.oldName);
        if (p.oldHeaders.length)
          p.sheet
            .getRange(1, 1, 1, p.oldHeaders.length)
            .setValues([p.oldHeaders]);
        else p.sheet.clearContents();
      } catch (e) {
        rollbackError += " " + e.message;
      }
    });
    SpreadsheetApp.flush();
    throw Error(
      error.message +
        (rollbackError
          ? " Khôi phục cần kiểm tra:" + rollbackError
          : " Đã khôi phục tên cũ."),
    );
  }
}
