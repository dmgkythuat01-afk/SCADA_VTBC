/* =========================================================
   XUẤT KHO TRỰC TIẾP THEO KẾ HOẠCH SẢN XUẤT

   Luồng:
   KeHoachSanXuat
      ↓
   BaiTronLieu
      ↓
   tính KL cần xuất
      ↓
   KhoNguyenLieu
      ↓
   gợi ý lô / Id kho theo FEFO
      ↓
   Xuất kho trực tiếp
      ↓
   PhieuXuatNguyenLieu
   ========================================================= */

/*
 * Dùng tên riêng để không trùng const đang có trong code.gs.
 */
const PLAN_EXPORT_SHEET_KE_HOACH =
  "KeHoachSanXuat";

const PLAN_EXPORT_SHEET_BAI_TRON =
  "BaiTronLieu";


/* =========================================================
   HÀM HỖ TRỢ HEADER
   ========================================================= */

function planExportRequiredIndex_(
  headers,
  name
) {
  const idx =
    headers.indexOf(
      name
    );

  if (idx === -1) {
    throw new Error(
      "Thiếu cột " +
      name +
      "."
    );
  }

  return idx;
}


function planExportOptionalIndex_(
  headers,
  name
) {
  return headers.indexOf(
    name
  );
}


/* =========================================================
   TRẠNG THÁI KẾ HOẠCH
   ========================================================= */

function planExportIsActiveStatus_(
  value
) {
  const s =
    normalizeText_(
      value
    )
      .toLowerCase();

  /*
   * Dữ liệu cũ chưa có trạng thái
   * vẫn coi là Hoạt động.
   */
  if (!s) {
    return true;
  }

  return (
    s === "hoạt động" ||
    s === "hoat dong" ||
    s === "active"
  );
}


/* =========================================================
   CÂN NHỎ
   ========================================================= */

function planExportIsSmallScale_(
  canSuDung
) {
  const s =
    normalizeText_(
      canSuDung
    )
      .toLowerCase()
      .replace(
        /\s+/g,
        " "
      );

  return (
    s === "cân 6kg" ||
    s === "can 6kg" ||
    s === "cân phân tích" ||
    s === "can phan tich"
  );
}


/* =========================================================
   TÍNH KHỐI LƯỢNG CẦN XUẤT

   Giữ nguyên logic trang Công nhân.
   ========================================================= */

function planExportCalculateQty_(
  baiTronItem,
  plan
) {
  const giaTri =
    Number(
      baiTronItem.khoiLuong
    ) || 0;

  const soMe =
    Number(
      plan.soLuong
    ) || 0;

  const donViGoc =
    normalizeText_(
      baiTronItem.donVi
    );

  const canSuDung =
    normalizeText_(
      baiTronItem.canSuDung
    );

  if (
    giaTri <= 0 ||
    soMe <= 0
  ) {
    return {
      khoiLuongCanXuat: 0,
      donViCanXuat:
        donViGoc
    };
  }

  /*
   * Bài liệu theo %.
   */
  if (
    donViGoc === "%"
  ) {
    const khoiLuongMotMe =
      Number(
        plan.khoiLuongMotMe
      );

    if (
      !isFinite(
        khoiLuongMotMe
      ) ||
      khoiLuongMotMe <= 0
    ) {
      throw new Error(
        "Kế hoạch " +
        plan.Id +
        " dùng bài liệu theo %, " +
        "nhưng khoiLuongMotMe không hợp lệ."
      );
    }

    /*
     * Kết quả tính ra kg.
     */
    const khoiLuongKg =
      giaTri *
      khoiLuongMotMe *
      soMe /
      100;

    /*
     * Cân nhỏ thì đổi kg → g.
     */
    if (
      planExportIsSmallScale_(
        canSuDung
      )
    ) {
      return {
        khoiLuongCanXuat:
          roundQty_(
            khoiLuongKg *
            1000
          ),

        donViCanXuat:
          "g"
      };
    }

    return {
      khoiLuongCanXuat:
        roundQty_(
          khoiLuongKg
        ),

      donViCanXuat:
        "kg"
    };
  }

  /*
   * Bài liệu đã khai báo trực tiếp g/kg/tấn.
   */
  return {
    khoiLuongCanXuat:
      roundQty_(
        giaTri *
        soMe
      ),

    donViCanXuat:
      donViGoc
  };
}


/* =========================================================
   ĐỌC BÀI TRỘN LIỆU
   ========================================================= */

function planExportGetBaiTronRows_() {
  const sheet =
    getSheet_(
      PLAN_EXPORT_SHEET_BAI_TRON
    );

  if (
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
      function(h) {
        return normalizeText_(h);
      }
    );

  const idx = {
    Id:
      planExportRequiredIndex_(
        headers,
        "Id"
      ),

    tenBaiLieu:
      planExportRequiredIndex_(
        headers,
        "tenBaiLieu"
      ),

    STT:
      planExportRequiredIndex_(
        headers,
        "STT"
      ),

    maNguyenLieu:
      planExportRequiredIndex_(
        headers,
        "maNguyenLieu"
      ),

    tenNguyenLieu:
      planExportRequiredIndex_(
        headers,
        "tenNguyenLieu"
      ),

    khoiLuong:
      planExportRequiredIndex_(
        headers,
        "khoiLuong"
      ),

    donVi:
      planExportRequiredIndex_(
        headers,
        "donVi"
      ),

    sttTron:
      planExportRequiredIndex_(
        headers,
        "sttTron"
      ),

    canSuDung:
      planExportRequiredIndex_(
        headers,
        "canSuDung"
      )
  };

  return values
    .slice(1)
    .filter(
      function(row) {
        return (
          normalizeText_(
            row[
              idx.tenBaiLieu
            ]
          ) !== ""
        );
      }
    )
    .map(
      function(row) {
        return {
          Id:
            normalizeText_(
              row[idx.Id]
            ),

          tenBaiLieu:
            normalizeText_(
              row[
                idx.tenBaiLieu
              ]
            ),

          STT:
            row[idx.STT],

          maNguyenLieu:
            normalizeText_(
              row[
                idx.maNguyenLieu
              ]
            ),

          tenNguyenLieu:
            normalizeText_(
              row[
                idx.tenNguyenLieu
              ]
            ),

          khoiLuong:
            row[
              idx.khoiLuong
            ],

          donVi:
            normalizeText_(
              row[idx.donVi]
            ),

          sttTron:
            row[idx.sttTron],

          canSuDung:
            normalizeText_(
              row[idx.canSuDung]
            )
        };
      }
    );
}


/* =========================================================
   KIỂM TRA KẾ HOẠCH ĐÃ XUẤT HAY CHƯA
   ========================================================= */

function planExportHasApprovedExport_(
  keHoachId
) {
  const sheet =
    getPhieuXuatSheet_();

  if (
    sheet.getLastRow() < 2
  ) {
    return false;
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
    getPhieuXuatHeaderIndex_(
      headers
    );

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    const row =
      values[i];

    if (
      normalizeText_(
        row[
          idx.KeHoachId
        ]
      ) !==
      normalizeText_(
        keHoachId
      )
    ) {
      continue;
    }

    const status =
      normalizeText_(
        row[
          idx.trangThaiPheDuyet
        ]
      )
        .toLowerCase();

    if (
      status ===
        "đã phê duyệt" ||
      status ===
        "da phe duyet"
    ) {
      return true;
    }
  }

  return false;
}


/* =========================================================
   DANH SÁCH KẾ HOẠCH CHO COMBOBOX
   ========================================================= */

function getProductionPlansForWarehouseExport(
  token
) {
  requireInventoryRole_(
    token
  );

  const sheet =
    getSheet_(
      PLAN_EXPORT_SHEET_KE_HOACH
    );

  if (
    sheet.getLastRow() < 2
  ) {
    return {
      success: true,
      plans: []
    };
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

  const idx = {
    Id:
      planExportRequiredIndex_(
        headers,
        "Id"
      ),

    tenBaiLieu:
      planExportRequiredIndex_(
        headers,
        "tenBaiLieu"
      ),

    soLuong:
      planExportRequiredIndex_(
        headers,
        "soLuong"
      ),

    NgaySanXuat:
      planExportRequiredIndex_(
        headers,
        "NgaySanXuat"
      ),

    khoiLuongMotMe:
      planExportOptionalIndex_(
        headers,
        "khoiLuongMotMe"
      ),

    trangThai:
      planExportOptionalIndex_(
        headers,
        "trangThai"
      )
  };

  const plans = [];

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    const row =
      values[i];

    const id =
      normalizeText_(
        row[idx.Id]
      );

    if (!id) {
      continue;
    }

    const status =
      idx.trangThai === -1
        ? "Hoạt động"
        : normalizeText_(
            row[
              idx.trangThai
            ]
          );

    /*
     * Chỉ lấy KH hoạt động.
     */
    if (
      !planExportIsActiveStatus_(
        status
      )
    ) {
      continue;
    }

    /*
     * KH đã xuất rồi thì không đưa lại vào list.
     */
    if (
      planExportHasApprovedExport_(
        id
      )
    ) {
      continue;
    }

    plans.push({
      Id:
        id,

      tenBaiLieu:
        normalizeText_(
          row[
            idx.tenBaiLieu
          ]
        ),

      soLuong:
        Number(
          row[idx.soLuong]
        ) || 0,

      NgaySanXuat:
        formatDateValue_(
          row[
            idx.NgaySanXuat
          ]
        ),

      khoiLuongMotMe:
        idx.khoiLuongMotMe === -1
          ? ""
          : Number(
              row[
                idx.khoiLuongMotMe
              ]
            ) || 0,

      trangThai:
        status ||
        "Hoạt động"
    });
  }

  plans.sort(
    function(a, b) {
      return String(
        b.NgaySanXuat || ""
      ).localeCompare(
        String(
          a.NgaySanXuat || ""
        )
      );
    }
  );

  return {
    success:
      true,

    plans:
      plans
  };
}


/* =========================================================
   TÌM KẾ HOẠCH THEO ID
   ========================================================= */

function planExportGetPlanById_(keHoachId) {
  keHoachId = normalizeText_(keHoachId);

  if (!keHoachId) {
    return null;
  }

  const sheet =
    getSheet_(PLAN_EXPORT_SHEET_KE_HOACH);

  if (sheet.getLastRow() < 2) {
    return null;
  }

  const values =
    sheet.getDataRange().getValues();

  const headers =
    values[0].map(function(h) {
      return normalizeText_(h);
    });

  const idx = {
    Id:
      planExportRequiredIndex_(
        headers,
        "Id"
      ),

    tenBaiLieu:
      planExportRequiredIndex_(
        headers,
        "tenBaiLieu"
      ),

    soLuong:
      planExportRequiredIndex_(
        headers,
        "soLuong"
      ),

    NgaySanXuat:
      planExportRequiredIndex_(
        headers,
        "NgaySanXuat"
      ),

    khoiLuongMotMe:
      planExportOptionalIndex_(
        headers,
        "khoiLuongMotMe"
      ),

    trangThai:
      planExportOptionalIndex_(
        headers,
        "trangThai"
      ),

    tenNguyenLieu:
      planExportOptionalIndex_(
        headers,
        "tenNguyenLieu"
      ),

    MaKeToan:
      planExportOptionalIndex_(
        headers,
        "MaKeToan"
      )
  };

  const matchedRows =
    values
      .slice(1)
      .filter(function(row) {
        return (
          normalizeText_(
            row[idx.Id]
          ) === keHoachId
        );
      });

  if (matchedRows.length === 0) {
    return null;
  }

  const firstRow =
    matchedRows[0];

  const status =
    idx.trangThai === -1
      ? "Hoạt động"
      : normalizeText_(
          firstRow[idx.trangThai]
        );

  if (
    !planExportIsActiveStatus_(
      status
    )
  ) {
    return null;
  }

  /*
   * Mỗi Id KH có nhiều dòng:
   * tenNguyenLieu + MaKeToan
   */
  const materials = [];

  matchedRows.forEach(function(row) {
    const tenNguyenLieu =
      idx.tenNguyenLieu === -1
        ? ""
        : normalizeText_(
            row[idx.tenNguyenLieu]
          );

    const MaKeToan =
      idx.MaKeToan === -1
        ? ""
        : normalizeText_(
            row[idx.MaKeToan]
          );

    if (!tenNguyenLieu) {
      return;
    }

    materials.push({
      tenNguyenLieu:
        tenNguyenLieu,

      MaKeToan:
        MaKeToan
    });
  });

  return {
    Id:
      normalizeText_(
        firstRow[idx.Id]
      ),

    tenBaiLieu:
      normalizeText_(
        firstRow[idx.tenBaiLieu]
      ),

    soLuong:
      Number(
        firstRow[idx.soLuong]
      ) || 0,

    NgaySanXuat:
      formatDateValue_(
        firstRow[idx.NgaySanXuat]
      ),

    khoiLuongMotMe:
      idx.khoiLuongMotMe === -1
        ? ""
        : firstRow[
            idx.khoiLuongMotMe
          ],

    trangThai:
      status,

    materials:
      materials
  };
}

function planExportGetMaKeToan_(
  plan,
  tenNguyenLieu
) {
  const targetName =
    normalizeText_(
      tenNguyenLieu
    ).toLowerCase();

  const materials =
    plan &&
    Array.isArray(plan.materials)
      ? plan.materials
      : [];

  const found =
    materials.find(
      function(item) {
        return (
          normalizeText_(
            item.tenNguyenLieu
          ).toLowerCase() ===
          targetName
        );
      }
    );

  return found
    ? normalizeText_(
        found.MaKeToan
      )
    : "";
}


function getProductionPlansForWarehouseExportInternal_() {
  const sheet =
    getSheet_(
      PLAN_EXPORT_SHEET_KE_HOACH
    );

  if (
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
      function(h) {
        return normalizeText_(h);
      }
    );

  const idx = {
    Id:
      planExportRequiredIndex_(
        headers,
        "Id"
      ),

    tenBaiLieu:
      planExportRequiredIndex_(
        headers,
        "tenBaiLieu"
      ),

    soLuong:
      planExportRequiredIndex_(
        headers,
        "soLuong"
      ),

    NgaySanXuat:
      planExportRequiredIndex_(
        headers,
        "NgaySanXuat"
      ),

    khoiLuongMotMe:
      planExportOptionalIndex_(
        headers,
        "khoiLuongMotMe"
      ),

    trangThai:
      planExportOptionalIndex_(
        headers,
        "trangThai"
      )
  };

  return values
    .slice(1)
    .map(
      function(row) {
        return {
          Id:
            normalizeText_(
              row[idx.Id]
            ),

          tenBaiLieu:
            normalizeText_(
              row[
                idx.tenBaiLieu
              ]
            ),

          soLuong:
            Number(
              row[idx.soLuong]
            ) || 0,

          NgaySanXuat:
            formatDateValue_(
              row[
                idx.NgaySanXuat
              ]
            ),

          khoiLuongMotMe:
            idx.khoiLuongMotMe === -1
              ? ""
              : Number(
                  row[
                    idx.khoiLuongMotMe
                  ]
                ) || 0,

          trangThai:
            idx.trangThai === -1
              ? "Hoạt động"
              : (
                  normalizeText_(
                    row[
                      idx.trangThai
                    ]
                  ) ||
                  "Hoạt động"
                )
        };
      }
    )
    .filter(
      function(item) {
        return (
          item.Id &&
          planExportIsActiveStatus_(
            item.trangThai
          )
        );
      }
    );
}


/* =========================================================
   TÌM LÔ KHO SẼ BỊ TRỪ

   Chỉ mô phỏng, CHƯA trừ kho.
   ========================================================= */

function planExportPreviewLots_(
  maNguyenLieu,
  tenNguyenLieu,
  maKeToan,
  requiredKg
) {
  /*
   * QUAN TRỌNG:
   * Kho phải khớp:
   *
   * maNguyenLieu
   * + tenNguyenLieu
   * + MaKeToan
   */
  const lots =
    getApprovedStockLotsForExport_(
      maNguyenLieu,
      tenNguyenLieu,
      maKeToan
    );

  let remainingKg =
    requiredKg;

  const result = [];

  lots.forEach(
    function(lot) {
      if (
        remainingKg <=
        0.000001
      ) {
        return;
      }

      const deductKg =
        Math.min(
          Number(
            lot.qtyKg
          ) || 0,
          remainingKg
        );

      if (
        deductKg <=
        0.000001
      ) {
        return;
      }

      result.push({
        Id:
          lot.Id,

        maNguyenLieu:
          lot.maNguyenLieu,

        tenNguyenLieu:
          lot.tenNguyenLieu,

        MaKeToan:
          lot.MaKeToan,

        LotNo:
          lot.LotNo,

        hanSuDung:
          lot.hanSuDung,

        ngayNhap:
          lot.ngayNhap,

        khoiLuongKho:
          lot.khoiLuongNhap,

        donViKho:
          lot.donVi,

        khoiLuongSeTru:
          roundQty_(
            fromKg_(
              deductKg,
              lot.donVi
            )
          )
      });

      remainingKg -=
        deductKg;
    }
  );

  return {
    lots:
      result,

    duSoLuong:
      remainingKg <=
      0.000001
  };
}

/* =========================================================
   XEM TRƯỚC NGUYÊN LIỆU THEO KẾ HOẠCH
   ========================================================= */

function getWarehouseExportPlanDetail(
  token,
  keHoachId
) {
  requireInventoryRole_(
    token
  );

  keHoachId =
    normalizeText_(
      keHoachId
    );

  if (!keHoachId) {
    throw new Error(
      "Chưa chọn kế hoạch sản xuất."
    );
  }

  if (
    planExportHasApprovedExport_(
      keHoachId
    )
  ) {
    throw new Error(
      "Kế hoạch này đã có phiếu xuất nguyên liệu được phê duyệt."
    );
  }

  const plan =
    planExportGetPlanById_(
      keHoachId
    );

  if (!plan) {
    throw new Error(
      "Không tìm thấy kế hoạch hoạt động: " +
      keHoachId
    );
  }

  const baiTronRows =
    planExportGetBaiTronRows_()
      .filter(
        function(item) {
          return (
            normalizeText_(
              item.tenBaiLieu
            ) ===
            normalizeText_(
              plan.tenBaiLieu
            )
          );
        }
      );

  if (
    baiTronRows.length === 0
  ) {
    throw new Error(
      "Không tìm thấy bài trộn liệu: " +
      plan.tenBaiLieu
    );
  }

  const items =
    baiTronRows.map(
      function(item) {
 
        /*
        * 1. Tìm Mã kế toán PCN đã chọn
        * trong KeHoachSanXuat.
        */
        const maKeToan =
          planExportGetMaKeToan_(
            plan,
            item.tenNguyenLieu
          );

        if (!maKeToan) {
          throw new Error(
            "Kế hoạch " +
            plan.Id +
            " chưa có Mã kế toán cho nguyên liệu: " +
            item.tenNguyenLieu
          );
        }

        /*
        * 2. Tính KL cần xuất theo bài trộn.
        */
        const calculated =
          planExportCalculateQty_(
            item,
            plan
          );

        const requiredKg =
          toKg_(
            calculated
              .khoiLuongCanXuat,

            calculated
              .donViCanXuat
          );

        /*
        * 3. Tồn kho phải khớp:
        *
        * maNguyenLieu
        * + tenNguyenLieu
        * + MaKeToan
        */
        const availableKg =
          getAvailableKgForExport_(
            item.maNguyenLieu,
            item.tenNguyenLieu,
            maKeToan
          );

        /*
        * 4. Preview lô sẽ trừ.
        * Hàm này cũng lọc đúng Mã kế toán.
        */
        const preview =
          planExportPreviewLots_(
            item.maNguyenLieu,
            item.tenNguyenLieu,
            maKeToan,
            requiredKg
          );

        return {
          STT:
            item.STT,

          maNguyenLieu:
            item.maNguyenLieu,

          tenNguyenLieu:
            item.tenNguyenLieu,

          /*
          * MỚI
          */
          MaKeToan:
            maKeToan,

          khoiLuongCanXuat:
            calculated
              .khoiLuongCanXuat,

          khoiLuongXuatThucTe:
            calculated
              .khoiLuongCanXuat,

          donViCanXuat:
            calculated
              .donViCanXuat,

          sttTron:
            item.sttTron,

          canSuDung:
            item.canSuDung,

          tonKhoKhaDung:
            roundQty_(
              fromKg_(
                availableKg,
                calculated
                  .donViCanXuat
              )
            ),

          duSoLuong:
            availableKg +
              0.000001 >=
            requiredKg,

          lots:
            preview.lots
        };
      }
    );

  return {
    success:
      true,

    plan:
      plan,

    items:
      items,

    duToanBo:
      items.every(
        function(item) {
          return item.duSoLuong;
        }
      )
  };
}


/* =========================================================
   XUẤT KHO TRỰC TIẾP THEO KẾ HOẠCH
   ========================================================= */

function createWarehouseExportFromProductionPlan(
  token,
  keHoachId,
  actualItems
) {
  const session =
    requireInventoryRole_(
      token
    );

  keHoachId =
    normalizeText_(
      keHoachId
    );

  actualItems =
  Array.isArray(actualItems)
    ? actualItems
    : [];

  if (!keHoachId) {
    throw new Error(
      "Chưa chọn kế hoạch sản xuất."
    );
  }

  const lock =
    LockService
      .getScriptLock();

  try {
    lock.waitLock(
      30000
    );

    /*
     * Kiểm tra lại lần nữa bên server.
     */
    if (
      planExportHasApprovedExport_(
        keHoachId
      )
    ) {
      throw new Error(
        "Kế hoạch này đã được xuất kho nguyên liệu trước đó."
      );
    }

    const plan =
      planExportGetPlanById_(
        keHoachId
      );

    if (!plan) {
      throw new Error(
        "Không tìm thấy kế hoạch hoạt động: " +
        keHoachId
      );
    }

    const baiTronRows =
      planExportGetBaiTronRows_()
        .filter(
          function(item) {
            return (
              normalizeText_(
                item.tenBaiLieu
              ) ===
              normalizeText_(
                plan.tenBaiLieu
              )
            );
          }
        );

    if (
      baiTronRows.length === 0
    ) {
      throw new Error(
        "Không tìm thấy nguyên liệu của bài trộn " +
        plan.tenBaiLieu +
        "."
      );
    }

    /*
    * Map dữ liệu KL thực tế thủ kho nhập.
    *
    * Dùng STT + mã nguyên liệu để tránh nhầm dòng.
    */
    const actualMap =
      {};

    actualItems.forEach(
      function(item) {
        const stt =
          normalizeText_(
            item &&
            item.STT
          );

        const maNguyenLieu =
          normalizeText_(
            item &&
            item.maNguyenLieu
          );

        const qty =
          Number(
            item &&
            item.khoiLuongXuatThucTe
          );

        if (
          !stt ||
          !maNguyenLieu
        ) {
          return;
        }

        if (
          !isFinite(qty) ||
          qty <= 0
        ) {
          throw new Error(
            "Khối lượng xuất thực tế không hợp lệ cho " +
            maNguyenLieu +
            "."
          );
        }

        const key =
          stt +
          "||" +
          maNguyenLieu;

        actualMap[key] =
          qty;
      }
    );

    /*
     * Tính toàn bộ nhu cầu trước.
     */
    const lines =
      baiTronRows.map(
        function(item) {
          const maKeToan =
            planExportGetMaKeToan_(
              plan,
              item.tenNguyenLieu
            );

          if (!maKeToan) {
            throw new Error(
              "Kế hoạch " +
              plan.Id +
              " chưa có Mã kế toán cho nguyên liệu: " +
              item.tenNguyenLieu
            );
          }

          const calculated =
            planExportCalculateQty_(
              item,
              plan
            );

          const key =
            normalizeText_(
              item.STT
            ) +
            "||" +
            normalizeText_(
              item.maNguyenLieu
            );

          /*
          * Nếu thủ kho đã gửi KL thực tế
          * thì dùng giá trị đó.
          *
          * Nếu không có thì mặc định
          * = KL cần xuất.
          */
          const khoiLuongXuatThucTe =
            actualMap[key] !==
              undefined
              ? Number(
                  actualMap[key]
                )
              : Number(
                  calculated
                    .khoiLuongCanXuat
                );

          if (
            !isFinite(
              khoiLuongXuatThucTe
            ) ||
            khoiLuongXuatThucTe <= 0
          ) {
            throw new Error(
              "Khối lượng xuất thực tế không hợp lệ cho " +
              item.tenNguyenLieu +
              "."
            );
          }

          /*
          * QUAN TRỌNG:
          * Tồn kho phải kiểm tra theo KL THỰC XUẤT.
          */
          const requiredKg =
            toKg_(
              khoiLuongXuatThucTe,
              calculated
                .donViCanXuat
            );

          return {
            item:
              item,

            MaKeToan:
              maKeToan,

            /*
            * Kế hoạch gốc.
            */
            khoiLuongCanXuat:
              calculated
                .khoiLuongCanXuat,

            /*
            * Giá trị thủ kho đã sửa.
            */
            khoiLuongXuatThucTe:
              khoiLuongXuatThucTe,

            donViCanXuat:
              calculated
                .donViCanXuat,

            requiredKg:
              requiredKg
          };
        }
      );

    /*
     * Kiểm tra tổng tồn trước khi trừ.
     */
    const requiredByMaterial = {};

      lines.forEach(
        function(line) {

          const key =
            normalizeText_(
              line.item.maNguyenLieu
            ).toLowerCase() +
            "||" +
            normalizeText_(
              line.item.tenNguyenLieu
            ).toLowerCase() +
            "||" +
            normalizeText_(
              line.MaKeToan
            ).toLowerCase();

          if (!requiredByMaterial[key]) {

            requiredByMaterial[key] = {

              maNguyenLieu:
                line.item.maNguyenLieu,

              tenNguyenLieu:
                line.item.tenNguyenLieu,

              MaKeToan:
                line.MaKeToan,

              requiredKg:
                0
            };
          }

          requiredByMaterial[
            key
          ].requiredKg +=
            line.requiredKg;
        }
      );

      Object.keys(
        requiredByMaterial
      ).forEach(
        function(key) {

          const required =
            requiredByMaterial[
              key
            ];

          const availableKg =
            getAvailableKgForExport_(
              required.maNguyenLieu,
              required.tenNguyenLieu,
              required.MaKeToan
            );

          if (
            availableKg +
              0.000001 <
            required.requiredKg
          ) {

            throw new Error(
              "Không đủ tồn kho cho " +
              required.tenNguyenLieu +
              " - Mã kế toán " +
              required.MaKeToan +
              "."
            );
          }
        }
      );
 

    const phieuSheet =
      getPhieuXuatSheet_();

    const phieuId =
      generateId_(
        "PXNL"
      );

    const approvedAt =
      nowText_();

    const nguoiXuat =
      session.useName || "";

    /*
     * Sau khi kiểm tra đủ tồn,
     * bắt đầu trừ từng dòng.
     */
    lines.forEach(
      function(line) {
        const item =
          line.item;

        const preview =
          planExportPreviewLots_(
            item.maNguyenLieu,
            item.tenNguyenLieu,
            line.MaKeToan,
            line.requiredKg
          );

        /*
         * Lấy lô đầu tiên để điền
         * các cột mô tả của phiếu.
         *
         * IdKhoDaTru vẫn lưu toàn bộ ID thực tế.
         */
        const firstLot =
          preview.lots.length
            ? preview.lots[0]
            : null;

        /*
         * Trừ kho bằng logic hiện có.
         */
        const deductedIds =
          deductApprovedStockForExport_(
            item.maNguyenLieu,
            item.tenNguyenLieu,
            line.MaKeToan,
            line.requiredKg
          );

        appendObjectRowByHeader_(
          phieuSheet,
          {
            PhieuXuatId:
              phieuId,

            KeHoachId:
              plan.Id,

            tenBaiLieu:
              plan.tenBaiLieu,

            soLuong:
              plan.soLuong,

            NgaySanXuat:
              plan.NgaySanXuat,

            STT:
              item.STT,

            maNguyenLieu:
              item.maNguyenLieu,

            tenNguyenLieu:
              item.tenNguyenLieu,

            MaKeToan:
              line.MaKeToan,

            khoiLuongCanXuat:
              line
                .khoiLuongCanXuat,

            donViCanXuat:
              line
                .donViCanXuat,

            sttTron:
              item.sttTron,

            canSuDung:
              item.canSuDung,

            IdKho:
              firstLot
                ? firstLot.Id
                : "",

            khoiLuongKho:
              firstLot
                ? firstLot
                    .khoiLuongKho
                : "",

            donViKho:
              firstLot
                ? firstLot
                    .donViKho
                : "",

            quyCachDongGoi:
              "",

            LotNo:
              firstLot
                ? firstLot.LotNo
                : "",

            ngaySanXuatKho:
              "",

            hanSuDung:
              firstLot
                ? firstLot
                    .hanSuDung
                : "",

            nhaCungCap:
              "",

            ngayNhap:
              firstLot
                ? firstLot
                    .ngayNhap
                : "",

            nguoiTao:
              nguoiXuat,

            ngayTao:
              approvedAt,

            trangThaiPheDuyet:
              "Đã phê duyệt",

            cachXuat:
              "Xuất trực tiếp theo kế hoạch sản xuất",

            nguoiPheDuyet:
              nguoiXuat,

            thoiGianDuyet:
              approvedAt,

            IdKhoDaTru:
              deductedIds.join(
                ", "
              ),

            /*
             * Đúng yêu cầu:
             * thực xuất = cần xuất.
             */
            khoiLuongXuatThucTe:
              line
                .khoiLuongXuatThucTe
          }
        );
      }
    );

    return {
      success:
        true,

      PhieuXuatId:
        phieuId,

      message:
        "Đã xuất kho theo kế hoạch " +
        plan.Id +
        ". Số nguyên liệu: " +
        lines.length +
        ".",

      tonKho:
        getApprovedInventoryItems_()
    };
  }
  finally {
    try {
      lock.releaseLock();
    }
    catch (err) {}
  }
}
