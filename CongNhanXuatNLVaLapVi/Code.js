const SPREADSHEET_ID = "1yFlCpC6JzLRmv9hukNw05vYpeYmkhXRcPC-0nCNOjAQ";

const SHEET_ACCOUNT = "account";
const SHEET_BAI_TRON_LIEU = "BaiTronLieu";
const SHEET_KE_HOACH_SAN_XUAT = "KeHoachSanXuat";
const SHEET_KHO_NGUYEN_LIEU = "KhoNguyenLieu";
const SHEET_PHIEU_XUAT_NGUYEN_LIEU = "PhieuXuatNguyenLieu";
const SHEET_CHI_TIET_LAP_VI = "chiTietLapVi";
const SHEET_CHI_TIET_SAN_XUAT_BAN_THANH_PHAM = "ChiTietSanXuatBanThanhPham";
const SHEET_KE_HOACH_LAP_VI_VTBC = "KeHoachLapViVTBC";
const SHEET_CHI_TIET_BTP_THEO_THUNG = "ChiTietBTPtheoThung";
const SHEET_LICH_SU_LAP_VI = "LichSuLapVi";
const SHEET_DANH_SACH_SAN_PHAM_VTBC = "DanhSachSanPhamVTBC";

const SHEET_KET_QUA_LAP_VI =
  "KetQuaLapVi";

const SHEET_NHAP_LAI_KHO_VIEN_VTBC =
  "NhapLaiKhoVienVTBC";

const SHEET_VIEN_VTBC_HONG =
  "VienVTBCHong";

const SHEET_KE_HOACH_EP_MANG_IN =
  "KeHoachEpMangIn";

const SHEET_KE_HOACH_DONG_THUNG =
  "KeHoachDongThung";

const SESSION_PREFIX = "SESSION_WORKER_";
const SESSION_TTL_SECONDS = 6 * 60 * 60;

function doGet(e) {
  const template = HtmlService.createTemplateFromFile("index");

  template.webAppUrl = ScriptApp.getService().getUrl();
  template.qr = e && e.parameter && e.parameter.qr ? e.parameter.qr : "";
  template.lineId = e && e.parameter && e.parameter.lineId ? e.parameter.lineId : "";

  return template
    .evaluate()
    .setTitle("Xuất NL và tạo mã lắp vỉ")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet_(sheetName) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Không tìm thấy sheet: " + sheetName);
  return sheet;
}

function getOrCreateSheet_(sheetName, headers) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function normalizeText_(value) {
  return String(value || "").trim();
}

function lowerText_(value) {
  return normalizeText_(value).toLowerCase();
}

function normalizeForCompare_(value) {
  return normalizeText_(value)
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function formatDateValue_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  return normalizeText_(value);
}

function nowText_() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd HH:mm:ss"
  );
}

function todayText_() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );
}

function generateToken_() {
  return Utilities.getUuid() + "_" + new Date().getTime();
}

function generateExportId_() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `PXNL${y}${m}${d}${h}${mi}${s}${random}`;
}

function generateThungDungViId_() {
  return (
    "TGLV_VTBC_" +
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyyMMddHHmmssSSS"
    )
  );
}

function generateLapViExportHistoryId_() {
  return (
    "CNXLV_" +
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyyMMddHHmmssSSS"
    )
  );
}

function getTenSanPhamVTBCMap_() {
  const ss = getSpreadsheet_();

  const sheet = ss.getSheetByName(
    SHEET_DANH_SACH_SAN_PHAM_VTBC
  );

  if (!sheet || sheet.getLastRow() < 2) {
    return {};
  }

  const values = sheet
    .getDataRange()
    .getValues();

  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idxMaSanPham =
    findOptionalHeaderIndex_(
      headers,
      ["maSanPham"]
    );

  const idxTenSanPham =
    findOptionalHeaderIndex_(
      headers,
      ["tenSanPham"]
    );

  if (
    idxMaSanPham === -1 ||
    idxTenSanPham === -1
  ) {
    return {};
  }

  const map = {};

  for (let i = 1; i < values.length; i++) {
    const maSanPham = normalizeText_(
      values[i][idxMaSanPham]
    );

    const tenSanPham = normalizeText_(
      values[i][idxTenSanPham]
    );

    if (maSanPham && !map[maSanPham]) {
      map[maSanPham] = tenSanPham;
    }
  }

  return map;
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

function requireWorker_(token) {
  const session = getSession_(token);

  if (!session) {
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  if (session.role !== "worker") {
    throw new Error("Không có quyền truy cập. Chỉ tài khoản worker được sử dụng trang này.");
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
    const rowRole = lowerText_(row[idxRole]);

    if (rowUseName === useName && rowPassWord === passWord) {
      if (rowRole !== "worker") {
        return {
          success: false,
          message: "Tài khoản này không có quyền truy cập trang xuất hàng phòng cân."
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
  const session = requireWorker_(token);

  return {
    success: true,
    user: session,
    today: todayText_(),
    tomorrow: tomorrowText_(),

    keHoachHomNay: getTodayProductionExportData_(),
    phieuXuatDaDuyetHomNay: getApprovedExportRequestsToday_(
      session.useName || ""
    ),

    lapViGanNhat: getRecentLapViProducts_(
      session.useName || "",
      3
    ),

    lapViHomNay: getLapViToday_(
      session.useName || ""
    ),

    lapViExportFromDate: yesterdayText_(),
    lapViExportToDate: todayText_(),

    keHoachXuatLapVi: getKeHoachXuatLapViVTBC_({
      fromDate: yesterdayText_(),
      toDate: todayText_()
    }),

    ketQuaLapViFromDate:
      yesterdayText_(),

    ketQuaLapViToDate:
      todayText_(),

    ketQuaLapViPlans:
      getKetQuaLapViPlans_({
        fromDate: yesterdayText_(),
        toDate: todayText_()
      }),

    taoVienFromDate:
      yesterdayText_(),

    taoVienToDate:
      todayText_(),

    taoVienCards:
      getTaoVienCards_({
        fromDate:
          yesterdayText_(),

        toDate:
          todayText_()
      }),

    /*
    * Ép màng in.
    */
    epMangInFromDate:
      yesterdayText_(),

    epMangInToDate:
      todayText_(),

    epMangInPlans:
      getWorkerSimplePlans_(
        getWorkerEpMangInConfig_(),
        {
          fromDate:
            yesterdayText_(),

          toDate:
            todayText_()
        }
      ),

    epMangInHistory:
      getWorkerSimplePlanHistory_(
        getWorkerEpMangInConfig_()
      ),

    /*
    * Đóng thùng.
    */
    dongThungFromDate:
      yesterdayText_(),

    dongThungToDate:
      todayText_(),

    dongThungPlans:
      getWorkerSimplePlans_(
        getWorkerDongThungConfig_(),
        {
          fromDate:
            yesterdayText_(),

          toDate:
            todayText_()
        }
      ),

    dongThungHistory:
      getWorkerSimplePlanHistory_(
        getWorkerDongThungConfig_()
      )
  };
}

function getTodayProductionExportData(token) {
  const session = requireWorker_(token);

  return {
    success: true,
    today: todayText_(),
    tomorrow: tomorrowText_(),
    keHoachHomNay: getTodayProductionExportData_(),
    phieuXuatDaDuyetHomNay: getApprovedExportRequestsToday_(session.useName || ""),
    lapViGanNhat: getRecentLapViProducts_(session.useName || "", 3),
    lapViHomNay: getLapViToday_(session.useName || ""),
    lapViExportFromDate: yesterdayText_(),
    lapViExportToDate: todayText_(),
    keHoachXuatLapVi: getKeHoachXuatLapViVTBC_({
      fromDate: yesterdayText_(),
      toDate: todayText_()
    })
  };
}

function getProductionExportDataByDate(token, payload) {
  const session = requireWorker_(token);

  const selectedDate = validateDateText_(payload && payload.date);

  const plansByDate = getProductionPlansByDateList_([selectedDate]);

  return {
    success: true,
    today: todayText_(),
    tomorrow: tomorrowText_(),
    selectedDate: selectedDate,

    // Giữ tên keHoachHomNay để index.html không phải sửa quá nhiều.
    // Nhưng thực tế đây là kế hoạch của ngày đang chọn.
    keHoachHomNay: buildProductionExportDataFromPlans_(plansByDate),

    // Phần phiếu đã duyệt vẫn giữ logic hiện tại hôm nay + ngày mai.
    phieuXuatDaDuyetHomNay: getApprovedExportRequestsToday_(session.useName || ""),

    lapViGanNhat: getRecentLapViProducts_(session.useName || "", 3),
    lapViHomNay: getLapViToday_(session.useName || "")
  };
}

function buildExportLineId_(keHoachId, stt, maNguyenLieu, sttTron) {
  return [
    normalizeText_(keHoachId),
    normalizeText_(stt),
    normalizeText_(maNguyenLieu),
    normalizeText_(sttTron)
  ].join("_");
}

function getProductionPlanById_(keHoachId) {
  const sheet =
    getSheet_(SHEET_KE_HOACH_SAN_XUAT);

  if (sheet.getLastRow() < 2) {
    return null;
  }

  const values =
    sheet.getDataRange().getValues();

  const headers =
    values[0].map(function(h) {
      return normalizeText_(h);
    });

  const idxId =
    findRequiredHeaderIndex_(
      headers,
      ["Id"]
    );

  const idxTenBaiLieu =
    findRequiredHeaderIndex_(
      headers,
      ["tenBaiLieu"]
    );

  const idxSoLuong =
    findRequiredHeaderIndex_(
      headers,
      ["soLuong"]
    );

  const idxNgaySanXuat =
    findRequiredHeaderIndex_(
      headers,
      ["NgaySanXuat"]
    );

  const idxKhoiLuongMotMe =
    findOptionalHeaderIndex_(
      headers,
      ["khoiLuongMotMe"]
    );

  const idxTrangThai =
    findOptionalHeaderIndex_(
      headers,
      ["trangThai"]
    );

  const idxTenNguyenLieu =
    findRequiredHeaderIndex_(
      headers,
      ["tenNguyenLieu"]
    );

  const idxMaKeToan =
    findRequiredHeaderIndex_(
      headers,
      ["MaKeToan"]
    );

  const matchedRows =
    values
      .slice(1)
      .filter(function(row) {
        return (
          normalizeText_(
            row[idxId]
          ) ===
          normalizeText_(
            keHoachId
          )
        );
      });

  if (!matchedRows.length) {
    return null;
  }

  const firstRow =
    matchedRows[0];

  const trangThai =
    idxTrangThai === -1
      ? "Hoạt động"
      : normalizeText_(
          firstRow[idxTrangThai]
        );

  if (
    !isActiveProductionPlanStatus_(
      trangThai
    )
  ) {
    return null;
  }

  const materials =
    matchedRows.map(function(row) {
      return {
        tenNguyenLieu:
          normalizeText_(
            row[idxTenNguyenLieu]
          ),

        MaKeToan:
          normalizeText_(
            row[idxMaKeToan]
          )
      };
    });

  return {
    Id:
      normalizeText_(
        firstRow[idxId]
      ),

    tenBaiLieu:
      normalizeText_(
        firstRow[idxTenBaiLieu]
      ),

    soLuong:
      Number(
        firstRow[idxSoLuong]
      ),

    khoiLuongMotMe:
      idxKhoiLuongMotMe === -1
        ? ""
        : Number(
            firstRow[
              idxKhoiLuongMotMe
            ]
          ),

    NgaySanXuat:
      formatDateValue_(
        firstRow[
          idxNgaySanXuat
        ]
      ),

    trangThai:
      trangThai ||
      "Hoạt động",

    materials:
      materials
  };
}

function isSmallScale_(canSuDung) {
  const s = normalizeForCompare_(canSuDung);

  return s === "cân 6kg" ||
    s === "can 6kg" ||
    s === "cân phân tích" ||
    s === "can phan tich";
}

function calculateExportQuantity_(item, plan) {
  const giaTri = Number(item.khoiLuong) || 0;
  const soMe = Number(plan.soLuong) || 0;
  const donViGoc = normalizeText_(item.donVi);
  const canSuDung = normalizeText_(item.canSuDung);

  if (donViGoc === "%") {
    const khoiLuongMotMe = Number(plan.khoiLuongMotMe);

    if (!isFinite(khoiLuongMotMe) || khoiLuongMotMe <= 0) {
      throw new Error(
        "Kế hoạch " + plan.Id +
        " đang dùng bài liệu theo %, cần có cột khoiLuongMotMe và giá trị khối lượng 1 mẻ > 0."
      );
    }

    const khoiLuongKg = giaTri * khoiLuongMotMe * soMe / 100;

    if (isSmallScale_(canSuDung)) {
      return {
        khoiLuongCanXuat: Math.round(khoiLuongKg * 1000 * 1000) / 1000,
        donViCanXuat: "g"
      };
    }

    return {
      khoiLuongCanXuat: Math.round(khoiLuongKg * 1000) / 1000,
      donViCanXuat: "kg"
    };
  }

  return {
    khoiLuongCanXuat: Math.round(giaTri * soMe * 1000) / 1000,
    donViCanXuat: donViGoc
  };
}

function getExpectedExportItemsForPlan_(plan) {
  const batches =
    getBaiTronLieuRows_();

  const items =
    batches.filter(function(item) {
      return (
        item.tenBaiLieu ===
        plan.tenBaiLieu
      );
    });

  /*
   * Map:
   * tên nguyên liệu -> mã kế toán
   *
   * Dữ liệu lấy từ KeHoachSanXuat.
   */
  const accountingMap = {};

  (plan.materials || [])
    .forEach(function(item) {

      const key =
        normalizeText_(
          item.tenNguyenLieu
        ).toLowerCase();

      if (key) {
        accountingMap[key] =
          normalizeText_(
            item.MaKeToan
          );
      }
    });

  return items.map(function(item) {

    const calculated =
      calculateExportQuantity_(
        item,
        plan
      );

    const materialKey =
      normalizeText_(
        item.tenNguyenLieu
      ).toLowerCase();

    const MaKeToan =
      normalizeText_(
        accountingMap[
          materialKey
        ]
      );

    if (!MaKeToan) {
      throw new Error(
        "Kế hoạch " +
        plan.Id +
        " chưa có mã kế toán cho nguyên liệu: " +
        item.tenNguyenLieu
      );
    }

    return {
      lineId:
        buildExportLineId_(
          plan.Id,
          item.STT,
          item.maNguyenLieu,
          item.sttTron
        ),

      keHoachId:
        plan.Id,

      tenBaiLieu:
        plan.tenBaiLieu,

      soLuong:
        plan.soLuong,

      ngaySanXuat:
        plan.NgaySanXuat,

      STT:
        item.STT,

      maNguyenLieu:
        item.maNguyenLieu,

      tenNguyenLieu:
        item.tenNguyenLieu,

      MaKeToan:
        MaKeToan,

      khoiLuongGoc:
        item.khoiLuong,

      donViGoc:
        item.donVi,

      khoiLuongCanXuat:
        calculated
          .khoiLuongCanXuat,

      donVi:
        calculated
          .donViCanXuat,

      sttTron:
        item.sttTron,

      canSuDung:
        item.canSuDung
    };
  });
}

function buildProductionExportDataFromPlans_(plans) {
  const activeExportMap = getActiveExportPlanIds_();

  const result = [];

  plans.forEach(function(plan) {
    // Giữ nguyên logic cũ:
    // Nếu kế hoạch đã có phiếu xuất chưa hủy thì không hiển thị nữa.
    if (activeExportMap[plan.Id]) {
      return;
    }

    const expectedItems = getExpectedExportItemsForPlan_(plan);

    const exportItems = expectedItems.map(function(item) {
      return {
        lineId: item.lineId,
        keHoachId: item.keHoachId,
        tenBaiLieu: item.tenBaiLieu,
        soLuong: item.soLuong,
        ngaySanXuat: item.ngaySanXuat,
        STT: item.STT,
        maNguyenLieu: item.maNguyenLieu,
        MaKeToan: item.MaKeToan,
        khoiLuongGoc: item.khoiLuongGoc,
        khoiLuongCanXuat: item.khoiLuongCanXuat,
        donVi: item.donVi,
        sttTron: item.sttTron,
        canSuDung: item.canSuDung,
        scanned: null
      };
    });

    result.push({
      keHoachId: plan.Id,
      tenBaiLieu: plan.tenBaiLieu,
      soLuong: plan.soLuong,
      ngaySanXuat: plan.NgaySanXuat,
      tongNguyenLieu: exportItems.length,
      items: exportItems
    });
  });

  return result;
}

function getTodayProductionExportData_() {
  const plans = getTodayProductionPlans_();
  return buildProductionExportDataFromPlans_(plans);
}

function isActiveProductionPlanStatus_(status) {
  const s = normalizeText_(status).toLowerCase();

  // Dữ liệu cũ chưa có trạng thái thì vẫn cho là hoạt động
  if (!s) return true;

  return s === "hoạt động" ||
    s === "hoat dong" ||
    s === "active";
}

function getProductionPlansByDateList_(dateList) {
  const sheet =
    getSheet_(SHEET_KE_HOACH_SAN_XUAT);

  if (sheet.getLastRow() < 2) {
    return [];
  }

  const dateMap = {};

  (dateList || [])
    .forEach(function(d) {
      const cleanDate =
        normalizeText_(d);

      if (cleanDate) {
        dateMap[cleanDate] = true;
      }
    });

  const values =
    sheet.getDataRange().getValues();

  const headers =
    values[0].map(function(h) {
      return normalizeText_(h);
    });

  const idxId =
    findRequiredHeaderIndex_(
      headers,
      ["Id"]
    );

  const idxTenBaiLieu =
    findRequiredHeaderIndex_(
      headers,
      ["tenBaiLieu"]
    );

  const idxSoLuong =
    findRequiredHeaderIndex_(
      headers,
      ["soLuong"]
    );

  const idxNgaySanXuat =
    findRequiredHeaderIndex_(
      headers,
      ["NgaySanXuat"]
    );

  const idxKhoiLuongMotMe =
    findOptionalHeaderIndex_(
      headers,
      ["khoiLuongMotMe"]
    );

  const idxTrangThai =
    findOptionalHeaderIndex_(
      headers,
      ["trangThai"]
    );

  const idxTenNguyenLieu =
    findRequiredHeaderIndex_(
      headers,
      ["tenNguyenLieu"]
    );

  const idxMaKeToan =
    findRequiredHeaderIndex_(
      headers,
      ["MaKeToan"]
    );

  const planMap = {};

  values
    .slice(1)
    .forEach(function(row) {

      const id =
        normalizeText_(
          row[idxId]
        );

      if (!id) {
        return;
      }

      const ngaySanXuat =
        formatDateValue_(
          row[idxNgaySanXuat]
        );

      if (
        !dateMap[
          ngaySanXuat
        ]
      ) {
        return;
      }

      const trangThai =
        idxTrangThai === -1
          ? "Hoạt động"
          : normalizeText_(
              row[idxTrangThai]
            );

      if (
        !isActiveProductionPlanStatus_(
          trangThai
        )
      ) {
        return;
      }

      if (!planMap[id]) {
        planMap[id] = {
          Id:
            id,

          tenBaiLieu:
            normalizeText_(
              row[idxTenBaiLieu]
            ),

          soLuong:
            Number(
              row[idxSoLuong]
            ),

          khoiLuongMotMe:
            idxKhoiLuongMotMe === -1
              ? ""
              : Number(
                  row[
                    idxKhoiLuongMotMe
                  ]
                ),

          NgaySanXuat:
            ngaySanXuat,

          trangThai:
            trangThai ||
            "Hoạt động",

          materials:
            []
        };
      }

      planMap[id]
        .materials
        .push({
          tenNguyenLieu:
            normalizeText_(
              row[
                idxTenNguyenLieu
              ]
            ),

          MaKeToan:
            normalizeText_(
              row[
                idxMaKeToan
              ]
            )
        });
    });

  return Object.keys(planMap)
    .map(function(id) {
      return planMap[id];
    });
}

function getTodayProductionPlans_() {
  return getProductionPlansByDateList_([
    todayText_(),
    tomorrowText_()
  ]);
}

function getBaiTronLieuRows_() {
  const sheet = getSheet_(SHEET_BAI_TRON_LIEU);

  if (sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));

  const idxId = findRequiredHeaderIndex_(headers, ["Id"]);
  const idxTenBaiLieu = findRequiredHeaderIndex_(headers, ["tenBaiLieu"]);
  const idxSTT = findRequiredHeaderIndex_(headers, ["STT"]);
  const idxMa = findRequiredHeaderIndex_(headers, ["maNguyenLieu"]);
  const idxTenNguyenLieu = findRequiredHeaderIndex_(headers, ["tenNguyenLieu"]);
  const idxKhoiLuong = findRequiredHeaderIndex_(headers, ["khoiLuong"]);
  const idxDonVi = findRequiredHeaderIndex_(headers, ["donVi"]);
  const idxSttTron = findRequiredHeaderIndex_(headers, ["sttTron"]);
  const idxCan = findRequiredHeaderIndex_(headers, ["canSuDung"]);

  return values
    .slice(1)
    .filter(function(row) {
      return normalizeText_(row[idxId]) && normalizeText_(row[idxTenBaiLieu]);
    })
    .map(function(row) {
      return {
        Id: normalizeText_(row[idxId]),
        tenBaiLieu: normalizeText_(row[idxTenBaiLieu]),
        STT: row[idxSTT],
        maNguyenLieu: normalizeText_(row[idxMa]),
        tenNguyenLieu: normalizeText_(row[idxTenNguyenLieu]),
        khoiLuong: Number(row[idxKhoiLuong]),
        donVi: normalizeText_(row[idxDonVi]),
        sttTron: row[idxSttTron],
        canSuDung: normalizeText_(row[idxCan])
      };
    });
}

function getInventoryByQr(
  token,
  payload
) {
  requireWorker_(token);

  const qrText =
    normalizeText_(
      payload &&
      payload.qrText
    );

  const expectedMaNguyenLieu =
    normalizeText_(
      payload &&
      payload.expectedMaNguyenLieu
    );

  const expectedMaKeToan =
    normalizeText_(
      payload &&
      payload.expectedMaKeToan
    );

  if (!qrText) {
    throw new Error(
      "Không đọc được mã QR."
    );
  }

  if (!expectedMaNguyenLieu) {
    throw new Error(
      "Thiếu mã nguyên liệu cần đối chiếu."
    );
  }

  if (!expectedMaKeToan) {
    throw new Error(
      "Thiếu mã kế toán cần đối chiếu."
    );
  }

  const item =
    findKhoNguyenLieuById_(
      qrText
    );

  if (!item) {
    return {
      success: false,
      accepted: false,

      message:
        "Không tìm thấy nguyên liệu trong kho với QR: " +
        qrText
    };
  }

  /*
   * Kiểm tra QC.
   */
  if (
    lowerText_(
      item.trangThai
    ) !==
    "đã phê duyệt"
  ) {
    return {
      success: true,
      accepted: false,
      inventory: item,

      message:
        "Nguyên liệu chưa được phê duyệt chất lượng. " +
        "Trạng thái hiện tại: " +
        item.trangThai
    };
  }

  /*
   * Kiểm tra trạng thái sử dụng.
   */
  if (
    normalizeText_(
      item.trangThaiNguyenLieu
    ) !==
    "Sử dụng"
  ) {
    return {
      success: true,
      accepted: false,
      inventory: item,

      message:
        "Nguyên liệu đang không được phép sử dụng. " +
        "Trạng thái nguyên liệu hiện tại: " +
        (
          item.trangThaiNguyenLieu ||
          "Chưa có trạng thái"
        )
    };
  }

  /*
   * KIỂM TRA MÃ NGUYÊN LIỆU.
   */
  if (
    normalizeForCompare_(
      item.maNguyenLieu
    ) !==
    normalizeForCompare_(
      expectedMaNguyenLieu
    )
  ) {
    return {
      success: true,
      accepted: false,
      inventory: item,

      message:
        "Sai mã nguyên liệu. Cần: " +
        expectedMaNguyenLieu +
        " nhưng QR là: " +
        item.maNguyenLieu
    };
  }

  /*
   * KIỂM TRA MÃ KẾ TOÁN.
   */
  if (
    normalizeForCompare_(
      item.MaKeToan
    ) !==
    normalizeForCompare_(
      expectedMaKeToan
    )
  ) {
    return {
      success: true,
      accepted: false,
      inventory: item,

      message:
        "Đúng nguyên liệu nhưng sai mã kế toán. " +
        "Cần mã kế toán: " +
        expectedMaKeToan +
        " nhưng QR thuộc mã kế toán: " +
        (
          item.MaKeToan ||
          "(trống)"
        )
    };
  }

  return {
    success: true,
    accepted: true,
    inventory: item,

    message:
      "Quét đúng nguyên liệu: " +
      item.maNguyenLieu +
      " - Mã kế toán: " +
      item.MaKeToan
  };
}

function findKhoNguyenLieuById_(id) {
  const sheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);

  if (sheet.getLastRow() < 2) return null;

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));

  const idx = getKhoHeaderIndex_(headers);

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    if (normalizeText_(row[idx.Id]) === normalizeText_(id)) {
      return {
        Id: normalizeText_(row[idx.Id]),
        maNguyenLieu: normalizeText_(row[idx.maNguyenLieu]),
        MaKeToan:
          normalizeText_(
            row[idx.MaKeToan]
          ),
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
        trangThaiNguyenLieu: normalizeText_(row[idx.trangThaiNguyenLieu]),
        nguoiPheDuyetChatLuong: normalizeText_(row[idx.nguoiPheDuyetChatLuong]),
        ngayPheDuyet: formatDateValue_(row[idx.ngayPheDuyet])
      };
    }
  }

  return null;
}

function createExportRequest(token, payload) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const session = requireWorker_(token);

    const clientPlan = payload && payload.plan ? payload.plan : null;
    const clientItems = payload && Array.isArray(payload.items) ? payload.items : [];

    if (!clientPlan) {
      throw new Error("Thiếu kế hoạch sản xuất.");
    }

    if (!clientItems.length) {
      throw new Error("Chưa có nguyên liệu để tạo phiếu xuất.");
    }

    const keHoachId = normalizeText_(clientPlan.keHoachId);

    if (!keHoachId) {
      throw new Error("Thiếu mã kế hoạch sản xuất.");
    }

    if (hasActiveExportRequest_(keHoachId)) {
      throw new Error("Kế hoạch này đã có phiếu xuất đang chờ duyệt hoặc đã được phê duyệt. Không thể tạo thêm phiếu xuất.");
    }

    const serverPlan = getProductionPlanById_(keHoachId);

    if (!serverPlan) {
      throw new Error("Không tìm thấy kế hoạch sản xuất trên server: " + keHoachId);
    }

    const expectedItems = getExpectedExportItemsForPlan_(serverPlan);

    if (!expectedItems.length) {
      throw new Error("Không tìm thấy danh sách nguyên liệu của bài trộn trên server.");
    }

    const clientMap = {};

    clientItems.forEach(function(item) {
      const lineId = normalizeText_(item && item.lineId);

      if (lineId) {
        clientMap[lineId] = item;
      }
    });

    const missing = expectedItems.filter(function(expected) {
      const clientItem = clientMap[expected.lineId];
      return !clientItem || !clientItem.scanned || !clientItem.scanned.Id;
    });

    if (missing.length > 0) {
      throw new Error("Chưa quét đủ nguyên liệu. Còn thiếu: " + missing.length + " dòng.");
    }

    const phieuXuatId = generateExportId_();

    // =====================================================
    // LẤY SHEET PHIẾU XUẤT NGUYÊN LIỆU
    // =====================================================

    const sheet =
      getSheet_(
        SHEET_PHIEU_XUAT_NGUYEN_LIEU
      );

    if (sheet.getLastColumn() < 1) {
      throw new Error(
        "Sheet PhieuXuatNguyenLieu chưa có header."
      );
    }


    // =====================================================
    // ĐỌC HEADER THỰC TẾ TRÊN SHEET
    // Không tự quy định thứ tự cột trong code nữa.
    // =====================================================

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
          return normalizeText_(header);
        });


    // =====================================================
    // KIỂM TRA CỘT MaKeToan
    // =====================================================

    const idxMaKeToan =
      findRequiredHeaderIndex_(
        headers,
        ["MaKeToan"]
      );

    if (hasActiveExportRequest_(keHoachId)) {
      throw new Error("Kế hoạch này vừa được tạo phiếu xuất bởi người khác. Không thể tạo trùng phiếu.");
    }

    const rows = expectedItems.map(function(expected) {
      const clientItem = clientMap[expected.lineId];
      const scannedFromClient = clientItem.scanned || {};
      const scannedId = normalizeText_(scannedFromClient.Id);

      if (!scannedId) {
        throw new Error("Thiếu QR đã quét cho mã nguyên liệu: " + expected.maNguyenLieu);
      }

      const scanned = findKhoNguyenLieuById_(scannedId);

      if (!scanned) {
        throw new Error("Không tìm thấy QR trong kho: " + scannedId);
      }

      if (lowerText_(scanned.trangThai) !== "đã phê duyệt") {
        throw new Error(
          "QR " + scannedId +
          " chưa được phê duyệt chất lượng. Trạng thái: " +
          scanned.trangThai
        );
      }

      if (normalizeText_(scanned.trangThaiNguyenLieu) !== "Sử dụng") {
        throw new Error(
          "QR " + scannedId +
          " đang không được phép sử dụng. Trạng thái nguyên liệu: " +
          (scanned.trangThaiNguyenLieu || "Chưa có trạng thái")
        );
      }

      if (normalizeForCompare_(scanned.maNguyenLieu) !== normalizeForCompare_(expected.maNguyenLieu)) {
        throw new Error(
          "Sai nguyên liệu ở dòng " + expected.STT +
          ". Cần mã " + expected.maNguyenLieu +
          " nhưng QR là mã " + scanned.maNguyenLieu
        );
      }

      if (
        normalizeForCompare_(
          scanned.MaKeToan
        ) !==
        normalizeForCompare_(
          expected.MaKeToan
        )
      ) {
        throw new Error(
          "Sai mã kế toán ở dòng " +
          expected.STT +
          ". Nguyên liệu " +
          expected.maNguyenLieu +
          " cần mã kế toán " +
          expected.MaKeToan +
          " nhưng QR thuộc mã kế toán " +
          (
            scanned.MaKeToan ||
            "(trống)"
          )
        );
      }

      // =====================================================
      // TẠO ROW THEO ĐÚNG SỐ CỘT THỰC TẾ CỦA SHEET
      // =====================================================

      const row =
        new Array(
          headers.length
        ).fill("");


      // =====================================================
      // HÀM GÁN DỮ LIỆU THEO TÊN HEADER
      //
      // Ví dụ:
      // setValue("MaKeToan", "102001")
      //
      // sẽ tự tìm cột MaKeToan đang nằm ở đâu.
      // =====================================================

      function setValue(
        headerName,
        value
      ) {
        const index =
          findOptionalHeaderIndex_(
            headers,
            [headerName]
          );

        if (index !== -1) {
          row[index] = value;
        }
      }


      // =====================================================
      // THÔNG TIN PHIẾU
      // =====================================================

      setValue(
        "PhieuXuatId",
        phieuXuatId
      );

      setValue(
        "KeHoachId",
        keHoachId
      );

      setValue(
        "tenBaiLieu",
        normalizeText_(
          serverPlan.tenBaiLieu
        )
      );

      setValue(
        "soLuong",
        Number(
          serverPlan.soLuong
        )
      );

      setValue(
        "NgaySanXuat",
        normalizeText_(
          serverPlan.NgaySanXuat
        )
      );


      // =====================================================
      // THÔNG TIN NGUYÊN LIỆU THEO KẾ HOẠCH
      // =====================================================

      setValue(
        "STT",
        expected.STT
      );

      setValue(
        "maNguyenLieu",
        normalizeText_(
          expected.maNguyenLieu
        )
      );

      setValue(
        "tenNguyenLieu",
        normalizeText_(
          expected.tenNguyenLieu
        )
      );

      setValue(
        "khoiLuongCanXuat",
        Number(
          expected.khoiLuongCanXuat
        )
      );

      setValue(
        "donViCanXuat",
        normalizeText_(
          expected.donVi
        )
      );

      setValue(
        "sttTron",
        expected.sttTron
      );

      setValue(
        "canSuDung",
        normalizeText_(
          expected.canSuDung
        )
      );


      // =====================================================
      // THÔNG TIN QR / LÔ KHO ĐÃ QUÉT
      // =====================================================

      setValue(
        "IdKho",
        normalizeText_(
          scanned.Id
        )
      );

      setValue(
        "khoiLuongKho",
        scanned.khoiLuongNhap
      );

      setValue(
        "donViKho",
        normalizeText_(
          scanned.donVi
        )
      );

      setValue(
        "quyCachDongGoi",
        normalizeText_(
          scanned.quyCachDongGoi
        )
      );

      setValue(
        "LotNo",
        normalizeText_(
          scanned.LotNo
        )
      );

      setValue(
        "ngaySanXuatKho",
        normalizeText_(
          scanned.ngaySanXuat
        )
      );

      setValue(
        "hanSuDung",
        normalizeText_(
          scanned.hanSuDung
        )
      );

      setValue(
        "nhaCungCap",
        normalizeText_(
          scanned.nhaCungCap
        )
      );

      setValue(
        "ngayNhap",
        normalizeText_(
          scanned.ngayNhap
        )
      );


      // =====================================================
      // NGƯỜI TẠO / TRẠNG THÁI
      // =====================================================

      setValue(
        "nguoiTao",
        session.useName || ""
      );

      setValue(
        "ngayTao",
        nowText_()
      );

      setValue(
        "trangThaiPheDuyet",
        "Chờ thủ kho phê duyệt"
      );


      // =====================================================
      // MÃ KẾ TOÁN
      //
      // QUAN TRỌNG:
      // Lấy expected.MaKeToan = mã kế toán PCN chọn
      // trong KeHoachSanXuat.
      //
      // KHÔNG lấy scanned.MaKeToan để quyết định mã cần xuất.
      // scanned.MaKeToan chỉ dùng để kiểm tra QR có đúng hay không.
      // =====================================================

      setValue(
        "MaKeToan",
        normalizeText_(
          expected.MaKeToan
        )
      );


      // =====================================================
      // TRẢ ROW
      // =====================================================

      return row;
    });

    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows);

    return {
      success: true,
      phieuXuatId: phieuXuatId,
      message: "Đã tạo phiếu xuất nguyên liệu thành công.",
      soDong: rows.length,
      today: todayText_(),
      keHoachHomNay: getTodayProductionExportData_(),
      phieuXuatDaDuyetHomNay: getApprovedExportRequestsToday_(session.useName || "")
    };

  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

function getKhoHeaderIndex_(headers) {
  return {
    Id: findRequiredHeaderIndex_(headers, ["Id"]),
    maNguyenLieu: findRequiredHeaderIndex_(headers, ["maNguyenLieu"]),
    MaKeToan:
      findRequiredHeaderIndex_(
        headers,
        ["MaKeToan"]
      ),
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
    trangThaiNguyenLieu: findRequiredHeaderIndex_(headers, ["trangThaiNguyenLieu"]),
    nguoiPheDuyetChatLuong: findRequiredHeaderIndex_(headers, ["nguoiPheDuyetChatLuong"]),
    ngayPheDuyet: findRequiredHeaderIndex_(headers, ["ngayPheDuyet"])
  };
}

function ensureHeader_(sheet, expectedHeaders) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return;
  }

  expectedHeaders.forEach(function(header, index) {
    const cellValue = normalizeText_(sheet.getRange(1, index + 1).getValue());

    if (cellValue !== header) {
      sheet.getRange(1, index + 1).setValue(header);
    }
  });
}

function findRequiredHeaderIndex_(headers, names) {
  const index = findOptionalHeaderIndex_(headers, names);

  if (index === -1) {
    throw new Error("Không tìm thấy cột bắt buộc: " + names.join(" / "));
  }

  return index;
}

function findOptionalHeaderIndex_(headers, names) {
  const normalizedHeaders = headers.map(function(h) {
    return normalizeText_(h).toLowerCase();
  });

  for (let i = 0; i < names.length; i++) {
    const target = normalizeText_(names[i]).toLowerCase();
    const index = normalizedHeaders.indexOf(target);

    if (index !== -1) return index;
  }

  return -1;
}

function isCanceledExportStatus_(trangThai) {
  const status = lowerText_(trangThai);

  return status === "đã hủy" ||
    status === "đã huỷ" ||
    status === "hủy" ||
    status === "huỷ" ||
    status === "da huy" ||
    status === "huy";
}

function getActiveExportPlanIds_() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(SHEET_PHIEU_XUAT_NGUYEN_LIEU);

  if (!sheet || sheet.getLastRow() < 2) return {};

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));

  const idxKeHoachId = findOptionalHeaderIndex_(headers, ["KeHoachId"]);
  const idxTrangThai = findOptionalHeaderIndex_(headers, ["trangThaiPheDuyet"]);

  if (idxKeHoachId === -1 || idxTrangThai === -1) return {};

  const activeMap = {};

  values.slice(1).forEach(function(row) {
    const keHoachId = normalizeText_(row[idxKeHoachId]);
    const trangThai = normalizeText_(row[idxTrangThai]);

    if (!keHoachId) return;

    if (!isCanceledExportStatus_(trangThai)) {
      activeMap[keHoachId] = true;
    }
  });

  return activeMap;
}

function hasActiveExportRequest_(keHoachId) {
  const activeMap = getActiveExportPlanIds_();
  return !!activeMap[normalizeText_(keHoachId)];
}

function getSheetValueByIndex_(row, idx) {
  if (idx === -1 || idx === undefined || idx === null) return "";
  return row[idx];
}

function formatDateTimeText_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  }

  return normalizeText_(value);
}

function isApprovedExportStatus_(status) {
  const s = lowerText_(status);

  return s === "đã phê duyệt" ||
    s === "da phe duyet" ||
    s === "approved";
}

function isSameDateAsTodayOrTomorrow_(value) {
  const today = todayText_();
  const tomorrow = tomorrowText_();

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    const d = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
    return d === today || d === tomorrow;
  }

  const text = normalizeText_(value);

  if (!text) return false;

  // Hỗ trợ dạng yyyy-MM-dd HH:mm:ss hoặc yyyy-MM-dd
  if (text.length >= 10) {
    const d = text.substring(0, 10);
    return d === today || d === tomorrow;
  }

  return false;
}

function getApprovedExportRequestsToday_(workerName, selectedApprovalDate) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(SHEET_PHIEU_XUAT_NGUYEN_LIEU);

  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idx = {
    PhieuXuatId: findOptionalHeaderIndex_(headers, ["PhieuXuatId"]),
    KeHoachId: findOptionalHeaderIndex_(headers, ["KeHoachId"]),
    tenBaiLieu: findOptionalHeaderIndex_(headers, ["tenBaiLieu"]),
    soLuong: findOptionalHeaderIndex_(headers, ["soLuong"]),
    NgaySanXuat: findOptionalHeaderIndex_(headers, ["NgaySanXuat"]),
    STT: findOptionalHeaderIndex_(headers, ["STT"]),
    maNguyenLieu: findOptionalHeaderIndex_(headers, ["maNguyenLieu"]),
    MaKeToan: findOptionalHeaderIndex_(headers, ["MaKeToan"]),

    tenNguyenLieu: findOptionalHeaderIndex_(headers, ["tenNguyenLieu"]),
    khoiLuongCanXuat: findOptionalHeaderIndex_(headers, ["khoiLuongCanXuat"]),
    donViCanXuat: findOptionalHeaderIndex_(headers, ["donViCanXuat"]),
    sttTron: findOptionalHeaderIndex_(headers, ["sttTron"]),
    canSuDung: findOptionalHeaderIndex_(headers, ["canSuDung"]),
    IdKho: findOptionalHeaderIndex_(headers, ["IdKho"]),
    khoiLuongKho: findOptionalHeaderIndex_(headers, ["khoiLuongKho"]),
    donViKho: findOptionalHeaderIndex_(headers, ["donViKho"]),
    quyCachDongGoi: findOptionalHeaderIndex_(headers, ["quyCachDongGoi"]),
    LotNo: findOptionalHeaderIndex_(headers, ["LotNo"]),
    ngaySanXuatKho: findOptionalHeaderIndex_(headers, ["ngaySanXuatKho"]),
    hanSuDung: findOptionalHeaderIndex_(headers, ["hanSuDung"]),
    nhaCungCap: findOptionalHeaderIndex_(headers, ["nhaCungCap"]),
    ngayNhap: findOptionalHeaderIndex_(headers, ["ngayNhap"]),
    nguoiTao: findOptionalHeaderIndex_(headers, ["nguoiTao"]),
    ngayTao: findOptionalHeaderIndex_(headers, ["ngayTao"]),
    trangThaiPheDuyet: findOptionalHeaderIndex_(headers, ["trangThaiPheDuyet"]),

    // Các cột này thường do trang thủ kho thêm sau khi duyệt.
    cachXuat: findOptionalHeaderIndex_(headers, ["cachXuat"]),
    nguoiPheDuyet: findOptionalHeaderIndex_(headers, ["nguoiPheDuyet", "nguoiDuyet", "thuKhoDuyet"]),
    thoiGianDuyet: findOptionalHeaderIndex_(headers, ["thoiGianDuyet", "ngayDuyet", "ngayPheDuyet", "thoiGianPheDuyet"]),
    IdKhoDaTru: findOptionalHeaderIndex_(headers, ["IdKhoDaTru", "idKhoDaTru"])
  };

  if (idx.PhieuXuatId === -1 || idx.trangThaiPheDuyet === -1) return [];

  const currentWorker = normalizeForCompare_(workerName);
  const map = {};

  values.slice(1).forEach(function(row) {
    const status = normalizeText_(getSheetValueByIndex_(row, idx.trangThaiPheDuyet));

    if (!isApprovedExportStatus_(status)) return;

    const nguoiTao = normalizeText_(getSheetValueByIndex_(row, idx.nguoiTao));

    // Chỉ hiện phiếu do đúng công nhân đang đăng nhập tạo.
    // Nếu muốn hiện toàn bộ phiếu đã duyệt hôm nay, xóa 3 dòng if này.
    if (!selectedApprovalDate &&
        currentWorker &&
        normalizeForCompare_(nguoiTao) !== currentWorker) {
      return;
    }

    const thoiGianDuyetRaw = getSheetValueByIndex_(row, idx.thoiGianDuyet);
    const ngayTaoRaw = getSheetValueByIndex_(row, idx.ngayTao);

    // Ưu tiên lọc theo Ngày sản xuất để hiện phiếu của hôm nay và ngày mai.
    // Nếu không có Ngày sản xuất thì mới lọc theo thời gian duyệt/ngày tạo.
    const ngaySanXuatRaw = getSheetValueByIndex_(row, idx.NgaySanXuat);

    let isInRange = false;

    if (normalizeText_(ngaySanXuatRaw)) {
      isInRange = isSameDateAsTodayOrTomorrow_(ngaySanXuatRaw);
    } else {
      const hasThoiGianDuyet = idx.thoiGianDuyet !== -1 && normalizeText_(thoiGianDuyetRaw);

      isInRange = hasThoiGianDuyet
        ? isSameDateAsTodayOrTomorrow_(thoiGianDuyetRaw)
        : isSameDateAsTodayOrTomorrow_(ngayTaoRaw);
    }

    if (selectedApprovalDate) {
      if (!normalizeText_(thoiGianDuyetRaw)) return;

      const approvalDateKey = getApprovalDateKey_(thoiGianDuyetRaw);

      if (approvalDateKey !== selectedApprovalDate) return;
    } else {
      if (!isInRange) return;
    }

    const phieuXuatId = normalizeText_(getSheetValueByIndex_(row, idx.PhieuXuatId));

    if (!phieuXuatId) return;

    if (!map[phieuXuatId]) {
      map[phieuXuatId] = {
        phieuXuatId: phieuXuatId,
        keHoachId: normalizeText_(getSheetValueByIndex_(row, idx.KeHoachId)),
        tenBaiLieu: normalizeText_(getSheetValueByIndex_(row, idx.tenBaiLieu)),
        soLuong: getSheetValueByIndex_(row, idx.soLuong),
        ngaySanXuat: formatDateValue_(getSheetValueByIndex_(row, idx.NgaySanXuat)),
        nguoiTao: nguoiTao,
        ngayTao: formatDateTimeText_(ngayTaoRaw),
        nguoiPheDuyet: normalizeText_(getSheetValueByIndex_(row, idx.nguoiPheDuyet)),
        thoiGianDuyet: formatDateTimeText_(thoiGianDuyetRaw),
        trangThaiPheDuyet: status,
        tongDong: 0,
        tongKhoiLuongText: "",
        items: []
      };
    }

    const item = {
      STT: getSheetValueByIndex_(row, idx.STT),
      maNguyenLieu: normalizeText_(getSheetValueByIndex_(row, idx.maNguyenLieu)),
      MaKeToan:
        normalizeText_(
          getSheetValueByIndex_(
            row,
            idx.MaKeToan
          )
        ),
      tenNguyenLieu: normalizeText_(getSheetValueByIndex_(row, idx.tenNguyenLieu)),
      khoiLuongCanXuat: getSheetValueByIndex_(row, idx.khoiLuongCanXuat),
      donViCanXuat: normalizeText_(getSheetValueByIndex_(row, idx.donViCanXuat)),
      sttTron: getSheetValueByIndex_(row, idx.sttTron),
      canSuDung: normalizeText_(getSheetValueByIndex_(row, idx.canSuDung)),
      IdKho: normalizeText_(getSheetValueByIndex_(row, idx.IdKho)),
      IdKhoDaTru: normalizeText_(getSheetValueByIndex_(row, idx.IdKhoDaTru)),
      LotNo: normalizeText_(getSheetValueByIndex_(row, idx.LotNo)),
      quyCachDongGoi: normalizeText_(getSheetValueByIndex_(row, idx.quyCachDongGoi)),
      cachXuat: normalizeText_(getSheetValueByIndex_(row, idx.cachXuat)),
      hanSuDung: formatDateValue_(getSheetValueByIndex_(row, idx.hanSuDung)),
      trangThaiPheDuyet: status
    };

    map[phieuXuatId].items.push(item);
    map[phieuXuatId].tongDong += 1;
  });

  Object.keys(map).forEach(function(id) {
    const exportItem = map[id];
    const totalByUnit = {};

    exportItem.items.forEach(function(item) {
      const unit = normalizeText_(item.donViCanXuat) || "";
      const value = Number(item.khoiLuongCanXuat) || 0;

      if (!unit) return;

      if (!totalByUnit[unit]) totalByUnit[unit] = 0;
      totalByUnit[unit] += value;
    });

    const parts = Object.keys(totalByUnit).map(function(unit) {
      return formatNumberServerLike_(totalByUnit[unit]) + " " + unit;
    });

    exportItem.tongKhoiLuongText = parts.length ? parts.join(" + ") : "";
  });

    // Bổ sung ngày sản xuất và số lượng từ KeHoachSanXuat
    const planSheet = ss.getSheetByName("KeHoachSanXuat");

    if (planSheet && planSheet.getLastRow() >= 2) {
      const planValues = planSheet.getDataRange().getValues();

      const planHeaders = planValues[0].map(function(h) {
        return normalizeText_(h);
      });

      const idCol = planHeaders.indexOf("Id");
      const qtyCol = planHeaders.indexOf("soLuong");
      const dateCol = planHeaders.indexOf("NgaySanXuat");

      if (idCol !== -1) {
        const planMap = {};

        planValues.slice(1).forEach(function(row) {
          const planId = normalizeText_(row[idCol]);
          if (!planId) return;

          // Một kế hoạch có nhiều dòng nguyên liệu.
          // Chỉ lấy một lần, không cộng dồn số mẻ.
          if (!planMap[planId]) {
            planMap[planId] = {
              soLuong: qtyCol !== -1 ? row[qtyCol] : "",
              ngaySanXuat: dateCol !== -1
                ? formatDateValue_(row[dateCol])
                : ""
            };
          }
        });

        Object.keys(map).forEach(function(phieuId) {
          const phieu = map[phieuId];
          const plan = planMap[phieu.keHoachId];

          if (!plan) return;

          phieu.soLuong = plan.soLuong;
          phieu.ngaySanXuat = plan.ngaySanXuat;
        });
      }
    }

  return Object.keys(map)
    .map(function(id) {
      return map[id];
    })
    .sort(function(a, b) {
      return String(b.thoiGianDuyet || b.ngayTao || b.phieuXuatId)
        .localeCompare(String(a.thoiGianDuyet || a.ngayTao || a.phieuXuatId));
    });
}

function formatNumberServerLike_(value) {
  const num = Number(value);

  if (!isFinite(num)) return value;

  return Math.round(num * 1000) / 1000;
}

function todayText_() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );
}

function addDaysText_(days) {
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 0));

  return Utilities.formatDate(
    d,
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );
}

function tomorrowText_() {
  return addDaysText_(1);
}

function yesterdayText_() {
  return addDaysText_(-1);
}

function validateDateText_(dateText) {
  dateText = normalizeText_(dateText);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    throw new Error("Ngày không hợp lệ. Định dạng đúng là yyyy-MM-dd.");
  }

  return dateText;
}

/** =========================
 *  TẠO MÃ LẮP VỈ
 *  Sheet: chiTietLapVi
 *  Các cột hỗ trợ:
 *  maBanThanhPham1, maBanThanhPham2, maBanThanhPham3, maBanThanhPham4,
 *  maThanPham, soLuongVi, thoiGianTao, nguoiTao
 *  Nếu sheet cũ chưa có maBanThanhPham4, hệ thống sẽ tự thêm cột này ở cuối.
 *  ========================= */
function getLapViRequiredHeaders_() {
  return [
    "maBanThanhPham1",
    "maBanThanhPham2",
    "maBanThanhPham3",
    "maBanThanhPham4",
    "maThanPham",
    "soLuongVi",
    "thoiGianTao",
    "nguoiTao",
    "soLuongBanThanhPham1",
    "soLuongBanThanhPham2",
    "soLuongBanThanhPham3",
    "soLuongBanThanhPham4"
  ];
}

function getLapViSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(SHEET_CHI_TIET_LAP_VI);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CHI_TIET_LAP_VI);
    sheet.getRange(1, 1, 1, getLapViRequiredHeaders_().length).setValues([getLapViRequiredHeaders_()]);
    return sheet;
  }

  ensureLapViHeaders_(sheet);
  return sheet;
}

function ensureLapViHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, getLapViRequiredHeaders_().length).setValues([getLapViRequiredHeaders_()]);
    return;
  }

  let lastCol = Math.max(sheet.getLastColumn(), 1);
  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return normalizeText_(h);
  });

  getLapViRequiredHeaders_().forEach(function(header) {
    const exists = headers.map(function(h) { return h.toLowerCase(); }).indexOf(header.toLowerCase()) !== -1;
    if (!exists) {
      lastCol += 1;
      sheet.getRange(1, lastCol).setValue(header);
      headers.push(header);
    }
  });
}

function getHeaderMap_(sheet) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return normalizeText_(h);
  });

  const map = {};
  headers.forEach(function(header, index) {
    if (header) {
      map[header] = index;
      map[header.toLowerCase()] = index;
    }
  });

  return {
    headers: headers,
    map: map
  };
}

function getHeaderIndexByName_(headerInfo, name) {
  const index = headerInfo.map[name];
  if (index !== undefined) return index;
  return headerInfo.map[String(name).toLowerCase()];
}

function setRowValueByHeader_(row, headerInfo, headerName, value) {
  const index = getHeaderIndexByName_(headerInfo, headerName);
  if (index !== undefined && index !== -1) {
    row[index] = value;
  }
}

function getRowValueByHeader_(row, headerInfo, headerName) {
  const index = getHeaderIndexByName_(headerInfo, headerName);
  if (index === undefined || index === -1) return "";
  return row[index];
}

function generateLapViProductCode_() {
  return "TP" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmssSSS");
}

function isSameDateAsToday_(value) {
  const today = todayText_();

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    const d = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
    return d === today;
  }

  const text = normalizeText_(value);
  if (!text) return false;
  return text.length >= 10 && text.substring(0, 10) === today;
}

function rowToLapViObject_(row, headerInfo) {
  return {
    maBanThanhPham1: normalizeText_(getRowValueByHeader_(row, headerInfo, "maBanThanhPham1")),
    maBanThanhPham2: normalizeText_(getRowValueByHeader_(row, headerInfo, "maBanThanhPham2")),
    maBanThanhPham3: normalizeText_(getRowValueByHeader_(row, headerInfo, "maBanThanhPham3")),
    maBanThanhPham4: normalizeText_(getRowValueByHeader_(row, headerInfo, "maBanThanhPham4")),
    maThanPham: normalizeText_(getRowValueByHeader_(row, headerInfo, "maThanPham")),
    soLuongVi: getRowValueByHeader_(row, headerInfo, "soLuongVi"),
    thoiGianTao: formatDateTimeText_(getRowValueByHeader_(row, headerInfo, "thoiGianTao")),
    nguoiTao: normalizeText_(getRowValueByHeader_(row, headerInfo, "nguoiTao")),
    soLuongBanThanhPham1: getRowValueByHeader_(row, headerInfo, "soLuongBanThanhPham1"),
    soLuongBanThanhPham2: getRowValueByHeader_(row, headerInfo, "soLuongBanThanhPham2"),
    soLuongBanThanhPham3: getRowValueByHeader_(row, headerInfo, "soLuongBanThanhPham3"),
    soLuongBanThanhPham4: getRowValueByHeader_(row, headerInfo, "soLuongBanThanhPham4")
  };
}

function getBanThanhPhamNameMap_() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(SHEET_CHI_TIET_SAN_XUAT_BAN_THANH_PHAM);

  if (!sheet || sheet.getLastRow() < 2) {
    return {};
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idxIdBanThanhPham = findOptionalHeaderIndex_(headers, ["IdBanThanhPham"]);
  const idxTenBaiLieu = findOptionalHeaderIndex_(headers, ["tenBaiLieu"]);

  if (idxIdBanThanhPham === -1 || idxTenBaiLieu === -1) {
    return {};
  }

  const map = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const id = normalizeText_(row[idxIdBanThanhPham]);
    const tenBaiLieu = normalizeText_(row[idxTenBaiLieu]);

    if (!id) continue;

    // Nếu 1 mã BTP có nhiều dòng giống nhau thì lấy tên bài liệu dòng đầu tiên
    if (!map[id]) {
      map[id] = tenBaiLieu;
    }
  }

  return map;
}

function getLapViRows_(workerName) {
  const sheet = getLapViSheet_();
  if (sheet.getLastRow() < 2) return [];

  const headerInfo = getHeaderMap_(sheet);
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const currentWorker = normalizeForCompare_(workerName);
  const btpNameMap = getBanThanhPhamNameMap_();

  return values
    .map(function(row, index) {
      const item = rowToLapViObject_(row, headerInfo);
      item.rowNumber = index + 2;

      item.tenBaiLieuBanThanhPham1 = item.maBanThanhPham1 ? (btpNameMap[item.maBanThanhPham1] || "") : "";
      item.tenBaiLieuBanThanhPham2 = item.maBanThanhPham2 ? (btpNameMap[item.maBanThanhPham2] || "") : "";
      item.tenBaiLieuBanThanhPham3 = item.maBanThanhPham3 ? (btpNameMap[item.maBanThanhPham3] || "") : "";
      item.tenBaiLieuBanThanhPham4 = item.maBanThanhPham4 ? (btpNameMap[item.maBanThanhPham4] || "") : "";

      return item;
    })
    .filter(function(item) {
      if (!item.maThanPham) return false;
      if (!currentWorker) return true;
      return normalizeForCompare_(item.nguoiTao) === currentWorker;
    });
}

function getRecentLapViProducts_(workerName, limit) {
  return getLapViRows_(workerName)
    .sort(function(a, b) {
      return String(b.thoiGianTao || b.maThanPham).localeCompare(String(a.thoiGianTao || a.maThanPham));
    })
    .slice(0, Number(limit || 3));
}

function getLapViToday_(workerName) {
  return getLapViRows_(workerName)
    .filter(function(item) {
      return isSameDateAsToday_(item.thoiGianTao);
    })
    .sort(function(a, b) {
      return String(b.thoiGianTao || b.maThanPham).localeCompare(String(a.thoiGianTao || a.maThanPham));
    });
}

function getLapViData(token) {
  const session = requireWorker_(token);

  return {
    success: true,
    lapViGanNhat: getRecentLapViProducts_(session.useName || "", 3),
    lapViHomNay: getLapViToday_(session.useName || "")
  };
}

function getBanThanhPhamByQr(token, payload) {
  requireWorker_(token);

  const qrText = normalizeText_(payload && payload.qrText);

  if (!qrText) {
    throw new Error("Không đọc được mã QR bán thành phẩm.");
  }

  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(SHEET_CHI_TIET_SAN_XUAT_BAN_THANH_PHAM);

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      success: true,
      accepted: false,
      message: "Chưa có dữ liệu trong sheet ChiTietSanXuatBanThanhPham."
    };
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return {
      success: true,
      accepted: false,
      message: "Sheet ChiTietSanXuatBanThanhPham chưa có dữ liệu."
    };
  }

  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idxIdBanThanhPham = findRequiredHeaderIndex_(headers, ["IdBanThanhPham"]);
  const idxTenBaiLieu = findOptionalHeaderIndex_(headers, ["tenBaiLieu"]);
  const idxThoiGianHoanThanh = findOptionalHeaderIndex_(headers, ["thoiGianHoanThanh"]);
  const idxIdMeTron = findOptionalHeaderIndex_(headers, ["IdMeTron"]);

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const idBanThanhPham = normalizeText_(row[idxIdBanThanhPham]);

    if (idBanThanhPham === qrText) {
      return {
        success: true,
        accepted: true,
        banThanhPham: {
          IdBanThanhPham: idBanThanhPham,
          tenBaiLieu: idxTenBaiLieu === -1 ? "" : normalizeText_(row[idxTenBaiLieu]),
          thoiGianHoanThanh: idxThoiGianHoanThanh === -1 ? "" : formatDateTimeText_(row[idxThoiGianHoanThanh]),
          IdMeTron: idxIdMeTron === -1 ? "" : normalizeText_(row[idxIdMeTron])
        },
        message: "Đã tìm thấy bán thành phẩm: " + idBanThanhPham
      };
    }
  }

  return {
    success: true,
    accepted: false,
    message: "Không tìm thấy mã bán thành phẩm trong ChiTietSanXuatBanThanhPham: " + qrText
  };
}

function createLapViQr(token, payload) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const session = requireWorker_(token);
    const scans = payload && Array.isArray(payload.scans) ? payload.scans : [];
    const quantities = payload && Array.isArray(payload.quantities) ? payload.quantities : [];
    const ingredientCount = Number(payload && payload.ingredientCount) || scans.length;

    if (![2, 3, 4].includes(ingredientCount)) {
      throw new Error("Số loại bán thành phẩm chỉ được chọn 2, 3 hoặc 4.");
    }

    if (scans.length !== ingredientCount) {
      throw new Error("Chưa quét đủ số lượng bán thành phẩm đã chọn.");
    }

    for (let i = 0; i < ingredientCount; i++) {
      if (!normalizeText_(scans[i])) {
        throw new Error("Còn thiếu QR bán thành phẩm số " + (i + 1) + ".");
      }

      const qty = Number(quantities[i]);

      if (!isFinite(qty) || qty <= 0) {
        throw new Error("Số lượng viên/vỉ của bán thành phẩm " + (i + 1) + " phải là số lớn hơn 0.");
      }
    }

    const sheet = getLapViSheet_();
    const headerInfo = getHeaderMap_(sheet);
    const row = new Array(sheet.getLastColumn()).fill("");
    const maThanPham = generateLapViProductCode_();
    const thoiGianTao = nowText_();

    setRowValueByHeader_(row, headerInfo, "maBanThanhPham1", normalizeText_(scans[0]));
    setRowValueByHeader_(row, headerInfo, "maBanThanhPham2", normalizeText_(scans[1]));
    setRowValueByHeader_(row, headerInfo, "maBanThanhPham3", ingredientCount >= 3 ? normalizeText_(scans[2]) : "");
    setRowValueByHeader_(row, headerInfo, "maBanThanhPham4", ingredientCount >= 4 ? normalizeText_(scans[3]) : "");

    setRowValueByHeader_(row, headerInfo, "maThanPham", maThanPham);
    setRowValueByHeader_(row, headerInfo, "soLuongVi", "");
    setRowValueByHeader_(row, headerInfo, "thoiGianTao", thoiGianTao);
    setRowValueByHeader_(row, headerInfo, "nguoiTao", session.useName || "");

    setRowValueByHeader_(row, headerInfo, "soLuongBanThanhPham1", Number(quantities[0]));
    setRowValueByHeader_(row, headerInfo, "soLuongBanThanhPham2", Number(quantities[1]));
    setRowValueByHeader_(row, headerInfo, "soLuongBanThanhPham3", ingredientCount >= 3 ? Number(quantities[2]) : "");
    setRowValueByHeader_(row, headerInfo, "soLuongBanThanhPham4", ingredientCount >= 4 ? Number(quantities[3]) : "");

    sheet.appendRow(row);

    return {
      success: true,
      maThanPham: maThanPham,
      thoiGianTao: thoiGianTao,
      message: "Đã tạo mã thành phẩm và lưu chi tiết lắp vỉ thành công.",
      lapViGanNhat: getRecentLapViProducts_(session.useName || "", 3),
      lapViHomNay: getLapViToday_(session.useName || "")
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

function getBanThanhPhamStockHeaderIndex_(headers) {
  return {
    IdBanThanhPham: findRequiredHeaderIndex_(headers, ["IdBanThanhPham"]),
    soLuongVien: findRequiredHeaderIndex_(headers, ["soLuongVien"]),
    tenBaiLieu: findOptionalHeaderIndex_(headers, ["tenBaiLieu"]),
    thoiGianHoanThanh: findOptionalHeaderIndex_(headers, ["thoiGianHoanThanh"]),
    IdMeTron: findOptionalHeaderIndex_(headers, ["IdMeTron"])
  };
}

function findBanThanhPhamStockRowMap_(sheet) {
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return {
      headers: values.length ? values[0].map(function(h) { return normalizeText_(h); }) : [],
      idx: null,
      map: {}
    };
  }

  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idx = getBanThanhPhamStockHeaderIndex_(headers);
  const map = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const id = normalizeText_(row[idx.IdBanThanhPham]);

    if (!id) continue;

    if (!map[id]) {
      map[id] = [];
    }

    map[id].push({
      rowNumber: i + 1,
      row: row,
      soLuongVien: Number(row[idx.soLuongVien]) || 0,
      tenBaiLieu: idx.tenBaiLieu === -1 ? "" : normalizeText_(row[idx.tenBaiLieu]),
      thoiGianHoanThanh: idx.thoiGianHoanThanh === -1 ? "" : formatDateTimeText_(row[idx.thoiGianHoanThanh]),
      IdMeTron: idx.IdMeTron === -1 ? "" : normalizeText_(row[idx.IdMeTron])
    });
  }

  return {
    headers: headers,
    idx: idx,
    map: map
  };
}

function getLapViItemByMaThanhPham_(sheet, maThanPham) {
  if (sheet.getLastRow() < 2) {
    throw new Error("Sheet chiTietLapVi chưa có dữ liệu.");
  }

  const headerInfo = getHeaderMap_(sheet);
  const idxMa = getHeaderIndexByName_(headerInfo, "maThanPham");

  if (idxMa === undefined || idxMa === -1) {
    throw new Error("Sheet chiTietLapVi cần có cột maThanPham.");
  }

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
    .getValues();

  for (let i = 0; i < values.length; i++) {
    const row = values[i];

    if (normalizeText_(row[idxMa]) === maThanPham) {
      const item = rowToLapViObject_(row, headerInfo);
      item.rowNumber = i + 2;

      return {
        item: item,
        row: row,
        rowNumber: i + 2,
        headerInfo: headerInfo
      };
    }
  }

  return null;
}

function buildLapViBanThanhPhamUsage_(lapViItem, soLuongViMoi, soLuongViCu) {
  const deltaSoLuongVi = Number(soLuongViMoi) - Number(soLuongViCu || 0);

  const rawItems = [
    {
      index: 1,
      maBanThanhPham: normalizeText_(lapViItem.maBanThanhPham1),
      soLuongBanThanhPham: Number(lapViItem.soLuongBanThanhPham1) || 0
    },
    {
      index: 2,
      maBanThanhPham: normalizeText_(lapViItem.maBanThanhPham2),
      soLuongBanThanhPham: Number(lapViItem.soLuongBanThanhPham2) || 0
    },
    {
      index: 3,
      maBanThanhPham: normalizeText_(lapViItem.maBanThanhPham3),
      soLuongBanThanhPham: Number(lapViItem.soLuongBanThanhPham3) || 0
    },
    {
      index: 4,
      maBanThanhPham: normalizeText_(lapViItem.maBanThanhPham4),
      soLuongBanThanhPham: Number(lapViItem.soLuongBanThanhPham4) || 0
    }
  ].filter(function(item) {
    return item.maBanThanhPham;
  });

  if (rawItems.length === 0) {
    throw new Error("Mã thành phẩm này chưa có mã bán thành phẩm đã quét.");
  }

  rawItems.forEach(function(item) {
    if (!isFinite(item.soLuongBanThanhPham) || item.soLuongBanThanhPham <= 0) {
      throw new Error(
        "Thiếu số lượng viên/vỉ của bán thành phẩm " +
        item.index +
        ": " +
        item.maBanThanhPham
      );
    }
  });

  return rawItems.map(function(item) {
    return {
      index: item.index,
      maBanThanhPham: item.maBanThanhPham,
      soLuongBanThanhPham: item.soLuongBanThanhPham,

      // Nếu lưu mới từ 0 lên 10 vỉ: delta = 10, cần trừ.
      // Nếu sửa từ 10 xuống 8 vỉ: delta = -2, cần cộng trả lại.
      // Nếu sửa từ 10 lên 12 vỉ: delta = 2, trừ thêm.
      deltaSoLuongVi: deltaSoLuongVi,
      soLuongVienCanTru: deltaSoLuongVi * item.soLuongBanThanhPham
    };
  });
}

function formatLapViStockErrorMessage_(errors) {
  return errors.map(function(err) {
    return "BTP " + err.index +
      " - " + err.maBanThanhPham +
      " - dòng " + err.rowNumber +
      ": cần " + err.canTru +
      " viên, hiện còn " + err.tonHienTai +
      " viên";
  }).join("\n");
}

function getBanThanhPhamStockHeaderIndex_(headers) {
  return {
    IdBanThanhPham: findRequiredHeaderIndex_(headers, ["IdBanThanhPham"]),
    soLuongVien: findRequiredHeaderIndex_(headers, ["soLuongVien"]),
    tenBaiLieu: findOptionalHeaderIndex_(headers, ["tenBaiLieu"]),
    thoiGianHoanThanh: findOptionalHeaderIndex_(headers, ["thoiGianHoanThanh"]),
    IdMeTron: findOptionalHeaderIndex_(headers, ["IdMeTron"])
  };
}

function findBanThanhPhamStockRowMap_(sheet) {
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return {
      headers: values.length ? values[0].map(function(h) { return normalizeText_(h); }) : [],
      idx: null,
      map: {}
    };
  }

  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idx = getBanThanhPhamStockHeaderIndex_(headers);
  const map = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const id = normalizeText_(row[idx.IdBanThanhPham]);

    if (!id) continue;

    if (!map[id]) {
      map[id] = [];
    }

    map[id].push({
      rowNumber: i + 1,
      row: row,
      soLuongVien: Number(row[idx.soLuongVien]) || 0,
      tenBaiLieu: idx.tenBaiLieu === -1 ? "" : normalizeText_(row[idx.tenBaiLieu]),
      thoiGianHoanThanh: idx.thoiGianHoanThanh === -1 ? "" : formatDateTimeText_(row[idx.thoiGianHoanThanh]),
      IdMeTron: idx.IdMeTron === -1 ? "" : normalizeText_(row[idx.IdMeTron])
    });
  }

  return {
    headers: headers,
    idx: idx,
    map: map
  };
}

function getLapViItemByMaThanhPham_(sheet, maThanPham) {
  if (sheet.getLastRow() < 2) {
    throw new Error("Sheet chiTietLapVi chưa có dữ liệu.");
  }

  const headerInfo = getHeaderMap_(sheet);
  const idxMa = getHeaderIndexByName_(headerInfo, "maThanPham");

  if (idxMa === undefined || idxMa === -1) {
    throw new Error("Sheet chiTietLapVi cần có cột maThanPham.");
  }

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
    .getValues();

  for (let i = 0; i < values.length; i++) {
    const row = values[i];

    if (normalizeText_(row[idxMa]) === maThanPham) {
      const item = rowToLapViObject_(row, headerInfo);
      item.rowNumber = i + 2;

      return {
        item: item,
        row: row,
        rowNumber: i + 2,
        headerInfo: headerInfo
      };
    }
  }

  return null;
}

function buildLapViBanThanhPhamList_(lapViItem) {
  return [
    {
      index: 1,
      maBanThanhPham: normalizeText_(lapViItem.maBanThanhPham1),
      soLuongBanThanhPham: Number(lapViItem.soLuongBanThanhPham1) || 0
    },
    {
      index: 2,
      maBanThanhPham: normalizeText_(lapViItem.maBanThanhPham2),
      soLuongBanThanhPham: Number(lapViItem.soLuongBanThanhPham2) || 0
    },
    {
      index: 3,
      maBanThanhPham: normalizeText_(lapViItem.maBanThanhPham3),
      soLuongBanThanhPham: Number(lapViItem.soLuongBanThanhPham3) || 0
    },
    {
      index: 4,
      maBanThanhPham: normalizeText_(lapViItem.maBanThanhPham4),
      soLuongBanThanhPham: Number(lapViItem.soLuongBanThanhPham4) || 0
    }
  ].filter(function(item) {
    return item.maBanThanhPham;
  });
}

function getLapViErrorItems_(maThanPham) {
  const lapViSheet = getLapViSheet_();
  const foundLapVi = getLapViItemByMaThanhPham_(lapViSheet, maThanPham);

  if (!foundLapVi) {
    throw new Error("Không tìm thấy mã thành phẩm: " + maThanPham);
  }

  const btpSheet = getSheet_(SHEET_CHI_TIET_SAN_XUAT_BAN_THANH_PHAM);
  const btpInfo = findBanThanhPhamStockRowMap_(btpSheet);
  const list = buildLapViBanThanhPhamList_(foundLapVi.item);

  return list.map(function(item) {
    const stockRows = btpInfo.map[item.maBanThanhPham] || [];
    const firstStock = stockRows.length ? stockRows[0] : null;

    const soLuongVienHienCon = firstStock ? Number(firstStock.soLuongVien) || 0 : 0;

    return {
      index: item.index,
      maBanThanhPham: item.maBanThanhPham,
      tenBaiLieu: firstStock ? firstStock.tenBaiLieu : "",
      soLuongVienHienCon: soLuongVienHienCon
    };
  });
}

function getLapViErrorItems(token, payload) {
  requireWorker_(token);

  const maThanPham = normalizeText_(payload && payload.maThanPham);

  if (!maThanPham) {
    throw new Error("Vui lòng chọn mã thành phẩm.");
  }

  return {
    success: true,
    maThanPham: maThanPham,
    errorItems: getLapViErrorItems_(maThanPham)
  };
}

function updateLapViErrorQuantity(token, payload) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const session = requireWorker_(token);
    const maThanPham = normalizeText_(payload && payload.maThanPham);
    const errorItems = payload && Array.isArray(payload.errorItems) ? payload.errorItems : [];

    if (!maThanPham) {
      throw new Error("Vui lòng chọn mã thành phẩm.");
    }

    if (errorItems.length === 0) {
      throw new Error("Chưa có dữ liệu viên lỗi để lưu.");
    }

    const cleanItems = errorItems
      .map(function(item) {
        return {
          maBanThanhPham: normalizeText_(item && item.maBanThanhPham),
          soLuongVienLoi: Number(item && item.soLuongVienLoi)
        };
      })
      .filter(function(item) {
        return item.maBanThanhPham && isFinite(item.soLuongVienLoi) && item.soLuongVienLoi > 0;
      });

    if (cleanItems.length === 0) {
      throw new Error("Vui lòng nhập ít nhất 1 số lượng viên lỗi lớn hơn 0.");
    }

    const lapViSheet = getLapViSheet_();
    const foundLapVi = getLapViItemByMaThanhPham_(lapViSheet, maThanPham);

    if (!foundLapVi) {
      throw new Error("Không tìm thấy mã thành phẩm: " + maThanPham);
    }

    const validBtpList = buildLapViBanThanhPhamList_(foundLapVi.item);
    const validMap = {};

    validBtpList.forEach(function(item) {
      validMap[item.maBanThanhPham] = true;
    });

    cleanItems.forEach(function(item) {
      if (!validMap[item.maBanThanhPham]) {
        throw new Error("Mã bán thành phẩm không thuộc mã thành phẩm đang chọn: " + item.maBanThanhPham);
      }
    });

    const btpSheet = getSheet_(SHEET_CHI_TIET_SAN_XUAT_BAN_THANH_PHAM);

    if (btpSheet.getLastRow() < 2) {
      throw new Error("Sheet ChiTietSanXuatBanThanhPham chưa có dữ liệu.");
    }

    const btpInfo = findBanThanhPhamStockRowMap_(btpSheet);

    if (!btpInfo.idx) {
      throw new Error("Không đọc được header sheet ChiTietSanXuatBanThanhPham.");
    }

    const missing = [];
    const notEnough = [];

    cleanItems.forEach(function(item) {
      const stockRows = btpInfo.map[item.maBanThanhPham] || [];

      if (stockRows.length === 0) {
        missing.push(item.maBanThanhPham);
        return;
      }

      // Vẫn kiểm tra TẤT CẢ các dòng cùng mã BTP.
      // Vì yêu cầu là trừ tất cả các dòng map với mã bán thành phẩm.
      stockRows.forEach(function(stockItem) {
        if (stockItem.soLuongVien < item.soLuongVienLoi) {
          notEnough.push({
            maBanThanhPham: item.maBanThanhPham,
            rowNumber: stockItem.rowNumber,
            canTru: item.soLuongVienLoi,
            tonHienTai: stockItem.soLuongVien
          });
        }
      });
    });

    if (missing.length > 0) {
      throw new Error(
        "Sai dữ liệu, không tìm thấy mã bán thành phẩm trong ChiTietSanXuatBanThanhPham:\n" +
        missing.join("\n")
      );
    }

    if (notEnough.length > 0) {
      throw new Error(
        "Số lượng viên lỗi lớn hơn số viên hiện còn, không thể trừ:\n" +
        notEnough.map(function(item) {
          return item.maBanThanhPham +
            " - dòng " + item.rowNumber +
            ": cần trừ " + item.canTru +
            ", hiện còn " + item.tonHienTai;
        }).join("\n")
      );
    }

    let totalUpdatedRows = 0;

    cleanItems.forEach(function(item) {
      const stockRows = btpInfo.map[item.maBanThanhPham] || [];

      stockRows.forEach(function(stockItem) {
        const newStock = stockItem.soLuongVien - item.soLuongVienLoi;

        btpSheet
          .getRange(stockItem.rowNumber, btpInfo.idx.soLuongVien + 1)
          .setValue(newStock);

        totalUpdatedRows++;
      });
    });

    return {
      success: true,
      message: "Đã lưu số lượng viên lỗi và trừ tồn bán thành phẩm. Số dòng đã cập nhật: " + totalUpdatedRows,
      errorItems: getLapViErrorItems_(maThanPham),
      lapViGanNhat: getRecentLapViProducts_(session.useName || "", 3),
      lapViHomNay: getLapViToday_(session.useName || "")
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

function updateLapViQuantity(token, payload) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const session = requireWorker_(token);
    const maThanPham = normalizeText_(payload && payload.maThanPham);
    const soLuongVi = Number(payload && payload.soLuongVi);

    if (!maThanPham) {
      throw new Error("Vui lòng chọn mã thành phẩm.");
    }

    if (!isFinite(soLuongVi) || soLuongVi <= 0) {
      throw new Error("Số lượng vỉ phải là số và lớn hơn 0.");
    }

    const lapViSheet = getLapViSheet_();

    const foundLapVi = getLapViItemByMaThanhPham_(lapViSheet, maThanPham);

    if (!foundLapVi) {
      throw new Error("Không tìm thấy mã thành phẩm: " + maThanPham);
    }

    const lapViItem = foundLapVi.item;
    const headerInfo = foundLapVi.headerInfo;

    const idxSoLuongVi = getHeaderIndexByName_(headerInfo, "soLuongVi");

    if (idxSoLuongVi === undefined || idxSoLuongVi === -1) {
      throw new Error("Sheet chiTietLapVi cần có cột soLuongVi.");
    }

    const soLuongViCu = Number(lapViItem.soLuongVi) || 0;

    if (soLuongVi === soLuongViCu) {
      return {
        success: true,
        message: "Số lượng vỉ không thay đổi, không cần trừ thêm bán thành phẩm.",
        lapViGanNhat: getRecentLapViProducts_(session.useName || "", 3),
        lapViHomNay: getLapViToday_(session.useName || "")
      };
    }

    const usages = buildLapViBanThanhPhamUsage_(lapViItem, soLuongVi, soLuongViCu);

    const btpSheet = getSheet_(SHEET_CHI_TIET_SAN_XUAT_BAN_THANH_PHAM);

    if (btpSheet.getLastRow() < 2) {
      throw new Error("Sheet ChiTietSanXuatBanThanhPham chưa có dữ liệu để trừ số lượng viên.");
    }

    const btpInfo = findBanThanhPhamStockRowMap_(btpSheet);

    if (!btpInfo.idx) {
      throw new Error("Không đọc được header sheet ChiTietSanXuatBanThanhPham.");
    }

    const missing = [];
    const notEnough = [];

    usages.forEach(function(usage) {
      const stockRows = btpInfo.map[usage.maBanThanhPham] || [];

      if (stockRows.length === 0) {
        missing.push(usage);
        return;
      }

      // Nếu delta > 0: cần trừ thêm.
      // Phải kiểm tra TẤT CẢ các dòng trùng mã bán thành phẩm.
      if (usage.soLuongVienCanTru > 0) {
        stockRows.forEach(function(stockItem) {
          if (stockItem.soLuongVien < usage.soLuongVienCanTru) {
            notEnough.push({
              index: usage.index,
              maBanThanhPham: usage.maBanThanhPham,
              rowNumber: stockItem.rowNumber,
              canTru: usage.soLuongVienCanTru,
              tonHienTai: stockItem.soLuongVien
            });
          }
        });
      }
    });

    if (missing.length > 0) {
      throw new Error(
        "Sai dữ liệu, không tìm thấy mã bán thành phẩm trong ChiTietSanXuatBanThanhPham:\n" +
        missing.map(function(item) {
          return "BTP " + item.index + " - " + item.maBanThanhPham;
        }).join("\n")
      );
    }

    if (notEnough.length > 0) {
      throw new Error(
        "Sai dữ liệu, số lượng bán thành phẩm không đủ để nhập số lượng vỉ:\n" +
        formatLapViStockErrorMessage_(notEnough)
      );
    }

    // Đủ dữ liệu thì mới bắt đầu ghi.
    // Có bao nhiêu dòng cùng IdBanThanhPham thì trừ/cộng TẤT CẢ các dòng đó.
    usages.forEach(function(usage) {
      const stockRows = btpInfo.map[usage.maBanThanhPham] || [];

      stockRows.forEach(function(stockItem) {
        const newStock = stockItem.soLuongVien - usage.soLuongVienCanTru;

        btpSheet
          .getRange(stockItem.rowNumber, btpInfo.idx.soLuongVien + 1)
          .setValue(newStock);
      });
    });

    lapViSheet
      .getRange(foundLapVi.rowNumber, idxSoLuongVi + 1)
      .setValue(soLuongVi);

    let actionText = "";

    if (soLuongViCu > 0) {
      if (soLuongVi > soLuongViCu) {
        actionText = "Đã cập nhật tăng từ " + soLuongViCu + " lên " + soLuongVi + " vỉ và trừ thêm bán thành phẩm.";
      } else {
        actionText = "Đã cập nhật giảm từ " + soLuongViCu + " xuống " + soLuongVi + " vỉ và cộng trả lại bán thành phẩm.";
      }
    } else {
      actionText = "Đã lưu số lượng " + soLuongVi + " vỉ và trừ số lượng bán thành phẩm.";
    }

    return {
      success: true,
      message: actionText + " Mã: " + maThanPham,
      lapViGanNhat: getRecentLapViProducts_(session.useName || "", 3),
      lapViHomNay: getLapViToday_(session.useName || "")
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

/* =========================================================
   XUẤT THÙNG THEO KẾ HOẠCH LẮP VỈ VTBC
   ========================================================= */

function normalizeLapViExportFilter_(filter) {
  filter = filter || {};

  const fromDate =
    normalizeText_(filter.fromDate) ||
    yesterdayText_();

  const toDate =
    normalizeText_(filter.toDate) ||
    todayText_();

  validateDateText_(fromDate);
  validateDateText_(toDate);

  if (fromDate > toDate) {
    throw new Error(
      "Từ ngày không được lớn hơn đến ngày."
    );
  }

  return {
    fromDate: fromDate,
    toDate: toDate
  };
}


function isDateTextInRange_(
  value,
  fromDate,
  toDate
) {
  const text = formatDateTimeText_(value);

  if (!text || text.length < 10) {
    return false;
  }

  const dateText = text.substring(0, 10);

  if (fromDate && dateText < fromDate) {
    return false;
  }

  if (toDate && dateText > toDate) {
    return false;
  }

  return true;
}


function getKeHoachLapViHeaderIndex_(headers) {
  return {
    IdLapVi: findRequiredHeaderIndex_(
      headers,
      ["IdLapVi"]
    ),

    STT: findRequiredHeaderIndex_(
      headers,
      ["STT"]
    ),

    maSanPham: findRequiredHeaderIndex_(
      headers,
      ["maSanPham"]
    ),

    tenSanPham: findRequiredHeaderIndex_(
      headers,
      ["tenSanPham"]
    ),

    tenBaiLieu1: findRequiredHeaderIndex_(
      headers,
      ["tenBaiLieu1"]
    ),

    tenBaiLieu2: findRequiredHeaderIndex_(
      headers,
      ["tenBaiLieu2"]
    ),

    IdThungBanThanhPham1:
      findRequiredHeaderIndex_(
        headers,
        ["IdThungBanThanhPham1"]
      ),

    IdThungBanThanhPham2:
      findRequiredHeaderIndex_(
        headers,
        ["IdThungBanThanhPham2"]
      ),

    thoiGianTao: findRequiredHeaderIndex_(
      headers,
      ["thoiGianTao"]
    ),

    nguoiTao: findRequiredHeaderIndex_(
      headers,
      ["nguoiTao"]
    ),

    trangThai: findRequiredHeaderIndex_(
      headers,
      ["trangThai"]
    ),

    thoiGianXuat: findRequiredHeaderIndex_(
      headers,
      ["thoiGianXuat"]
    ),

    nguoiXuat: findRequiredHeaderIndex_(
      headers,
      ["nguoiXuat"]
    ),

    soLuongViKeHoach:
      findOptionalHeaderIndex_(
        headers,
        ["soLuongViKeHoach"]
      )
  };
}


function getChiTietBTPTheoThungHeaderIndex_(
  headers
) {
  return {
    IdBanThanhPham: findRequiredHeaderIndex_(
      headers,
      ["IdBanThanhPham"]
    ),

    ngaySanXuat: findRequiredHeaderIndex_(
      headers,
      ["ngaySanXuat"]
    ),

    IdThungBanThanhPham:
      findRequiredHeaderIndex_(
        headers,
        ["IdThungBanThanhPham"]
      ),

    sttThung: findRequiredHeaderIndex_(
      headers,
      ["sttThung"]
    ),

    khoiLuongThung:
      findRequiredHeaderIndex_(
        headers,
        ["khoiLuongThung"]
      ),

    viTriThung: findRequiredHeaderIndex_(
      headers,
      ["viTriThung"]
    )
  };
}


function getThungBTPMap_() {
  const sheet = getSheet_(
    SHEET_CHI_TIET_BTP_THEO_THUNG
  );

  if (sheet.getLastRow() < 2) {
    return {};
  }

  const values = sheet
    .getDataRange()
    .getValues();

  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idx =
    getChiTietBTPTheoThungHeaderIndex_(
      headers
    );

  const map = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const idThung = normalizeText_(
      row[idx.IdThungBanThanhPham]
    );

    if (!idThung) {
      continue;
    }

    map[idThung] = {
      rowNumber: i + 1,

      IdBanThanhPham: normalizeText_(
        row[idx.IdBanThanhPham]
      ),

      IdThungBanThanhPham: idThung,

      ngaySanXuat: normalizeText_(
        row[idx.ngaySanXuat]
      ),

      sttThung: row[idx.sttThung],

      khoiLuongThung:
        Number(row[idx.khoiLuongThung]) || 0,

      viTriThung: normalizeText_(
        row[idx.viTriThung]
      )
    };
  }

  return map;
}


function isLapViWaitingExportStatus_(status) {
  const value = lowerText_(status);

  return (
    !value ||
    value === "chờ xuất" ||
    value === "cho xuat"
  );
}


function getKeHoachXuatLapViVTBC_(filter) {
  const ss = getSpreadsheet_();

  const sheet = ss.getSheetByName(
    SHEET_KE_HOACH_LAP_VI_VTBC
  );

  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const dateFilter =
    normalizeLapViExportFilter_(filter);

  const values = sheet
    .getDataRange()
    .getValues();

  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idx =
    getKeHoachLapViHeaderIndex_(headers);

  const boxMap = getThungBTPMap_();

  const productNameMap =
  getTenSanPhamVTBCMap_();

  /*
   * Một IdLapVi có thể có nhiều dòng.
   * Gom tất cả các dòng về cùng một kế hoạch.
   */
  const planMap = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const idLapVi = normalizeText_(
      row[idx.IdLapVi]
    );

    if (!idLapVi) {
      continue;
    }

    const thoiGianTao =
      formatDateTimeText_(
        row[idx.thoiGianTao]
      );

    if (
      !isDateTextInRange_(
        thoiGianTao,
        dateFilter.fromDate,
        dateFilter.toDate
      )
    ) {
      continue;
    }

    const trangThai =
      normalizeText_(row[idx.trangThai]) ||
      "Chờ xuất";

    if (!planMap[idLapVi]) {
      const maSanPham = normalizeText_(
        row[idx.maSanPham]
      );

      const tenSanPhamTrongKeHoach =
        normalizeText_(
          row[idx.tenSanPham]
        );

      planMap[idLapVi] = {
        IdLapVi: idLapVi,

        maSanPham: maSanPham,

        /*
        * Ưu tiên tra tên sản phẩm từ
        * DanhSachSanPhamVTBC theo maSanPham.
        * Nếu không tra được thì dùng tên đã lưu
        * trong KeHoachLapViVTBC.
        */
        tenSanPham:
          productNameMap[maSanPham] ||
          tenSanPhamTrongKeHoach ||
          maSanPham,

        soLuongViKeHoach:
          idx.soLuongViKeHoach === -1
            ? 0
            : Number(
                row[idx.soLuongViKeHoach]
              ) || 0,

        thoiGianTao: thoiGianTao,

        nguoiTao: normalizeText_(
          row[idx.nguoiTao]
        ),

        trangThai: trangThai,

        thoiGianXuat:
          formatDateTimeText_(
            row[idx.thoiGianXuat]
          ),

        nguoiXuat: normalizeText_(
          row[idx.nguoiXuat]
        ),

        rowNumbers: [],
        statuses: [],
        thungMap: {}
      };
    }

    const plan = planMap[idLapVi];

    plan.rowNumbers.push(i + 1);
    plan.statuses.push(trangThai);

    const idThung1 = normalizeText_(
      row[idx.IdThungBanThanhPham1]
    );

    const idThung2 = normalizeText_(
      row[idx.IdThungBanThanhPham2]
    );

    const tenBaiLieu1 = normalizeText_(
      row[idx.tenBaiLieu1]
    );

    const tenBaiLieu2 = normalizeText_(
      row[idx.tenBaiLieu2]
    );

    if (idThung1 && !plan.thungMap[idThung1]) {
      const box1 = boxMap[idThung1] || null;

      plan.thungMap[idThung1] = {
        IdThungBanThanhPham: idThung1,
        tenBaiLieu: tenBaiLieu1,

        IdBanThanhPham:
          box1
            ? box1.IdBanThanhPham
            : "",

        ngaySanXuat:
          box1
            ? box1.ngaySanXuat
            : "",

        sttThung:
          box1
            ? box1.sttThung
            : "",

        khoiLuongThung:
          box1
            ? box1.khoiLuongThung
            : 0,

        viTriThung:
          box1
            ? box1.viTriThung
            : "",

        tonTaiTrongKho: !!box1
      };
    }

    if (idThung2 && !plan.thungMap[idThung2]) {
      const box2 = boxMap[idThung2] || null;

      plan.thungMap[idThung2] = {
        IdThungBanThanhPham: idThung2,
        tenBaiLieu: tenBaiLieu2,

        IdBanThanhPham:
          box2
            ? box2.IdBanThanhPham
            : "",

        ngaySanXuat:
          box2
            ? box2.ngaySanXuat
            : "",

        sttThung:
          box2
            ? box2.sttThung
            : "",

        khoiLuongThung:
          box2
            ? box2.khoiLuongThung
            : 0,

        viTriThung:
          box2
            ? box2.viTriThung
            : "",

        tonTaiTrongKho: !!box2
      };
    }

    /*
     * Nếu dòng đầu chưa có thông tin xuất nhưng
     * dòng sau đã có thì lấy dữ liệu dòng sau.
     */
    if (!plan.thoiGianXuat) {
      plan.thoiGianXuat =
        formatDateTimeText_(
          row[idx.thoiGianXuat]
        );
    }

    if (!plan.nguoiXuat) {
      plan.nguoiXuat =
        normalizeText_(
          row[idx.nguoiXuat]
        );
    }
  }

  const result = Object.keys(planMap).map(
    function(idLapVi) {
      const plan = planMap[idLapVi];

      plan.thungs = Object.keys(
        plan.thungMap
      ).map(function(idThung) {
        return plan.thungMap[idThung];
      });

      delete plan.thungMap;

      const allExported =
        plan.statuses.length > 0 &&
        plan.statuses.every(function(status) {
          return lowerText_(status) === "đã xuất";
        });

      const allWaiting =
        plan.statuses.every(function(status) {
          return isLapViWaitingExportStatus_(
            status
          );
        });

      if (allExported) {
        plan.trangThai = "Đã xuất";
      } else if (allWaiting) {
        plan.trangThai = "Chờ xuất";
      } else {
        plan.trangThai =
          plan.statuses[0] || "Chờ xuất";
      }

      plan.canExport = allWaiting;
      plan.tongDongKeHoach =
        plan.rowNumbers.length;

      plan.tongThung =
        plan.thungs.length;

      delete plan.statuses;

      return plan;
    }
  );

  return result.sort(function(a, b) {
    return String(
      b.thoiGianTao
    ).localeCompare(
      String(a.thoiGianTao)
    );
  });
}

function getKeHoachXuatLapViVTBC(
  token,
  filter
) {
  requireWorker_(token);

  const dateFilter =
    normalizeLapViExportFilter_(filter);

  return {
    success: true,
    filter: dateFilter,

    keHoachXuatLapVi:
      getKeHoachXuatLapViVTBC_(
        dateFilter
      )
  };
}


function getLapViExportPlanById_(
  idLapVi
) {
  idLapVi =
    normalizeText_(
      idLapVi
    );

  if (!idLapVi) {
    throw new Error(
      "Thiếu mã kế hoạch lắp vỉ."
    );
  }

  const sheet =
    getSheet_(
      SHEET_KE_HOACH_LAP_VI_VTBC
    );

  if (sheet.getLastRow() < 2) {
    throw new Error(
      "Sheet KeHoachLapViVTBC chưa có dữ liệu."
    );
  }

  const values =
    sheet
      .getDataRange()
      .getValues();

  const headers =
    values[0].map(
      function(h) {
        return normalizeText_(h);
      }
    );

  const idx =
    getKeHoachLapViHeaderIndex_(
      headers
    );

  const rows = [];
  const requiredIdMap = {};

  let maSanPham = "";
  let tenSanPham = "";
  let thoiGianTao = "";
  let nguoiTao = "";

  /*
   * Biến mới:
   * lưu số lượng vỉ kế hoạch.
   */
  let soLuongViKeHoach = 0;

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    const row =
      values[i];

    const rowIdLapVi =
      normalizeText_(
        row[idx.IdLapVi]
      );

    if (
      rowIdLapVi !==
      idLapVi
    ) {
      continue;
    }

    const trangThai =
      normalizeText_(
        row[idx.trangThai]
      ) ||
      "Chờ xuất";

    const idThung1 =
      normalizeText_(
        row[
          idx.IdThungBanThanhPham1
        ]
      );

    const idThung2 =
      normalizeText_(
        row[
          idx.IdThungBanThanhPham2
        ]
      );

    rows.push({
      rowNumber:
        i + 1,

      trangThai:
        trangThai,

      tenBaiLieu1:
        normalizeText_(
          row[idx.tenBaiLieu1]
        ),

      tenBaiLieu2:
        normalizeText_(
          row[idx.tenBaiLieu2]
        ),

      IdThungBanThanhPham1:
        idThung1,

      IdThungBanThanhPham2:
        idThung2
    });

    if (idThung1) {
      requiredIdMap[
        idThung1
      ] = true;
    }

    if (idThung2) {
      requiredIdMap[
        idThung2
      ] = true;
    }

    if (!maSanPham) {
      maSanPham =
        normalizeText_(
          row[idx.maSanPham]
        );
    }

    if (!tenSanPham) {
      tenSanPham =
        normalizeText_(
          row[idx.tenSanPham]
        );
    }

    /*
     * Lấy số lượng vỉ kế hoạch
     * từ dòng đầu tiên của cùng IdLapVi.
     */
    if (
      soLuongViKeHoach === 0 &&
      idx.soLuongViKeHoach !== -1
    ) {
      soLuongViKeHoach =
        Number(
          row[
            idx.soLuongViKeHoach
          ]
        ) || 0;
    }

    if (!thoiGianTao) {
      thoiGianTao =
        formatDateTimeText_(
          row[idx.thoiGianTao]
        );
    }

    if (!nguoiTao) {
      nguoiTao =
        normalizeText_(
          row[idx.nguoiTao]
        );
    }
  }

  if (!rows.length) {
    throw new Error(
      "Không tìm thấy kế hoạch lắp vỉ: " +
      idLapVi
    );
  }

  return {
    IdLapVi:
      idLapVi,

    maSanPham:
      maSanPham,

    tenSanPham:
      tenSanPham,

    /*
     * Bổ sung trường này để
     * getKetQuaLapViPlanDetail_ sử dụng.
     */
    soLuongViKeHoach:
      soLuongViKeHoach,

    thoiGianTao:
      thoiGianTao,

    nguoiTao:
      nguoiTao,

    rows:
      rows,

    requiredIds:
      Object.keys(
        requiredIdMap
      )
  };
}

/**
 * Kiểm tra QR thùng ngay sau khi quét.
 */
function checkLapViThungQr(
  token,
  payload
) {
  requireWorker_(token);

  const qrText = normalizeText_(
    payload && payload.qrText
  );

  const idLapVi = normalizeText_(
    payload && payload.IdLapVi
  );

  if (!qrText) {
    throw new Error(
      "Không đọc được QR thùng bán thành phẩm."
    );
  }

  if (!idLapVi) {
    throw new Error(
      "Thiếu mã kế hoạch lắp vỉ."
    );
  }

  const plan =
    getLapViExportPlanById_(idLapVi);

  const matchedId =
    plan.requiredIds.find(function(id) {
      return (
        normalizeForCompare_(id) ===
        normalizeForCompare_(qrText)
      );
    });

  if (!matchedId) {
    return {
      success: true,
      accepted: false,
      qrText: qrText,

      message:
        "QR " +
        qrText +
        " không thuộc kế hoạch " +
        idLapVi +
        "."
    };
  }

  const boxMap = getThungBTPMap_();
  const box = boxMap[matchedId];

  if (!box) {
    return {
      success: true,
      accepted: false,
      qrText: qrText,

      message:
        "Không tìm thấy thùng trong sheet ChiTietBTPtheoThung: " +
        matchedId
    };
  }

  if (
    !isFinite(box.khoiLuongThung) ||
    box.khoiLuongThung <= 0
  ) {
    return {
      success: true,
      accepted: false,
      qrText: qrText,
      thung: box,

      message:
        "Thùng " +
        matchedId +
        " hiện không còn khối lượng trong kho."
    };
  }

  return {
    success: true,
    accepted: true,
    qrText: qrText,
    matchedId: matchedId,
    thung: box,

    message:
      "Đã quét đúng thùng: " +
      matchedId
  };
}

function getLichSuLapViSheet_() {
  const headers = [
    "IdXuatLapVi",
    "IdLapVi",
    "IdThungXuat",
    "khoiLuongThungXuat",
    "thoiGianXuat",
    "nguoiXuat"
  ];

  const sheet = getOrCreateSheet_(
    SHEET_LICH_SU_LAP_VI,
    headers
  );

  ensureHeader_(sheet, headers);

  return sheet;
}

function hasLapViExportHistory_(idLapVi) {
  idLapVi = normalizeText_(idLapVi);

  if (!idLapVi) {
    return false;
  }

  const ss = getSpreadsheet_();

  const sheet = ss.getSheetByName(
    SHEET_LICH_SU_LAP_VI
  );

  if (!sheet || sheet.getLastRow() < 2) {
    return false;
  }

  const values = sheet
    .getDataRange()
    .getValues();

  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idxIdLapVi =
    findOptionalHeaderIndex_(
      headers,
      ["IdLapVi"]
    );

  if (idxIdLapVi === -1) {
    return false;
  }

  for (let i = 1; i < values.length; i++) {
    if (
      normalizeText_(
        values[i][idxIdLapVi]
      ) === idLapVi
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Xuất một dòng kế hoạch lắp vỉ.
 * - Kiểm tra lại dữ liệu trên server.
 * - Đặt hai thùng về khoiLuongThung = 0.
 * - Cập nhật trạng thái kế hoạch.
 */
function createLapViExportRequest(
  token,
  payload
) {
  const lock =
    LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const session =
      requireWorker_(token);

    const idLapVi = normalizeText_(
      payload && payload.IdLapVi
    );

    const scannedIdsRaw =
      payload &&
      Array.isArray(payload.scannedIds)
        ? payload.scannedIds
        : [];

    if (!idLapVi) {
      throw new Error(
        "Thiếu mã kế hoạch lắp vỉ."
      );
    }

    if (!scannedIdsRaw.length) {
      throw new Error(
        "Chưa quét thùng nào."
      );
    }

    /*
     * Đọc lại toàn bộ kế hoạch trên server.
     * Không tin dữ liệu danh sách thùng từ client.
     */
    const plan =
      getLapViExportPlanById_(idLapVi);

    if (hasLapViExportHistory_(idLapVi)) {
      throw new Error(
        "Kế hoạch " +
        idLapVi +
        " đã có lịch sử xuất trong LichSuLapVi. " +
        "Không thể xuất trùng. Vui lòng kiểm tra dữ liệu."
      );
    }

    const invalidStatusRows =
      plan.rows.filter(function(item) {
        return !isLapViWaitingExportStatus_(
          item.trangThai
        );
      });

    if (invalidStatusRows.length > 0) {
      throw new Error(
        "Kế hoạch đã được xử lý hoặc có trạng thái không đồng nhất. " +
        "Vui lòng tải lại dữ liệu."
      );
    }

    /*
     * Chuẩn hóa danh sách QR client gửi lên.
     */
    const scannedMap = {};

    scannedIdsRaw.forEach(function(id) {
      const cleanId = normalizeText_(id);

      if (cleanId) {
        scannedMap[
          normalizeForCompare_(cleanId)
        ] = cleanId;
      }
    });

    const scannedIds =
      Object.keys(scannedMap).map(
        function(key) {
          return scannedMap[key];
        }
      );

    const requiredMap = {};

    plan.requiredIds.forEach(function(id) {
      requiredMap[
        normalizeForCompare_(id)
      ] = id;
    });

    const missingIds =
      plan.requiredIds.filter(function(id) {
        return !scannedMap[
          normalizeForCompare_(id)
        ];
      });

    const extraIds =
      scannedIds.filter(function(id) {
        return !requiredMap[
          normalizeForCompare_(id)
        ];
      });

    if (missingIds.length > 0) {
      throw new Error(
        "Chưa quét đủ thùng. Còn thiếu " +
        missingIds.length +
        " thùng:\n" +
        missingIds.join("\n")
      );
    }

    if (extraIds.length > 0) {
      throw new Error(
        "Có QR không thuộc kế hoạch:\n" +
        extraIds.join("\n")
      );
    }

    if (
      scannedIds.length !==
      plan.requiredIds.length
    ) {
      throw new Error(
        "Số QR đã quét không khớp số thùng của kế hoạch."
      );
    }

    const boxSheet = getSheet_(
      SHEET_CHI_TIET_BTP_THEO_THUNG
    );

    if (boxSheet.getLastRow() < 2) {
      throw new Error(
        "Sheet ChiTietBTPtheoThung chưa có dữ liệu."
      );
    }

    const boxValues = boxSheet
      .getDataRange()
      .getValues();

    const boxHeaders =
      boxValues[0].map(function(h) {
        return normalizeText_(h);
      });

    const boxIdx =
      getChiTietBTPTheoThungHeaderIndex_(
        boxHeaders
      );

    const boxRowMap = {};

    for (let i = 1; i < boxValues.length; i++) {
      const row = boxValues[i];

      const idThung = normalizeText_(
        row[boxIdx.IdThungBanThanhPham]
      );

      if (!idThung) {
        continue;
      }

      if (
        requiredMap[
          normalizeForCompare_(idThung)
        ]
      ) {
        boxRowMap[
          normalizeForCompare_(idThung)
        ] = {
          rowNumber: i + 1,
          IdThungBanThanhPham: idThung,

          khoiLuongThung:
            Number(
              row[boxIdx.khoiLuongThung]
            ) || 0
        };
      }
    }

    const missingStockRows = [];
    const emptyStockRows = [];

    plan.requiredIds.forEach(function(id) {
      const key =
        normalizeForCompare_(id);

      const boxItem = boxRowMap[key];

      if (!boxItem) {
        missingStockRows.push(id);
        return;
      }

      if (boxItem.khoiLuongThung <= 0) {
        emptyStockRows.push(id);
      }
    });

    if (missingStockRows.length > 0) {
      throw new Error(
        "Không tìm thấy các thùng sau trong ChiTietBTPtheoThung:\n" +
        missingStockRows.join("\n")
      );
    }

    if (emptyStockRows.length > 0) {
      throw new Error(
        "Các thùng sau đã hết tồn:\n" +
        emptyStockRows.join("\n")
      );
    }
     
    const planSheet = getSheet_(
      SHEET_KE_HOACH_LAP_VI_VTBC
    );

    const planHeaders = planSheet
      .getRange(
        1,
        1,
        1,
        planSheet.getLastColumn()
      )
      .getValues()[0]
      .map(function(h) {
        return normalizeText_(h);
      });

    const planIdx =
      getKeHoachLapViHeaderIndex_(
        planHeaders
      );

    const thoiGianXuat = nowText_();
    const nguoiXuat =
      session.useName || "";

    /*
    * Một lần bấm Xuất lắp vỉ có một mã xuất chung.
    * Mỗi thùng được lưu một dòng trong LichSuLapVi.
    */
    const IdXuatLapVi =
      generateLapViExportHistoryId_();

    const lichSuSheet =
      getLichSuLapViSheet_();

    const lichSuRows =
      plan.requiredIds.map(function(id) {
        const boxItem =
          boxRowMap[
            normalizeForCompare_(id)
          ];

        return [
          IdXuatLapVi,
          idLapVi,
          boxItem.IdThungBanThanhPham,
          Number(boxItem.khoiLuongThung),
          thoiGianXuat,
          nguoiXuat
        ];
      });

    /*
    * Lưu lại khối lượng gốc của từng thùng
    * trước khi đưa tồn thùng về 0.
    */
    if (lichSuRows.length > 0) {
      lichSuSheet
        .getRange(
          lichSuSheet.getLastRow() + 1,
          1,
          lichSuRows.length,
          6
        )
        .setValues(lichSuRows);
    }

    /*
    * Sau khi đã lưu lịch sử mới trừ tồn.
    * Xuất nguyên thùng nên khoiLuongThung = 0.
    */
    plan.requiredIds.forEach(function(id) {
      const boxItem =
        boxRowMap[
          normalizeForCompare_(id)
        ];

      boxSheet
        .getRange(
          boxItem.rowNumber,
          boxIdx.khoiLuongThung + 1
        )
        .setValue(0);
    });

    /*
     * Cập nhật toàn bộ dòng có cùng IdLapVi.
     */
    plan.rows.forEach(function(item) {
      planSheet
        .getRange(
          item.rowNumber,
          planIdx.trangThai + 1
        )
        .setValue("Đã xuất");

      planSheet
        .getRange(
          item.rowNumber,
          planIdx.thoiGianXuat + 1
        )
        .setValue(thoiGianXuat);

      planSheet
        .getRange(
          item.rowNumber,
          planIdx.nguoiXuat + 1
        )
        .setValue(nguoiXuat);
    });

    const filter =
      normalizeLapViExportFilter_(
        payload && payload.filter
      );

    return {
      success: true,

      IdXuatLapVi: IdXuatLapVi,
      IdLapVi: idLapVi,

      thoiGianXuat: thoiGianXuat,
      nguoiXuat: nguoiXuat,

      soThungDaXuat:
        plan.requiredIds.length,

      message:
        "Đã xuất kế hoạch " +
        idLapVi +
        ". Mã xuất: " +
        IdXuatLapVi +
        ". Tổng số thùng: " +
        plan.requiredIds.length +
        ".",

      keHoachXuatLapVi:
        getKeHoachXuatLapViVTBC_(
          filter
        )
    };

  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

function getKetQuaLapViSheet_() {
  const headers = [
    "IdThungDungVi",
    "IdLapVi",
    "soLuongViDaLap",
    "ngaySanXuat",
    "thoiGianLuu",
    "nguoiLuu",
    "vitriKho",
    "IdThungBanThanhPham1",
    "IdThungBanThanhPham2"
  ];

  const sheet = getOrCreateSheet_(
    SHEET_KET_QUA_LAP_VI,
    headers
  );

  ensureHeader_(sheet, headers);

  return sheet;
}

function getKetQuaLapViRowsByIdLapVi_(
  idLapVi
) {
  idLapVi = normalizeText_(idLapVi);

  if (!idLapVi) {
    return [];
  }

  const ss = getSpreadsheet_();

  const sheet = ss.getSheetByName(
    SHEET_KET_QUA_LAP_VI
  );

  if (
    !sheet ||
    sheet.getLastRow() < 2
  ) {
    return [];
  }

  const values =
    sheet
      .getDataRange()
      .getValues();

  const headers =
    values[0].map(
      function(header) {
        return normalizeText_(header);
      }
    );

  const idxIdThungDungVi =
    findRequiredHeaderIndex_(
      headers,
      ["IdThungDungVi"]
    );

  const idxIdLapVi =
    findRequiredHeaderIndex_(
      headers,
      ["IdLapVi"]
    );

  const idxSoLuong =
    findRequiredHeaderIndex_(
      headers,
      ["soLuongViDaLap"]
    );

  const idxNgaySanXuat =
    findRequiredHeaderIndex_(
      headers,
      ["ngaySanXuat"]
    );

  const idxThoiGianLuu =
    findRequiredHeaderIndex_(
      headers,
      ["thoiGianLuu"]
    );

  const idxNguoiLuu =
    findRequiredHeaderIndex_(
      headers,
      ["nguoiLuu"]
    );

  const idxVitriKho =
    findOptionalHeaderIndex_(
      headers,
      ["vitriKho", "viTriKho"]
    );

  const idxIdThungBanThanhPham1 =
    findOptionalHeaderIndex_(
      headers,
      ["IdThungBanThanhPham1"]
    );

  const idxIdThungBanThanhPham2 =
    findOptionalHeaderIndex_(
      headers,
      ["IdThungBanThanhPham2"]
    );

  const result = [];

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    const row = values[i];

    const rowIdLapVi =
      normalizeText_(
        row[idxIdLapVi]
      );

    const idThungDungVi =
      normalizeText_(
        row[idxIdThungDungVi]
      );

    if (
      rowIdLapVi !== idLapVi ||
      !idThungDungVi
    ) {
      continue;
    }

    result.push({
      rowNumber: i + 1,

      IdThungDungVi:
        idThungDungVi,

      IdLapVi:
        rowIdLapVi,

      soLuongViDaLap:
        Number(
          row[idxSoLuong]
        ) || 0,

      ngaySanXuat:
        formatDateValue_(
          row[idxNgaySanXuat]
        ),

      thoiGianLuu:
        formatDateTimeText_(
          row[idxThoiGianLuu]
        ),

      nguoiLuu:
        normalizeText_(
          row[idxNguoiLuu]
        ),

      vitriKho:
        idxVitriKho === -1
          ? ""
          : normalizeText_(
              row[idxVitriKho]
            ),

      IdThungBanThanhPham1:
        idxIdThungBanThanhPham1 === -1
          ? ""
          : normalizeText_(
              row[idxIdThungBanThanhPham1]
            ),

      IdThungBanThanhPham2:
        idxIdThungBanThanhPham2 === -1
          ? ""
          : normalizeText_(
              row[idxIdThungBanThanhPham2]
            )
    });
  }

  result.sort(
    function(a, b) {
      return String(
        a.IdThungDungVi
      ).localeCompare(
        String(
          b.IdThungDungVi
        )
      );
    }
  );

  return result;
}

function getNhapLaiKhoVienVTBCSheet_() {
  const headers = [
    "IdXuatLapVi",
    "IdLapVi",
    "IdThungXuat",
    "khoiLuongNhapLai",
    "thoiGianNhapLai",
    "nguoiNhap"
  ];

  const sheet = getOrCreateSheet_(
    SHEET_NHAP_LAI_KHO_VIEN_VTBC,
    headers
  );

  ensureHeader_(sheet, headers);

  return sheet;
}


function getVienVTBCHongSheet_() {
  const headers = [
    "IdXuatLapVi",
    "IdLapVi",
    "tenBaiLieu",
    "khoiLuongHong",
    "thoiGianNhap",
    "nguoiNhap"
  ];

  const sheet = getOrCreateSheet_(
    SHEET_VIEN_VTBC_HONG,
    headers
  );

  ensureHeader_(sheet, headers);

  return sheet;
}

function extractProductionDateFromThungId_(
  idThung
) {
  const text = normalizeText_(idThung);

  /*
   * BTP + yyyyMMdd + phần thời gian còn lại.
   */
  const match = text.match(
    /^BTP(\d{4})(\d{2})(\d{2})/
  );

  if (!match) {
    return "";
  }

  return (
    match[1] +
    "-" +
    match[2] +
    "-" +
    match[3]
  );
}

function getOldestProductionDateFromIds_(
  ids
) {
  const dates = (ids || [])
    .map(function(id) {
      return extractProductionDateFromThungId_(
        id
      );
    })
    .filter(function(dateText) {
      return !!dateText;
    })
    .sort();

  return dates.length
    ? dates[0]
    : "";
}

function getLichSuLapViByIdLapVi_(
  idLapVi
) {
  idLapVi = normalizeText_(idLapVi);

  const sheet = getSheet_(
    SHEET_LICH_SU_LAP_VI
  );

  if (sheet.getLastRow() < 2) {
    return [];
  }

  const values = sheet
    .getDataRange()
    .getValues();

  const headers = values[0].map(
    function(h) {
      return normalizeText_(h);
    }
  );

  const idxIdXuat =
    findRequiredHeaderIndex_(
      headers,
      ["IdXuatLapVi"]
    );

  const idxIdLapVi =
    findRequiredHeaderIndex_(
      headers,
      ["IdLapVi"]
    );

  const idxIdThung =
    findRequiredHeaderIndex_(
      headers,
      ["IdThungXuat"]
    );

  const idxKhoiLuong =
    findRequiredHeaderIndex_(
      headers,
      ["khoiLuongThungXuat"]
    );

  const idxThoiGian =
    findRequiredHeaderIndex_(
      headers,
      ["thoiGianXuat"]
    );

  const idxNguoiXuat =
    findRequiredHeaderIndex_(
      headers,
      ["nguoiXuat"]
    );

  const result = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    if (
      normalizeText_(row[idxIdLapVi]) !==
      idLapVi
    ) {
      continue;
    }

    result.push({
      rowNumber: i + 1,

      IdXuatLapVi:
        normalizeText_(row[idxIdXuat]),

      IdLapVi:
        normalizeText_(row[idxIdLapVi]),

      IdThungXuat:
        normalizeText_(row[idxIdThung]),

      khoiLuongThungXuat:
        Number(row[idxKhoiLuong]) || 0,

      thoiGianXuat:
        formatDateTimeText_(
          row[idxThoiGian]
        ),

      nguoiXuat:
        normalizeText_(row[idxNguoiXuat])
    });
  }

  return result;
}

function getNhapLaiKhoTongMap_(
  idLapVi
) {
  const ss = getSpreadsheet_();

  const sheet = ss.getSheetByName(
    SHEET_NHAP_LAI_KHO_VIEN_VTBC
  );

  if (!sheet || sheet.getLastRow() < 2) {
    return {};
  }

  const values = sheet
    .getDataRange()
    .getValues();

  const headers = values[0].map(
    function(h) {
      return normalizeText_(h);
    }
  );

  const idxIdLapVi =
    findOptionalHeaderIndex_(
      headers,
      ["IdLapVi"]
    );

  const idxIdThung =
    findOptionalHeaderIndex_(
      headers,
      ["IdThungXuat"]
    );

  const idxKhoiLuong =
    findOptionalHeaderIndex_(
      headers,
      ["khoiLuongNhapLai"]
    );

  if (
    idxIdLapVi === -1 ||
    idxIdThung === -1 ||
    idxKhoiLuong === -1
  ) {
    return {};
  }

  const map = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    if (
      normalizeText_(row[idxIdLapVi]) !==
      normalizeText_(idLapVi)
    ) {
      continue;
    }

    const idThung = normalizeText_(
      row[idxIdThung]
    );

    if (!idThung) {
      continue;
    }

    map[idThung] =
      (map[idThung] || 0) +
      (Number(row[idxKhoiLuong]) || 0);
  }

  return map;
}

function isLapViPlanFullyExported_(
  plan
) {
  return (
    plan &&
    Array.isArray(plan.rows) &&
    plan.rows.length > 0 &&
    plan.rows.every(function(row) {
      return (
        lowerText_(row.trangThai) ===
        "đã xuất"
      );
    })
  );
}

function getKetQuaLapViPlanDetail_(
  idLapVi
) {
  /*
   * Đọc kế hoạch lắp vỉ.
   */
  const plan =
    getLapViExportPlanById_(
      idLapVi
    );

  /*
   * Kiểm tra kế hoạch đã xuất đủ chưa.
   */
  if (
    !isLapViPlanFullyExported_(
      plan
    )
  ) {
    throw new Error(
      "Kế hoạch chưa được xuất đầy đủ, " +
      "không thể nhập kết quả lắp vỉ."
    );
  }

  /*
   * Đọc lịch sử xuất thùng của kế hoạch.
   */
  const historyRows =
    getLichSuLapViByIdLapVi_(
      idLapVi
    );

  if (!historyRows.length) {
    throw new Error(
      "Không tìm thấy lịch sử xuất thùng " +
      "của kế hoạch " +
      idLapVi +
      "."
    );
  }

  /*
   * Lấy tổng khối lượng đã nhập lại kho
   * theo từng IdThungXuat.
   */
  const returnedMap =
    getNhapLaiKhoTongMap_(
      idLapVi
    );

  /*
   * Tạo danh sách thùng đã xuất.
   *
   * Chú ý:
   * Trong map này chỉ return dữ liệu của từng thùng.
   * Không được return toàn bộ chi tiết kế hoạch ở đây.
   */
  const thungs =
    historyRows.map(
      function(item) {
        const daNhapLai =
          Number(
            returnedMap[
              item.IdThungXuat
            ]
          ) || 0;

        const khoiLuongThungXuat =
          Number(
            item.khoiLuongThungXuat
          ) || 0;

        const conCoTheNhap =
          Math.max(
            0,
            khoiLuongThungXuat -
            daNhapLai
          );

        return {
          IdXuatLapVi:
            item.IdXuatLapVi,

          IdThungXuat:
            item.IdThungXuat,

          khoiLuongThungXuat:
            khoiLuongThungXuat,

          khoiLuongDaNhapLai:
            daNhapLai,

          khoiLuongConCoTheNhap:
            conCoTheNhap
        };
      }
    );

  /*
   * Lấy danh sách tên bài liệu.
   */
  const tenBaiLieuMap = {};

  if (
    plan &&
    Array.isArray(plan.rows)
  ) {
    plan.rows.forEach(
      function(row) {
        const tenBaiLieu1 =
          normalizeText_(
            row.tenBaiLieu1
          );

        const tenBaiLieu2 =
          normalizeText_(
            row.tenBaiLieu2
          );

        if (tenBaiLieu1) {
          tenBaiLieuMap[
            tenBaiLieu1
          ] = true;
        }

        if (tenBaiLieu2) {
          tenBaiLieuMap[
            tenBaiLieu2
          ] = true;
        }
      }
    );
  }

  /*
   * Tìm ngày sản xuất cũ nhất
   * từ các mã thùng đã xuất.
   *
   * Biến này phải được khai báo trước khi
   * sử dụng trong object return cuối hàm.
   */
  const oldestDate =
    getOldestProductionDateFromIds_(
      historyRows.map(
        function(item) {
          return item.IdThungXuat;
        }
      )
    );

  /*
   * Đọc danh sách thùng thành phẩm đã lưu
   * trong sheet KetQuaLapVi.
   */
  const thungDungVis =
    getKetQuaLapViRowsByIdLapVi_(
      idLapVi
    );

  const idThungBai1Map = {};
  const idThungBai2Map = {};

  (plan.rows || []).forEach(function(row) {
    const idBai1 =
      normalizeText_(
        row.IdThungBanThanhPham1
      );

    const idBai2 =
      normalizeText_(
        row.IdThungBanThanhPham2
      );

    if (idBai1) {
      idThungBai1Map[idBai1] = true;
    }

    if (idBai2) {
      idThungBai2Map[idBai2] = true;
    }
  });

  const idThungBanThanhPham1List =
    Object.keys(idThungBai1Map);

  const idThungBanThanhPham2List =
    Object.keys(idThungBai2Map);

  /*
   * Chỉ có một return tổng ở cuối hàm.
   */
  return {
    IdLapVi:
      idLapVi,

    maSanPham:
      plan.maSanPham,

    tenSanPham:
      plan.tenSanPham,

    soLuongViKeHoach:
      Number(
        plan.soLuongViKeHoach
      ) || 0,
      
    IdXuatLapVi:
      historyRows[0]
        .IdXuatLapVi,

    ngaySanXuat:
      oldestDate,

    thungs:
      thungs,

    tenBaiLieus:
      Object.keys(
        tenBaiLieuMap
      ),

    IdThungBanThanhPham1List:
      idThungBanThanhPham1List,

    IdThungBanThanhPham2List:
      idThungBanThanhPham2List,

    thungDungVis:
      thungDungVis
  };
}

function getKetQuaLapViPlans_(
  filter
) {
  const dateFilter =
    normalizeLapViExportFilter_(filter);

  const sheet = getSheet_(
    SHEET_KE_HOACH_LAP_VI_VTBC
  );

  if (sheet.getLastRow() < 2) {
    return [];
  }

  const values = sheet
    .getDataRange()
    .getValues();

  const headers = values[0].map(
    function(h) {
      return normalizeText_(h);
    }
  );

  const idx =
    getKeHoachLapViHeaderIndex_(
      headers
    );

  const productNameMap =
    getTenSanPhamVTBCMap_();

  const map = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const idLapVi = normalizeText_(
      row[idx.IdLapVi]
    );

    if (!idLapVi) {
      continue;
    }

    const status = normalizeText_(
      row[idx.trangThai]
    );

    /*
     * Chỉ nhận dòng đã xuất.
     */
    if (lowerText_(status) !== "đã xuất") {
      continue;
    }

    const thoiGianXuat =
      formatDateTimeText_(
        row[idx.thoiGianXuat]
      );

    /*
     * Menu kết quả lọc theo thời gian xuất,
     * không lọc theo thời gian tạo kế hoạch.
     */
    if (
      !isDateTextInRange_(
        thoiGianXuat,
        dateFilter.fromDate,
        dateFilter.toDate
      )
    ) {
      continue;
    }

    if (!map[idLapVi]) {
      const maSanPham =
        normalizeText_(
          row[idx.maSanPham]
        );

      map[idLapVi] = {
        IdLapVi: idLapVi,

        maSanPham: maSanPham,

        tenSanPham:
          productNameMap[maSanPham] ||
          normalizeText_(
            row[idx.tenSanPham]
          ) ||
          maSanPham,

        soLuongViKeHoach:
          idx.soLuongViKeHoach === -1
            ? 0
            : Number(
                row[idx.soLuongViKeHoach]
              ) || 0,

        thoiGianXuat:
          thoiGianXuat,

        nguoiXuat:
          normalizeText_(
            row[idx.nguoiXuat]
          ),

        totalRows: 0,
        exportedRows: 0
      };
    }

    map[idLapVi].totalRows++;
    map[idLapVi].exportedRows++;
  }

  return Object.keys(map)
  .map(function(id) {
    return map[id];
  })
  .filter(function(item) {
    const fullPlan =
      getLapViExportPlanById_(
        item.IdLapVi
      );

    return isLapViPlanFullyExported_(
      fullPlan
    );
  })
  .sort(function(a, b) {
    return String(
      b.thoiGianXuat
    ).localeCompare(
      String(a.thoiGianXuat)
    );
  });
}

function getKetQuaLapViData(
  token,
  filter
) {
  requireWorker_(token);

  const dateFilter =
    normalizeLapViExportFilter_(
      filter
    );

  return {
    success: true,
    filter: dateFilter,

    plans:
      getKetQuaLapViPlans_(
        dateFilter
      )
  };
}

function getKetQuaLapViDetail(
  token,
  payload
) {
  requireWorker_(token);

  const idLapVi = normalizeText_(
    payload && payload.IdLapVi
  );

  if (!idLapVi) {
    throw new Error(
      "Vui lòng chọn kế hoạch lắp vỉ."
    );
  }

  return {
    success: true,
    detail:
      getKetQuaLapViPlanDetail_(
        idLapVi
      )
  };
}

function hasKetQuaLapVi_(
  idLapVi
) {
  const ss = getSpreadsheet_();

  const sheet = ss.getSheetByName(
    SHEET_KET_QUA_LAP_VI
  );

  if (!sheet || sheet.getLastRow() < 2) {
    return false;
  }

  const values = sheet
    .getDataRange()
    .getValues();

  const headers = values[0].map(
    function(h) {
      return normalizeText_(h);
    }
  );

  const idxIdLapVi =
    findOptionalHeaderIndex_(
      headers,
      ["IdLapVi"]
    );

  if (idxIdLapVi === -1) {
    return false;
  }

  for (let i = 1; i < values.length; i++) {
    if (
      normalizeText_(
        values[i][idxIdLapVi]
      ) === normalizeText_(idLapVi)
    ) {
      return true;
    }
  }

  return false;
}

function saveKetQuaLapVi(
  token,
  payload
) {
  const lock =
    LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const session =
      requireWorker_(token);

    const idLapVi =
      normalizeText_(
        payload && payload.IdLapVi
      );

    const items =
      payload &&
      Array.isArray(payload.items)
        ? payload.items
        : [];

    if (!idLapVi) {
      throw new Error(
        "Vui lòng chọn kế hoạch lắp vỉ."
      );
    }

    if (!items.length) {
      throw new Error(
        "Chưa thêm thùng vỉ nào vào danh sách."
      );
    }

    const detail =
      getKetQuaLapViPlanDetail_(
        idLapVi
      );

    if (!detail.ngaySanXuat) {
      throw new Error(
        "Không xác định được ngày sản xuất " +
        "từ mã thùng đã xuất."
      );
    }

    /*
     * Tạo map ID bài hợp lệ theo đúng kế hoạch.
     */
    const validBai1Map = {};
    const validBai2Map = {};

    (
      detail.IdThungBanThanhPham1List ||
      []
    ).forEach(function(id) {
      const value = normalizeText_(id);

      if (value) {
        validBai1Map[value] = true;
      }
    });

    (
      detail.IdThungBanThanhPham2List ||
      []
    ).forEach(function(id) {
      const value = normalizeText_(id);

      if (value) {
        validBai2Map[value] = true;
      }
    });

    const cleanItems = [];

    items.forEach(
      function(item, index) {
        const soLuong =
          Number(
            item &&
            item.soLuongViDaLap
          );

        const vitriKho =
          normalizeText_(
            item &&
            item.vitriKho
          );

        const idBai1 =
          normalizeText_(
            item &&
            item.IdThungBanThanhPham1
          );

        const idBai2 =
          normalizeText_(
            item &&
            item.IdThungBanThanhPham2
          );

        if (
          !isFinite(soLuong) ||
          soLuong <= 0 ||
          Math.floor(soLuong) !==
            soLuong
        ) {
          throw new Error(
            "Thùng số " +
            (index + 1) +
            ": số lượng vỉ đạt phải là " +
            "số nguyên lớn hơn 0."
          );
        }

        if (!idBai1) {
          throw new Error(
            "Thùng số " +
            (index + 1) +
            ": chưa chọn ID bài 1."
          );
        }

        if (!idBai2) {
          throw new Error(
            "Thùng số " +
            (index + 1) +
            ": chưa chọn ID bài 2."
          );
        }

        if (!validBai1Map[idBai1]) {
          throw new Error(
            "ID bài 1 không thuộc kế hoạch: " +
            idBai1
          );
        }

        if (!validBai2Map[idBai2]) {
          throw new Error(
            "ID bài 2 không thuộc kế hoạch: " +
            idBai2
          );
        }

        cleanItems.push({
          soLuongViDaLap:
            soLuong,

          vitriKho:
            vitriKho,

          IdThungBanThanhPham1:
            idBai1,

          IdThungBanThanhPham2:
            idBai2
        });
      }
    );

    const sheet =
      getKetQuaLapViSheet_();

    /*
     * Đếm số thùng đã lưu trước đây.
     *
     * Ví dụ đã có 2 dòng:
     * lần này sẽ bắt đầu từ T03.
     */
    const oldRows =
      getKetQuaLapViRowsByIdLapVi_(
        idLapVi
      );

    const soThungDaLuu =
      oldRows.length;

    /*
     * Mỗi lần bấm lưu vẫn tạo mã gốc mới,
     * nhưng phần Txx tiếp tục từ số đã lưu.
     */
    const baseId =
      generateThungDungViId_();

    const thoiGianLuu =
      nowText_();

    const nguoiLuu =
      session.useName || "";

    const rows =
      cleanItems.map(
        function(item, index) {
          const soThuTuThung =
            soThungDaLuu +
            index +
            1;

          const stt =
            String(
              soThuTuThung
            ).padStart(2, "0");

          const idThungDungVi =
            baseId +
            "_T" +
            stt;

          return [
            idThungDungVi,
            idLapVi,
            item.soLuongViDaLap,
            detail.ngaySanXuat,
            thoiGianLuu,
            nguoiLuu,
            item.vitriKho,
            item.IdThungBanThanhPham1,
            item.IdThungBanThanhPham2
          ];
        }
      );

    const startRow =
      sheet.getLastRow() + 1;

    sheet
      .getRange(
        startRow,
        1,
        rows.length,
        9
      )
      .setValues(rows);

    SpreadsheetApp.flush();

    const allRows =
      getKetQuaLapViRowsByIdLapVi_(
        idLapVi
      );

    return {
      success: true,

      insertedRows:
        rows.length,

      totalRows:
        allRows.length,

      thungDungVis:
        allRows,

      message:
        "Đã lưu thêm " +
        rows.length +
        " thùng vỉ. " +
        "Tổng số thùng hiện tại: " +
        allRows.length +
        "."
    };

  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

function saveKetQuaLapViLocations(
  token,
  payload
) {
  const lock =
    LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const session =
      requireWorker_(token);

    const idLapVi = normalizeText_(
      payload && payload.IdLapVi
    );

    const items =
      payload &&
      Array.isArray(payload.items)
        ? payload.items
        : [];

    if (!idLapVi) {
      throw new Error(
        "Vui lòng chọn kế hoạch lắp vỉ."
      );
    }

    if (!items.length) {
      throw new Error(
        "Kế hoạch chưa có thùng vỉ để cập nhật vị trí."
      );
    }

    /*
     * Đảm bảo kế hoạch hợp lệ và đã xuất đủ.
     */
    getKetQuaLapViPlanDetail_(
      idLapVi
    );

    const sheet =
      getKetQuaLapViSheet_();

    const values =
      sheet
        .getDataRange()
        .getValues();

    const headers =
      values[0].map(
        function(header) {
          return normalizeText_(header);
        }
      );

    const idxIdThungDungVi =
      findRequiredHeaderIndex_(
        headers,
        ["IdThungDungVi"]
      );

    const idxIdLapVi =
      findRequiredHeaderIndex_(
        headers,
        ["IdLapVi"]
      );

    const idxSoLuong =
      findRequiredHeaderIndex_(
        headers,
        ["soLuongViDaLap"]
      );

    const idxVitriKho =
      findRequiredHeaderIndex_(
        headers,
        ["vitriKho", "viTriKho"]
      );

    const validMap = {};

    for (let i = 1; i < values.length; i++) {
      const rowIdLapVi =
        normalizeText_(
          values[i][idxIdLapVi]
        );

      if (rowIdLapVi !== idLapVi) {
        continue;
      }

      const idThung =
        normalizeText_(
          values[i][idxIdThungDungVi]
        );

      if (!idThung) {
        continue;
      }

      validMap[idThung] = {
        rowNumber: i + 1,
        soLuongViDaLap:
          Number(
            values[i][idxSoLuong]
          ) || 0
      };
    }

    const seenMap = {};
    const updates = [];

    items.forEach(
      function(item, index) {
        const idThung =
          normalizeText_(
            item &&
            item.IdThungDungVi
          );

        const soLuong =
          Number(
            item &&
            item.soLuongViDaLap
          );

        const vitriKho =
          normalizeText_(
            item &&
            item.vitriKho
          );

        if (!idThung) {
          throw new Error(
            "Dòng " +
            (index + 1) +
            " thiếu mã thùng."
          );
        }

        if (!validMap[idThung]) {
          throw new Error(
            "Thùng " +
            idThung +
            " không thuộc kế hoạch " +
            idLapVi +
            "."
          );
        }

        if (seenMap[idThung]) {
          throw new Error(
            "Mã thùng bị trùng trong dữ liệu gửi lên: " +
            idThung
          );
        }

        seenMap[idThung] = true;

        /*
         * Số lượng bắt buộc và cho phép bằng 0.
         */
        if (
          !isFinite(soLuong) ||
          soLuong < 0 ||
          Math.floor(soLuong) !==
            soLuong
        ) {
          throw new Error(
            "Thùng " +
            idThung +
            ": số lượng vỉ phải là " +
            "số nguyên từ 0 trở lên."
          );
        }

        updates.push({
          rowNumber:
            validMap[idThung].rowNumber,

          IdThungDungVi:
            idThung,

          soLuongViDaLap:
            soLuong,

          vitriKho:
            vitriKho
        });
      }
    );

    /*
     * Yêu cầu gửi đủ toàn bộ thùng của kế hoạch,
     * tránh ghi thiếu một phần.
     */
    const validIds =
      Object.keys(validMap);

    if (
      updates.length !==
      validIds.length
    ) {
      throw new Error(
        "Phải gửi đủ toàn bộ " +
        validIds.length +
        " thùng của kế hoạch."
      );
    }

    updates.forEach(
      function(item) {
        sheet
          .getRange(
            item.rowNumber,
            idxSoLuong + 1
          )
          .setValue(
            item.soLuongViDaLap
          );

        sheet
          .getRange(
            item.rowNumber,
            idxVitriKho + 1
          )
          .setValue(
            item.vitriKho
          );
      }
    );

    SpreadsheetApp.flush();

    const locationCount =
      updates.filter(
        function(item) {
          return !!item.vitriKho;
        }
      ).length;

    const emptyCount =
      updates.length -
      locationCount;

    return {
      success: true,

      IdLapVi:
        idLapVi,

      total:
        updates.length,

      locationCount:
        locationCount,

      emptyCount:
        emptyCount,

      nguoiCapNhat:
        session.useName || "",

      thoiGianCapNhat:
        nowText_(),

      thungDungVis:
        getKetQuaLapViRowsByIdLapVi_(
          idLapVi
        ),

      message:
        "Đã cập nhật " +
        updates.length +
        " thùng: " +
        locationCount +
        " thùng có vị trí, " +
        emptyCount +
        " thùng để trống vị trí."
    };

  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

function saveNhapLaiKhoVienVTBC(
  token,
  payload
) {
  const lock =
    LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const session =
      requireWorker_(token);

    const idLapVi = normalizeText_(
      payload && payload.IdLapVi
    );

    const items =
      payload &&
      Array.isArray(payload.items)
        ? payload.items
        : [];

    if (!idLapVi) {
      throw new Error(
        "Vui lòng chọn kế hoạch lắp vỉ."
      );
    }

    const detail =
      getKetQuaLapViPlanDetail_(
        idLapVi
      );

    const validMap = {};

    detail.thungs.forEach(
      function(item) {
        validMap[
          item.IdThungXuat
        ] = item;
      }
    );

    const cleanItems = items
      .map(function(item) {
        return {
          IdThungXuat:
            normalizeText_(
              item &&
              item.IdThungXuat
            ),

          khoiLuongNhapLai:
            Number(
              item &&
              item.khoiLuongNhapLai
            )
        };
      })
      .filter(function(item) {
        return (
          item.IdThungXuat &&
          isFinite(
            item.khoiLuongNhapLai
          ) &&
          item.khoiLuongNhapLai > 0
        );
      });

    if (!cleanItems.length) {
      throw new Error(
        "Vui lòng nhập khối lượng nhập lại " +
        "lớn hơn 0 cho ít nhất một thùng."
      );
    }

    cleanItems.forEach(function(item) {
      const expected =
        validMap[item.IdThungXuat];

      if (!expected) {
        throw new Error(
          "Thùng không thuộc kế hoạch: " +
          item.IdThungXuat
        );
      }

      if (
        item.khoiLuongNhapLai >
        expected.khoiLuongConCoTheNhap
      ) {
        throw new Error(
          "Khối lượng nhập lại của thùng " +
          item.IdThungXuat +
          " vượt quá khối lượng còn có thể nhập. " +
          "Tối đa: " +
          expected.khoiLuongConCoTheNhap +
          " kg."
        );
      }
    });

    const boxSheet = getSheet_(
      SHEET_CHI_TIET_BTP_THEO_THUNG
    );

    const boxValues = boxSheet
      .getDataRange()
      .getValues();

    const boxHeaders =
      boxValues[0].map(function(h) {
        return normalizeText_(h);
      });

    const boxIdx =
      getChiTietBTPTheoThungHeaderIndex_(
        boxHeaders
      );

    const boxMap = {};

    for (let i = 1; i < boxValues.length; i++) {
      const idThung = normalizeText_(
        boxValues[i][
          boxIdx.IdThungBanThanhPham
        ]
      );

      if (idThung) {
        boxMap[idThung] = {
          rowNumber: i + 1,
          currentStock:
            Number(
              boxValues[i][
                boxIdx.khoiLuongThung
              ]
            ) || 0
        };
      }
    }

    cleanItems.forEach(function(item) {
      if (!boxMap[item.IdThungXuat]) {
        throw new Error(
          "Không tìm thấy thùng trong " +
          "ChiTietBTPtheoThung: " +
          item.IdThungXuat
        );
      }
    });

    const historySheet =
      getNhapLaiKhoVienVTBCSheet_();

    const thoiGianNhapLai =
      nowText_();

    const historyRows =
      cleanItems.map(function(item) {
        const expected =
          validMap[item.IdThungXuat];

        return [
          expected.IdXuatLapVi,
          idLapVi,
          item.IdThungXuat,
          item.khoiLuongNhapLai,
          thoiGianNhapLai,
          session.useName || ""
        ];
      });

    /*
     * Ghi lịch sử nhập lại trước.
     */
    historySheet
      .getRange(
        historySheet.getLastRow() + 1,
        1,
        historyRows.length,
        6
      )
      .setValues(historyRows);

    /*
     * Cộng lại đúng khối lượng công nhân nhập.
     */
    cleanItems.forEach(function(item) {
      const boxItem =
        boxMap[item.IdThungXuat];

      const newStock =
        boxItem.currentStock +
        item.khoiLuongNhapLai;

      boxSheet
        .getRange(
          boxItem.rowNumber,
          boxIdx.khoiLuongThung + 1
        )
        .setValue(newStock);
    });

    return {
      success: true,

      detail:
        getKetQuaLapViPlanDetail_(
          idLapVi
        ),

      message:
        "Đã nhập lại kho " +
        cleanItems.length +
        " thùng."
    };

  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

function saveVienVTBCHong(
  token,
  payload
) {
  const lock =
    LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const session =
      requireWorker_(token);

    const idLapVi = normalizeText_(
      payload && payload.IdLapVi
    );

    const items =
      payload &&
      Array.isArray(payload.items)
        ? payload.items
        : [];

    if (!idLapVi) {
      throw new Error(
        "Vui lòng chọn kế hoạch lắp vỉ."
      );
    }

    const detail =
      getKetQuaLapViPlanDetail_(
        idLapVi
      );

    const validNameMap = {};

    detail.tenBaiLieus.forEach(
      function(name) {
        validNameMap[
          normalizeForCompare_(name)
        ] = name;
      }
    );

    const cleanItems = items
      .map(function(item) {
        return {
          tenBaiLieu:
            normalizeText_(
              item &&
              item.tenBaiLieu
            ),

          khoiLuongHong:
            Number(
              item &&
              item.khoiLuongHong
            )
        };
      })
      .filter(function(item) {
        return (
          item.tenBaiLieu &&
          isFinite(item.khoiLuongHong) &&
          item.khoiLuongHong > 0
        );
      });

    if (!cleanItems.length) {
      throw new Error(
        "Vui lòng nhập khối lượng hỏng " +
        "lớn hơn 0 cho ít nhất một bài liệu."
      );
    }

    cleanItems.forEach(function(item) {
      const key =
        normalizeForCompare_(
          item.tenBaiLieu
        );

      if (!validNameMap[key]) {
        throw new Error(
          "Bài liệu không thuộc kế hoạch: " +
          item.tenBaiLieu
        );
      }

      item.tenBaiLieu =
        validNameMap[key];
    });

    const sheet =
      getVienVTBCHongSheet_();

    const thoiGianNhap =
      nowText_();

    const rows =
      cleanItems.map(function(item) {
        return [
          detail.IdXuatLapVi,
          idLapVi,
          item.tenBaiLieu,
          item.khoiLuongHong,
          thoiGianNhap,
          session.useName || ""
        ];
      });

    sheet
      .getRange(
        sheet.getLastRow() + 1,
        1,
        rows.length,
        6
      )
      .setValues(rows);

    return {
      success: true,

      message:
        "Đã lưu khối lượng viên hỏng cho " +
        rows.length +
        " bài liệu."
    };

  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

/* =========================================================
 * MENU TẠO VIÊN
 * ========================================================= */
function parseNgaySanXuatFromLot_(value) {
  const text = normalizeText_(value);
  if (!text) return "";

  let match = text.match(/NSX(\d{2})(\d{2})(\d{4})/i);
  if (!match) match = text.match(/(\d{2})(\d{2})(\d{4})/);
  if (!match) return "";

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return "";

  return String(year).padStart(4, "0") + "-" +
    String(month).padStart(2, "0") + "-" +
    String(day).padStart(2, "0");
}

function normalizeTaoVienFilter_(filter) {
  let fromDate = normalizeText_(filter && filter.fromDate) || yesterdayText_();
  let toDate = normalizeText_(filter && filter.toDate) || todayText_();

  fromDate = validateDateText_(fromDate);
  toDate = validateDateText_(toDate);

  if (fromDate > toDate) {
    throw new Error("Từ ngày không được lớn hơn đến ngày.");
  }

  return { fromDate: fromDate, toDate: toDate };
}

function getTaoVienCards_(filter) {
  const dateFilter = normalizeTaoVienFilter_(filter);
  const sheet = getSheet_(SHEET_CHI_TIET_BTP_THEO_THUNG);
  if (sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(h) { return normalizeText_(h); });
  const idx = getChiTietBTPTheoThungHeaderIndex_(headers);
  const cardMap = {};

  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const row = values[rowIndex];
    const idBanThanhPham = normalizeText_(row[idx.IdBanThanhPham]);
    const lotNo = normalizeText_(row[idx.ngaySanXuat]);
    const idThung = normalizeText_(row[idx.IdThungBanThanhPham]);

    if (!idBanThanhPham || !idThung) continue;

    const productionDate = parseNgaySanXuatFromLot_(lotNo);
    if (!productionDate) continue;
    if (productionDate < dateFilter.fromDate || productionDate > dateFilter.toDate) continue;

    const khoiLuong = Number(row[idx.khoiLuongThung]);
    const viTriThung = normalizeText_(row[idx.viTriThung]);

    if (!cardMap[idBanThanhPham]) {
      cardMap[idBanThanhPham] = {
        IdBanThanhPham: idBanThanhPham,
        ngaySanXuat: lotNo,
        ngaySanXuatDate: productionDate,
        tongSoThung: 0,
        tongKhoiLuong: 0,
        daNhapDuViTri: true,
        thungs: []
      };
    }

    cardMap[idBanThanhPham].thungs.push({
      rowNumber: rowIndex + 1,
      IdBanThanhPham: idBanThanhPham,
      ngaySanXuat: lotNo,
      ngaySanXuatDate: productionDate,
      IdThungBanThanhPham: idThung,
      sttThung: Number(row[idx.sttThung]) || 0,
      khoiLuongThung: isFinite(khoiLuong) ? khoiLuong : 0,
      viTriThung: viTriThung
    });

    cardMap[idBanThanhPham].tongSoThung++;
    cardMap[idBanThanhPham].tongKhoiLuong += isFinite(khoiLuong) ? khoiLuong : 0;
    if (!viTriThung) cardMap[idBanThanhPham].daNhapDuViTri = false;
  }

  const result = Object.keys(cardMap).map(function(id) {
    const card = cardMap[id];
    card.tongKhoiLuong = Math.round(card.tongKhoiLuong * 1000) / 1000;
    card.thungs.sort(function(a, b) {
      return Number(a.sttThung) - Number(b.sttThung) ||
        String(a.IdThungBanThanhPham).localeCompare(String(b.IdThungBanThanhPham));
    });
    return card;
  });

  result.sort(function(a, b) {
    return String(b.ngaySanXuatDate).localeCompare(String(a.ngaySanXuatDate)) ||
      String(b.IdBanThanhPham).localeCompare(String(a.IdBanThanhPham));
  });

  return result;
}

function getTaoVienData(token, filter) {
  requireWorker_(token);
  const dateFilter = normalizeTaoVienFilter_(filter);

  return {
    success: true,
    fromDate: dateFilter.fromDate,
    toDate: dateFilter.toDate,
    cards: getTaoVienCards_(dateFilter)
  };
}

function saveTaoVienCard(token, payload) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);
    const session = requireWorker_(token);
    const idBanThanhPham = normalizeText_(payload && payload.IdBanThanhPham);
    const items = payload && Array.isArray(payload.items) ? payload.items : [];

    if (!idBanThanhPham) throw new Error("Thiếu ID bán thành phẩm.");
    if (!items.length) throw new Error("Không có danh sách thùng để lưu.");

    const sheet = getSheet_(SHEET_CHI_TIET_BTP_THEO_THUNG);
    if (sheet.getLastRow() < 2) throw new Error("Sheet ChiTietBTPtheoThung chưa có dữ liệu.");

    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(function(h) { return normalizeText_(h); });
    const idx = getChiTietBTPTheoThungHeaderIndex_(headers);
    const validMap = {};

    for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
      if (normalizeText_(values[rowIndex][idx.IdBanThanhPham]) !== idBanThanhPham) continue;
      const idThung = normalizeText_(values[rowIndex][idx.IdThungBanThanhPham]);
      if (idThung) validMap[idThung] = { rowNumber: rowIndex + 1 };
    }

    const validIds = Object.keys(validMap);
    if (!validIds.length) {
      throw new Error("Không tìm thấy các thùng của bán thành phẩm " + idBanThanhPham + ".");
    }

    if (items.length !== validIds.length) {
      throw new Error("Dữ liệu gửi lên chưa đủ số thùng. Card có " +
        validIds.length + " thùng nhưng nhận được " + items.length + " thùng.");
    }

    const seenMap = {};
    const updates = [];

    items.forEach(function(item, index) {
      const idThung = normalizeText_(item && item.IdThungBanThanhPham);
      const viTriThung = normalizeText_(item && item.viTriThung);

      if (!idThung) throw new Error("Dòng " + (index + 1) + " thiếu ID thùng.");
      if (!validMap[idThung]) {
        throw new Error("Thùng " + idThung + " không thuộc bán thành phẩm " + idBanThanhPham + ".");
      }
      if (seenMap[idThung]) throw new Error("Mã thùng bị gửi trùng: " + idThung);
      if (!viTriThung) throw new Error("Thùng " + idThung + " chưa nhập vị trí.");

      seenMap[idThung] = true;
      updates.push({ rowNumber: validMap[idThung].rowNumber, viTriThung: viTriThung });
    });

    validIds.forEach(function(idThung) {
      if (!seenMap[idThung]) throw new Error("Thiếu dữ liệu thùng: " + idThung);
    });

    updates.forEach(function(update) {
      sheet.getRange(update.rowNumber, idx.viTriThung + 1).setValue(update.viTriThung);
    });

    SpreadsheetApp.flush();

    return {
      success: true,
      IdBanThanhPham: idBanThanhPham,
      updatedRows: updates.length,
      nguoiLuu: session.useName || "",
      thoiGianLuu: nowText_(),
      message: "Đã lưu vị trí cho " + updates.length + " thùng."
    };
  } finally {
    try { lock.releaseLock(); } catch (error) {}
  }
}

/* =========================================================
   CÔNG NHÂN BÁO CÁO ÉP MÀNG IN VÀ ĐÓNG THÙNG
   ========================================================= */

/*
 * Chuẩn hóa bộ lọc ngày.
 */
function normalizeWorkerSimplePlanFilter_(
  filter
) {
  let fromDate =
    normalizeText_(
      filter &&
      filter.fromDate
    );

  let toDate =
    normalizeText_(
      filter &&
      filter.toDate
    );

  if (!fromDate) {
    fromDate =
      yesterdayText_();
  }

  if (!toDate) {
    toDate =
      todayText_();
  }

  fromDate =
    validateDateText_(
      fromDate
    );

  toDate =
    validateDateText_(
      toDate
    );

  if (fromDate > toDate) {
    throw new Error(
      "Từ ngày không được lớn hơn đến ngày."
    );
  }

  return {
    fromDate:
      fromDate,

    toDate:
      toDate
  };
}


/*
 * Kiểm tra thời gian có nằm trong khoảng ngày không.
 */
function isWorkerSimplePlanDateInRange_(
  value,
  fromDate,
  toDate
) {
  const dateText =
    formatDateValue_(
      value
    ).substring(
      0,
      10
    );

  if (!dateText) {
    return false;
  }

  if (
    fromDate &&
    dateText < fromDate
  ) {
    return false;
  }

  if (
    toDate &&
    dateText > toDate
  ) {
    return false;
  }

  return true;
}


/*
 * Cấu hình sheet ép màng in.
 */
function getWorkerEpMangInConfig_() {
  return {
    sheetName:
      SHEET_KE_HOACH_EP_MANG_IN,

    planQuantityHeader:
      "soLuongViKeHoach",

    actualQuantityHeader:
      "soLuongViThucHien",

    quantityLabel:
      "Số lượng vỉ thực hiện",

    unit:
      "vỉ",

    planName:
      "ép màng in"
  };
}


/*
 * Cấu hình sheet đóng thùng.
 */
function getWorkerDongThungConfig_() {
  return {
    sheetName:
      SHEET_KE_HOACH_DONG_THUNG,

    planQuantityHeader:
      "soLuongThungKeHoach",

    actualQuantityHeader:
      "soLuongThungThucHien",

    quantityLabel:
      "Số lượng thùng thực hiện",

    unit:
      "thùng",

    planName:
      "đóng thùng"
  };
}


/*
 * Lấy index các cột theo cấu hình.
 */
function getWorkerSimplePlanHeaderIndex_(
  headers,
  config
) {
  const idx = {
    STT:
      headers.indexOf(
        "STT"
      ),

    maSanPham:
      headers.indexOf(
        "maSanPham"
      ),

    tenSanPham:
      headers.indexOf(
        "tenSanPham"
      ),

    soLuongKeHoach:
      headers.indexOf(
        config.planQuantityHeader
      ),

    thoiGianTao:
      headers.indexOf(
        "thoiGianTao"
      ),

    nguoiTao:
      headers.indexOf(
        "nguoiTao"
      ),

    trangThai:
      headers.indexOf(
        "trangThai"
      ),

    soLuongThucHien:
      headers.indexOf(
        config.actualQuantityHeader
      ),

    ghiChu:
      headers.indexOf(
        "ghiChu"
      ),

    nguoiBaoCao:
      headers.indexOf(
        "nguoiBaoCao"
      ),

    ThoiGianBaoCao:
      headers.indexOf(
        "ThoiGianBaoCao"
      )
  };

  Object.keys(idx).forEach(
    function(key) {
      if (idx[key] === -1) {
        throw new Error(
          "Sheet " +
          config.sheetName +
          " thiếu cột: " +
          key
        );
      }
    }
  );

  return idx;
}


/*
 * Chuyển một dòng sheet thành object.
 */
function mapWorkerSimplePlanRow_(
  row,
  idx,
  config
) {
  const actualRaw =
    row[idx.soLuongThucHien];

  return {
    STT:
      Number(
        row[idx.STT]
      ) || 0,

    maSanPham:
      normalizeText_(
        row[idx.maSanPham]
      ),

    tenSanPham:
      normalizeText_(
        row[idx.tenSanPham]
      ),

    soLuongKeHoach:
      Number(
        row[idx.soLuongKeHoach]
      ) || 0,

    thoiGianTao:
      formatDateTimeText_(
        row[idx.thoiGianTao]
      ),

    nguoiTao:
      normalizeText_(
        row[idx.nguoiTao]
      ),

    trangThai:
      normalizeText_(
        row[idx.trangThai]
      ) ||
      "Đã tạo",

    soLuongThucHien:
      actualRaw === "" ||
      actualRaw === null
        ? ""
        : Number(
            actualRaw
          ),

    ghiChu:
      normalizeText_(
        row[idx.ghiChu]
      ),

    nguoiBaoCao:
      normalizeText_(
        row[idx.nguoiBaoCao]
      ),

    ThoiGianBaoCao:
      formatDateTimeText_(
        row[idx.ThoiGianBaoCao]
      ),

    unit:
      config.unit
  };
}


/*
 * Lấy kế hoạch theo khoảng thời gian tạo.
 *
 * Bao gồm cả kế hoạch chưa báo cáo và đã báo cáo.
 */
function getWorkerSimplePlans_(
  config,
  filter
) {
  const dateFilter =
    normalizeWorkerSimplePlanFilter_(
      filter
    );

  const sheet =
    getSheet_(
      config.sheetName
    );

  if (sheet.getLastRow() < 2) {
    return [];
  }

  const values =
    sheet
      .getDataRange()
      .getValues();

  const headers =
    values[0].map(
      function(header) {
        return normalizeText_(
          header
        );
      }
    );

  const idx =
    getWorkerSimplePlanHeaderIndex_(
      headers,
      config
    );

  return values
    .slice(1)
    .filter(
      function(row) {
        const stt =
          Number(
            row[idx.STT]
          ) || 0;

        if (stt <= 0) {
          return false;
        }

        return isWorkerSimplePlanDateInRange_(
          row[idx.thoiGianTao],
          dateFilter.fromDate,
          dateFilter.toDate
        );
      }
    )
    .map(
      function(row) {
        return mapWorkerSimplePlanRow_(
          row,
          idx,
          config
        );
      }
    )
    .sort(
      function(a, b) {
        return (
          Number(b.STT) -
          Number(a.STT)
        );
      }
    );
}


/*
 * Lấy lịch sử đã báo cáo trong 2 ngày gần nhất:
 * hôm qua và hôm nay.
 */
function getWorkerSimplePlanHistory_(
  config
) {
  const sheet =
    getSheet_(
      config.sheetName
    );

  if (sheet.getLastRow() < 2) {
    return [];
  }

  const values =
    sheet
      .getDataRange()
      .getValues();

  const headers =
    values[0].map(
      function(header) {
        return normalizeText_(
          header
        );
      }
    );

  const idx =
    getWorkerSimplePlanHeaderIndex_(
      headers,
      config
    );

  const fromDate =
    yesterdayText_();

  const toDate =
    todayText_();

  return values
    .slice(1)
    .filter(
      function(row) {
        const nguoiBaoCao =
          normalizeText_(
            row[idx.nguoiBaoCao]
          );

        const thoiGianBaoCao =
          row[idx.ThoiGianBaoCao];

        /*
         * Chỉ hiện dòng đã được công nhân báo cáo.
         */
        if (
          !nguoiBaoCao ||
          !thoiGianBaoCao
        ) {
          return false;
        }

        return isWorkerSimplePlanDateInRange_(
          thoiGianBaoCao,
          fromDate,
          toDate
        );
      }
    )
    .map(
      function(row) {
        return mapWorkerSimplePlanRow_(
          row,
          idx,
          config
        );
      }
    )
    .sort(
      function(a, b) {
        return String(
          b.ThoiGianBaoCao || ""
        ).localeCompare(
          String(
            a.ThoiGianBaoCao || ""
          )
        );
      }
    );
}


/*
 * Hàm dùng chung để lưu báo cáo công nhân.
 */
function saveWorkerSimplePlanReport_(
  token,
  payload,
  config
) {
  const lock =
    LockService.getScriptLock();

  try {
    lock.waitLock(
      30000
    );

    const session =
      requireWorker_(
        token
      );

    const stt =
      Number(
        payload &&
        payload.STT
      );

    const quantityText =
      normalizeText_(
        payload &&
        payload.soLuongThucHien
      );

    const soLuongThucHien =
      Number(
        quantityText
      );

    const ghiChu =
      normalizeText_(
        payload &&
        payload.ghiChu
      );

    if (
      !Number.isInteger(stt) ||
      stt <= 0
    ) {
      throw new Error(
        "Kế hoạch được chọn không hợp lệ."
      );
    }

    /*
     * Cho phép nhập bằng 0,
     * nhưng không cho phép bỏ trống hoặc số âm.
     */
    if (
      quantityText === "" ||
      !Number.isInteger(
        soLuongThucHien
      ) ||
      soLuongThucHien < 0
    ) {
      throw new Error(
        config.quantityLabel +
        " phải là số nguyên từ 0 trở lên."
      );
    }

    const sheet =
      getSheet_(
        config.sheetName
      );

    if (sheet.getLastRow() < 2) {
      throw new Error(
        "Sheet " +
        config.sheetName +
        " chưa có kế hoạch."
      );
    }

    const values =
      sheet
        .getDataRange()
        .getValues();

    const headers =
      values[0].map(
        function(header) {
          return normalizeText_(
            header
          );
        }
      );

    const idx =
      getWorkerSimplePlanHeaderIndex_(
        headers,
        config
      );

    let rowNumber = -1;

    for (
      let i = 1;
      i < values.length;
      i++
    ) {
      if (
        Number(
          values[i][idx.STT]
        ) === stt
      ) {
        rowNumber =
          i + 1;

        break;
      }
    }

    if (rowNumber === -1) {
      throw new Error(
        "Không tìm thấy kế hoạch STT " +
        stt +
        "."
      );
    }

    /*
     * Chỉ cập nhật các cột báo cáo.
     */
    sheet
      .getRange(
        rowNumber,
        idx.soLuongThucHien + 1
      )
      .setValue(
        soLuongThucHien
      );

    sheet
      .getRange(
        rowNumber,
        idx.ghiChu + 1
      )
      .setValue(
        ghiChu
      );

    sheet
      .getRange(
        rowNumber,
        idx.nguoiBaoCao + 1
      )
      .setValue(
        session.useName || ""
      );

    sheet
      .getRange(
        rowNumber,
        idx.ThoiGianBaoCao + 1
      )
      .setValue(
        nowText_()
      );

    sheet
      .getRange(
        rowNumber,
        idx.trangThai + 1
      )
      .setValue(
        "Đã báo cáo"
      );

    return {
      success: true,

      message:
        "Đã lưu báo cáo " +
        config.planName +
        " thành công.",

      history:
        getWorkerSimplePlanHistory_(
          config
        )
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (error) {}
  }
}


/* =========================================================
   API ÉP MÀNG IN
   ========================================================= */

function getWorkerEpMangInData(
  token,
  filter
) {
  requireWorker_(
    token
  );

  const dateFilter =
    normalizeWorkerSimplePlanFilter_(
      filter
    );

  return {
    success: true,

    filter:
      dateFilter,

    plans:
      getWorkerSimplePlans_(
        getWorkerEpMangInConfig_(),
        dateFilter
      ),

    history:
      getWorkerSimplePlanHistory_(
        getWorkerEpMangInConfig_()
      )
  };
}


function saveWorkerEpMangInReport(
  token,
  payload
) {
  return saveWorkerSimplePlanReport_(
    token,
    payload,
    getWorkerEpMangInConfig_()
  );
}


/* =========================================================
   API ĐÓNG THÙNG
   ========================================================= */

function getWorkerDongThungData(
  token,
  filter
) {
  requireWorker_(
    token
  );

  const dateFilter =
    normalizeWorkerSimplePlanFilter_(
      filter
    );

  return {
    success: true,

    filter:
      dateFilter,

    plans:
      getWorkerSimplePlans_(
        getWorkerDongThungConfig_(),
        dateFilter
      ),

    history:
      getWorkerSimplePlanHistory_(
        getWorkerDongThungConfig_()
      )
  };
}


function saveWorkerDongThungReport(
  token,
  payload
) {
  return saveWorkerSimplePlanReport_(
    token,
    payload,
    getWorkerDongThungConfig_()
  );
}


function getApprovalDateKey_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      "Asia/Ho_Chi_Minh",
      "yyyy-MM-dd"
    );
  }

  const text = String(value || "").trim();
  if (!text) return "";

  // Dạng yyyy-MM-dd hoặc yyyy-MM-dd HH:mm:ss
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return match[1] + "-" + match[2] + "-" + match[3];
  }

  // Dạng dd/MM/yyyy hoặc dd/MM/yyyy HH:mm:ss
  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    return match[3] + "-" +
      match[2].padStart(2, "0") + "-" +
      match[1].padStart(2, "0");
  }

  return "";
}

function getApprovedExportRequestsByDate(token, selectedDate) {
  const session = requireWorker_(token);

  const date = validateDateText_(selectedDate);

  const items = getApprovedExportRequestsToday_(
    "",
    date
  );

  return {
    success: true,
    selectedDate: date,
    items: items
  };
}
