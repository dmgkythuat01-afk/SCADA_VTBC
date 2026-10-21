const SPREADSHEET_ID = "1yFlCpC6JzLRmv9hukNw05vYpeYmkhXRcPC-0nCNOjAQ";

const SHEET_ACCOUNT = "account";
const SHEET_NGUYEN_LIEU = "NguyenLieu";
const SHEET_KHO_NGUYEN_LIEU = "KhoNguyenLieu";
const SHEET_DON_HANG_NHAP_KHO = "DonHangNhapKho";
const SHEET_PHIEU_XUAT_NGUYEN_LIEU = "PhieuXuatNguyenLieu";
const SHEET_CHI_TIET_CAN_BATCH = "ChiTietCanBatch";
const SHEET_NHAP_LAI_KHO_SAU_CAN = "NhapLaiKhoSauCan";
const SHEET_TON_KHO_DAU = "TonKhoDau";
const SHEET_PHIEU_XUAT_THU_CONG = "PhieuXuatThuCong";

const REQUIRED_ROLE = "inventory_management";
const SESSION_PREFIX = "KHO_SESSION_";
const SESSION_TTL_SECONDS = 6 * 60 * 60;

function doGet() {
  return HtmlService
    .createTemplateFromFile("index").evaluate()
    .setTitle("Quản lý kho nguyên liệu")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error("Không tìm thấy sheet: " + sheetName);
  return sheet;
}

function normalizeText_(value) {
  return String(value || "").trim();
}

function todayText_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function nowText_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
}

function formatDateValue_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  return normalizeText_(value);
}

function generateId_(prefix) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `${prefix}${y}${m}${d}${h}${mi}${s}${random}`;
}

function generateToken_() {
  return Utilities.getUuid() + "_" + new Date().getTime();
}

function saveSession_(user) {
  const token = generateToken_();

  CacheService.getScriptCache().put(
    SESSION_PREFIX + token,
    JSON.stringify({
      useName: user.useName,
      role: user.role,
      loginAt: new Date().toISOString()
    }),
    SESSION_TTL_SECONDS
  );

  return token;
}

function getSession_(token) {
  if (!token) return null;

  const raw = CacheService.getScriptCache().get(SESSION_PREFIX + token);
  if (!raw) return null;

  return JSON.parse(raw);
}

function requireInventoryRole_(token) {
  const session = getSession_(token);

  if (!session) {
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  if (session.role !== REQUIRED_ROLE) {
    throw new Error("Không có quyền truy cập. Chỉ tài khoản role inventory_management được sử dụng trang này.");
  }

  return session;
}

function login(payload) {
  const useName = normalizeText_(payload && payload.useName);
  const passWord = normalizeText_(payload && payload.passWord);

  if (!useName || !passWord) {
    return {
      success: false,
      message: "Vui lòng nhập đầy đủ tài khoản và mật khẩu."
    };
  }

  const sheet = getSheet_(SHEET_ACCOUNT);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return {
      success: false,
      message: "Sheet account chưa có dữ liệu."
    };
  }

  const headers = values[0].map(h => normalizeText_(h));
  const idxUseName = headers.indexOf("useName");
  const idxPassWord = headers.indexOf("passWord");
  const idxRole = headers.indexOf("role");

  if (idxUseName === -1 || idxPassWord === -1 || idxRole === -1) {
    return {
      success: false,
      message: "Sheet account cần có đủ cột: useName, passWord, role."
    };
  }

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const rowUseName = normalizeText_(row[idxUseName]);
    const rowPassWord = normalizeText_(row[idxPassWord]);
    const rowRole = normalizeText_(row[idxRole]).toLowerCase();

    if (rowUseName === useName && rowPassWord === passWord) {
      if (rowRole !== REQUIRED_ROLE) {
        return {
          success: false,
          noPermission: true,
          message: "Tài khoản này không có quyền truy cập trang Quản lý kho nguyên liệu."
        };
      }

      const token = saveSession_({
        useName: rowUseName,
        role: rowRole
      });

      return {
        success: true,
        token: token,
        user: {
          useName: rowUseName,
          role: rowRole
        },
        message: "Đăng nhập thành công."
      };
    }
  }

  return {
    success: false,
    message: "Sai tài khoản hoặc mật khẩu."
  };
}

function logout(token) {
  if (token) {
    CacheService.getScriptCache().remove(SESSION_PREFIX + token);
  }

  return {
    success: true
  };
}

function getInitialData(token) {
  const session = requireInventoryRole_(token);

  return {
    success: true,
    user: session,
    today: todayText_(),

    // Chỉ tải dữ liệu nhẹ khi đăng nhập
    nguyenLieu: getNguyenLieuList_(),
    khoHomNay: getTodayInventoryItems_(),

    // Không tải dữ liệu nặng ở bước đăng nhập
    phieuXuatChoDuyet: [],
    nhapLaiKhoSauCan: []
  };
}

function getNguyenLieuList_() {
  const sheet = getSheet_(SHEET_NGUYEN_LIEU);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return [];

  const headers = values[0].map(h => normalizeText_(h));

  const idxMa = headers.indexOf("maNguyenLieu");
  const idxTen = headers.indexOf("tenNguyenLieu");
  const idxNcc1 = headers.indexOf("nhaCungCap1");

  const idxMaKeToan = headers.indexOf("MaKeToan");
  const idxLoaiNguyenLieu = headers.indexOf("loaiNguyenLieu");
  const idxDonViKho = headers.indexOf("donViKho");
  const idxQuyCachDatHang = headers.indexOf("quyCachDatHang");
  const idxTrangThai = headers.indexOf("trangThai");
  const idxHeSoQuyDoiKho = headers.indexOf("heSoQuyDoiKho");
  const idxDoViTinhToan = headers.indexOf("doViTinhToan");

  if (
    idxMa === -1 ||
    idxTen === -1 ||
    idxNcc1 === -1
  ) {
    throw new Error(
      "Sheet NguyenLieu cần có các cột: " +
      "maNguyenLieu, tenNguyenLieu, nhaCungCap1."
    );
  }

  return values
    .slice(1)

    // Phải có mã hoặc tên nguyên liệu
    .filter(function(row) {
      return (
        normalizeText_(row[idxMa]) ||
        normalizeText_(row[idxTen])
      );
    })

    // Chỉ lấy nguyên liệu đang sử dụng
    .filter(function(row) {
      if (idxTrangThai === -1) return true;

      const trangThai =
        normalizeText_(row[idxTrangThai])
          .toLowerCase();

      return (
        !trangThai ||
        trangThai === "sử dụng" ||
        trangThai === "su dung"
      );
    })

    .map(function(row) {
      return {
        maNguyenLieu:
          normalizeText_(row[idxMa]),

        tenNguyenLieu:
          normalizeText_(row[idxTen]),

        // Menu Nhập kho chỉ dùng NCC1
        nhaCungCap1:
          normalizeText_(row[idxNcc1]),

        MaKeToan:
          idxMaKeToan === -1
            ? ""
            : normalizeText_(row[idxMaKeToan]),

        loaiNguyenLieu:
          idxLoaiNguyenLieu === -1
            ? ""
            : normalizeText_(row[idxLoaiNguyenLieu]),

        donViKho:
          idxDonViKho === -1
            ? "kg"
            : normalizeText_(row[idxDonViKho]),

        quyCachDatHang:
          idxQuyCachDatHang === -1
            ? ""
            : normalizeText_(row[idxQuyCachDatHang]),

        heSoQuyDoiKho:
          idxHeSoQuyDoiKho === -1
            ? ""
            : normalizeText_(row[idxHeSoQuyDoiKho]),

        doViTinhToan:
          idxDoViTinhToan === -1
            ? ""
            : normalizeText_(row[idxDoViTinhToan])
      };
    });
}

function ensureKhoHeader_(sheet) {
  const expectedHeaders = [
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
    "ngayPheDuyet",
    "anhChatLuong",
    "trangThaiNguyenLieu",
    "loaiNguyenLieu",
    "MaKeToan",
    "heSoQuyDoiKho",
    "doViTinhToan"
  ];

  ensureSheetHeaders_(sheet, expectedHeaders);
}

function ensureDonHangNhapHeader_(sheet) {
  const expectedHeaders = [
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
    "trangThaiPheDuyet",
    "MaKeToan",
    "heSoQuyDoiKho",
    "doViTinhToan"
  ];

  ensureSheetHeaders_(sheet, expectedHeaders);
}

function ensureSheetHeaders_(sheet, expectedHeaders) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return;
  }

  let currentLastCol = Math.max(sheet.getLastColumn(), expectedHeaders.length);
  let headers = sheet
    .getRange(1, 1, 1, currentLastCol)
    .getValues()[0]
    .map(h => normalizeText_(h));

  const isEmptyHeader = headers.every(h => !h);

  if (isEmptyHeader) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return;
  }

  expectedHeaders.forEach(function(header) {
    headers = sheet
      .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), expectedHeaders.length))
      .getValues()[0]
      .map(h => normalizeText_(h));

    if (headers.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
    }
  });
}

function getHeaderMap_(sheet) {
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(h => normalizeText_(h));

  const map = {};

  headers.forEach(function(header, index) {
    if (header) {
      map[header] = index + 1;
    }
  });

  return map;
}

function appendObjectRowByHeader_(sheet, obj) {
  const headerMap = getHeaderMap_(sheet);
  const lastCol = sheet.getLastColumn();
  const row = new Array(lastCol).fill("");

  Object.keys(obj).forEach(function(key) {
    if (headerMap[key]) {
      row[headerMap[key] - 1] = obj[key];
    }
  });

  sheet.appendRow(row);
}

function updateObjectRowByHeader_(sheet, rowNumber, obj) {
  const headerMap = getHeaderMap_(sheet);

  Object.keys(obj).forEach(function(key) {
    if (headerMap[key]) {
      sheet.getRange(rowNumber, headerMap[key]).setValue(obj[key]);
    }
  });
}

function getKhoHeaderIndex_(headers) {
  const required = [
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
  ];

  const optional = [
    "anhChatLuong",
    "trangThaiNguyenLieu",
    "loaiNguyenLieu",
    "MaKeToan",
    "heSoQuyDoiKho",
    "doViTinhToan"
  ];

  const idx = {};

  required.forEach(function(name) {
    idx[name] = headers.indexOf(name);
    if (idx[name] === -1) {
      throw new Error("Sheet KhoNguyenLieu thiếu cột: " + name);
    }
  });

  optional.forEach(function(name) {
    idx[name] = headers.indexOf(name);
  });

  return idx;
}

function validateInventoryPayload_(payload) {
  const maNguyenLieu = normalizeText_(payload && payload.maNguyenLieu);
  const tenNguyenLieu = normalizeText_(payload && payload.tenNguyenLieu);
  const khoiLuongNhap = Number(payload && payload.khoiLuongNhap);
  const donVi = normalizeText_(payload && payload.donVi);
  const quyCachDongGoi = normalizeText_(payload && payload.quyCachDongGoi);
  const lotNo = normalizeText_(payload && payload.LotNo);
  const ngaySanXuat = normalizeText_(payload && payload.ngaySanXuat);
  const hanSuDung = normalizeText_(payload && payload.hanSuDung);
  const nhaCungCap = normalizeText_(payload && payload.nhaCungCap);

  const loaiNguyenLieu = normalizeText_(payload && payload.loaiNguyenLieu);
  const MaKeToan = normalizeText_(payload && payload.MaKeToan);
  const heSoQuyDoiKho = normalizeText_(payload && payload.heSoQuyDoiKho);
  const doViTinhToan = normalizeText_(payload && payload.doViTinhToan);
 

  if (!maNguyenLieu || !tenNguyenLieu) {
    throw new Error("Vui lòng chọn tên nguyên liệu.");
  }

  if (!isFinite(khoiLuongNhap) || khoiLuongNhap <= 0) {
    throw new Error("Khối lượng nhập phải là số lớn hơn 0.");
  }

  if (!donVi) {
    throw new Error("Nguyên liệu chưa có đơn vị kho. Vui lòng kiểm tra cột donViKho trong sheet NguyenLieu.");
  }

  if (!quyCachDongGoi) {
    throw new Error("Vui lòng nhập quy cách đóng gói.");
  }

  if (!lotNo) {
    throw new Error("Vui lòng nhập LotNo.");
  }

  if (!ngaySanXuat) {
    throw new Error("Vui lòng chọn ngày sản xuất.");
  }

  if (!hanSuDung) {
    throw new Error("Vui lòng chọn hạn sử dụng.");
  }

  if (!nhaCungCap) {
    throw new Error("Vui lòng nhập nhà cung cấp.");
  }

  return {
    maNguyenLieu,
    tenNguyenLieu,
    khoiLuongNhap,
    donVi,
    quyCachDongGoi,
    LotNo: lotNo,
    ngaySanXuat,
    hanSuDung,
    nhaCungCap,
    loaiNguyenLieu,
    MaKeToan,
    heSoQuyDoiKho,
    doViTinhToan
  };
}

function saveInventoryItem(token, payload) {
  requireInventoryRole_(token);

  const data = validateInventoryPayload_(payload);
  const sheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);
  ensureKhoHeader_(sheet);

  const id = generateId_("KNL");
  const ngayNhap = todayText_();

  appendObjectRowByHeader_(sheet, {
    Id: id,
    maNguyenLieu: data.maNguyenLieu,
    tenNguyenLieu: data.tenNguyenLieu,
    khoiLuongNhap: data.khoiLuongNhap,
    donVi: data.donVi,
    quyCachDongGoi: data.quyCachDongGoi,
    LotNo: data.LotNo,
    ngaySanXuat: data.ngaySanXuat,
    hanSuDung: data.hanSuDung,
    nhaCungCap: data.nhaCungCap,
    ngayNhap: ngayNhap,
    trangThai: "Đã nhập",
    nguoiPheDuyetChatLuong: "",
    ngayPheDuyet: "",
    anhChatLuong: "",
    trangThaiNguyenLieu: "",
    loaiNguyenLieu: data.loaiNguyenLieu,
    MaKeToan: data.MaKeToan,
    heSoQuyDoiKho: data.heSoQuyDoiKho,
    doViTinhToan: data.doViTinhToan
  });

  return {
    success: true,
    id: id,
    message: "Đã lưu nhập kho nguyên liệu thành công.",
    khoHomNay: getTodayInventoryItems_()
  };
}

function updateInventoryItem(token, payload) {
  requireInventoryRole_(token);

  const id = normalizeText_(payload && payload.Id);
  const data = validateInventoryPayload_(payload);

  if (!id) {
    throw new Error("Thiếu Id cần sửa.");
  }

  const sheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);
  ensureKhoHeader_(sheet);

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));
  const idx = getKhoHeaderIndex_(headers);

  let rowNumber = -1;

  for (let i = 1; i < values.length; i++) {
    if (normalizeText_(values[i][idx.Id]) === id) {
      rowNumber = i + 1;
      break;
    }
  }

  if (rowNumber === -1) {
    throw new Error("Không tìm thấy dòng cần sửa.");
  }

  const currentNgayNhap =
    formatDateValue_(sheet.getRange(rowNumber, idx.ngayNhap + 1).getValue()) || todayText_();

  updateObjectRowByHeader_(sheet, rowNumber, {
    Id: id,
    maNguyenLieu: data.maNguyenLieu,
    tenNguyenLieu: data.tenNguyenLieu,
    khoiLuongNhap: data.khoiLuongNhap,
    donVi: data.donVi,
    quyCachDongGoi: data.quyCachDongGoi,
    LotNo: data.LotNo,
    ngaySanXuat: data.ngaySanXuat,
    hanSuDung: data.hanSuDung,
    nhaCungCap: data.nhaCungCap,
    ngayNhap: currentNgayNhap,
    trangThai: "Đã nhập",
    nguoiPheDuyetChatLuong: "",
    ngayPheDuyet: "",
    anhChatLuong: "",
    trangThaiNguyenLieu: "",
    loaiNguyenLieu: data.loaiNguyenLieu,
    MaKeToan: data.MaKeToan,
    heSoQuyDoiKho: data.heSoQuyDoiKho,
    doViTinhToan: data.doViTinhToan
  });

  return {
    success: true,
    id: id,
    message: "Đã cập nhật nguyên liệu nhập kho thành công.",
    khoHomNay: getTodayInventoryItems_()
  };
}

function deleteInventoryItem(token, id) {
  requireInventoryRole_(token);

  id = normalizeText_(id);

  if (!id) {
    throw new Error("Thiếu Id cần xóa.");
  }

  const sheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);
  ensureKhoHeader_(sheet);

  if (sheet.getLastRow() < 2) {
    return {
      success: true,
      message: "Không có dữ liệu để xóa.",
      khoHomNay: []
    };
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));
  const idx = getKhoHeaderIndex_(headers);

  for (let i = values.length - 1; i >= 1; i--) {
    if (normalizeText_(values[i][idx.Id]) === id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }

  return {
    success: true,
    message: "Đã xóa nguyên liệu nhập kho: " + id,
    khoHomNay: getTodayInventoryItems_()
  };
}

function getTodayInventoryItems(token) {
  requireInventoryRole_(token);

  return {
    success: true,
    khoHomNay: getTodayInventoryItems_()
  };
}

function getRecentInventoryItems_() {
  const sheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);
  ensureKhoHeader_(sheet);

  if (sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));
  const idx = getKhoHeaderIndex_(headers);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 2);

  function isInLast3Days(dateText) {
    if (!dateText) return false;

    const d = new Date(dateText);
    if (isNaN(d)) return false;

    d.setHours(0, 0, 0, 0);

    return d >= startDate && d <= today;
  }

  return values
    .slice(1)
    .filter(row => normalizeText_(row[idx.Id]))
    .filter(row => isInLast3Days(formatDateValue_(row[idx.ngayNhap])))
    .map(row => ({
      Id: normalizeText_(row[idx.Id]),
      maNguyenLieu: normalizeText_(row[idx.maNguyenLieu]),
      tenNguyenLieu: normalizeText_(row[idx.tenNguyenLieu]),
      khoiLuongNhap: row[idx.khoiLuongNhap],
      donVi: normalizeText_(row[idx.donVi]),
      quyCachDongGoi: normalizeText_(row[idx.quyCachDongGoi]),
      LotNo: normalizeText_(row[idx.LotNo]),
      ngaySanXuat: formatDateValue_(row[idx.ngaySanXuat]),
      hanSuDung: formatDateValue_(row[idx.hanSuDung]),
      nhaCungCap: normalizeText_(row[idx.nhaCungCap]),
      ngayNhap: formatDateValue_(row[idx.ngayNhap]),
      trangThai: normalizeText_(row[idx.trangThai]),
      nguoiPheDuyetChatLuong: normalizeText_(row[idx.nguoiPheDuyetChatLuong]),
      ngayPheDuyet: formatDateValue_(row[idx.ngayPheDuyet]),
      anhChatLuong: idx.anhChatLuong === -1 ? "" : normalizeText_(row[idx.anhChatLuong]),
      trangThaiNguyenLieu: idx.trangThaiNguyenLieu === -1 ? "" : normalizeText_(row[idx.trangThaiNguyenLieu]),
      loaiNguyenLieu: idx.loaiNguyenLieu === -1 ? "" : normalizeText_(row[idx.loaiNguyenLieu]),
      MaKeToan: idx.MaKeToan === -1 ? "" : normalizeText_(row[idx.MaKeToan]),
      heSoQuyDoiKho: idx.heSoQuyDoiKho === -1 ? "" : normalizeText_(row[idx.heSoQuyDoiKho]),
      doViTinhToan: idx.doViTinhToan === -1 ? "" : normalizeText_(row[idx.doViTinhToan])
    }))
    .sort((a, b) => {
      const dateCompare = String(b.ngayNhap || "").localeCompare(String(a.ngayNhap || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(b.Id || "").localeCompare(String(a.Id || ""));
    });
}

function getTodayInventoryItems_() {
  return getRecentInventoryItems_();
}

function createInboundOrder(token, itemIds) {
  const session = requireInventoryRole_(token);

  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new Error("Vui lòng thêm ít nhất 1 nguyên liệu vào đơn hàng nhập.");
  }

  const uniqueIds = [...new Set(itemIds.map(id => normalizeText_(id)).filter(Boolean))];

  if (uniqueIds.length === 0) {
    throw new Error("Danh sách nguyên liệu trong đơn hàng không hợp lệ.");
  }

  const khoSheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);
  ensureKhoHeader_(khoSheet);

  const khoValues = khoSheet.getDataRange().getValues();
  const khoHeaders = khoValues[0].map(h => normalizeText_(h));
  const idx = getKhoHeaderIndex_(khoHeaders);

  const mapById = {};

  khoValues.slice(1).forEach(row => {
    const id = normalizeText_(row[idx.Id]);

    if (id) {
      mapById[id] = {
        Id: id,
        maNguyenLieu: normalizeText_(row[idx.maNguyenLieu]),
        tenNguyenLieu: normalizeText_(row[idx.tenNguyenLieu]),
        khoiLuongNhap: row[idx.khoiLuongNhap],
        donVi: normalizeText_(row[idx.donVi]),
        quyCachDongGoi: normalizeText_(row[idx.quyCachDongGoi]),
        LotNo: normalizeText_(row[idx.LotNo]),
        ngaySanXuat: formatDateValue_(row[idx.ngaySanXuat]),
        hanSuDung: formatDateValue_(row[idx.hanSuDung]),
        nhaCungCap: normalizeText_(row[idx.nhaCungCap]),
        ngayNhap: formatDateValue_(row[idx.ngayNhap]),
        MaKeToan: idx.MaKeToan === -1 ? "" : normalizeText_(row[idx.MaKeToan]),
        heSoQuyDoiKho: idx.heSoQuyDoiKho === -1 ? "" : normalizeText_(row[idx.heSoQuyDoiKho]),
        doViTinhToan: idx.doViTinhToan === -1 ? "" : normalizeText_(row[idx.doViTinhToan])
      };
    }
  });

  const selectedItems = uniqueIds.map(id => mapById[id]).filter(Boolean);

  if (selectedItems.length === 0) {
    throw new Error("Không tìm thấy nguyên liệu đã chọn để tạo đơn hàng nhập.");
  }

  const donHangId = generateId_("DHNK");
  const ngayTaoDon = nowText_();

  const donSheet = getSheet_(SHEET_DON_HANG_NHAP_KHO);
  ensureDonHangNhapHeader_(donSheet);

  selectedItems.forEach(function(item) {
    appendObjectRowByHeader_(donSheet, {
      DonHangId: donHangId,
      IdKho: item.Id,
      maNguyenLieu: item.maNguyenLieu,
      tenNguyenLieu: item.tenNguyenLieu,
      khoiLuongNhap: item.khoiLuongNhap,
      donVi: item.donVi,
      quyCachDongGoi: item.quyCachDongGoi,
      LotNo: item.LotNo,
      ngaySanXuat: item.ngaySanXuat,
      hanSuDung: item.hanSuDung,
      nhaCungCap: item.nhaCungCap,
      ngayNhap: item.ngayNhap,
      ngayTaoDon: ngayTaoDon,
      nguoiTao: session.useName,
      trangThaiPheDuyet: "Chờ phê duyệt",
      MaKeToan: item.MaKeToan,
      heSoQuyDoiKho: item.heSoQuyDoiKho,
      doViTinhToan: item.doViTinhToan
    });
  });

  return {
    success: true,
    donHangId: donHangId,
    message: "Đã tạo đơn hàng nhập kho thành công, chờ phòng công nghệ phê duyệt.",
    soDong: selectedItems.length,
    khoHomNay: getTodayInventoryItems_()
  };
}

/**
 * Tạo map tra Nhà cung cấp theo Mã kế toán.
 *
 * Nguồn:
 * Sheet NguyenLieu
 * MaKeToan -> nhaCungCapCap
 *
 * Ví dụ:
 * {
 *   "561718TESTTTT": "Nhà cung cấp A",
 *   "KT001": "Nhà cung cấp B"
 * }
 */
function getNhaCungCapCapByMaKeToanMap_() {
  const sheet = getSheet_(SHEET_NGUYEN_LIEU);

  if (sheet.getLastRow() < 2) {
    return {};
  }

  const values = sheet
    .getDataRange()
    .getValues();

  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idxMaKeToan =
    headers.indexOf("MaKeToan");

  const idxNhaCungCapCap =
    headers.indexOf("nhaCungCapCap");

  if (idxMaKeToan === -1) {
    throw new Error(
      "Sheet NguyenLieu thiếu cột MaKeToan."
    );
  }

  if (idxNhaCungCapCap === -1) {
    throw new Error(
      "Sheet NguyenLieu thiếu cột nhaCungCapCap."
    );
  }

  const map = {};

  values
    .slice(1)
    .forEach(function(row) {

      const maKeToan =
        normalizeText_(
          row[idxMaKeToan]
        );

      const nhaCungCapCap =
        normalizeText_(
          row[idxNhaCungCapCap]
        );

      if (!maKeToan) {
        return;
      }

      // Dùng chữ thường để tránh lỗi khác hoa/thường
      map[maKeToan.toLowerCase()] =
        nhaCungCapCap;
    });

  return map;
}

function getApprovedInventoryItems(token) {
  requireInventoryRole_(token);

  return {
    success: true,
    tonKho: getApprovedInventoryItems_()
  };
}

function getApprovedInventoryItems_() {
  const sheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);
  ensureKhoHeader_(sheet);

  if (sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));
  const idx = getKhoHeaderIndex_(headers);

  const nhaCungCapCapMap =
  getNhaCungCapCapByMaKeToanMap_();

  return values
    .slice(1)
    .filter(row => normalizeText_(row[idx.Id]))
    .filter(row => {
      const trangThai = normalizeText_(row[idx.trangThai]).toLowerCase();

      const trangThaiNguyenLieu = idx.trangThaiNguyenLieu === -1
        ? "Sử dụng"
        : normalizeText_(row[idx.trangThaiNguyenLieu]);

      return trangThai === "đã phê duyệt" &&
            isUsableNguyenLieuStatus_(trangThaiNguyenLieu);
    })
    .filter(row => Number(row[idx.khoiLuongNhap]) > 0)
    .map(function(row) {

      const maKeToan =
        idx.MaKeToan === -1
          ? ""
          : normalizeText_(
              row[idx.MaKeToan]
            );

      const nhaCungCapCap =
        maKeToan
          ? (
              nhaCungCapCapMap[
                maKeToan.toLowerCase()
              ] || ""
            )
          : "";

      return {
        Id:
          normalizeText_(row[idx.Id]),

        maNguyenLieu:
          normalizeText_(row[idx.maNguyenLieu]),

        tenNguyenLieu:
          normalizeText_(row[idx.tenNguyenLieu]),

        khoiLuongNhap:
          row[idx.khoiLuongNhap],

        donVi:
          normalizeText_(row[idx.donVi]),

        quyCachDongGoi:
          normalizeText_(row[idx.quyCachDongGoi]),

        LotNo:
          normalizeText_(row[idx.LotNo]),

        ngaySanXuat:
          formatDateValue_(row[idx.ngaySanXuat]),

        hanSuDung:
          formatDateValue_(row[idx.hanSuDung]),

        // Nhà sản xuất đang lưu trong KhoNguyenLieu
        nhaCungCap:
          normalizeText_(row[idx.nhaCungCap]),

        // Mã kế toán lấy từ KhoNguyenLieu
        MaKeToan:
          maKeToan,

        // Nhà cung cấp lấy từ NguyenLieu theo MaKeToan
        nhaCungCapCap:
          nhaCungCapCap,

        ngayNhap:
          formatDateValue_(row[idx.ngayNhap]),

        trangThai:
          normalizeText_(row[idx.trangThai]),

        nguoiPheDuyetChatLuong:
          normalizeText_(
            row[idx.nguoiPheDuyetChatLuong]
          ),

        ngayPheDuyet:
          formatDateValue_(
            row[idx.ngayPheDuyet]
          ),

        anhChatLuong:
          idx.anhChatLuong === -1
            ? ""
            : normalizeText_(
                row[idx.anhChatLuong]
              ),

        trangThaiNguyenLieu:
          idx.trangThaiNguyenLieu === -1
            ? ""
            : normalizeText_(
                row[idx.trangThaiNguyenLieu]
              ),

        loaiNguyenLieu:
          idx.loaiNguyenLieu === -1
            ? ""
            : normalizeText_(
                row[idx.loaiNguyenLieu]
              ),

        heSoQuyDoiKho:
          idx.heSoQuyDoiKho === -1
            ? ""
            : normalizeText_(
                row[idx.heSoQuyDoiKho]
              ),

        doViTinhToan:
          idx.doViTinhToan === -1
            ? ""
            : normalizeText_(
                row[idx.doViTinhToan]
              )
      };
    })
    .sort((a, b) => String(b.ngayNhap || "").localeCompare(String(a.ngayNhap || "")));
}

function getPendingInventoryItems(token) {
  requireInventoryRole_(token);

  return {
    success: true,
    chuaDuyet: getPendingInventoryItems_()
  };
}

function getPendingInventoryItems_() {
  const sheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);
  ensureKhoHeader_(sheet);

  if (sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));
  const idx = getKhoHeaderIndex_(headers);

  return values
    .slice(1)
    .filter(row => normalizeText_(row[idx.Id]))
    .filter(row => {
      const status = normalizeText_(row[idx.trangThai]).toLowerCase();
      return status !== "đã phê duyệt" && status !== "đã xuất hết";
    })
    .map(row => ({
      Id: normalizeText_(row[idx.Id]),
      maNguyenLieu: normalizeText_(row[idx.maNguyenLieu]),
      tenNguyenLieu: normalizeText_(row[idx.tenNguyenLieu]),
      khoiLuongNhap: row[idx.khoiLuongNhap],
      donVi: normalizeText_(row[idx.donVi]),
      quyCachDongGoi: normalizeText_(row[idx.quyCachDongGoi]),
      LotNo: normalizeText_(row[idx.LotNo]),
      ngaySanXuat: formatDateValue_(row[idx.ngaySanXuat]),
      hanSuDung: formatDateValue_(row[idx.hanSuDung]),
      nhaCungCap: normalizeText_(row[idx.nhaCungCap]),
      ngayNhap: formatDateValue_(row[idx.ngayNhap]),
      trangThai: normalizeText_(row[idx.trangThai]),
      nguoiPheDuyetChatLuong: normalizeText_(row[idx.nguoiPheDuyetChatLuong]),
      ngayPheDuyet: formatDateValue_(row[idx.ngayPheDuyet]),
      anhChatLuong: idx.anhChatLuong === -1 ? "" : normalizeText_(row[idx.anhChatLuong]),
      trangThaiNguyenLieu: idx.trangThaiNguyenLieu === -1 ? "" : normalizeText_(row[idx.trangThaiNguyenLieu]),
      loaiNguyenLieu: idx.loaiNguyenLieu === -1 ? "" : normalizeText_(row[idx.loaiNguyenLieu]),
      MaKeToan: idx.MaKeToan === -1 ? "" : normalizeText_(row[idx.MaKeToan]),
      heSoQuyDoiKho: idx.heSoQuyDoiKho === -1 ? "" : normalizeText_(row[idx.heSoQuyDoiKho]),
      doViTinhToan: idx.doViTinhToan === -1 ? "" : normalizeText_(row[idx.doViTinhToan])
    }))
    .sort((a, b) => String(b.ngayNhap || "").localeCompare(String(a.ngayNhap || "")));
}


/********************* PHIẾU XUẤT NGUYÊN LIỆU - THỦ KHO PHÊ DUYỆT *********************/

function ensurePhieuXuatHeader_(sheet) {
  const expectedHeaders = [
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
  ];

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return;
  }

  const currentLastCol = Math.max(sheet.getLastColumn(), expectedHeaders.length);
  let headers = sheet.getRange(1, 1, 1, currentLastCol).getValues()[0].map(h => normalizeText_(h));
  const isEmptyHeader = headers.every(h => !h);

  if (isEmptyHeader) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return;
  }

  expectedHeaders.forEach(function(header) {
    headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), expectedHeaders.length)).getValues()[0].map(h => normalizeText_(h));
    if (headers.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
    }
  });
}

function getPhieuXuatSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(SHEET_PHIEU_XUAT_NGUYEN_LIEU);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PHIEU_XUAT_NGUYEN_LIEU);
  }

  ensurePhieuXuatHeader_(sheet);
  return sheet;
}

function getPhieuXuatHeaderIndex_(headers) {
  const required = [
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
  ];

  const idx = {};
  required.forEach(function(name) {
    idx[name] = headers.indexOf(name);
    if (idx[name] === -1) {
      throw new Error("Sheet PhieuXuatNguyenLieu thiếu cột: " + name);
    }
  });

  return idx;
}

function normalizeStatus_(value) {
  return normalizeText_(value).toLowerCase();
}

function isPendingExportStatus_(status) {
  const s = normalizeStatus_(status);
  return !s ||
    s === "chờ thủ kho phê duyệt" ||
    s === "cho thu kho phe duyet" ||
    s === "chờ phê duyệt" ||
    s === "cho phe duyet";
}

function isApprovedInventoryStatus_(status) {
  return normalizeStatus_(status) === "đã phê duyệt";
}

function isUsableNguyenLieuStatus_(value) {
  const s = normalizeText_(value).toLowerCase();

  return s === "sử dụng" || s === "su dung";
}

function unitToKgFactor_(donVi) {
  const u = normalizeText_(donVi).toLowerCase();

  if (u === "g") return 0.001;
  if (u === "kg") return 1;
  if (u === "tấn" || u === "tan" || u === "t") return 1000;

  throw new Error("Đơn vị không hỗ trợ quy đổi: " + donVi);
}

function toKg_(value, donVi) {
  const n = Number(value);
  if (!isFinite(n)) return 0;
  return n * unitToKgFactor_(donVi);
}

function fromKg_(kgValue, donVi) {
  return kgValue / unitToKgFactor_(donVi);
}

function roundQty_(value) {
  const n = Number(value);
  if (!isFinite(n)) return 0;
  return Math.round(n * 1000000) / 1000000;
}

function getApprovedStockLotsByMaterial_(tenNguyenLieu) {
  const sheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);
  ensureKhoHeader_(sheet);

  if (sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));
  const idx = getKhoHeaderIndex_(headers);
  const targetName = normalizeText_(tenNguyenLieu).toLowerCase();

  const lots = [];

  values.slice(1).forEach(function(row, offset) {
    const rowNumber = offset + 2;
    const id = normalizeText_(row[idx.Id]);
    const name = normalizeText_(row[idx.tenNguyenLieu]);
    const status = normalizeText_(row[idx.trangThai]);

    const trangThaiNguyenLieu = idx.trangThaiNguyenLieu === -1
      ? "Sử dụng"
      : normalizeText_(row[idx.trangThaiNguyenLieu]);

    const qty = Number(row[idx.khoiLuongNhap]);
    const unit = normalizeText_(row[idx.donVi]);

    if (!id || name.toLowerCase() !== targetName) return;
    if (!isApprovedInventoryStatus_(status)) return;
    if (!isUsableNguyenLieuStatus_(trangThaiNguyenLieu)) return;
    if (!isFinite(qty) || qty <= 0) return;

    lots.push({
      rowNumber: rowNumber,
      Id: id,
      maNguyenLieu: normalizeText_(row[idx.maNguyenLieu]),
      tenNguyenLieu: name,
      khoiLuongNhap: qty,
      donVi: unit,
      quyCachDongGoi: normalizeText_(row[idx.quyCachDongGoi]),
      LotNo: normalizeText_(row[idx.LotNo]),
      ngaySanXuat: formatDateValue_(row[idx.ngaySanXuat]),
      hanSuDung: formatDateValue_(row[idx.hanSuDung]),
      nhaCungCap: normalizeText_(row[idx.nhaCungCap]),
      ngayNhap: formatDateValue_(row[idx.ngayNhap]),
      anhChatLuong: idx.anhChatLuong === -1 ? "" : normalizeText_(row[idx.anhChatLuong]),
      trangThaiNguyenLieu: trangThaiNguyenLieu,
      loaiNguyenLieu: idx.loaiNguyenLieu === -1 ? "" : normalizeText_(row[idx.loaiNguyenLieu]),
      MaKeToan: idx.MaKeToan === -1 ? "" : normalizeText_(row[idx.MaKeToan]),
      heSoQuyDoiKho: idx.heSoQuyDoiKho === -1 ? "" : normalizeText_(row[idx.heSoQuyDoiKho]),
      doViTinhToan: idx.doViTinhToan === -1 ? "" : normalizeText_(row[idx.doViTinhToan]),
      qtyKg: toKg_(qty, unit)
    });
  });

  lots.sort(function(a, b) {
    const hsdCompare = String(a.hanSuDung || "9999-12-31").localeCompare(String(b.hanSuDung || "9999-12-31"));
    if (hsdCompare !== 0) return hsdCompare;
    return String(a.ngayNhap || "9999-12-31").localeCompare(String(b.ngayNhap || "9999-12-31"));
  });

  return lots;
}

function getApprovedStockLotsForExport_(maNguyenLieu, tenNguyenLieu, maKeToan) {
  const sheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);
  ensureKhoHeader_(sheet);

  if (sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));
  const idx = getKhoHeaderIndex_(headers);

  const targetMa = normalizeText_(maNguyenLieu).toLowerCase();
  const targetName = normalizeText_(tenNguyenLieu).toLowerCase();
  const targetMaKeToan = normalizeText_(maKeToan).toLowerCase();

  const lots = [];

  values.slice(1).forEach(function(row, offset) {
    const rowNumber = offset + 2;

    const id = normalizeText_(row[idx.Id]);
    const ma = normalizeText_(row[idx.maNguyenLieu]);
    const name = normalizeText_(row[idx.tenNguyenLieu]);
    const status = normalizeText_(row[idx.trangThai]);

    const rowMaKeToan = idx.MaKeToan === -1
      ? ""
      : normalizeText_(row[idx.MaKeToan]);

    const trangThaiNguyenLieu = idx.trangThaiNguyenLieu === -1
      ? "Sử dụng"
      : normalizeText_(row[idx.trangThaiNguyenLieu]);

    const qty = Number(row[idx.khoiLuongNhap]);
    const unit = normalizeText_(row[idx.donVi]);

    // ==========================================
    // PHẢI KHỚP ĐÚNG 3 ĐIỀU KIỆN
    // ==========================================
    if (!id) return;

    if (ma.toLowerCase() !== targetMa) return;

    if (name.toLowerCase() !== targetName) return;

    if (rowMaKeToan.toLowerCase() !== targetMaKeToan) return;

    // Chỉ lấy tồn kho đã được duyệt
    if (!isApprovedInventoryStatus_(status)) return;

    // Chỉ lấy nguyên liệu được phép sử dụng
    if (!isUsableNguyenLieuStatus_(trangThaiNguyenLieu)) return;

    // Phải còn tồn
    if (!isFinite(qty) || qty <= 0) return;

    lots.push({
      rowNumber: rowNumber,

      Id: id,

      maNguyenLieu: ma,
      tenNguyenLieu: name,
      MaKeToan: rowMaKeToan,

      khoiLuongNhap: qty,
      donVi: unit,

      quyCachDongGoi: normalizeText_(row[idx.quyCachDongGoi]),
      LotNo: normalizeText_(row[idx.LotNo]),

      ngaySanXuat: formatDateValue_(row[idx.ngaySanXuat]),
      hanSuDung: formatDateValue_(row[idx.hanSuDung]),

      nhaCungCap: normalizeText_(row[idx.nhaCungCap]),
      ngayNhap: formatDateValue_(row[idx.ngayNhap]),

      trangThaiNguyenLieu: trangThaiNguyenLieu,

      loaiNguyenLieu: idx.loaiNguyenLieu === -1
        ? ""
        : normalizeText_(row[idx.loaiNguyenLieu]),

      heSoQuyDoiKho: idx.heSoQuyDoiKho === -1
        ? ""
        : normalizeText_(row[idx.heSoQuyDoiKho]),

      doViTinhToan: idx.doViTinhToan === -1
        ? ""
        : normalizeText_(row[idx.doViTinhToan]),

      qtyKg: toKg_(qty, unit)
    });
  });

  // ==========================================
  // FEFO
  // 1. HSD gần nhất trước
  // 2. Nếu cùng HSD -> ngày nhập cũ hơn trước
  // ==========================================
  lots.sort(function(a, b) {

    const hsdCompare =
      String(a.hanSuDung || "9999-12-31")
        .localeCompare(
          String(b.hanSuDung || "9999-12-31")
        );

    if (hsdCompare !== 0) {
      return hsdCompare;
    }

    return String(a.ngayNhap || "9999-12-31")
      .localeCompare(
        String(b.ngayNhap || "9999-12-31")
      );
  });

  return lots;
}

function getAvailableKgForExport_(maNguyenLieu, tenNguyenLieu, maKeToan) {

  return getApprovedStockLotsForExport_(
    maNguyenLieu,
    tenNguyenLieu,
    maKeToan
  ).reduce(function(sum, item) {

    return sum + Number(item.qtyKg || 0);

  }, 0);
}



function fillExportStockDetails_(phieuSheet, pIdx, rowNumber, deductedIds) {
  if (!Array.isArray(deductedIds) || deductedIds.length === 0) {
    throw new Error("Không có Id kho đã trừ để cập nhật phiếu xuất.");
  }

  // Dữ liệu lô kho được chụp TRƯỚC khi trừ kho.
  const selectedLots = deductedIds.beforeLots;

  if (!Array.isArray(selectedLots) ||
      selectedLots.length !== deductedIds.length) {
    throw new Error(
      "Thiếu dữ liệu tồn kho trước khi trừ. Không thể cập nhật phiếu xuất."
    );
  }

  function joinField(fieldName) {
    return selectedLots.map(function(lot) {
      const value = lot[fieldName];
      return value === null || value === undefined
        ? ""
        : String(value);
    }).join(", ");
  }

  const idText = deductedIds.join(", ");

  const details = {
    IdKho: idText,

    // Khối lượng tồn kho TRƯỚC khi trừ.
    khoiLuongKho: joinField("khoiLuongNhap"),

    donViKho: joinField("donVi"),
    quyCachDongGoi: joinField("quyCachDongGoi"),
    LotNo: joinField("LotNo"),
    ngaySanXuatKho: joinField("ngaySanXuat"),
    hanSuDung: joinField("hanSuDung"),
    nhaCungCap: joinField("nhaCungCap"),
    ngayNhap: joinField("ngayNhap"),

    IdKhoDaTru: idText
  };

  Object.keys(details).forEach(function(fieldName) {
    phieuSheet
      .getRange(rowNumber, pIdx[fieldName] + 1)
      .setValue(details[fieldName]);
  });
}



function deductApprovedStockForExport_(
  maNguyenLieu,
  tenNguyenLieu,
  maKeToan,
  requiredKg
) {

  const khoSheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);
  ensureKhoHeader_(khoSheet);

  const headers = khoSheet
    .getRange(1, 1, 1, khoSheet.getLastColumn())
    .getValues()[0]
    .map(h => normalizeText_(h));

  const idx = getKhoHeaderIndex_(headers);

  const lots = getApprovedStockLotsForExport_(
    maNguyenLieu,
    tenNguyenLieu,
    maKeToan
  );

  let remainingKg = requiredKg;

  const deductedIds = [];

  // Lưu dữ liệu các lô thực sự được trừ,
  // tại thời điểm TRƯỚC khi cập nhật tồn kho.
  const beforeLots = [];

  lots.forEach(function(lot) {

    if (remainingKg <= 0.000001) return;

    const deductKg = Math.min(
      lot.qtyKg,
      remainingKg
    );

    const newQtyKg =
      lot.qtyKg - deductKg;

    const newQtyOriginalUnit =
      roundQty_(
        fromKg_(
          Math.max(0, newQtyKg),
          lot.donVi
        )
      );

    // Cập nhật tồn kho
    khoSheet
      .getRange(
        lot.rowNumber,
        idx.khoiLuongNhap + 1
      )
      .setValue(newQtyOriginalUnit);

    if (
      deductKg > 0.000001 &&
      deductedIds.indexOf(lot.Id) === -1
    ) {
      deductedIds.push(lot.Id);

      // lot.khoiLuongNhap là tồn kho trước khi trừ.
      beforeLots.push({
        Id: lot.Id,
        khoiLuongNhap: lot.khoiLuongNhap,
        donVi: lot.donVi,
        quyCachDongGoi: lot.quyCachDongGoi,
        LotNo: lot.LotNo,
        ngaySanXuat: lot.ngaySanXuat,
        hanSuDung: lot.hanSuDung,
        nhaCungCap: lot.nhaCungCap,
        ngayNhap: lot.ngayNhap
      });
    }

    // Nếu lô đã hết
    if (newQtyOriginalUnit <= 0.000001) {

      khoSheet
        .getRange(
          lot.rowNumber,
          idx.trangThai + 1
        )
        .setValue("Đã xuất hết");
    }

    remainingKg -= deductKg;
  });

  if (remainingKg > 0.000001) {

    throw new Error(
      "Không đủ tồn kho cho " +
      maNguyenLieu + " - " +
      tenNguyenLieu + " - Mã kế toán " +
      maKeToan +
      "."
    );
  }

  deductedIds.beforeLots = beforeLots;

  return deductedIds;
}

function getAvailableKgByMaterial_(tenNguyenLieu) {
  return getApprovedStockLotsByMaterial_(tenNguyenLieu).reduce(function(sum, item) {
    return sum + Number(item.qtyKg || 0);
  }, 0);
}

function getPendingExportRequests(token) {
  requireInventoryRole_(token);

  return {
    success: true,
    phieuXuatChoDuyet: getPendingExportRequests_()
  };
}

function getPendingExportRequests_() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(SHEET_PHIEU_XUAT_NGUYEN_LIEU);

  if (!sheet) return [];

  ensurePhieuXuatHeader_(sheet);

  if (sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));
  const idx = getPhieuXuatHeaderIndex_(headers);
  const groups = {};

  values.slice(1).forEach(function(row, offset) {
    const rowNumber = offset + 2;
    const phieuXuatId = normalizeText_(row[idx.PhieuXuatId]);
    const status = normalizeText_(row[idx.trangThaiPheDuyet]);

    if (!phieuXuatId || !isPendingExportStatus_(status)) return;

    const maNguyenLieu = normalizeText_(row[idx.maNguyenLieu]);
    const tenNguyenLieu = normalizeText_(row[idx.tenNguyenLieu]);
    const maKeToan = normalizeText_(row[idx.MaKeToan]);

    const khoiLuongCanXuat = Number(row[idx.khoiLuongCanXuat]);
    const khoiLuongXuatThucTeRaw = row[idx.khoiLuongXuatThucTe];
    const khoiLuongXuatThucTe = Number(khoiLuongXuatThucTeRaw);
    const effectiveQty = isFinite(khoiLuongXuatThucTe) && khoiLuongXuatThucTe > 0
      ? khoiLuongXuatThucTe
      : khoiLuongCanXuat;
    const donViCanXuat = normalizeText_(row[idx.donViCanXuat]);
    const availableKg = getAvailableKgForExport_(
      maNguyenLieu,
      tenNguyenLieu,
      maKeToan
    );
    const requiredKg = toKg_(effectiveQty, donViCanXuat);

    if (!groups[phieuXuatId]) {
      groups[phieuXuatId] = {
        PhieuXuatId: phieuXuatId,
        KeHoachId: normalizeText_(row[idx.KeHoachId]),
        tenBaiLieu: normalizeText_(row[idx.tenBaiLieu]),
        soLuong: row[idx.soLuong],
        NgaySanXuat: formatDateValue_(row[idx.NgaySanXuat]),
        nguoiTao: normalizeText_(row[idx.nguoiTao]),
        ngayTao: normalizeText_(row[idx.ngayTao]),
        items: []
      };
    }

    groups[phieuXuatId].items.push({
      rowNumber: rowNumber,
      PhieuXuatId: phieuXuatId,
      KeHoachId: normalizeText_(row[idx.KeHoachId]),
      tenBaiLieu: normalizeText_(row[idx.tenBaiLieu]),
      soLuong: row[idx.soLuong],
      NgaySanXuat: formatDateValue_(row[idx.NgaySanXuat]),
      STT: row[idx.STT],
      maNguyenLieu: maNguyenLieu,
      tenNguyenLieu: tenNguyenLieu,
      MaKeToan: maKeToan,
      khoiLuongCanXuat: khoiLuongCanXuat,
      khoiLuongXuatThucTe: isFinite(khoiLuongXuatThucTe) && khoiLuongXuatThucTe > 0 ? khoiLuongXuatThucTe : "",
      donViCanXuat: donViCanXuat,
      sttTron: row[idx.sttTron],
      canSuDung: normalizeText_(row[idx.canSuDung]),
      IdKho: normalizeText_(row[idx.IdKho]),
      khoiLuongKho: row[idx.khoiLuongKho],
      donViKho: normalizeText_(row[idx.donViKho]),
      quyCachDongGoi: normalizeText_(row[idx.quyCachDongGoi]),
      LotNo: normalizeText_(row[idx.LotNo]),
      ngaySanXuatKho: formatDateValue_(row[idx.ngaySanXuatKho]),
      hanSuDung: formatDateValue_(row[idx.hanSuDung]),
      nhaCungCap: normalizeText_(row[idx.nhaCungCap]),
      ngayNhap: formatDateValue_(row[idx.ngayNhap]),
      nguoiTao: normalizeText_(row[idx.nguoiTao]),
      ngayTao: normalizeText_(row[idx.ngayTao]),
      trangThaiPheDuyet: status || "Chờ thủ kho phê duyệt",
      cachXuat: normalizeText_(row[idx.cachXuat]),
      nguoiPheDuyet: normalizeText_(row[idx.nguoiPheDuyet]),
      thoiGianDuyet: normalizeText_(row[idx.thoiGianDuyet]),
      IdKhoDaTru: normalizeText_(row[idx.IdKhoDaTru]),
      tonKhoKhaDung: roundQty_(fromKg_(availableKg, donViCanXuat)),
      duSoLuong: availableKg + 0.000001 >= requiredKg
    });
  });

  return Object.values(groups).sort(function(a, b) {
    return String(b.ngayTao || "").localeCompare(String(a.ngayTao || ""));
  });
}

function updateExportLineFields_(sheet, idx, rowNumber, khoiLuongCanXuat, khoiLuongXuatThucTe, cachXuat, requireActualQty) {
  const plannedQty = Number(khoiLuongCanXuat);
  const actualQty = Number(khoiLuongXuatThucTe);

  if (!isFinite(plannedQty) || plannedQty <= 0) {
    throw new Error("Khối lượng cần xuất phải là số lớn hơn 0.");
  }

  if (requireActualQty && (!isFinite(actualQty) || actualQty <= 0)) {
    throw new Error("Khối lượng xuất thực tế phải là số lớn hơn 0.");
  }

  sheet.getRange(rowNumber, idx.khoiLuongCanXuat + 1).setValue(plannedQty);

  if (isFinite(actualQty) && actualQty > 0) {
    sheet.getRange(rowNumber, idx.khoiLuongXuatThucTe + 1).setValue(actualQty);
  } else {
    sheet.getRange(rowNumber, idx.khoiLuongXuatThucTe + 1).setValue("");
  }

  sheet.getRange(rowNumber, idx.cachXuat + 1).setValue(normalizeText_(cachXuat));
}

function approveExportLine(token, payload) {
  const session = requireInventoryRole_(token);
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const rowNumber = Number(payload && payload.rowNumber);
    const khoiLuongCanXuat = Number(payload && payload.khoiLuongCanXuat);
    const khoiLuongXuatThucTe = Number(payload && payload.khoiLuongXuatThucTe);
    const cachXuat = normalizeText_(payload && payload.cachXuat);

    if (!rowNumber || rowNumber < 2) {
      throw new Error("Thiếu dòng phiếu xuất cần phê duyệt.");
    }

    const phieuSheet = getPhieuXuatSheet_();
    const phieuValues = phieuSheet.getDataRange().getValues();
    const phieuHeaders = phieuValues[0].map(h => normalizeText_(h));
    const pIdx = getPhieuXuatHeaderIndex_(phieuHeaders);

    if (rowNumber > phieuSheet.getLastRow()) {
      throw new Error("Dòng phiếu xuất không tồn tại.");
    }

    const row = phieuSheet.getRange(rowNumber, 1, 1, phieuSheet.getLastColumn()).getValues()[0];
    const status = normalizeText_(row[pIdx.trangThaiPheDuyet]);

    if (!isPendingExportStatus_(status)) {
      throw new Error("Dòng này đã được xử lý, trạng thái hiện tại: " + status);
    }

    updateExportLineFields_(phieuSheet, pIdx, rowNumber, khoiLuongCanXuat, khoiLuongXuatThucTe, cachXuat, true);

    const maNguyenLieu =
      normalizeText_(row[pIdx.maNguyenLieu]);

    const tenNguyenLieu =
      normalizeText_(row[pIdx.tenNguyenLieu]);

    const maKeToan =
      normalizeText_(row[pIdx.MaKeToan]);

    const donViCanXuat =
      normalizeText_(row[pIdx.donViCanXuat]);

    if (!maKeToan) {
      throw new Error(
        "Dòng phiếu xuất chưa có Mã kế toán: " +
        maNguyenLieu + " - " + tenNguyenLieu
      );
    }

    const requiredKg =
      toKg_(
        khoiLuongXuatThucTe,
        donViCanXuat
      );

    const availableKg =
      getAvailableKgForExport_(
        maNguyenLieu,
        tenNguyenLieu,
        maKeToan
      );

    if (availableKg + 0.000001 < requiredKg) {
      throw new Error(
        "Không đủ số lượng tồn kho cho " + tenNguyenLieu +
        ". Cần thực xuất " + khoiLuongXuatThucTe + " " + donViCanXuat +
        ", tồn khả dụng " + roundQty_(fromKg_(availableKg, donViCanXuat)) + " " + donViCanXuat +
        ". Vui lòng hủy nguyên liệu này hoặc sửa khối lượng cần xuất."
      );
    }

    const deductedIds =
      deductApprovedStockForExport_(
        maNguyenLieu,
        tenNguyenLieu,
        maKeToan,
        requiredKg
      );

    phieuSheet.getRange(rowNumber, pIdx.trangThaiPheDuyet + 1).setValue("Đã phê duyệt");
    phieuSheet.getRange(rowNumber, pIdx.nguoiPheDuyet + 1).setValue(session.useName || "");
    phieuSheet.getRange(rowNumber, pIdx.thoiGianDuyet + 1).setValue(nowText_());
    
    fillExportStockDetails_(
      phieuSheet,
      pIdx,
      rowNumber,
      deductedIds
    );


    return {
      success: true,
      message:
        "Đã phê duyệt và trừ kho: " +
        maNguyenLieu + " - " +
        tenNguyenLieu + " - " +
        maKeToan,
      phieuXuatChoDuyet: getPendingExportRequests_(),
      tonKho: getApprovedInventoryItems_(),
      chuaDuyet: getPendingInventoryItems_()
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

function approveExportRequest(token, payload) {
  const session = requireInventoryRole_(token);
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const phieuXuatId = normalizeText_(payload && payload.phieuXuatId);
    const clientItems = payload && Array.isArray(payload.items) ? payload.items : [];

    if (!phieuXuatId) {
      throw new Error("Thiếu mã phiếu xuất cần phê duyệt.");
    }

    if (clientItems.length === 0) {
      throw new Error("Phiếu xuất không có dòng nguyên liệu để phê duyệt.");
    }

    const clientMap = {};
    clientItems.forEach(function(item) {
      const rowNumber = Number(item && item.rowNumber);
      if (rowNumber && rowNumber >= 2) {
        clientMap[rowNumber] = item;
      }
    });

    const phieuSheet = getPhieuXuatSheet_();
    const phieuValues = phieuSheet.getDataRange().getValues();
    const phieuHeaders = phieuValues[0].map(h => normalizeText_(h));
    const pIdx = getPhieuXuatHeaderIndex_(phieuHeaders);

    const lines = [];

    for (let r = 1; r < phieuValues.length; r++) {
      const row = phieuValues[r];
      const rowNumber = r + 1;
      const rowPhieuXuatId = normalizeText_(row[pIdx.PhieuXuatId]);
      const status = normalizeText_(row[pIdx.trangThaiPheDuyet]);

      if (rowPhieuXuatId === phieuXuatId && isPendingExportStatus_(status)) {
        const clientItem = clientMap[rowNumber];

        if (!clientItem) {
          throw new Error("Thiếu dữ liệu nhập trên giao diện cho dòng " + rowNumber + ".");
        }

        const khoiLuongCanXuat = Number(clientItem.khoiLuongCanXuat);
        const khoiLuongXuatThucTe = roundQty_(khoiLuongCanXuat * 1.05);
        const cachXuat = normalizeText_(clientItem.cachXuat);

        if (!isFinite(khoiLuongCanXuat) || khoiLuongCanXuat <= 0) {
          throw new Error("Dòng " + rowNumber + ": Khối lượng cần xuất phải lớn hơn 0.");
        }

        if (!isFinite(khoiLuongXuatThucTe) || khoiLuongXuatThucTe <= 0) {
          throw new Error("Dòng " + rowNumber + ": Khối lượng xuất thực tế phải lớn hơn 0.");
        }

        const maNguyenLieu =
          normalizeText_(row[pIdx.maNguyenLieu]);

        const tenNguyenLieu =
          normalizeText_(row[pIdx.tenNguyenLieu]);

        const maKeToan =
          normalizeText_(row[pIdx.MaKeToan]);

        if (!maKeToan) {
          throw new Error(
            "Dòng " + rowNumber +
            " chưa có Mã kế toán: " +
            maNguyenLieu + " - " +
            tenNguyenLieu
          );
        }

        lines.push({
          rowNumber: rowNumber,
          row: row,

          maNguyenLieu: maNguyenLieu,
          tenNguyenLieu: tenNguyenLieu,
          MaKeToan: maKeToan,

          donViCanXuat:
            normalizeText_(row[pIdx.donViCanXuat]),

          khoiLuongCanXuat:
            khoiLuongCanXuat,

          khoiLuongXuatThucTe:
            khoiLuongXuatThucTe,

          cachXuat:
            cachXuat
        });
      }
    }

    if (lines.length === 0) {
      throw new Error("Phiếu xuất này không còn dòng nào đang chờ phê duyệt.");
    }

    // Kiểm tra tổng tồn theo từng nguyên liệu trước khi trừ kho.
    // Việc này tránh duyệt được vài dòng rồi lỗi ở dòng sau.
    const requiredByMaterial = {};

    lines.forEach(function(line) {

      const key =
        normalizeText_(line.maNguyenLieu).toLowerCase() +
        "||" +
        normalizeText_(line.tenNguyenLieu).toLowerCase() +
        "||" +
        normalizeText_(line.MaKeToan).toLowerCase();

      if (!requiredByMaterial[key]) {

        requiredByMaterial[key] = {
          maNguyenLieu: line.maNguyenLieu,
          tenNguyenLieu: line.tenNguyenLieu,
          MaKeToan: line.MaKeToan,
          donViCanXuat: line.donViCanXuat,
          requiredKg: 0
        };
      }

      requiredByMaterial[key].requiredKg +=
        toKg_(
          line.khoiLuongXuatThucTe,
          line.donViCanXuat
        );
    });


    Object.keys(requiredByMaterial)
      .forEach(function(key) {

        const item =
          requiredByMaterial[key];

        const availableKg =
          getAvailableKgForExport_(
            item.maNguyenLieu,
            item.tenNguyenLieu,
            item.MaKeToan
          );

        if (
          availableKg + 0.000001 <
          item.requiredKg
        ) {

          throw new Error(
            "Không đủ tồn kho cho " +
            item.maNguyenLieu + " - " +
            item.tenNguyenLieu +
            " - Mã kế toán " +
            item.MaKeToan +
            ". Cần thực xuất " +
            roundQty_(
              fromKg_(
                item.requiredKg,
                item.donViCanXuat
              )
            ) +
            " " +
            item.donViCanXuat +
            ", tồn khả dụng " +
            roundQty_(
              fromKg_(
                availableKg,
                item.donViCanXuat
              )
            ) +
            " " +
            item.donViCanXuat +
            "."
          );
        }
      });

    const approvedAt = nowText_();
    let approvedCount = 0;

    lines.forEach(function(line) {
      updateExportLineFields_(
        phieuSheet,
        pIdx,
        line.rowNumber,
        line.khoiLuongCanXuat,
        line.khoiLuongXuatThucTe,
        line.cachXuat,
        true
      );

      const requiredKg = toKg_(line.khoiLuongXuatThucTe, line.donViCanXuat);
      const deductedIds =
        deductApprovedStockForExport_(
          line.maNguyenLieu,
          line.tenNguyenLieu,
          line.MaKeToan,
          requiredKg
        );

      phieuSheet.getRange(line.rowNumber, pIdx.trangThaiPheDuyet + 1).setValue("Đã phê duyệt");
      phieuSheet.getRange(line.rowNumber, pIdx.nguoiPheDuyet + 1).setValue(session.useName || "");
      phieuSheet.getRange(line.rowNumber, pIdx.thoiGianDuyet + 1).setValue(approvedAt);
      
      fillExportStockDetails_(
        phieuSheet,
        pIdx,
        line.rowNumber,
        deductedIds
      );


      approvedCount++;
    });

    return {
      success: true,
      message: "Đã phê duyệt toàn bộ phiếu xuất " + phieuXuatId + ". Số dòng đã duyệt: " + approvedCount,
      phieuXuatChoDuyet: getPendingExportRequests_(),
      tonKho: getApprovedInventoryItems_(),
      chuaDuyet: getPendingInventoryItems_()
    };

  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

function deductApprovedStockByExpiry_(tenNguyenLieu, requiredKg) {
  const khoSheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);
  ensureKhoHeader_(khoSheet);

  const headers = khoSheet.getRange(1, 1, 1, khoSheet.getLastColumn()).getValues()[0].map(h => normalizeText_(h));
  const idx = getKhoHeaderIndex_(headers);
  const lots = getApprovedStockLotsByMaterial_(tenNguyenLieu);
  let remainingKg = requiredKg;
  const deductedIds = [];

  lots.forEach(function(lot) {
    if (remainingKg <= 0.000001) return;

    const deductKg = Math.min(lot.qtyKg, remainingKg);
    const newQtyKg = lot.qtyKg - deductKg;
    const newQtyOriginalUnit = roundQty_(fromKg_(Math.max(0, newQtyKg), lot.donVi));

    khoSheet.getRange(lot.rowNumber, idx.khoiLuongNhap + 1).setValue(newQtyOriginalUnit);

    if (deductKg > 0.000001 && deductedIds.indexOf(lot.Id) === -1) {
      deductedIds.push(lot.Id);
    }

    if (newQtyOriginalUnit <= 0.000001) {
      khoSheet.getRange(lot.rowNumber, idx.trangThai + 1).setValue("Đã xuất hết");
    }

    remainingKg -= deductKg;
  });

  if (remainingKg > 0.000001) {
    throw new Error("Không đủ số lượng tồn kho để trừ. Vui lòng tải lại dữ liệu và kiểm tra tồn kho.");
  }

  return deductedIds;
}

function cancelExportLine(token, payload) {
  const session = requireInventoryRole_(token);

  const rowNumber = Number(payload && payload.rowNumber);
  const cachXuat = normalizeText_(payload && payload.cachXuat);
  const khoiLuongCanXuat = Number(payload && payload.khoiLuongCanXuat);
  const khoiLuongXuatThucTe = roundQty_(khoiLuongCanXuat * 1.05);

  if (!rowNumber || rowNumber < 2) {
    throw new Error("Thiếu dòng phiếu xuất cần hủy.");
  }

  const sheet = getPhieuXuatSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));
  const idx = getPhieuXuatHeaderIndex_(headers);

  if (rowNumber > sheet.getLastRow()) {
    throw new Error("Dòng phiếu xuất không tồn tại.");
  }

  const status = normalizeText_(sheet.getRange(rowNumber, idx.trangThaiPheDuyet + 1).getValue());

  if (!isPendingExportStatus_(status)) {
    throw new Error("Dòng này đã được xử lý, trạng thái hiện tại: " + status);
  }

  if (isFinite(khoiLuongCanXuat) && khoiLuongCanXuat > 0) {
    sheet.getRange(rowNumber, idx.khoiLuongCanXuat + 1).setValue(khoiLuongCanXuat);
  }

  if (isFinite(khoiLuongXuatThucTe) && khoiLuongXuatThucTe > 0) {
    sheet.getRange(rowNumber, idx.khoiLuongXuatThucTe + 1).setValue(khoiLuongXuatThucTe);
  } else {
    sheet.getRange(rowNumber, idx.khoiLuongXuatThucTe + 1).setValue("");
  }

  sheet.getRange(rowNumber, idx.cachXuat + 1).setValue(cachXuat);
  sheet.getRange(rowNumber, idx.trangThaiPheDuyet + 1).setValue("Đã hủy");
  sheet.getRange(rowNumber, idx.nguoiPheDuyet + 1).setValue(session.useName || "");
  sheet.getRange(rowNumber, idx.thoiGianDuyet + 1).setValue(nowText_());
  sheet.getRange(rowNumber, idx.IdKhoDaTru + 1).setValue("");

  return {
    success: true,
    message: "Đã hủy dòng nguyên liệu trong phiếu xuất.",
    phieuXuatChoDuyet: getPendingExportRequests_()
  };
}

function cancelExportRequest(token, phieuXuatId) {
  const session = requireInventoryRole_(token);

  phieuXuatId = normalizeText_(phieuXuatId);

  if (!phieuXuatId) {
    throw new Error("Thiếu mã phiếu xuất cần hủy.");
  }

  const sheet = getPhieuXuatSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));
  const idx = getPhieuXuatHeaderIndex_(headers);

  let count = 0;

  for (let r = 1; r < values.length; r++) {
    const rowPhieuId = normalizeText_(values[r][idx.PhieuXuatId]);
    const status = normalizeText_(values[r][idx.trangThaiPheDuyet]);

    if (rowPhieuId === phieuXuatId && isPendingExportStatus_(status)) {
      sheet.getRange(r + 1, idx.trangThaiPheDuyet + 1).setValue("Đã hủy");
      sheet.getRange(r + 1, idx.nguoiPheDuyet + 1).setValue(session.useName || "");
      sheet.getRange(r + 1, idx.thoiGianDuyet + 1).setValue(nowText_());
      sheet.getRange(r + 1, idx.IdKhoDaTru + 1).setValue("");
      count++;
    }
  }

  return {
    success: true,
    message: "Đã hủy phiếu xuất " + phieuXuatId + ". Số dòng đã hủy: " + count,
    phieuXuatChoDuyet: getPendingExportRequests_()
  };
}

/********************* NHẬP LẠI KHO SAU CÂN BATCH *********************/

function getReturnToStockAfterBatchCandidates(token) {
  requireInventoryRole_(token);

  return {
    success: true,
    nhapLaiKhoSauCan: getReturnToStockAfterBatchCandidates_()
  };
}

function confirmReturnToStockAfterBatch(token, payload) {
  const session = requireInventoryRole_(token);
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const clientItems = payload && Array.isArray(payload.items) ? payload.items : [];
    const keys = payload && Array.isArray(payload.keys) ? payload.keys : [];

    if (clientItems.length === 0 && keys.length === 0) {
      throw new Error("Chưa chọn dòng nào để nhập lại kho.");
    }

    const selectedMap = {};
    const overrideMap = {};

    // Cách mới: client gửi items gồm returnKey + IdKhoDaTru + khoiLuongNhapLai
    clientItems.forEach(function(item) {
      const returnKey = normalizeText_(item && item.returnKey);

      if (!returnKey) return;

      selectedMap[returnKey] = true;

      overrideMap[returnKey] = {
        IdKhoDaTru: normalizeText_(item && item.IdKhoDaTru),
        khoiLuongNhapLai: item && item.khoiLuongNhapLai
      };
    });

    // Giữ tương thích cách cũ: client chỉ gửi keys
    keys.forEach(function(key) {
      const k = normalizeText_(key);
      if (k) selectedMap[k] = true;
    });

    const candidates = getReturnToStockAfterBatchCandidates_();

    const selected = candidates
      .filter(function(item) {
        return selectedMap[item.returnKey];
      })
      .map(function(item) {
        const override = overrideMap[item.returnKey];

        if (override) {
          if (override.IdKhoDaTru) {
            item.IdKhoDaTru = override.IdKhoDaTru;
          }

          if (override.khoiLuongNhapLai !== null && override.khoiLuongNhapLai !== undefined && override.khoiLuongNhapLai !== "") {
            item.khoiLuongNhapLai = Number(override.khoiLuongNhapLai);
          }
        }

        return item;
      });

    if (selected.length === 0) {
      throw new Error("Không tìm thấy dòng hợp lệ để nhập lại kho.");
    }

    selected.forEach(function(item) {
      if (item.daNhapLai) {
        throw new Error("Dòng đã nhập lại kho rồi, không được cộng lại lần nữa: " + item.PhieuXuatId + " - " + item.maNguyenLieu);
      }

      const idKhoDaTru = normalizeText_(item.IdKhoDaTru);
      const khoiLuongNhapLai = Number(item.khoiLuongNhapLai);

      if (!idKhoDaTru) {
        throw new Error("Thiếu Id kho đã trừ: " + item.PhieuXuatId + " - " + item.maNguyenLieu);
      }

      if (idKhoDaTru.indexOf(",") !== -1) {
        throw new Error(
          "Id kho đã trừ vẫn có nhiều mã, vui lòng bấm Sửa và nhập đúng 1 IdKho: " +
          item.PhieuXuatId + " - " + item.maNguyenLieu +
          ". IdKhoDaTru: " + idKhoDaTru
        );
      }

      if (!isFinite(khoiLuongNhapLai) || khoiLuongNhapLai <= 0) {
        throw new Error("Khối lượng nhập lại phải là số lớn hơn 0: " + item.PhieuXuatId + " - " + item.maNguyenLieu);
      }

      item.IdKhoDaTru = idKhoDaTru;
      item.khoiLuongNhapLai = khoiLuongNhapLai;
    });

    const khoSheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);
    ensureKhoHeader_(khoSheet);

    const khoValues = khoSheet.getDataRange().getValues();
    const khoHeaders = khoValues[0].map(h => normalizeText_(h));
    const khoIdx = getKhoHeaderIndex_(khoHeaders);

    const logSheet = getOrCreateReturnLogSheet_();
    const loggedKeys = getReturnLogKeys_();

    let count = 0;

    selected.forEach(function(item) {
      if (loggedKeys[item.returnKey]) {
        throw new Error("Dòng đã có log nhập lại kho, không cộng lại nữa: " + item.returnKey);
      }

      const idKho = normalizeText_(item.IdKhoDaTru);
      let khoRowNumber = -1;
      let oldQty = 0;
      let khoUnit = "";

      for (let i = 1; i < khoValues.length; i++) {
        if (normalizeText_(khoValues[i][khoIdx.Id]) === idKho) {
          khoRowNumber = i + 1;
          oldQty = Number(khoValues[i][khoIdx.khoiLuongNhap]) || 0;
          khoUnit = normalizeText_(khoValues[i][khoIdx.donVi]);
          break;
        }
      }

      if (khoRowNumber === -1) {
        throw new Error("Không tìm thấy IdKhoDaTru trong KhoNguyenLieu: " + idKho);
      }

      const qtyReturnInKhoUnit = convertUnitValue_(
        Number(item.khoiLuongNhapLai),
        item.donViNhapLai,
        khoUnit
      );

      const newQty = roundQty_(oldQty + qtyReturnInKhoUnit);

      khoSheet.getRange(khoRowNumber, khoIdx.khoiLuongNhap + 1).setValue(newQty);

      if (newQty > 0) {
        khoSheet.getRange(khoRowNumber, khoIdx.trangThai + 1).setValue("Đã phê duyệt");
      }

      logSheet.appendRow([
        item.returnKey,
        item.PhieuXuatId,
        item.KeHoachId,
        item.tenBaiLieu,
        item.soLuong,
        item.maNguyenLieu,
        item.tenNguyenLieu,
        item.IdKhoDaTru,
        item.khoiLuongXuatThucTe,
        item.donViXuatThucTe,
        item.khoiLuongDaCan,
        item.donViDaCan,
        item.khoiLuongNhapLai,
        item.donViNhapLai,
        qtyReturnInKhoUnit,
        khoUnit,
        oldQty,
        newQty,
        session.useName || "",
        nowText_(),
        "Đã nhập lại kho sau cân"
      ]);

      count++;
    });

    return {
      success: true,
      message: "Đã nhập lại kho sau cân thành công. Số dòng xử lý: " + count,
      nhapLaiKhoSauCan: getReturnToStockAfterBatchCandidates_(),
      tonKho: getApprovedInventoryItems_(),
      chuaDuyet: getPendingInventoryItems_()
    };

  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

function getOrCreateReturnLogSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(SHEET_NHAP_LAI_KHO_SAU_CAN);

  const headers = [
    "returnKey",
    "PhieuXuatId",
    "KeHoachId",
    "tenBaiLieu",
    "soLuong",
    "maNguyenLieu",
    "tenNguyenLieu",
    "IdKhoDaTru",
    "khoiLuongXuatThucTe",
    "donViXuatThucTe",
    "khoiLuongDaCan",
    "donViDaCan",
    "khoiLuongNhapLai",
    "donViNhapLai",
    "khoiLuongNhapLaiTheoDonViKho",
    "donViKho",
    "tonKhoTruoc",
    "tonKhoSau",
    "nguoiNhapLai",
    "thoiGianNhapLai",
    "ghiChu"
  ];

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NHAP_LAI_KHO_SAU_CAN);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  const currentHeaders = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length))
    .getValues()[0]
    .map(h => normalizeText_(h));

  headers.forEach(function(header) {
    if (currentHeaders.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
    }
  });

  return sheet;
}

function getReturnLogKeys_() {
  const sheet = getOrCreateReturnLogSheet_();

  if (sheet.getLastRow() < 2) return {};

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));
  const idxReturnKey = headers.indexOf("returnKey");

  if (idxReturnKey === -1) return {};

  const map = {};

  values.slice(1).forEach(function(row) {
    const key = normalizeText_(row[idxReturnKey]);
    if (key) map[key] = true;
  });

  return map;
}

function buildReturnKey_(item) {
  return [
    normalizeText_(item.PhieuXuatId),
    normalizeText_(item.KeHoachId),
    normalizeText_(item.tenBaiLieu),
    normalizeText_(item.soLuong),
    normalizeText_(item.maNguyenLieu),
    normalizeText_(item.IdKhoDaTru)
  ].join("||");
}

function convertUnitValue_(value, fromUnit, toUnit) {
  const kg = toKg_(value, fromUnit);
  return roundQty_(fromKg_(kg, toUnit));
}

function safeNumber_(value) {
  const n = Number(value);
  return isFinite(n) ? n : 0;
}

function getOptionalIndexByNames_(headers, names) {
  for (let i = 0; i < names.length; i++) {
    const idx = headers.indexOf(names[i]);
    if (idx !== -1) return idx;
  }

  return -1;
}

function getReturnToStockAfterBatchCandidates_() {
  const phieuSheet = getPhieuXuatSheet_();
  const ss = getSpreadsheet_();
  const canSheet = ss.getSheetByName(SHEET_CHI_TIET_CAN_BATCH);

  if (!canSheet || canSheet.getLastRow() < 2) return [];

  const phieuValues = phieuSheet.getDataRange().getValues();
  if (phieuValues.length < 2) return [];

  const phieuHeaders = phieuValues[0].map(h => normalizeText_(h));
  const pIdx = getPhieuXuatHeaderIndex_(phieuHeaders);

  const canValues = canSheet.getDataRange().getValues();
  const canHeaders = canValues[0].map(h => normalizeText_(h));

  const cIdx = {
    PhieuXuatId: canHeaders.indexOf("PhieuXuatId"),
    KeHoachId: canHeaders.indexOf("KeHoachId"),
    tenBaiLieu: canHeaders.indexOf("tenBaiLieu"),
    soLuong: canHeaders.indexOf("soLuong"),
    maNguyenLieu: canHeaders.indexOf("maNguyenLieu"),
    tenNguyenLieu: canHeaders.indexOf("tenNguyenLieu"),
    IdKhoDaTru: canHeaders.indexOf("IdKhoDaTru"),
    khoiLuongThucTe: canHeaders.indexOf("khoiLuongThucTe"),
    donViCanXuat: canHeaders.indexOf("donViCanXuat"),
    donViThucTe: getOptionalIndexByNames_(canHeaders, ["donViThucTe", "donViCanXuat", "donViCan"])
  };

  const requiredCanHeaders = [
    "PhieuXuatId",
    "KeHoachId",
    "tenBaiLieu",
    "soLuong",
    "maNguyenLieu",
    "IdKhoDaTru",
    "khoiLuongThucTe"
  ];

  requiredCanHeaders.forEach(function(name) {
    if (cIdx[name] === -1) {
      throw new Error("Sheet ChiTietCanBatch thiếu cột: " + name);
    }
  });

  const canMap = {};

  canValues.slice(1).forEach(function(row) {
    const item = {
      PhieuXuatId: normalizeText_(row[cIdx.PhieuXuatId]),
      KeHoachId: normalizeText_(row[cIdx.KeHoachId]),
      tenBaiLieu: normalizeText_(row[cIdx.tenBaiLieu]),
      soLuong: normalizeText_(row[cIdx.soLuong]),
      maNguyenLieu: normalizeText_(row[cIdx.maNguyenLieu]),
      tenNguyenLieu: cIdx.tenNguyenLieu === -1 ? "" : normalizeText_(row[cIdx.tenNguyenLieu]),
      IdKhoDaTru: normalizeText_(row[cIdx.IdKhoDaTru])
    };

    if (!item.PhieuXuatId || !item.KeHoachId || !item.maNguyenLieu || !item.IdKhoDaTru) return;

    const key = buildReturnKey_(item);

    const qty = safeNumber_(row[cIdx.khoiLuongThucTe]);

    // Nếu có cột đơn vị thực tế thì dùng, nếu không có thì lấy donViCanXuat.
    // Vì field bạn liệt kê chưa có donViThucTe, nên fallback này giúp không lỗi dữ liệu cũ.
    const unit = cIdx.donViThucTe !== -1
      ? normalizeText_(row[cIdx.donViThucTe])
      : normalizeText_(row[cIdx.donViCanXuat]);

    if (!canMap[key]) {
      canMap[key] = {
        key: key,
        qtyKg: 0,
        unitSamples: {},
        count: 0
      };
    }

    if (qty > 0 && unit) {
      canMap[key].qtyKg += toKg_(qty, unit);
      canMap[key].unitSamples[unit] = true;
      canMap[key].count++;
    }
  });

  const loggedKeys = getReturnLogKeys_();
  const result = [];

  phieuValues.slice(1).forEach(function(row) {
    const status = normalizeText_(row[pIdx.trangThaiPheDuyet]);

    if (normalizeStatus_(status) !== "đã phê duyệt") return;

    const base = {
      PhieuXuatId: normalizeText_(row[pIdx.PhieuXuatId]),
      KeHoachId: normalizeText_(row[pIdx.KeHoachId]),
      tenBaiLieu: normalizeText_(row[pIdx.tenBaiLieu]),
      soLuong: normalizeText_(row[pIdx.soLuong]),
      maNguyenLieu: normalizeText_(row[pIdx.maNguyenLieu]),
      tenNguyenLieu: normalizeText_(row[pIdx.tenNguyenLieu]),
      IdKhoDaTru: normalizeText_(row[pIdx.IdKhoDaTru])
    };

    if (!base.PhieuXuatId || !base.KeHoachId || !base.maNguyenLieu || !base.IdKhoDaTru) return;

    const returnKey = buildReturnKey_(base);
    const canInfo = canMap[returnKey];

    if (!canInfo || canInfo.count === 0) return;

    const donViXuat = normalizeText_(row[pIdx.donViCanXuat]);
    const khoiLuongXuatThucTeRaw = row[pIdx.khoiLuongXuatThucTe];
    const khoiLuongXuatThucTe = safeNumber_(khoiLuongXuatThucTeRaw) > 0
      ? safeNumber_(khoiLuongXuatThucTeRaw)
      : safeNumber_(row[pIdx.khoiLuongCanXuat]);

    const xuatKg = toKg_(khoiLuongXuatThucTe, donViXuat);
    const daCanKg = canInfo.qtyKg;
    const nhapLaiKg = xuatKg - daCanKg;
    const khoiLuongDaCanTheoDonViXuat = roundQty_(fromKg_(daCanKg, donViXuat));
    const khoiLuongNhapLaiTheoDonViXuat = roundQty_(fromKg_(Math.max(0, nhapLaiKg), donViXuat));

    const hopLe = nhapLaiKg >= -0.000001;
    const daNhapLai = !!loggedKeys[returnKey];

    if (daNhapLai) {
      return;
    }

    let canhBao = "";

    if (!hopLe) {
      canhBao = "Khối lượng đã cân lớn hơn khối lượng xuất thực tế.";
    } else if (daNhapLai) {
      canhBao = "Đã nhập lại kho trước đó, không cộng lại nữa.";
    } else if (khoiLuongNhapLaiTheoDonViXuat <= 0) {
      canhBao = "Không còn khối lượng dư để nhập lại kho.";
    } else if (String(base.IdKhoDaTru || "").indexOf(",") !== -1) {
      canhBao = "IdKhoDaTru có nhiều mã kho, cần xử lý thủ công để tránh cộng sai lô.";
    } else {
      canhBao = "Hợp lệ, có thể nhập lại kho.";
    }

    result.push({
      returnKey: returnKey,
      PhieuXuatId: base.PhieuXuatId,
      KeHoachId: base.KeHoachId,
      tenBaiLieu: base.tenBaiLieu,
      soLuong: base.soLuong,
      maNguyenLieu: base.maNguyenLieu,
      tenNguyenLieu: base.tenNguyenLieu,
      IdKhoDaTru: base.IdKhoDaTru,
      khoiLuongXuatThucTe: khoiLuongXuatThucTe,
      donViXuatThucTe: donViXuat,
      khoiLuongDaCan: khoiLuongDaCanTheoDonViXuat,
      donViDaCan: donViXuat,
      khoiLuongNhapLai: khoiLuongNhapLaiTheoDonViXuat,
      donViNhapLai: donViXuat,
      soDongCanBatch: canInfo.count,
      hopLe: hopLe && !daNhapLai && khoiLuongNhapLaiTheoDonViXuat > 0 && String(base.IdKhoDaTru || "").indexOf(",") === -1,
      daNhapLai: daNhapLai,
      canhBao: canhBao
    });
  });

  return result.sort(function(a, b) {
    const c1 = String(b.PhieuXuatId || "").localeCompare(String(a.PhieuXuatId || ""));
    if (c1 !== 0) return c1;
    return String(a.maNguyenLieu || "").localeCompare(String(b.maNguyenLieu || ""));
  });
}

function skipReturnToStockAfterBatchItems(token, payload) {
  const session = requireInventoryRole_(token);

  const keys = payload && Array.isArray(payload.keys) ? payload.keys : [];

  if (keys.length === 0) {
    throw new Error("Không có dòng nào để bỏ qua.");
  }

  const candidates = getReturnToStockAfterBatchCandidates_();

  const keyMap = {};
  keys.forEach(function(key) {
    const k = normalizeText_(key);
    if (k) keyMap[k] = true;
  });

  const selected = candidates.filter(function(item) {
    return keyMap[item.returnKey];
  });

  if (selected.length === 0) {
    throw new Error("Không tìm thấy dòng cần bỏ qua.");
  }

  const logSheet = getOrCreateReturnLogSheet_();
  const loggedKeys = getReturnLogKeys_();

  let count = 0;

  selected.forEach(function(item) {
    if (loggedKeys[item.returnKey]) {
      return;
    }

    logSheet.appendRow([
      item.returnKey,
      item.PhieuXuatId,
      item.KeHoachId,
      item.tenBaiLieu,
      item.soLuong,
      item.maNguyenLieu,
      item.tenNguyenLieu,
      item.IdKhoDaTru,
      item.khoiLuongXuatThucTe,
      item.donViXuatThucTe,
      item.khoiLuongDaCan,
      item.donViDaCan,
      item.khoiLuongNhapLai,
      item.donViNhapLai,
      "",
      "",
      "",
      "",
      session.useName || "",
      nowText_(),
      "Bỏ qua dữ liệu cũ sai kho, không cộng lại tồn kho"
    ]);

    count++;
  });

  return {
    success: true,
    message: "Đã bỏ qua " + count + " dòng nhập lại kho sau cân. Không cộng vào tồn kho.",
    nhapLaiKhoSauCan: getReturnToStockAfterBatchCandidates_(),
    tonKho: getApprovedInventoryItems_(),
    chuaDuyet: getPendingInventoryItems_()
  };
}


/********************* BÁO CÁO KHO ĐÃ DUYỆT + TỒN KHO ĐẦU *********************/

function isApprovedReportStatus_(value) {
  const s = normalizeStatus_(value);
  return s === "đã phê duyệt" || s === "da phe duyet";
}

function extractDateTextForReport_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  const text = normalizeText_(value);
  if (!text) return "";

  const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const vnMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (vnMatch) {
    return vnMatch[3] + "-" + String(vnMatch[2]).padStart(2, "0") + "-" + String(vnMatch[1]).padStart(2, "0");
  }

  const d = new Date(text);
  if (!isNaN(d)) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  return text.substring(0, 10);
}

function isDateInReportRange_(value, fromDate, toDate) {
  const dateText = extractDateTextForReport_(value);
  const from = normalizeText_(fromDate);
  const to = normalizeText_(toDate);

  if (!dateText) return !from && !to;
  if (from && dateText < from) return false;
  if (to && dateText > to) return false;

  return true;
}

function formatReportValue_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  }

  if (value === null || value === undefined) return "";
  return value;
}

function readSheetRowsAsObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) {
    return {
      headers: [],
      rows: []
    };
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 1) {
    return {
      headers: [],
      rows: []
    };
  }

  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const rows = [];

  for (let r = 1; r < values.length; r++) {
    const obj = {};
    let hasValue = false;

    headers.forEach(function(header, c) {
      if (!header) return;
      const value = formatReportValue_(values[r][c]);
      obj[header] = value;
      if (normalizeText_(value)) hasValue = true;
    });

    if (hasValue) rows.push(obj);
  }

  return {
    headers: headers.filter(Boolean),
    rows: rows
  };
}

function getApprovedInboundOrdersReport(token, filter) {
  requireInventoryRole_(token);

  filter = filter || {};

  // Theo yêu cầu mới: báo cáo "Đơn hàng nhập kho" lấy từ sheet KhoNguyenLieu,
  // chỉ hiển thị các dòng đã phê duyệt và lọc theo cột ngayPheDuyet/ngày phê duyệt.
  const sheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);
  ensureKhoHeader_(sheet);

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      success: true,
      headers: [],
      rows: []
    };
  }

  const data = readSheetRowsAsObjects_(sheet);
  const headers = data.headers;

  const statusHeader = headers.indexOf("trangThai") !== -1 ? "trangThai" : "trangThaiPheDuyet";
  const dateHeader = headers.indexOf("ngayPheDuyet") !== -1
    ? "ngayPheDuyet"
    : (headers.indexOf("ngayPheDuyetChatLuong") !== -1 ? "ngayPheDuyetChatLuong" : "");

  if (!dateHeader && (filter.fromDate || filter.toDate)) {
    return {
      success: true,
      headers: headers,
      rows: []
    };
  }

  const rows = data.rows
    .filter(function(row) {
      return isApprovedReportStatus_(row[statusHeader]);
    })
    .filter(function(row) {
      return dateHeader ? isDateInReportRange_(row[dateHeader], filter.fromDate, filter.toDate) : true;
    })
    .sort(function(a, b) {
      const da = dateHeader ? String(a[dateHeader] || "") : "";
      const db = dateHeader ? String(b[dateHeader] || "") : "";
      if (db.localeCompare(da) !== 0) return db.localeCompare(da);
      return String(b.Id || "").localeCompare(String(a.Id || ""));
    });

  return {
    success: true,
    headers: headers,
    rows: rows
  };
}

function getApprovedExportRequestsReport(token, filter) {
  requireInventoryRole_(token);

  filter = filter || {};

  const sheet = getPhieuXuatSheet_();

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      success: true,
      headers: [],
      rows: []
    };
  }

  const data = readSheetRowsAsObjects_(sheet);
  const headers = data.headers;
  const statusHeader = "trangThaiPheDuyet";
  const dateHeader = "thoiGianDuyet";

  const rows = data.rows
    .filter(function(row) {
      return isApprovedReportStatus_(row[statusHeader]);
    })
    .filter(function(row) {
      return isDateInReportRange_(row[dateHeader], filter.fromDate, filter.toDate);
    })
    .sort(function(a, b) {
      const c = String(b[dateHeader] || "").localeCompare(String(a[dateHeader] || ""));
      if (c !== 0) return c;
      return String(b.PhieuXuatId || "").localeCompare(String(a.PhieuXuatId || ""));
    });

  return {
    success: true,
    headers: headers,
    rows: rows
  };
}

function getTonKhoDauSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(SHEET_TON_KHO_DAU);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TON_KHO_DAU);
  }

  return sheet;
}

function updateTonKhoDau(token) {
  requireInventoryRole_(token);

  const ss = getSpreadsheet_();
  const sourceSheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);
  const targetSheet = getTonKhoDauSheet_();

  targetSheet.clearContents();

  const lastRow = sourceSheet.getLastRow();
  const lastCol = sourceSheet.getLastColumn();

  if (lastRow > 0 && lastCol > 0) {
    const values = sourceSheet.getRange(1, 1, lastRow, lastCol).getValues();
    targetSheet.getRange(1, 1, lastRow, lastCol).setValues(values);
  }

  const data = readSheetRowsAsObjects_(targetSheet);

  return {
    success: true,
    message: "Đã cập nhật tồn kho đầu từ sheet KhoNguyenLieu. Số dòng dữ liệu: " + data.rows.length,
    headers: data.headers,
    rows: data.rows
  };
}

function getTonKhoDau(token) {
  requireInventoryRole_(token);

  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(SHEET_TON_KHO_DAU);

  if (!sheet || sheet.getLastRow() < 1) {
    return {
      success: true,
      headers: [],
      rows: []
    };
  }

  const data = readSheetRowsAsObjects_(sheet);

  return {
    success: true,
    headers: data.headers,
    rows: data.rows
  };
}

/* =========================================================
   XUẤT KHO THỦ CÔNG
   - Lấy tồn kho từ KhoNguyenLieu
   - Tạo phiếu xuất thủ công
   - Trừ kho theo Id
   - Log vào PhieuXuatThuCong
   ========================================================= */

function generateManualExportId_() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return "PXTC" + y + m + d + h + mi + s + random;
}

function getOrCreateSheet_(sheetName) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  return sheet;
}

function ensurePhieuXuatThuCongHeader_(sheet) {
  const expectedHeaders = [
    "PhieuXuatThuCongId",
    "STT",
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
    "ngayPheDuyet",
    "anhChatLuong",
    "trangThaiNguyenLieu",
    "loaiNguyenLieu",
    "MaKeToan",
    "heSoQuyDoiKho",
    "doViTinhToan",
    "ghiChu",
    "nguoiXuatKhoThuCong",
    "thoiGianLuu",
    "TrangThaiXuatThuCong",
    "nguoiDuyet",
    "thoiGianDuyet",
    "IdKhoDaTru"
  ];

  ensureSheetHeaders_(sheet, expectedHeaders);
}

function getPhieuXuatThuCongHeaderIndex_(headers) {
  return {
    PhieuXuatThuCongId: findRequiredHeaderIndex_(headers, ["PhieuXuatThuCongId"]),
    STT: findRequiredHeaderIndex_(headers, ["STT"]),
    Id: findRequiredHeaderIndex_(headers, ["Id"]),
    maNguyenLieu: findRequiredHeaderIndex_(headers, ["maNguyenLieu"]),
    tenNguyenLieu: findRequiredHeaderIndex_(headers, ["tenNguyenLieu"]),
    khoiLuongNhap: findRequiredHeaderIndex_(headers, ["khoiLuongNhap"]),
    donVi: findRequiredHeaderIndex_(headers, ["donVi"]),
    quyCachDongGoi: findRequiredHeaderIndex_(headers, ["quyCachDongGoi"]),
    LotNo: findRequiredHeaderIndex_(headers, ["LotNo"]),
    ngaySanXuat: findRequiredHeaderIndex_(headers, ["ngaySanXuat"]),
    hanSuDung: findRequiredHeaderIndex_(headers, ["hanSuDung"]),
    nhaCungCap: findRequiredHeaderIndex_(headers, ["nhaCungCap"]),
    ngayNhap: findRequiredHeaderIndex_(headers, ["ngayNhap"]),
    trangThai: findRequiredHeaderIndex_(headers, ["trangThai"]),
    nguoiPheDuyetChatLuong: findRequiredHeaderIndex_(headers, ["nguoiPheDuyetChatLuong"]),
    ngayPheDuyet: findRequiredHeaderIndex_(headers, ["ngayPheDuyet"]),
    anhChatLuong: findRequiredHeaderIndex_(headers, ["anhChatLuong"]),
    trangThaiNguyenLieu: findRequiredHeaderIndex_(headers, ["trangThaiNguyenLieu"]),
    loaiNguyenLieu: findRequiredHeaderIndex_(headers, ["loaiNguyenLieu"]),
    MaKeToan: findRequiredHeaderIndex_(headers, ["MaKeToan"]),
    heSoQuyDoiKho: findRequiredHeaderIndex_(headers, ["heSoQuyDoiKho"]),
    doViTinhToan: findRequiredHeaderIndex_(headers, ["doViTinhToan"]),
    ghiChu: findRequiredHeaderIndex_(headers, ["ghiChu"]),

    nguoiXuatKhoThuCong: findRequiredHeaderIndex_(headers, ["nguoiXuatKhoThuCong"]),
    thoiGianLuu: findRequiredHeaderIndex_(headers, ["thoiGianLuu"]),
    TrangThaiXuatThuCong: findRequiredHeaderIndex_(headers, ["TrangThaiXuatThuCong"]),
    nguoiDuyet: findRequiredHeaderIndex_(headers, ["nguoiDuyet"]),
    thoiGianDuyet: findRequiredHeaderIndex_(headers, ["thoiGianDuyet"]),
    IdKhoDaTru: findRequiredHeaderIndex_(headers, ["IdKhoDaTru"])
  };
}

function getManualExportHistory(token, filter) {
  requireInventoryRole_(token);

  return {
    success: true,
    headers: getManualExportHistoryHeaders_(),
    rows: getManualExportHistory_(filter)
  };
}

function getManualExportHistoryHeaders_() {
  return [
    "PhieuXuatThuCongId",
    "STT",
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
    "ngayPheDuyet",
    "anhChatLuong",
    "trangThaiNguyenLieu",
    "loaiNguyenLieu",
    "MaKeToan",
    "heSoQuyDoiKho",
    "doViTinhToan",
    "ghiChu",
    "nguoiXuatKhoThuCong",
    "thoiGianLuu",
    "TrangThaiXuatThuCong",
    "nguoiDuyet",
    "thoiGianDuyet",
    "IdKhoDaTru"
  ];
}

function getManualExportHistory_(filter) {
  filter = filter || {};

  const fromDate = normalizeText_(filter.fromDate);
  const toDate = normalizeText_(filter.toDate);

  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(SHEET_PHIEU_XUAT_THU_CONG);

  if (!sheet) return [];

  ensurePhieuXuatThuCongHeader_(sheet);

  if (sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();

  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idx = getPhieuXuatThuCongHeaderIndex_(headers);

  const result = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    // ================================================
    // XÁC ĐỊNH NGÀY XUẤT TỪ thoiGianLuu
    // Hỗ trợ cả Date của Google Sheets và chuỗi text
    // ================================================
    const rawThoiGianLuu = row[idx.thoiGianLuu];

    let ngayXuatText = "";

    if (
      Object.prototype.toString.call(rawThoiGianLuu) === "[object Date]" &&
      !isNaN(rawThoiGianLuu)
    ) {
      ngayXuatText = Utilities.formatDate(
        rawThoiGianLuu,
        Session.getScriptTimeZone(),
        "yyyy-MM-dd"
      );
    } else {
      const text = normalizeText_(rawThoiGianLuu);

      // Ví dụ:
      // 2026-10-05 22:20:18
      // -> 2026-10-05
      const match = text.match(/^(\d{4}-\d{2}-\d{2})/);

      if (match) {
        ngayXuatText = match[1];
      }
    }

    // Không có thời gian lưu thì bỏ qua dòng
    if (!ngayXuatText) {
      continue;
    }

    // Lọc theo NGÀY XUẤT
    if (fromDate && ngayXuatText < fromDate) continue;
    if (toDate && ngayXuatText > toDate) continue;

    result.push({
      PhieuXuatThuCongId:
        normalizeText_(row[idx.PhieuXuatThuCongId]),

      STT:
        row[idx.STT],

      Id:
        normalizeText_(row[idx.Id]),

      maNguyenLieu:
        normalizeText_(row[idx.maNguyenLieu]),

      tenNguyenLieu:
        normalizeText_(row[idx.tenNguyenLieu]),

      khoiLuongNhap:
        row[idx.khoiLuongNhap],

      donVi:
        normalizeText_(row[idx.donVi]),

      quyCachDongGoi:
        normalizeText_(row[idx.quyCachDongGoi]),

      LotNo:
        normalizeText_(row[idx.LotNo]),

      ngaySanXuat:
        formatDateValue_(row[idx.ngaySanXuat]),

      hanSuDung:
        formatDateValue_(row[idx.hanSuDung]),

      nhaCungCap:
        normalizeText_(row[idx.nhaCungCap]),

      ngayNhap:
        formatDateValue_(row[idx.ngayNhap]),

      trangThai:
        normalizeText_(row[idx.trangThai]),

      nguoiPheDuyetChatLuong:
        normalizeText_(row[idx.nguoiPheDuyetChatLuong]),

      ngayPheDuyet:
        formatDateValue_(row[idx.ngayPheDuyet]),

      anhChatLuong:
        normalizeText_(row[idx.anhChatLuong]),

      trangThaiNguyenLieu:
        normalizeText_(row[idx.trangThaiNguyenLieu]),

      loaiNguyenLieu:
        normalizeText_(row[idx.loaiNguyenLieu]),

      MaKeToan:
        normalizeText_(row[idx.MaKeToan]),

      heSoQuyDoiKho:
        normalizeText_(row[idx.heSoQuyDoiKho]),

      doViTinhToan:
        normalizeText_(row[idx.doViTinhToan]),

      ghiChu:
        normalizeText_(row[idx.ghiChu]),

      nguoiXuatKhoThuCong:
        normalizeText_(row[idx.nguoiXuatKhoThuCong]),

      thoiGianLuu:
        normalizeText_(row[idx.thoiGianLuu]),

      TrangThaiXuatThuCong:
        normalizeText_(row[idx.TrangThaiXuatThuCong]),

      nguoiDuyet:
        normalizeText_(row[idx.nguoiDuyet]),

      thoiGianDuyet:
        normalizeText_(row[idx.thoiGianDuyet]),

      IdKhoDaTru:
        normalizeText_(row[idx.IdKhoDaTru])
    });
  }

  result.sort(function(a, b) {
    return String(b.PhieuXuatThuCongId || "")
      .localeCompare(String(a.PhieuXuatThuCongId || ""));
  });

  return result;
}

function updateWarehouseActualQty(
  stt
) {
  const input =
    document.getElementById(
      "warehouseActualQty_" +
      stt
    );

  if (!input) {
    return;
  }

  const qty =
    Number(
      input.value
    );

  const item =
    warehousePlanItems.find(
      function(x) {
        return (
          String(x.STT) ===
          String(stt)
        );
      }
    );

  if (!item) {
    return;
  }

  if (
    !isFinite(qty) ||
    qty <= 0
  ) {
    showMessage(
      "warehousePlanMessage",
      "error",
      "Khối lượng xuất thực tế phải lớn hơn 0."
    );

    input.value =
      item.khoiLuongXuatThucTe;

    return;
  }

  /*
   * Lưu lại giá trị thủ kho đã nhập.
   */
  item.khoiLuongXuatThucTe =
    qty;

  showMessage(
    "warehousePlanMessage",
    "",
    ""
  );
}

function createManualExportVoucher(token, payload) {
  const session = requireInventoryRole_(token);

  const items = payload && Array.isArray(payload.items) ? payload.items : [];
  const ghiChuChung = normalizeText_(payload && payload.ghiChu);

  if (items.length === 0) {
    throw new Error("Phiếu xuất chưa có nguyên liệu nào.");
  }

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const khoSheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);
    ensureKhoHeader_(khoSheet);

    const logSheet = getOrCreateSheet_(SHEET_PHIEU_XUAT_THU_CONG);
    ensurePhieuXuatThuCongHeader_(logSheet);

    const khoValues = khoSheet.getDataRange().getValues();
    const khoHeaders = khoValues[0].map(function(h) {
      return normalizeText_(h);
    });

    const khoIdx = getKhoHeaderIndex_(khoHeaders);

    const rowMap = {};

    for (let i = 1; i < khoValues.length; i++) {
      const id = normalizeText_(khoValues[i][khoIdx.Id]);

      if (id) {
        rowMap[id] = {
          rowNumber: i + 1,
          row: khoValues[i]
        };
      }
    }

    const phieuId = generateManualExportId_();
    const nowText = nowText_();
    const nguoiTao = session.useName || "";
    let count = 0;

    items.forEach(function(item, index) {
      const idKho = normalizeText_(item.IdKho || item.Id);
      const khoiLuongXuat = Number(item.khoiLuongXuat);
      const donViXuat = normalizeText_(item.donViXuat);
      const ghiChuDong = normalizeText_(item.ghiChu) || ghiChuChung;

      if (!idKho) {
        throw new Error("Dòng " + (index + 1) + ": Thiếu Id kho.");
      }

      if (!isFinite(khoiLuongXuat) || khoiLuongXuat <= 0) {
        throw new Error("Dòng " + (index + 1) + ": Khối lượng xuất phải lớn hơn 0.");
      }

      if (!donViXuat) {
        throw new Error("Dòng " + (index + 1) + ": Thiếu đơn vị xuất.");
      }

      const found = rowMap[idKho];

      if (!found) {
        throw new Error("Không tìm thấy Id kho: " + idKho);
      }

      const row = found.row;
      const rowNumber = found.rowNumber;

      const trangThaiKho = normalizeText_(row[khoIdx.trangThai]);

      const trangThaiNguyenLieu = khoIdx.trangThaiNguyenLieu === -1
        ? "Sử dụng"
        : normalizeText_(row[khoIdx.trangThaiNguyenLieu]);

      if (trangThaiKho.toLowerCase() !== "đã phê duyệt") {
        throw new Error(
          "Id kho " + idKho + " chưa được phê duyệt chất lượng. Trạng thái hiện tại: " + trangThaiKho
        );
      }

      if (!isUsableNguyenLieuStatus_(trangThaiNguyenLieu)) {
        throw new Error(
          "Id kho " + idKho + " đang không được phép sử dụng. Trạng thái nguyên liệu: " + trangThaiNguyenLieu
        );
      }

      const soLuongKho = Number(row[khoIdx.khoiLuongNhap]);
      const donViKho = normalizeText_(row[khoIdx.donVi]);

      if (!isFinite(soLuongKho) || soLuongKho <= 0) {
        throw new Error("Id kho " + idKho + " không còn tồn kho.");
      }

      if (!donViKho) {
        throw new Error("Id kho " + idKho + " chưa có đơn vị tồn.");
      }

      if (donViXuat !== donViKho) {
        throw new Error(
          "Dòng " + (index + 1) +
          ": Đơn vị xuất phải giống đơn vị tồn. Đơn vị tồn: " +
          donViKho +
          ", đơn vị xuất: " +
          donViXuat
        );
      }

      if (khoiLuongXuat > soLuongKho + 0.000001) {
        throw new Error(
          "Id kho " + idKho +
          " không đủ tồn. Tồn: " +
          roundQty_(soLuongKho) + " " + donViKho +
          ", cần xuất: " +
          khoiLuongXuat + " " + donViXuat
        );
      }

      const tonSauTheoDonViKho = roundQty_(soLuongKho - khoiLuongXuat);

      khoSheet
        .getRange(rowNumber, khoIdx.khoiLuongNhap + 1)
        .setValue(tonSauTheoDonViKho);

      if (tonSauTheoDonViKho <= 0.000001) {
        khoSheet
          .getRange(rowNumber, khoIdx.trangThai + 1)
          .setValue("Đã xuất hết");
      }

      const khoiLuongXuatTheoDonViKho = roundQty_(khoiLuongXuat);

      appendObjectRowByHeader_(logSheet, {
        PhieuXuatThuCongId: phieuId,
        STT: index + 1,
        Id: idKho,
        maNguyenLieu: normalizeText_(row[khoIdx.maNguyenLieu]),
        tenNguyenLieu: normalizeText_(row[khoIdx.tenNguyenLieu]),
        khoiLuongNhap: khoiLuongXuatTheoDonViKho,
        donVi: donViKho,
        quyCachDongGoi: normalizeText_(row[khoIdx.quyCachDongGoi]),
        LotNo: normalizeText_(row[khoIdx.LotNo]),
        ngaySanXuat: formatDateValue_(row[khoIdx.ngaySanXuat]),
        hanSuDung: formatDateValue_(row[khoIdx.hanSuDung]),
        nhaCungCap: normalizeText_(row[khoIdx.nhaCungCap]),
        ngayNhap: formatDateValue_(row[khoIdx.ngayNhap]),
        trangThai: trangThaiKho,
        nguoiPheDuyetChatLuong: normalizeText_(row[khoIdx.nguoiPheDuyetChatLuong]),
        ngayPheDuyet: formatDateValue_(row[khoIdx.ngayPheDuyet]),
        anhChatLuong: khoIdx.anhChatLuong === -1 ? "" : normalizeText_(row[khoIdx.anhChatLuong]),
        trangThaiNguyenLieu: trangThaiNguyenLieu,
        loaiNguyenLieu: khoIdx.loaiNguyenLieu === -1 ? "" : normalizeText_(row[khoIdx.loaiNguyenLieu]),
        MaKeToan: khoIdx.MaKeToan === -1 ? "" : normalizeText_(row[khoIdx.MaKeToan]),
        heSoQuyDoiKho: khoIdx.heSoQuyDoiKho === -1 ? "" : normalizeText_(row[khoIdx.heSoQuyDoiKho]),
        doViTinhToan:
          khoIdx.doViTinhToan === -1
            ? ""
            : normalizeText_(row[khoIdx.doViTinhToan]),

        ghiChu:
          ghiChuDong ||
          ("Xuất thủ công bởi " + nguoiTao + " lúc " + nowText),

        // =============================================
        // THÔNG TIN XUẤT KHO THỦ CÔNG
        // =============================================

        // Người đang đăng nhập và thực hiện xuất kho
        nguoiXuatKhoThuCong: nguoiTao,

        // Thời điểm lưu phiếu
        thoiGianLuu: nowText,

        // Phiếu này đã trừ kho ngay khi bấm tạo phiếu
        TrangThaiXuatThuCong: "Đã xuất",

        // Không có bước duyệt riêng trong menu hiện tại
        nguoiDuyet: "",

        // Không có bước duyệt riêng trong menu hiện tại
        thoiGianDuyet: "",

        // Chính Id kho mà dòng này đã trừ
        IdKhoDaTru: idKho
      });

      count++;
    });

    // Đảm bảo dữ liệu vừa ghi xuống Sheet đã được cập nhật
    // trước khi đọc lại lịch sử
    SpreadsheetApp.flush();

    let lichSuXuatThuCong = [];

    try {
      lichSuXuatThuCong = getManualExportHistory_({
        fromDate: todayText_(),
        toDate: todayText_()
      });
    } catch (historyError) {
      console.log("Lỗi tải lịch sử xuất thủ công sau khi tạo phiếu:", historyError);
      lichSuXuatThuCong = [];
    }

    return {
      success: true,
      PhieuXuatThuCongId: phieuId,
      message: "Đã tạo phiếu xuất thủ công và trừ kho thành công.",
      soDong: count,
      tonKho: getApprovedInventoryItems_(),
      lichSuXuatThuCong: lichSuXuatThuCong
    };

  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

function findRequiredHeaderIndex_(headers, candidates) {
  headers = headers || [];
  candidates = candidates || [];

  const normalizedHeaders = headers.map(function(h) {
    return normalizeText_(h).toLowerCase();
  });

  for (let i = 0; i < candidates.length; i++) {
    const candidate = normalizeText_(candidates[i]).toLowerCase();
    const index = normalizedHeaders.indexOf(candidate);

    if (index !== -1) {
      return index;
    }
  }

  throw new Error("Thiếu cột bắt buộc: " + candidates.join(" / "));
}

function findOptionalHeaderIndex_(headers, candidates) {
  headers = headers || [];
  candidates = candidates || [];

  const normalizedHeaders = headers.map(function(h) {
    return normalizeText_(h).toLowerCase();
  });

  for (let i = 0; i < candidates.length; i++) {
    const candidate = normalizeText_(candidates[i]).toLowerCase();
    const index = normalizedHeaders.indexOf(candidate);

    if (index !== -1) {
      return index;
    }
  }

  return -1;
}
