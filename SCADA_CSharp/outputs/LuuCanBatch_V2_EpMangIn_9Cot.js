const SPREADSHEET_ID = "1yFlCpC6JzLRmv9hukNw05vYpeYmkhXRcPC-0nCNOjAQ";
const API_TOKEN = "CONFIGURE_API_TOKEN";

const CACHE_SECONDS_ACCOUNT = 300;

const SHEET_CHI_TIET_CAN_BATCH = "ChiTietCanBatch";

const CHI_TIET_CAN_BATCH_HEADERS = [
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

const SHEET_CHI_TIET_TRON_LIEU_SAN_XUAT = "chiTietTronLieuSanXuat";
const SHEET_CHI_TIET_SAN_XUAT_BAN_THANH_PHAM = "ChiTietSanXuatBanThanhPham";

const SHEET_CHI_TIET_BTP_THEO_THUNG = "ChiTietBTPtheoThung";

const CHI_TIET_BTP_THEO_THUNG_HEADERS = [
  "IdBanThanhPham",
  "ngaySanXuat",
  "IdThungBanThanhPham",
  "sttThung",
  "khoiLuongThung"
];

/* =========================================================
   ÉP MÀNG IN
   ========================================================= */

const SHEET_EP_MANG_IN = "EpMangIn";

const EP_MANG_IN_HEADERS = [
  "IdThungDungVi",
  "noiDungDongTren",
  "noiDungDongDuoi",
  "thoiGianLuu",
  "nguoiLuu",
  "nhietDoTamTren",
  "nhietDoTamDuoi",
  "giaNhietGio",
  "TocDoCat"
];

/* =========================================================
   ĐÓNG THÙNG
   ========================================================= */

const SHEET_DONG_THUNG = "DongThung";

const DONG_THUNG_HEADERS = [
  "noiDungNSXTrenVi",
  "noiDungDongTren",
  "noiDungDongDuoi",
  "thoiGianLuu",
  "nguoiLuu",
  "ngayInDateVi"
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
  CHI_TIET_TRON_LIEU_SAN_XUAT_EXTRA_HEADERS.concat(CHI_TIET_CAN_BATCH_HEADERS);

const CHI_TIET_SAN_XUAT_BAN_THANH_PHAM_EXTRA_HEADERS = [
  "tocDoTrungBinhMayTronNgang",
  "tocDoTrungBinhMayTronDung",
  "nhietDoTrungBinhMayDun1",
  "tocDoTrungBinhMayDun1",
  "nhietDoTrungBinhMayDun2",
  "tocDoTrungBinhMayDun2",
  "soLuongVien",
  "tongKhoiLuongMe",
  "thoiGianHoanThanh",
  "nguoiThucHienSanXuat",
  "IdBanThanhPham"
];

const CHI_TIET_SAN_XUAT_BAN_THANH_PHAM_HEADERS =
  CHI_TIET_TRON_LIEU_SAN_XUAT_HEADERS.concat(CHI_TIET_SAN_XUAT_BAN_THANH_PHAM_EXTRA_HEADERS);

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
      "IdKhoDaTru"
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
      "canSuDung"
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
      "ngayTao"
    ],
    keyFields: ["Id"]
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
  "thoiGianCan"
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
  "IdKho",
  "quyCachDongGoi",
  "LotNo",
  "nhaCungCap",
  "nguoiTao",
  "trangThaiPheDuyet",
  "cachXuat",
  "nguoiPheDuyet",
  "IdKhoDaTru",
  "IdTuKhoDenBatch",
  "trangThai",
  "nguoiPheDuyetChatLuong",
  "DonHangId",
  "IdBatch",
  "SttBatchNL",
  "nguoiCan",
  "saiSo"
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

    if (action === "getScadaEpMangInPlans") {
      return jsonResponse_(getScadaEpMangInPlans_(getParam_(e, "days")));
    }

    if (action === "getAccounts") {
      return jsonResponse_(getAccountsApi_());
    }

    if (action === "getAllData") {
      return jsonResponse_(getAllDataApi_());
    }

    return jsonResponse_({
      success: false,
      message: "Action không hợp lệ. Dùng action=getAccounts hoặc action=getAllData."
    });

  } catch (err) {
    return jsonResponse_({
      success: false,
      message: err && err.message ? err.message : String(err),
      serverTime: nowText_()
    });
  }
}

function doPost(e) {
  try {
    const action = getParam_(e, "action");
    const token = getParam_(e, "token");

    if (token !== API_TOKEN) {
      return jsonResponse_({
        success: false,
        message: "Token không hợp lệ."
      });
    }

    const bodyText = e && e.postData && e.postData.contents
      ? e.postData.contents
      : "{}";

    const body = JSON.parse(bodyText);

    if (action === "saveChiTietCanBatch") {
      return jsonResponse_(saveChiTietCanBatch_(body));
    }

    if (action === "saveChiTietTronLieuSanXuat") {
      return jsonResponse_(saveChiTietTronLieuSanXuat_(body));
    }

    if (action === "saveChiTietSanXuatBanThanhPham") {
      return jsonResponse_(saveChiTietSanXuatBanThanhPham_(body));
    }

    if (action === "saveChiTietBTPtheoThung") {
      return jsonResponse_(saveChiTietBTPtheoThung_(body));
    }

    if (action === "updateViStockLocations") return jsonResponse_(epViSaveLocations_(body));

    if (['epPlanPing','mutateEpMangInPlan','exportEpMangInPlan','reportEpMangInPlan'].indexOf(action) !== -1) return jsonResponse_(epApiAction_(action,body));

    if (action === "saveEpMangIn") {
      return jsonResponse_(saveEpMangIn_(body));
    }

    if (action === "saveDongThung") {
      return jsonResponse_(saveDongThung_(body));
    }

    return jsonResponse_({
      success: false,
      message: "Action POST không hợp lệ: " + action
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
  const baiTronLieu = readSheetObjects_(SHEETS.BAI_TRON_LIEU);
  const nguyenLieu = readSheetObjects_(SHEETS.NGUYEN_LIEU);
  const keHoachSanXuat = readSheetObjects_(SHEETS.KE_HOACH_SAN_XUAT);
  const khoNguyenLieu = readSheetObjects_(SHEETS.KHO_NGUYEN_LIEU);
  const donHangNhapKho = readSheetObjects_(SHEETS.DON_HANG_NHAP_KHO);

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
      NguyenLieu: nguyenLieu.length,
      KeHoachSanXuat: keHoachSanXuat.length,
      KhoNguyenLieu: khoNguyenLieu.length,
      DonHangNhapKho: donHangNhapKho.length
    },
    data: {
      Account: account,
      PhieuXuatNguyenLieu: phieuXuatNguyenLieu,
      BaiTronLieu: baiTronLieu,
      NguyenLieu: nguyenLieu,
      KeHoachSanXuat: keHoachSanXuat,
      KhoNguyenLieu: khoNguyenLieu,
      DonHangNhapKho: donHangNhapKho
    }
  };
}

function saveChiTietCanBatch_(body) {
  const rows = body && body.rows ? body.rows : [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      success: false,
      message: "Không có dữ liệu ChiTietCanBatch để lưu."
    };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_CHI_TIET_CAN_BATCH);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CHI_TIET_CAN_BATCH);
  }

  ensureChiTietCanBatchHeader_(sheet);

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function(h) {
      return String(h || "").trim();
    });

  const values = rows.map(function(row) {
    return headers.map(function(header) {
      const value = row[header];

      if (value === null || value === undefined) {
        return "";
      }

      return value;
    });
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, values.length, headers.length).setValues(values);

    return {
      success: true,
      action: "saveChiTietCanBatch",
      serverTime: nowText_(),
      insertedRows: values.length,
      sheetName: SHEET_CHI_TIET_CAN_BATCH
    };

  } finally {
    lock.releaseLock();
  }
}

function ensureChiTietCanBatchHeader_(sheet) {
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, CHI_TIET_CAN_BATCH_HEADERS.length)
      .setValues([CHI_TIET_CAN_BATCH_HEADERS]);
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
    sheet.getRange(1, 1, 1, CHI_TIET_CAN_BATCH_HEADERS.length)
      .setValues([CHI_TIET_CAN_BATCH_HEADERS]);
    return;
  }

  const missing = CHI_TIET_CAN_BATCH_HEADERS.filter(function(h) {
    return headers.indexOf(h) === -1;
  });

  if (missing.length > 0) {
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  }
}

function readSheetObjects_(sheetConfig) {
  const sheet = getSheet_(sheetConfig.name);

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

function testGetAllData() {
  Logger.log(JSON.stringify(getAllDataApi_(), null, 2));
}

function testSaveChiTietCanBatch() {
  const body = {
    rows: [
      {
        PhieuXuatId: "PX_TEST",
        KeHoachId: "KH_TEST",
        tenBaiLieu: "Bài test",
        soLuong: "1",
        NgaySanXuat: "2026-05-14",
        STT: "1",
        maNguyenLieu: "NL_TEST",
        tenNguyenLieu: "Nguyên liệu test",
        khoiLuongCanXuat: "1",
        donViCanXuat: "kg",
        sttTron: "1",
        canSuDung: "Cân bàn",
        IdKho: "KHO_TEST",
        khoiLuongKho: "1",
        donViKho: "kg",
        quyCachDongGoi: "",
        LotNo: "",
        ngaySanXuatKho: "",
        hanSuDung: "",
        nhaCungCap: "",
        ngayNhap: "",
        nguoiTao: "",
        ngayTao: "",
        trangThaiPheDuyet: "Đã phê duyệt",
        cachXuat: "",
        nguoiPheDuyet: "",
        thoiGianDuyet: "",
        IdKhoDaTru: "KHO_TEST",
        IdTuKhoDenBatch: "KHO_TEST",
        KhoiLuong: "1",
        SttBatchNL: "1",
        IdBatch: "B20260514153045123",
        khoiLuongThucTe: "1.01",
        saiSo: "1%",
        nguoiCan: "test",
        thoiGianCan: nowText_()
      }
    ]
  };

  Logger.log(JSON.stringify(saveChiTietCanBatch_(body), null, 2));
}

function saveChiTietTronLieuSanXuat_(body) {
  const rows = body && body.rows ? body.rows : [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      success: false,
      message: "Không có dữ liệu chiTietTronLieuSanXuat để lưu."
    };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_CHI_TIET_TRON_LIEU_SAN_XUAT);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CHI_TIET_TRON_LIEU_SAN_XUAT);
  }

  ensureChiTietTronLieuSanXuatHeader_(sheet);

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function(h) {
      return String(h || "").trim();
    });

  const values = rows.map(function(row) {
    return headers.map(function(header) {
      const value = row[header];

      if (value === null || value === undefined) {
        return "";
      }

      return value;
    });
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, values.length, headers.length).setValues(values);

    return {
      success: true,
      action: "saveChiTietTronLieuSanXuat",
      serverTime: nowText_(),
      insertedRows: values.length,
      sheetName: SHEET_CHI_TIET_TRON_LIEU_SAN_XUAT
    };

  } finally {
    lock.releaseLock();
  }
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

function saveChiTietSanXuatBanThanhPham_(body) {
  const rows = body && body.rows ? body.rows : [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      success: false,
      message: "Không có dữ liệu ChiTietSanXuatBanThanhPham để lưu."
    };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_CHI_TIET_SAN_XUAT_BAN_THANH_PHAM);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CHI_TIET_SAN_XUAT_BAN_THANH_PHAM);
  }

  ensureChiTietSanXuatBanThanhPhamHeader_(sheet);

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function(h) {
      return String(h || "").trim();
    });

  const idxIdMeTron = headers.indexOf("IdMeTron");
  if (idxIdMeTron !== -1 && sheet.getLastRow() >= 2) {
    const firstIdMeTron = rows[0] && rows[0].IdMeTron
      ? String(rows[0].IdMeTron).trim()
      : "";

    if (firstIdMeTron) {
      const oldValues = sheet
        .getRange(2, 1, sheet.getLastRow() - 1, headers.length)
        .getValues();

      for (let i = 0; i < oldValues.length; i++) {
        const oldIdMeTron = String(oldValues[i][idxIdMeTron] || "").trim();

        if (oldIdMeTron === firstIdMeTron) {
          return {
            success: false,
            message: "Mẻ trộn này đã được xác nhận hoàn thành bán thành phẩm, không lưu trùng: " + firstIdMeTron
          };
        }
      }
    }
  }

  const values = rows.map(function(row) {
    return headers.map(function(header) {
      const value = row[header];

      if (value === null || value === undefined) {
        return "";
      }

      return value;
    });
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, values.length, headers.length).setValues(values);

    return {
      success: true,
      action: "saveChiTietSanXuatBanThanhPham",
      serverTime: nowText_(),
      insertedRows: values.length,
      sheetName: SHEET_CHI_TIET_SAN_XUAT_BAN_THANH_PHAM
    };

  } finally {
    lock.releaseLock();
  }
}

function ensureChiTietSanXuatBanThanhPhamHeader_(sheet) {
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, CHI_TIET_SAN_XUAT_BAN_THANH_PHAM_HEADERS.length)
      .setValues([CHI_TIET_SAN_XUAT_BAN_THANH_PHAM_HEADERS]);
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
    sheet.getRange(1, 1, 1, CHI_TIET_SAN_XUAT_BAN_THANH_PHAM_HEADERS.length)
      .setValues([CHI_TIET_SAN_XUAT_BAN_THANH_PHAM_HEADERS]);
    return;
  }

  const missing = CHI_TIET_SAN_XUAT_BAN_THANH_PHAM_HEADERS.filter(function(h) {
    return headers.indexOf(h) === -1;
  });

  if (missing.length > 0) {
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  }
}

/* =========================================================
   CHI TIẾT BÁN THÀNH PHẨM THEO THÙNG
   Sheet: ChiTietBTPtheoThung
   Header:
   IdBanThanhPham | IdThungBanThanhPham | sttThung | khoiLuongThung
   ========================================================= */

function ensureChiTietBTPtheoThungHeader_(sheet) {
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, CHI_TIET_BTP_THEO_THUNG_HEADERS.length)
      .setValues([CHI_TIET_BTP_THEO_THUNG_HEADERS]);
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
    sheet.getRange(1, 1, 1, CHI_TIET_BTP_THEO_THUNG_HEADERS.length)
      .setValues([CHI_TIET_BTP_THEO_THUNG_HEADERS]);
    return;
  }

  const missing = CHI_TIET_BTP_THEO_THUNG_HEADERS.filter(function(h) {
    return headers.indexOf(h) === -1;
  });

  if (missing.length > 0) {
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  }
}

function saveChiTietBTPtheoThung_(body) {
  const rows = body && body.rows ? body.rows : [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      success: false,
      message: "Không có dữ liệu ChiTietBTPtheoThung để lưu."
    };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_CHI_TIET_BTP_THEO_THUNG);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CHI_TIET_BTP_THEO_THUNG);
  }

  ensureChiTietBTPtheoThungHeader_(sheet);

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function(h) {
      return String(h || "").trim();
    });

  const validRows = [];

  rows.forEach(function(row, index) {
    const IdBanThanhPham = String(row.IdBanThanhPham || "").trim();
    const ngaySanXuat = String(row.ngaySanXuat || "").trim();
    const IdThungBanThanhPham = String(row.IdThungBanThanhPham || "").trim();
    const sttThung = row.sttThung;
    const khoiLuongThung = row.khoiLuongThung;

    if (!IdBanThanhPham) {
      throw new Error("Dòng " + (index + 1) + " thiếu IdBanThanhPham.");
    }

    if (!ngaySanXuat) {
      throw new Error("Dòng " + (index + 1) + " thiếu ngaySanXuat.");
    }

    if (!IdThungBanThanhPham) {
      throw new Error("Dòng " + (index + 1) + " thiếu IdThungBanThanhPham.");
    }

    if (sttThung === null || sttThung === undefined || String(sttThung).trim() === "") {
      throw new Error("Dòng " + (index + 1) + " thiếu sttThung.");
    }

    if (khoiLuongThung === null || khoiLuongThung === undefined || String(khoiLuongThung).trim() === "") {
      throw new Error("Dòng " + (index + 1) + " thiếu khoiLuongThung.");
    }

    const khoiLuongNumber = Number(String(khoiLuongThung).replace(",", "."));

    if (!isFinite(khoiLuongNumber) || khoiLuongNumber <= 0) {
      throw new Error("Dòng " + (index + 1) + " có khoiLuongThung không hợp lệ.");
    }

    validRows.push(row);
  });

  // Chặn lưu trùng IdThungBanThanhPham
  const idxIdThung = headers.indexOf("IdThungBanThanhPham");

  if (idxIdThung !== -1 && sheet.getLastRow() >= 2) {
    const oldValues = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, headers.length)
      .getValues();

    const oldMap = {};

    oldValues.forEach(function(oldRow) {
      const oldIdThung = String(oldRow[idxIdThung] || "").trim();
      if (oldIdThung) {
        oldMap[oldIdThung] = true;
      }
    });

    validRows.forEach(function(row) {
      const idThung = String(row.IdThungBanThanhPham || "").trim();

      if (oldMap[idThung]) {
        throw new Error("IdThungBanThanhPham đã tồn tại, không lưu trùng: " + idThung);
      }
    });
  }

  const newMap = {};

  validRows.forEach(function(row) {
    const idThung = String(row.IdThungBanThanhPham || "").trim();

    if (newMap[idThung]) {
      throw new Error("Trong dữ liệu gửi lên có IdThungBanThanhPham bị trùng: " + idThung);
    }

    newMap[idThung] = true;
  });

  const values = validRows.map(function(row) {
    return headers.map(function(header) {
      const value = row[header];

      if (value === null || value === undefined) {
        return "";
      }

      if (header === "khoiLuongThung") {
        const n = Number(String(value).replace(",", "."));
        return isFinite(n) ? n : value;
      }

      if (header === "sttThung") {
        const n = Number(String(value).replace(",", "."));
        return isFinite(n) ? n : value;
      }

      return value;
    });
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const startRow = sheet.getLastRow() + 1;

    sheet
      .getRange(startRow, 1, values.length, headers.length)
      .setValues(values);

    return {
      success: true,
      action: "saveChiTietBTPtheoThung",
      serverTime: nowText_(),
      insertedRows: values.length,
      sheetName: SHEET_CHI_TIET_BTP_THEO_THUNG
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Đảm bảo sheet có đầy đủ header theo đúng danh sách truyền vào.
 *
 * Nếu sheet đang trống:
 * - Ghi toàn bộ header.
 *
 * Nếu sheet đã có dữ liệu:
 * - Giữ nguyên các cột hiện tại.
 * - Bổ sung các header còn thiếu vào cuối sheet.
 */
function ensureApiSheetHeaders_(sheet, expectedHeaders) {
  if (
    sheet.getLastRow() === 0 ||
    sheet.getLastColumn() === 0
  ) {
    sheet
      .getRange(
        1,
        1,
        1,
        expectedHeaders.length
      )
      .setValues([
        expectedHeaders
      ]);

    return;
  }

  const lastColumn =
    sheet.getLastColumn();

  const currentHeaders =
    sheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0]
      .map(function(header) {
        return String(
          header || ""
        ).trim();
      });

  const isBlankHeader =
    currentHeaders.every(function(header) {
      return header === "";
    });

  if (isBlankHeader) {
    sheet
      .getRange(
        1,
        1,
        1,
        expectedHeaders.length
      )
      .setValues([
        expectedHeaders
      ]);

    return;
  }

  const missingHeaders =
    expectedHeaders.filter(function(header) {
      return currentHeaders.indexOf(
        header
      ) === -1;
    });

  if (missingHeaders.length > 0) {
    sheet
      .getRange(
        1,
        lastColumn + 1,
        1,
        missingHeaders.length
      )
      .setValues([
        missingHeaders
      ]);
  }
}

/* =========================================================
   LƯU DỮ LIỆU ÉP MÀNG IN

   Sheet EpMangIn:
   IdThungDungVi
   noiDungDongTren
   noiDungDongDuoi
   thoiGianLuu
   nguoiLuu
   ========================================================= */

function saveEpMangIn_(body) {
  const rows =
    body &&
    Array.isArray(body.rows)
      ? body.rows
      : [];

  if (rows.length === 0) {
    return {
      success: false,
      message:
        "Không có dữ liệu EpMangIn để lưu."
    };
  }

  const ss =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );

  let sheet =
    ss.getSheetByName(
      SHEET_EP_MANG_IN
    );

  if (!sheet) {
    sheet =
      ss.insertSheet(
        SHEET_EP_MANG_IN
      );
  }

  ensureApiSheetHeaders_(
    sheet,
    EP_MANG_IN_HEADERS
  );

  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        sheet.getLastColumn()
      )
      .getValues()[0]
      .map(function(header) {
        return String(
          header || ""
        ).trim();
      });

  const validRows = [];

  rows.forEach(function(row, index) {
    const idThungDungVi =
      String(
        row.IdThungDungVi || ""
      ).trim();

    const noiDungDongTren =
      String(
        row.noiDungDongTren || ""
      ).trim();

    const noiDungDongDuoi =
      String(
        row.noiDungDongDuoi || ""
      ).trim();

    const nguoiLuu =
      String(
        row.nguoiLuu || ""
      ).trim();

    if (!idThungDungVi) {
      throw new Error(
        "Dòng " +
        (index + 1) +
        " thiếu IdThungDungVi."
      );
    }

    if (!noiDungDongTren) {
      throw new Error(
        "Dòng " +
        (index + 1) +
        " thiếu noiDungDongTren."
      );
    }

    if (!noiDungDongDuoi) {
      throw new Error(
        "Dòng " +
        (index + 1) +
        " thiếu noiDungDongDuoi."
      );
    }

    if (!nguoiLuu) {
      throw new Error(
        "Dòng " +
        (index + 1) +
        " thiếu nguoiLuu."
      );
    }

    validRows.push({
      IdThungDungVi:
        idThungDungVi,

      noiDungDongTren:
        noiDungDongTren,

      noiDungDongDuoi:
        noiDungDongDuoi,

      /*
       * Nếu C# không gửi thoiGianLuu,
       * Apps Script tự lấy thời gian hiện tại.
       */
      thoiGianLuu:
        row.thoiGianLuu
          ? String(
              row.thoiGianLuu
            ).trim()
          : nowText_(),

      nguoiLuu:
        nguoiLuu,

      nhietDoTamTren:
        row.nhietDoTamTren == null ? "" : String(row.nhietDoTamTren).trim(),

      nhietDoTamDuoi:
        row.nhietDoTamDuoi == null ? "" : String(row.nhietDoTamDuoi).trim(),

      giaNhietGio:
        row.giaNhietGio == null ? "" : String(row.giaNhietGio).trim(),

      TocDoCat:
        row.TocDoCat == null ? "" : String(row.TocDoCat).trim()
    });
  });

  const values =
    validRows.map(function(row) {
      return headers.map(function(header) {
        const value =
          row[header];

        if (
          value === null ||
          value === undefined
        ) {
          return "";
        }

        return value;
      });
    });

  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    // The worker plan export has already deducted stock. Validate under the
    // same script lock and never export/deduct stock again from the SCADA save.
    scadaEpAssertIssued_(body.IdEpMangIn, body.phienBan, validRows.map(function(row){return row.IdThungDungVi;}));
    const startRow =
      sheet.getLastRow() + 1;

    sheet
      .getRange(
        startRow,
        1,
        values.length,
        headers.length
      )
      .setValues(values);


    return {
      success: true,
      action: "saveEpMangIn",
      message:
        "Đã lưu dữ liệu ép màng in.",
      serverTime:
        nowText_(),
      insertedRows:
        values.length,
      sheetName:
        SHEET_EP_MANG_IN
    };

  } finally {
    lock.releaseLock();
  }
}

/* =========================================================
   LƯU DỮ LIỆU ĐÓNG THÙNG

   Sheet DongThung:
   noiDungNSXTrenVi
   noiDungDongTren
   noiDungDongDuoi
   thoiGianLuu
   nguoiLuu
   ========================================================= */

function saveDongThung_(body) {
  const rows =
    body &&
    Array.isArray(body.rows)
      ? body.rows
      : [];

  if (rows.length === 0) {
    return {
      success: false,
      message:
        "Không có dữ liệu DongThung để lưu."
    };
  }

  const ss =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );

  let sheet =
    ss.getSheetByName(
      SHEET_DONG_THUNG
    );

  if (!sheet) {
    sheet =
      ss.insertSheet(
        SHEET_DONG_THUNG
      );
  }

  ensureApiSheetHeaders_(
    sheet,
    DONG_THUNG_HEADERS
  );

  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        sheet.getLastColumn()
      )
      .getValues()[0]
      .map(function(header) {
        return String(
          header || ""
        ).trim();
      });

  const validRows = [];

  rows.forEach(function(row, index) {
    const noiDungNSXTrenVi =
      String(
        row.noiDungNSXTrenVi || ""
      ).trim();

    const noiDungDongTren =
      String(
        row.noiDungDongTren || ""
      ).trim();

    const noiDungDongDuoi =
      String(
        row.noiDungDongDuoi || ""
      ).trim();

    const nguoiLuu =
      String(
        row.nguoiLuu || ""
      ).trim();

    if (!noiDungNSXTrenVi) {
      throw new Error(
        "Dòng " +
        (index + 1) +
        " thiếu noiDungNSXTrenVi."
      );
    }

    if (!noiDungDongTren) {
      throw new Error(
        "Dòng " +
        (index + 1) +
        " thiếu noiDungDongTren."
      );
    }

    if (!noiDungDongDuoi) {
      throw new Error(
        "Dòng " +
        (index + 1) +
        " thiếu noiDungDongDuoi."
      );
    }

    if (!nguoiLuu) {
      throw new Error(
        "Dòng " +
        (index + 1) +
        " thiếu nguoiLuu."
      );
    }

    validRows.push({
      noiDungNSXTrenVi:
        noiDungNSXTrenVi,

      noiDungDongTren:
        noiDungDongTren,

      noiDungDongDuoi:
        noiDungDongDuoi,

      thoiGianLuu:
        row.thoiGianLuu
          ? String(
              row.thoiGianLuu
            ).trim()
          : nowText_(),

      nguoiLuu:
        nguoiLuu,

      ngayInDateVi:
        row.ngayInDateVi
          ? String(
              row.ngayInDateVi
            ).trim()
          : ""
    });
  });

  const values =
    validRows.map(function(row) {
      return headers.map(function(header) {
        const value =
          row[header];

        if (
          value === null ||
          value === undefined
        ) {
          return "";
        }

        return value;
      });
    });

  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    const startRow =
      sheet.getLastRow() + 1;

    sheet
      .getRange(
        startRow,
        1,
        values.length,
        headers.length
      )
      .setValues(values);

    return {
      success: true,
      action: "saveDongThung",
      message:
        "Đã lưu dữ liệu đóng thùng.",
      serverTime:
        nowText_(),
      insertedRows:
        values.length,
      sheetName:
        SHEET_DONG_THUNG
    };

  } finally {
    lock.releaseLock();
  }
}

function testSaveChiTietBTPtheoThung() {
  const idBtp = "BTP_TEST_" + Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyyMMddHHmmss"
  );

  const ngaySanXuat = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );

  const body = {
    rows: [
      {
        IdBanThanhPham: idBtp,
        ngaySanXuat: ngaySanXuat,
        IdThungBanThanhPham: idBtp + "_T001",
        sttThung: 1,
        khoiLuongThung: 12.35
      },
      {
        IdBanThanhPham: idBtp,
        ngaySanXuat: ngaySanXuat,
        IdThungBanThanhPham: idBtp + "_T002",
        sttThung: 2,
        khoiLuongThung: 12.42
      }
    ]
  };

  Logger.log(JSON.stringify(saveChiTietBTPtheoThung_(body), null, 2));
}

function testSaveEpMangIn() {
  const body = {
    rows: [
      {
        IdThungDungVi:
          "TDV_TEST_" +
          Utilities.formatDate(
            new Date(),
            Session.getScriptTimeZone(),
            "yyyyMMddHHmmss"
          ),

        noiDungDongTren:
          "NSX 230726 DM",

        noiDungDongDuoi:
          "09 080820",

        thoiGianLuu:
          nowText_(),

        nguoiLuu:
          "test"
      }
    ]
  };

  Logger.log(
    JSON.stringify(
      saveEpMangIn_(body),
      null,
      2
    )
  );
}

function testSaveDongThung() {
  const body = {
    rows: [
      {
        noiDungNSXTrenVi:
          "NSX 230726 DM",

        noiDungDongTren:
          "DONG TREN TEST",

        noiDungDongDuoi:
          "DONG DUOI TEST",

        thoiGianLuu:
          nowText_(),

        nguoiLuu:
          "test",

        ngayInDateVi:
          "2026-07-25"
      }
    ]
  };

  Logger.log(
    JSON.stringify(
      saveDongThung_(body),
      null,
      2
    )
  );
}











/* SCADA: selected current plan + confirmed issue are required before saving. */
function scadaEpCancelled_(p) {
  const status=String(p.trangThai||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return !!p.thoiGianHuy || status.includes('huy');
}
function scadaEpDate_(value) {
  if(Object.prototype.toString.call(value)==='[object Date]' && !isNaN(value))
    return Utilities.formatDate(value,'Asia/Ho_Chi_Minh','yyyy-MM-dd');
  const text=String(value||'').trim();
  const iso=text.match(/^(\d{4}-\d{2}-\d{2})(?:[ T]|$)/);
  if(iso)return iso[1];
  const vn=text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T]|$)/);
  return vn?vn[3]+'-'+vn[2]+'-'+vn[1]:'';
}
function scadaEpDetails_(p,details) {
  const current=details.filter(d=>String(d.IdEpMangIn||'').trim()===String(p.IdEpMangIn||'').trim() && Number(d.phienBan)===Number(p.phienBan));
  const seen=new Set();
  return current.map(d=>{
    const id=String(d.IdThungDungVi||'').trim(),key=id.toLowerCase();
    if(!key||seen.has(key))throw Error('Danh sách thùng kế hoạch bị trống hoặc trùng: '+id);
    seen.add(key);
    const issued=!!p.IdXuatEpMangIn && String(d.IdXuatEpMangIn||'')===String(p.IdXuatEpMangIn) &&
      String(d.trangThaiXuat||'').trim()==='Đã xuất' && Number(d.soLuongViDaXuat)>0;
    return {...d,IdThungDungVi:id,soLuongViDaXuat:Number(d.soLuongViDaXuat)||0,daXuat:issued,trangThaiXuat:issued?'Đã xuất':'Chưa xuất'};
  });
}
function getScadaEpMangInPlans_(days) {
  if(!['2','5'].includes(String(days)))throw Error('Chỉ hỗ trợ hôm qua và hôm nay hoặc 5 ngày gần nhất.');
  const today=Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyy-MM-dd');
  const start=new Date(today+'T00:00:00Z');start.setUTCDate(start.getUTCDate()-(Number(days)-1));
  const from=start.toISOString().slice(0,10),tables=epBoxTables_(),seen=new Set();
  const plans=tables.parents.filter(p=>{
    const date=scadaEpDate_(p.thoiGianTao);
    return p.IdEpMangIn && !scadaEpCancelled_(p) && date>=from && date<=today;
  }).map(p=>{
    const id=String(p.IdEpMangIn).trim();if(seen.has(id))throw Error('Trùng mã kế hoạch ép màng in: '+id);seen.add(id);
    return {...p,IdEpMangIn:id,items:scadaEpDetails_(p,tables.details)};
  }).sort((a,b)=>Number(b.STT)-Number(a.STT));
  return {success:true,fromDate:from,toDate:today,plans:epBoxSerialize_(plans),trace:epBoxSerialize_(scadaEpTrace_(plans))};
}
function scadaEpTrace_(plans) {
  const key=v=>String(v||'').trim().toLowerCase();
  const boxIds=new Set(plans.flatMap(p=>p.items.map(d=>key(d.IdThungDungVi))));
  if(!boxIds.size)return {KeHoachLapVi:[],KetQuaLapVi:[],ChiTietBTPTheoThung:[]};
  const results=epBoxRead_('KetQuaLapVi',['IdThungDungVi'],true).rows.filter(r=>boxIds.has(key(r.IdThungDungVi)));
  const lapViIds=new Set(results.map(r=>key(r.IdLapVi)));
  const btpIds=new Set(results.flatMap(r=>[key(r.IdThungBanThanhPham1),key(r.IdThungBanThanhPham2)]).filter(Boolean));
  return {
    KeHoachLapVi:epBoxRead_('KeHoachLapViVTBC',['IdLapVi'],true).rows.filter(r=>lapViIds.has(key(r.IdLapVi))),
    KetQuaLapVi:results,
    // Trace by related IDs, not the old production dates of the BTP containers.
    ChiTietBTPTheoThung:epBoxRead_('ChiTietBTPtheoThung',['IdThungBanThanhPham'],true).rows.filter(r=>btpIds.has(key(r.IdThungBanThanhPham)))
  };
}
function scadaEpAssertIssued_(id,revision,boxIds) {
  id=String(id||'').trim();
  if(!id||!Number.isInteger(Number(revision))||Number(revision)<1)throw Error('Chưa chọn kế hoạch ép màng in hoặc phiên bản không hợp lệ.');
  const tables=epBoxTables_(),matches=tables.parents.filter(p=>String(p.IdEpMangIn||'').trim()===id);
  if(matches.length!==1)throw Error('Không tìm thấy đúng một kế hoạch ép màng in. Hãy tải lại kế hoạch.');
  const plan=matches[0];
  if(scadaEpCancelled_(plan))throw Error('Kế hoạch đã hủy. Không được ghi dữ liệu ép màng in.');
  if(Number(plan.phienBan)!==Number(revision))throw Error('Kế hoạch đã thay đổi phiên bản. Hãy tải lại kế hoạch.');
  if(!Array.isArray(boxIds)||!boxIds.length)throw Error('Chưa có thùng cần ghi.');
  const details=scadaEpDetails_(plan,tables.details),seen=new Set();
  boxIds.forEach(value=>{
    const key=String(value||'').trim().toLowerCase();
    if(!key||seen.has(key))throw Error('Mã thùng bị trống hoặc lặp.');seen.add(key);
    const box=details.find(d=>d.IdThungDungVi.toLowerCase()===key);
    if(!box)throw Error('Sai thùng: '+value+' không thuộc kế hoạch đã chọn.');
    if(!box.daXuat)throw Error('Thùng '+value+' chưa được xác nhận xuất theo kế hoạch.');
  });
  return plan;
}

/* Small dependency adapter for the shared stock API. Credentials stay in its
 * existing Code file; this module contains none. */
const SHEET_KE_HOACH_EP_MANG_IN = 'KeHoachEpMangIn';
function getSpreadsheet_(){return SpreadsheetApp.openById(SPREADSHEET_ID);}
function getKeHoachEpMangInHeaders_(){return ['STT','maSanPham','tenSanPham','soLuongViKeHoach','thoiGianTao','nguoiTao','trangThai','soLuongViThucHien','ghiChu','nguoiBaoCao','ThoiGianBaoCao'];}
function formatDateTimeValue_(v){return Object.prototype.toString.call(v)==='[object Date]'?Utilities.formatDate(v,'Asia/Ho_Chi_Minh','yyyy-MM-dd HH:mm:ss'):String(v??'');}
function isWithinLastFiveDays_(v){
  const today=Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyy-MM-dd'),start=new Date(today+'T00:00:00Z');start.setUTCDate(start.getUTCDate()-4);
  const text=Object.prototype.toString.call(v)==='[object Date]'?Utilities.formatDate(v,'Asia/Ho_Chi_Minh','yyyy-MM-dd'):String(v||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text)&&text>=start.toISOString().slice(0,10)&&text<=today;
}
function getSimplePlanProductByMa_(ma){const rows=epBoxRead_('DanhSachSanPhamVTBC',['maSanPham','tenSanPham']).rows.filter(r=>epBoxText_(r.maSanPham)===ma);if(rows.length!==1)throw Error('Không tìm thấy đúng một sản phẩm '+ma);return rows[0];}

/* PCN film-print plans. Inventory is read-only here; a committed parent revision
 * activates its container reservations. Older detail revisions remain auditable. */
const EP_BOX_DETAIL_SHEET_ = 'ChiTietKeHoachEpMangIn';
const EP_BOX_PARENT_EXTRA_ = ['IdEpMangIn','phienBan','maYeuCau','thoiGianCapNhat','nguoiCapNhat','lichSuYeuCau','thoiGianHuy','nguoiHuy','IdXuatEpMangIn','thoiGianXuatEpMangIn','nguoiXuatEpMangIn','noiDungLenhXuat'];
const EP_BOX_DETAIL_HEADERS_ = ['IdEpMangIn','STTKeHoach','phienBan','IdThungDungVi','IdLapVi','maSanPham','tenSanPham','ngaySanXuat','viTriKho','soLuongViKhiChon','trangThaiXuat','soLuongViDaXuat','thoiGianXuat','nguoiXuat','daXuatKhiChon','maYeuCau','noiDungYeuCau','IdXuatEpMangIn'];

function epBoxText_(v) { return String(v == null ? '' : v).trim(); }
function epBoxRequests_(p) { const history=JSON.parse(p.lichSuYeuCau||'[]');if(!Array.isArray(history))throw Error('Lịch sử yêu cầu kế hoạch không hợp lệ.');return history; }
function epBoxClosed_(p) { return !!p.thoiGianHuy||/^(Hủy kế hoạch|Đã hủy|Hủy|Hoàn thành|Đã hoàn thành)$/i.test(epBoxText_(p.trangThai)); }
function epBoxReservations_(parents, details, exceptId) {
  const active=new Map(), holds=new Map();
  parents.forEach(p=>{const id=epBoxText_(p.IdEpMangIn);if(!id)return;if(active.has(id))throw Error('Trùng mã kế hoạch '+id);active.set(id,p);});
  details.forEach(d=>{const id=epBoxText_(d.IdEpMangIn),p=active.get(id);if(!p||id===exceptId||epBoxClosed_(p)||Number(p.phienBan)!==Number(d.phienBan))return;
    const box=epBoxText_(d.IdThungDungVi);if(!box)throw Error('Chi tiết kế hoạch thiếu mã thùng.');
    if(holds.has(box))throw Error('Trùng giữ thùng '+box+' trong kế hoạch.');holds.set(box,id);
  });return holds;
}
function epBoxValidate_(product,quantity,ids,stocks,holds) {
  if(!epBoxText_(product))throw Error('Vui lòng chọn sản phẩm.');
  if(!Number.isSafeInteger(quantity)||quantity<=0)throw Error('Số lượng vỉ kế hoạch phải là số nguyên lớn hơn 0.');
  if(!Array.isArray(ids)||!ids.length)throw Error('Vui lòng thêm ít nhất một thùng vào danh sách.');
  const byId=new Map(),seen=new Set();stocks.forEach(s=>{const id=epBoxText_(s.IdThungDungVi);if(byId.has(id))throw Error('Trùng mã thùng '+id);byId.set(id,s);});
  let total=0;const selected=ids.map(value=>{const id=epBoxText_(value);if(seen.has(id))throw Error('Thùng bị chọn trùng: '+id);seen.add(id);
    const s=byId.get(id);if(!s||epBoxText_(s.maSanPham)!==product)throw Error('Thùng '+id+' không thuộc sản phẩm đã chọn hoặc không còn tồn.');
    if(holds.has(id))throw Error('Thùng '+id+' đang được giữ cho kế hoạch '+holds.get(id)+'. Vui lòng tải lại.');
    const qty=Number(s.soLuongViDaLap);if(!Number.isSafeInteger(qty)||qty<=0)throw Error('Thùng '+id+' không còn tồn hợp lệ.');total+=qty;return s;
  });if(!Number.isSafeInteger(total)||quantity>total)throw Error('Số lượng kế hoạch vượt tổng tồn các thùng đã chọn ('+total+' vỉ).');return selected;
}
function epBoxEnsureSheet_(ss,name,required) {
  let sheet=ss.getSheetByName(name);if(!sheet)sheet=ss.insertSheet(name);
  const cols=sheet.getLastColumn(),headers=cols?sheet.getRange(1,1,1,cols).getValues()[0].map(epBoxText_):[];
  headers.filter(Boolean).forEach((h,i,a)=>{if(a.indexOf(h)!==i)throw Error(name+' trùng cột '+h);});
  const missing=required.filter(h=>!headers.includes(h));if(missing.length)sheet.getRange(1,headers.length+1,1,missing.length).setValues([missing]);return sheet;
}
function epBoxSchema_() {
  const ss=getSpreadsheet_();
  epBoxEnsureSheet_(ss,SHEET_KE_HOACH_EP_MANG_IN,getKeHoachEpMangInHeaders_().concat(EP_BOX_PARENT_EXTRA_));
  epBoxEnsureSheet_(ss,EP_BOX_DETAIL_SHEET_,EP_BOX_DETAIL_HEADERS_);
}
function epBoxRead_(name,required,optional) {
  const sheet=getSpreadsheet_().getSheetByName(name);
  if(!sheet){if(optional)return {sheet:null,headers:[],rows:[]};throw Error('Không tìm thấy sheet '+name);}
  const values=sheet.getDataRange().getValues(),headers=(values[0]||[]).map(epBoxText_);
  (required||[]).forEach(h=>{if(headers.filter(x=>x===h).length!==1)throw Error(name+' thiếu hoặc trùng cột '+h);});
  const rows=values.slice(1).map((r,i)=>{const p={_row:i+2};headers.forEach((h,j)=>{if(h)p[h]=r[j] == null ? '' : r[j];});return p;}).filter(r=>headers.some(h=>h&&r[h]!==''));
  return {sheet,headers,rows};
}
function epBoxTables_() {
  return {parents:epBoxRead_(SHEET_KE_HOACH_EP_MANG_IN,getKeHoachEpMangInHeaders_()).rows,details:epBoxRead_(EP_BOX_DETAIL_SHEET_,[],true).rows};
}
function epBoxStock_() {
  return viStockProjection_(viStockRead_('KetQuaLapVi',['IdThungDungVi','IdLapVi','soLuongViDaLap']),viStockRead_('KeHoachLapViVTBC',['IdLapVi','maSanPham','tenSanPham'])).details;
}
function epBoxSerialize_(value) {
  if(Object.prototype.toString.call(value)==='[object Date]')return formatDateTimeValue_(value);
  if(Array.isArray(value))return value.map(epBoxSerialize_);
  if(value&&typeof value==='object'){const result={};Object.keys(value).filter(k=>k!=='_row').forEach(k=>result[k]=epBoxSerialize_(value[k]));return result;}return value;
}
function epBoxPlans_(tables) {
  tables=tables||epBoxTables_();
  return epBoxSerialize_(tables.parents.filter(p=>isWithinLastFiveDays_(p.thoiGianTao)||(p.IdEpMangIn&&!epBoxClosed_(p))).map(p=>({...p,trangThai:p.thoiGianHuy?'Hủy kế hoạch':p.trangThai,soLuongKeHoach:Number(p.soLuongViKeHoach)||0,
    soLuongThucHien:p.soLuongViThucHien===''?'':Number(p.soLuongViThucHien),
    items:tables.details.filter(d=>p.IdEpMangIn&&d.IdEpMangIn===p.IdEpMangIn&&Number(d.phienBan)===Number(p.phienBan))
  })).sort((a,b)=>Number(b.STT)-Number(a.STT)));
}
function getEpMangInBoxData(token) {
  requireAdmin_(token);const tables=epBoxTables_(),holds=epBoxReservations_(tables.parents,tables.details);
  return {success:true,plans:epBoxPlans_(tables),boxes:epBoxSerialize_(epBoxStock_().filter(s=>s.soLuongViDaLap>0&&s.maSanPham).map(s=>({...s,giuChoKeHoach:holds.get(epBoxText_(s.IdThungDungVi))||''})))};
}
function epBoxAssertEditable_(parent,details,stocks) {
  if(parent.noiDungLenhXuat||parent.IdXuatEpMangIn)throw Error('Kế hoạch đang xuất hoặc đã xuất, không thể sửa/hủy.');
  if(epBoxClosed_(parent))throw Error('Kế hoạch đã hủy hoặc hoàn thành, không thể sửa/hủy.');
  if(parent.soLuongViThucHien!==''&&parent.soLuongViThucHien!=null||epBoxText_(parent.nguoiBaoCao)||parent.ThoiGianBaoCao)throw Error('Kế hoạch đã có báo cáo thực hiện, không thể sửa/hủy.');
  const selected=details.filter(d=>parent.IdEpMangIn&&d.IdEpMangIn===parent.IdEpMangIn&&Number(d.phienBan)===Number(parent.phienBan));
  selected.forEach(d=>{const stock=stocks.find(s=>epBoxText_(s.IdThungDungVi)===epBoxText_(d.IdThungDungVi));
    if(Number(d.soLuongViDaXuat)>0||epBoxText_(d.thoiGianXuat)||epBoxText_(d.nguoiXuat)||epBoxText_(d.trangThaiXuat)==='Đã xuất'||!stock||Number(stock.daXuat||0)!==Number(d.daXuatKhiChon||0)||Number(stock.soLuongViDaLap)<Number(d.soLuongViKhiChon))throw Error('Thùng '+d.IdThungDungVi+' đã xuất hoặc tồn đã thay đổi; không thể sửa/hủy kế hoạch.');
  });
}
function epBoxParent_(parents,stt) {
  const n=Number(stt);if(!Number.isSafeInteger(n)||n<=0)throw Error('STT kế hoạch không hợp lệ.');
  const rows=parents.filter(p=>Number(p.STT)===n);if(rows.length!==1)throw Error('Không tìm thấy đúng một kế hoạch STT '+n);return rows[0];
}
function epBoxWrite_(table,rowNumber,data) {
  if(rowNumber>table.sheet.getLastRow()){
    table.sheet.getRange(rowNumber,1,1,table.headers.length).setValues([table.headers.map(h=>data[h]??'')]);return;
  }
  // Existing worker writes report columns with another project's lock. Never
  // read/write those cells during PCN edits. Commit the revision group last.
  const groups=[];
  table.headers.forEach((h,i)=>{if(!Object.prototype.hasOwnProperty.call(data,h))return;let group=groups[groups.length-1];if(!group||group.start+group.values.length!==i){group={start:i,values:[],keys:[]};groups.push(group);}group.values.push(data[h]);group.keys.push(h);});
  groups.sort((a,b)=>Number(a.keys.includes('phienBan'))-Number(b.keys.includes('phienBan')));
  const completed=[];
  try {groups.forEach(group=>{const range=table.sheet.getRange(rowNumber,group.start+1,1,group.values.length),before=range.getValues();range.setValues([group.values]);completed.push({range,before});});}
  catch(error){completed.reverse().forEach(g=>{try{g.range.setValues(g.before);}catch(rollbackError){console.error('Cannot restore PCN plan fields: '+rollbackError.message);}});throw error;}
}
function epBoxMutation_(token,payload,mode) {
  const session=requireAdmin_(token);return callEpPlanApi_('mutateEpMangInPlan',{actor:session.useName,mode,payload});
}
function epBoxMutationCore_(session,payload,mode) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    epBoxSchema_();const pt=epBoxRead_(SHEET_KE_HOACH_EP_MANG_IN,getKeHoachEpMangInHeaders_().concat(EP_BOX_PARENT_EXTRA_)),dt=epBoxRead_(EP_BOX_DETAIL_SHEET_,EP_BOX_DETAIL_HEADERS_),stocks=epBoxStock_();
    payload=payload||{};const request=epBoxText_(payload.maYeuCau);
    if(mode!=='cancel'&&!/^[A-Za-z0-9_-]{16,100}$/.test(request))throw Error('Thiếu mã yêu cầu. Vui lòng tải lại trang.');
    const signature=JSON.stringify([mode,mode==='create'?'':Number(payload.STT),epBoxText_(payload.maSanPham),Number(payload.soLuongKeHoach),Array.isArray(payload.items)?payload.items.map(epBoxText_).sort():[]]);
    // Commit request history in the same parent row as its revision. Orphan detail
    // writes never acknowledge a request; retries still work after later edits.
    const replay=mode!=='cancel'&&request&&pt.rows.find(p=>epBoxRequests_(p).some(r=>r.maYeuCau===request));
    if(replay){if(epBoxRequests_(replay).find(r=>r.maYeuCau===request).noiDungYeuCau!==signature)throw Error('Mã yêu cầu đã dùng cho nội dung khác. Vui lòng tải lại.');return {success:true,IdEpMangIn:replay.IdEpMangIn,message:'Kế hoạch đã được lưu.',plans:epBoxPlans_({parents:pt.rows,details:dt.rows})};}
    let parent=mode==='create'?null:epBoxParent_(pt.rows,payload.STT);
    if(parent){
      if(epBoxText_(payload.IdEpMangIn)!==epBoxText_(parent.IdEpMangIn)||Number(payload.phienBan||0)!==Number(parent.phienBan||0))throw Error('Kế hoạch đã thay đổi. Vui lòng tải lại trước khi sửa/hủy.');
      epBoxAssertEditable_(parent,dt.rows,stocks);
    }
    const now=nowText_();
    if(mode==='cancel'){
      epBoxWrite_(pt,parent._row,{trangThai:'Hủy kế hoạch',thoiGianHuy:now,nguoiHuy:session.useName||'',thoiGianCapNhat:now,nguoiCapNhat:session.useName||''});
      return {success:true,message:'Đã hủy kế hoạch và nhả các thùng đang giữ.',plans:epBoxPlans_()};
    }
    const product=epBoxText_(payload.maSanPham),qty=Number(payload.soLuongKeHoach),p=getSimplePlanProductByMa_(product);if(!p)throw Error('Không tìm thấy sản phẩm.');
    const selected=epBoxValidate_(product,qty,payload.items,stocks,epBoxReservations_(pt.rows,dt.rows,parent&&parent.IdEpMangIn));
    const id=parent&&parent.IdEpMangIn||'EMI'+Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyyMMddHHmmssSSS')+'_'+Utilities.getUuid().slice(0,8);
    const stt=parent?Number(parent.STT):Math.max(0,...pt.rows.map(p=>Number(p.STT)||0))+1;
    // Include inactive orphan revisions after a previous failed write when choosing the next revision.
    const revision=Math.max(Number(parent&&parent.phienBan||0),...dt.rows.filter(d=>d.IdEpMangIn===id).map(d=>Number(d.phienBan)||0))+1;
    const rows=selected.map(s=>({IdEpMangIn:id,STTKeHoach:stt,phienBan:revision,IdThungDungVi:s.IdThungDungVi,IdLapVi:s.IdLapVi,maSanPham:p.maSanPham,tenSanPham:p.tenSanPham,ngaySanXuat:s.ngaySanXuat||'',viTriKho:s.viTriKho||s.vitriKho||'',soLuongViKhiChon:s.soLuongViDaLap,trangThaiXuat:'Chờ xuất',soLuongViDaXuat:0,thoiGianXuat:'',nguoiXuat:'',daXuatKhiChon:s.daXuat||0,maYeuCau:request,noiDungYeuCau:signature}));
    dt.sheet.getRange(dt.sheet.getLastRow()+1,1,rows.length,dt.headers.length).setValues(rows.map(r=>dt.headers.map(h=>r[h]??'')));
    SpreadsheetApp.flush();
    // Check again after detail staging. Worker/C# writes are outside this PCN
    // lock; they must not silently convert a stale selection into a new plan.
    const freshStock=epBoxStock_(),freshParents=epBoxRead_(SHEET_KE_HOACH_EP_MANG_IN,getKeHoachEpMangInHeaders_()).rows;
    if(parent)epBoxAssertEditable_(epBoxParent_(freshParents,parent.STT),dt.rows,freshStock);
    epBoxValidate_(product,qty,payload.items,freshStock,epBoxReservations_(freshParents,dt.rows,parent&&parent.IdEpMangIn));
    selected.forEach(old=>{const fresh=freshStock.find(s=>s.IdThungDungVi===old.IdThungDungVi);if(Number(fresh.soLuongViDaLap)!==Number(old.soLuongViDaLap)||Number(fresh.daXuat||0)!==Number(old.daXuat||0))throw Error('Tồn thùng '+old.IdThungDungVi+' đã thay đổi. Vui lòng tải lại.');});
    const history=JSON.stringify((parent?epBoxRequests_(parent):[]).concat([{maYeuCau:request,noiDungYeuCau:signature}]));if(history.length>45000)throw Error('Kế hoạch đã có quá nhiều lần sửa. Vui lòng tạo kế hoạch mới.');
    const changes={STT:stt,maSanPham:p.maSanPham,tenSanPham:p.tenSanPham,soLuongViKeHoach:qty,IdEpMangIn:id,phienBan:revision,maYeuCau:request,thoiGianCapNhat:now,nguoiCapNhat:session.useName||'',lichSuYeuCau:history};
    if(!parent)Object.assign(changes,{thoiGianTao:now,nguoiTao:session.useName||'',trangThai:'Đã tạo',soLuongViThucHien:'',ghiChu:'',nguoiBaoCao:'',ThoiGianBaoCao:''});
    epBoxWrite_(pt,parent?parent._row:pt.sheet.getLastRow()+1,changes);SpreadsheetApp.flush();
    return {success:true,IdEpMangIn:id,message:mode==='create'?'Đã tạo kế hoạch và giữ các thùng đã chọn.':'Đã cập nhật kế hoạch và danh sách thùng.',plans:epBoxPlans_()};
  } finally {lock.releaseLock();}
}

/* Deployed only to the existing stock API, beside the shared PCN plan core.
 * All entry actions are behind the existing API bearer; browsers never see it. */
function epApiActor_(name,role) {
  const actor=epBoxText_(name),matches=epBoxRead_('account',['useName','role']).rows.filter(r=>epBoxText_(r.useName).toLowerCase()===actor.toLowerCase()&&epBoxText_(r.role).toLowerCase()===role);
  if(matches.length!==1)throw Error('Tài khoản không có quyền thực hiện.');return {useName:epBoxText_(matches[0].useName)};
}
function epApiAction_(action,body) {
  if(action==='epPlanPing')return {success:true};
  if(action==='mutateEpMangInPlan'){
    if(!['create','update','cancel'].includes(body.mode))throw Error('Thao tác kế hoạch không hợp lệ.');
    return epBoxMutationCore_(epApiActor_(body.actor,'admin'),body.payload,body.mode);
  }
  const actor=epApiActor_(body.actor,'worker');
  if(action==='exportEpMangInPlan')return epWorkerExportCore_(actor,body.payload);
  if(action==='reportEpMangInPlan')return epWorkerReportCore_(actor,body.payload);
  throw Error('Thao tác ép màng in không hợp lệ.');
}
function epExportDetails_(p,details) {
  const result=details.filter(d=>d.IdEpMangIn===p.IdEpMangIn&&Number(d.phienBan)===Number(p.phienBan));
  if(!result.length)throw Error('Kế hoạch chưa có thùng được PCN chọn.');
  const seen=new Set();result.forEach(d=>{const id=epBoxText_(d.IdThungDungVi).toLowerCase();if(!id||seen.has(id))throw Error('Danh sách thùng bị trùng hoặc thiếu mã.');seen.add(id);});return result;
}
function epExportScanIds_(details,ids) {
  if(!Array.isArray(ids)||ids.length!==details.length)throw Error('Phải quét đủ tất cả thùng của kế hoạch.');
  const allowed=new Map(details.map(d=>[epBoxText_(d.IdThungDungVi).toLowerCase(),d.IdThungDungVi])),seen=new Set();
  return ids.map(v=>{const key=epBoxText_(v).toLowerCase();if(!allowed.has(key)||seen.has(key))throw Error('QR không thuộc kế hoạch hoặc bị quét trùng: '+epBoxText_(v));seen.add(key);return allowed.get(key);});
}
function epExportTime_(v) {
  return Object.prototype.toString.call(v)==='[object Date]'?Utilities.formatDate(v,'Asia/Ho_Chi_Minh','yyyy-MM-dd HH:mm:ss'):epBoxText_(v);
}
function epExportStock_() {
  const raw=new Map(epBoxRead_('KetQuaLapVi',['IdThungDungVi']).rows.map(r=>[epBoxText_(r.IdThungDungVi),r.thoiGianXuat]));
  return epBoxStock_().map(s=>({...s,thoiGianXuat:raw.get(s.IdThungDungVi)||''}));
}
function epWorkerExportCore_(session,payload) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    epBoxSchema_();payload=payload||{};
    const pt=epBoxRead_(SHEET_KE_HOACH_EP_MANG_IN,EP_BOX_PARENT_EXTRA_),dt=epBoxRead_(EP_BOX_DETAIL_SHEET_,EP_BOX_DETAIL_HEADERS_);
    const found=pt.rows.filter(p=>p.IdEpMangIn===epBoxText_(payload.IdEpMangIn));if(found.length!==1)throw Error('Không tìm thấy đúng một kế hoạch ép màng in.');const parent=found[0];
    if(Number(payload.phienBan)!==Number(parent.phienBan))throw Error('Kế hoạch đã thay đổi. Tải lại và quét theo danh sách mới.');
    if(epBoxClosed_(parent))throw Error('Kế hoạch đã hủy hoặc hoàn thành.');
    const details=epExportDetails_(parent,dt.rows),ids=epExportScanIds_(details,payload.scannedIds);
    if(parent.IdXuatEpMangIn)return {success:true,IdXuatEpMangIn:parent.IdXuatEpMangIn,message:'Kế hoạch đã xuất trước đó. Không trừ tồn lần nữa.'};
    if(parent.soLuongViThucHien!==''||parent.nguoiBaoCao||parent.ThoiGianBaoCao)throw Error('Kế hoạch đã có báo cáo, cần PCN kiểm tra trước khi xuất.');
    let intent;
    if(parent.noiDungLenhXuat){intent=JSON.parse(parent.noiDungLenhXuat);if(intent.revision!==Number(parent.phienBan)||intent.plan!==parent.IdEpMangIn||intent.boxes.length!==ids.length||!intent.boxes.every(b=>ids.includes(b.id)))throw Error('Lệnh xuất chưa hoàn tất không khớp kế hoạch.');}
    else {
      const stock=epExportStock_(),holds=epBoxReservations_(pt.rows,dt.rows);
      epBoxValidate_(parent.maSanPham,Number(parent.soLuongViKeHoach),ids,stock,new Map([...holds].filter(([id,plan])=>plan!==parent.IdEpMangIn)));
      const now=nowText_();intent={id:'XEMI'+Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyyMMddHHmmssSSS')+'_'+Utilities.getUuid().slice(0,8),plan:parent.IdEpMangIn,revision:Number(parent.phienBan),actor:session.useName,time:now,boxes:ids.map(id=>{const s=stock.find(s=>s.IdThungDungVi===id);return {id,remaining:Number(s.soLuongViDaLap),issued:Number(s.daXuat||0),time:epExportTime_(s.thoiGianXuat),afterTime:epExportTime_(s.thoiGianXuat)||now};})};
      if(intent.boxes.some(b=>!Number.isSafeInteger(b.issued)||b.issued<0||!Number.isSafeInteger(b.issued+b.remaining)))throw Error('Số lượng vỉ không hợp lệ.');
      const raw=JSON.stringify(intent);if(raw.length>45000)throw Error('Kế hoạch quá nhiều thùng để xuất một lượt.');
      epBoxWrite_(pt,parent._row,{noiDungLenhXuat:raw});SpreadsheetApp.flush();
    }
    // Validate the entire recovery batch before touching any stock. Each row must
    // still be exactly its frozen before-state or the expected after-state.
    const stock=epExportStock_();intent.boxes.forEach(b=>{const s=stock.find(s=>s.IdThungDungVi===b.id);if(!s)throw Error('Không tìm thấy thùng '+b.id);const before=Number(s.soLuongViDaLap)===b.remaining&&Number(s.daXuat||0)===b.issued&&epExportTime_(s.thoiGianXuat)===b.time,after=Number(s.soLuongViDaLap)===0&&Number(s.daXuat)===b.issued+b.remaining&&epExportTime_(s.thoiGianXuat)===b.afterTime;if(!before&&!after)throw Error('Tồn thùng '+b.id+' đã thay đổi ngoài lệnh xuất. Cần kiểm tra dữ liệu.');});
    epViApply_(epViPrepare_(getSpreadsheet_(),ids,intent.time));SpreadsheetApp.flush();
    details.forEach(d=>{const b=intent.boxes.find(b=>b.id===d.IdThungDungVi);epBoxWrite_(dt,d._row,{trangThaiXuat:'Đã xuất',soLuongViDaXuat:b.remaining,thoiGianXuat:intent.time,nguoiXuat:intent.actor,IdXuatEpMangIn:intent.id});});SpreadsheetApp.flush();
    epBoxWrite_(pt,parent._row,{IdXuatEpMangIn:intent.id,thoiGianXuatEpMangIn:intent.time,nguoiXuatEpMangIn:intent.actor,trangThai:'Đã xuất'});SpreadsheetApp.flush();
    return {success:true,IdXuatEpMangIn:intent.id,message:'Đã xuất '+ids.length+' thùng, '+intent.boxes.reduce((n,b)=>n+b.remaining,0)+' vỉ. C# ghi sau không trừ tồn lại.'};
  } finally {lock.releaseLock();}
}
function epWorkerReportCore_(session,payload) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const pt=epBoxRead_(SHEET_KE_HOACH_EP_MANG_IN,getKeHoachEpMangInHeaders_()),parent=epBoxParent_(pt.rows,payload&&payload.STT),qty=Number(payload&&payload.soLuongThucHien);
    if(epBoxClosed_(parent))throw Error('Kế hoạch đã hủy hoặc hoàn thành.');
    if(parent.IdEpMangIn&&!parent.IdXuatEpMangIn)throw Error('Phải quét đủ và xác nhận xuất thùng trước khi báo cáo.');
    if(!Number.isSafeInteger(qty)||qty<0)throw Error('Số lượng vỉ thực hiện phải là số nguyên không âm.');
    const note=epBoxText_(payload.ghiChu);if(note.length>10000)throw Error('Ghi chú quá dài.');
    epBoxWrite_(pt,parent._row,{soLuongViThucHien:qty,ghiChu:/^[=+\-@]/.test(note)?"'"+note:note,nguoiBaoCao:session.useName,ThoiGianBaoCao:nowText_(),trangThai:'Đã báo cáo'});
    return {success:true,message:'Đã lưu báo cáo ép màng in.'};
  } finally {lock.releaseLock();}
}

/* Called inside saveEpMangIn_'s existing ScriptLock, before/after appending EpMangIn. */
function epViPrepare_(ss,ids,now) {
  const sheet=ss.getSheetByName('KetQuaLapVi');if(!sheet)throw Error('Không tìm thấy sheet KetQuaLapVi.');
  let range=sheet.getDataRange(),matrix=range.getValues(),headers=matrix[0].map(v=>String(v).trim());
  for(const key of ['IdThungDungVi','soLuongViDaLap'])if(headers.filter(h=>h===key).length!==1)throw Error('KetQuaLapVi thiếu hoặc trùng cột '+key);
  const missing=['daXuat','thoiGianXuat'].filter(k=>!headers.includes(k));
  if(missing.length){const needed=headers.length+missing.length;if(needed>sheet.getMaxColumns())sheet.insertColumnsAfter(sheet.getMaxColumns(),needed-sheet.getMaxColumns());sheet.getRange(1,headers.length+1,1,missing.length).setValues([missing]);range=sheet.getDataRange();matrix=range.getValues();headers=matrix[0].map(v=>String(v).trim());}
  for(const key of ['daXuat','thoiGianXuat'])if(headers.filter(h=>h===key).length!==1)throw Error('KetQuaLapVi trùng cột '+key);
  const idCol=headers.indexOf('IdThungDungVi'),qtyCol=headers.indexOf('soLuongViDaLap'),issuedCol=headers.indexOf('daXuat'),timeCol=headers.indexOf('thoiGianXuat'),formulas=range.getFormulas(),updates=[];
  const qty=(v,id)=>{const n=String(v??'').trim()===''?0:Number(String(v).replace(/,/g,''));if(!Number.isSafeInteger(n)||n<0)throw Error('Số lượng vỉ không hợp lệ của thùng '+id);return n;};
  [...new Set(ids.map(id=>String(id||'').trim()))].forEach(id=>{
    const matches=[];for(let i=1;i<matrix.length;i++)if(String(matrix[i][idCol]||'').trim()===id)matches.push(i);
    if(!id||!matches.length)throw Error('Không tìm thấy thùng '+id+' trong KetQuaLapVi.');if(matches.length!==1)throw Error('Trùng IdThungDungVi trong KetQuaLapVi: '+id);
    const index=matches[0],row=matrix[index],remaining=qty(row[qtyCol],id),issued=qty(row[issuedCol],id);if(!remaining)return;
    const total=remaining+issued;if(!Number.isSafeInteger(total))throw Error('Số lượng vỉ không hợp lệ của thùng '+id);
    const from=Math.min(qtyCol,issuedCol,timeCol),to=Math.max(qtyCol,issuedCol,timeCol),cells=row.slice(from,to+1).map((v,j)=>formulas[index]?.[from+j]||v);
    cells[qtyCol-from]=0;cells[issuedCol-from]=total;cells[timeCol-from]=row[timeCol]||now;
    updates.push({row:index+1,column:from+1,cells});
  });return {sheet,updates};
}
function epViApply_(batch){batch.updates.forEach(u=>batch.sheet.getRange(u.row,u.column,1,u.cells.length).setValues([u.cells]));return {exportedContainers:batch.updates.length};}
function epViLocationUpdates_(sheet,body){
  const matrix=sheet.getDataRange().getValues(),headers=matrix[0].map(v=>String(v).trim()),index={};
  ['IdThungDungVi','IdLapVi','soLuongViDaLap'].forEach(k=>{if(headers.filter(h=>h===k).length!==1)throw Error('KetQuaLapVi thiếu hoặc trùng cột '+k);index[k]=headers.indexOf(k);});
  if(headers.filter(h=>h==='daXuat').length>1)throw Error('KetQuaLapVi trùng cột daXuat');index.daXuat=headers.indexOf('daXuat');
  const locations=headers.map((h,i)=>['vitriKho','viTriKho'].includes(h)?i:-1).filter(i=>i>=0);if(locations.length!==1)throw Error('KetQuaLapVi thiếu hoặc trùng cột vị trí kho');index.vitriKho=locations[0];
  const idLapVi=String(body.IdLapVi||'').trim(),items=body.items,seen=new Set(),updates=[];
  if(!idLapVi||!Array.isArray(items)||!items.length)throw Error('Thiếu kế hoạch hoặc danh sách thùng.');
  const planRows=matrix.slice(1).map((r,i)=>({r,row:i+2})).filter(v=>String(v.r[index.IdLapVi]||'').trim()===idLapVi&&String(v.r[index.IdThungDungVi]||'').trim());
  items.forEach(item=>{
    const id=String(item.IdThungDungVi||'').trim(),matches=planRows.filter(v=>String(v.r[index.IdThungDungVi]).trim()===id),qty=Number(item.soLuongViDaLap);
    if(!id||seen.has(id)||matches.length!==1)throw Error('Mã thùng không hợp lệ hoặc trùng: '+id);seen.add(id);
    if(!Number.isSafeInteger(qty)||qty<0)throw Error('Số lượng vỉ không hợp lệ: '+id);
    const {r,row}=matches[0],current=Number(r[index.soLuongViDaLap]||0),issued=index.daXuat<0?0:Number(r[index.daXuat]||0);
    if(!Number.isSafeInteger(current)||current<0||!Number.isSafeInteger(issued)||issued<0)throw Error('Dữ liệu tồn không hợp lệ: '+id);
    if(issued>0&&qty!==current)throw Error('Thùng '+id+' đã xuất ép màng. Tải lại dữ liệu trước khi lưu.');
    const text=String(item.vitriKho||'').trim();updates.push({row,qty,location:/^[=+\-@]/.test(text)?"'"+text:text});
  });if(items.length!==planRows.length)throw Error('Phải gửi đủ toàn bộ thùng của kế hoạch.');return {sheet,index,updates};
}
function epViSaveLocations_(body){
  const lock=LockService.getScriptLock();lock.waitLock(30000);try{
    const sheet=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('KetQuaLapVi');if(!sheet)throw Error('Không tìm thấy KetQuaLapVi.');
    const batch=epViLocationUpdates_(sheet,body);
    batch.updates.forEach(u=>{sheet.getRange(u.row,batch.index.soLuongViDaLap+1).setValue(u.qty);sheet.getRange(u.row,batch.index.vitriKho+1).setValue(u.location);});
    SpreadsheetApp.flush();return {success:true,updatedRows:batch.updates.length};
  }finally{lock.releaseLock();}
}

function viStockQty_(value) {
  const text=String(value??'').trim(),number=text===''?0:Number(text.replace(/,/g,''));
  if(!Number.isSafeInteger(number)||number<0)throw Error('Số lượng vỉ không hợp lệ: '+text);
  return number;
}
function viStockProjection_(stock,plans) {
  const byPlan=new Map(),totals=new Map(),progress=new Map(),warnings=[];
  plans.forEach(p=>{const id=String(p.IdLapVi||'').trim();if(!id)return;const old=byPlan.get(id);if(old&&['maSanPham','tenSanPham','soLuongViKeHoach'].some(k=>String(old[k]||'')!==String(p[k]||'')))throw Error('Trùng IdLapVi có thông tin khác nhau: '+id);byPlan.set(id,p);});
  byPlan.forEach((p,id)=>progress.set(id,{IdLapVi:id,maSanPham:p.maSanPham||'',tenSanPham:p.tenSanPham||'',keHoach:viStockQty_(p.soLuongViKeHoach),daLap:0,daXuat:0,tonKho:0,trangThai:p.trangThai||''}));
  const seen=new Set(),unknown=new Set();
  const details=stock.map(r=>{
    const id=String(r.IdThungDungVi||'').trim(),planId=String(r.IdLapVi||'').trim();
    if(!id)throw Error('Dòng tồn kho thiếu IdThungDungVi.');if(seen.has(id))throw Error('Trùng IdThungDungVi: '+id);seen.add(id);
    const p=byPlan.get(planId),tonKho=viStockQty_(r.soLuongViDaLap),daXuat=viStockQty_(r.daXuat);
    if(!p&&!unknown.has(planId)){unknown.add(planId);warnings.push('Không tìm thấy kế hoạch '+(planId||'(trống)')+' để tra tên sản phẩm.');}
    const productKey=JSON.stringify(p?[p.maSanPham||'',p.tenSanPham||'']:['Chưa xác định',planId]),name=p?.tenSanPham||'Chưa xác định — '+(planId||'thiếu IdLapVi');
    if(!totals.has(productKey))totals.set(productKey,{productKey,maSanPham:p?.maSanPham||'',tenSanPham:name,tonKho:0,soThungConTon:0});
    const total=totals.get(productKey);total.tonKho+=tonKho;if(tonKho>0)total.soThungConTon++;
    if(!progress.has(planId))progress.set(planId,{IdLapVi:planId,maSanPham:'',tenSanPham:name,keHoach:0,daLap:0,daXuat:0,tonKho:0,trangThai:''});
    const pr=progress.get(planId);pr.daLap+=tonKho+daXuat;pr.daXuat+=daXuat;pr.tonKho+=tonKho;pr.productKey=productKey;
    return {...r,tenSanPham:name,maSanPham:p?.maSanPham||'',productKey,soLuongViDaLap:tonKho,daXuat};
  });
  return {details,totals:[...totals.values()],progress:[...progress.values()].map(r=>({...r,productKey:r.productKey||JSON.stringify([r.maSanPham,r.tenSanPham]),conCanLap:Math.max(0,r.keHoach-r.daLap)})),warnings};
}
function viStockRead_(name,required) {
  const sheet=getSheet_(name),values=sheet.getDataRange().getValues(),headers=values[0].map(v=>String(v).trim());
  required.forEach(k=>{if(headers.filter(h=>h===k).length!==1)throw Error(name+' thiếu hoặc trùng cột '+k);});
  return values.slice(1).filter(row=>row.some(v=>v!==''&&v!==null)).map(row=>Object.fromEntries(headers.filter(Boolean).map(k=>{const v=row[headers.indexOf(k)];return [k,Object.prototype.toString.call(v)==='[object Date]'?Utilities.formatDate(v,'Asia/Ho_Chi_Minh',k==='ngaySanXuat'?'dd/MM/yyyy':'dd/MM/yyyy HH:mm:ss'):v??''];})));
}
function getViStock(token) {
  requireAdmin_(token);
  const stock=viStockRead_('KetQuaLapVi',['IdThungDungVi','IdLapVi','soLuongViDaLap']),plans=viStockRead_('KeHoachLapViVTBC',['IdLapVi','tenSanPham']);
  return {success:true,...viStockProjection_(stock,plans)};
}
