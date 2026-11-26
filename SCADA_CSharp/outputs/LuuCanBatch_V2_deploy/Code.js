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
