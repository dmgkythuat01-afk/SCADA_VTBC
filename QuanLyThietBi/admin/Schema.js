const ADMIN_SHEET_ID = "1GyLKh_9gwPeAzTMuowR3OE8eYnSSnoMPMLnWcUYxpoI";
let ADMIN_REQUEST_CONTEXT;
function adminBeginRequest_(){ADMIN_REQUEST_CONTEXT={workbook:null,secret:null,rows:{}};}
function adminRequestContext_(){if(!ADMIN_REQUEST_CONTEXT)adminBeginRequest_();return ADMIN_REQUEST_CONTEXT;}
function adminWorkbook_(){const c=adminRequestContext_();return c.workbook||(c.workbook=SpreadsheetApp.openById(ADMIN_SHEET_ID));}
function adminInvalidateRows_(name){delete adminRequestContext_().rows[name];}
const ADMIN_TABLES = {
  DanhMucSoKH: {
    label:'Danh mục sổ kế hoạch',icon:'▤',
    key:['tenXuong','tenMay','maThietBi','tenThietBi','danhMucCanKiemTra','boPhanDanhGia'],
    required:['tenXuong','tenMay','maThietBi','tenThietBi','danhMucCanKiemTra','boPhanDanhGia','loaiSoKHDB'],
    filters:['tenXuong','tenMay','maThietBi','boPhanDanhGia','loaiSoKHDB'],
    columns:{tenXuong:'Tên xưởng',tenMay:'Tên máy',maThietBi:'Mã thiết bị',tenThietBi:'Tên thiết bị',danhMucCanKiemTra:'Danh mục cần kiểm tra',tanSuatThayMoi:'Tần suất thay mới',tanSuatBaoDuong:'Tần suất bảo dưỡng',boPhanDanhGia:'Bộ phận đánh giá',loaiSoKHDB:'Loại sổ kế hoạch'},
  },
  TaiKhoan: {
    label: "Tài khoản",
    icon: "♙",
    key: ["tenDangNhap"],
    required: ["tenDangNhap", "chucVu", "hoTen"],
    filters: ["chucVu"],
    columns: {
      tenDangNhap: "Tên đăng nhập",
      matKhau: "Mật khẩu",
      chucVu: "Chức vụ",
      maNhanVien: "Mã nhân viên",
      hoTen: "Họ tên",
      email: "Email",
    },
  },
  DanhMucBoPhan: {
    label: "Danh mục bộ phận",
    icon: "▥",
    key: ["maBoPhanQuanLy"],
    required: ["maBoPhanQuanLy", "tenBoPhanQuanLy"],
    filters: ["phuTrachBoPhan"],
    columns: {
      maBoPhanQuanLy: "Mã bộ phận quản lý",
      tenBoPhanQuanLy: "Tên bộ phận quản lý",
      phuTrachBoPhan: "Phụ trách bộ phận",
    },
  },
  DanhMucXuong: {
    label: "Xưởng",
    icon: "▦",
    key: ["tenXuong"],
    required: ["tenXuong"],
    filters: [],
    columns: { tenXuong: "Tên xưởng" },
  },
  DanhMucMay: {
    label: "Máy",
    icon: "⚙",
    key: ["tenXuong", "tenMay"],
    required: ["tenXuong", "tenMay"],
    filters: ["tenXuong"],
    columns: { tenXuong: "Tên xưởng", tenMay: "Tên máy" },
  },
  DanhMucThietBi: {
    label: "Thiết bị",
    icon: "◇",
    key: ["tenXuong", "tenMay", "maThietBi"],
    required: ["tenXuong", "tenMay", "maThietBi"],
    filters: [
      "tenXuong",
      "tenMay",
      "tenBoPhanQuanLy",
      "maNguoiQuanLy",
      "dangSuDung",
    ],
    columns: {
      tenXuong: "Tên xưởng",
      tenMay: "Tên máy",
      maThietBi: "Mã thiết bị",
      tenThietBi: "Tên thiết bị",
      ThongSoKyThuat: "Thông số kỹ thuật",
      congDung: "Công dụng",
      donVi: "Đơn vị",
      soLuong: "Số lượng",
      dangSuDung: "Đang sử dụng",
      maNguoiQuanLy: "Mã người quản lý",
      tenNguoiQuanLy: "Tên người quản lý",
      tenBoPhanQuanLy: "Bộ phận quản lý",
      ngayLapDat: "Ngày lắp đặt",
      ThoiGianCapNhat: "Thời gian cập nhật",
    },
  },
  DanhMucCanKiemTra: {
    label: "Danh mục kiểm tra",
    icon: "☑",
    key: ["tenXuong", "tenMay", "maThietBi", "tenThietBi", "boPhanDanhGia", "loai", "tanSuatThamSo", "danhMucCanKiemTra", "thamSoCanKiemTra"],
    required: ["tenXuong", "tenMay", "maThietBi", "boPhanDanhGia", "loai", "tanSuatThamSo", "danhMucCanKiemTra"],
    filters: ["tenXuong", "tenMay", "maThietBi", "boPhanDanhGia", "loai", "tanSuatThamSo"],
    columns: {
      tenXuong: "Tên xưởng",
      tenMay: "Tên máy",
      maThietBi: "Mã thiết bị",
      tenThietBi: "Tên thiết bị",
      boPhanDanhGia: "Bộ phận đánh giá",
      loai: "Loại",
      tanSuatThamSo: "Tần suất tham số",
      danhMucCanKiemTra: "Danh mục cần kiểm tra",
      thamSoCanKiemTra: "Tham số cần kiểm tra",
      chiTieuDanhGia1: "Chỉ tiêu đánh giá 1",
      chiTieuDanhGia2: "Chỉ tiêu đánh giá 2",
      chiTieuDanhGia3: "Chỉ tiêu đánh giá 3",
    },
  },
};
function adminText_(v, max) {
  const s = String(v == null ? "" : v).trim();
  if (s.length > (max || 10000)) throw Error("Nội dung quá dài.");
  return s;
}
function adminNorm_(v) {
  return adminText_(v).toLocaleLowerCase("vi");
}
function adminSpec_(name) {
  if (!Object.prototype.hasOwnProperty.call(ADMIN_TABLES, name))
    throw Error("Danh mục không hợp lệ.");
  return ADMIN_TABLES[name];
}
function adminHash_(v) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(v))
    .map((b) => (b & 255).toString(16).padStart(2, "0"))
    .join("");
}
function adminNow_() {
  return Utilities.formatDate(
    new Date(),
    "Asia/Ho_Chi_Minh",
    "yyyy-MM-dd HH:mm:ss",
  );
}
function adminSheet_(name) {
  adminSpec_(name);
  const s = adminWorkbook_().getSheetByName(name);
  if (!s) throw Error("Không tìm thấy sheet " + name + ".");
  return s;
}
function adminHeader_(name, sheet) {
  const headers = sheet
      .getRange(1, 1, 1, Math.max(1, sheet.getLastColumn()))
      .getValues()[0]
      .map((h) => String(h).trim()),
    map = {};
  Object.keys(adminSpec_(name).columns).forEach((k) => {
    const matches = headers
      .map((h, i) => (h === k ? i : -1))
      .filter((i) => i >= 0);
    if (matches.length !== 1)
      throw Error("Sheet " + name + ": thiếu hoặc trùng cột " + k + ".");
    map[k] = matches[0];
  });
  return { headers, map };
}
function readAdminRows_(name, columnOrders) {
  adminSpec_(name);
  const context=adminRequestContext_();
  if(!context.rows[name]){const orders={};context.rows[name]={rows:readAdminRowsFresh_(name,orders),order:orders[name]};}
  const cached=context.rows[name];
  if(columnOrders)columnOrders[name]=cached.order.slice();
  return cached.rows.map(r=>({...r}));
}
function readAdminRowsFresh_(name, columnOrders) {
  const sheet = adminSheet_(name),
    { headers, map } = adminHeader_(name, sheet);
  if (columnOrders)
    columnOrders[name] = headers.filter((key) =>
      Object.prototype.hasOwnProperty.call(map, key),
    );
  if (sheet.getLastRow() < 2) return [];
  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
    .getValues()
    .map((values, i) => {
      const row = { _row: i + 2 };
      Object.keys(map).forEach((k) => {
        const v = values[map[k]];
        row[k] =
          v instanceof Date
            ? Utilities.formatDate(
                v,
                "Asia/Ho_Chi_Minh",
                k === "ngayLapDat" ? "yyyy-MM-dd" : "yyyy-MM-dd HH:mm:ss",
              )
            : String(v == null ? "" : v);
      });
      return row;
    })
    .filter((r) => Object.keys(map).some((k) => r[k] !== ""));
}
function writeAdminRow_(name, row, index) {
  const sheet = adminSheet_(name),
    { map } = adminHeader_(name, sheet),
    target = index || Math.max(2, sheet.getLastRow() + 1),
    cells = Object.keys(map)
      .map((k) => {
        let value = row[k] === undefined ? "" : String(row[k]);
        if (/^[=+\-@]/.test(value)) value = "'" + value;
        return { column: map[k] + 1, value };
      })
      .sort((a, b) => a.column - b.column);
  for (let i = 0; i < cells.length;) {
    let end = i + 1;
    while (
      end < cells.length &&
      cells[end].column === cells[end - 1].column + 1
    )
      end++;
    sheet
      .getRange(target, cells[i].column, 1, end - i)
      .setNumberFormat("@")
      .setValues([cells.slice(i, end).map((c) => c.value)]);
    i = end;
  }
  SpreadsheetApp.flush();
  adminInvalidateRows_(name);
  return row;
}
function deleteAdminRow_(name, index) {
  adminSheet_(name).deleteRow(index);
  SpreadsheetApp.flush();
  adminInvalidateRows_(name);
}
function writeAdminBatch_(name, rows) {
  const sheet = adminSheet_(name),
    { headers, map } = adminHeader_(name, sheet);
  const start = Math.max(2, sheet.getLastRow() + 1);
  const matrix = rows.map((row) => {
    const values = headers.map(() => "");
    Object.keys(map).forEach((key) => {
      let value = row[key] === undefined ? "" : String(row[key]);
      if (/^[=+\-@]/.test(value)) value = "'" + value;
      values[map[key]] = value;
    });
    return values;
  });
  const needed = start + matrix.length - 1 - sheet.getMaxRows();
  if (needed > 0) sheet.insertRowsAfter(sheet.getMaxRows(), needed);
  sheet
    .getRange(start, 1, matrix.length, headers.length)
    .setNumberFormat("@")
    .setValues(matrix);
  SpreadsheetApp.flush();
  adminInvalidateRows_(name);
}
function adminRowVersion_(name, row) {
  return adminHmac_(
    JSON.stringify([
      name,
      Object.keys(adminSpec_(name).columns).map((k) =>
        row[k] === undefined ? "" : String(row[k]),
      ),
    ]),
    adminSecret_(),
  );
}
function publicAdminRow_(name, row) {
  const r = { ...row, _version: adminRowVersion_(name, row) };
  if (name === "TaiKhoan") {
    r._hasPassword = !!r.matKhau;
    r.matKhau = "";
  }
  return r;
}
function equipmentColumnOrder_() {
  const name = "DanhMucThietBi";
  const { headers, map } = adminHeader_(name, adminSheet_(name));
  return headers.filter((key) =>
    Object.prototype.hasOwnProperty.call(map, key),
  );
}
function adminSnapshot_(user) {
  const tables = {},
    columnOrders = {};
  Object.keys(ADMIN_TABLES).forEach(
    (n) =>
      (tables[n] = readAdminRows_(n, columnOrders).map((r) =>
        publicAdminRow_(n, r),
      )),
  );
  return {
    user,
    tables,
    schema: ADMIN_TABLES,
    columnOrders,
    systemParameters: equipmentSystemParameters_(),
    planCategories: equipmentPlanCategories_(),
    updatedAt: adminNow_(),
  };
}
