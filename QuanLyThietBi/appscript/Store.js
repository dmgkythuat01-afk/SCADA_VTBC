const EQUIPMENT_SHEETS = {
  Assets: [
    "id",
    "type",
    "parentId",
    "name",
    "code",
    "purpose",
    "details",
    "checklist",
    "active",
    "updatedAt",
    "updatedBy",
    "revision",
    "managerId",
  ],
  Schedules: [
    "id",
    "componentId",
    "name",
    "interval",
    "unit",
    "dueDate",
    "assignee",
    "checklist",
    "active",
    "updatedAt",
    "revision",
  ],
  Jobs: [
    "id",
    "componentId",
    "scheduleId",
    "type",
    "title",
    "description",
    "assignee",
    "status",
    "openedAt",
    "openedBy",
    "completedDate",
    "completedAt",
    "completedBy",
    "result",
    "photos",
    "requestId",
    "revision",
    "completionRequestId",
  ],
  Account: ["useName", "passWord", "role", "name", "email"],
  Managers: [
    "id",
    "name",
    "email",
    "phone",
    "position",
    "active",
    "updatedAt",
    "revision",
  ],
  Notifications: [
    "id",
    "date",
    "kind",
    "recipient",
    "status",
    "message",
    "sentAt",
  ],
  Audit: ["id", "at", "email", "action", "entity", "details"],
  Settings: ["key", "value"],
};
// Vietnamese physical schema; English object keys are internal only.
const EQUIPMENT_STORAGE = {
  Assets: {
    sheet: "DanhMucThietBi",
    columns: [
      "maDinhDanh",
      "loaiDanhMuc",
      "maCapTren",
      "tenDanhMuc",
      "maThietBi",
      "congDung",
      "chiTiet",
      "danhSachKiemTra",
      "dangSuDung",
      "thoiGianCapNhat",
      "nguoiCapNhat",
      "phienBan",
      "maNguoiQuanLy",
    ],
  },
  Schedules: {
    sheet: "LichBaoDuong",
    columns: [
      "maLich",
      "maBoPhan",
      "tenCongViec",
      "chuKy",
      "donViChuKy",
      "ngayDenHan",
      "nguoiPhuTrach",
      "danhSachKiemTra",
      "dangApDung",
      "thoiGianCapNhat",
      "phienBan",
    ],
  },
  Jobs: {
    sheet: "CongViec",
    columns: [
      "maCongViec",
      "maBoPhan",
      "maLich",
      "loaiCongViec",
      "tieuDe",
      "moTa",
      "nguoiPhuTrach",
      "trangThai",
      "thoiGianTao",
      "nguoiTao",
      "ngayHoanThanh",
      "thoiGianHoanThanh",
      "nguoiHoanThanh",
      "ketQua",
      "danhSachAnh",
      "maYeuCau",
      "phienBan",
      "maYeuCauHoanThanh",
    ],
  },
  Account: {
    sheet: "TaiKhoan",
    columns: ["tenDangNhap", "matKhau", "chucVu", "hoTen", "email"],
  },
  Managers: {
    sheet: "NguoiQuanLy",
    columns: [
      "maNguoiQuanLy",
      "hoTen",
      "email",
      "soDienThoai",
      "chucVu",
      "dangSuDung",
      "thoiGianCapNhat",
      "phienBan",
    ],
  },
  Notifications: {
    sheet: "NhatKyThongBao",
    columns: [
      "maThongBao",
      "ngay",
      "kenh",
      "nguoiNhan",
      "trangThai",
      "noiDung",
      "thoiGianGui",
    ],
  },
  Audit: {
    sheet: "NhatKyThaoTac",
    columns: [
      "maThaoTac",
      "thoiGian",
      "nguoiThaoTac",
      "hanhDong",
      "doiTuong",
      "chiTiet",
    ],
  },
  Settings: {
    sheet: "CauHinh",
    columns: ["tenCauHinh", "giaTri"],
  },
};
function props_() {
  return PropertiesService.getScriptProperties();
}
function db_() {
  return SpreadsheetApp.openById(
    "1GyLKh_9gwPeAzTMuowR3OE8eYnSSnoMPMLnWcUYxpoI",
  );
}
function equipmentSheet_(ss, name) {
  const spec = EQUIPMENT_STORAGE[name];
  if (!spec) throw Error("Danh mục dữ liệu không hợp lệ: " + name);
  const current = ss.getSheetByName(spec.sheet),
    legacy = ss.getSheetByName(name);
  if (current && legacy && current !== legacy)
    throw Error(
      "Đang có cả sheet " +
        name +
        " và " +
        spec.sheet +
        ". Cần kiểm tra trước khi tiếp tục.",
    );
  return current || legacy;
}
function equipmentColumnMap_(name, headers) {
  const fields = EQUIPMENT_SHEETS[name],
    labels = EQUIPMENT_STORAGE[name].columns,
    map = {};
  fields.forEach((field, i) => {
    const indexes = [];
    headers.forEach((h, j) => {
      if (String(h).trim() === field || String(h).trim() === labels[i])
        indexes.push(j);
    });
    if (indexes.length > 1)
      throw Error("Cột " + labels[i] + " bị trùng hoặc có cả tên cũ và mới.");
    map[field] = indexes.length ? indexes[0] : -1;
  });
  return map;
}
function ensureStore_() {
  const ss = db_();
  Object.keys(EQUIPMENT_SHEETS).forEach((name) => {
    const labels = EQUIPMENT_STORAGE[name].columns;
    let sh = equipmentSheet_(ss, name);
    if (!sh) sh = ss.insertSheet(EQUIPMENT_STORAGE[name].sheet);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, labels.length)
        .setValues([labels])
        .setFontWeight("bold")
        .setBackground("#e1f1e9");
      sh.setFrozenRows(1);
      return;
    }
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0],
      map = equipmentColumnMap_(name, headers);
    EQUIPMENT_SHEETS[name].forEach((key, i) => {
      if (map[key] < 0) {
        headers.push(labels[i]);
        sh.getRange(1, headers.length).setValue(labels[i]);
      }
    });
  });
}
function rows_(name) {
  const sh = equipmentSheet_(db_(), name);
  if (!sh || sh.getLastRow() < 2) return [];
  const width = sh.getLastColumn(),
    headers = sh.getRange(1, 1, 1, width).getValues()[0],
    map = equipmentColumnMap_(name, headers),
    keys = EQUIPMENT_SHEETS[name];
  return sh
    .getRange(2, 1, sh.getLastRow() - 1, width)
    .getValues()
    .map((row, i) => {
      const out = { _row: i + 2 };
      keys.forEach((key) => {
        const v = map[key] < 0 ? "" : row[map[key]];
        out[key] = v instanceof Date ? v.toISOString() : v;
      });
      return out;
    })
    .filter((row) => row[keys[0]]);
}
function write_(name, obj) {
  const sh = equipmentSheet_(db_(), name);
  if (!sh) throw Error("Chưa có sheet " + EQUIPMENT_STORAGE[name].sheet + ".");
  const keys = EQUIPMENT_SHEETS[name],
    labels = EQUIPMENT_STORAGE[name].columns,
    headers = sh
      .getRange(1, 1, 1, Math.max(1, sh.getLastColumn()))
      .getValues()[0];
  let map = equipmentColumnMap_(name, headers);
  keys.forEach((key, i) => {
    if (map[key] < 0) {
      const column = headers.length;
      headers.push(labels[i]);
      sh.getRange(1, column + 1).setValue(labels[i]);
      map[key] = column;
    }
  });
  const row = obj._row || sh.getLastRow() + 1;
  const cells = keys
    .map((key) => {
      let value = obj[key] === undefined ? "" : obj[key];
      if (typeof value === "string" && /^[=+\-@]/.test(value))
        value = "'" + value;
      return { column: map[key] + 1, value };
    })
    .sort((a, b) => a.column - b.column);
  // Write only mapped columns, so additional user columns and formulas survive.
  let start = 0;
  while (start < cells.length) {
    let end = start + 1;
    while (
      end < cells.length &&
      cells[end].column === cells[end - 1].column + 1
    )
      end++;
    sh.getRange(row, cells[start].column, 1, end - start)
      .setNumberFormat("@")
      .setValues([cells.slice(start, end).map((x) => x.value)]);
    start = end;
  }
  return obj;
}
function id_() {
  return Utilities.getUuid();
}
function now_() {
  return new Date().toISOString();
}
function today_() {
  return Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd");
}
function enabled_(r) {
  return String(r.active) !== "false";
}
function audit_(user, action, entity, details) {
  write_("Audit", {
    id: id_(),
    at: now_(),
    email: user.email,
    action,
    entity,
    details: JSON.stringify(details || {}),
  });
}
function settings_() {
  const out = {};
  rows_("Settings").forEach((r) => (out[r.key] = r.value));
  return out;
}
function setting_(key, value) {
  const old = rows_("Settings").find((r) => r.key === key);
  write_("Settings", Object.assign(old || { key }, { value: String(value) }));
}
function parsed_(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch (e) {
    return fallback;
  }
}
function asset_(id) {
  const a = rows_("Assets").find((r) => r.id === id);
  if (!a) throw Error("Không tìm thấy thiết bị.");
  return a;
}
function checkRevision_(old, input) {
  if (old && Number(old.revision) !== Number(input.revision))
    throw Error("Dữ liệu đã thay đổi. Hãy tải lại trước khi lưu.");
}
