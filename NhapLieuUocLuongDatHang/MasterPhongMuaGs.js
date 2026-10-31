// ============================================================
// DMG MASTER DATA
// MODULE: PHÒNG MUA
//
// MASTER NGUYÊN LIỆU : NguyenLieuVatTu
// DATA PHÒNG MUA      : XuatNhapKhau
// ============================================================

const MASTER_PM_CONFIG = {

  SHEET_NLVT: 'NguyenLieuVatTu',
  SHEET_XNK: 'XuatNhapKhau',

  LOCKED_HEADERS: [
    'maNguyenLieu',
    'MaKeToan',
    'tenNguyenLieu',
    'donViKho'
  ],

  HEADERS: [
    'maNguyenLieu',
    'MaKeToan',
    'tenNguyenLieu',
    'donViKho',
    'tenHangNhapKhau',
    'tenTiengTrung',
    'tenKhaiBao',
    'thongSoKyThuat',
    'nhaCungCap1',
    'nhaCungCap2',
    'nhaCungCap3',
    'donGiaBaoGomVAT',
    'donGiaKhongBaoGomVAT',
    'nguoiLienHe',
    'phuongThucTTNCC1',
    'phuongThucTTNCC2',
    'phuongThucTTNCC3',
    'donViChuyenTienNCC',
    'benMua',
    'ngayDuKienGiaoHangTaiXuong',
    'NgayDongCong',
    'ngayHangVeDuKien'
  ]

};


// ============================================================
// GET SPREADSHEET
// ============================================================

function masterPM_getSpreadsheet_() {

  return getMasterSpreadsheet_();

}


// ============================================================
// GET SHEET NguyenLieuVatTu
// ============================================================

function masterPM_getNguyenLieuSheet_() {

  const ss =
    masterPM_getSpreadsheet_();

  const sheet =
    ss.getSheetByName(
      MASTER_PM_CONFIG.SHEET_NLVT
    );

  if (!sheet) {

    throw new Error(
      'Không tìm thấy sheet "' +
      MASTER_PM_CONFIG.SHEET_NLVT +
      '".'
    );

  }

  return sheet;

}


// ============================================================
// GET SHEET XuatNhapKhau
// ============================================================

function masterPM_getXNKSheet_() {

  const ss =
    masterPM_getSpreadsheet_();

  const sheet =
    ss.getSheetByName(
      MASTER_PM_CONFIG.SHEET_XNK
    );

  if (!sheet) {

    throw new Error(
      'Không tìm thấy sheet "' +
      MASTER_PM_CONFIG.SHEET_XNK +
      '".'
    );

  }

  return sheet;

}


// ============================================================
// HEADER MAP
// ============================================================

function masterPM_getHeaderMap_(sheet) {

  const lastColumn =
    sheet.getLastColumn();

  if (lastColumn < 1) {
    return {};
  }


  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getDisplayValues()[0];


  const map = {};


  headers.forEach(
    (header, index) => {

      const key =
        String(
          header || ''
        ).trim();

      if (key) {

        map[key] =
          index + 1;

      }

    }
  );


  return map;

}


// ============================================================
// VALIDATE NguyenLieuVatTu
// ============================================================

function masterPM_validateNguyenLieuHeaders_(
  headerMap
) {

  const missing =
    MASTER_PM_CONFIG
      .LOCKED_HEADERS
      .filter(
        header =>
          !headerMap[header]
      );


  if (missing.length) {

    throw new Error(
      'Sheet NguyenLieuVatTu thiếu cột: ' +
      missing.join(', ')
    );

  }

}


// ============================================================
// VALIDATE XuatNhapKhau
// ============================================================

function masterPM_validateXNKHeaders_(
  headerMap
) {

  const missing =
    MASTER_PM_CONFIG
      .HEADERS
      .filter(
        header =>
          !headerMap[header]
      );


  if (missing.length) {

    throw new Error(
      'Sheet XuatNhapKhau thiếu cột: ' +
      missing.join(', ')
    );

  }

}


// ============================================================
// NORMALIZE KEY
// ============================================================

function masterPM_normalizeKey_(
  value
) {

  return String(
    value || ''
  )
    .trim()
    .toUpperCase();

}


// ============================================================
// ĐỌC NguyenLieuVatTu
// ============================================================

function masterPM_getNguyenLieuData_() {

  const sheet =
    masterPM_getNguyenLieuSheet_();


  const headerMap =
    masterPM_getHeaderMap_(
      sheet
    );


  masterPM_validateNguyenLieuHeaders_(
    headerMap
  );


  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {
    return [];
  }


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        sheet.getLastColumn()
      )
      .getDisplayValues();


  const result = [];


  values.forEach(
    row => {

      const maNguyenLieu =
        String(
          row[
            headerMap.maNguyenLieu - 1
          ] || ''
        ).trim();


      if (!maNguyenLieu) {
        return;
      }


      result.push({

        maNguyenLieu:
          maNguyenLieu,

        MaKeToan:
          String(
            row[
              headerMap.MaKeToan - 1
            ] || ''
          ).trim(),

        tenNguyenLieu:
          String(
            row[
              headerMap.tenNguyenLieu - 1
            ] || ''
          ).trim(),

        donViKho:
          String(
            row[
              headerMap.donViKho - 1
            ] || ''
          ).trim()

      });

    }
  );


  return result;

}


// ============================================================
// MAP XuatNhapKhau THEO maNguyenLieu
// ============================================================

function masterPM_getXNKMap_() {

  const sheet =
    masterPM_getXNKSheet_();


  const headerMap =
    masterPM_getHeaderMap_(
      sheet
    );


  masterPM_validateXNKHeaders_(
    headerMap
  );


  const lastRow =
    sheet.getLastRow();


  const map = {};


  if (lastRow < 2) {
    return map;
  }


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        sheet.getLastColumn()
      )
      .getDisplayValues();


  values.forEach(
    (row, index) => {

      const maNguyenLieu =
        String(
          row[
            headerMap.maNguyenLieu - 1
          ] || ''
        ).trim();


      if (!maNguyenLieu) {
        return;
      }


      const key =
        masterPM_normalizeKey_(
          maNguyenLieu
        );


      const item = {

        _row:
          index + 2

      };


      MASTER_PM_CONFIG
        .HEADERS
        .forEach(
          header => {

            item[header] =
              row[
                headerMap[header] - 1
              ] ?? '';

          }
        );


      map[key] =
        item;

    }
  );


  return map;

}


// ============================================================
// LOAD DATA CHO GIAO DIỆN
// ============================================================

function masterPM_getData() {

  const nguyenLieuList =
    masterPM_getNguyenLieuData_();


  const xnkMap =
    masterPM_getXNKMap_();


  const result =
    nguyenLieuList.map(
      nl => {

        const key =
          masterPM_normalizeKey_(
            nl.maNguyenLieu
          );


        const old =
          xnkMap[key] || {};


        const item = {};


        MASTER_PM_CONFIG
          .HEADERS
          .forEach(
            header => {

              item[header] =
                old[header] ?? '';

            }
          );


        // 4 cột luôn lấy từ NguyenLieuVatTu

        item.maNguyenLieu =
          nl.maNguyenLieu;

        item.MaKeToan =
          nl.MaKeToan;

        item.tenNguyenLieu =
          nl.tenNguyenLieu;

        item.donViKho =
          nl.donViKho;


        item._existsXNK =
          !!xnkMap[key];


        return item;

      }
    );


  return {

    ok: true,

    headers:
      MASTER_PM_CONFIG.HEADERS,

    lockedHeaders:
      MASTER_PM_CONFIG.LOCKED_HEADERS,

    total:
      result.length,

    data:
      result

  };

}


// ============================================================
// TÌM MASTER NGUYÊN LIỆU THEO MÃ
// ============================================================

function masterPM_findNguyenLieu_(
  maNguyenLieu
) {

  const key =
    masterPM_normalizeKey_(
      maNguyenLieu
    );


  const list =
    masterPM_getNguyenLieuData_();


  const item =
    list.find(
      row =>
        masterPM_normalizeKey_(
          row.maNguyenLieu
        ) === key
    );


  if (!item) {

    throw new Error(
      'Không tìm thấy nguyên liệu "' +
      maNguyenLieu +
      '" trong NguyenLieuVatTu.'
    );

  }


  return item;

}


// ============================================================
// CẬP NHẬT 1 NGUYÊN LIỆU
// ============================================================
//
// Nếu maNguyenLieu đã tồn tại trong XuatNhapKhau:
//    → update đúng dòng đó.
//
// Nếu chưa tồn tại:
//    → append dòng mới.
//
// 4 cột master luôn đọc lại từ NguyenLieuVatTu.
// ============================================================

function masterPM_updateOne(
  item
) {

  if (
    !item ||
    !item.maNguyenLieu
  ) {

    throw new Error(
      'Không xác định được mã nguyên liệu.'
    );

  }


  const lock =
    LockService.getScriptLock();


  lock.waitLock(30000);


  try {

    const master =
      masterPM_findNguyenLieu_(
        item.maNguyenLieu
      );


    const sheet =
      masterPM_getXNKSheet_();


    const headerMap =
      masterPM_getHeaderMap_(
        sheet
      );


    masterPM_validateXNKHeaders_(
      headerMap
    );


    const lastColumn =
      sheet.getLastColumn();


    const key =
      masterPM_normalizeKey_(
        master.maNguyenLieu
      );


    // ========================================================
    // TÌM DÒNG HIỆN TẠI TRONG XuatNhapKhau
    // ========================================================

    let targetRow = 0;


    const lastRow =
      sheet.getLastRow();


    if (lastRow >= 2) {

      const maValues =
        sheet
          .getRange(
            2,
            headerMap.maNguyenLieu,
            lastRow - 1,
            1
          )
          .getDisplayValues();


      for (
        let i = 0;
        i < maValues.length;
        i++
      ) {

        const currentKey =
          masterPM_normalizeKey_(
            maValues[i][0]
          );


        if (
          currentKey === key
        ) {

          targetRow =
            i + 2;

          break;

        }

      }

    }


    // ========================================================
    // NẾU CŨ → GIỮ CỘT NGOÀI MODULE
    // NẾU MỚI → TẠO DÒNG TRẮNG
    // ========================================================

    let output;


    if (targetRow) {

      output =
        sheet
          .getRange(
            targetRow,
            1,
            1,
            lastColumn
          )
          .getValues()[0];

    } else {

      targetRow =
        Math.max(
          sheet.getLastRow() + 1,
          2
        );


      output =
        new Array(
          lastColumn
        ).fill('');

    }


    // ========================================================
    // 4 CỘT MASTER
    // ========================================================

    output[
      headerMap.maNguyenLieu - 1
    ] =
      master.maNguyenLieu;


    output[
      headerMap.MaKeToan - 1
    ] =
      master.MaKeToan;


    output[
      headerMap.tenNguyenLieu - 1
    ] =
      master.tenNguyenLieu;


    output[
      headerMap.donViKho - 1
    ] =
      master.donViKho;


    // ========================================================
    // CÁC CỘT PHÒNG MUA
    // ========================================================

    MASTER_PM_CONFIG
      .HEADERS
      .forEach(
        header => {

          if (
            MASTER_PM_CONFIG
              .LOCKED_HEADERS
              .includes(header)
          ) {

            return;

          }


          output[
            headerMap[header] - 1
          ] =
            item[header] ?? '';

        }
      );


    // ========================================================
    // GHI ĐÚNG 1 DÒNG
    // ========================================================

    sheet
      .getRange(
        targetRow,
        1,
        1,
        lastColumn
      )
      .setValues([
        output
      ]);


    SpreadsheetApp.flush();


    // ========================================================
    // RETURN DÒNG VỪA LƯU
    // ========================================================

    const refreshed =
      masterPM_getData();


    const savedItem =
      refreshed.data.find(
        row =>
          masterPM_normalizeKey_(
            row.maNguyenLieu
          ) === key
      );


    return {

      ok: true,

      message:
        'Đã cập nhật nguyên liệu ' +
        master.maNguyenLieu +
        ' - ' +
        master.tenNguyenLieu +
        '.',

      item:
        savedItem || null

    };


  } finally {

    lock.releaseLock();

  }

}


// ============================================================
// CẬP NHẬT TOÀN BỘ
// ============================================================

function masterPM_updateData(
  rows
) {

  if (!Array.isArray(rows)) {

    throw new Error(
      'Dữ liệu cập nhật không hợp lệ.'
    );

  }


  const lock =
    LockService.getScriptLock();


  lock.waitLock(30000);


  try {

    // ========================================================
    // MASTER MỚI NHẤT
    // ========================================================

    const nguyenLieuList =
      masterPM_getNguyenLieuData_();


    const masterMap = {};


    nguyenLieuList.forEach(
      nl => {

        masterMap[
          masterPM_normalizeKey_(
            nl.maNguyenLieu
          )
        ] =
          nl;

      }
    );


    // ========================================================
    // MAP CLIENT
    // ========================================================

    const clientMap = {};


    rows.forEach(
      item => {

        const key =
          masterPM_normalizeKey_(
            item.maNguyenLieu
          );


        if (
          key &&
          masterMap[key]
        ) {

          clientMap[key] =
            item;

        }

      }
    );


    // ========================================================
    // SHEET XNK
    // ========================================================

    const sheet =
      masterPM_getXNKSheet_();


    const headerMap =
      masterPM_getHeaderMap_(
        sheet
      );


    masterPM_validateXNKHeaders_(
      headerMap
    );


    const lastColumn =
      sheet.getLastColumn();


    const oldLastRow =
      sheet.getLastRow();


    let oldValues = [];


    if (oldLastRow >= 2) {

      oldValues =
        sheet
          .getRange(
            2,
            1,
            oldLastRow - 1,
            lastColumn
          )
          .getValues();

    }


    const oldMap = {};


    oldValues.forEach(
      row => {

        const key =
          masterPM_normalizeKey_(
            row[
              headerMap.maNguyenLieu - 1
            ]
          );


        if (key) {

          oldMap[key] =
            row;

        }

      }
    );


    // ========================================================
    // OUTPUT
    // ========================================================

    const outputRows = [];


    nguyenLieuList.forEach(
      nl => {

        const key =
          masterPM_normalizeKey_(
            nl.maNguyenLieu
          );


        const client =
          clientMap[key] || {};


        const old =
          oldMap[key] || null;


        const output =
          old
            ? old.slice()
            : new Array(
                lastColumn
              ).fill('');


        // 4 cột master

        output[
          headerMap.maNguyenLieu - 1
        ] =
          nl.maNguyenLieu;


        output[
          headerMap.MaKeToan - 1
        ] =
          nl.MaKeToan;


        output[
          headerMap.tenNguyenLieu - 1
        ] =
          nl.tenNguyenLieu;


        output[
          headerMap.donViKho - 1
        ] =
          nl.donViKho;


        // Cột Phòng mua

        MASTER_PM_CONFIG
          .HEADERS
          .forEach(
            header => {

              if (
                MASTER_PM_CONFIG
                  .LOCKED_HEADERS
                  .includes(header)
              ) {

                return;

              }


              output[
                headerMap[header] - 1
              ] =
                client[header] ?? '';

            }
          );


        outputRows.push(
          output
        );

      }
    );


    // ========================================================
    // XÓA DATA CŨ
    // ========================================================

    if (oldLastRow >= 2) {

      sheet
        .getRange(
          2,
          1,
          oldLastRow - 1,
          lastColumn
        )
        .clearContent();

    }


    // ========================================================
    // GHI DATA
    // ========================================================

    if (outputRows.length) {

      sheet
        .getRange(
          2,
          1,
          outputRows.length,
          lastColumn
        )
        .setValues(
          outputRows
        );

    }


    SpreadsheetApp.flush();


    const refreshed =
      masterPM_getData();


    return {

      ok: true,

      message:
        'Đã cập nhật dữ liệu Phòng mua cho ' +
        outputRows.length +
        ' nguyên liệu.',

      data:
        refreshed.data

    };


  } finally {

    lock.releaseLock();

  }

}
