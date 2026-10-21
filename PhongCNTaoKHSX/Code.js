const SPREADSHEET_ID = "1yFlCpC6JzLRmv9hukNw05vYpeYmkhXRcPC-0nCNOjAQ";

const SHEET_ACCOUNT = "account";
const SHEET_BAI_TRON_LIEU = "BaiTronLieu";
const SHEET_NHOM_BAI_TRON = "NhomBaiTron";
const SHEET_NGUYEN_LIEU = "NguyenLieu";
const SHEET_KE_HOACH_SAN_XUAT = "KeHoachSanXuat";
const SHEET_DON_HANG_NHAP_KHO = "DonHangNhapKho";
const SHEET_KHO_NGUYEN_LIEU = "KhoNguyenLieu";

const SHEET_PHIEU_XUAT_NGUYEN_LIEU =
  "PhieuXuatNguyenLieu";

const SHEET_CHI_TIET_CAN_BATCH =
  "ChiTietCanBatch";

const SHEET_CHI_TIET_TRON_LIEU_SAN_XUAT = "chiTietTronLieuSanXuat";
const SHEET_CHI_TIET_LAP_VI = "chiTietLapVi";
const SHEET_CHI_TIET_SAN_XUAT_BAN_THANH_PHAM = "ChiTietSanXuatBanThanhPham";
const SHEET_THEM_NGUYEN_LIEU_TAI_CHE = "ThemNguyenLieuTaiChe";
const SHEET_DANH_SACH_SAN_PHAM_VTBC = "DanhSachSanPhamVTBC";
const SHEET_CHI_TIET_BTP_THEO_THUNG = "ChiTietBTPtheoThung";
const SHEET_KE_HOACH_LAP_VI_VTBC = "KeHoachLapViVTBC";
const SHEET_KET_QUA_LAP_VI = "KetQuaLapVi";
const SHEET_KE_HOACH_EP_MANG_IN =
  "KeHoachEpMangIn";

const SHEET_KE_HOACH_DONG_THUNG =
  "KeHoachDongThung";

const SESSION_PREFIX = "SESSION_";
const SESSION_TTL_SECONDS = 6 * 60 * 60;

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile("index")
    .setTitle("Quản lý sản xuất")
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

function lowerText_(value) {
  return normalizeText_(value).toLowerCase();
}

function generateToken_() {
  return Utilities.getUuid() + "_" + new Date().getTime();
}

function generateBatchId_() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `BTL${y}${m}${d}${h}${mi}${s}${random}`;
}

function generatePlanId_() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `KH${y}${m}${d}${h}${mi}${s}${random}`;
}

function nowText_() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd HH:mm:ss"
  );
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

function requireAdmin_(token) {
  const session = getSession_(token);

  if (!session) {
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  if (session.role !== "admin") {
    throw new Error("Không có quyền truy cập. Chỉ tài khoản admin được sử dụng chức năng này.");
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
      if (rowRole !== "admin") {
        return {
          success: false,
          noPermission: true,
          message: "Tài khoản này không có quyền truy cập trang quản lý."
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
  const session = requireAdmin_(token);

  return {
    success: true,
    user: session,
    nguyenLieu: getNguyenLieuList_(),
    nhomBaiTronList: getNhomBaiTronList_(),
    baiTronLieu: getMixBatches_(null),
    tenBaiLieuList: getTenBaiLieuList_(),
    keHoachSanXuat: getProductionPlans_(),
    donHangNhapCanPheDuyet: getInboundOrdersForApproval_(),

    // Kho nguyên liệu
    khoNguyenLieu: getKhoNguyenLieuList_(),

    // thêm mới
    meTronTaiChe: getMeTronForTaiChe_(null),
    lichSuTaiChe: getLichSuThemNguyenLieuTaiChe_(),

    sanPhamLapViVTBC:
      getDanhSachSanPhamVTBC_(),

    thungLapViVTBC:
      getDanhSachThungLapViVTBC_(),

    keHoachLapViVTBC:
      getKeHoachLapViVTBC_(),

    keHoachEpMangIn:
      getKeHoachEpMangIn_(),

    keHoachDongThung:
      getKeHoachDongThung_()
  };
}

function getNguyenLieuList_() {
  const sheet = getSheet_(SHEET_NGUYEN_LIEU);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return [];

  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idxMa = headers.indexOf("maNguyenLieu");
  const idxTen = headers.indexOf("tenNguyenLieu");

  const idxMaKeToan =
    findOptionalHeaderIndex_(
      headers,
      ["MaKeToan", "maKeToan"]
    );

  const idxNhaSanXuat =
    findOptionalHeaderIndex_(
      headers,
      ["nhaCungCap1"]
    );

  const idxNhaCungCap =
    findOptionalHeaderIndex_(
      headers,
      ["nhaCungCapCap"]
    );

  if (idxMa === -1 || idxTen === -1) {
    throw new Error(
      "Sheet NguyenLieu cần có cột: maNguyenLieu, tenNguyenLieu."
    );
  }

  return values
    .slice(1)
    .filter(function(row) {
      return (
        normalizeText_(row[idxMa]) ||
        normalizeText_(row[idxTen])
      );
    })
    .map(function(row) {
      return {
        maNguyenLieu:
          normalizeText_(row[idxMa]),

        tenNguyenLieu:
          normalizeText_(row[idxTen]),

        MaKeToan:
          idxMaKeToan === -1
            ? ""
            : normalizeText_(
                row[idxMaKeToan]
              ),

        nhaSanXuat:
          idxNhaSanXuat === -1
            ? ""
            : normalizeText_(
                row[idxNhaSanXuat]
              ),

        nhaCungCap:
          idxNhaCungCap === -1
            ? ""
            : normalizeText_(
                row[idxNhaCungCap]
              )
      };
    });
}

function getProductionPlanMaterials(
  token,
  tenBaiLieu
) {
  requireAdmin_(token);

  tenBaiLieu =
    normalizeText_(tenBaiLieu);

  if (!tenBaiLieu) {
    throw new Error(
      "Vui lòng chọn tên bài liệu."
    );
  }

  return {
    success: true,
    items:
      getProductionPlanMaterials_(
        tenBaiLieu
      )
  };
}


function getProductionPlanMaterials_(
  tenBaiLieu
) {
  /*
   * ================================
   * 1. ĐỌC BÀI TRỘN LIỆU
   * ================================
   */
  const baiSheet =
    getSheet_(
      SHEET_BAI_TRON_LIEU
    );

  if (baiSheet.getLastRow() < 2) {
    return [];
  }

  const baiValues =
    baiSheet
      .getDataRange()
      .getValues();

  const baiHeaders =
    baiValues[0].map(function(h) {
      return normalizeText_(h);
    });

  const idxTenBaiLieu =
    baiHeaders.indexOf(
      "tenBaiLieu"
    );

  const idxTenNguyenLieu =
    baiHeaders.indexOf(
      "tenNguyenLieu"
    );

  const idxMaNguyenLieu =
    baiHeaders.indexOf(
      "maNguyenLieu"
    );

  const idxSTT =
    baiHeaders.indexOf(
      "STT"
    );

  if (
    idxTenBaiLieu === -1 ||
    idxTenNguyenLieu === -1
  ) {
    throw new Error(
      "Sheet BaiTronLieu thiếu cột tenBaiLieu hoặc tenNguyenLieu."
    );
  }


  /*
   * ================================
   * 2. LẤY NGUYÊN LIỆU
   * CỦA BÀI TRỘN
   * ================================
   */
  const materialMap = {};

  baiValues
    .slice(1)
    .forEach(function(row) {

      const rowTenBaiLieu =
        normalizeText_(
          row[idxTenBaiLieu]
        );

      if (
        rowTenBaiLieu !==
        tenBaiLieu
      ) {
        return;
      }

      const tenNguyenLieu =
        normalizeText_(
          row[idxTenNguyenLieu]
        );

      if (!tenNguyenLieu) {
        return;
      }

      const key =
        tenNguyenLieu
          .toLowerCase();

      /*
       * Nếu cùng nguyên liệu xuất hiện
       * nhiều lần trong bài liệu thì
       * chỉ hiển thị 1 lần.
       */
      if (!materialMap[key]) {
        materialMap[key] = {
          STT:
            idxSTT === -1
              ? 0
              : Number(
                  row[idxSTT]
                ) || 0,

          maNguyenLieu:
            idxMaNguyenLieu === -1
              ? ""
              : normalizeText_(
                  row[
                    idxMaNguyenLieu
                  ]
                ),

          tenNguyenLieu:
            tenNguyenLieu,

          options: []
        };
      }
    });


  /*
   * ================================
   * 3. ĐỌC MASTER NGUYÊN LIỆU
   * ================================
   */
  const nguyenLieuSheet =
    getSheet_(
      SHEET_NGUYEN_LIEU
    );

  const nlValues =
    nguyenLieuSheet
      .getDataRange()
      .getValues();

  if (nlValues.length >= 2) {

    const nlHeaders =
      nlValues[0].map(
        function(h) {
          return normalizeText_(h);
        }
      );

    const idxNlTen =
      findOptionalHeaderIndex_(
        nlHeaders,
        ["tenNguyenLieu"]
      );

    const idxNlMa =
      findOptionalHeaderIndex_(
        nlHeaders,
        ["maNguyenLieu"]
      );

    const idxMaKeToan =
      findOptionalHeaderIndex_(
        nlHeaders,
        [
          "MaKeToan",
          "maKeToan"
        ]
      );

    const idxNhaSanXuat =
      findOptionalHeaderIndex_(
        nlHeaders,
        [
          "nhaCungCap1"
        ]
      );

    const idxNhaCungCap =
      findOptionalHeaderIndex_(
        nlHeaders,
        [
          "nhaCungCapCap"
        ]
      );
    if (idxNlTen !== -1) {

      nlValues
        .slice(1)
        .forEach(function(row) {

          const ten =
            normalizeText_(
              row[idxNlTen]
            );

          if (!ten) {
            return;
          }

          const key =
            ten.toLowerCase();

          if (!materialMap[key]) {
            return;
          }

          const MaKeToan =
            idxMaKeToan === -1
              ? ""
              : normalizeText_(
                  row[idxMaKeToan]
                );

          /*
           * Chỉ đưa vào lựa chọn
           * khi có mã kế toán.
           */
          if (!MaKeToan) {
            return;
          }

          materialMap[key]
            .options
            .push({
              maNguyenLieu:
                idxNlMa === -1
                  ? ""
                  : normalizeText_(
                      row[idxNlMa]
                    ),

              MaKeToan:
                MaKeToan,

              nhaSanXuat:
                idxNhaSanXuat === -1
                  ? ""
                  : normalizeText_(
                      row[
                        idxNhaSanXuat
                      ]
                    ),

              nhaCungCap:
                idxNhaCungCap === -1
                  ? ""
                  : normalizeText_(
                      row[
                        idxNhaCungCap
                      ]
                    )
            });
        });
    }
  }


  /*
   * ================================
   * 4. TRẢ KẾT QUẢ
   * ================================
   */
  return Object
    .keys(materialMap)
    .map(function(key) {
      return materialMap[key];
    })
    .sort(function(a, b) {
      return (
        Number(a.STT || 0) -
        Number(b.STT || 0)
      );
    });
}

function getNhomBaiTronList_() {
  const sheet = getSheet_(SHEET_NHOM_BAI_TRON);

  if (sheet.getLastRow() < 2) {
    return [];
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idxNhomBaiTron = headers.indexOf("nhomBaiTron");

  if (idxNhomBaiTron === -1) {
    throw new Error("Sheet NhomBaiTron cần có cột nhomBaiTron.");
  }

  const list = values
    .slice(1)
    .map(function(row) {
      return normalizeText_(row[idxNhomBaiTron]);
    })
    .filter(Boolean);

  return [...new Set(list)].sort(function(a, b) {
    return a.localeCompare(b, "vi");
  });
}

function createProductionPlan(
  token,
  payload
) {
  const session =
    requireAdmin_(token);

  const tenBaiLieu =
    normalizeText_(
      payload &&
      payload.tenBaiLieu
    );

  const soLuong =
    Number(
      payload &&
      payload.soLuong
    );

  const ngaySanXuat =
    normalizeText_(
      payload &&
      payload.ngaySanXuat
    );

  const khoiLuongMotMe =
    Number(
      payload &&
      payload.khoiLuongMotMe
    );

  const materials =
    payload &&
    Array.isArray(
      payload.materials
    )
      ? payload.materials
      : [];


  /*
   * ================================
   * VALIDATE THÔNG TIN CHUNG
   * ================================
   */

  if (!tenBaiLieu) {
    throw new Error(
      "Vui lòng chọn tên bài liệu."
    );
  }

  if (
    !isFinite(soLuong) ||
    soLuong <= 0
  ) {
    throw new Error(
      "Số mẻ phải là số lớn hơn 0."
    );
  }

  if (
    !isFinite(khoiLuongMotMe) ||
    khoiLuongMotMe <= 0
  ) {
    throw new Error(
      "Khối lượng 1 mẻ phải là số lớn hơn 0."
    );
  }

  if (!ngaySanXuat) {
    throw new Error(
      "Vui lòng chọn ngày sản xuất."
    );
  }

  const tenBaiLieuList =
    getTenBaiLieuList_();

  if (
    !tenBaiLieuList.includes(
      tenBaiLieu
    )
  ) {
    throw new Error(
      "Tên bài liệu không tồn tại trong danh sách bài cân."
    );
  }


  /*
   * ================================
   * LẤY NGUYÊN LIỆU GỐC
   * TỪ BÀI TRỘN
   * ================================
   */

  const baiMaterials =
    getProductionPlanMaterials_(
      tenBaiLieu
    );

  if (
    !baiMaterials ||
    baiMaterials.length === 0
  ) {
    throw new Error(
      "Bài liệu này chưa có nguyên liệu."
    );
  }


  /*
   * ================================
   * KIỂM TRA PCN ĐÃ CHỌN
   * MÃ KẾ TOÁN CHO TẤT CẢ NL
   * ================================
   */

  const selectedMap = {};

  materials.forEach(
    function(item) {

      const tenNguyenLieu =
        normalizeText_(
          item &&
          item.tenNguyenLieu
        );

      const MaKeToan =
        normalizeText_(
          item &&
          item.MaKeToan
        );

      if (tenNguyenLieu) {
        selectedMap[
          tenNguyenLieu
            .toLowerCase()
        ] = MaKeToan;
      }
    }
  );


  baiMaterials.forEach(
    function(item) {

      const key =
        normalizeText_(
          item.tenNguyenLieu
        ).toLowerCase();

      const MaKeToan =
        normalizeText_(
          selectedMap[key]
        );

      if (!MaKeToan) {
        throw new Error(
          "Chưa chọn mã kế toán cho nguyên liệu: " +
          item.tenNguyenLieu
        );
      }

      /*
       * Kiểm tra mã kế toán PCN gửi lên
       * thực sự thuộc danh sách cho phép.
       */
      const valid =
        (item.options || [])
          .some(function(option) {
            return (
              normalizeText_(
                option.MaKeToan
              ) === MaKeToan
            );
          });

      if (!valid) {
        throw new Error(
          "Mã kế toán " +
          MaKeToan +
          " không hợp lệ cho nguyên liệu " +
          item.tenNguyenLieu +
          "."
        );
      }
    }
  );


  /*
   * ================================
   * TẠO 1 ID CHUNG
   * ================================
   */

  const id =
    generatePlanId_();

  const nguoiTao =
    session.useName || "";

  const ngayTao =
    nowText_();


  /*
   * ================================
   * TẠO N DÒNG
   * ================================
   */

  const rows =
    baiMaterials.map(
      function(item) {

        const key =
          normalizeText_(
            item.tenNguyenLieu
          ).toLowerCase();

        return [
          id,
          tenBaiLieu,
          soLuong,
          ngaySanXuat,
          nguoiTao,
          ngayTao,
          khoiLuongMotMe,
          "Hoạt động",
          "",
          item.tenNguyenLieu,
          selectedMap[key]
        ];
      }
    );


  /*
   * ================================
   * GHI SHEET 1 LẦN
   * ================================
   */

  const sheet =
    getSheet_(
      SHEET_KE_HOACH_SAN_XUAT
    );

  ensureKeHoachHeader_(
    sheet
  );

  const phieuData = preparePhieuXuatTuKeHoach_(
    id,
    tenBaiLieu,
    soLuong,
    khoiLuongMotMe,
    ngaySanXuat,
    nguoiTao,
    ngayTao,
    selectedMap,
    baiMaterials
  );

  const phieuSheet = phieuData.sheet;

  // Kiểm tra tránh trùng kế hoạch trong phiếu xuất
  const phieuHeaders = phieuSheet
    .getRange(1, 1, 1, phieuSheet.getLastColumn())
    .getValues()[0]
    .map(h => normalizeText_(h));

  const idxKeHoachId =
    phieuHeaders.indexOf("KeHoachId");

  if (phieuSheet.getLastRow() >= 2) {
    const existingIds = phieuSheet
      .getRange(
        2,
        idxKeHoachId + 1,
        phieuSheet.getLastRow() - 1,
        1
      )
      .getDisplayValues()
      .flat();

    if (existingIds.some(x => normalizeText_(x) === id)) {
      throw new Error(
        "Kế hoạch " + id +
        " đã tồn tại trong PhieuXuatNguyenLieu."
      );
    }
  }

  const startRow = sheet.getLastRow() + 1;
  const phieuStartRow = phieuSheet.getLastRow() + 1;

  let planWritten = false;
  let phieuWritten = false;

  try {
    // Ghi kế hoạch sản xuất
    sheet
      .getRange(startRow, 1, rows.length, 11)
      .setValues(rows);

    planWritten = true;

    // Ghi phiếu xuất nguyên liệu
    phieuSheet
      .getRange(
        phieuStartRow,
        1,
        phieuData.rows.length,
        phieuData.width
      )
      .setValues(phieuData.rows);

    phieuWritten = true;

    SpreadsheetApp.flush();

  } catch (error) {
    const rollbackErrors = [];

    // Xóa vùng phiếu vừa ghi nếu xảy ra lỗi
    if (
      phieuSheet.getLastRow() >=
      phieuStartRow + phieuData.rows.length - 1
    ) {
      try {
        phieuSheet.deleteRows(
          phieuStartRow,
          phieuData.rows.length
        );
      } catch (e) {
        rollbackErrors.push("Phiếu xuất: " + e.message);
      }
    }

    // Xóa vùng kế hoạch vừa ghi
    if (
      sheet.getLastRow() >=
      startRow + rows.length - 1
    ) {
      try {
        sheet.deleteRows(startRow, rows.length);
      } catch (e) {
        rollbackErrors.push("Kế hoạch: " + e.message);
      }
    }

    throw new Error(
      "Không hoàn tất tạo kế hoạch và phiếu xuất: " +
      error.message +
      (rollbackErrors.length
        ? ". Cần kiểm tra dữ liệu vì hoàn tác lỗi: " +
          rollbackErrors.join("; ")
        : "")
    );
  }


  return {
    success: true,

    id: id,

    soDong:
      rows.length,

    message:
      "Đã tạo kế hoạch sản xuất thành công với " +
      rows.length +
      " nguyên liệu và " +
      phieuData.rows.length +
      " dòng phiếu xuất chờ phê duyệt.",

    keHoachSanXuat:
      getProductionPlans_()
  };
}

function preparePhieuXuatTuKeHoach_(
  keHoachId,
  tenBaiLieu,
  soMe,
  khoiLuongMotMe,
  ngaySanXuat,
  nguoiTao,
  ngayTao,
  selectedMap,
  baiMaterials
) {
  const phieuSheet = getSheet_(
    SHEET_PHIEU_XUAT_NGUYEN_LIEU
  );

  const baiSheet = getSheet_(
    SHEET_BAI_TRON_LIEU
  );

  if (phieuSheet.getLastRow() < 1) {
    throw new Error(
      "Sheet PhieuXuatNguyenLieu chưa có tiêu đề cột."
    );
  }

  const phieuHeaders = phieuSheet
    .getRange(1, 1, 1, phieuSheet.getLastColumn())
    .getValues()[0]
    .map(h => normalizeText_(h));

  const baiValues = baiSheet
    .getDataRange()
    .getValues();

  const baiHeaders = baiValues[0]
    .map(h => normalizeText_(h));

  const requiredPhieu = [
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
    "nguoiTao",
    "ngayTao",
    "trangThaiPheDuyet",
    "MaKeToan"
  ];

  requiredPhieu.forEach(function(header) {
    if (!phieuHeaders.includes(header)) {
      throw new Error(
        "PhieuXuatNguyenLieu thiếu cột: " + header
      );
    }
  });

  const requiredBai = [
    "tenBaiLieu",
    "STT",
    "maNguyenLieu",
    "tenNguyenLieu",
    "khoiLuong",
    "donVi",
    "sttTron",
    "canSuDung"
  ];

  requiredBai.forEach(function(header) {
    if (!baiHeaders.includes(header)) {
      throw new Error(
        "BaiTronLieu thiếu cột: " + header
      );
    }
  });

  const getBai = function(row, name) {
    return row[baiHeaders.indexOf(name)];
  };

  const phieuRows = [];
  const validMap = {};

  // Tạo một mã phiếu xuất chung cho toàn bộ nguyên liệu
  const phieuXuatId = "PXNL" +
    Utilities.formatDate(
      new Date(),
      "Asia/Ho_Chi_Minh",
      "yyyyMMddHHmmssSSS"
    );

  baiMaterials.forEach(function(item) {
    const key = normalizeText_(
      item.tenNguyenLieu
    ).toLowerCase();

    const maKeToan = normalizeText_(
      selectedMap[key]
    );

    const option = (item.options || [])
      .find(function(opt) {
        return normalizeText_(opt.MaKeToan) === maKeToan;
      });

    if (!option) {
      throw new Error(
        "Không tìm thấy mã kế toán hợp lệ của " +
        item.tenNguyenLieu
      );
    }

    validMap[key] = option;
  });

  baiValues.slice(1).forEach(function(baiRow) {
    if (
      normalizeText_(getBai(baiRow, "tenBaiLieu")) !==
      tenBaiLieu
    ) {
      return;
    }

    const tenNL = normalizeText_(
      getBai(baiRow, "tenNguyenLieu")
    );

    const key = tenNL.toLowerCase();
    const option = validMap[key];

    if (!option) {
      throw new Error(
        "Chưa xác định mã kế toán cho " + tenNL
      );
    }

    const dinhMuc = Number(
      getBai(baiRow, "khoiLuong")
    );

    const donVi = normalizeText_(
      getBai(baiRow, "donVi")
    ).toLowerCase();

    if (!isFinite(dinhMuc) || dinhMuc <= 0) {
      throw new Error(
        "Định mức không hợp lệ: " + tenNL
      );
    }

    let kgMotMe;

    if (donVi === "kg") {
      kgMotMe = dinhMuc;
    } else if (donVi === "g") {
      kgMotMe = dinhMuc / 1000;
    } else if (donVi === "%") {
      kgMotMe = khoiLuongMotMe * dinhMuc / 100;
    } else {
      throw new Error(
        "Đơn vị định mức không hỗ trợ: " + donVi
      );
    }

    const khoiLuongCanXuat = Math.round(
      kgMotMe * soMe * 1000000
    ) / 1000000;

    const values = {
      PhieuXuatId: phieuXuatId,
      KeHoachId: keHoachId,
      tenBaiLieu: tenBaiLieu,
      soLuong: soMe,
      NgaySanXuat: ngaySanXuat,

      STT: getBai(baiRow, "STT"),
      maNguyenLieu:
        normalizeText_(option.maNguyenLieu) ||
        normalizeText_(getBai(baiRow, "maNguyenLieu")),

      tenNguyenLieu: tenNL,
      khoiLuongCanXuat: khoiLuongCanXuat,
      donViCanXuat: "kg",

      sttTron: getBai(baiRow, "sttTron"),
      canSuDung: getBai(baiRow, "canSuDung"),

      nguoiTao: nguoiTao,
      ngayTao: ngayTao,

      trangThaiPheDuyet: "Chờ phê duyệt",
      cachXuat: "Tự động theo kế hoạch",
      MaKeToan: normalizeText_(selectedMap[key])
    };

    phieuRows.push(
      phieuHeaders.map(function(header) {
        return Object.prototype.hasOwnProperty.call(
          values, header
        ) ? values[header] : "";
      })
    );
  });

  if (phieuRows.length === 0) {
    throw new Error(
      "Không có định mức nguyên liệu để tạo phiếu xuất."
    );
  }

  return {
    sheet: phieuSheet,
    rows: phieuRows,
    width: phieuHeaders.length
  };
}

function ensureKeHoachHeader_(sheet) {
  const expectedHeaders = [
    "Id",
    "tenBaiLieu",
    "soLuong",
    "NgaySanXuat",
    "nguoiTao",
    "ngayTao",
    "khoiLuongMotMe",
    "trangThai",
    "daHoanKhoKhiHuy",
    "tenNguyenLieu",
    "MaKeToan"
  ];

  if (sheet.getLastRow() === 0) {
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

  const maxColumns =
    Math.max(
      sheet.getLastColumn(),
      expectedHeaders.length
    );

  const currentHeaders =
    sheet
      .getRange(
        1,
        1,
        1,
        maxColumns
      )
      .getValues()[0]
      .map(function(h) {
        return normalizeText_(h);
      });

  const isEmptyHeader =
    currentHeaders.every(
      function(h) {
        return !h;
      }
    );

  if (isEmptyHeader) {
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

  expectedHeaders.forEach(
    function(header, index) {

      const currentValue =
        normalizeText_(
          sheet
            .getRange(
              1,
              index + 1
            )
            .getValue()
        );

      if (
        currentValue !== header
      ) {
        sheet
          .getRange(
            1,
            index + 1
          )
          .setValue(header);
      }
    }
  );
}

function getKeHoachHeaderIndex_(headers) {
  const idx = {
    Id:
      headers.indexOf("Id"),

    tenBaiLieu:
      headers.indexOf(
        "tenBaiLieu"
      ),

    soLuong:
      headers.indexOf(
        "soLuong"
      ),

    NgaySanXuat:
      headers.indexOf(
        "NgaySanXuat"
      ),

    nguoiTao:
      headers.indexOf(
        "nguoiTao"
      ),

    ngayTao:
      headers.indexOf(
        "ngayTao"
      ),

    khoiLuongMotMe:
      headers.indexOf(
        "khoiLuongMotMe"
      ),

    trangThai:
      headers.indexOf(
        "trangThai"
      ),

    daHoanKhoKhiHuy:
      headers.indexOf(
        "daHoanKhoKhiHuy"
      ),

    tenNguyenLieu:
      headers.indexOf(
        "tenNguyenLieu"
      ),

    MaKeToan:
      headers.indexOf(
        "MaKeToan"
      )
  };

  Object
    .keys(idx)
    .forEach(function(key) {

      /*
       * Cho phép dữ liệu cũ chưa có
       * một số cột mở rộng.
       */
      if (
        key ===
          "khoiLuongMotMe" ||
        key ===
          "trangThai" ||
        key ===
          "daHoanKhoKhiHuy" ||
        key ===
          "tenNguyenLieu" ||
        key ===
          "MaKeToan"
      ) {
        return;
      }

      if (idx[key] === -1) {
        throw new Error(
          "Sheet KeHoachSanXuat thiếu cột: " +
          key
        );
      }
    });

  return idx;
}

function getDefaultProductionPlanFilter_() {
  const today =
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );

  return {
    /*
     * Hôm nay + 6 ngày trước = 7 ngày.
     */
    fromDate:
      addDaysText_(
        today,
        -6
      ),

    toDate:
      today
  };
}

function normalizeProductionPlanFilter_(
  filter
) {
  const defaultFilter =
    getDefaultProductionPlanFilter_();

  const fromDate =
    normalizeText_(
      filter &&
      filter.fromDate
    ) ||
    defaultFilter.fromDate;

  const toDate =
    normalizeText_(
      filter &&
      filter.toDate
    ) ||
    defaultFilter.toDate;

  if (
    fromDate &&
    toDate &&
    fromDate > toDate
  ) {
    throw new Error(
      "Từ ngày không được lớn hơn Đến ngày."
    );
  }

  return {
    fromDate:
      fromDate,

    toDate:
      toDate
  };
}

function getProductionPlans(
  token,
  filter
) {
  requireAdmin_(
    token
  );

  const dateFilter =
    normalizeProductionPlanFilter_(
      filter
    );

  return {
    success: true,

    filter:
      dateFilter,

    keHoachSanXuat:
      getProductionPlans_(
        dateFilter
      )
  };
}

function updateProductionPlanStatus(
  token,
  payload
) {
  /*
   * Kiểm tra quyền admin.
   */
  requireAdmin_(
    token
  );

  /*
   * ================================
   * 1. ĐỌC DỮ LIỆU TỪ FRONTEND
   * ================================
   */
  const id =
    normalizeText_(
      payload &&
      payload.id
    );

  const trangThai =
    normalizeText_(
      payload &&
      payload.trangThai
    );

  const validStatuses = [
    "Hoạt động",
    "Hủy kế hoạch"
  ];

  if (!id) {
    throw new Error(
      "Thiếu Id kế hoạch sản xuất."
    );
  }

  if (
    !validStatuses.includes(
      trangThai
    )
  ) {
    throw new Error(
      "Trạng thái kế hoạch không hợp lệ."
    );
  }

  /*
   * ================================
   * 2. KHÓA SCRIPT
   * ================================
   *
   * Tránh trường hợp 2 người
   * cùng hủy một kế hoạch
   * và cộng kho 2 lần.
   */
  const lock =
    LockService.getScriptLock();

  try {
    lock.waitLock(
      30000
    );

    /*
     * ================================
     * 3. ĐỌC SHEET KẾ HOẠCH
     * ================================
     */
    const sheet =
      getSheet_(
        SHEET_KE_HOACH_SAN_XUAT
      );

    ensureKeHoachHeader_(
      sheet
    );

    if (
      sheet.getLastRow() < 2
    ) {
      throw new Error(
        "Chưa có dữ liệu kế hoạch sản xuất."
      );
    }

    const values =
      sheet
        .getDataRange()
        .getValues();

    const headers =
      values[0].map(
        function(h) {
          return normalizeText_(
            h
          );
        }
      );

    const idx =
      getKeHoachHeaderIndex_(
        headers
      );

    if (
      idx.trangThai === -1
    ) {
      throw new Error(
        "Sheet KeHoachSanXuat thiếu cột trangThai."
      );
    }

    /*
     * ================================
     * 4. TÌM KẾ HOẠCH
     * ================================
     */
    let rowNumber =
      -1;

    let currentStatus =
      "";

    let daHoanKhoKhiHuy =
      "";

    for (
      let i = 1;
      i < values.length;
      i++
    ) {
      const rowId =
        normalizeText_(
          values[i][
            idx.Id
          ]
        );

      if (
        rowId !== id
      ) {
        continue;
      }

      /*
       * Dòng thực tế trên Google Sheet.
       */
      rowNumber =
        i + 1;

      /*
       * Trạng thái hiện tại.
       */
      currentStatus =
        idx.trangThai !== -1
          ? (
              normalizeText_(
                values[i][
                  idx.trangThai
                ]
              ) ||
              "Hoạt động"
            )
          : "Hoạt động";

      /*
       * Đọc cờ chống hoàn kho lần 2.
       */
      daHoanKhoKhiHuy =
        idx.daHoanKhoKhiHuy !== -1
          ? normalizeText_(
              values[i][
                idx.daHoanKhoKhiHuy
              ]
            )
          : "";

      break;
    }

    if (
      rowNumber === -1
    ) {
      throw new Error(
        "Không tìm thấy kế hoạch sản xuất: " +
        id
      );
    }

    /*
     * ================================
     * 5. NẾU TRẠNG THÁI KHÔNG ĐỔI
     * ================================
     */
    if (
      currentStatus ===
      trangThai
    ) {
      return {
        success:
          true,

        message:
          "Kế hoạch " +
          id +
          " đã ở trạng thái " +
          trangThai +
          ".",

        keHoachSanXuat:
          getProductionPlans_()
      };
    }

    /*
     * ================================
     * 6. KHÔNG CHO KÍCH HOẠT LẠI
     * KẾ HOẠCH ĐÃ HỦY
     * ================================
     *
     * Vì nếu kế hoạch đã hoàn nguyên liệu
     * về kho mà lại chuyển về Hoạt động,
     * dữ liệu kho sẽ không còn đúng với
     * nghiệp vụ của kế hoạch.
     *
     * Nếu cần sản xuất lại thì tạo KH mới.
     */
    /*
    * Một kế hoạch đã ở trạng thái Hủy kế hoạch
    * thì tuyệt đối không cho kích hoạt lại.
    *
    * Quy tắc:
    * Hủy rồi = kết thúc kế hoạch.
    * Muốn sản xuất lại thì tạo kế hoạch mới.
    */
    if (
      trangThai === "Hoạt động" &&
      currentStatus === "Hủy kế hoạch"
    ) {
      throw new Error(
        "Kế hoạch " +
        id +
        " đã bị hủy trước đó." +
        "\nKhông thể chuyển lại về Hoạt động." +
        "\nNếu cần sản xuất lại, hãy tạo kế hoạch mới."
      );
    }

    /*
     * ================================
     * 7. CHỐNG HOÀN KHO LẦN 2
     * ================================
     */
    if (
      trangThai ===
        "Hủy kế hoạch" &&
      daHoanKhoKhiHuy ===
        "Đã hoàn kho"
    ) {
      throw new Error(
        "Kế hoạch " +
        id +
        " đã hoàn nguyên liệu về kho trước đó." +
        "\nKhông được hoàn kho lần thứ hai."
      );
    }

    /*
     * Nếu lần hủy trước xác định rằng
     * kế hoạch chưa xuất kho,
     * cũng không cần xử lý hủy lại.
     */
    if (
      trangThai ===
        "Hủy kế hoạch" &&
      daHoanKhoKhiHuy ===
        "Không cần hoàn kho"
    ) {
      throw new Error(
        "Kế hoạch " +
        id +
        " đã được hủy trước đó và không có nguyên liệu cần hoàn kho."
      );
    }

    /*
     * ================================
     * 8. HOÀN KHO
     * ================================
     */
    let hoanKhoResult =
      null;

    if (
      currentStatus !==
        "Hủy kế hoạch" &&
      trangThai ===
        "Hủy kế hoạch"
    ) {
      /*
       * Hàm này sẽ tự xử lý:
       *
       * Ưu tiên 1:
       * ChiTietCanBatch
       * → khoiLuongThucTe
       * → IdTuKhoDenBatch
       *
       * Nếu không có:
       *
       * Ưu tiên 2:
       * PhieuXuatNguyenLieu
       * → Đã phê duyệt
       * → IdKhoDaTru
       * → lượng đã xuất
       *
       * Nếu cả hai không có:
       * → chưa xuất kho
       * → không cộng gì.
       */
      hoanKhoResult =
        hoanKhoKhiHuyKeHoach_(
          id
        );
    }

    /*
    * ================================
    * 9 + 10. GHI TRẠNG THÁI HỦY
    * VÀ CỜ HOÀN KHO CÙNG LÚC
    * ================================
    */
    if (
      trangThai === "Hủy kế hoạch" &&
      hoanKhoResult
    ) {
      const hoanKhoStatus =
        hoanKhoResult.daHoanKho
          ? "Đã hoàn kho"
          : "Không cần hoàn kho";

      daHoanKhoKhiHuy =
        hoanKhoStatus;

      /*
      * trangThai và daHoanKhoKhiHuy
      * đang là hai cột liền nhau.
      */
      sheet
        .getRange(
          rowNumber,
          idx.trangThai + 1,
          1,
          2
        )
        .setValues([
          [
            "Hủy kế hoạch",
            hoanKhoStatus
          ]
        ]);
    } else {
      /*
      * Các trường hợp đổi trạng thái thông thường.
      */
      sheet
        .getRange(
          rowNumber,
          idx.trangThai + 1
        )
        .setValue(
          trangThai
        );
    }

    /*
     * ================================
     * 11. TẠO THÔNG BÁO KẾT QUẢ
     * ================================
     */
    let message =
      "Đã cập nhật trạng thái kế hoạch " +
      id +
      " thành: " +
      trangThai +
      ".";

    if (
      trangThai ===
        "Hủy kế hoạch" &&
      hoanKhoResult
    ) {
      /*
       * Đã có dữ liệu cân.
       */
      if (
        hoanKhoResult.nguon ===
          "ChiTietCanBatch"
      ) {
        message +=
          " Đã hoàn kho " +
          hoanKhoResult.tongDongHoan +
          " dòng theo dữ liệu cân thực tế.";

        if (
          Number(
            hoanKhoResult
              .tongDongBoQua
          ) > 0
        ) {
          message +=
            " Có " +
            hoanKhoResult
              .tongDongBoQua +
            " dòng không có khối lượng thực tế nên không hoàn.";
        }
      }

      /*
       * Đã xuất kho nhưng chưa cân.
       */
      else if (
        hoanKhoResult.nguon ===
          "PhieuXuatNguyenLieu"
      ) {
        message +=
          " Đã hoàn kho " +
          hoanKhoResult.tongDongHoan +
          " dòng theo phiếu xuất nguyên liệu đã phê duyệt.";
      }

      /*
       * Chưa xuất nguyên liệu.
       */
      else if (
        hoanKhoResult.nguon ===
          "ChuaXuatKho"
      ) {
        message +=
          " Kế hoạch chưa xuất nguyên liệu nên không cần hoàn kho.";
      }
    }

    /*
     * ================================
     * 12. TRẢ KẾT QUẢ VỀ FRONTEND
     * ================================
     */
    return {
      success:
        true,

      message:
        message,

      hoanKho:
        hoanKhoResult,

      daHoanKhoKhiHuy:
        daHoanKhoKhiHuy,

      keHoachSanXuat:
        getProductionPlans_()
    };
  }
  finally {
    /*
     * Luôn giải phóng lock,
     * kể cả khi xảy ra lỗi.
     */
    try {
      lock.releaseLock();
    }
    catch (e) {
      // Không cần xử lý.
    }
  }
}

function getProductionPlans_(
  filter
) {
  const sheet =
    getSheet_(
      SHEET_KE_HOACH_SAN_XUAT
    );

  ensureKeHoachHeader_(
    sheet
  );

  if (
    sheet.getLastRow() < 2
  ) {
    return [];
  }

  const dateFilter =
    normalizeProductionPlanFilter_(
      filter
    );

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
    getKeHoachHeaderIndex_(
      headers
    );

  return values
    .slice(1)

    /*
     * Bỏ dòng không có Id.
     */
    .filter(
      function(row) {
        return normalizeText_(
          row[idx.Id]
        );
      }
    )

    /*
     * Lọc theo NGÀY SẢN XUẤT.
     *
     * Không lọc theo ngày tạo.
     */
    .filter(
      function(row) {
        return isDateInRange_(
          row[idx.NgaySanXuat],
          dateFilter.fromDate,
          dateFilter.toDate
        );
      }
    )

    .map(
      function(row) {
        return {
          id:
            normalizeText_(
              row[idx.Id]
            ),

          tenBaiLieu:
            normalizeText_(
              row[idx.tenBaiLieu]
            ),

          soLuong:
            row[idx.soLuong],

          khoiLuongMotMe:
            idx.khoiLuongMotMe === -1
              ? ""
              : row[
                  idx.khoiLuongMotMe
                ],

          ngaySanXuat:
            formatDateValue_(
              row[idx.NgaySanXuat]
            ),

          nguoiTao:
            normalizeText_(
              row[idx.nguoiTao]
            ),

          ngayTao:
            formatDateTimeValue_(
              row[idx.ngayTao]
            ),

          trangThai:
            idx.trangThai === -1
              ? "Hoạt động"
              : (
                  normalizeText_(
                    row[idx.trangThai]
                  ) ||
                  "Hoạt động"
                )
        };
      }
    )

    /*
     * Ngày sản xuất mới nhất lên trên.
     * Nếu cùng ngày thì Id mới nhất lên trên.
     */
    .sort(
      function(a, b) {
        const dateCompare =
          String(
            b.ngaySanXuat || ""
          ).localeCompare(
            String(
              a.ngaySanXuat || ""
            )
          );

        if (
          dateCompare !== 0
        ) {
          return dateCompare;
        }

        return String(
          b.id || ""
        ).localeCompare(
          String(
            a.id || ""
          )
        );
      }
    );
}

function formatDateValue_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  return normalizeText_(value);
}

function formatDateTimeValue_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  }

  return normalizeText_(value);
}

function addDaysText_(dateText, days) {
  const d = new Date(dateText);
  d.setDate(d.getDate() + days);

  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function getDefaultInboundApprovalDateFilter_() {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");

  return {
    fromDate: addDaysText_(today, -1),
    toDate: today
  };
}

function isDateInRange_(value, fromDate, toDate) {
  if (!value) return false;

  let dateText = "";

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    dateText = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  } else {
    dateText = normalizeText_(value).substring(0, 10);
  }

  if (!dateText) return false;

  if (fromDate && dateText < fromDate) return false;
  if (toDate && dateText > toDate) return false;

  return true;
}

function normalizeInboundApprovalFilter_(filter) {
  const defaultFilter = getDefaultInboundApprovalDateFilter_();

  const fromDate = normalizeText_(filter && filter.fromDate) || defaultFilter.fromDate;
  const toDate = normalizeText_(filter && filter.toDate) || defaultFilter.toDate;

  return {
    fromDate: fromDate,
    toDate: toDate
  };
}

function createMixBatch(token, payload) {
  requireAdmin_(token);

  const tenBaiLieu = normalizeText_(payload && payload.tenBaiLieu);
  const nhomBaiTron = normalizeText_(payload && payload.nhomBaiTron);
  const items = payload && Array.isArray(payload.items) ? payload.items : [];

  if (!tenBaiLieu) throw new Error("Vui lòng nhập tên bài liệu.");

  if (!nhomBaiTron) {
    throw new Error("Vui lòng chọn nhóm bài trộn.");
  }

  const nhomBaiTronList = getNhomBaiTronList_();

  if (!nhomBaiTronList.includes(nhomBaiTron)) {
    throw new Error("Nhóm bài trộn không tồn tại trong sheet NhomBaiTron.");
  }
 
  if (items.length === 0) throw new Error("Vui lòng thêm ít nhất 1 nguyên liệu.");

  const validCan = ["Cân bàn", "Cân 6kg","Cân phân tích"];
  const validDonVi = ["g", "kg", "%"];
  const id = generateBatchId_();

  const rows = items.map((item, index) => {
    const maNguyenLieu = normalizeText_(item.maNguyenLieu);
    const tenNguyenLieu = normalizeText_(item.tenNguyenLieu);
    const khoiLuong = Number(item.khoiLuong);
    const donVi = normalizeText_(item.donVi);
    const sttTron = Number(item.sttTron);
    const canSuDung = normalizeText_(item.canSuDung);
    const loaiNguyenLieu = normalizeText_(item.loaiNguyenLieu) || "Thường";

    if (!maNguyenLieu || !tenNguyenLieu) {
      throw new Error("Dòng " + (index + 1) + ": Thiếu mã hoặc tên nguyên liệu.");
    }

    if (!isFinite(khoiLuong) || khoiLuong <= 0) {
      throw new Error("Dòng " + (index + 1) + ": Giá trị định lượng phải là số lớn hơn 0.");
    }

    if (donVi === "%" && khoiLuong > 100) {
      throw new Error("Dòng " + (index + 1) + ": Tỷ lệ % không được lớn hơn 100.");
    }

    if (!validDonVi.includes(donVi)) {
      throw new Error("Dòng " + (index + 1) + ": Đơn vị không hợp lệ.");
    }

    if (!Number.isInteger(sttTron) || sttTron <= 0) {
      throw new Error("Dòng " + (index + 1) + ": STT trộn phải là số nguyên lớn hơn 0.");
    }

    if (!validCan.includes(canSuDung)) {
      throw new Error("Dòng " + (index + 1) + ": Cân sử dụng không hợp lệ.");
    }

    if (!["Thường", "Màu Mùi"].includes(loaiNguyenLieu)) {
      throw new Error("Dòng " + (index + 1) + ": Loại nguyên liệu không hợp lệ.");
    }

    return [
      id,
      tenBaiLieu,
      index + 1,
      maNguyenLieu,
      tenNguyenLieu,
      khoiLuong,
      donVi,
      sttTron,
      canSuDung,
      loaiNguyenLieu,
      nhomBaiTron
    ];
  });

  const sheet = getSheet_(SHEET_BAI_TRON_LIEU);
  ensureBaiTronLieuHeader_(sheet);

  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, 11).setValues(rows);

  return {
    success: true,
    id: id,
    message: "Đã tạo bài trộn liệu thành công.",
    baiTronLieu: getMixBatches_(null),
    tenBaiLieuList: getTenBaiLieuList_()
  };
}

function ensureBaiTronLieuHeader_(sheet) {
  const expectedHeaders = [
    "Id",
    "tenBaiLieu",
    "STT",
    "maNguyenLieu",
    "tenNguyenLieu",
    "khoiLuong",
    "donVi",
    "sttTron",
    "canSuDung",
    "loaiNguyenLieu",
    "nhomBaiTron"
  ];

  if (sheet.getLastRow() === 0) {
    sheet
      .getRange(1, 1, 1, expectedHeaders.length)
      .setValues([expectedHeaders]);

    return;
  }

  const maxColumns = Math.max(
    sheet.getLastColumn(),
    expectedHeaders.length
  );

  const currentHeaders = sheet
    .getRange(1, 1, 1, maxColumns)
    .getValues()[0]
    .map(function(h) {
      return normalizeText_(h);
    });

  const isEmptyHeader = currentHeaders.every(function(h) {
    return !h;
  });

  if (isEmptyHeader) {
    sheet
      .getRange(1, 1, 1, expectedHeaders.length)
      .setValues([expectedHeaders]);

    return;
  }

  expectedHeaders.forEach(function(header, index) {
    const currentValue = normalizeText_(
      sheet.getRange(1, index + 1).getValue()
    );

    if (currentValue !== header) {
      sheet.getRange(1, index + 1).setValue(header);
    }
  });
}

function getMixBatches(token, keyword) {
  requireAdmin_(token);

  return {
    success: true,
    baiTronLieu: getMixBatches_(keyword),
    tenBaiLieuList: getTenBaiLieuList_()
  };
}

function getTenBaiLieuList_() {
  const sheet = getSheet_(SHEET_BAI_TRON_LIEU);

  if (sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));
  const idxTenBaiLieu = headers.indexOf("tenBaiLieu");

  if (idxTenBaiLieu === -1) return [];

  const names = values
    .slice(1)
    .map(row => normalizeText_(row[idxTenBaiLieu]))
    .filter(Boolean);

  return [...new Set(names)].sort();
}

function getMixBatches_(keyword) {
  const sheet = getSheet_(SHEET_BAI_TRON_LIEU);

  if (sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));

  const idxId = headers.indexOf("Id");
  const idxTenBaiLieu = headers.indexOf("tenBaiLieu");
  const idxSTT = headers.indexOf("STT");
  const idxMa = headers.indexOf("maNguyenLieu");
  const idxTenNguyenLieu = headers.indexOf("tenNguyenLieu");
  const idxKhoiLuong = headers.indexOf("khoiLuong");
  const idxDonVi = headers.indexOf("donVi");
  const idxSttTron = headers.indexOf("sttTron");
  const idxCan = headers.indexOf("canSuDung");
  const idxLoaiNguyenLieu = headers.indexOf("loaiNguyenLieu");
  const idxNhomBaiTron = headers.indexOf("nhomBaiTron");

  if (
    idxId === -1 ||
    idxTenBaiLieu === -1 ||
    idxSTT === -1 ||
    idxMa === -1 ||
    idxTenNguyenLieu === -1 ||
    idxKhoiLuong === -1 ||
    idxDonVi === -1 ||
    idxSttTron === -1 ||
    idxCan === -1 ||
    idxLoaiNguyenLieu === -1 ||
    idxNhomBaiTron === -1
  ) {
    throw new Error(
      "Sheet BaiTronLieu cần có đủ cột: Id, tenBaiLieu, STT, maNguyenLieu, tenNguyenLieu, khoiLuong, donVi, sttTron, canSuDung, loaiNguyenLieu, nhomBaiTron."
    );
  }

  const filter = normalizeText_(keyword).toLowerCase();
  const map = {};

  values.slice(1).forEach(row => {
    const id = normalizeText_(row[idxId]);
    const tenBaiLieu = normalizeText_(row[idxTenBaiLieu]);

    if (!id) return;
    if (filter && tenBaiLieu.toLowerCase() !== filter) return;

    if (!map[id]) {
      map[id] = {
        id: id,
        tenBaiLieu: tenBaiLieu,
        nhomBaiTron: normalizeText_(row[idxNhomBaiTron]),
        tongNguyenLieu: 0,
        tongKhoiLuongText: "",
        loaiNguyenLieu: "",
        items: []
      };
    }

    const khoiLuong = Number(row[idxKhoiLuong]) || 0;
    const donVi = normalizeText_(row[idxDonVi]);

    map[id].items.push({
      STT: row[idxSTT],
      maNguyenLieu: row[idxMa],
      tenNguyenLieu: row[idxTenNguyenLieu],
      loaiNguyenLieu: normalizeText_(row[idxLoaiNguyenLieu]) || "Thường",
      khoiLuong: khoiLuong,
      donVi: donVi,
      sttTron: row[idxSttTron],
      canSuDung: row[idxCan]
    });

    map[id].tongNguyenLieu += 1;
  });

  Object.keys(map).forEach(id => {
    const batch = map[id];

    const totalByUnit = {
      g: 0,
      kg: 0,
      "%": 0
    };

    batch.items.forEach(item => {
      if (item.donVi === "g") totalByUnit.g += Number(item.khoiLuong) || 0;
      if (item.donVi === "kg") totalByUnit.kg += Number(item.khoiLuong) || 0;
      if (item.donVi === "%") totalByUnit["%"] += Number(item.khoiLuong) || 0;
    });

    const parts = [];

    if (totalByUnit.g > 0) parts.push(formatNumberServer_(totalByUnit.g) + " g");
    if (totalByUnit.kg > 0) parts.push(formatNumberServer_(totalByUnit.kg) + " kg");
    if (totalByUnit["%"] > 0) parts.push(formatNumberServer_(totalByUnit["%"]) + " %");

    batch.tongKhoiLuongText = parts.length ? parts.join(" + ") : "0";
  });

  return Object
    .keys(map)
    .map(id => map[id])
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

function formatNumberServer_(value) {
  const num = Number(value);
  if (!isFinite(num)) return value;
  return Math.round(num * 1000) / 1000;
}

function deleteMixBatch(token, id) {
  requireAdmin_(token);

  id = normalizeText_(id);

  if (!id) throw new Error("Thiếu Id bài trộn liệu cần xóa.");

  const sheet = getSheet_(SHEET_BAI_TRON_LIEU);

  if (sheet.getLastRow() < 2) {
    return {
      success: true,
      message: "Không có dữ liệu để xóa.",
      baiTronLieu: [],
      tenBaiLieuList: []
    };
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));
  const idxId = headers.indexOf("Id");

  if (idxId === -1) throw new Error("Sheet BaiTronLieu thiếu cột Id.");

  for (let r = values.length - 1; r >= 1; r--) {
    if (normalizeText_(values[r][idxId]) === id) {
      sheet.deleteRow(r + 1);
    }
  }

  return {
    success: true,
    message: "Đã xóa bài trộn liệu: " + id,
    baiTronLieu: getMixBatches_(null),
    tenBaiLieuList: getTenBaiLieuList_()
  };
}

/* =========================
   ĐƠN HÀNG NHẬP KHO CẦN PHÊ DUYỆT
   DonHangNhapKho: DonHangId IdKho ... trangThaiPheDuyet
   KhoNguyenLieu: Id ... trangThai nguoiPheDuyetChatLuong ngayPheDuyet
   ========================= */

function getInboundOrdersForApproval(token, filter) {
  requireAdmin_(token);

  const dateFilter = normalizeInboundApprovalFilter_(filter);

  return {
    success: true,
    filter: dateFilter,
    donHangNhapCanPheDuyet: getInboundOrdersForApproval_(dateFilter)
  };
}

function getInboundOrdersForApproval_(filter) {
  const sheet = getSheet_(SHEET_DON_HANG_NHAP_KHO);

  const dateFilter = normalizeInboundApprovalFilter_(filter);

  if (sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));
  const idx = getDonHangNhapHeaderIndex_(headers);

  const map = {};

  values.slice(1).forEach(function(row, index) {
    const rowNumber = index + 2;
    const donHangId = normalizeText_(row[idx.DonHangId]);
    const idKho = normalizeText_(row[idx.IdKho]);
    const maNguyenLieu = normalizeText_(row[idx.maNguyenLieu]);
    const tenNguyenLieu = normalizeText_(row[idx.tenNguyenLieu]);
    const trangThaiPheDuyet = normalizeText_(row[idx.trangThaiPheDuyet]) || "Chờ phê duyệt";

    if (!donHangId && !idKho && !maNguyenLieu && !tenNguyenLieu) return;

    // Lọc theo ngày tạo đơn
    if (!isDateInRange_(row[idx.ngayTaoDon], dateFilter.fromDate, dateFilter.toDate)) {
      return;
    }

    const key = donHangId || "DON_HANG_KHONG_ID";

    if (!map[key]) {
      map[key] = {
        donHangId: key,
        tongDong: 0,
        choPheDuyet: 0,
        daPheDuyet: 0,
        daHuy: 0,
        items: []
      };
    }

    const item = {
      rowNumber: rowNumber,
      DonHangId: donHangId,
      IdKho: idKho,
      maNguyenLieu: maNguyenLieu,
      tenNguyenLieu: tenNguyenLieu,
      khoiLuongNhap: row[idx.khoiLuongNhap],
      donVi: normalizeText_(row[idx.donVi]),
      quyCachDongGoi: normalizeText_(row[idx.quyCachDongGoi]),
      LotNo: normalizeText_(row[idx.LotNo]),
      ngaySanXuat: formatDateValue_(row[idx.ngaySanXuat]),
      hanSuDung: formatDateValue_(row[idx.hanSuDung]),
      nhaCungCap: normalizeText_(row[idx.nhaCungCap]),
      ngayNhap: formatDateValue_(row[idx.ngayNhap]),
      ngayTaoDon: formatDateTimeValue_(row[idx.ngayTaoDon]),
      nguoiTao: normalizeText_(row[idx.nguoiTao]),
      trangThai: trangThaiPheDuyet,
      trangThaiPheDuyet: trangThaiPheDuyet
    };

    map[key].items.push(item);
    map[key].tongDong += 1;

    const statusLower = lowerText_(trangThaiPheDuyet);

    if (statusLower === "đã phê duyệt") {
      map[key].daPheDuyet += 1;
    } else if (statusLower === "đã hủy" || statusLower === "đã huỷ") {
      map[key].daHuy += 1;
    } else {
      map[key].choPheDuyet += 1;
    }
  });

  return Object.keys(map)
    .map(function(key) {
      return map[key];
    })
    .sort(function(a, b) {
      return String(b.donHangId).localeCompare(String(a.donHangId));
    });
}


function updateInboundOrderItemStatus(token, payload) {
  const session = requireAdmin_(token);

  const rowNumber = Number(payload && payload.rowNumber);
  const action = normalizeText_(payload && payload.action);
  const anhChatLuong = normalizeText_(payload && payload.anhChatLuong);

  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    throw new Error("Thiếu dòng đơn hàng nhập kho cần cập nhật.");
  }

  if (action !== "approve" && action !== "cancel") {
    throw new Error("Trạng thái cập nhật không hợp lệ.");
  }

  if (action === "approve" && !anhChatLuong) {
    throw new Error("Phê duyệt bắt buộc phải nhập link ảnh chất lượng.");
  }

  const newStatus = action === "approve" ? "Đã phê duyệt" : "Đã hủy";

  const donHangSheet = getSheet_(SHEET_DON_HANG_NHAP_KHO);

  if (rowNumber > donHangSheet.getLastRow()) {
    throw new Error("Dòng đơn hàng không tồn tại.");
  }

  const donHangValues = donHangSheet.getDataRange().getValues();
  const donHangHeaders = donHangValues[0].map(h => normalizeText_(h));
  const donHangIdx = getDonHangNhapHeaderIndex_(donHangHeaders);

  const row = donHangSheet
    .getRange(rowNumber, 1, 1, donHangSheet.getLastColumn())
    .getValues()[0];

  const currentStatus = lowerText_(row[donHangIdx.trangThaiPheDuyet]);

  if (currentStatus !== "chờ phê duyệt" && currentStatus !== "") {
    throw new Error("Dòng này đã được xử lý, không thể cập nhật lại.");
  }

  const item = {
    IdKho: normalizeText_(row[donHangIdx.IdKho]),
    maNguyenLieu: normalizeText_(row[donHangIdx.maNguyenLieu]),
    tenNguyenLieu: normalizeText_(row[donHangIdx.tenNguyenLieu]),
    khoiLuongNhap: row[donHangIdx.khoiLuongNhap],
    donVi: normalizeText_(row[donHangIdx.donVi]),
    quyCachDongGoi: normalizeText_(row[donHangIdx.quyCachDongGoi]),
    LotNo: normalizeText_(row[donHangIdx.LotNo]),
    ngaySanXuat: formatDateValue_(row[donHangIdx.ngaySanXuat]),
    hanSuDung: formatDateValue_(row[donHangIdx.hanSuDung]),
    nhaCungCap: normalizeText_(row[donHangIdx.nhaCungCap]),
    ngayNhap: formatDateValue_(row[donHangIdx.ngayNhap])
  };

  // DonHangNhapKho chỉ cập nhật trạng thái, không thêm/không ghi cột ảnh.
  donHangSheet
    .getRange(rowNumber, donHangIdx.trangThaiPheDuyet + 1)
    .setValue(newStatus);

  // Link ảnh chất lượng chỉ ghi sang KhoNguyenLieu.anhChatLuong.
  const khoResult = updateKhoNguyenLieuStatusByItem_(
    item,
    newStatus,
    session.useName || "",
    anhChatLuong
  );

  return {
    success: true,
    message: "Đã cập nhật trạng thái thành " + newStatus + ".",
    khoMatched: khoResult.matched,
    khoUpdatedRow: khoResult.rowNumber,
    donHangNhapCanPheDuyet: getInboundOrdersForApproval_(payload && payload.filter)
  };
}

function getDonHangNhapHeaderIndex_(headers) {
  return {
    DonHangId: findRequiredHeaderIndex_(headers, ["DonHangId"]),
    IdKho: findRequiredHeaderIndex_(headers, ["IdKho"]),
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
    ngayTaoDon: findRequiredHeaderIndex_(headers, ["ngayTaoDon"]),
    nguoiTao: findRequiredHeaderIndex_(headers, ["nguoiTao"]),
    trangThaiPheDuyet: findRequiredHeaderIndex_(headers, ["trangThaiPheDuyet"])
  };
}

function getKhoNguyenLieuHeaderIndex_(headers) {
  return {
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
    anhChatLuong: findOptionalHeaderIndex_(headers, ["anhChatLuong"]),
    trangThaiNguyenLieu: findOptionalHeaderIndex_(headers, ["trangThaiNguyenLieu"])
  };
}

function updateKhoNguyenLieuStatusByItem_(item, newStatus, approver, anhChatLuong) {
  const sheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);

  // Tự thêm cột nếu sheet chưa có
  ensureColumns_(sheet, ["anhChatLuong", "trangThaiNguyenLieu"]);

  if (sheet.getLastRow() < 2) {
    return {
      matched: false,
      rowNumber: null
    };
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => normalizeText_(h));
  const idx = getKhoNguyenLieuHeaderIndex_(headers);

  let matchedRowNumber = null;

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    if (isSameKhoItem_(row, idx, item)) {
      matchedRowNumber = i + 1;
      break;
    }
  }

  if (!matchedRowNumber) {
    return {
      matched: false,
      rowNumber: null
    };
  }

  sheet.getRange(matchedRowNumber, idx.trangThai + 1).setValue(newStatus);
  sheet.getRange(matchedRowNumber, idx.nguoiPheDuyetChatLuong + 1).setValue(approver || "");
  sheet.getRange(matchedRowNumber, idx.ngayPheDuyet + 1).setValue(nowText_());

  if (newStatus === "Đã phê duyệt") {
    sheet.getRange(matchedRowNumber, idx.anhChatLuong + 1).setValue(anhChatLuong || "");

    // Khi phê duyệt nhập kho thì mặc định nguyên liệu được phép sử dụng
    if (idx.trangThaiNguyenLieu !== -1) {
      sheet.getRange(matchedRowNumber, idx.trangThaiNguyenLieu + 1).setValue("Sử dụng");
    }
  }

  return {
    matched: true,
    rowNumber: matchedRowNumber
  };
}

function getKhoNguyenLieuList(token) {
  requireAdmin_(token);

  return {
    success: true,
    khoNguyenLieu: getKhoNguyenLieuList_()
  };
}

function getKhoNguyenLieuList_() {
  const sheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);

  ensureColumns_(sheet, ["trangThaiNguyenLieu"]);

  if (sheet.getLastRow() < 2) {
    return [];
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idx = getKhoNguyenLieuHeaderIndex_(headers);

  return values.slice(1).map(function(row, index) {
    return {
      rowNumber: index + 2,
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
      trangThaiNguyenLieu: idx.trangThaiNguyenLieu === -1
        ? ""
        : normalizeText_(row[idx.trangThaiNguyenLieu]),
      nguoiPheDuyetChatLuong: normalizeText_(row[idx.nguoiPheDuyetChatLuong]),
      ngayPheDuyet: formatDateTimeValue_(row[idx.ngayPheDuyet]),
      anhChatLuong: idx.anhChatLuong === -1
        ? ""
        : normalizeText_(row[idx.anhChatLuong])
    };
  }).filter(function(item) {
    return item.Id || item.maNguyenLieu || item.tenNguyenLieu;
  }).sort(function(a, b) {
    return String(b.ngayNhap || b.rowNumber).localeCompare(String(a.ngayNhap || a.rowNumber));
  });
}

function updateKhoNguyenLieuTrangThai(token, payload) {
  requireAdmin_(token);

  const rowNumber = Number(payload && payload.rowNumber);
  const trangThaiNguyenLieu = normalizeText_(payload && payload.trangThaiNguyenLieu);

  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    throw new Error("Thiếu dòng KhoNguyenLieu cần cập nhật.");
  }

  if (trangThaiNguyenLieu !== "Sử dụng" && trangThaiNguyenLieu !== "Không sử dụng") {
    throw new Error("Trạng thái nguyên liệu không hợp lệ.");
  }

  const sheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);

  ensureColumns_(sheet, ["trangThaiNguyenLieu"]);

  if (rowNumber > sheet.getLastRow()) {
    throw new Error("Dòng KhoNguyenLieu không tồn tại.");
  }

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function(h) {
      return normalizeText_(h);
    });

  const idxTrangThaiNguyenLieu = findRequiredHeaderIndex_(headers, ["trangThaiNguyenLieu"]);

  sheet
    .getRange(rowNumber, idxTrangThaiNguyenLieu + 1)
    .setValue(trangThaiNguyenLieu);

  return {
    success: true,
    message: "Đã cập nhật trạng thái nguyên liệu: " + trangThaiNguyenLieu,
    khoNguyenLieu: getKhoNguyenLieuList_()
  };
}

function isSameKhoItem_(row, idx, item) {
  const sameId = normalizeText_(row[idx.Id]) === normalizeText_(item.IdKho);
  const sameMa = normalizeText_(row[idx.maNguyenLieu]) === normalizeText_(item.maNguyenLieu);
  const sameTen = normalizeText_(row[idx.tenNguyenLieu]) === normalizeText_(item.tenNguyenLieu);
  const sameKhoiLuong = isSameNumber_(row[idx.khoiLuongNhap], item.khoiLuongNhap);
  const sameDonVi = normalizeText_(row[idx.donVi]) === normalizeText_(item.donVi);
  const sameQuyCach = normalizeText_(row[idx.quyCachDongGoi]) === normalizeText_(item.quyCachDongGoi);
  const sameLot = normalizeText_(row[idx.LotNo]) === normalizeText_(item.LotNo);
  const sameNgaySX = formatDateValue_(row[idx.ngaySanXuat]) === formatDateValue_(item.ngaySanXuat);
  const sameHSD = formatDateValue_(row[idx.hanSuDung]) === formatDateValue_(item.hanSuDung);
  const sameNCC = normalizeText_(row[idx.nhaCungCap]) === normalizeText_(item.nhaCungCap);
  const sameNgayNhap = formatDateValue_(row[idx.ngayNhap]) === formatDateValue_(item.ngayNhap);

  return sameId &&
    sameMa &&
    sameTen &&
    sameKhoiLuong &&
    sameDonVi &&
    sameQuyCach &&
    sameLot &&
    sameNgaySX &&
    sameHSD &&
    sameNCC &&
    sameNgayNhap;
}

function isSameNumber_(a, b) {
  const numA = Number(a);
  const numB = Number(b);

  if (!isFinite(numA) || !isFinite(numB)) {
    return normalizeText_(a) === normalizeText_(b);
  }

  return Math.abs(numA - numB) < 0.000001;
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

function ensureColumns_(sheet, columnNames) {
  let lastColumn = sheet.getLastColumn();

  if (lastColumn < 1) {
    sheet.getRange(1, 1, 1, columnNames.length).setValues([columnNames]);
    return;
  }

  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(function(h) {
      return normalizeText_(h);
    });

  columnNames.forEach(function(name) {
    const exists = headers.some(function(h) {
      return h.toLowerCase() === name.toLowerCase();
    });

    if (!exists) {
      lastColumn++;
      sheet.getRange(1, lastColumn).setValue(name);
      headers.push(name);
    }
  });
}

function getTruyXuatTronLieu(token, filter) {
  requireAdmin_(token);

  const data = getTruyXuatTronLieu_(filter);

  return {
    success: true,
    headers: data.headers,
    rows: data.rows
  };
}

function getTruyXuatTronLieu_(filter) {
  filter = filter || {};

  const ngaySanXuatFilter = normalizeText_(filter.ngaySanXuat);
  const tenBaiLieuFilter = normalizeText_(filter.tenBaiLieu).toLowerCase();

  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(SHEET_CHI_TIET_TRON_LIEU_SAN_XUAT);

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      headers: [],
      rows: []
    };
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return {
      headers: [],
      rows: []
    };
  }

  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idxNgaySanXuat = findOptionalHeaderIndex_(headers, ["NgaySanXuat", "ngaySanXuat"]);
  const idxTenBaiLieu = findOptionalHeaderIndex_(headers, ["tenBaiLieu", "Tên sản phẩm", "tenSanPham"]);

  if (idxTenBaiLieu === -1) {
    throw new Error("Sheet chiTietTronLieuSanXuat thiếu cột tenBaiLieu.");
  }

  if (idxNgaySanXuat === -1 && ngaySanXuatFilter) {
    throw new Error("Sheet chiTietTronLieuSanXuat thiếu cột NgaySanXuat/ngaySanXuat để lọc theo ngày.");
  }

  const rows = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];

    const tenBaiLieu = normalizeText_(row[idxTenBaiLieu]);
    const ngaySanXuat = idxNgaySanXuat === -1 ? "" : formatDateValue_(row[idxNgaySanXuat]);

    if (tenBaiLieuFilter && tenBaiLieu.toLowerCase() !== tenBaiLieuFilter) {
      continue;
    }

    if (ngaySanXuatFilter && ngaySanXuat !== ngaySanXuatFilter) {
      continue;
    }

    const obj = {};

    headers.forEach(function(header, c) {
      if (!header) return;

      obj[header] = formatTraceCellValue_(row[c]);
    });

    rows.push(obj);
  }

  return {
    headers: headers.filter(Boolean),
    rows: rows
  };
}

function formatTraceCellValue_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  }

  return value === null || value === undefined ? "" : value;
}

/* =========================================================
   TRUY XUẤT THÀNH PHẨM TỪ NỘI DUNG IN DATE
   Input ví dụ:
   NSX 050626 DM
   09 080820

   Logic:
   - NSX 050626 => 05/06/2026
   - 080820 => 08 ngày sau NSX, 08:20
   - Ghép ra mã prefix: TP202606130820
   - Tra chiTietLapVi.maThanPham startsWith prefix
   - Lấy maBanThanhPham1..4
   - Tra ChiTietSanXuatBanThanhPham.IdBanThanhPham
   ========================================================= */

function getTruyXuatThanhPham(token, payload) {
  requireAdmin_(token);

  const noiDungInDate = normalizeText_(payload && payload.noiDungInDate);
  const mode = normalizeText_(payload && payload.mode) || "quick";

  if (!noiDungInDate) {
    throw new Error("Vui lòng nhập nội dung in date để truy xuất.");
  }

  const parseResult = parseNoiDungInDateToMaThanhPhamPrefix_(noiDungInDate);

  console.log("TRACE TP - maThanhPhamPrefix:", parseResult.maThanhPhamPrefix);

  const data = getTruyXuatThanhPham_(parseResult.maThanhPhamPrefix);

  console.log("TRACE TP - matched TP:", data.maThanhPhamMatched.length);
  console.log("TRACE TP - btpIds:", data.btpIds.length);
  console.log("TRACE TP - rows:", data.rows.length);

  return {
    success: true,
    mode: mode,
    noiDungInDate: noiDungInDate,
    nsxText: parseResult.nsxText,
    compactCode: parseResult.compactCode,
    maThanhPhamPrefix: parseResult.maThanhPhamPrefix,
    maThanhPhamMatched: data.maThanhPhamMatched,
    btpIds: data.btpIds,
    lapViRows: data.lapViRows,
    headers: data.headers,
    rows: data.rows
  };
}

function parseNoiDungInDateToMaThanhPhamPrefix_(noiDungInDate) {
  const text = String(noiDungInDate || "").trim();

  const nsxMatch = text.match(/NSX\s+(\d{6})\s+DM/i);

  if (!nsxMatch) {
    throw new Error("Không đọc được dòng NSX. Định dạng đúng ví dụ: NSX 050626 DM");
  }

  const nsxText = nsxMatch[1]; // 050626

  const day = Number(nsxText.substring(0, 2));
  const month = Number(nsxText.substring(2, 4));
  const year = 2000 + Number(nsxText.substring(4, 6));

  const nsxDate = new Date(year, month - 1, day, 0, 0, 0);

  if (isNaN(nsxDate.getTime())) {
    throw new Error("Ngày NSX không hợp lệ: " + nsxText);
  }

  // Tìm các cụm 6 số.
  // Ví dụ:
  // NSX 050626 DM
  // 09 080820
  // => ["050626", "080820"]
  const compactMatches = text.match(/\b\d{6}\b/g);

  if (!compactMatches || compactMatches.length < 2) {
    throw new Error("Không đọc được mã rút gọn dòng 2. Định dạng đúng ví dụ: 09 080820");
  }

  const compactCode = compactMatches[compactMatches.length - 1]; // 080820

  const offsetDays = Number(compactCode.substring(0, 2)); // 08
  const hh = Number(compactCode.substring(2, 4));         // 08
  const mm = Number(compactCode.substring(4, 6));         // 20

  if (!isFinite(offsetDays) || !isFinite(hh) || !isFinite(mm)) {
    throw new Error("Mã rút gọn không hợp lệ: " + compactCode);
  }

  const tpDate = new Date(
    nsxDate.getFullYear(),
    nsxDate.getMonth(),
    nsxDate.getDate() + offsetDays,
    hh,
    mm,
    0
  );

  if (isNaN(tpDate.getTime())) {
    throw new Error("Không ghép được ngày giờ thành phẩm từ nội dung in date.");
  }

  const yyyy = tpDate.getFullYear();
  const MM = String(tpDate.getMonth() + 1).padStart(2, "0");
  const dd = String(tpDate.getDate()).padStart(2, "0");
  const HH = String(tpDate.getHours()).padStart(2, "0");
  const MI = String(tpDate.getMinutes()).padStart(2, "0");

  // Chỉ tra đến phút: TP202606130820
  const maThanhPhamPrefix = "TP" + yyyy + MM + dd + HH + MI;

  return {
    nsxText: nsxText,
    compactCode: compactCode,
    maThanhPhamPrefix: maThanhPhamPrefix
  };
}

function getTruyXuatThanhPham_(maThanhPhamPrefix) {
  const lapViResult = findLapViRowsByMaThanhPhamPrefix_(maThanhPhamPrefix);

  const lapViRows = lapViResult.rows || [];

  if (lapViRows.length === 0) {
    return {
      maThanhPhamMatched: [],
      btpIds: [],
      lapViRows: [],
      headers: [],
      rows: []
    };
  }

  const maThanhPhamMatched = [];
  const btpIds = [];

  lapViRows.forEach(function(row) {
    const maTP = normalizeText_(getObjectValueIgnoreCaseForTraceThanhPham_(row, "maThanPham"));

    if (maTP && maThanhPhamMatched.indexOf(maTP) === -1) {
      maThanhPhamMatched.push(maTP);
    }

    [
      "maBanThanhPham1",
      "maBanThanhPham2",
      "maBanThanhPham3",
      "maBanThanhPham4"
    ].forEach(function(col) {
      const id = normalizeText_(getObjectValueIgnoreCaseForTraceThanhPham_(row, col));

      if (id && btpIds.indexOf(id) === -1) {
        btpIds.push(id);
      }
    });
  });

  if (btpIds.length === 0) {
    return {
      maThanhPhamMatched: maThanhPhamMatched,
      btpIds: [],
      lapViRows: lapViRows,
      headers: [],
      rows: []
    };
  }

  const btpResult = findBanThanhPhamRowsByIds_(btpIds);

  return {
    maThanhPhamMatched: maThanhPhamMatched,
    btpIds: btpIds,
    lapViRows: lapViRows,
    headers: orderTruyXuatThanhPhamHeaders_(btpResult.headers || []),
    rows: btpResult.rows || []
  };
}

function findLapViRowsByMaThanhPhamPrefix_(maThanhPhamPrefix) {
  const sheet = getSheet_(SHEET_CHI_TIET_LAP_VI);

  if (sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) {
    return {
      headers: [],
      rows: []
    };
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return {
      headers: [],
      rows: []
    };
  }

  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idxMaThanhPham = findOptionalHeaderIndex_(headers, ["maThanPham", "maThanhPham"]);

  if (idxMaThanhPham === -1) {
    throw new Error("Sheet chiTietLapVi thiếu cột maThanPham.");
  }

  const rows = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const maThanPham = normalizeText_(row[idxMaThanhPham]);

    if (!maThanPham) {
      continue;
    }

    if (maThanPham.indexOf(maThanhPhamPrefix) !== 0) {
      continue;
    }

    const obj = {};

    headers.forEach(function(header, c) {
      if (!header) return;
      obj[header] = formatTraceCellValue_(row[c]);
    });

    rows.push(obj);
  }

  return {
    headers: headers.filter(Boolean),
    rows: rows
  };
}

function findBanThanhPhamRowsByIds_(btpIds) {
  const sheet = getSheet_(SHEET_CHI_TIET_SAN_XUAT_BAN_THANH_PHAM);

  if (sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) {
    return {
      headers: [],
      rows: []
    };
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return {
      headers: [],
      rows: []
    };
  }

  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idxIdBanThanhPham = findOptionalHeaderIndex_(headers, ["IdBanThanhPham", "idBanThanhPham"]);

  if (idxIdBanThanhPham === -1) {
    throw new Error("Sheet ChiTietSanXuatBanThanhPham thiếu cột IdBanThanhPham.");
  }

  const idSet = {};
  btpIds.forEach(function(id) {
    idSet[normalizeText_(id)] = true;
  });

  const rows = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const idBtp = normalizeText_(row[idxIdBanThanhPham]);

    if (!idBtp || !idSet[idBtp]) {
      continue;
    }

    const obj = {};

    headers.forEach(function(header, c) {
      if (!header) return;
      obj[header] = formatTraceCellValue_(row[c]);
    });

    rows.push(obj);
  }

  rows.sort(function(a, b) {
    const idA = normalizeText_(getObjectValueIgnoreCaseForTraceThanhPham_(a, "IdBanThanhPham"));
    const idB = normalizeText_(getObjectValueIgnoreCaseForTraceThanhPham_(b, "IdBanThanhPham"));

    const timeA = normalizeText_(getObjectValueIgnoreCaseForTraceThanhPham_(a, "thoiGianXacNhanTron"));
    const timeB = normalizeText_(getObjectValueIgnoreCaseForTraceThanhPham_(b, "thoiGianXacNhanTron"));

    return idA.localeCompare(idB) || timeA.localeCompare(timeB);
  });

  return {
    headers: headers.filter(Boolean),
    rows: rows
  };
}

function readSheetAllObjectsForTraceThanhPham_(sheetName) {
  const sheet = getSheet_(sheetName);

  if (sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) {
    return {
      headers: [],
      rows: []
    };
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return {
      headers: [],
      rows: []
    };
  }

  const rawHeaders = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const headers = rawHeaders.filter(Boolean);
  const rows = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const obj = {};
    let hasData = false;

    rawHeaders.forEach(function(header, c) {
      if (!header) return;

      const value = formatTraceCellValue_(row[c]);

      obj[header] = value;

      if (normalizeText_(value)) {
        hasData = true;
      }
    });

    if (hasData) {
      rows.push(obj);
    }
  }

  return {
    headers: headers,
    rows: rows
  };
}

function getObjectValueIgnoreCaseForTraceThanhPham_(obj, key) {
  if (!obj || !key) return "";

  if (obj[key] !== undefined && obj[key] !== null) {
    return obj[key];
  }

  const lowerKey = String(key).toLowerCase();

  const foundKey = Object.keys(obj).find(function(k) {
    return String(k || "").toLowerCase() === lowerKey;
  });

  if (!foundKey) return "";

  return obj[foundKey];
}

function orderTruyXuatThanhPhamHeaders_(headers) {
  headers = headers || [];

  const priority = [
    "IdBanThanhPham",
    "IdMeTron",
    "tenBaiLieu",
    "thoiGianXacNhanTron",
    "tenNguyenLieu",
    "maNguyenLieu",
    "LotNo",
    "KhoiLuong",
    "khoiLuongThucTe",
    "saiSo",
    "soLuongVien",
    "thoiGianHoanThanh"
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

/* =========================================================
   THÊM NGUYÊN LIỆU TÁI CHẾ
   Sheet: ThemNguyenLieuTaiChe
   Header:
   IdMeTron | thoiGianXacNhanTron | tenBaiLieu | tenBaiLieuTaiChe |
   khoiLuongTaiChe | donVi | thoiGianThem | nguoiThem
   ========================================================= */

function getThemNguyenLieuTaiCheHeaders_() {
  return [
    "IdMeTron",
    "thoiGianXacNhanTron",
    "tenBaiLieu",
    "tenBaiLieuTaiChe",
    "khoiLuongTaiChe",
    "donVi",
    "thoiGianThem",
    "nguoiThem"
  ];
}

function ensureThemNguyenLieuTaiCheHeader_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(SHEET_THEM_NGUYEN_LIEU_TAI_CHE);

  const headers = getThemNguyenLieuTaiCheHeaders_();

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_THEM_NGUYEN_LIEU_TAI_CHE);
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
    .map(function(h) {
      return normalizeText_(h);
    });

  headers.forEach(function(header, index) {
    if (currentHeaders[index] !== header) {
      sheet.getRange(1, index + 1).setValue(header);
    }
  });

  return sheet;
}

function getMeTronForTaiChe(token, filter) {
  requireAdmin_(token);

  return {
    success: true,
    meTronTaiChe: getMeTronForTaiChe_(filter),
    lichSuTaiChe: getLichSuThemNguyenLieuTaiChe_()
  };
}

function getMeTronForTaiChe_(filter) {
  filter = filter || {};

  const ngayFilter = normalizeText_(filter.ngay);
  const sheet = getSheet_(SHEET_CHI_TIET_TRON_LIEU_SAN_XUAT);

  if (sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idxIdMeTron = findOptionalHeaderIndex_(headers, ["IdMeTron"]);
  const idxThoiGian = findOptionalHeaderIndex_(headers, ["thoiGianXacNhanTron"]);
  const idxTenBaiLieu = findOptionalHeaderIndex_(headers, ["tenBaiLieu"]);

  if (idxIdMeTron === -1 || idxThoiGian === -1 || idxTenBaiLieu === -1) {
    throw new Error("Sheet chiTietTronLieuSanXuat cần có đủ cột: IdMeTron, thoiGianXacNhanTron, tenBaiLieu.");
  }

  const map = {};

  for (let r = 1; r < values.length; r++) {
    const row = values[r];

    const idMeTron = normalizeText_(row[idxIdMeTron]);
    const tenBaiLieu = normalizeText_(row[idxTenBaiLieu]);
    const thoiGianText = formatDateTimeValue_(row[idxThoiGian]);

    if (!idMeTron || !thoiGianText || !tenBaiLieu) continue;

    const ngayText = thoiGianText.substring(0, 10);

    if (ngayFilter && ngayText !== ngayFilter) continue;

    const key = idMeTron;

    if (!map[key]) {
      map[key] = {
        IdMeTron: idMeTron,
        thoiGianXacNhanTron: thoiGianText,
        tenBaiLieu: tenBaiLieu,
        ngay: ngayText
      };
    } else {
      // Nếu cùng IdMeTron có nhiều dòng nguyên liệu, lấy thời gian mới nhất.
      if (String(thoiGianText) > String(map[key].thoiGianXacNhanTron)) {
        map[key].thoiGianXacNhanTron = thoiGianText;
        map[key].tenBaiLieu = tenBaiLieu;
        map[key].ngay = ngayText;
      }
    }
  }

  return Object.keys(map)
    .map(function(key) {
      return map[key];
    })
    .sort(function(a, b) {
      return String(b.thoiGianXacNhanTron).localeCompare(String(a.thoiGianXacNhanTron));
    });
}

function saveThemNguyenLieuTaiChe(token, payload) {
  const session = requireAdmin_(token);

  const IdMeTron = normalizeText_(payload && payload.IdMeTron);
  const thoiGianXacNhanTron = normalizeText_(payload && payload.thoiGianXacNhanTron);
  const tenBaiLieu = normalizeText_(payload && payload.tenBaiLieu);
  const tenBaiLieuTaiChe = normalizeText_(payload && payload.tenBaiLieuTaiChe);
  const khoiLuongTaiChe = Number(payload && payload.khoiLuongTaiChe);
  const donVi = normalizeText_(payload && payload.donVi);

  if (!IdMeTron) {
    throw new Error("Thiếu mã mẻ trộn.");
  }

  if (!thoiGianXacNhanTron) {
    throw new Error("Thiếu thời gian xác nhận trộn.");
  }

  if (!tenBaiLieu) {
    throw new Error("Thiếu tên bài liệu của mẻ trộn.");
  }

  if (!tenBaiLieuTaiChe) {
    throw new Error("Vui lòng chọn bài liệu tái chế.");
  }

  if (!isFinite(khoiLuongTaiChe) || khoiLuongTaiChe <= 0) {
    throw new Error("Khối lượng tái chế phải là số lớn hơn 0.");
  }

  if (!["g", "kg"].includes(donVi)) {
    throw new Error("Đơn vị không hợp lệ. Chỉ được chọn g hoặc kg.");
  }

  const tenBaiLieuList = getTenBaiLieuList_();

  if (!tenBaiLieuList.includes(tenBaiLieuTaiChe)) {
    throw new Error("Tên bài liệu tái chế không tồn tại trong sheet BaiTronLieu.");
  }

  const sheet = ensureThemNguyenLieuTaiCheHeader_();

  sheet.appendRow([
    IdMeTron,
    thoiGianXacNhanTron,
    tenBaiLieu,
    tenBaiLieuTaiChe,
    khoiLuongTaiChe,
    donVi,
    nowText_(),
    session.useName || ""
  ]);

  return {
    success: true,
    message: "Đã lưu nguyên liệu tái chế cho mẻ trộn " + IdMeTron + ".",
    lichSuTaiChe: getLichSuThemNguyenLieuTaiChe_()
  };
}

function getLichSuThemNguyenLieuTaiChe_() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(SHEET_THEM_NGUYEN_LIEU_TAI_CHE);

  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idxIdMeTron = findOptionalHeaderIndex_(headers, ["IdMeTron"]);
  const idxThoiGianXacNhanTron = findOptionalHeaderIndex_(headers, ["thoiGianXacNhanTron"]);
  const idxTenBaiLieu = findOptionalHeaderIndex_(headers, ["tenBaiLieu"]);
  const idxTenBaiLieuTaiChe = findOptionalHeaderIndex_(headers, ["tenBaiLieuTaiChe"]);
  const idxKhoiLuongTaiChe = findOptionalHeaderIndex_(headers, ["khoiLuongTaiChe"]);
  const idxDonVi = findOptionalHeaderIndex_(headers, ["donVi"]);
  const idxThoiGianThem = findOptionalHeaderIndex_(headers, ["thoiGianThem"]);
  const idxNguoiThem = findOptionalHeaderIndex_(headers, ["nguoiThem"]);

  return values
    .slice(1)
    .filter(function(row) {
      return normalizeText_(row[idxIdMeTron]);
    })
    .map(function(row) {
      return {
        IdMeTron: normalizeText_(row[idxIdMeTron]),
        thoiGianXacNhanTron: formatDateTimeValue_(row[idxThoiGianXacNhanTron]),
        tenBaiLieu: normalizeText_(row[idxTenBaiLieu]),
        tenBaiLieuTaiChe: normalizeText_(row[idxTenBaiLieuTaiChe]),
        khoiLuongTaiChe: row[idxKhoiLuongTaiChe],
        donVi: normalizeText_(row[idxDonVi]),
        thoiGianThem: formatDateTimeValue_(row[idxThoiGianThem]),
        nguoiThem: normalizeText_(row[idxNguoiThem])
      };
    })
    .sort(function(a, b) {
      return String(b.thoiGianThem).localeCompare(String(a.thoiGianThem));
    });
}

/* =========================================================
   KẾ HOẠCH LẮP VỈ VIÊN TREO BỒN CẦU
   ========================================================= */

function getDanhSachSanPhamVTBC_() {
  const sheet = getSheet_(SHEET_DANH_SACH_SAN_PHAM_VTBC);

  if (sheet.getLastRow() < 2) {
    return [];
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idxMaSanPham = findRequiredHeaderIndex_(headers, ["maSanPham"]);
  const idxTenSanPham = findRequiredHeaderIndex_(headers, ["tenSanPham"]);
  const idxTenBaiLieu1 = findRequiredHeaderIndex_(headers, ["tenBaiLieu1"]);
  const idxTenBaiLieu2 = findRequiredHeaderIndex_(headers, ["tenBaiLieu2"]);
  const idxSoLuongBaiLieu1 = findRequiredHeaderIndex_(headers, ["soLuongBaiLieu1"]);
  const idxSoLuongBaiLieu2 = findRequiredHeaderIndex_(headers, ["soLuongBaiLieu2"]);

  return values
    .slice(1)
    .map(function(row) {
      return {
        maSanPham: normalizeText_(row[idxMaSanPham]),
        tenSanPham: normalizeText_(row[idxTenSanPham]),
        tenBaiLieu1: normalizeText_(row[idxTenBaiLieu1]),
        tenBaiLieu2: normalizeText_(row[idxTenBaiLieu2]),
        soLuongBaiLieu1: Number(row[idxSoLuongBaiLieu1]) || 0,
        soLuongBaiLieu2: Number(row[idxSoLuongBaiLieu2]) || 0
      };
    })
    .filter(function(item) {
      return item.maSanPham && item.tenSanPham;
    })
    .sort(function(a, b) {
      return String(a.tenSanPham).localeCompare(
        String(b.tenSanPham),
        "vi"
      );
    });
}


/**
 * Tạo map:
 * IdBanThanhPham -> tenBaiLieu
 *
 * Sheet ChiTietSanXuatBanThanhPham có thể có nhiều dòng nguyên liệu
 * cùng một IdBanThanhPham, nên chỉ cần lấy tenBaiLieu đầu tiên hợp lệ.
 */
function getBanThanhPhamTenBaiLieuMap_() {
  const sheet = getSheet_(SHEET_CHI_TIET_SAN_XUAT_BAN_THANH_PHAM);

  if (sheet.getLastRow() < 2) {
    return {};
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idxIdBanThanhPham = findRequiredHeaderIndex_(
    headers,
    ["IdBanThanhPham", "idBanThanhPham"]
  );

  const idxTenBaiLieu = findRequiredHeaderIndex_(
    headers,
    ["tenBaiLieu"]
  );

  const map = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const idBanThanhPham = normalizeText_(
      row[idxIdBanThanhPham]
    );

    const tenBaiLieu = normalizeText_(
      row[idxTenBaiLieu]
    );

    if (!idBanThanhPham || !tenBaiLieu) {
      continue;
    }

    if (!map[idBanThanhPham]) {
      map[idBanThanhPham] = tenBaiLieu;
    }
  }

  return map;
}


/**
 * Đọc các thùng còn khối lượng > 0.
 * Đồng thời ghép tenBaiLieu từ ChiTietSanXuatBanThanhPham.
 */
function getDanhSachThungLapViVTBC_() {
  const sheet = getSheet_(SHEET_CHI_TIET_BTP_THEO_THUNG);

  if (sheet.getLastRow() < 2) {
    return [];
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(h) {
    return normalizeText_(h);
  });

  const idxIdBanThanhPham = findRequiredHeaderIndex_(
    headers,
    ["IdBanThanhPham"]
  );

  const idxNgaySanXuat = findRequiredHeaderIndex_(
    headers,
    ["ngaySanXuat"]
  );

  const idxIdThungBanThanhPham = findRequiredHeaderIndex_(
    headers,
    ["IdThungBanThanhPham"]
  );

  const idxSttThung = findRequiredHeaderIndex_(
    headers,
    ["sttThung"]
  );

  const idxKhoiLuongThung = findRequiredHeaderIndex_(
    headers,
    ["khoiLuongThung"]
  );

  const idxViTriThung = findRequiredHeaderIndex_(
    headers,
    ["viTriThung"]
  );

  const tenBaiLieuMap = getBanThanhPhamTenBaiLieuMap_();

  const result = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const idBanThanhPham = normalizeText_(
      row[idxIdBanThanhPham]
    );

    const idThungBanThanhPham = normalizeText_(
      row[idxIdThungBanThanhPham]
    );

    const khoiLuongThung = Number(
      row[idxKhoiLuongThung]
    );

    if (
      !idBanThanhPham ||
      !idThungBanThanhPham ||
      !isFinite(khoiLuongThung) ||
      khoiLuongThung <= 0
    ) {
      continue;
    }

    const tenBaiLieu = normalizeText_(
      tenBaiLieuMap[idBanThanhPham]
    );

    // Không xác định được bài liệu thì không đưa ra để chọn.
    if (!tenBaiLieu) {
      continue;
    }

    result.push({
      rowNumber: i + 1,
      IdBanThanhPham: idBanThanhPham,
      tenBaiLieu: tenBaiLieu,
      ngaySanXuat: formatDateValue_(
        row[idxNgaySanXuat]
      ),
      IdThungBanThanhPham: idThungBanThanhPham,
      sttThung: row[idxSttThung],
      khoiLuongThung: khoiLuongThung,
      viTriThung: normalizeText_(
        row[idxViTriThung]
      )
    });
  }

  result.sort(function(a, b) {
    const compareRecipe = String(a.tenBaiLieu).localeCompare(
      String(b.tenBaiLieu),
      "vi"
    );

    if (compareRecipe !== 0) {
      return compareRecipe;
    }

    return String(a.ngaySanXuat).localeCompare(
      String(b.ngaySanXuat)
    );
  });

  return result;
}


function getLapViVTBCInitialData(token) {
  requireAdmin_(token);

  return {
    success: true,
    sanPhamLapViVTBC: getDanhSachSanPhamVTBC_(),
    thungLapViVTBC: getDanhSachThungLapViVTBC_(),
    keHoachLapViVTBC: getKeHoachLapViVTBC_()
  };
}


function getKeHoachLapViVTBCHeaders_() {
  return [
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
    "nguoiXuat",
    "soLuongViKeHoach"
  ];
}


function ensureKeHoachLapViVTBCSheet_() {
  const ss = getSpreadsheet_();

  let sheet = ss.getSheetByName(
    SHEET_KE_HOACH_LAP_VI_VTBC
  );

  const expectedHeaders = getKeHoachLapViVTBCHeaders_();

  if (!sheet) {
    sheet = ss.insertSheet(
      SHEET_KE_HOACH_LAP_VI_VTBC
    );

    sheet
      .getRange(1, 1, 1, expectedHeaders.length)
      .setValues([expectedHeaders]);

    return sheet;
  }

  if (sheet.getLastRow() === 0) {
    sheet
      .getRange(1, 1, 1, expectedHeaders.length)
      .setValues([expectedHeaders]);

    return sheet;
  }

  expectedHeaders.forEach(function(header, index) {
    const currentHeader = normalizeText_(
      sheet.getRange(1, index + 1).getValue()
    );

    if (currentHeader !== header) {
      sheet
        .getRange(1, index + 1)
        .setValue(header);
    }
  });

  return sheet;
}


function sanitizeIdText_(value) {
  return normalizeText_(value)
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}


function generateIdLapViVTBC_(maSanPham) {
  const now = new Date();

  const timeText = Utilities.formatDate(
    now,
    Session.getScriptTimeZone(),
    "yyyyMMddHHmmss"
  );

  const safeMaSanPham =
    sanitizeIdText_(maSanPham) || "KHONG_MA";

  return (
    "LVVT_" +
    safeMaSanPham +
    "_" +
    timeText
  );
}


function getSanPhamVTBCByMa_(maSanPham) {
  const target = normalizeText_(maSanPham);

  return getDanhSachSanPhamVTBC_().find(function(item) {
    return item.maSanPham === target;
  }) || null;
}


function getThungLapViVTBCById_(idThungBanThanhPham) {
  const target = normalizeText_(idThungBanThanhPham);

  return getDanhSachThungLapViVTBC_().find(function(item) {
    return item.IdThungBanThanhPham === target;
  }) || null;
}


/**
 * Tạo một kế hoạch gồm nhiều dòng cặp thùng.
 * Không trừ khoiLuongThung tại bước này.
 */
function createKeHoachLapViVTBC(
  token,
  payload
) {
  const session =
    requireAdmin_(
      token
    );

  const maSanPham =
    normalizeText_(
      payload &&
      payload.maSanPham
    );

  const soLuongViKeHoach =
    Number(
      payload &&
      payload.soLuongViKeHoach
    );
    
  const items =
    payload &&
    Array.isArray(
      payload.items
    )
      ? payload.items
      : [];

  if (!maSanPham) {
    throw new Error(
      "Vui lòng chọn sản phẩm."
    );
  }

  if (
    !Number.isInteger(soLuongViKeHoach) ||
    soLuongViKeHoach <= 0
  ) {
    throw new Error(
      "Số lượng vỉ kế hoạch phải là số nguyên lớn hơn 0."
    );
  }

  if (items.length === 0) {
    throw new Error(
      "Vui lòng thêm ít nhất một thùng vào danh sách."
    );
  }

  const product =
    getSanPhamVTBCByMa_(
      maSanPham
    );

  if (!product) {
    throw new Error(
      "Sản phẩm không tồn tại trong sheet DanhSachSanPhamVTBC."
    );
  }

  /*
   * Lấy toàn bộ thùng đang còn tồn.
   */
  const allBoxes =
    getDanhSachThungLapViVTBC_();

  const boxMap = {};

  allBoxes.forEach(
    function(box) {
      boxMap[
        box.IdThungBanThanhPham
      ] = box;
    }
  );

  /*
   * Không cho một thùng xuất hiện hai lần
   * trong cùng kế hoạch.
   */
  const usedBoxMap = {};

  const normalizedItems =
    items.map(
      function(item, index) {
        const loaiBaiLieu =
          Number(
            item &&
            item.loaiBaiLieu
          );

        const idThung =
          normalizeText_(
            item &&
            item.IdThungBanThanhPham
          );

        if (
          loaiBaiLieu !== 1 &&
          loaiBaiLieu !== 2
        ) {
          throw new Error(
            "Dòng " +
              (index + 1) +
              ": loại bài liệu không hợp lệ."
          );
        }

        if (!idThung) {
          throw new Error(
            "Dòng " +
              (index + 1) +
              ": thiếu mã thùng bán thành phẩm."
          );
        }

        if (usedBoxMap[idThung]) {
          throw new Error(
            "Dòng " +
              (index + 1) +
              ": thùng " +
              idThung +
              " đã bị thêm trùng."
          );
        }

        const box =
          boxMap[idThung];

        if (!box) {
          throw new Error(
            "Dòng " +
              (index + 1) +
              ": thùng " +
              idThung +
              " không còn tồn hoặc không tồn tại."
          );
        }

        /*
         * Xác định bài liệu cần đối chiếu.
         */
        const expectedTenBaiLieu =
          loaiBaiLieu === 1
            ? product.tenBaiLieu1
            : product.tenBaiLieu2;

        if (
          lowerText_(
            box.tenBaiLieu
          ) !==
          lowerText_(
            expectedTenBaiLieu
          )
        ) {
          throw new Error(
            "Dòng " +
              (index + 1) +
              ": thùng " +
              idThung +
              " không thuộc bài liệu " +
              loaiBaiLieu +
              ": " +
              expectedTenBaiLieu
          );
        }

        usedBoxMap[
          idThung
        ] = true;

        return {
          loaiBaiLieu:
            loaiBaiLieu,

          IdThungBanThanhPham:
            idThung
        };
      }
    );

  /*
   * Có thể kiểm tra phải có cả hai loại.
   *
   * Trong sản xuất lắp vỉ thường vẫn cần
   * ít nhất một thùng của mỗi bài liệu.
   */
  const hasBaiLieu1 =
    normalizedItems.some(
      function(item) {
        return (
          item.loaiBaiLieu === 1
        );
      }
    );

  const hasBaiLieu2 =
    normalizedItems.some(
      function(item) {
        return (
          item.loaiBaiLieu === 2
        );
      }
    );

  if (!hasBaiLieu1) {
    throw new Error(
      "Kế hoạch chưa có thùng bài liệu 1."
    );
  }

  if (!hasBaiLieu2) {
    throw new Error(
      "Kế hoạch chưa có thùng bài liệu 2."
    );
  }

  const sheet =
    ensureKeHoachLapViVTBCSheet_();

  const idLapVi =
    generateIdLapViVTBC_(
      product.maSanPham
    );

  const thoiGianTao =
    nowText_();

  const nguoiTao =
    session.useName || "";

  /*
   * Vẫn giữ cấu trúc sheet cũ:
   *
   * - Bài liệu 1 ghi vào cột
   *   IdThungBanThanhPham1.
   *
   * - Bài liệu 2 ghi vào cột
   *   IdThungBanThanhPham2.
   *
   * Cột còn lại để trống.
   */
  const rows =
    normalizedItems.map(
      function(item, index) {
        const idThung1 =
          item.loaiBaiLieu === 1
            ? item.IdThungBanThanhPham
            : "";

        const idThung2 =
          item.loaiBaiLieu === 2
            ? item.IdThungBanThanhPham
            : "";

        return [
          idLapVi,
          index + 1,
          product.maSanPham,
          product.tenSanPham,
          product.tenBaiLieu1,
          product.tenBaiLieu2,
          idThung1,
          idThung2,
          thoiGianTao,
          nguoiTao,
          "Chờ xuất",
          "",
          "",
          soLuongViKeHoach
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
      rows[0].length
    )
    .setValues(
      rows
    );

  const countBaiLieu1 =
    normalizedItems.filter(
      function(item) {
        return (
          item.loaiBaiLieu === 1
        );
      }
    ).length;

  const countBaiLieu2 =
    normalizedItems.filter(
      function(item) {
        return (
          item.loaiBaiLieu === 2
        );
      }
    ).length;

  return {
    success: true,

    idLapVi:
      idLapVi,

    message:
      "Đã tạo kế hoạch lắp vỉ. " +
      "Số lượng kế hoạch: " +
      soLuongViKeHoach +
      " vỉ; bài liệu 1: " +
      countBaiLieu1 +
      " thùng; bài liệu 2: " +
      countBaiLieu2 +
      " thùng.",

    keHoachLapViVTBC:
      getKeHoachLapViVTBC_(),

    thungLapViVTBC:
      getDanhSachThungLapViVTBC_()
  };
}


function getKeHoachLapViVTBC(
  token,
  filter
) {
  requireAdmin_(token);

  const dateFilter =
    normalizeKeHoachLapViDateFilter_(
      filter
    );

  return {
    success: true,
    filter: dateFilter,
    keHoachLapViVTBC:
      getKeHoachLapViVTBC_(
        dateFilter
      )
  };
}

function getDefaultKeHoachLapViDateFilter_() {
  const today =
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );

  return {
    fromDate:
      addDaysText_(
        today,
        -4
      ),

    toDate:
      today
  };
}


function normalizeKeHoachLapViDateFilter_(
  filter
) {
  const defaultFilter =
    getDefaultKeHoachLapViDateFilter_();

  const fromDate =
    normalizeText_(
      filter &&
      filter.fromDate
    ) ||
    defaultFilter.fromDate;

  const toDate =
    normalizeText_(
      filter &&
      filter.toDate
    ) ||
    defaultFilter.toDate;

  if (
    fromDate &&
    toDate &&
    fromDate > toDate
  ) {
    throw new Error(
      "Từ ngày không được lớn hơn Đến ngày."
    );
  }

  return {
    fromDate: fromDate,
    toDate: toDate
  };
}

/**
 * Đọc sheet KetQuaLapVi và cộng tổng soLuongViDaLap
 * theo từng IdLapVi.
 *
 * Kết quả trả về có dạng:
 * {
 *   "LV001": 1500,
 *   "LV002": 800
 * }
 */
function getTongSoLuongViDaLapTheoIdLapVi_() {
  const ss = getSpreadsheet_();

  const sheet = ss.getSheetByName(
    SHEET_KET_QUA_LAP_VI
  );

  /*
   * Nếu chưa có sheet hoặc sheet chưa có dữ liệu
   * thì trả về object rỗng, tránh làm lỗi toàn bộ trang.
   */
  if (
    !sheet ||
    sheet.getLastRow() < 2
  ) {
    return {};
  }

  const values = sheet
    .getDataRange()
    .getValues();

  const headers = values[0].map(
    function(header) {
      return normalizeText_(header);
    }
  );

  const idxIdLapVi =
    findRequiredHeaderIndex_(
      headers,
      ["IdLapVi"]
    );

  const idxSoLuongViDaLap =
    findRequiredHeaderIndex_(
      headers,
      ["soLuongViDaLap"]
    );

  const result = {};

  values
    .slice(1)
    .forEach(function(row) {
      const idLapVi = normalizeText_(
        row[idxIdLapVi]
      );

      /*
       * Hỗ trợ trường hợp dữ liệu trong Google Sheets
       * được nhập dạng số hoặc chuỗi có dấu phân cách.
       */
      const rawSoLuong =
        row[idxSoLuongViDaLap];

      let soLuongViDaLap = 0;

      if (
        typeof rawSoLuong === "number"
      ) {
        soLuongViDaLap =
          Number(rawSoLuong) || 0;
      } else {
        const cleanedValue =
          normalizeText_(rawSoLuong)
            .replace(/\s/g, "")
            .replace(/,/g, "");

        soLuongViDaLap =
          Number(cleanedValue) || 0;
      }

      if (!idLapVi) {
        return;
      }

      if (!result[idLapVi]) {
        result[idLapVi] = 0;
      }

      /*
       * Một IdLapVi có thể có nhiều thùng
       * trong sheet KetQuaLapVi.
       * Vì vậy phải cộng toàn bộ các dòng.
       */
      result[idLapVi] +=
        soLuongViDaLap;
    });

  return result;
}

function getKeHoachLapViVTBC_(
  filter
) {
  const ss =
    getSpreadsheet_();

  const sheet =
    ss.getSheetByName(
      SHEET_KE_HOACH_LAP_VI_VTBC
    );

  if (
    !sheet ||
    sheet.getLastRow() < 2
  ) {
    return [];
  }

    /*
   * Đọc một lần toàn bộ kết quả lắp vỉ,
   * tránh đọc sheet KetQuaLapVi lặp lại
   * cho từng dòng kế hoạch.
   */
  const tongSoLuongViDaLapMap =
    getTongSoLuongViDaLapTheoIdLapVi_();

  const dateFilter =
    normalizeKeHoachLapViDateFilter_(
      filter
    );

  const values =
    sheet
      .getDataRange()
      .getValues();

  const headers =
    values[0].map(function(h) {
      return normalizeText_(h);
    });

  const idxIdLapVi =
    findRequiredHeaderIndex_(
      headers,
      ["IdLapVi"]
    );

  const idxSTT =
    findRequiredHeaderIndex_(
      headers,
      ["STT"]
    );

  const idxMaSanPham =
    findRequiredHeaderIndex_(
      headers,
      ["maSanPham"]
    );

  const idxTenSanPham =
    findRequiredHeaderIndex_(
      headers,
      ["tenSanPham"]
    );

  const idxTenBaiLieu1 =
    findRequiredHeaderIndex_(
      headers,
      ["tenBaiLieu1"]
    );

  const idxTenBaiLieu2 =
    findRequiredHeaderIndex_(
      headers,
      ["tenBaiLieu2"]
    );

  const idxIdThung1 =
    findRequiredHeaderIndex_(
      headers,
      ["IdThungBanThanhPham1"]
    );

  const idxIdThung2 =
    findRequiredHeaderIndex_(
      headers,
      ["IdThungBanThanhPham2"]
    );

  const idxThoiGianTao =
    findRequiredHeaderIndex_(
      headers,
      ["thoiGianTao"]
    );

  const idxNguoiTao =
    findRequiredHeaderIndex_(
      headers,
      ["nguoiTao"]
    );

  const idxTrangThai =
    findRequiredHeaderIndex_(
      headers,
      ["trangThai"]
    );

  const idxThoiGianXuat =
    findRequiredHeaderIndex_(
      headers,
      ["thoiGianXuat"]
    );

  const idxNguoiXuat =
    findRequiredHeaderIndex_(
      headers,
      ["nguoiXuat"]
    );

  const idxSoLuongViKeHoach =
    findRequiredHeaderIndex_(
      headers,
      ["soLuongViKeHoach"]
    );

  return values
    .slice(1)
    .map(function(row, index) {
      return {
        row: row,
        rowNumber: index + 2
      };
    })
    .filter(function(entry) {
      const row =
        entry.row;

      const idLapVi =
        normalizeText_(
          row[idxIdLapVi]
        );

      if (!idLapVi) {
        return false;
      }

      return isDateInRange_(
        row[idxThoiGianTao],
        dateFilter.fromDate,
        dateFilter.toDate
      );
    })
      .map(function(entry) {
        const row =
          entry.row;

        const idLapVi =
          normalizeText_(
            row[idxIdLapVi]
          );

        const soLuongViKeHoach =
          Number(
            row[idxSoLuongViKeHoach]
          ) || 0;

        /*
        * Tổng số vỉ đã lắp của tất cả các thùng
        * thuộc cùng IdLapVi.
        */
        const soLuongViDaLap =
          Number(
            tongSoLuongViDaLapMap[
              idLapVi
            ]
          ) || 0;

        /*
        * Tỷ lệ hoàn thành:
        * số đã lắp / số kế hoạch × 100.
        */
        const tyLeHoanThanh =
          soLuongViKeHoach > 0
            ? (
                soLuongViDaLap /
                soLuongViKeHoach
              ) * 100
            : 0;

        return {
          rowNumber:
            entry.rowNumber,

          IdLapVi:
            idLapVi,

          STT:
            row[idxSTT],

          maSanPham:
            normalizeText_(
              row[idxMaSanPham]
            ),

          tenSanPham:
            normalizeText_(
              row[idxTenSanPham]
            ),

          tenBaiLieu1:
            normalizeText_(
              row[idxTenBaiLieu1]
            ),

          tenBaiLieu2:
            normalizeText_(
              row[idxTenBaiLieu2]
            ),

          IdThungBanThanhPham1:
            normalizeText_(
              row[idxIdThung1]
            ),

          IdThungBanThanhPham2:
            normalizeText_(
              row[idxIdThung2]
            ),

          thoiGianTao:
            formatDateTimeValue_(
              row[idxThoiGianTao]
            ),

          nguoiTao:
            normalizeText_(
              row[idxNguoiTao]
            ),

          trangThai:
            normalizeText_(
              row[idxTrangThai]
            ) ||
            "Chờ xuất",

          thoiGianXuat:
            formatDateTimeValue_(
              row[idxThoiGianXuat]
            ),

          nguoiXuat:
            normalizeText_(
              row[idxNguoiXuat]
            ),

          soLuongViKeHoach:
            soLuongViKeHoach,

          /*
          * Các trường mới gửi về giao diện.
          */
          soLuongViDaLap:
            soLuongViDaLap,

          tyLeHoanThanh:
            Math.round(
              tyLeHoanThanh * 100
            ) / 100,

          canhBaoDuoi80:
            (
              soLuongViKeHoach > 0 &&
              tyLeHoanThanh < 80
            )
        };
      })
    .sort(function(a, b) {
      const compareTime =
        String(
          b.thoiGianTao || ""
        ).localeCompare(
          String(
            a.thoiGianTao || ""
          )
        );

      if (compareTime !== 0) {
        return compareTime;
      }

      const compareId =
        String(
          b.IdLapVi
        ).localeCompare(
          String(
            a.IdLapVi
          )
        );

      if (compareId !== 0) {
        return compareId;
      }

      return (
        Number(a.STT) -
        Number(b.STT)
      );
    });
}

/* =========================================================
   KẾ HOẠCH ÉP MÀNG IN VÀ KẾ HOẠCH ĐÓNG THÙNG
   ========================================================= */

/*
 * Danh sách cột chính xác của sheet KeHoachEpMangIn.
 */
function getKeHoachEpMangInHeaders_() {
  return [
    "STT",
    "maSanPham",
    "tenSanPham",
    "soLuongViKeHoach",
    "thoiGianTao",
    "nguoiTao",
    "trangThai",
    "soLuongViThucHien",
    "ghiChu",
    "nguoiBaoCao",
    "ThoiGianBaoCao"
  ];
}


/*
 * Danh sách cột chính xác của sheet KeHoachDongThung.
 */
function getKeHoachDongThungHeaders_() {
  return [
    "STT",
    "maSanPham",
    "tenSanPham",
    "soLuongThungKeHoach",
    "thoiGianTao",
    "nguoiTao",
    "trangThai",
    "soLuongThungThucHien",
    "ghiChu",
    "nguoiBaoCao",
    "ThoiGianBaoCao"
  ];
}


/*
 * Kiểm tra và chuẩn hóa hàng tiêu đề của sheet.
 */
function ensureSimplePlanSheet_(
  sheetName,
  expectedHeaders
) {
  const ss =
    getSpreadsheet_();

  let sheet =
    ss.getSheetByName(
      sheetName
    );

  if (!sheet) {
    sheet =
      ss.insertSheet(
        sheetName
      );
  }

  /*
   * Sheet chưa có dữ liệu.
   */
  if (sheet.getLastRow() === 0) {
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

    return sheet;
  }

  /*
   * Đảm bảo đúng tên các cột.
   */
  expectedHeaders.forEach(
    function(header, index) {
      const currentHeader =
        normalizeText_(
          sheet
            .getRange(
              1,
              index + 1
            )
            .getValue()
        );

      if (
        currentHeader !==
        header
      ) {
        sheet
          .getRange(
            1,
            index + 1
          )
          .setValue(
            header
          );
      }
    }
  );

  return sheet;
}


/*
 * Tạo index cho các cột.
 */
function getSimplePlanHeaderIndex_(
  headers,
  quantityPlanHeader,
  quantityActualHeader
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
        quantityPlanHeader
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
        quantityActualHeader
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
          "Sheet thiếu cột: " +
          key
        );
      }
    }
  );

  return idx;
}


/*
 * Tìm sản phẩm VTBC theo mã sản phẩm.
 */
function getSimplePlanProductByMa_(
  maSanPham
) {
  const target =
    normalizeText_(
      maSanPham
    );

  return (
    getDanhSachSanPhamVTBC_()
      .find(function(item) {
        return (
          normalizeText_(
            item.maSanPham
          ) ===
          target
        );
      }) ||
    null
  );
}


/*
 * Lấy STT kế tiếp.
 *
 * Không lấy sheet.getLastRow() vì khi xóa một dòng,
 * số hàng có thể khác STT.
 */
function getNextSimplePlanSTT_(
  sheet,
  idxSTT
) {
  if (sheet.getLastRow() < 2) {
    return 1;
  }

  const values =
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        sheet.getLastColumn()
      )
      .getValues();

  let maxSTT = 0;

  values.forEach(
    function(row) {
      const stt =
        Number(
          row[idxSTT]
        ) || 0;

      if (stt > maxSTT) {
        maxSTT = stt;
      }
    }
  );

  return maxSTT + 1;
}


/*
 * Kiểm tra một thời gian có thuộc 5 ngày gần nhất không.
 *
 * Bao gồm:
 * hôm nay và 4 ngày trước.
 */
function isWithinLastFiveDays_(
  value
) {
  if (!value) {
    return false;
  }

  let dateValue = null;

  if (
    Object.prototype.toString.call(
      value
    ) === "[object Date]" &&
    !isNaN(value)
  ) {
    dateValue =
      new Date(value);
  } else {
    const text =
      normalizeText_(
        value
      );

    if (!text) {
      return false;
    }

    dateValue =
      new Date(
        text.replace(
          " ",
          "T"
        )
      );
  }

  if (
    !dateValue ||
    isNaN(
      dateValue.getTime()
    )
  ) {
    return false;
  }

  const now =
    new Date();

  const todayStart =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const fromDate =
    new Date(
      todayStart
    );

  fromDate.setDate(
    fromDate.getDate() - 4
  );

  const tomorrow =
    new Date(
      todayStart
    );

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  return (
    dateValue >= fromDate &&
    dateValue < tomorrow
  );
}


/*
 * Hàm dùng chung để lấy danh sách kế hoạch.
 */
function getSimplePlans_(
  config
) {
  const sheet =
    ensureSimplePlanSheet_(
      config.sheetName,
      config.headers
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
    getSimplePlanHeaderIndex_(
      headers,
      config.quantityPlanHeader,
      config.quantityActualHeader
    );

  return values
    .slice(1)
    .filter(function(row) {
      const stt =
        normalizeText_(
          row[idx.STT]
        );

      if (!stt) {
        return false;
      }

      return isWithinLastFiveDays_(
        row[idx.thoiGianTao]
      );
    })
    .map(function(row) {
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
            row[
              idx.soLuongKeHoach
            ]
          ) || 0,

        thoiGianTao:
          formatDateTimeValue_(
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
          row[
            idx.soLuongThucHien
          ] === "" ||
          row[
            idx.soLuongThucHien
          ] === null
            ? ""
            : Number(
                row[
                  idx.soLuongThucHien
                ]
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
          formatDateTimeValue_(
            row[
              idx.ThoiGianBaoCao
            ]
          )
      };
    })
    .sort(function(a, b) {
      return (
        Number(b.STT) -
        Number(a.STT)
      );
    });
}


/*
 * Hàm dùng chung để tạo kế hoạch.
 */
function createSimplePlan_(
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
      requireAdmin_(
        token
      );

    const maSanPham =
      normalizeText_(
        payload &&
        payload.maSanPham
      );

    const soLuongKeHoach =
      Number(
        payload &&
        payload.soLuongKeHoach
      );

    if (!maSanPham) {
      throw new Error(
        "Vui lòng chọn sản phẩm."
      );
    }

    if (
      !Number.isInteger(
        soLuongKeHoach
      ) ||
      soLuongKeHoach <= 0
    ) {
      throw new Error(
        config.quantityLabel +
        " phải là số nguyên lớn hơn 0."
      );
    }

    /*
     * Không nhận tên sản phẩm trực tiếp từ frontend.
     * Server tự tra lại theo mã để tránh lưu sai tên.
     */
    const product =
      getSimplePlanProductByMa_(
        maSanPham
      );

    if (!product) {
      throw new Error(
        "Không tìm thấy sản phẩm trong sheet DanhSachSanPhamVTBC."
      );
    }

    const sheet =
      ensureSimplePlanSheet_(
        config.sheetName,
        config.headers
      );

    const headers =
      sheet
        .getRange(
          1,
          1,
          1,
          config.headers.length
        )
        .getValues()[0]
        .map(function(header) {
          return normalizeText_(
            header
          );
        });

    const idx =
      getSimplePlanHeaderIndex_(
        headers,
        config.quantityPlanHeader,
        config.quantityActualHeader
      );

    const stt =
      getNextSimplePlanSTT_(
        sheet,
        idx.STT
      );

    const row =
      new Array(
        config.headers.length
      ).fill("");

    row[idx.STT] =
      stt;

    row[idx.maSanPham] =
      product.maSanPham;

    row[idx.tenSanPham] =
      product.tenSanPham;

    row[idx.soLuongKeHoach] =
      soLuongKeHoach;

    row[idx.thoiGianTao] =
      nowText_();

    row[idx.nguoiTao] =
      session.useName || "";

    row[idx.trangThai] =
      "Đã tạo";

    /*
     * Các trường công nhân báo cáo
     * được giữ trống khi tạo.
     */
    row[idx.soLuongThucHien] =
      "";

    row[idx.ghiChu] =
      "";

    row[idx.nguoiBaoCao] =
      "";

    row[idx.ThoiGianBaoCao] =
      "";

    sheet.appendRow(
      row
    );

    return {
      success: true,

      STT:
        stt,

      message:
        "Đã tạo " +
        config.planName +
        " thành công.",

      plans:
        getSimplePlans_(
          config
        )
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (error) {}
  }
}


/*
 * Hàm dùng chung để sửa kế hoạch.
 *
 * Chỉ sửa:
 * - mã sản phẩm
 * - tên sản phẩm
 * - số lượng kế hoạch
 *
 * Không xóa dữ liệu mà công nhân đã báo cáo.
 */
function updateSimplePlan_(
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

    requireAdmin_(
      token
    );

    const stt =
      Number(
        payload &&
        payload.STT
      );

    const maSanPham =
      normalizeText_(
        payload &&
        payload.maSanPham
      );

    const soLuongKeHoach =
      Number(
        payload &&
        payload.soLuongKeHoach
      );

    if (
      !Number.isInteger(stt) ||
      stt <= 0
    ) {
      throw new Error(
        "STT kế hoạch không hợp lệ."
      );
    }

    if (!maSanPham) {
      throw new Error(
        "Vui lòng chọn sản phẩm."
      );
    }

    if (
      !Number.isInteger(
        soLuongKeHoach
      ) ||
      soLuongKeHoach <= 0
    ) {
      throw new Error(
        config.quantityLabel +
        " phải là số nguyên lớn hơn 0."
      );
    }

    const product =
      getSimplePlanProductByMa_(
        maSanPham
      );

    if (!product) {
      throw new Error(
        "Không tìm thấy sản phẩm trong sheet DanhSachSanPhamVTBC."
      );
    }

    const sheet =
      ensureSimplePlanSheet_(
        config.sheetName,
        config.headers
      );

    if (sheet.getLastRow() < 2) {
      throw new Error(
        "Chưa có kế hoạch để sửa."
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
      getSimplePlanHeaderIndex_(
        headers,
        config.quantityPlanHeader,
        config.quantityActualHeader
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

    sheet
      .getRange(
        rowNumber,
        idx.maSanPham + 1
      )
      .setValue(
        product.maSanPham
      );

    sheet
      .getRange(
        rowNumber,
        idx.tenSanPham + 1
      )
      .setValue(
        product.tenSanPham
      );

    sheet
      .getRange(
        rowNumber,
        idx.soLuongKeHoach + 1
      )
      .setValue(
        soLuongKeHoach
      );

    return {
      success: true,

      message:
        "Đã cập nhật " +
        config.planName +
        " STT " +
        stt +
        ".",

      plans:
        getSimplePlans_(
          config
        )
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (error) {}
  }
}


/*
 * Hàm dùng chung để xóa kế hoạch.
 */
function deleteSimplePlan_(
  token,
  stt,
  config
) {
  const lock =
    LockService.getScriptLock();

  try {
    lock.waitLock(
      30000
    );

    requireAdmin_(
      token
    );

    stt =
      Number(
        stt
      );

    if (
      !Number.isInteger(stt) ||
      stt <= 0
    ) {
      throw new Error(
        "STT kế hoạch không hợp lệ."
      );
    }

    const sheet =
      ensureSimplePlanSheet_(
        config.sheetName,
        config.headers
      );

    if (sheet.getLastRow() < 2) {
      throw new Error(
        "Chưa có kế hoạch để xóa."
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
      getSimplePlanHeaderIndex_(
        headers,
        config.quantityPlanHeader,
        config.quantityActualHeader
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

    sheet.deleteRow(
      rowNumber
    );

    return {
      success: true,

      message:
        "Đã xóa " +
        config.planName +
        " STT " +
        stt +
        ".",

      plans:
        getSimplePlans_(
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
   CẤU HÌNH KẾ HOẠCH ÉP MÀNG IN
   ========================================================= */

function getEpMangInConfig_() {
  return {
    sheetName:
      SHEET_KE_HOACH_EP_MANG_IN,

    headers:
      getKeHoachEpMangInHeaders_(),

    quantityPlanHeader:
      "soLuongViKeHoach",

    quantityActualHeader:
      "soLuongViThucHien",

    quantityLabel:
      "Số lượng vỉ kế hoạch",

    planName:
      "kế hoạch ép màng in"
  };
}


function getKeHoachEpMangIn_() {
  return getSimplePlans_(
    getEpMangInConfig_()
  );
}


function getKeHoachEpMangIn(
  token
) {
  requireAdmin_(
    token
  );

  return {
    success: true,

    plans:
      getKeHoachEpMangIn_()
  };
}


function createKeHoachEpMangIn(
  token,
  payload
) {
  return createSimplePlan_(
    token,
    payload,
    getEpMangInConfig_()
  );
}


function updateKeHoachEpMangIn(
  token,
  payload
) {
  return updateSimplePlan_(
    token,
    payload,
    getEpMangInConfig_()
  );
}


function deleteKeHoachEpMangIn(
  token,
  stt
) {
  return deleteSimplePlan_(
    token,
    stt,
    getEpMangInConfig_()
  );
}


/* =========================================================
   CẤU HÌNH KẾ HOẠCH ĐÓNG THÙNG
   ========================================================= */

function getDongThungConfig_() {
  return {
    sheetName:
      SHEET_KE_HOACH_DONG_THUNG,

    headers:
      getKeHoachDongThungHeaders_(),

    quantityPlanHeader:
      "soLuongThungKeHoach",

    quantityActualHeader:
      "soLuongThungThucHien",

    quantityLabel:
      "Số lượng thùng kế hoạch",

    planName:
      "kế hoạch đóng thùng"
  };
}


function getKeHoachDongThung_() {
  return getSimplePlans_(
    getDongThungConfig_()
  );
}


function getKeHoachDongThung(
  token
) {
  requireAdmin_(
    token
  );

  return {
    success: true,

    plans:
      getKeHoachDongThung_()
  };
}


function createKeHoachDongThung(
  token,
  payload
) {
  return createSimplePlan_(
    token,
    payload,
    getDongThungConfig_()
  );
}


function updateKeHoachDongThung(
  token,
  payload
) {
  return updateSimplePlan_(
    token,
    payload,
    getDongThungConfig_()
  );
}


function deleteKeHoachDongThung(
  token,
  stt
) {
  return deleteSimplePlan_(
    token,
    stt,
    getDongThungConfig_()
  );
}

function unitToKgForCancelPlan_(unit) {
  const u =
    normalizeText_(unit)
      .toLowerCase();

  if (u === "g") {
    return 0.001;
  }

  if (u === "kg") {
    return 1;
  }

  if (
    u === "tấn" ||
    u === "tan" ||
    u === "t"
  ) {
    return 1000;
  }

  throw new Error(
    "Không hỗ trợ đơn vị: " +
    unit
  );
}


function convertUnitForCancelPlan_(
  value,
  fromUnit,
  toUnit
) {
  const numberValue =
    Number(value);

  if (!isFinite(numberValue)) {
    throw new Error(
      "Khối lượng không hợp lệ: " +
      value
    );
  }

  const fromFactor =
    unitToKgForCancelPlan_(
      fromUnit
    );

  const toFactor =
    unitToKgForCancelPlan_(
      toUnit
    );

  /*
   * Đổi nguồn → kg → đơn vị kho.
   */
  const valueKg =
    numberValue *
    fromFactor;

  const result =
    valueKg /
    toFactor;

  return Math.round(
    result * 1000000
  ) / 1000000;
}

function congLaiKhoTheoId_(
  khoSheet,
  khoValues,
  khoIdx,
  idKho,
  khoiLuong,
  donViNguon
) {
  idKho =
    normalizeText_(
      idKho
    );

  if (!idKho) {
    throw new Error(
      "Thiếu Id kho để hoàn nguyên liệu."
    );
  }

  const qty =
    Number(
      khoiLuong
    );

  if (
    !isFinite(qty) ||
    qty <= 0
  ) {
    return 0;
  }

  /*
   * Tìm đúng dòng KhoNguyenLieu.Id.
   */
  let khoRowIndex =
    -1;

  for (
    let i = 1;
    i < khoValues.length;
    i++
  ) {
    if (
      normalizeText_(
        khoValues[i][khoIdx.Id]
      ) === idKho
    ) {
      khoRowIndex =
        i;

      break;
    }
  }

  if (khoRowIndex === -1) {
    throw new Error(
      "Không tìm thấy Id trong KhoNguyenLieu: " +
      idKho
    );
  }

  const khoRow =
    khoValues[
      khoRowIndex
    ];

  const donViKho =
    normalizeText_(
      khoRow[
        khoIdx.donVi
      ]
    );

  if (!donViKho) {
    throw new Error(
      "KhoNguyenLieu Id " +
      idKho +
      " chưa có đơn vị kho."
    );
  }

  /*
   * Quy đổi lượng cần trả
   * về đúng đơn vị đang lưu trong kho.
   */
  const qtyTheoDonViKho =
    convertUnitForCancelPlan_(
      qty,
      donViNguon,
      donViKho
    );

  const oldQty =
    Number(
      khoRow[
        khoIdx.khoiLuongNhap
      ]
    ) || 0;

  const newQty =
    Math.round(
      (
        oldQty +
        qtyTheoDonViKho
      ) *
      1000000
    ) /
    1000000;

  /*
   * Ghi trở lại Google Sheet.
   */
  khoSheet
    .getRange(
      khoRowIndex + 1,
      khoIdx.khoiLuongNhap + 1
    )
    .setValue(
      newQty
    );

  /*
   * Đồng thời cập nhật mảng trong RAM,
   * phòng trường hợp cùng một Id kho
   * được cộng nhiều dòng trong một lần hủy.
   */
  khoValues[
    khoRowIndex
  ][
    khoIdx.khoiLuongNhap
  ] = newQty;

  /*
   * Kho lại có hàng thì đưa trạng thái
   * về Đã phê duyệt.
   */
  if (
    khoIdx.trangThai !== -1 &&
    newQty > 0
  ) {
    khoSheet
      .getRange(
        khoRowIndex + 1,
        khoIdx.trangThai + 1
      )
      .setValue(
        "Đã phê duyệt"
      );

    khoValues[
      khoRowIndex
    ][
      khoIdx.trangThai
    ] =
      "Đã phê duyệt";
  }

  return qtyTheoDonViKho;
}

function getKhoIndexForCancelPlan_(
  headers
) {
  const idx = {
    Id:
      findRequiredHeaderIndex_(
        headers,
        ["Id"]
      ),

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

    trangThai:
      findOptionalHeaderIndex_(
        headers,
        ["trangThai"]
      )
  };

  return idx;
}

function hoanKhoKhiHuyKeHoach_(
  keHoachId
) {
  keHoachId =
    normalizeText_(
      keHoachId
    );

  if (!keHoachId) {
    throw new Error(
      "Thiếu KeHoachId để hoàn kho."
    );
  }

  const ss =
    getSpreadsheet_();

  /*
   * ========================================
   * ĐỌC KHO
   * ========================================
   */
  const khoSheet =
    ss.getSheetByName(
      SHEET_KHO_NGUYEN_LIEU
    );

  if (!khoSheet) {
    throw new Error(
      "Không tìm thấy sheet KhoNguyenLieu."
    );
  }

  const khoValues =
    khoSheet
      .getDataRange()
      .getValues();

  if (
    khoValues.length < 2
  ) {
    throw new Error(
      "KhoNguyenLieu chưa có dữ liệu."
    );
  }

  const khoHeaders =
    khoValues[0].map(
      function(h) {
        return normalizeText_(h);
      }
    );

  const khoIdx =
    getKhoIndexForCancelPlan_(
      khoHeaders
    );

  /*
   * ========================================
   * ƯU TIÊN 1:
   * CHITIETCANBATCH
   * ========================================
   */
  const canSheet =
    ss.getSheetByName(
      SHEET_CHI_TIET_CAN_BATCH
    );

  if (
    canSheet &&
    canSheet.getLastRow() >= 2
  ) {
    const canValues =
      canSheet
        .getDataRange()
        .getValues();

    const canHeaders =
      canValues[0].map(
        function(h) {
          return normalizeText_(h);
        }
      );

    const idxKeHoach =
      findRequiredHeaderIndex_(
        canHeaders,
        ["KeHoachId"]
      );

    const idxIdTuKhoDenBatch =
      findRequiredHeaderIndex_(
        canHeaders,
        ["IdTuKhoDenBatch"]
      );

    const idxKhoiLuongThucTe =
      findRequiredHeaderIndex_(
        canHeaders,
        ["khoiLuongThucTe"]
      );

    const idxDonViCanXuat =
      findRequiredHeaderIndex_(
        canHeaders,
        ["donViCanXuat"]
      );

    /*
     * Chỉ lấy các dòng của kế hoạch cần hủy.
     */
    const canRows =
      canValues
        .slice(1)
        .filter(
          function(row) {
            return (
              normalizeText_(
                row[idxKeHoach]
              ) ===
              keHoachId
            );
          }
        );

    /*
     * Nếu đã có ChiTietCanBatch:
     * DỪNG ở nhánh này.
     * Tuyệt đối không chạy PhieuXuat nữa.
     */
    if (
      canRows.length > 0
    ) {
      let tongDongHoan =
        0;

      let tongDongBoQua =
        0;

      canRows.forEach(
        function(row) {
          const idKho =
            normalizeText_(
              row[
                idxIdTuKhoDenBatch
              ]
            );

          const qty =
            Number(
              row[
                idxKhoiLuongThucTe
              ]
            );

          const unit =
            normalizeText_(
              row[
                idxDonViCanXuat
              ]
            );

          /*
           * Dòng chưa cân / không có số thực tế
           * thì không cộng.
           */
          if (
            !idKho ||
            !isFinite(qty) ||
            qty <= 0 ||
            !unit
          ) {
            tongDongBoQua++;
            return;
          }

          congLaiKhoTheoId_(
            khoSheet,
            khoValues,
            khoIdx,
            idKho,
            qty,
            unit
          );

          tongDongHoan++;
        }
      );

      return {
        daHoanKho:
          tongDongHoan > 0,

        nguon:
          "ChiTietCanBatch",

        tongDong:
          canRows.length,

        tongDongHoan:
          tongDongHoan,

        tongDongBoQua:
          tongDongBoQua
      };
    }
  }

  /*
   * ========================================
   * ƯU TIÊN 2:
   * PHIEUXUATNGUYENLIEU
   *
   * Chỉ chạy khi không có ChiTietCanBatch.
   * ========================================
   */
  const phieuSheet =
    ss.getSheetByName(
      SHEET_PHIEU_XUAT_NGUYEN_LIEU
    );

  if (
    !phieuSheet ||
    phieuSheet.getLastRow() < 2
  ) {
    return {
      daHoanKho:
        false,

      nguon:
        "ChuaXuatKho",

      tongDong:
        0,

      tongDongHoan:
        0
    };
  }

  const phieuValues =
    phieuSheet
      .getDataRange()
      .getValues();

  const phieuHeaders =
    phieuValues[0].map(
      function(h) {
        return normalizeText_(h);
      }
    );

  const idxKeHoachPhieu =
    findRequiredHeaderIndex_(
      phieuHeaders,
      ["KeHoachId"]
    );

  const idxTrangThai =
    findRequiredHeaderIndex_(
      phieuHeaders,
      ["trangThaiPheDuyet"]
    );

  const idxIdKhoDaTru =
    findRequiredHeaderIndex_(
      phieuHeaders,
      ["IdKhoDaTru"]
    );

  const idxKhoiLuongCanXuat =
    findRequiredHeaderIndex_(
      phieuHeaders,
      ["khoiLuongCanXuat"]
    );

  const idxDonViCanXuatPhieu =
    findRequiredHeaderIndex_(
      phieuHeaders,
      ["donViCanXuat"]
    );

  /*
   * Cột này đang có trong database hiện tại.
   */
  const idxKhoiLuongXuatThucTe =
    findOptionalHeaderIndex_(
      phieuHeaders,
      ["khoiLuongXuatThucTe"]
    );

  const phieuRows =
    phieuValues
      .slice(1)
      .filter(
        function(row) {
          const samePlan =
            normalizeText_(
              row[
                idxKeHoachPhieu
              ]
            ) ===
            keHoachId;

          const approved =
            lowerText_(
              row[
                idxTrangThai
              ]
            ) ===
            "đã phê duyệt";

          return (
            samePlan &&
            approved
          );
        }
      );

  if (
    phieuRows.length === 0
  ) {
    /*
     * Chưa xuất kho nên không có gì để hoàn.
     */
    return {
      daHoanKho:
        false,

      nguon:
        "ChuaXuatKho",

      tongDong:
        0,

      tongDongHoan:
        0
    };
  }

  let tongDongHoan =
    0;

  phieuRows.forEach(
    function(row) {
      const idKhoDaTruText =
        normalizeText_(
          row[
            idxIdKhoDaTru
          ]
        );

      /*
       * Một phiếu đôi khi FIFO có thể ghi
       * nhiều Id đã trừ phân cách bằng dấu phẩy.
       *
       * Với logic hiện tại của bạn,
       * nếu có nhiều Id thì không thể biết chính xác
       * từng Id đã bị trừ bao nhiêu chỉ từ dòng phiếu.
       */
      if (
        !idKhoDaTruText ||
        idKhoDaTruText.indexOf(",") !== -1
      ) {
        throw new Error(
          "Kế hoạch " +
          keHoachId +
          " có dòng PhieuXuatNguyenLieu " +
          "không xác định được đúng 1 IdKhoDaTru: " +
          idKhoDaTruText
        );
      }

      const unit =
        normalizeText_(
          row[
            idxDonViCanXuatPhieu
          ]
        );

      /*
       * QUAN TRỌNG:
       * Hoàn đúng lượng đã bị trừ khi phê duyệt.
       */
      let qty = 0;

      if (
        idxKhoiLuongXuatThucTe !== -1
      ) {
        qty =
          Number(
            row[
              idxKhoiLuongXuatThucTe
            ]
          ) || 0;
      }

      /*
       * Dữ liệu cũ chưa có thực xuất
       * thì fallback về KL cần xuất.
       */
      if (
        qty <= 0
      ) {
        qty =
          Number(
            row[
              idxKhoiLuongCanXuat
            ]
          ) || 0;
      }

      if (
        qty <= 0 ||
        !unit
      ) {
        return;
      }

      congLaiKhoTheoId_(
        khoSheet,
        khoValues,
        khoIdx,
        idKhoDaTruText,
        qty,
        unit
      );

      tongDongHoan++;
    }
  );

  return {
    daHoanKho:
      tongDongHoan > 0,

    nguon:
      "PhieuXuatNguyenLieu",

    tongDong:
      phieuRows.length,

    tongDongHoan:
      tongDongHoan
  };
}

/**
 * SỬA NGÀY SẢN XUẤT THEO MÃ KẾ HOẠCH
 *
 * KeHoachSanXuat:
 *   Id -> NgaySanXuat, thoiGianSua
 *
 * PhieuXuatNguyenLieu:
 *   KeHoachId -> NgaySanXuat
 *
 * ChiTietCanBatch:
 *   KeHoachId -> NgaySanXuat
 */
function updateProductionPlanDate(token, payload) {
  requireAdmin_(token);

  const id = normalizeText_(payload && payload.id);
  const dateText = normalizeText_(
    payload && payload.ngaySanXuat
  );

  if (!id) {
    throw new Error("Thiếu mã kế hoạch sản xuất.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    throw new Error("Ngày sản xuất không hợp lệ.");
  }

  const parts = dateText.split("-").map(Number);

  const newDate = new Date(
    parts[0],
    parts[1] - 1,
    parts[2]
  );

  if (
    newDate.getFullYear() !== parts[0] ||
    newDate.getMonth() !== parts[1] - 1 ||
    newDate.getDate() !== parts[2]
  ) {
    throw new Error("Ngày sản xuất không tồn tại.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ss = getSpreadsheet_();

    const definitions = [
      {
        name: SHEET_KE_HOACH_SAN_XUAT,
        key: "Id",
        required: true
      },
      {
        name: SHEET_PHIEU_XUAT_NGUYEN_LIEU,
        key: "KeHoachId",
        required: false
      },
      {
        name: SHEET_CHI_TIET_CAN_BATCH,
        key: "KeHoachId",
        required: false
      }
    ];

    const updates = [];
    const counts = {};

    // Giai đoạn 1: Kiểm tra toàn bộ dữ liệu trước khi ghi.
    definitions.forEach(function(def) {
      const sheet = ss.getSheetByName(def.name);

      if (!sheet) {
        if (def.required) {
          throw new Error("Không tìm thấy sheet " + def.name);
        }

        counts[def.name] = 0;
        return;
      }

      if (sheet.getLastRow() < 1) {
        if (def.required) {
          throw new Error("Sheet kế hoạch chưa có dữ liệu.");
        }

        counts[def.name] = 0;
        return;
      }

      const headers = sheet
        .getRange(1, 1, 1, sheet.getLastColumn())
        .getValues()[0]
        .map(function(h) {
          return normalizeText_(h);
        });

      const keyIndex = headers.indexOf(def.key);
      const dateIndex = headers.indexOf("NgaySanXuat");
      const timeIndex = headers.indexOf("thoiGianSua");

      if (keyIndex < 0) {
        throw new Error(
          "Sheet " + def.name + " thiếu cột " + def.key
        );
      }

      if (dateIndex < 0) {
        throw new Error(
          "Sheet " + def.name + " thiếu cột NgaySanXuat"
        );
      }

      if (def.required && timeIndex < 0) {
        throw new Error(
          "Sheet KeHoachSanXuat thiếu cột thoiGianSua."
        );
      }

      counts[def.name] = 0;

      if (sheet.getLastRow() < 2) return;

      const data = sheet
        .getRange(
          2,
          1,
          sheet.getLastRow() - 1,
          sheet.getLastColumn()
        )
        .getValues();

      data.forEach(function(row, i) {
        if (normalizeText_(row[keyIndex]) !== id) {
          return;
        }

        updates.push({
          sheet: sheet,
          name: def.name,
          row: i + 2,
          dateColumn: dateIndex + 1,
          timeColumn: def.required ? timeIndex + 1 : -1
        });

        counts[def.name]++;
      });
    });

    if (!counts[SHEET_KE_HOACH_SAN_XUAT]) {
      throw new Error(
        "Không tìm thấy mã kế hoạch " + id +
        " trong sheet KeHoachSanXuat."
      );
    }

    // Giai đoạn 2: Ghi ngày sản xuất.
    // Dùng cùng một thời điểm sửa cho toàn bộ dòng kế hoạch.
    const modifiedAt = new Date();

    // Lưu giá trị cũ để phục hồi nếu quá trình ghi bị lỗi.
    const backups = [];

    try {
      updates.forEach(function(item) {
        const dateCell = item.sheet.getRange(
          item.row,
          item.dateColumn
        );

        const timeCell = item.timeColumn > 0
          ? item.sheet.getRange(item.row, item.timeColumn)
          : null;

        backups.push({
          dateCell: dateCell,
          oldDate: dateCell.getValue(),
          timeCell: timeCell,
          oldTime: timeCell ? timeCell.getValue() : null
        });

        // Giữ nguyên kiểu dữ liệu ngày nếu đang là Date.
        // Nếu đang lưu chuỗi thì dùng yyyy-MM-dd.
        const oldValue = dateCell.getValue();

        dateCell.setValue(
          oldValue instanceof Date ? newDate : dateText
        );

        if (timeCell) {
          timeCell.setValue(modifiedAt);
          timeCell.setNumberFormat("dd/MM/yyyy HH:mm:ss");
        }
      });

      SpreadsheetApp.flush();

    } catch (writeError) {
      // Cố gắng khôi phục dữ liệu cũ nếu ghi lỗi.
      let rollbackFailed = false;

      backups.reverse().forEach(function(b) {
        try {
          b.dateCell.setValue(b.oldDate);

          if (b.timeCell) {
            b.timeCell.setValue(b.oldTime);
          }
        } catch (e) {
          rollbackFailed = true;
        }
      });

      SpreadsheetApp.flush();

      throw new Error(
        "Lỗi cập nhật: " + writeError.message +
        (rollbackFailed
          ? ". Có lỗi khi phục hồi, cần kiểm tra dữ liệu 3 sheet."
          : ". Đã thử phục hồi dữ liệu cũ.")
      );
    }

    return {
      success: true,
      id: id,
      ngaySanXuat: dateText,
      counts: counts,
      message:
        "Đã sửa ngày sản xuất kế hoạch " + id +
        " thành " + dateText + ".\n" +
        "KeHoachSanXuat: " +
          counts[SHEET_KE_HOACH_SAN_XUAT] + " dòng.\n" +
        "PhieuXuatNguyenLieu: " +
          counts[SHEET_PHIEU_XUAT_NGUYEN_LIEU] + " dòng.\n" +
        "ChiTietCanBatch: " +
          counts[SHEET_CHI_TIET_CAN_BATCH] + " dòng."
    };

  } finally {
    lock.releaseLock();
  }
}
