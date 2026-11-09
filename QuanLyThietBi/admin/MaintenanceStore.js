const MAINTENANCE_COLUMNS = [
  "maLichSu",
  "maHoSo",
  "tenXuong",
  "tenMay",
  "maThietBi",
  "tenThietBi",
  "ngayThucHien",
  "hoanThanh",
  "nguoiThucHien",
  "tenNguoiThucHien",
  "moTaLoi",
  "noiDung",
  "ketQua",
  "chiTietKiemTra",
  "danhSachAnh",
  "nguoiGhiNhan",
  "tenNguoiGhiNhan",
  "thoiGianGhiNhan",
  "maYeuCau",
  "dauVanTay",
];
const MAINTENANCE_TABLES = {
  LichSuBaoDuong: MAINTENANCE_COLUMNS,
  LichSuSuaChua: MAINTENANCE_COLUMNS,
  CauHinhBaoDuong: ["tenCauHinh", "giaTri"],
  NhatKyThongBaoBaoDuong: [
    "maThongBao",
    "ngayBaoCao",
    "trangThai",
    "nguoiNhan",
    "soQuaHan",
    "soDenHan",
    "soSapDenHan",
    "noiDungLoi",
    "thoiGianGui",
  ],
};
function maintenanceToday_() {
  return Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd");
}
function maintenanceTable_(name, optional) {
  if (!Object.prototype.hasOwnProperty.call(MAINTENANCE_TABLES, name))
    throw Error("Dữ liệu bảo dưỡng không hợp lệ.");
  const sheet = SpreadsheetApp.openById(ADMIN_SHEET_ID).getSheetByName(name);
  if (!sheet && !optional)
    throw Error(
      "Chưa khởi tạo dữ liệu bảo dưỡng. Chủ project chạy khoiTaoQuanLyBaoDuong.",
    );
  return sheet;
}
function maintenanceHeader_(name, sheet) {
  const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map(String),
    map = {};
  MAINTENANCE_TABLES[name].forEach((key) => {
    const indices = headers
      .map((h, i) => (h.trim() === key ? i : -1))
      .filter((i) => i >= 0);
    if (indices.length !== 1)
      throw Error("Thiếu hoặc trùng cột " + key + " trong " + name);
    map[key] = indices[0];
  });
  return { headers, map };
}
function maintenanceRows_(name) {
  const sheet = maintenanceTable_(name);
  const { map } = maintenanceHeader_(name, sheet);
  if (sheet.getLastRow() < 2) return [];
  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
    .getValues()
    .map((values, i) => {
      const row = { _row: i + 2 };
      Object.keys(map).forEach((key) => {
        const v = values[map[key]];
        row[key] =
          v instanceof Date
            ? Utilities.formatDate(
                v,
                "Asia/Ho_Chi_Minh",
                key === "ngayThucHien" || key === "ngayBaoCao"
                  ? "yyyy-MM-dd"
                  : "yyyy-MM-dd HH:mm:ss",
              )
            : String(v == null ? "" : v);
      });
      return row;
    })
    .filter((r) => r[MAINTENANCE_TABLES[name][0]]);
}
function maintenanceWrite_(name, row) {
  const sheet = maintenanceTable_(name),
    { headers, map } = maintenanceHeader_(name, sheet),
    index = row._row || sheet.getLastRow() + 1;
  const values = row._row
    ? sheet.getRange(index, 1, 1, headers.length).getValues()[0]
    : headers.map(() => "");
  Object.keys(map).forEach((key) => {
    let value = String(row[key] == null ? "" : row[key]);
    if (value.length > 45000)
      throw Error(
        "Nội dung một ô lịch sử quá dài. Vui lòng rút gọn kết quả hoặc chỉ tiêu kiểm tra.",
      );
    if (/^[=+\-@]/.test(value)) value = "'" + value;
    values[map[key]] = value;
  });
  if (index > sheet.getMaxRows())
    sheet.insertRowsAfter(sheet.getMaxRows(), index - sheet.getMaxRows());
  sheet
    .getRange(index, 1, 1, headers.length)
    .setNumberFormat("@")
    .setValues([values]);
  SpreadsheetApp.flush();
  row._row = index;
  return row;
}
function maintenanceHistories_() {
  return [
    ...maintenanceRows_("LichSuBaoDuong").map((r) => ({
      ...r,
      loai: "maintenance",
    })),
    ...maintenanceRows_("LichSuSuaChua").map((r) => ({ ...r, loai: "repair" })),
  ];
}
function maintenanceSettings_() {
  const result = {};
  maintenanceRows_("CauHinhBaoDuong").forEach(
    (r) => (result[r.tenCauHinh] = r.giaTri),
  );
  return result;
}
function maintenanceSetSetting_(key, value) {
  const old = maintenanceRows_("CauHinhBaoDuong").find(
    (r) => r.tenCauHinh === key,
  );
  return maintenanceWrite_("CauHinhBaoDuong", {
    ...(old || {}),
    tenCauHinh: key,
    giaTri: String(value),
  });
}
function maintenanceProtectReference_(name, row) {
  const maintenance = maintenanceTable_("LichSuBaoDuong", true),
    repair = maintenanceTable_("LichSuSuaChua", true);
  if (!maintenance && !repair) return;
  if (!maintenance || !repair)
    throw Error(
      "Thiếu sheet lịch sử. Khôi phục cấu trúc bảo dưỡng trước khi đổi/xóa danh mục.",
    );
  const history = maintenanceHistories_();
  let used = [];
  if (name === "DanhMucXuong")
    used = history.filter((r) => adminSame_(r, row, ["tenXuong"]));
  if (name === "DanhMucMay")
    used = history.filter((r) => adminSame_(r, row, ["tenXuong", "tenMay"]));
  if (name === "DanhMucThietBi")
    used = history.filter(
      (r) => maintenanceDeviceKey_(r) === maintenanceDeviceKey_(row),
    );
  if (used.length)
    throw Error(
      "Danh mục này đã có " +
        used.length +
        " bản ghi bảo dưỡng/sửa chữa. Giữ nguyên mã và vị trí để bảo toàn lịch sử.",
    );
}
function maintenanceSetup_() {
  const ss = SpreadsheetApp.openById(ADMIN_SHEET_ID),
    before = Object.keys(ADMIN_TABLES).map((name) => {
      const s = ss.getSheetByName(name);
      return {
        name,
        rows: s.getLastRow(),
        width: s.getLastColumn(),
        digest: adminHash_(JSON.stringify(s.getDataRange().getValues())),
      };
    });
  Object.keys(MAINTENANCE_TABLES).forEach((name) => {
    let s = ss.getSheetByName(name);
    if (!s) s = ss.insertSheet(name);
    if (!s.getLastRow())
      s.getRange(1, 1, 1, MAINTENANCE_TABLES[name].length).setValues([
        MAINTENANCE_TABLES[name],
      ]);
    maintenanceHeader_(name, s);
    s.setFrozenRows(1);
    s.getRange(1, 1, 1, s.getLastColumn())
      .setFontWeight("bold")
      .setBackground("#e1efdf");
    s.autoResizeColumns(1, s.getLastColumn());
  });
  const settings = maintenanceSettings_();
  if (settings.emailNhanBaoCao === undefined)
    maintenanceSetSetting_(
      "emailNhanBaoCao",
      Session.getEffectiveUser().getEmail() || "",
    );
  if (settings.guiEmail === undefined)
    maintenanceSetSetting_("guiEmail", "true");
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("BAODUONG_PHOTO_FOLDER"))
    props.setProperty(
      "BAODUONG_PHOTO_FOLDER",
      DriveApp.createFolder("DMG_AnhBaoDuongSuaChua").getId(),
    );
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === "baoCaoBaoDuongDinhKy_")
    .forEach((t) => ScriptApp.deleteTrigger(t));
  [ScriptApp.WeekDay.MONDAY, ScriptApp.WeekDay.FRIDAY].forEach((day) =>
    ScriptApp.newTrigger("baoCaoBaoDuongDinhKy_")
      .timeBased()
      .onWeekDay(day)
      .atHour(8)
      .inTimezone("Asia/Ho_Chi_Minh")
      .create(),
  );
  SpreadsheetApp.flush();
  const checks = before.map((item) => {
    const s = ss.getSheetByName(item.name),
      preserved =
        s.getLastRow() === item.rows &&
        s.getLastColumn() === item.width &&
        adminHash_(JSON.stringify(s.getDataRange().getValues())) ===
          item.digest;
    if (!preserved) throw Error("Danh mục thay đổi đồng thời: " + item.name);
    return { sheet: item.name, preserved };
  });
  return {
    success: true,
    sheets: Object.keys(MAINTENANCE_TABLES),
    checks,
    photoFolderReady: true,
    reportTriggers: ScriptApp.getProjectTriggers().filter(
      (t) => t.getHandlerFunction() === "baoCaoBaoDuongDinhKy_",
    ).length,
    emailConfigured: !!maintenanceSettings_().emailNhanBaoCao,
    noEmailSent: true,
  };
}
function khoiTaoQuanLyBaoDuong() {
  const active = Session.getActiveUser().getEmail(),
    owner = Session.getEffectiveUser().getEmail();
  if (!active || active.toLowerCase() !== owner.toLowerCase())
    throw Error("Chủ project chạy hàm này trong Apps Script editor.");
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return maintenanceSetup_();
  } finally {
    lock.releaseLock();
  }
}
