const SPREADSHEET_ID = "1yFlCpC6JzLRmv9hukNw05vYpeYmkhXRcPC-0nCNOjAQ";



const SHEET_ACCOUNT = "account";

const SHEET_KHO_NGUYEN_LIEU = "KhoNguyenLieu";

const SHEET_PHIEU_XUAT_THU_CONG = "PhieuXuatThuCong";

const SHEET_KE_HOACH_SAN_XUAT = "KeHoachSanXuat";

const SHEET_BAI_TRON_LIEU = "BaiTronLieu";
const SHEET_NGUYEN_LIEU = "NguyenLieu";



const REQUIRED_ROLE = "worker";

const SESSION_PREFIX = "WORKER_MANUAL_EXPORT_SESSION_";

const SESSION_TTL_SECONDS = 6 * 60 * 60;



/* =========================================================

   WEB APP

   ========================================================= */



function doGet() {

  return HtmlService

    .createHtmlOutputFromFile("index")

    .setTitle("Công nhân xuất kho thủ công")

    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

}



/* =========================================================

   COMMON

   ========================================================= */



function getSpreadsheet_() {

  return SpreadsheetApp.openById(SPREADSHEET_ID);

}



function getSheet_(sheetName) {

  const sheet = getSpreadsheet_().getSheetByName(sheetName);

  if (!sheet) {

    throw new Error("Không tìm thấy sheet: " + sheetName);

  }

  return sheet;

}



function normalizeText_(value) {

  return String(value === null || value === undefined ? "" : value).trim();

}



function lowerText_(value) {

  return normalizeText_(value).toLowerCase();

}



function todayText_() {

  return Utilities.formatDate(

    new Date(),

    Session.getScriptTimeZone(),

    "yyyy-MM-dd"

  );

}



function nowText_() {

  return Utilities.formatDate(

    new Date(),

    Session.getScriptTimeZone(),

    "yyyy-MM-dd HH:mm:ss"

  );

}



function formatDateValue_(value) {

  if (

    Object.prototype.toString.call(value) === "[object Date]" &&

    !isNaN(value)

  ) {

    return Utilities.formatDate(

      value,

      Session.getScriptTimeZone(),

      "yyyy-MM-dd"

    );

  }



  const text = normalizeText_(value);

  if (!text) return "";



  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);

  if (iso) return iso[1];



  const vn = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);

  if (vn) {

    return (

      vn[3] +

      "-" +

      String(vn[2]).padStart(2, "0") +

      "-" +

      String(vn[1]).padStart(2, "0")

    );

  }



  return text;

}



function roundQty_(value) {

  const n = Number(value);

  if (!isFinite(n)) return 0;

  return Math.round(n * 1000000) / 1000000;

}



function generateId_(prefix) {

  const now = new Date();



  return (

    prefix +

    Utilities.formatDate(

      now,

      Session.getScriptTimeZone(),

      "yyyyMMddHHmmss"

    ) +

    Math.floor(1000 + Math.random() * 9000)

  );

}



function ensureSheetHeaders_(sheet, expectedHeaders) {

  if (sheet.getLastRow() === 0) {

    sheet

      .getRange(1, 1, 1, expectedHeaders.length)

      .setValues([expectedHeaders]);

    return;

  }



  let currentLastCol = Math.max(

    sheet.getLastColumn(),

    expectedHeaders.length

  );



  let headers = sheet

    .getRange(1, 1, 1, currentLastCol)

    .getValues()[0]

    .map(function(h) {

      return normalizeText_(h);

    });



  if (headers.every(function(h) { return !h; })) {

    sheet

      .getRange(1, 1, 1, expectedHeaders.length)

      .setValues([expectedHeaders]);

    return;

  }



  expectedHeaders.forEach(function(header) {

    const currentHeaders = sheet

      .getRange(

        1,

        1,

        1,

        Math.max(sheet.getLastColumn(), expectedHeaders.length)

      )

      .getValues()[0]

      .map(function(h) {

        return normalizeText_(h);

      });



    if (currentHeaders.indexOf(header) === -1) {

      sheet

        .getRange(1, sheet.getLastColumn() + 1)

        .setValue(header);

    }

  });

}



function getHeaderMap_(sheet) {

  const headers = sheet

    .getRange(1, 1, 1, sheet.getLastColumn())

    .getValues()[0]

    .map(function(h) {

      return normalizeText_(h);

    });



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

  const row = new Array(sheet.getLastColumn()).fill("");



  Object.keys(obj).forEach(function(key) {

    if (headerMap[key]) {

      row[headerMap[key] - 1] = obj[key];

    }

  });



  sheet.appendRow(row);

}



function findRequiredHeaderIndex_(headers, candidates) {

  for (let i = 0; i < candidates.length; i++) {

    const idx = headers.indexOf(candidates[i]);

    if (idx !== -1) return idx;

  }



  throw new Error(

    "Thiếu cột: " + candidates.join(" / ")

  );

}



function findOptionalHeaderIndex_(headers, candidates) {

  for (let i = 0; i < candidates.length; i++) {

    const idx = headers.indexOf(candidates[i]);

    if (idx !== -1) return idx;

  }



  return -1;

}



/* =========================================================

   LOGIN - CHỈ ROLE worker

   ========================================================= */



function generateToken_() {

  return Utilities.getUuid() + "_" + new Date().getTime();

}



function saveSession_(user) {

  const token = generateToken_();



  CacheService

    .getScriptCache()

    .put(

      SESSION_PREFIX + token,

      JSON.stringify({

        useName: user.useName,

        role: user.role,

        department: user.department || "",

        loginAt: new Date().toISOString()

      }),

      SESSION_TTL_SECONDS

    );



  return token;

}



function getSession_(token) {

  if (!token) return null;



  const raw = CacheService

    .getScriptCache()

    .get(SESSION_PREFIX + token);



  if (!raw) return null;



  return JSON.parse(raw);

}



function requireWorker_(token) {

  const session = getSession_(token);



  if (!session) {

    throw new Error(

      "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."

    );

  }



  if (lowerText_(session.role) !== REQUIRED_ROLE) {

    throw new Error(

      "Không có quyền truy cập. Trang này chỉ dành cho tài khoản role worker."

    );

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



  const headers = values[0].map(function(h) {

    return normalizeText_(h);

  });



  const idxUseName = findRequiredHeaderIndex_(

    headers,

    ["useName"]

  );



  const idxPassWord = findRequiredHeaderIndex_(

    headers,

    ["passWord"]

  );



  const idxRole = findRequiredHeaderIndex_(

    headers,

    ["role"]

  );



  const idxDepartment = findOptionalHeaderIndex_(

    headers,

    ["department"]

  );



  for (let i = 1; i < values.length; i++) {

    const row = values[i];



    const rowUseName = normalizeText_(row[idxUseName]);

    const rowPassWord = normalizeText_(row[idxPassWord]);

    const rowRole = lowerText_(row[idxRole]);



    if (

      rowUseName === useName &&

      rowPassWord === passWord

    ) {

      if (rowRole !== REQUIRED_ROLE) {

        return {

          success: false,

          noPermission: true,

          message:

            "Tài khoản này không có role worker nên không được truy cập trang Công nhân xuất kho thủ công."

        };

      }



      const user = {

        useName: rowUseName,

        role: rowRole,

        department:

          idxDepartment === -1

            ? ""

            : normalizeText_(row[idxDepartment])

      };



      const token = saveSession_(user);



      return {

        success: true,

        token: token,

        user: user,

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

    CacheService

      .getScriptCache()

      .remove(SESSION_PREFIX + token);

  }



  return {

    success: true

  };

}



function getInitialData(token) {

  const session = requireWorker_(token);



  return {

    success: true,

    user: session,

    today: todayText_(),

    tonKho: getApprovedInventoryItems_(),

    plans: getProductionPlansForWorker_(),

    recentRequests: getWorkerManualExportHistory_(session, {

      fromDate: addDaysText_(todayText_(), -6),

      toDate: todayText_()

    })

  };

}



/* =========================================================

   UNIT CONVERSION

   ========================================================= */



function unitToKgFactor_(unit) {

  const u = lowerText_(unit);



  if (u === "g") return 0.001;

  if (u === "kg") return 1;

  if (u === "tấn" || u === "tan" || u === "t") {

    return 1000;

  }



  throw new Error(

    "Đơn vị không hỗ trợ quy đổi: " + unit

  );

}



function toKg_(value, unit) {

  const n = Number(value);

  if (!isFinite(n)) return 0;

  return n * unitToKgFactor_(unit);

}



function fromKg_(kg, unit) {

  return Number(kg) / unitToKgFactor_(unit);

}



function getNhaCungCapCapLookup_() {
  const sheet = getSheet_(SHEET_NGUYEN_LIEU);

  if (sheet.getLastRow() < 2) {
    return {
      byMaterialAndAccounting: {},
      byAccounting: {},
      byMaterial: {}
    };
  }

  const values = sheet.getDataRange().getDisplayValues();
  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idxMaNguyenLieu = findRequiredHeaderIndex_(
    headers,
    ["maNguyenLieu"]
  );

  const idxMaKeToan = findRequiredHeaderIndex_(
    headers,
    ["MaKeToan"]
  );

  const idxNhaCungCapCap = findRequiredHeaderIndex_(
    headers,
    ["nhaCungCapCap"]
  );

  const lookup = {
    byMaterialAndAccounting: {},
    byAccounting: {},
    byMaterial: {}
  };

  values.slice(1).forEach(function(row) {
    const maNguyenLieu = normalizeText_(row[idxMaNguyenLieu]);
    const maKeToan = normalizeText_(row[idxMaKeToan]);
    const nhaCungCapCap = normalizeText_(row[idxNhaCungCapCap]);

    // Dòng master chưa khai báo NCC thì không dùng để ghi đè
    // một giá trị NCC hợp lệ đã đọc ở dòng trước.
    if (!nhaCungCapCap) return;

    const materialKey = lowerText_(maNguyenLieu);
    const accountingKey = lowerText_(maKeToan);

    if (materialKey && accountingKey) {
      lookup.byMaterialAndAccounting[
        materialKey + "||" + accountingKey
      ] = nhaCungCapCap;
    }

    if (accountingKey && !lookup.byAccounting[accountingKey]) {
      lookup.byAccounting[accountingKey] = nhaCungCapCap;
    }

    if (materialKey && !lookup.byMaterial[materialKey]) {
      lookup.byMaterial[materialKey] = nhaCungCapCap;
    }
  });

  return lookup;
}

function getNhaCungCapCapForStock_(
  lookup,
  maNguyenLieu,
  maKeToan
) {
  const materialKey = lowerText_(maNguyenLieu);
  const accountingKey = lowerText_(maKeToan);

  if (materialKey && accountingKey) {
    const exact = lookup.byMaterialAndAccounting[
      materialKey + "||" + accountingKey
    ];

    if (exact) return exact;
  }

  if (accountingKey && lookup.byAccounting[accountingKey]) {
    return lookup.byAccounting[accountingKey];
  }

  if (materialKey && lookup.byMaterial[materialKey]) {
    return lookup.byMaterial[materialKey];
  }

  return "";
}

/* =========================================================

   KHO NGUYÊN LIỆU - CHỈ ĐỌC, TUYỆT ĐỐI KHÔNG TRỪ KHO

   ========================================================= */



function getKhoHeaderIndex_(headers) {

  return {

    Id: findRequiredHeaderIndex_(headers, ["Id"]),

    maNguyenLieu: findRequiredHeaderIndex_(

      headers,

      ["maNguyenLieu"]

    ),

    tenNguyenLieu: findRequiredHeaderIndex_(

      headers,

      ["tenNguyenLieu"]

    ),

    khoiLuongNhap: findRequiredHeaderIndex_(

      headers,

      ["khoiLuongNhap"]

    ),

    donVi: findRequiredHeaderIndex_(headers, ["donVi"]),

    quyCachDongGoi: findRequiredHeaderIndex_(

      headers,

      ["quyCachDongGoi"]

    ),

    LotNo: findRequiredHeaderIndex_(headers, ["LotNo"]),

    ngaySanXuat: findRequiredHeaderIndex_(

      headers,

      ["ngaySanXuat"]

    ),

    hanSuDung: findRequiredHeaderIndex_(

      headers,

      ["hanSuDung"]

    ),

    nhaCungCap: findRequiredHeaderIndex_(

      headers,

      ["nhaCungCap"]

    ),

    ngayNhap: findRequiredHeaderIndex_(

      headers,

      ["ngayNhap"]

    ),

    trangThai: findRequiredHeaderIndex_(

      headers,

      ["trangThai"]

    ),

    nguoiPheDuyetChatLuong: findRequiredHeaderIndex_(

      headers,

      ["nguoiPheDuyetChatLuong"]

    ),

    ngayPheDuyet: findRequiredHeaderIndex_(

      headers,

      ["ngayPheDuyet"]

    ),

    anhChatLuong: findOptionalHeaderIndex_(

      headers,

      ["anhChatLuong"]

    ),

    trangThaiNguyenLieu: findOptionalHeaderIndex_(

      headers,

      ["trangThaiNguyenLieu"]

    ),

    loaiNguyenLieu: findOptionalHeaderIndex_(

      headers,

      ["loaiNguyenLieu"]

    ),

    MaKeToan: findOptionalHeaderIndex_(

      headers,

      ["MaKeToan"]

    ),

    heSoQuyDoiKho: findOptionalHeaderIndex_(

      headers,

      ["heSoQuyDoiKho"]

    ),

    doViTinhToan: findOptionalHeaderIndex_(

      headers,

      ["doViTinhToan"]

    )

  };

}



function isApprovedInventoryStatus_(value) {

  const s = lowerText_(value);

  return (

    s === "đã phê duyệt" ||

    s === "da phe duyet"

  );

}



function isUsableMaterialStatus_(value) {

  const s = lowerText_(value);



  /*

   * Dữ liệu cũ chưa có trạng thái nguyên liệu:

   * vẫn cho hiển thị.

   */

  if (!s) return true;



  return (

    s === "sử dụng" ||

    s === "su dung"

  );

}



function getApprovedInventoryItems(token) {

  requireWorker_(token);



  return {

    success: true,

    tonKho: getApprovedInventoryItems_()

  };

}



function getApprovedInventoryItems_() {

  const sheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);



  if (sheet.getLastRow() < 2) {

    return [];

  }



  const values = sheet.getDataRange().getValues();

  const headers = values[0].map(function(h) {

    return normalizeText_(h);

  });



  const idx = getKhoHeaderIndex_(headers);
  const nhaCungCapCapLookup = getNhaCungCapCapLookup_();



  return values

    .slice(1)

    .filter(function(row) {

      return normalizeText_(row[idx.Id]);

    })

    .filter(function(row) {

      if (

        !isApprovedInventoryStatus_(

          row[idx.trangThai]

        )

      ) {

        return false;

      }



      const materialStatus =

        idx.trangThaiNguyenLieu === -1

          ? ""

          : row[idx.trangThaiNguyenLieu];



      if (!isUsableMaterialStatus_(materialStatus)) {

        return false;

      }



      return Number(row[idx.khoiLuongNhap]) > 0;

    })

    .map(function(row) {

      return {

        Id: normalizeText_(row[idx.Id]),

        maNguyenLieu: normalizeText_(

          row[idx.maNguyenLieu]

        ),

        tenNguyenLieu: normalizeText_(

          row[idx.tenNguyenLieu]

        ),

        khoiLuongNhap:

          Number(row[idx.khoiLuongNhap]) || 0,

        donVi: normalizeText_(row[idx.donVi]),

        quyCachDongGoi: normalizeText_(

          row[idx.quyCachDongGoi]

        ),

        LotNo: normalizeText_(row[idx.LotNo]),

        ngaySanXuat: formatDateValue_(

          row[idx.ngaySanXuat]

        ),

        hanSuDung: formatDateValue_(

          row[idx.hanSuDung]

        ),

        nhaCungCap: normalizeText_(

          row[idx.nhaCungCap]

        ),

        ngayNhap: formatDateValue_(

          row[idx.ngayNhap]

        ),

        trangThai: normalizeText_(row[idx.trangThai]),

        nguoiPheDuyetChatLuong: normalizeText_(

          row[idx.nguoiPheDuyetChatLuong]

        ),

        ngayPheDuyet: formatDateValue_(

          row[idx.ngayPheDuyet]

        ),

        anhChatLuong:

          idx.anhChatLuong === -1

            ? ""

            : normalizeText_(row[idx.anhChatLuong]),

        trangThaiNguyenLieu:

          idx.trangThaiNguyenLieu === -1

            ? ""

            : normalizeText_(row[idx.trangThaiNguyenLieu]),

        loaiNguyenLieu:

          idx.loaiNguyenLieu === -1

            ? ""

            : normalizeText_(row[idx.loaiNguyenLieu]),

        MaKeToan:

          idx.MaKeToan === -1

            ? ""

            : normalizeText_(row[idx.MaKeToan]),

        nhaCungCapCap:
          getNhaCungCapCapForStock_(
            nhaCungCapCapLookup,
            row[idx.maNguyenLieu],
            idx.MaKeToan === -1 ? "" : row[idx.MaKeToan]
          ),
        heSoQuyDoiKho:

          idx.heSoQuyDoiKho === -1

            ? ""

            : normalizeText_(row[idx.heSoQuyDoiKho]),

        doViTinhToan:

          idx.doViTinhToan === -1

            ? ""

            : normalizeText_(row[idx.doViTinhToan])

      };

    })

    .sort(function(a, b) {

      const c1 = String(

        a.hanSuDung || "9999-12-31"

      ).localeCompare(

        String(b.hanSuDung || "9999-12-31")

      );



      if (c1 !== 0) return c1;



      return String(

        a.ngayNhap || "9999-12-31"

      ).localeCompare(

        String(b.ngayNhap || "9999-12-31")

      );

    });

}



function getApprovedStockLotsByMaterial_(tenNguyenLieu, maKeToan) {
  const target = lowerText_(tenNguyenLieu);
  const targetAccounting = lowerText_(maKeToan);
  return getApprovedInventoryItems_().filter(function(item) {
    return lowerText_(item.tenNguyenLieu) === target &&
      (!targetAccounting || lowerText_(item.MaKeToan) === targetAccounting);
  }).map(function(item) {
    const clone = Object.assign({}, item);
    clone.qtyKg = toKg_(item.khoiLuongNhap, item.donVi);
    return clone;
  });
}

function getAvailableKgByMaterial_(tenNguyenLieu, maKeToan) {
  return getApprovedStockLotsByMaterial_(tenNguyenLieu, maKeToan).reduce(function(sum, item) {
    return sum + Number(item.qtyKg || 0);
  }, 0);
}

/* =========================================================

   PHIEU XUAT THU CONG

   ========================================================= */



function ensurePhieuXuatThuCongHeader_(sheet) {

  /*

   * Đúng cấu trúc người dùng vừa bổ sung.

   *

   * LƯU Ý:

   * - trangThai: trạng thái của dòng KhoNguyenLieu tại lúc tạo phiếu.

   * - TrangThaiXuatThuCong: trạng thái nghiệp vụ của phiếu thủ công.

   */

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

    "TrangThaiXuatThuCong"

  ];



  ensureSheetHeaders_(sheet, expectedHeaders);

}



function getPhieuXuatThuCongSheet_() {

  const ss = getSpreadsheet_();

  let sheet = ss.getSheetByName(

    SHEET_PHIEU_XUAT_THU_CONG

  );



  if (!sheet) {

    sheet = ss.insertSheet(

      SHEET_PHIEU_XUAT_THU_CONG

    );

  }



  ensurePhieuXuatThuCongHeader_(sheet);



  return sheet;

}



function buildManualExportLogObject_(

  stockItem,

  qtyInStockUnit,

  phieuId,

  stt,

  session,

  ghiChu

) {

  return {

    PhieuXuatThuCongId: phieuId,

    STT: stt,

    Id: stockItem.Id,

    maNguyenLieu: stockItem.maNguyenLieu,

    tenNguyenLieu: stockItem.tenNguyenLieu,



    /*

     * Giữ cách dùng cột hiện tại:

     * khoiLuongNhap ở PhieuXuatThuCong

     * chính là khối lượng yêu cầu xuất.

     */

    khoiLuongNhap: roundQty_(qtyInStockUnit),

    donVi: stockItem.donVi,



    quyCachDongGoi:

      stockItem.quyCachDongGoi || "",

    LotNo: stockItem.LotNo || "",

    ngaySanXuat: stockItem.ngaySanXuat || "",

    hanSuDung: stockItem.hanSuDung || "",

    nhaCungCap: stockItem.nhaCungCap || "",

    ngayNhap: stockItem.ngayNhap || "",



    /*

     * Snapshot trạng thái kho.

     */

    trangThai: stockItem.trangThai || "",

    nguoiPheDuyetChatLuong:

      stockItem.nguoiPheDuyetChatLuong || "",

    ngayPheDuyet:

      stockItem.ngayPheDuyet || "",

    anhChatLuong:

      stockItem.anhChatLuong || "",

    trangThaiNguyenLieu:

      stockItem.trangThaiNguyenLieu || "",

    loaiNguyenLieu:

      stockItem.loaiNguyenLieu || "",

    MaKeToan:

      stockItem.MaKeToan || "",

    heSoQuyDoiKho:

      stockItem.heSoQuyDoiKho || "",

    doViTinhToan:

      stockItem.doViTinhToan || "",



    ghiChu: ghiChu || "",



    /*

     * 3 cột mới.

     */

    nguoiXuatKhoThuCong:

      session.useName || "",

    thoiGianLuu:

      nowText_(),

    TrangThaiXuatThuCong:

      "Đã tạo"

  };

}



/* =========================================================

   TẠO PHIẾU - XUẤT TỪNG NGUYÊN LIỆU

   KHÔNG TRỪ KHO

   ========================================================= */



function createWorkerManualExportVoucher(

  token,

  payload

) {

  const session = requireWorker_(token);



  const items =

    payload &&

    Array.isArray(payload.items)

      ? payload.items

      : [];



  if (items.length === 0) {

    throw new Error(

      "Phiếu xuất chưa có nguyên liệu nào."

    );

  }



  const lock = LockService.getScriptLock();



  try {

    lock.waitLock(30000);



    /*

     * Chỉ đọc snapshot tồn kho hiện tại.

     * KHÔNG setValue vào KhoNguyenLieu.

     */

    const stockItems = getApprovedInventoryItems_();



    const stockMap = {};



    stockItems.forEach(function(item) {

      stockMap[item.Id] = item;

    });



    /*

     * Kiểm tra tổng yêu cầu trên cùng một Id kho,

     * tránh một phiếu tự vượt tồn của chính nó.

     */

    const requestedByStockId = {};



    items.forEach(function(item, index) {

      const idKho = normalizeText_(

        item && (item.IdKho || item.Id)

      );



      const qty = Number(

        item && item.khoiLuongXuat

      );



      const unit = normalizeText_(

        item && item.donViXuat

      );



      if (!idKho) {

        throw new Error(

          "Dòng " +

            (index + 1) +

            ": Thiếu Id kho."

        );

      }



      const stock = stockMap[idKho];



      if (!stock) {

        throw new Error(

          "Dòng " +

            (index + 1) +

            ": Id kho " +

            idKho +

            " không còn tồn khả dụng."

        );

      }



      if (!isFinite(qty) || qty <= 0) {

        throw new Error(

          "Dòng " +

            (index + 1) +

            ": Khối lượng xuất phải lớn hơn 0."

        );

      }



      if (lowerText_(unit) !== lowerText_(stock.donVi)) {

        throw new Error(

          "Dòng " +

            (index + 1) +

            ": Đơn vị xuất phải giống đơn vị tồn (" +

            stock.donVi +

            ")."

        );

      }



      if (!requestedByStockId[idKho]) {

        requestedByStockId[idKho] = 0;

      }



      requestedByStockId[idKho] += qty;



      if (

        requestedByStockId[idKho] >

        Number(stock.khoiLuongNhap) + 0.000001

      ) {

        throw new Error(

          "Id kho " +

            idKho +

            " chỉ còn " +

            stock.khoiLuongNhap +

            " " +

            stock.donVi +

            ", nhưng tổng yêu cầu trong phiếu là " +

            roundQty_(requestedByStockId[idKho]) +

            " " +

            stock.donVi +

            "."

        );

      }

    });



    const phieuId = generateId_("PXTC");

    const sheet = getPhieuXuatThuCongSheet_();



    items.forEach(function(item, index) {

      const idKho = normalizeText_(

        item.IdKho || item.Id

      );



      const stock = stockMap[idKho];



      const qty = Number(

        item.khoiLuongXuat

      );



      const ghiChu = normalizeText_(

        item.ghiChu

      );



      appendObjectRowByHeader_(

        sheet,

        buildManualExportLogObject_(

          stock,

          qty,

          phieuId,

          index + 1,

          session,

          ghiChu ||

            "Công nhân tạo phiếu xuất thủ công"

        )

      );

    });



    return {

      success: true,

      PhieuXuatThuCongId: phieuId,

      message:

        "Đã tạo phiếu xuất thủ công. Phiếu đang chờ thủ kho phê duyệt và CHƯA trừ KhoNguyenLieu.",

      recentRequests:

        getWorkerManualExportHistory_(

          session,

          {

            fromDate: addDaysText_(

              todayText_(),

              -6

            ),

            toDate: todayText_()

          }

        )

    };

  } finally {

    try {

      lock.releaseLock();

    } catch (err) {}

  }

}



/* =========================================================

   KẾ HOẠCH SẢN XUẤT

   ========================================================= */



function isActivePlanStatus_(value) {

  const s = lowerText_(value);



  if (!s) return true;



  return (

    s === "hoạt động" ||

    s === "hoat dong" ||

    s === "active"

  );

}



function getProductionPlansForWorker(token) {

  requireWorker_(token);



  return {

    success: true,

    plans: getProductionPlansForWorker_()

  };

}



function getProductionPlansForWorker_() {
  const sheet = getSheet_(SHEET_KE_HOACH_SAN_XUAT);
  if (sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(h) { return normalizeText_(h); });
  const idx = {
    Id: findRequiredHeaderIndex_(headers,["Id"]), tenBaiLieu: findRequiredHeaderIndex_(headers,["tenBaiLieu"]),
    soLuong: findRequiredHeaderIndex_(headers,["soLuong"]), NgaySanXuat: findRequiredHeaderIndex_(headers,["NgaySanXuat"]),
    khoiLuongMotMe: findOptionalHeaderIndex_(headers,["khoiLuongMotMe"]), trangThai: findOptionalHeaderIndex_(headers,["trangThai"]),
    tenNguyenLieu: findOptionalHeaderIndex_(headers,["tenNguyenLieu"]), MaKeToan: findOptionalHeaderIndex_(headers,["MaKeToan"])
  };
  const grouped={};
  values.slice(1).forEach(function(row){
    const id=normalizeText_(row[idx.Id]); if(!id) return;
    const status=idx.trangThai===-1?"":row[idx.trangThai]; if(!isActivePlanStatus_(status)) return;
    if(!grouped[id]) grouped[id]={Id:id,tenBaiLieu:normalizeText_(row[idx.tenBaiLieu]),soLuong:Number(row[idx.soLuong])||0,NgaySanXuat:formatDateValue_(row[idx.NgaySanXuat]),khoiLuongMotMe:idx.khoiLuongMotMe===-1?0:Number(row[idx.khoiLuongMotMe])||0,trangThai:idx.trangThai===-1?"Hoạt động":normalizeText_(row[idx.trangThai])||"Hoạt động",materials:[]};
    const ten=idx.tenNguyenLieu===-1?"":normalizeText_(row[idx.tenNguyenLieu]);
    const mkt=idx.MaKeToan===-1?"":normalizeText_(row[idx.MaKeToan]);
    if(ten||mkt) grouped[id].materials.push({tenNguyenLieu:ten,MaKeToan:mkt});
  });
  return Object.keys(grouped).map(function(id){return grouped[id];}).sort(function(a,b){const c=String(b.NgaySanXuat||"").localeCompare(String(a.NgaySanXuat||""));return c!==0?c:String(b.Id||"").localeCompare(String(a.Id||""));});
}

function getPlanById_(keHoachId) {

  const id = normalizeText_(keHoachId);



  return (

    getProductionPlansForWorker_()

      .find(function(item) {

        return item.Id === id;

      }) || null

  );

}



/* =========================================================

   BAI TRON LIEU

   ========================================================= */



function getBaiTronRows_() {

  const sheet = getSheet_(

    SHEET_BAI_TRON_LIEU

  );



  if (sheet.getLastRow() < 2) {

    return [];

  }



  const values = sheet.getDataRange().getValues();



  const headers = values[0].map(function(h) {

    return normalizeText_(h);

  });



  const idx = {

    Id: findOptionalHeaderIndex_(

      headers,

      ["Id"]

    ),

    tenBaiLieu: findRequiredHeaderIndex_(

      headers,

      ["tenBaiLieu"]

    ),

    STT: findRequiredHeaderIndex_(

      headers,

      ["STT"]

    ),

    maNguyenLieu: findRequiredHeaderIndex_(

      headers,

      ["maNguyenLieu"]

    ),

    tenNguyenLieu: findRequiredHeaderIndex_(

      headers,

      ["tenNguyenLieu"]

    ),

    khoiLuong: findRequiredHeaderIndex_(

      headers,

      ["khoiLuong"]

    ),

    donVi: findRequiredHeaderIndex_(

      headers,

      ["donVi"]

    ),

    sttTron: findRequiredHeaderIndex_(

      headers,

      ["sttTron"]

    ),

    canSuDung: findRequiredHeaderIndex_(

      headers,

      ["canSuDung"]

    )

  };



  return values

    .slice(1)

    .filter(function(row) {

      return normalizeText_(

        row[idx.tenBaiLieu]

      );

    })

    .map(function(row) {

      return {

        Id:

          idx.Id === -1

            ? ""

            : normalizeText_(row[idx.Id]),

        tenBaiLieu: normalizeText_(

          row[idx.tenBaiLieu]

        ),

        STT: row[idx.STT],

        maNguyenLieu: normalizeText_(

          row[idx.maNguyenLieu]

        ),

        tenNguyenLieu: normalizeText_(

          row[idx.tenNguyenLieu]

        ),

        khoiLuong:

          Number(row[idx.khoiLuong]) || 0,

        donVi: normalizeText_(row[idx.donVi]),

        sttTron: row[idx.sttTron],

        canSuDung: normalizeText_(

          row[idx.canSuDung]

        )

      };

    });

}



function isSmallScale_(canSuDung) {

  const s = lowerText_(canSuDung)

    .replace(/\s+/g, " ");



  return (

    s === "cân 6kg" ||

    s === "can 6kg" ||

    s === "cân phân tích" ||

    s === "can phan tich"

  );

}



function calculatePlanMaterialQty_(

  recipeItem,

  plan

) {

  const value =

    Number(recipeItem.khoiLuong) || 0;



  const batchCount =

    Number(plan.soLuong) || 0;



  const unit = normalizeText_(

    recipeItem.donVi

  );



  if (value <= 0 || batchCount <= 0) {

    return {

      khoiLuongCanXuat: 0,

      donViCanXuat: unit

    };

  }



  if (unit === "%") {

    const batchWeight =

      Number(plan.khoiLuongMotMe);



    if (

      !isFinite(batchWeight) ||

      batchWeight <= 0

    ) {

      throw new Error(

        "Kế hoạch " +

          plan.Id +

          " dùng bài liệu theo %, nhưng khoiLuongMotMe không hợp lệ."

      );

    }



    const kg =

      value *

      batchWeight *

      batchCount /

      100;



    if (isSmallScale_(recipeItem.canSuDung)) {

      return {

        khoiLuongCanXuat:

          roundQty_(kg * 1000),

        donViCanXuat: "g"

      };

    }



    return {

      khoiLuongCanXuat:

        roundQty_(kg),

      donViCanXuat: "kg"

    };

  }



  return {

    khoiLuongCanXuat:

      roundQty_(value * batchCount),

    donViCanXuat: unit

  };

}



/* =========================================================

   ALLOCATION PREVIEW - KHÔNG TRỪ KHO

   ========================================================= */



function allocateMaterialLots_(
  tenNguyenLieu,
  maKeToan,
  requiredKg,

  virtualRemainingMap

) {

  const lots = getApprovedStockLotsByMaterial_(tenNguyenLieu, maKeToan);



  let remainingKg =

    Number(requiredKg) || 0;



  const allocations = [];



  lots.forEach(function(lot) {

    if (remainingKg <= 0.000001) return;



    const mapKey = lot.Id;



    const lotRemainingKg =

      Object.prototype.hasOwnProperty.call(

        virtualRemainingMap,

        mapKey

      )

        ? Number(virtualRemainingMap[mapKey])

        : Number(lot.qtyKg || 0);



    if (lotRemainingKg <= 0.000001) {

      virtualRemainingMap[mapKey] = 0;

      return;

    }



    const usedKg = Math.min(

      lotRemainingKg,

      remainingKg

    );



    allocations.push({

      Id: lot.Id,

      maNguyenLieu: lot.maNguyenLieu,

      tenNguyenLieu: lot.tenNguyenLieu,

      LotNo: lot.LotNo,

      hanSuDung: lot.hanSuDung,

      ngayNhap: lot.ngayNhap,

      khoiLuongKho: lot.khoiLuongNhap,

      donViKho: lot.donVi,

      qtyKg: usedKg,

      khoiLuongSeXuat:

        roundQty_(

          fromKg_(usedKg, lot.donVi)

        )

    });



    virtualRemainingMap[mapKey] =

      lotRemainingKg - usedKg;



    remainingKg -= usedKg;

  });



  return {

    allocations: allocations,

    duSoLuong:

      remainingKg <= 0.000001,

    thieuKg:

      Math.max(0, remainingKg)

  };

}



function buildPlanPreview_(

  plan,

  actualMap

) {

  const recipeRows = getBaiTronRows_()

    .filter(function(item) {

      return (

        normalizeText_(item.tenBaiLieu) ===

        normalizeText_(plan.tenBaiLieu)

      );

    });



  if (recipeRows.length === 0) {

    throw new Error(

      "Không tìm thấy nguyên liệu của bài trộn: " +

        plan.tenBaiLieu

    );

  }

  const planAccountingMap = {};
  (plan.materials || []).forEach(function(material) {
    if (material.tenNguyenLieu) planAccountingMap[lowerText_(material.tenNguyenLieu)] = normalizeText_(material.MaKeToan);
  });



  const virtualRemainingMap = {};



  return recipeRows.map(function(item) {
    const maKeToan = planAccountingMap[lowerText_(item.tenNguyenLieu)] || "";

    const calculated =

      calculatePlanMaterialQty_(

        item,

        plan

      );



    const key =

      normalizeText_(item.STT) +

      "||" +

      normalizeText_(item.maNguyenLieu) +

      "||" +

      normalizeText_(maKeToan);



    const actualQty =

      actualMap &&

      Object.prototype.hasOwnProperty.call(

        actualMap,

        key

      )

        ? Number(actualMap[key])

        : Number(

            calculated.khoiLuongCanXuat

          );



    if (

      !isFinite(actualQty) ||

      actualQty <= 0

    ) {

      throw new Error(

        "Khối lượng xuất thực tế không hợp lệ cho " +

          item.tenNguyenLieu +

          "."

      );

    }



    const actualKg = toKg_(

      actualQty,

      calculated.donViCanXuat

    );



    const availableKg =

      getAvailableKgByMaterial_(item.tenNguyenLieu, maKeToan);



    const allocation =

      allocateMaterialLots_(
        item.tenNguyenLieu,
        maKeToan,
        actualKg,

        virtualRemainingMap

      );



    return {

      STT: item.STT,

      maNguyenLieu: item.maNguyenLieu,

      tenNguyenLieu: item.tenNguyenLieu,
      MaKeToan: maKeToan,



      khoiLuongCanXuat:

        calculated.khoiLuongCanXuat,



      khoiLuongXuatThucTe:

        roundQty_(actualQty),



      donViCanXuat:

        calculated.donViCanXuat,



      sttTron: item.sttTron,

      canSuDung: item.canSuDung,



      tonKhoKhaDung:

        roundQty_(

          fromKg_(

            availableKg,

            calculated.donViCanXuat

          )

        ),



      duSoLuong:

        allocation.duSoLuong,



      lots:

        allocation.allocations

    };

  });

}



function getWorkerProductionPlanDetail(

  token,

  keHoachId

) {

  requireWorker_(token);



  const plan = getPlanById_(keHoachId);



  if (!plan) {

    throw new Error(

      "Không tìm thấy kế hoạch Hoạt động: " +

        keHoachId

    );

  }



  const items = buildPlanPreview_(

    plan,

    {}

  );



  return {

    success: true,

    plan: plan,

    items: items,

    duToanBo: items.every(function(item) {

      return item.duSoLuong;

    })

  };

}



/* =========================================================

   TẠO PHIẾU TỪ KẾ HOẠCH

   - KHÔNG TRỪ KHO

   - GHI PhieuXuatThuCong

   ========================================================= */



function createWorkerPlanExportVoucher(

  token,

  keHoachId,

  actualItems

) {

  const session = requireWorker_(token);



  const plan = getPlanById_(keHoachId);



  if (!plan) {

    throw new Error(

      "Không tìm thấy kế hoạch Hoạt động: " +

        keHoachId

    );

  }



  const actualMap = {};



  (

    Array.isArray(actualItems)

      ? actualItems

      : []

  ).forEach(function(item) {

    const stt = normalizeText_(

      item && item.STT

    );



    const ma = normalizeText_(

      item && item.maNguyenLieu

    );



    const maKeToan = normalizeText_(item && item.MaKeToan);

    const qty = Number(

      item && item.khoiLuongXuatThucTe

    );



    if (!stt || !ma) return;



    if (!isFinite(qty) || qty <= 0) {

      throw new Error(

        "Khối lượng xuất thực tế không hợp lệ cho " +

          ma +

          "."

      );

    }



    actualMap[stt + "||" + ma + "||" + maKeToan] = qty;

  });



  const lock = LockService.getScriptLock();



  try {

    lock.waitLock(30000);



    /*

     * Re-read và tính lại allocation ở thời điểm bấm tạo phiếu.

     * Vẫn KHÔNG trừ kho.

     */

    const lines = buildPlanPreview_(

      plan,

      actualMap

    );



    const insufficient = lines.filter(function(item) {

      return !item.duSoLuong;

    });



    if (insufficient.length > 0) {

      throw new Error(

        "Không đủ tồn kho cho: " +

          insufficient

            .map(function(item) {

              return item.tenNguyenLieu;

            })

            .join(", ") +

          ". Vui lòng tải lại và kiểm tra."

      );

    }



    const phieuId = generateId_("PXTC");

    const sheet = getPhieuXuatThuCongSheet_();



    /*

     * Cần stock detail đầy đủ để ghi snapshot.

     */

    const stockMap = {};



    getApprovedInventoryItems_().forEach(

      function(item) {

        stockMap[item.Id] = item;

      }

    );



    let sttLog = 1;



    lines.forEach(function(line) {

      line.lots.forEach(function(lot) {

        const stock = stockMap[lot.Id];



        if (!stock) {

          throw new Error(

            "Id kho " +

              lot.Id +

              " không còn tồn khả dụng."

          );

        }



        const note =

          "[Theo kế hoạch: " +

          plan.Id +

          "] " +

          "Bài liệu: " +

          plan.tenBaiLieu +

          " | Ngày SX: " +

          plan.NgaySanXuat +

          " | Số mẻ: " +

          plan.soLuong +

          " | STT bài liệu: " +

          line.STT +

          " | STT trộn: " +

          line.sttTron +

          " | Cân: " +

          line.canSuDung +

          " | KL cần xuất: " +

          line.khoiLuongCanXuat +

          " " +

          line.donViCanXuat +

          " | KL thực tế yêu cầu: " +

          line.khoiLuongXuatThucTe +

          " " +

          line.donViCanXuat;



        appendObjectRowByHeader_(

          sheet,

          buildManualExportLogObject_(

            stock,

            lot.khoiLuongSeXuat,

            phieuId,

            sttLog,

            session,

            note

          )

        );



        sttLog++;

      });

    });



    return {

      success: true,

      PhieuXuatThuCongId: phieuId,

      message:

        "Đã tạo phiếu xuất theo kế hoạch " +

        plan.Id +

        ". Phiếu đang chờ thủ kho phê duyệt và CHƯA trừ KhoNguyenLieu.",

      recentRequests:

        getWorkerManualExportHistory_(

          session,

          {

            fromDate: addDaysText_(

              todayText_(),

              -6

            ),

            toDate: todayText_()

          }

        )

    };

  } finally {

    try {

      lock.releaseLock();

    } catch (err) {}

  }

}



/* =========================================================

   HISTORY - PHIẾU DO CÔNG NHÂN ĐANG ĐĂNG NHẬP TẠO

   ========================================================= */



function addDaysText_(dateText, days) {

  const parts = String(dateText || "").split("-");



  if (parts.length !== 3) {

    return dateText;

  }



  const d = new Date(

    Number(parts[0]),

    Number(parts[1]) - 1,

    Number(parts[2])

  );



  d.setDate(d.getDate() + Number(days || 0));



  return Utilities.formatDate(

    d,

    Session.getScriptTimeZone(),

    "yyyy-MM-dd"

  );

}



function getWorkerManualExportHistory(

  token,

  filter

) {

  const session = requireWorker_(token);



  return {

    success: true,

    rows: getWorkerManualExportHistory_(

      session,

      filter || {}

    )

  };

}



function getWorkerManualExportHistory_(

  session,

  filter

) {

  const sheet = getPhieuXuatThuCongSheet_();



  if (sheet.getLastRow() < 2) {

    return [];

  }



  filter = filter || {};



  const fromDate = normalizeText_(

    filter.fromDate

  );



  const toDate = normalizeText_(

    filter.toDate

  );



  const values = sheet.getDataRange().getValues();



  const headers = values[0].map(function(h) {

    return normalizeText_(h);

  });



  const idx = {

    PhieuXuatThuCongId:

      findRequiredHeaderIndex_(

        headers,

        ["PhieuXuatThuCongId"]

      ),

    STT:

      findRequiredHeaderIndex_(

        headers,

        ["STT"]

      ),

    Id:

      findRequiredHeaderIndex_(

        headers,

        ["Id"]

      ),

    maNguyenLieu:

      findRequiredHeaderIndex_(

        headers,

        ["maNguyenLieu"]

      ),

    tenNguyenLieu:

      findRequiredHeaderIndex_(

        headers,

        ["tenNguyenLieu"]

      ),

    MaKeToan: findOptionalHeaderIndex_(headers, ["MaKeToan"]),

    khoiLuongNhap:

      findRequiredHeaderIndex_(

        headers,

        ["khoiLuongNhap"]

      ),

    donVi:

      findRequiredHeaderIndex_(

        headers,

        ["donVi"]

      ),

    LotNo:

      findRequiredHeaderIndex_(

        headers,

        ["LotNo"]

      ),

    hanSuDung:

      findRequiredHeaderIndex_(

        headers,

        ["hanSuDung"]

      ),

    ghiChu:

      findRequiredHeaderIndex_(

        headers,

        ["ghiChu"]

      ),

    nguoiXuatKhoThuCong:

      findRequiredHeaderIndex_(

        headers,

        ["nguoiXuatKhoThuCong"]

      ),

    thoiGianLuu:

      findRequiredHeaderIndex_(

        headers,

        ["thoiGianLuu"]

      ),

    TrangThaiXuatThuCong:

      findRequiredHeaderIndex_(

        headers,

        ["TrangThaiXuatThuCong"]

      )

  };



  const userName = normalizeText_(

    session.useName

  );



  return values

    .slice(1)

    .filter(function(row) {

      return (

        normalizeText_(

          row[idx.nguoiXuatKhoThuCong]

        ) === userName

      );

    })

    .filter(function(row) {

      const dateText = formatDateValue_(

        row[idx.thoiGianLuu]

      );



      if (fromDate && dateText < fromDate) {

        return false;

      }



      if (toDate && dateText > toDate) {

        return false;

      }



      return true;

    })

    .map(function(row) {

      return {

        PhieuXuatThuCongId:

          normalizeText_(

            row[idx.PhieuXuatThuCongId]

          ),

        STT: row[idx.STT],

        Id: normalizeText_(row[idx.Id]),

        maNguyenLieu:

          normalizeText_(row[idx.maNguyenLieu]),

        tenNguyenLieu:

          normalizeText_(row[idx.tenNguyenLieu]),

        MaKeToan:
          idx.MaKeToan === -1 ? "" : normalizeText_(row[idx.MaKeToan]),

        khoiLuongNhap:

          row[idx.khoiLuongNhap],

        donVi:

          normalizeText_(row[idx.donVi]),

        LotNo:

          normalizeText_(row[idx.LotNo]),

        hanSuDung:

          formatDateValue_(row[idx.hanSuDung]),

        ghiChu:

          normalizeText_(row[idx.ghiChu]),

        nguoiXuatKhoThuCong:

          normalizeText_(

            row[idx.nguoiXuatKhoThuCong]

          ),

        thoiGianLuu:

          normalizeText_(row[idx.thoiGianLuu]),

        TrangThaiXuatThuCong:

          normalizeText_(row[idx.TrangThaiXuatThuCong]) ||

          "Đã tạo"

      };

    })

    .sort(function(a, b) {

      const c = String(

        b.thoiGianLuu || ""

      ).localeCompare(

        String(a.thoiGianLuu || "")

      );



      if (c !== 0) return c;



      return String(

        b.PhieuXuatThuCongId || ""

      ).localeCompare(

        String(a.PhieuXuatThuCongId || "")

      );

    });

}
