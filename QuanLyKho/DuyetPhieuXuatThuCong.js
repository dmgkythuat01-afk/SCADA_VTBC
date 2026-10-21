/************************************************************
 * DUYỆT PHIẾU XUẤT THỦ CÔNG CỦA CÔNG NHÂN
 *
 * Sheet:
 *   PhieuXuatThuCong
 *
 * Luồng:
 *   Đã tạo
 *      ↓
 *   Thủ kho duyệt
 *      ↓
 *   kiểm tra toàn bộ tồn kho
 *      ↓
 *   trừ FEFO
 *      ↓
 *   Đã xuất
 *
 * Không sửa logic xuất kho cũ.
 ************************************************************/


/* =========================================================
   HEADER
   ========================================================= */

function manualApprovalGetHeaderIndex_(headers) {
  const required = [
    "PhieuXuatThuCongId",
    "STT",
    "Id",
    "maNguyenLieu",
    "tenNguyenLieu",
    "khoiLuongNhap",
    "donVi",
    "TrangThaiXuatThuCong",
    "nguoiDuyet",
    "thoiGianDuyet",
    "IdKhoDaTru"
  ];

  const idx = {};

  required.forEach(function(name) {
    idx[name] = headers.indexOf(name);

    if (idx[name] === -1) {
      throw new Error(
        "Sheet PhieuXuatThuCong thiếu cột: " + name
      );
    }
  });

  // Các cột chỉ dùng để hiển thị.
  [
    "quyCachDongGoi",
    "LotNo",
    "ngaySanXuat",
    "hanSuDung",
    "nhaCungCap",
    "ngayNhap",
    "ghiChu",
    "nguoiXuatKhoThuCong",
    "thoiGianLuu",
    "trangThai",
    "trangThaiNguyenLieu",
    "loaiNguyenLieu",
    "MaKeToan",
    "heSoQuyDoiKho",
    "doViTinhToan"
  ].forEach(function(name) {
    idx[name] = headers.indexOf(name);
  });

  return idx;
}


/* =========================================================
   ĐỌC GIÁ TRỊ CỘT OPTIONAL
   ========================================================= */

function manualApprovalValue_(row, index) {
  if (index === -1 || index === undefined) {
    return "";
  }

  return row[index];
}

/* =========================================================
   TRA THÔNG TIN NGUYÊN LIỆU THEO MÃ KẾ TOÁN

   NguyenLieu:
   MaKeToan
      ↓
   nhaCungCap1   = Nhà sản xuất
   nhaCungCapCap = Nhà cung cấp
   ========================================================= */

function manualApprovalGetMaterialInfoByAccountingCodeMap_() {

  const sheet =
    getSheet_(SHEET_NGUYEN_LIEU);

  if (sheet.getLastRow() < 2) {
    return {};
  }

  const values =
    sheet
      .getDataRange()
      .getValues();

  const headers =
    values[0].map(function(h) {
      return normalizeText_(h);
    });

  const idxMaKeToan =
    headers.indexOf("MaKeToan");

  const idxNhaSanXuat =
    headers.indexOf("nhaCungCap1");

  const idxNhaCungCap =
    headers.indexOf("nhaCungCapCap");

  if (idxMaKeToan === -1) {
    throw new Error(
      "Sheet NguyenLieu thiếu cột MaKeToan."
    );
  }

  if (idxNhaSanXuat === -1) {
    throw new Error(
      "Sheet NguyenLieu thiếu cột nhaCungCap1."
    );
  }

  if (idxNhaCungCap === -1) {
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

      if (!maKeToan) {
        return;
      }

      const key =
        maKeToan.toLowerCase();

      /*
       * Không cho dòng trống phía dưới
       * ghi đè dữ liệu đã có.
       */
      const nhaSanXuat =
        normalizeText_(
          row[idxNhaSanXuat]
        );

      const nhaCungCap =
        normalizeText_(
          row[idxNhaCungCap]
        );

      if (!map[key]) {
        map[key] = {
          nhaSanXuat: "",
          nhaCungCap: ""
        };
      }

      if (nhaSanXuat) {
        map[key].nhaSanXuat =
          nhaSanXuat;
      }

      if (nhaCungCap) {
        map[key].nhaCungCap =
          nhaCungCap;
      }
    });

  return map;
}

/* =========================================================
   LẤY CÁC PHIẾU "ĐÃ TẠO"
   ========================================================= */

function getPendingManualExportApprovals(token) {
  requireInventoryRole_(token);

  const sheet =
    getSheet_(SHEET_PHIEU_XUAT_THU_CONG);

  if (sheet.getLastRow() < 2) {
    return {
      success: true,
      phieu: []
    };
  }

  const values =
    sheet.getDataRange().getValues();

  const headers =
    values[0].map(function(h) {
      return normalizeText_(h);
    });

  const idx =
    manualApprovalGetHeaderIndex_(headers);

  const groupMap = {};

  /*
  * Tra NSX + NCC từ NguyenLieu
  * theo MaKeToan.
  */
  const materialInfoMap =
    manualApprovalGetMaterialInfoByAccountingCodeMap_();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const phieuId =
      normalizeText_(
        row[idx.PhieuXuatThuCongId]
      );

    if (!phieuId) {
      continue;
    }

    const status =
      normalizeText_(
        row[idx.TrangThaiXuatThuCong]
      ).toLowerCase();

    // Chỉ lấy phiếu công nhân vừa tạo.
    if (
      status !== "đã tạo" &&
      status !== "da tao"
    ) {
      continue;
    }

    if (!groupMap[phieuId]) {
      groupMap[phieuId] = {
        PhieuXuatThuCongId: phieuId,

        nguoiXuatKhoThuCong:
          normalizeText_(
            manualApprovalValue_(
              row,
              idx.nguoiXuatKhoThuCong
            )
          ),

        thoiGianLuu:
          normalizeText_(
            manualApprovalValue_(
              row,
              idx.thoiGianLuu
            )
          ),

        items: []
      };
    }

    const qty =
      Number(
        row[idx.khoiLuongNhap]
      ) || 0;

    const donVi =
      normalizeText_(
        row[idx.donVi]
      );

    const tenNguyenLieu =
      normalizeText_(
        row[idx.tenNguyenLieu]
      );

    /*
    * Mã kế toán đã được lưu
    * trong PhieuXuatThuCong.
    */
    const maKeToan =
      normalizeText_(
        manualApprovalValue_(
          row,
          idx.MaKeToan
        )
      );

    /*
    * Tra NguyenLieu theo MaKeToan.
    */
    const materialInfo =
      maKeToan
        ? (
            materialInfoMap[
              maKeToan.toLowerCase()
            ] || {}
          )
        : {};

    const nhaSanXuat =
      normalizeText_(
        materialInfo.nhaSanXuat
      );

    const nhaCungCap =
      normalizeText_(
        materialInfo.nhaCungCap
      );

    let availableKg = 0;

    try {
      availableKg =
        getAvailableKgByMaterial_(
          tenNguyenLieu
        );
    }
    catch (err) {
      availableKg = 0;
    }

    let requiredKg = 0;

    try {
      requiredKg =
        toKg_(
          qty,
          donVi
        );
    }
    catch (err) {
      requiredKg = 0;
    }

    groupMap[phieuId].items.push({
      rowNumber: i + 1,

      STT:
        row[idx.STT],

      Id:
        normalizeText_(
          row[idx.Id]
        ),

      maNguyenLieu:
        normalizeText_(
          row[idx.maNguyenLieu]
        ),

      tenNguyenLieu:
        tenNguyenLieu,

      /*
      * Thông tin mới hiển thị
      * trên card duyệt phiếu.
      */
      MaKeToan:
        maKeToan,

      nhaSanXuat:
        nhaSanXuat,

      nhaCungCapCap:
        nhaCungCap,

      khoiLuongNhap:
        qty,

      donVi:
        donVi,

      quyCachDongGoi:
        normalizeText_(
          manualApprovalValue_(
            row,
            idx.quyCachDongGoi
          )
        ),

      LotNo:
        normalizeText_(
          manualApprovalValue_(
            row,
            idx.LotNo
          )
        ),

      hanSuDung:
        formatDateValue_(
          manualApprovalValue_(
            row,
            idx.hanSuDung
          )
        ),

      ghiChu:
        normalizeText_(
          manualApprovalValue_(
            row,
            idx.ghiChu
          )
        ),

      tonKhoKhaDungKg:
        availableKg,

      duSoLuong:
        availableKg + 0.000001 >= requiredKg
    });
  }

  const result =
    Object.keys(groupMap)
      .map(function(key) {
        const group = groupMap[key];

        group.duToanBo =
          group.items.every(function(item) {
            return item.duSoLuong;
          });

        return group;
      });

  /*
   * Phiếu mới nhất lên trước.
   */
  result.sort(function(a, b) {
    return String(
      b.thoiGianLuu || ""
    ).localeCompare(
      String(
        a.thoiGianLuu || ""
      )
    );
  });

  return {
    success: true,
    phieu: result
  };
}


/* =========================================================
   DUYỆT 1 PHIẾU XUẤT THỦ CÔNG
   ========================================================= */

function approveManualExportVoucher(
  token,
  phieuXuatThuCongId
) {
  const session =
    requireInventoryRole_(token);

  phieuXuatThuCongId =
    normalizeText_(
      phieuXuatThuCongId
    );

  if (!phieuXuatThuCongId) {
    throw new Error(
      "Thiếu PhieuXuatThuCongId."
    );
  }

  const lock =
    LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const sheet =
      getSheet_(
        SHEET_PHIEU_XUAT_THU_CONG
      );

    if (sheet.getLastRow() < 2) {
      throw new Error(
        "Sheet PhieuXuatThuCong chưa có dữ liệu."
      );
    }

    const values =
      sheet.getDataRange().getValues();

    const headers =
      values[0].map(function(h) {
        return normalizeText_(h);
      });

    const idx =
      manualApprovalGetHeaderIndex_(headers);

    /*
     * Tìm tất cả dòng thuộc phiếu.
     */
    const lines = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];

      if (
        normalizeText_(
          row[idx.PhieuXuatThuCongId]
        ) !== phieuXuatThuCongId
      ) {
        continue;
      }

      const status =
        normalizeText_(
          row[idx.TrangThaiXuatThuCong]
        ).toLowerCase();

      /*
       * Chỉ xử lý dòng vẫn còn "Đã tạo".
       */
      if (
        status !== "đã tạo" &&
        status !== "da tao"
      ) {
        continue;
      }

      const qty =
        Number(
          row[idx.khoiLuongNhap]
        );

      const donVi =
        normalizeText_(
          row[idx.donVi]
        );

      const tenNguyenLieu =
        normalizeText_(
          row[idx.tenNguyenLieu]
        );

      if (!tenNguyenLieu) {
        throw new Error(
          "Phiếu " +
          phieuXuatThuCongId +
          " có dòng thiếu tên nguyên liệu."
        );
      }

      if (
        !isFinite(qty) ||
        qty <= 0
      ) {
        throw new Error(
          "Khối lượng xuất không hợp lệ: " +
          tenNguyenLieu +
          "."
        );
      }

      const requiredKg =
        toKg_(
          qty,
          donVi
        );

      lines.push({
        rowNumber: i + 1,

        maNguyenLieu:
          normalizeText_(
            row[idx.maNguyenLieu]
          ),

        tenNguyenLieu:
          tenNguyenLieu,

        khoiLuongNhap:
          qty,

        donVi:
          donVi,

        requiredKg:
          requiredKg
      });
    }

    if (lines.length === 0) {
      throw new Error(
        "Phiếu " +
        phieuXuatThuCongId +
        " không còn ở trạng thái Đã tạo hoặc không tồn tại."
      );
    }


    /* =====================================================
       BƯỚC 1:
       KIỂM TRA TỔNG NHU CẦU CỦA CẢ PHIẾU TRƯỚC KHI TRỪ
       ===================================================== */

    const requiredByMaterial = {};

    lines.forEach(function(line) {
      const key =
        normalizeText_(
          line.tenNguyenLieu
        ).toLowerCase();

      if (!requiredByMaterial[key]) {
        requiredByMaterial[key] = {
          tenNguyenLieu:
            line.tenNguyenLieu,

          requiredKg: 0
        };
      }

      requiredByMaterial[key].requiredKg +=
        line.requiredKg;
    });

    Object.keys(
      requiredByMaterial
    ).forEach(function(key) {
      const item =
        requiredByMaterial[key];

      const availableKg =
        getAvailableKgByMaterial_(
          item.tenNguyenLieu
        );

      if (
        availableKg + 0.000001 <
        item.requiredKg
      ) {
        throw new Error(
          "Không đủ tồn kho cho " +
          item.tenNguyenLieu +
          ". Cần " +
          roundQty_(item.requiredKg) +
          " kg, tồn khả dụng " +
          roundQty_(availableKg) +
          " kg."
        );
      }
    });


    /* =====================================================
       BƯỚC 2:
       ĐỦ TOÀN BỘ → BẮT ĐẦU TRỪ FEFO
       ===================================================== */

    const approvedAt =
      nowText_();

    const nguoiDuyet =
      session.useName || "";

    lines.forEach(function(line) {

      /*
       * Hàm hiện tại của hệ thống:
       *
       * - tìm lô theo HSD gần nhất
       * - trừ lần lượt
       * - có thể trừ nhiều Id
       * - trả về mảng các Id đã trừ
       */
      const deductedIds =
        deductApprovedStockByExpiry_(
          line.tenNguyenLieu,
          line.requiredKg
        );

      /*
       * Chỉ cập nhật 4 cột mới của phiếu.
       * Không đụng các cột snapshot cũ.
       */
      sheet
        .getRange(
          line.rowNumber,
          idx.TrangThaiXuatThuCong + 1
        )
        .setValue("Đã xuất");

      sheet
        .getRange(
          line.rowNumber,
          idx.nguoiDuyet + 1
        )
        .setValue(nguoiDuyet);

      sheet
        .getRange(
          line.rowNumber,
          idx.thoiGianDuyet + 1
        )
        .setValue(approvedAt);

      sheet
        .getRange(
          line.rowNumber,
          idx.IdKhoDaTru + 1
        )
        .setValue(
          deductedIds.join(", ")
        );
    });


    return {
      success: true,

      message:
        "Đã duyệt và xuất kho phiếu " +
        phieuXuatThuCongId +
        ". Số dòng: " +
        lines.length +
        ".",

      phieu:
        getPendingManualExportApprovalsInternal_()
    };

  }
  finally {
    try {
      lock.releaseLock();
    }
    catch (err) {}
  }
}


/* =========================================================
   INTERNAL - KHÔNG KIỂM TRA TOKEN LẦN 2
   ========================================================= */

function getPendingManualExportApprovalsInternal_() {
  const sheet =
    getSheet_(
      SHEET_PHIEU_XUAT_THU_CONG
    );

  if (sheet.getLastRow() < 2) {
    return [];
  }

  const values =
    sheet.getDataRange().getValues();

  const headers =
    values[0].map(function(h) {
      return normalizeText_(h);
    });

  const idx =
    manualApprovalGetHeaderIndex_(headers);

  const groupMap = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const phieuId =
      normalizeText_(
        row[idx.PhieuXuatThuCongId]
      );

    const status =
      normalizeText_(
        row[idx.TrangThaiXuatThuCong]
      ).toLowerCase();

    if (
      !phieuId ||
      (
        status !== "đã tạo" &&
        status !== "da tao"
      )
    ) {
      continue;
    }

    if (!groupMap[phieuId]) {
      groupMap[phieuId] = {
        PhieuXuatThuCongId:
          phieuId,

        nguoiXuatKhoThuCong:
          normalizeText_(
            manualApprovalValue_(
              row,
              idx.nguoiXuatKhoThuCong
            )
          ),

        thoiGianLuu:
          normalizeText_(
            manualApprovalValue_(
              row,
              idx.thoiGianLuu
            )
          ),

        items: []
      };
    }

    const qty =
      Number(
        row[idx.khoiLuongNhap]
      ) || 0;

    const donVi =
      normalizeText_(
        row[idx.donVi]
      );

    const tenNguyenLieu =
      normalizeText_(
        row[idx.tenNguyenLieu]
      );

    const requiredKg =
      toKg_(qty, donVi);

    const availableKg =
      getAvailableKgByMaterial_(
        tenNguyenLieu
      );

    groupMap[phieuId].items.push({
      rowNumber: i + 1,

      STT:
        row[idx.STT],

      Id:
        normalizeText_(
          row[idx.Id]
        ),

      LotNo:
        normalizeText_(
          manualApprovalValue_(
            row,
            idx.LotNo
          )
        ),

      maNguyenLieu:
        normalizeText_(
          row[idx.maNguyenLieu]
        ),

      tenNguyenLieu:
        tenNguyenLieu,

      /*
      * Thông tin mới hiển thị
      * trên card duyệt phiếu.
      */
      MaKeToan:
        maKeToan,

      nhaSanXuat:
        nhaSanXuat,

      nhaCungCapCap:
        nhaCungCap,

      khoiLuongNhap:
        qty,

      ghiChu:
        normalizeText_(
          manualApprovalValue_(
            row,
            idx.ghiChu
          )
        ),

      tonKhoKhaDungKg:
        availableKg,

      duSoLuong:
        availableKg + 0.000001 >=
        requiredKg
    });
  }

  return Object.keys(groupMap)
    .map(function(key) {
      const group =
        groupMap[key];

      group.duToanBo =
        group.items.every(
          function(item) {
            return item.duSoLuong;
          }
        );

      return group;
    })
    .sort(function(a, b) {
      return String(
        b.thoiGianLuu || ""
      ).localeCompare(
        String(
          a.thoiGianLuu || ""
        )
      );
    });
}

/* =========================================================
   HỦY PHIẾU XUẤT THỦ CÔNG CÔNG NHÂN
   ========================================================= */

function cancelManualExportVoucher(
  token,
  phieuXuatThuCongId
) {
  const session =
    requireInventoryRole_(token);

  phieuXuatThuCongId =
    normalizeText_(
      phieuXuatThuCongId
    );

  if (!phieuXuatThuCongId) {
    throw new Error(
      "Thiếu PhieuXuatThuCongId cần hủy."
    );
  }

  const lock =
    LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const sheet =
      getSheet_(
        SHEET_PHIEU_XUAT_THU_CONG
      );

    if (sheet.getLastRow() < 2) {
      throw new Error(
        "Sheet PhieuXuatThuCong chưa có dữ liệu."
      );
    }

    const values =
      sheet.getDataRange().getValues();

    const headers =
      values[0].map(function(h) {
        return normalizeText_(h);
      });

    const idx =
      manualApprovalGetHeaderIndex_(
        headers
      );

    let count = 0;

    /*
     * Tìm toàn bộ dòng thuộc phiếu.
     *
     * CHỈ hủy những dòng còn trạng thái "Đã tạo".
     * Không cho hủy dòng đã xuất.
     */
    for (
      let i = 1;
      i < values.length;
      i++
    ) {
      const row = values[i];

      const rowPhieuId =
        normalizeText_(
          row[idx.PhieuXuatThuCongId]
        );

      if (
        rowPhieuId !==
        phieuXuatThuCongId
      ) {
        continue;
      }

      const status =
        normalizeText_(
          row[idx.TrangThaiXuatThuCong]
        ).toLowerCase();

      /*
       * Chỉ được hủy phiếu đang "Đã tạo".
       */
      if (
        status !== "đã tạo" &&
        status !== "da tao"
      ) {
        continue;
      }

      /*
       * Đổi trạng thái.
       */
      sheet
        .getRange(
          i + 1,
          idx.TrangThaiXuatThuCong + 1
        )
        .setValue("Đã hủy");

      /*
       * Ghi người thực hiện hủy.
       *
       * Dùng chính cột nguoiDuyet hiện có
       * để không phải thêm cột mới.
       */
      sheet
        .getRange(
          i + 1,
          idx.nguoiDuyet + 1
        )
        .setValue(
          session.useName || ""
        );

      /*
       * Ghi thời gian xử lý.
       */
      sheet
        .getRange(
          i + 1,
          idx.thoiGianDuyet + 1
        )
        .setValue(
          nowText_()
        );

      /*
       * Hủy thì tuyệt đối không trừ kho.
       */
      sheet
        .getRange(
          i + 1,
          idx.IdKhoDaTru + 1
        )
        .setValue("");

      count++;
    }

    if (count === 0) {
      throw new Error(
        "Phiếu " +
        phieuXuatThuCongId +
        " không còn ở trạng thái Đã tạo hoặc đã được xử lý."
      );
    }

    return {
      success: true,

      message:
        "Đã hủy phiếu " +
        phieuXuatThuCongId +
        ". Số dòng đã hủy: " +
        count +
        ".",

      /*
       * Trả lại danh sách đang chờ.
       * Hàm này chỉ lấy trạng thái Đã tạo.
       */
      phieu:
        getPendingManualExportApprovalsInternal_()
    };

  }
  finally {
    try {
      lock.releaseLock();
    }
    catch (err) {}
  }
}

