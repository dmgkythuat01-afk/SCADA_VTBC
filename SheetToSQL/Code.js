const SPREADSHEET_ID = "1yFlCpC6JzLRmv9hukNw05vYpeYmkhXRcPC-0nCNOjAQ";
const API_TOKEN = "Manhlv286@123ra";
  
const CACHE_SECONDS_ACCOUNT = 300;

const SHEET_CHI_TIET_TRON_LIEU_SAN_XUAT = "chiTietTronLieuSanXuat";
const SHEET_CHI_TIET_LAP_VI = "chiTietLapVi";
const SHEET_CHI_TIET_SAN_XUAT_BAN_THANH_PHAM = "ChiTietSanXuatBanThanhPham";

const CHI_TIET_CAN_BATCH_HEADERS_FOR_TRON = [
  "PhieuXuatId",
  "KeHoachId",
  "tenBaiLieu",
  "soLuong",
  "NgaySanXuat",
  "STT",
  "maNguyenLieu",
  "tenNguyenLieu",
  "khoiLuongCanXuat",
  "donViCanXuat",
  "sttTron",
  "canSuDung",
  "IdKho",
  "khoiLuongKho",
  "donViKho",
  "quyCachDongGoi",
  "LotNo",
  "ngaySanXuatKho",
  "hanSuDung",
  "nhaCungCap",
  "ngayNhap",
  "nguoiTao",
  "ngayTao",
  "trangThaiPheDuyet",
  "cachXuat",
  "nguoiPheDuyet",
  "thoiGianDuyet",
  "IdKhoDaTru",
  "IdTuKhoDenBatch",
  "KhoiLuong",
  "SttBatchNL",
  "IdBatch",
  "khoiLuongThucTe",
  "saiSo",
  "nguoiCan",
  "thoiGianCan"
];

const CHI_TIET_TRON_LIEU_SAN_XUAT_EXTRA_HEADERS = [
  "IdMeTron",
  "MeTronDaThucHien",
  "TrangThaiBatch",
  "nguoiXacNhanTron",
  "thoiGianXacNhanTron",
  "ghiChu"
];

const CHI_TIET_TRON_LIEU_SAN_XUAT_HEADERS =
  CHI_TIET_TRON_LIEU_SAN_XUAT_EXTRA_HEADERS.concat(CHI_TIET_CAN_BATCH_HEADERS_FOR_TRON);

const SHEETS = {
  ACCOUNT: {
    name: "Account",
    requiredHeaders: ["useName", "passWord", "role", "department"],
    keyFields: ["useName"]
  },

  PHIEU_XUAT_NGUYEN_LIEU: {
    name: "PhieuXuatNguyenLieu",
    requiredHeaders: [
      "PhieuXuatId",
      "KeHoachId",
      "tenBaiLieu",
      "soLuong",
      "NgaySanXuat",
      "STT",
      "maNguyenLieu",
      "tenNguyenLieu",
      "khoiLuongCanXuat",
      "donViCanXuat",
      "sttTron",
      "canSuDung",
      "IdKho",
      "khoiLuongKho",
      "donViKho",
      "quyCachDongGoi",
      "LotNo",
      "ngaySanXuatKho",
      "hanSuDung",
      "nhaCungCap",
      "ngayNhap",
      "nguoiTao",
      "ngayTao",
      "trangThaiPheDuyet",
      "cachXuat",
      "nguoiPheDuyet",
      "thoiGianDuyet",
      "IdKhoDaTru",
      "khoiLuongXuatThucTe",
      "MaKeToan"
    ],
    keyFields: ["PhieuXuatId", "KeHoachId", "IdKho"]
  },

  BAI_TRON_LIEU: {
    name: "BaiTronLieu",
    requiredHeaders: [
      "Id",
      "tenBaiLieu",
      "STT",
      "maNguyenLieu",
      "tenNguyenLieu",
      "khoiLuong",
      "donVi",
      "sttTron",
      "canSuDung",
      "loaiNguyenLieu"
    ],
    keyFields: ["Id", "tenBaiLieu", "maNguyenLieu"]
  },

  NGUYEN_LIEU: {
    name: "NguyenLieu",
    requiredHeaders: [
      "maNguyenLieu",
      "tenNguyenLieu"
    ],
    keyFields: ["maNguyenLieu", "tenNguyenLieu"]
  },

  KE_HOACH_SAN_XUAT: {
    name: "KeHoachSanXuat",
    requiredHeaders: [
      "Id",
      "tenBaiLieu",
      "soLuong",
      "NgaySanXuat",
      "nguoiTao",
      "ngayTao",
      "khoiLuongMotMe",
      "daHoanKhoKhiHuy",
      "tenNguyenLieu",
      "MaKeToan"
    ],
    keyFields: ["Id", "tenNguyenLieu", "MaKeToan"]
  },

  KHO_NGUYEN_LIEU: {
    name: "KhoNguyenLieu",
    requiredHeaders: [
      "Id",
      "maNguyenLieu",
      "tenNguyenLieu",
      "khoiLuongNhap",
      "donVi",
      "quyCachDongGoi",
      "LotNo",
      "ngaySanXuat",
      "hanSuDung",
      "nhaCungCap",
      "ngayNhap",
      "trangThai",
      "nguoiPheDuyetChatLuong",
      "ngayPheDuyet"
    ],
    keyFields: ["Id"]
  },

  DON_HANG_NHAP_KHO: {
    name: "DonHangNhapKho",
    requiredHeaders: [
      "DonHangId",
      "IdKho",
      "maNguyenLieu",
      "tenNguyenLieu",
      "khoiLuongNhap",
      "donVi",
      "quyCachDongGoi",
      "LotNo",
      "ngaySanXuat",
      "hanSuDung",
      "nhaCungCap",
      "ngayNhap",
      "ngayTaoDon",
      "nguoiTao",
      "trangThaiPheDuyet"
    ],
    keyFields: ["DonHangId", "IdKho"]
  },

  KET_QUA_LAP_VI: {
    name: "KetQuaLapVi",

    requiredHeaders: [
      "IdThungDungVi",
      "IdLapVi",
      "soLuongViDaLap",
      "ngaySanXuat",
      "thoiGianLuu",
      "nguoiLuu",
      "vitriKho",
      "IdThungBanThanhPham1",
      "IdThungBanThanhPham2"
    ],

    keyFields: [
      "IdThungDungVi"
    ]
  },

  CHI_TIET_BTP_THEO_THUNG: {
    name: "ChiTietBTPtheoThung",

    requiredHeaders: [
      "IdBanThanhPham",
      "ngaySanXuat",
      "IdThungBanThanhPham",
      "sttThung",
      "khoiLuongThung",
      "viTriThung"
    ],

    /*
    * Mỗi thùng bán thành phẩm có một mã thùng riêng.
    * Dùng IdThungBanThanhPham để xác định dòng có dữ liệu.
    */
    keyFields: [
      "IdThungBanThanhPham"
    ]
  },

  KE_HOACH_LAP_VI_VTBC: {
    name: "KeHoachLapViVTBC",

    requiredHeaders: [
      "IdLapVi",
      "STT",
      "maSanPham",
      "tenSanPham",
      "tenBaiLieu1",
      "tenBaiLieu2",
      "IdThungBanThanhPham1",
      "IdThungBanThanhPham2",
      "thoiGianTao",
      "nguoiTao",
      "trangThai",
      "thoiGianXuat",
      "nguoiXuat"
    ],

    /*
    * IdLapVi là mã chính của kế hoạch lắp vỉ.
    */
    keyFields: [
      "IdLapVi"
    ]
  }
};

const DATE_ONLY_HEADERS = [
  "NgaySanXuat",
  "ngaySanXuat",
  "ngaySanXuatKho",
  "hanSuDung",
  "ngayNhap"
];

const DATE_TIME_HEADERS = [
  "ngayTao",
  "ngayTaoDon",
  "thoiGianDuyet",
  "ngayPheDuyet",
  "thoiGianLuu",
  "thoiGianTao",
  "thoiGianXuat"
];

const STRING_HEADERS = [
  "useName",
  "passWord",
  "role",
  "department",
  "Id",
  "PhieuXuatId",
  "KeHoachId",
  "tenBaiLieu",
  "maNguyenLieu",
  "tenNguyenLieu",
  "donVi",
  "donViCanXuat",
  "donViKho",
  "canSuDung",
  "loaiNguyenLieu",
  "IdKho",
  "quyCachDongGoi",
  "LotNo",
  "nhaCungCap",
  "nguoiTao",
  "trangThaiPheDuyet",
  "cachXuat",
  "nguoiPheDuyet",
  "IdKhoDaTru",
  "trangThai",
  "nguoiPheDuyetChatLuong",
  "DonHangId",

  "IdThungDungVi",
  "IdLapVi",
  "nguoiLuu",
  "vitriKho",

  "IdBanThanhPham",
  "IdThungBanThanhPham",
  "viTriThung",

  "maSanPham",
  "tenSanPham",
  "tenBaiLieu1",
  "tenBaiLieu2",
  "IdThungBanThanhPham1",
  "IdThungBanThanhPham2",
  "nguoiXuat"
];

function doGet(e) {
  try {
    const action = getParam_(e, "action");
    const token = getParam_(e, "token");

    if (token !== API_TOKEN) {
      return jsonResponse_({
        success: false,
        message: "Token không hợp lệ."
      });
    }

    if (action === "ping") {
      return jsonResponse_({
        success: true,
        message: "API đang hoạt động.",
        serverTime: nowText_()
      });
    }

    if (action === "getAccounts") {
      return jsonResponse_(getAccountsApi_());
    }

        if (action === "getAllData") {
      return jsonResponse_(getAllDataApi_());
    }

    if (action === "getKeHoachLapViVTBC") {
      return jsonResponse_(getKeHoachLapViVTBCApi_());
    }

    if (action === "getChiTietCanBatchRecentDays") {
      return jsonResponse_(getChiTietCanBatchRecentDays_(e));
    }

    if (action === "getChiTietTronLieuSanXuatRecentDays") {
      return jsonResponse_(getChiTietTronLieuSanXuatRecentDays_(e));
    }

    if (action === "getChiTietTronLieuSanXuatByDate") {
      return jsonResponse_(getChiTietTronLieuSanXuatByDate_(e));
    }

    if (action === "getMeTronDaXacNhanToday") {
      return jsonResponse_(getMeTronDaXacNhanToday_(e));
    }

    if (action === "getMeTronDaXacNhanByDate") {
      return jsonResponse_(getMeTronDaXacNhanByDate_(e));
    }

    if (action === "getChiTietLapViByDateRange") {
      return jsonResponse_(getChiTietLapViByDateRange_(e));
    }

    if (action === "getChiTietSanXuatBanThanhPhamRecentMonth") {
      return jsonResponse_(getChiTietSanXuatBanThanhPhamRecentMonth_(e));
    }

    return jsonResponse_({
      success: false,
      message: "Action không hợp lệ: " + action + ". Dùng action=getAccounts, getAllData, getChiTietCanBatchRecentDays hoặc getChiTietTronLieuSanXuatRecentDays."
    });

  } catch (err) {
    return jsonResponse_({
      success: false,
      message: err && err.message ? err.message : String(err),
      serverTime: nowText_()
    });
  }
}

function getAccountsApi_() {
  const cache = CacheService.getScriptCache();

  // Đổi v2 để tránh dùng cache cũ đang trả passWord dạng number
  const cacheKey = "CSharpAPI_Accounts_v2";

  const cached = cache.get(cacheKey);
  if (cached) {
    const obj = JSON.parse(cached);
    obj.fromCache = true;
    obj.serverTime = nowText_();
    return obj;
  }

  let accounts = readSheetObjects_(SHEETS.ACCOUNT);

  accounts = accounts.map(function(acc) {
    return {
      useName: String(acc.useName || "").trim(),
      passWord: String(acc.passWord || "").trim(),
      role: String(acc.role || "").trim(),
      department: String(acc.department || "").trim()
    };
  });

  const result = {
    success: true,
    action: "getAccounts",
    fromCache: false,
    serverTime: nowText_(),
    count: accounts.length,
    data: accounts
  };

  const json = JSON.stringify(result);

  if (json.length < 90000) {
    cache.put(cacheKey, json, CACHE_SECONDS_ACCOUNT);
  }

  return result;
}

function getAllDataApi_() {
  const startedAt = new Date();

  const account = readSheetObjects_(SHEETS.ACCOUNT).map(function(acc) {
    return {
      useName: String(acc.useName || "").trim(),
      passWord: String(acc.passWord || "").trim(),
      role: String(acc.role || "").trim(),
      department: String(acc.department || "").trim()
    };
  });

  const phieuXuatNguyenLieu = readSheetObjects_(SHEETS.PHIEU_XUAT_NGUYEN_LIEU);
  const baiTronLieu = readSheetObjects_(SHEETS.BAI_TRON_LIEU).map(function(row) {
    row.loaiNguyenLieu = String(row.loaiNguyenLieu || "Thường").trim();
    return row;
  });
  //const nguyenLieu = readSheetObjects_(SHEETS.NGUYEN_LIEU);
  const keHoachSanXuat = readSheetObjects_(SHEETS.KE_HOACH_SAN_XUAT);
  const khoNguyenLieu = readSheetObjects_(SHEETS.KHO_NGUYEN_LIEU);
  const donHangNhapKho = readSheetObjects_(SHEETS.DON_HANG_NHAP_KHO);

  const ketQuaLapVi =
    readSheetObjects_(
      SHEETS.KET_QUA_LAP_VI
    );
  
  const chiTietBTPtheoThung =
    readSheetObjects_(
      SHEETS.CHI_TIET_BTP_THEO_THUNG
    );

  const keHoachLapViVTBC =
    readSheetObjects_(
      SHEETS.KE_HOACH_LAP_VI_VTBC
    );
    
  const finishedAt = new Date();

  return {
    success: true,
    action: "getAllData",
    serverTime: nowText_(),
    elapsedMs: finishedAt.getTime() - startedAt.getTime(),
    counts: {
      Account: account.length,
      PhieuXuatNguyenLieu: phieuXuatNguyenLieu.length,
      BaiTronLieu: baiTronLieu.length,
      //NguyenLieu: nguyenLieu.length,
      KeHoachSanXuat: keHoachSanXuat.length,
      KhoNguyenLieu: khoNguyenLieu.length,
      DonHangNhapKho: donHangNhapKho.length,
      KetQuaLapVi: ketQuaLapVi.length,
      ChiTietBTPtheoThung: chiTietBTPtheoThung.length,
      KeHoachLapViVTBC: keHoachLapViVTBC.length
    },
    data: {
      Account: account,
      PhieuXuatNguyenLieu: phieuXuatNguyenLieu,
      BaiTronLieu: baiTronLieu,
      //NguyenLieu: nguyenLieu,
      KeHoachSanXuat: keHoachSanXuat,
      KhoNguyenLieu: khoNguyenLieu,
      DonHangNhapKho: donHangNhapKho,
      KetQuaLapVi: ketQuaLapVi,
      ChiTietBTPtheoThung: chiTietBTPtheoThung,
      KeHoachLapViVTBC: keHoachLapViVTBC
    }
  };
}

function getKeHoachLapViVTBCApi_() {
  const startedAt = new Date();

  const data = readSheetObjects_(
    SHEETS.KE_HOACH_LAP_VI_VTBC
  );

  /*
  * Sắp xếp kế hoạch mới nhất lên đầu.
  * Vì ngày giờ đã ở dạng yyyy-MM-dd HH:mm:ss
  * nên có thể so sánh chuỗi trực tiếp.
  */
  data.sort(function(a, b) {
    return String(b.thoiGianTao || "")
      .localeCompare(String(a.thoiGianTao || ""));
  });

  const finishedAt = new Date();

  return {
    success: true,
    action: "getKeHoachLapViVTBC",
    serverTime: nowText_(),
    elapsedMs: finishedAt.getTime() - startedAt.getTime(),
    count: data.length,
    data: data
  };
}

function readSheetObjects_(sheetConfig) {
  const sheet = getSheet_(sheetConfig.name);

  ensureRequiredHeaders_(sheet, sheetConfig.requiredHeaders);

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 1 || lastCol < 1) {
    return [];
  }

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  if (values.length < 2) {
    validateHeaders_(sheetConfig.name, values[0] || [], sheetConfig.requiredHeaders);
    return [];
  }

  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  validateHeaders_(sheetConfig.name, headers, sheetConfig.requiredHeaders);

  const headerIndex = {};
  headers.forEach(function(header, index) {
    if (header) {
      headerIndex[header] = index;
    }
  });

  const result = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];

    if (isEmptyDataRow_(row, headerIndex, sheetConfig.keyFields)) {
      continue;
    }

    const obj = {};

    sheetConfig.requiredHeaders.forEach(function(header) {
      const colIndex = headerIndex[header];
      const rawValue = colIndex === undefined ? "" : row[colIndex];

      obj[header] = formatCellValue_(rawValue, header);
    });

    result.push(obj);
  }

  return result;
}

function validateHeaders_(sheetName, headers, requiredHeaders) {
  const normalized = headers.map(function(h) {
    return normalizeText_(h);
  });

  const missing = [];

  requiredHeaders.forEach(function(header) {
    if (normalized.indexOf(header) === -1) {
      missing.push(header);
    }
  });

  if (missing.length > 0) {
    throw new Error(
      "Sheet " + sheetName + " thiếu cột: " + missing.join(", ")
    );
  }
}

function ensureRequiredHeaders_(sheet, requiredHeaders) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);

  let headers = sheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map(function(h) {
      return normalizeText_(h);
    });

  const isBlankHeader = headers.every(function(h) {
    return h === "";
  });

  if (isBlankHeader) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return;
  }

  let appendCol = sheet.getLastColumn();

  requiredHeaders.forEach(function(header) {
    if (headers.indexOf(header) === -1) {
      appendCol++;
      sheet.getRange(1, appendCol).setValue(header);
      headers.push(header);
    }
  });
}

function isEmptyDataRow_(row, headerIndex, keyFields) {
  if (!keyFields || keyFields.length === 0) {
    return row.every(function(cell) {
      return normalizeText_(cell) === "";
    });
  }

  const hasAnyKey = keyFields.some(function(field) {
    const idx = headerIndex[field];
    if (idx === undefined) return false;
    return normalizeText_(row[idx]) !== "";
  });

  return !hasAnyKey;
}

function formatCellValue_(value, header) {
  if (value === null || value === undefined) {
    return "";
  }

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    if (DATE_TIME_HEADERS.indexOf(header) !== -1) {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    }

    if (DATE_ONLY_HEADERS.indexOf(header) !== -1) {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }

    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  }

  if (STRING_HEADERS.indexOf(header) !== -1) {
    return String(value || "").trim();
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

function getSheet_(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error("Không tìm thấy sheet: " + sheetName);
  }

  return sheet;
}

function getParam_(e, name) {
  if (!e || !e.parameter) return "";
  return String(e.parameter[name] || "").trim();
}

function normalizeText_(value) {
  return String(value || "").trim();
}

function nowText_() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd HH:mm:ss"
  );
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function testGetAccounts() {
  Logger.log(JSON.stringify(getAccountsApi_(), null, 2));
}

function testGetKeHoachLapViVTBC() {
  const result = getKeHoachLapViVTBCApi_();

  Logger.log(
    JSON.stringify(result, null, 2)
  );
}

function testGetAllData() {
  Logger.log(JSON.stringify(getAllDataApi_(), null, 2));
}

function getChiTietCanBatchRecentDays_(e) {
  const daysText = getParam_(e, "days");
  let days = Number(daysText);

  if (!days || days <= 0) {
    days = 2;
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("ChiTietCanBatch");

  if (!sheet) {
    return {
      success: false,
      message: "Không tìm thấy sheet ChiTietCanBatch."
    };
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return {
      success: true,
      action: "getChiTietCanBatchRecentDays",
      serverTime: nowText_(),
      days: days,
      count: 0,
      data: []
    };
  }

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  const headers = values[0].map(function(h) {
    return String(h || "").trim();
  });

  const idxThoiGianCan = headers.indexOf("thoiGianCan");

  if (idxThoiGianCan === -1) {
    return {
      success: false,
      message: "Sheet ChiTietCanBatch thiếu cột thoiGianCan."
    };
  }

  const now = new Date();

  // 2 ngày gần nhất tính từ 00:00 của ngày hôm qua đến hiện tại
  // Nếu days = 2 thì gồm hôm nay + hôm qua
  const fromDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - days + 1,
    0,
    0,
    0
  );

  const result = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];

    const rawTime = row[idxThoiGianCan];
    const timeCan = parseDateTime_(rawTime);

    if (!timeCan) {
      continue;
    }

    if (timeCan < fromDate) {
      continue;
    }

    const obj = {};

    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];

      if (!header) continue;

      obj[header] = formatCellValueForBatch_(row[c]);
    }

    result.push(obj);
  }

  return {
    success: true,
    action: "getChiTietCanBatchRecentDays",
    serverTime: nowText_(),
    days: days,
    fromDate: Utilities.formatDate(fromDate, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    count: result.length,
    data: result
  };
}

function parseDateTime_(value) {
  if (!value) return null;

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return value;
  }

  const text = String(value || "").trim();

  if (!text) return null;

  // yyyy-MM-dd HH:mm:ss
  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);

  if (m) {
    return new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4] || 0),
      Number(m[5] || 0),
      Number(m[6] || 0)
    );
  }

  // dd/MM/yyyy HH:mm:ss
  m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);

  if (m) {
    return new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1]),
      Number(m[4] || 0),
      Number(m[5] || 0),
      Number(m[6] || 0)
    );
  }

  const d = new Date(text);

  if (isNaN(d.getTime())) {
    return null;
  }

  return d;
}

function formatCellValueForBatch_(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd HH:mm:ss"
    );
  }

  return value;
}

function getChiTietTronLieuSanXuatRecentDays_(e) {
  const daysText = getParam_(e, "days");
  let days = Number(daysText);

  if (!days || days <= 0) {
    days = 2;
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_CHI_TIET_TRON_LIEU_SAN_XUAT);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CHI_TIET_TRON_LIEU_SAN_XUAT);
    sheet.getRange(1, 1, 1, CHI_TIET_TRON_LIEU_SAN_XUAT_HEADERS.length)
      .setValues([CHI_TIET_TRON_LIEU_SAN_XUAT_HEADERS]);

    return {
      success: true,
      action: "getChiTietTronLieuSanXuatRecentDays",
      serverTime: nowText_(),
      days: days,
      count: 0,
      data: []
    };
  }

  ensureChiTietTronLieuSanXuatHeader_(sheet);

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return {
      success: true,
      action: "getChiTietTronLieuSanXuatRecentDays",
      serverTime: nowText_(),
      days: days,
      count: 0,
      data: []
    };
  }

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  const headers = values[0].map(function(h) {
    return String(h || "").trim();
  });

  const idxThoiGian = headers.indexOf("thoiGianXacNhanTron");

  if (idxThoiGian === -1) {
    return {
      success: false,
      message: "Sheet chiTietTronLieuSanXuat thiếu cột thoiGianXacNhanTron."
    };
  }

  const now = new Date();

  const fromDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - days + 1,
    0,
    0,
    0
  );

  const result = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];

    const rawTime = row[idxThoiGian];
    const timeValue = parseDateTime_(rawTime);

    if (!timeValue) {
      continue;
    }

    if (timeValue < fromDate) {
      continue;
    }

    const obj = {};

    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];

      if (!header) continue;

      obj[header] = formatCellValueForBatch_(row[c]);
    }

    result.push(obj);
  }

  return {
    success: true,
    action: "getChiTietTronLieuSanXuatRecentDays",
    serverTime: nowText_(),
    days: days,
    fromDate: Utilities.formatDate(fromDate, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    count: result.length,
    data: result
  };
}

function ensureChiTietTronLieuSanXuatHeader_(sheet) {
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, CHI_TIET_TRON_LIEU_SAN_XUAT_HEADERS.length)
      .setValues([CHI_TIET_TRON_LIEU_SAN_XUAT_HEADERS]);
    return;
  }

  const lastCol = sheet.getLastColumn();

  let headers = sheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map(function(h) {
      return String(h || "").trim();
    });

  const isBlankHeader = headers.every(function(h) {
    return h === "";
  });

  if (isBlankHeader) {
    sheet.getRange(1, 1, 1, CHI_TIET_TRON_LIEU_SAN_XUAT_HEADERS.length)
      .setValues([CHI_TIET_TRON_LIEU_SAN_XUAT_HEADERS]);
    return;
  }

  const missing = CHI_TIET_TRON_LIEU_SAN_XUAT_HEADERS.filter(function(h) {
    return headers.indexOf(h) === -1;
  });

  if (missing.length > 0) {
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  }
}

function getMeTronDaXacNhanToday_(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_CHI_TIET_TRON_LIEU_SAN_XUAT);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CHI_TIET_TRON_LIEU_SAN_XUAT);
    sheet.getRange(1, 1, 1, CHI_TIET_TRON_LIEU_SAN_XUAT_HEADERS.length)
      .setValues([CHI_TIET_TRON_LIEU_SAN_XUAT_HEADERS]);

    return {
      success: true,
      action: "getMeTronDaXacNhanToday",
      serverTime: nowText_(),
      today: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      count: 0,
      data: []
    };
  }

  ensureChiTietTronLieuSanXuatHeader_(sheet);

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return {
      success: true,
      action: "getMeTronDaXacNhanToday",
      serverTime: nowText_(),
      today: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      count: 0,
      data: []
    };
  }

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  const headers = values[0].map(function(h) {
    return String(h || "").trim();
  });

  const idxIdMeTron = headers.indexOf("IdMeTron");
  const idxKeHoachId = headers.indexOf("KeHoachId");
  const idxThoiGian = headers.indexOf("thoiGianXacNhanTron");

  if (idxIdMeTron === -1 || idxKeHoachId === -1 || idxThoiGian === -1) {
    return {
      success: false,
      message: "Sheet chiTietTronLieuSanXuat cần có đủ cột: IdMeTron, KeHoachId, thoiGianXacNhanTron."
    };
  }

  const today = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );

  const map = {};

  for (let r = 1; r < values.length; r++) {
    const row = values[r];

    const idMeTron = normalizeText_(row[idxIdMeTron]);
    const keHoachId = normalizeText_(row[idxKeHoachId]);
    const rawTime = row[idxThoiGian];
    const timeValue = parseDateTime_(rawTime);

    if (!idMeTron || !keHoachId || !timeValue) {
      continue;
    }

    const rowDate = Utilities.formatDate(
      timeValue,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );

    if (rowDate !== today) {
      continue;
    }

    const key = keHoachId + "||" + idMeTron;

    if (!map[key]) {
      map[key] = {
        KeHoachId: keHoachId,
        IdMeTron: idMeTron,
        thoiGianXacNhanTron: formatCellValueForBatch_(rawTime)
      };
    } else {
      const oldTime = parseDateTime_(map[key].thoiGianXacNhanTron);

      if (!oldTime || timeValue > oldTime) {
        map[key].thoiGianXacNhanTron = formatCellValueForBatch_(rawTime);
      }
    }
  }

  const result = Object.keys(map)
    .map(function(key) {
      return map[key];
    })
    .sort(function(a, b) {
      return String(b.thoiGianXacNhanTron || "")
        .localeCompare(String(a.thoiGianXacNhanTron || ""));
    });

  return {
    success: true,
    action: "getMeTronDaXacNhanToday",
    serverTime: nowText_(),
    today: today,
    count: result.length,
    data: result
  };
}

function getMeTronDaXacNhanByDate_(e) {
  const dateText = getParam_(e, "date");

  if (!dateText) {
    return {
      success: false,
      message: "Thiếu tham số date. Định dạng đúng: yyyy-MM-dd."
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return {
      success: false,
      message: "Tham số date không hợp lệ. Định dạng đúng: yyyy-MM-dd."
    };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_CHI_TIET_TRON_LIEU_SAN_XUAT);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CHI_TIET_TRON_LIEU_SAN_XUAT);
    sheet.getRange(1, 1, 1, CHI_TIET_TRON_LIEU_SAN_XUAT_HEADERS.length)
      .setValues([CHI_TIET_TRON_LIEU_SAN_XUAT_HEADERS]);

    return {
      success: true,
      action: "getMeTronDaXacNhanByDate",
      serverTime: nowText_(),
      date: dateText,
      count: 0,
      data: []
    };
  }

  ensureChiTietTronLieuSanXuatHeader_(sheet);

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return {
      success: true,
      action: "getMeTronDaXacNhanByDate",
      serverTime: nowText_(),
      date: dateText,
      count: 0,
      data: []
    };
  }

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  const headers = values[0].map(function(h) {
    return String(h || "").trim();
  });

  const idxIdMeTron = headers.indexOf("IdMeTron");
  const idxKeHoachId = headers.indexOf("KeHoachId");
  const idxThoiGian = headers.indexOf("thoiGianXacNhanTron");

  if (idxIdMeTron === -1 || idxKeHoachId === -1 || idxThoiGian === -1) {
    return {
      success: false,
      message: "Sheet chiTietTronLieuSanXuat cần có đủ cột: IdMeTron, KeHoachId, thoiGianXacNhanTron."
    };
  }

  const map = {};

  for (let r = 1; r < values.length; r++) {
    const row = values[r];

    const idMeTron = normalizeText_(row[idxIdMeTron]);
    const keHoachId = normalizeText_(row[idxKeHoachId]);
    const rawTime = row[idxThoiGian];
    const timeValue = parseDateTime_(rawTime);

    if (!idMeTron || !keHoachId || !timeValue) {
      continue;
    }

    const rowDate = Utilities.formatDate(
      timeValue,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );

    if (rowDate !== dateText) {
      continue;
    }

    const key = keHoachId + "||" + idMeTron;

    if (!map[key]) {
      map[key] = {
        KeHoachId: keHoachId,
        IdMeTron: idMeTron,
        thoiGianXacNhanTron: formatCellValueForBatch_(rawTime)
      };
    } else {
      const oldTime = parseDateTime_(map[key].thoiGianXacNhanTron);

      if (!oldTime || timeValue > oldTime) {
        map[key].thoiGianXacNhanTron = formatCellValueForBatch_(rawTime);
      }
    }
  }

  const result = Object.keys(map)
    .map(function(key) {
      return map[key];
    })
    .sort(function(a, b) {
      return String(b.thoiGianXacNhanTron || "")
        .localeCompare(String(a.thoiGianXacNhanTron || ""));
    });

  return {
    success: true,
    action: "getMeTronDaXacNhanByDate",
    serverTime: nowText_(),
    date: dateText,
    count: result.length,
    data: result
  };
}

function getChiTietTronLieuSanXuatByDate_(e) {
  const dateText = getParam_(e, "date");

  if (!dateText) {
    return {
      success: false,
      message: "Thiếu tham số date. Định dạng đúng: yyyy-MM-dd."
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return {
      success: false,
      message: "Tham số date không hợp lệ. Định dạng đúng: yyyy-MM-dd."
    };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_CHI_TIET_TRON_LIEU_SAN_XUAT);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CHI_TIET_TRON_LIEU_SAN_XUAT);
    sheet.getRange(1, 1, 1, CHI_TIET_TRON_LIEU_SAN_XUAT_HEADERS.length)
      .setValues([CHI_TIET_TRON_LIEU_SAN_XUAT_HEADERS]);

    return {
      success: true,
      action: "getChiTietTronLieuSanXuatByDate",
      serverTime: nowText_(),
      date: dateText,
      count: 0,
      data: []
    };
  }

  ensureChiTietTronLieuSanXuatHeader_(sheet);

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return {
      success: true,
      action: "getChiTietTronLieuSanXuatByDate",
      serverTime: nowText_(),
      date: dateText,
      count: 0,
      data: []
    };
  }

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  const headers = values[0].map(function(h) {
    return String(h || "").trim();
  });

  const idxThoiGian = headers.indexOf("thoiGianXacNhanTron");

  if (idxThoiGian === -1) {
    return {
      success: false,
      message: "Sheet chiTietTronLieuSanXuat thiếu cột thoiGianXacNhanTron."
    };
  }

  const result = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];

    const rawTime = row[idxThoiGian];
    const timeValue = parseDateTime_(rawTime);

    if (!timeValue) {
      continue;
    }

    const rowDate = Utilities.formatDate(
      timeValue,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );

    if (rowDate !== dateText) {
      continue;
    }

    const obj = {};

    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];

      if (!header) continue;

      obj[header] = formatCellValueForBatch_(row[c]);
    }

    result.push(obj);
  }

  return {
    success: true,
    action: "getChiTietTronLieuSanXuatByDate",
    serverTime: nowText_(),
    date: dateText,
    count: result.length,
    data: result
  };
}

function getChiTietLapViByDateRange_(e) {
  const dateText = getParam_(e, "date");
  const daysBeforeText = getParam_(e, "daysBefore");

  if (!dateText) {
    return {
      success: false,
      message: "Thiếu tham số date. Định dạng đúng: yyyy-MM-dd."
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return {
      success: false,
      message: "Tham số date không hợp lệ. Định dạng đúng: yyyy-MM-dd."
    };
  }

  let daysBefore = Number(daysBeforeText);

  if (!isFinite(daysBefore) || daysBefore < 0) {
    daysBefore = 0;
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_CHI_TIET_LAP_VI);

  if (!sheet) {
    return {
      success: false,
      message: "Không tìm thấy sheet " + SHEET_CHI_TIET_LAP_VI + "."
    };
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return {
      success: true,
      action: "getChiTietLapViByDateRange",
      serverTime: nowText_(),
      date: dateText,
      daysBefore: daysBefore,
      fromDate: dateText,
      toDate: dateText,
      count: 0,
      headers: [],
      data: []
    };
  }

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  let headers = values[0].map(function(h) {
    return String(h || "").trim();
  });

  const idxThoiGianTao = headers.indexOf("thoiGianTao");

  if (idxThoiGianTao === -1) {
    return {
      success: false,
      message: "Sheet chiTietLapVi thiếu cột thoiGianTao."
    };
  }

  const selectedDate = parseDateOnly_(dateText);

  if (!selectedDate) {
    return {
      success: false,
      message: "Không đọc được ngày chọn: " + dateText
    };
  }

  const fromDate = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate() - daysBefore,
    0,
    0,
    0
  );

  const toDate = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    23,
    59,
    59
  );

  // Đưa các cột quan trọng lên đầu.
  const firstHeaders = ["maThanPham", "soLuongVi", "thoiGianTao"];
  const orderedHeaders = [];

  firstHeaders.forEach(function(h) {
    if (headers.indexOf(h) !== -1 && orderedHeaders.indexOf(h) === -1) {
      orderedHeaders.push(h);
    }
  });

  headers.forEach(function(h) {
    if (h && orderedHeaders.indexOf(h) === -1) {
      orderedHeaders.push(h);
    }
  });

  const headerIndex = {};

  headers.forEach(function(h, index) {
    if (h) {
      headerIndex[h] = index;
    }
  });

  const result = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];

    const rawTime = row[idxThoiGianTao];
    const timeValue = parseDateTime_(rawTime);

    if (!timeValue) {
      continue;
    }

    if (timeValue < fromDate || timeValue > toDate) {
      continue;
    }

    const obj = {};

    orderedHeaders.forEach(function(header) {
      const colIndex = headerIndex[header];

      if (colIndex === undefined) {
        obj[header] = "";
      } else {
        obj[header] = formatCellValueForBatch_(row[colIndex]);
      }
    });

    result.push(obj);
  }

  result.sort(function(a, b) {
    return String(b.thoiGianTao || "").localeCompare(String(a.thoiGianTao || ""));
  });

  return {
    success: true,
    action: "getChiTietLapViByDateRange",
    serverTime: nowText_(),
    date: dateText,
    daysBefore: daysBefore,
    fromDate: Utilities.formatDate(fromDate, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    toDate: Utilities.formatDate(toDate, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    count: result.length,
    headers: orderedHeaders,
    data: result
  };
}

function parseDateOnly_(dateText) {
  const text = String(dateText || "").trim();

  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!m) {
    return null;
  }

  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    0,
    0,
    0
  );
}

function getChiTietSanXuatBanThanhPhamRecentMonth_(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_CHI_TIET_SAN_XUAT_BAN_THANH_PHAM);

  if (!sheet) {
    return {
      success: false,
      message: "Không tìm thấy sheet " + SHEET_CHI_TIET_SAN_XUAT_BAN_THANH_PHAM + "."
    };
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return {
      success: true,
      action: "getChiTietSanXuatBanThanhPhamRecentMonth",
      serverTime: nowText_(),
      fromDate: "",
      toDate: "",
      count: 0,
      headers: [],
      data: []
    };
  }

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  const headers = values[0].map(function(h) {
    return String(h || "").trim();
  });

  const idxThoiGianHoanThanh = headers.indexOf("thoiGianHoanThanh");

  if (idxThoiGianHoanThanh === -1) {
    return {
      success: false,
      message: "Sheet ChiTietSanXuatBanThanhPham thiếu cột thoiGianHoanThanh."
    };
  }

  const today = new Date();

  const fromDate = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    today.getDate(),
    0,
    0,
    0
  );

  const toDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59
  );

  const orderedHeaders = orderChiTietSanXuatBanThanhPhamHeaders_(headers);

  const headerIndex = {};

  headers.forEach(function(header, index) {
    if (header) {
      headerIndex[header] = index;
    }
  });

  const result = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];

    const rawTime = row[idxThoiGianHoanThanh];
    const timeValue = parseDateTime_(rawTime);

    if (!timeValue) {
      continue;
    }

    if (timeValue < fromDate || timeValue > toDate) {
      continue;
    }

    const obj = {};

    orderedHeaders.forEach(function(header) {
      const colIndex = headerIndex[header];

      if (colIndex === undefined) {
        obj[header] = "";
      } else {
        obj[header] = formatCellValueForBatch_(row[colIndex]);
      }
    });

    result.push(obj);
  }

  result.sort(function(a, b) {
    return String(b.thoiGianHoanThanh || "").localeCompare(String(a.thoiGianHoanThanh || ""));
  });

  return {
    success: true,
    action: "getChiTietSanXuatBanThanhPhamRecentMonth",
    serverTime: nowText_(),
    fromDate: Utilities.formatDate(fromDate, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    toDate: Utilities.formatDate(toDate, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    count: result.length,
    headers: orderedHeaders,
    data: result
  };
}

function orderChiTietSanXuatBanThanhPhamHeaders_(headers) {
  headers = headers || [];

  const priority = [
    "IdBanThanhPham",
    "tenBaiLieu",
    "soLuongVien",
    "thoiGianXacNhanTron",
    "thoiGianHoanThanh",
    "IdMeTron",
    "maThanPham",
    "nguoiThucHienSanXuat"
  ];

  const result = [];

  priority.forEach(function(header) {
    if (headers.indexOf(header) !== -1 && result.indexOf(header) === -1) {
      result.push(header);
    }
  });

  headers.forEach(function(header) {
    if (header && result.indexOf(header) === -1) {
      result.push(header);
    }
  });

  return result;
}

