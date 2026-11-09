const MOBILE_WORK_SCHEMA = {
  Requests: {
    sheet: "PhieuYeuCau",
    fields: [
      "id",
      "workshopId",
      "workshopName",
      "machineId",
      "machineName",
      "componentId",
      "componentName",
      "type",
      "title",
      "description",
      "assignedTo",
      "createdBy",
      "createdByName",
      "createdAt",
      "createdDate",
      "status",
      "actualBy",
      "actualByName",
      "lastReportId",
      "scheduleId",
      "completedDate",
      "confirmedAt",
      "confirmedBy",
      "updatedAt",
      "revision",
      "requestKey",
      "deviceCode",
      "deviceName",
      "deviceKey",
    ],
    columns: [
      "maPhieuYeuCau",
      "maXuong",
      "tenXuong",
      "maMay",
      "tenMay",
      "maBoPhan",
      "tenBoPhan",
      "loaiYeuCau",
      "tieuDe",
      "moTaChiTiet",
      "nguoiDuocGiao",
      "nguoiYeuCau",
      "tenNguoiYeuCau",
      "thoiGianTao",
      "ngayYeuCau",
      "trangThai",
      "nguoiDangXuLy",
      "tenNguoiDangXuLy",
      "maBaoCaoGanNhat",
      "maLichBaoDuong",
      "ngayXuLyXong",
      "thoiGianXacNhan",
      "nguoiXacNhan",
      "thoiGianCapNhat",
      "phienBan",
      "maYeuCauChongLap",
      "maThietBi",
      "tenThietBi",
      "maHoSoThietBi",
    ],
  },
  ServiceReports: {
    sheet: "BaoCaoKhacPhuc",
    fields: [
      "id",
      "requestId",
      "ordinal",
      "status",
      "createdBy",
      "createdByName",
      "actualBy",
      "actualByName",
      "actualRole",
      "content",
      "performedDate",
      "checks",
      "photos",
      "createdAt",
      "submittedAt",
      "revision",
      "draftKey",
      "submitKey",
      "baseRevision",
      "scheduleId",
      "scheduleRevision",
      "scheduleDue",
      "scheduleInterval",
      "scheduleUnit",
      "checklist",
      "actualResults",
      "criteriaVersion",
      "criteriaSnapshot",
      "submitFingerprint",
    ],
    columns: [
      "maBaoCao",
      "maPhieuYeuCau",
      "lanBaoCao",
      "trangThai",
      "nguoiBaoCao",
      "tenNguoiBaoCao",
      "nguoiThucHien",
      "tenNguoiThucHien",
      "chucVuNguoiThucHien",
      "noiDungBaoCao",
      "ngayThucHien",
      "mucDaKiemTra",
      "danhSachAnh",
      "thoiGianTao",
      "thoiGianGui",
      "phienBan",
      "maSoanChongLap",
      "maGuiChongLap",
      "phienBanPhieu",
      "maLichBaoDuong",
      "phienBanLich",
      "hanLichBanDau",
      "chuKyLich",
      "donViChuKyLich",
      "danhSachKiemTra",
      "ketQuaThucTe",
      "phienBanChiTieu",
      "chiTietChiTieu",
      "dauVanTayGui",
    ],
  },
  ServiceReviews: {
    sheet: "XacNhanKhacPhuc",
    fields: [
      "id",
      "requestId",
      "reportId",
      "decision",
      "reason",
      "createdBy",
      "createdByName",
      "createdAt",
      "reviewKey",
      "processed",
      "calendarResult",
    ],
    columns: [
      "maXacNhan",
      "maPhieuYeuCau",
      "maBaoCao",
      "ketQuaXacNhan",
      "noiDungPhanHoi",
      "nguoiXacNhan",
      "tenNguoiXacNhan",
      "thoiGianXacNhan",
      "maXacNhanChongLap",
      "daDongBo",
      "ketQuaCapNhatLich",
    ],
  },
  Notifications: {
    sheet: "ThongBaoMobile",
    fields: [
      "id",
      "date",
      "kind",
      "recipient",
      "status",
      "message",
      "sentAt",
      "requestId",
    ],
    columns: [
      "maThongBao",
      "ngay",
      "kenh",
      "nguoiNhan",
      "trangThai",
      "noiDung",
      "thoiGianGui",
      "maPhieuYeuCau",
    ],
  },
};
function mobileWorkTable_(name, optional) {
  const spec = MOBILE_WORK_SCHEMA[name];
  if (!spec) throw Error("Bảng mobile không hợp lệ.");
  const sheet = SpreadsheetApp.openById(ADMIN_SHEET_ID).getSheetByName(
    spec.sheet,
  );
  if (!sheet && !optional)
    throw Error(
      "Chưa khởi tạo dữ liệu mobile. Chủ project chạy khoiTaoMobileTheoDanhMuc.",
    );
  return sheet;
}
function mobileWorkHeaders_(name, sheet) {
  const spec = MOBILE_WORK_SCHEMA[name],
    headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map((v) => String(v).trim()),
    map = {};
  spec.fields.forEach((field, i) => {
    const found = headers
      .map((h, j) => (h === spec.columns[i] ? j : -1))
      .filter((j) => j >= 0);
    if (found.length !== 1)
      throw Error(
        "Thiếu hoặc trùng cột " + spec.columns[i] + " trong " + spec.sheet,
      );
    map[field] = found[0];
  });
  return { headers, map };
}
function mobileWorkReadTable_(name) {
  const sheet = mobileWorkTable_(name),
    { map } = mobileWorkHeaders_(name, sheet);
  if (sheet.getLastRow() < 2) return [];
  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
    .getValues()
    .map((values, i) => {
      const row = { _row: i + 2 };
      Object.keys(map).forEach((field) => {
        const value = values[map[field]];
        row[field] =
          value instanceof Date
            ? Utilities.formatDate(
                value,
                "Asia/Ho_Chi_Minh",
                [
                  "createdDate",
                  "performedDate",
                  "completedDate",
                  "date",
                ].includes(field)
                  ? "yyyy-MM-dd"
                  : "yyyy-MM-dd'T'HH:mm:ssXXX",
              )
            : value == null
              ? ""
              : value;
      });
      return row;
    })
    .filter((r) => r[MOBILE_WORK_SCHEMA[name].fields[0]]);
}
function mobileWorkPersist_(name, row) {
  const sheet = mobileWorkTable_(name),
    { headers, map } = mobileWorkHeaders_(name, sheet),
    index = row._row || sheet.getLastRow() + 1,
    values = row._row
      ? sheet.getRange(index, 1, 1, headers.length).getValues()[0]
      : headers.map(() => "");
  Object.keys(map).forEach((field) => {
    let value = String(row[field] == null ? "" : row[field]);
    if (value.length > 45000)
      throw Error("Nội dung phiếu/báo cáo quá dài. Vui lòng rút gọn.");
    if (/^[=+\-@]/.test(value)) value = "'" + value;
    values[map[field]] = value;
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
function mobileWorkRows_(name) {
  if (name === "Assets")
    return JSON.parse(JSON.stringify(mobileWorkCatalog_().assets));
  if (name === "Schedules")
    return JSON.parse(JSON.stringify(mobileWorkCatalog_().schedules));
  const context = mobileWorkGetContext_();
  if (!context.rows.has(name))
    context.rows.set(name, mobileWorkReadTable_(name));
  return JSON.parse(JSON.stringify(context.rows.get(name)));
}
function mobileWorkWrite_(name, row) {
  mobileWorkPersist_(name, row);
  mobileWorkGetContext_().rows.delete(name);
  return row;
}
function mobileWorkSetup_() {
  const ss = SpreadsheetApp.openById(ADMIN_SHEET_ID),
    owned = new Set(Object.values(MOBILE_WORK_SCHEMA).map((s) => s.sheet)),
    before = ss
      .getSheets()
      .filter((s) => !owned.has(s.getName()))
      .map((s) => ({
        name: s.getName(),
        rows: s.getLastRow(),
        width: s.getLastColumn(),
        digest: adminHash_(JSON.stringify(s.getDataRange().getValues())),
      }));
  Object.keys(MOBILE_WORK_SCHEMA).forEach((name) => {
    const spec = MOBILE_WORK_SCHEMA[name];
    let s = ss.getSheetByName(spec.sheet);
    if (!s) s = ss.insertSheet(spec.sheet);
    if (s.getMaxColumns() < spec.columns.length)
      s.insertColumnsAfter(
        s.getMaxColumns(),
        spec.columns.length - s.getMaxColumns(),
      );
    if (!s.getLastRow())
      s.getRange(1, 1, 1, spec.columns.length).setValues([spec.columns]);
    else {
      const headers = s
        .getRange(1, 1, 1, s.getLastColumn())
        .getValues()[0]
        .map(String);
      spec.columns.forEach((column) => {
        if (!headers.includes(column)) {
          headers.push(column);
          s.getRange(1, headers.length).setValue(column);
        }
      });
    }
    mobileWorkHeaders_(name, s);
    s.setFrozenRows(1);
    s.getRange(1, 1, 1, s.getLastColumn())
      .setFontWeight("bold")
      .setBackground("#e0efdf");
    s.autoResizeColumns(1, s.getLastColumn());
  });
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("BAODUONG_PHOTO_FOLDER"))
    props.setProperty(
      "BAODUONG_PHOTO_FOLDER",
      DriveApp.createFolder("DMG_AnhBaoDuongSuaChua").getId(),
    );
  SpreadsheetApp.flush();
  const checks = before.map((item) => {
    const s = ss.getSheetByName(item.name),
      preserved =
        s.getLastRow() === item.rows &&
        s.getLastColumn() === item.width &&
        adminHash_(JSON.stringify(s.getDataRange().getValues())) ===
          item.digest;
    if (!preserved) throw Error("Dữ liệu thay đổi đồng thời ở " + item.name);
    return { sheet: item.name, preserved };
  });
  return {
    success: true,
    sheets: [...owned],
    checks,
    photoFolderReady: true,
    noSamples: true,
    noEmailSent: true,
  };
}
function khoiTaoMobileTheoDanhMuc() {
  const active = Session.getActiveUser().getEmail(),
    owner = Session.getEffectiveUser().getEmail();
  if (!active || active.toLowerCase() !== owner.toLowerCase())
    throw Error("Chủ project chạy hàm này trong editor.");
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return mobileWorkSetup_();
  } finally {
    lock.releaseLock();
  }
}
