// ============================================================
// DMG MASTER DATA
// MODULE: KHO
//
// FILE KHO: nhập SHEET ID riêng ở đây
//
// CARD 1: KhoNguyenLieu
// CARD 2: NguyenLieu
// ============================================================


// ============================================================
// NHẬP SHEET ID KHO TẠI ĐÂY
// ============================================================

const MASTER_KHO_SHEET_ID = '1yFlCpC6JzLRmv9hukNw05vYpeYmkhXRcPC-0nCNOjAQ';


// ============================================================
// CONFIG
// ============================================================

const MASTER_KHO_CONFIG = {

  SHEET_TON_KHO: 'KhoNguyenLieu',

  SHEET_NGUYEN_LIEU: 'NguyenLieu',


  TON_KHO_HEADERS: [

    'Id',
    'maNguyenLieu',
    'tenNguyenLieu',
    'khoiLuongNhap',
    'donVi',
    'quyCachDongGoi',
    'LotNo',
    'ngaySanXuat',
    'hanSuDung',
    'nhaCungCap',
    'ngayNhap',
    'trangThai',
    'nguoiPheDuyetChatLuong',
    'ngayPheDuyet',
    'anhChatLuong',
    'trangThaiNguyenLieu',
    'loaiNguyenLieu',
    'MaKeToan',
    'heSoQuyDoiKho',
    'doViTinhToan'

  ],


  NGUYEN_LIEU_HEADERS: [

    'maNguyenLieu',
    'tenNguyenLieu',
    'nhaCungCap1',
    'nhaCungCap2',
    'nhaCungCap3',
    'MaKeToan',
    'loaiNguyenLieu',
    'donViKho',
    'quyCachDatHang',
    'tonAnToan',
    'soNgayVeKhoMacDinh',
    'nhaCungCapChinh',
    'trangThai',
    'ghiChu',
    'heSoQuyDoiKho',
    'doViTinhToan'

  ]

};


// ============================================================
// OPEN FILE KHO
// ============================================================

function masterKho_getSpreadsheet_() {

  if (
    !MASTER_KHO_SHEET_ID ||
    MASTER_KHO_SHEET_ID ===
      'NHAP_SHEET_ID_KHO_VAO_DAY'
  ) {

    throw new Error(
      'Bạn chưa nhập MASTER_KHO_SHEET_ID trong file MasterKho.gs.'
    );

  }


  return SpreadsheetApp.openById(
    MASTER_KHO_SHEET_ID
  );

}


// ============================================================
// GET SHEET
// ============================================================

function masterKho_getSheet_(
  sheetName
) {

  const ss =
    masterKho_getSpreadsheet_();


  const sheet =
    ss.getSheetByName(
      sheetName
    );


  if (!sheet) {

    throw new Error(
      'Không tìm thấy sheet "' +
      sheetName +
      '" trong file Kho.'
    );

  }


  return sheet;

}


// ============================================================
// HEADER MAP
// ============================================================

function masterKho_getHeaderMap_(
  sheet
) {

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
// VALIDATE HEADER
// ============================================================

function masterKho_validateHeaders_(
  headerMap,
  requiredHeaders,
  sheetName
) {

  const missing =
    requiredHeaders.filter(
      header =>
        !headerMap[header]
    );


  if (missing.length) {

    throw new Error(
      'Sheet "' +
      sheetName +
      '" thiếu cột: ' +
      missing.join(', ')
    );

  }

}


// ============================================================
// NORMALIZE KEY
// ============================================================

function masterKho_normalizeKey_(
  value
) {

  return String(
    value ?? ''
  )
    .trim()
    .toUpperCase();

}


// ============================================================
// HÀM ĐỌC SHEET CHUNG
// ============================================================

function masterKho_readSheet_(
  sheetName,
  headers
) {

  const sheet =
    masterKho_getSheet_(
      sheetName
    );


  const headerMap =
    masterKho_getHeaderMap_(
      sheet
    );


  masterKho_validateHeaders_(
    headerMap,
    headers,
    sheetName
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
    (row, index) => {

      const item = {

        _row:
          index + 2

      };


      headers.forEach(
        header => {

          item[header] =
            row[
              headerMap[header] - 1
            ] ?? '';

        }
      );


      const hasData =
        headers.some(
          header =>
            String(
              item[header] ?? ''
            ).trim() !== ''
        );


      if (hasData) {

        result.push(
          item
        );

      }

    }
  );


  return result;

}


// ============================================================
// CARD 1
// LOAD KhoNguyenLieu
// ============================================================

function masterKho_getTonKhoData() {

  const data =
    masterKho_readSheet_(

      MASTER_KHO_CONFIG
        .SHEET_TON_KHO,

      MASTER_KHO_CONFIG
        .TON_KHO_HEADERS

    );


  return {

    ok: true,

    headers:
      MASTER_KHO_CONFIG
        .TON_KHO_HEADERS,

    total:
      data.length,

    data:
      data

  };

}


// ============================================================
// CARD 2
// LOAD NguyenLieu
// ============================================================

function masterKho_getNguyenLieuData() {

  const data =
    masterKho_readSheet_(

      MASTER_KHO_CONFIG
        .SHEET_NGUYEN_LIEU,

      MASTER_KHO_CONFIG
        .NGUYEN_LIEU_HEADERS

    );


  return {

    ok: true,

    headers:
      MASTER_KHO_CONFIG
        .NGUYEN_LIEU_HEADERS,

    total:
      data.length,

    data:
      data

  };

}


// ============================================================
// UPDATE 1 DÒNG - HÀM CHUNG
// ============================================================

function masterKho_updateOne_(
  sheetName,
  headers,
  keyHeader,
  item
) {

  if (!item) {

    throw new Error(
      'Dữ liệu cập nhật không hợp lệ.'
    );

  }


  const key =
    masterKho_normalizeKey_(
      item[keyHeader]
    );


  if (!key) {

    throw new Error(
      'Không xác định được ' +
      keyHeader +
      '.'
    );

  }


  const lock =
    LockService.getScriptLock();


  lock.waitLock(30000);


  try {

    const sheet =
      masterKho_getSheet_(
        sheetName
      );


    const headerMap =
      masterKho_getHeaderMap_(
        sheet
      );


    masterKho_validateHeaders_(
      headerMap,
      headers,
      sheetName
    );


    const lastRow =
      sheet.getLastRow();


    if (lastRow < 2) {

      throw new Error(
        'Sheet "' +
        sheetName +
        '" chưa có dữ liệu.'
      );

    }


    // ========================================================
    // TÌM DÒNG THEO KEY
    // ========================================================

    const keyValues =
      sheet
        .getRange(
          2,
          headerMap[keyHeader],
          lastRow - 1,
          1
        )
        .getDisplayValues();


    let targetRow = 0;


    for (
      let i = 0;
      i < keyValues.length;
      i++
    ) {

      const currentKey =
        masterKho_normalizeKey_(
          keyValues[i][0]
        );


      if (
        currentKey === key
      ) {

        targetRow =
          i + 2;

        break;

      }

    }


    if (!targetRow) {

      throw new Error(
        'Không tìm thấy ' +
        keyHeader +
        ' = "' +
        item[keyHeader] +
        '" trong sheet "' +
        sheetName +
        '".'
      );

    }


    // ========================================================
    // GIỮ CÁC CỘT KHÔNG THUỘC MODULE
    // ========================================================

    const lastColumn =
      sheet.getLastColumn();


    const output =
      sheet
        .getRange(
          targetRow,
          1,
          1,
          lastColumn
        )
        .getValues()[0];


    // ========================================================
    // UPDATE CÁC CỘT QUẢN LÝ
    // ========================================================

    headers.forEach(
      header => {

        // Không cho đổi khóa

        if (
          header === keyHeader
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
    // GHI
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


    return {

      ok: true,

      message:
        'Đã cập nhật dữ liệu.',

      key:
        item[keyHeader]

    };


  } finally {

    lock.releaseLock();

  }

}


// ============================================================
// CARD 1
// UPDATE 1 DÒNG TỒN KHO
// KEY = Id
// ============================================================

function masterKho_updateTonKhoOne(
  item
) {

  const result =
    masterKho_updateOne_(

      MASTER_KHO_CONFIG
        .SHEET_TON_KHO,

      MASTER_KHO_CONFIG
        .TON_KHO_HEADERS,

      'Id',

      item

    );


  result.message =
    'Đã cập nhật tồn kho: ' +
    (
      item.tenNguyenLieu ||
      item.Id
    ) +
    '.';


  return result;

}


// ============================================================
// CARD 2
// UPDATE 1 NGUYÊN LIỆU
// KEY = maNguyenLieu
// ============================================================

function masterKho_updateNguyenLieuOne(
  item
) {

  const result =
    masterKho_updateOne_(

      MASTER_KHO_CONFIG
        .SHEET_NGUYEN_LIEU,

      MASTER_KHO_CONFIG
        .NGUYEN_LIEU_HEADERS,

      'maNguyenLieu',

      item

    );


  result.message =
    'Đã cập nhật nguyên liệu: ' +
    item.maNguyenLieu +
    ' - ' +
    (
      item.tenNguyenLieu ||
      ''
    ) +
    '.';


  return result;

}


// ============================================================
// UPDATE TẤT CẢ - HÀM CHUNG
// ============================================================
//
// Không xóa / ghi lại toàn sheet.
//
// Mỗi dòng được tìm bằng key rồi cập nhật.
// Như vậy nếu sheet có thay đổi thứ tự dòng,
// vẫn cập nhật đúng bản ghi.
// ============================================================

function masterKho_updateAll_(
  sheetName,
  headers,
  keyHeader,
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

    const sheet =
      masterKho_getSheet_(
        sheetName
      );


    const headerMap =
      masterKho_getHeaderMap_(
        sheet
      );


    masterKho_validateHeaders_(
      headerMap,
      headers,
      sheetName
    );


    const lastRow =
      sheet.getLastRow();


    if (lastRow < 2) {

      throw new Error(
        'Sheet "' +
        sheetName +
        '" chưa có dữ liệu.'
      );

    }


    const lastColumn =
      sheet.getLastColumn();


    const currentValues =
      sheet
        .getRange(
          2,
          1,
          lastRow - 1,
          lastColumn
        )
        .getValues();


    // ========================================================
    // MAP KEY → INDEX ARRAY
    // ========================================================

    const rowIndexMap = {};


    currentValues.forEach(
      (row, index) => {

        const key =
          masterKho_normalizeKey_(
            row[
              headerMap[keyHeader] - 1
            ]
          );


        if (key) {

          rowIndexMap[key] =
            index;

        }

      }
    );


    let updated = 0;


    rows.forEach(
      item => {

        const key =
          masterKho_normalizeKey_(
            item[keyHeader]
          );


        if (
          !key ||
          rowIndexMap[key] ===
            undefined
        ) {

          return;

        }


        const arrayIndex =
          rowIndexMap[key];


        const output =
          currentValues[
            arrayIndex
          ];


        headers.forEach(
          header => {

            if (
              header === keyHeader
            ) {

              return;

            }


            output[
              headerMap[header] - 1
            ] =
              item[header] ?? '';

          }
        );


        updated++;

      }
    );


    // ========================================================
    // GHI LẠI DATA
    // ========================================================

    sheet
      .getRange(
        2,
        1,
        currentValues.length,
        lastColumn
      )
      .setValues(
        currentValues
      );


    SpreadsheetApp.flush();


    return {

      ok: true,

      updated:
        updated

    };


  } finally {

    lock.releaseLock();

  }

}


// ============================================================
// CARD 1
// UPDATE TẤT CẢ TỒN KHO
// ============================================================

function masterKho_updateTonKhoAll(
  rows
) {

  const result =
    masterKho_updateAll_(

      MASTER_KHO_CONFIG
        .SHEET_TON_KHO,

      MASTER_KHO_CONFIG
        .TON_KHO_HEADERS,

      'Id',

      rows

    );


  result.message =
    'Đã cập nhật ' +
    result.updated +
    ' dòng tồn kho.';


  return result;

}


// ============================================================
// CARD 2
// UPDATE TẤT CẢ NGUYÊN LIỆU
// ============================================================

function masterKho_updateNguyenLieuAll(
  rows
) {

  const result =
    masterKho_updateAll_(

      MASTER_KHO_CONFIG
        .SHEET_NGUYEN_LIEU,

      MASTER_KHO_CONFIG
        .NGUYEN_LIEU_HEADERS,

      'maNguyenLieu',

      rows

    );


  result.message =
    'Đã cập nhật ' +
    result.updated +
    ' nguyên liệu.';


  return result;

}


// ============================================================
// CARD 2 - THÊM MỚI NGUYÊN LIỆU
// ============================================================
function masterKho_addNguyenLieu(item) {
  if (!item) throw new Error('Dữ liệu nguyên liệu không hợp lệ.');

  const maNguyenLieu = String(item.maNguyenLieu || '').trim();
  const tenNguyenLieu = String(item.tenNguyenLieu || '').trim();

  if (!maNguyenLieu) throw new Error('Vui lòng nhập maNguyenLieu.');
  if (!tenNguyenLieu) throw new Error('Vui lòng nhập tenNguyenLieu.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = masterKho_getSheet_(MASTER_KHO_CONFIG.SHEET_NGUYEN_LIEU);
    const headerMap = masterKho_getHeaderMap_(sheet);

    masterKho_validateHeaders_(
      headerMap,
      MASTER_KHO_CONFIG.NGUYEN_LIEU_HEADERS,
      MASTER_KHO_CONFIG.SHEET_NGUYEN_LIEU
    );

    const lastRow = sheet.getLastRow();

    if (lastRow >= 2) {
      const keys = sheet.getRange(
        2, headerMap.maNguyenLieu, lastRow - 1, 1
      ).getDisplayValues();

      const newKey = masterKho_normalizeKey_(maNguyenLieu);

      if (keys.some(r => masterKho_normalizeKey_(r[0]) === newKey)) {
        throw new Error('maNguyenLieu "' + maNguyenLieu + '" đã tồn tại.');
      }
    }

    const output = new Array(sheet.getLastColumn()).fill('');

    MASTER_KHO_CONFIG.NGUYEN_LIEU_HEADERS.forEach(header => {
      output[headerMap[header] - 1] = item[header] ?? '';
    });

    sheet.getRange(
      lastRow + 1, 1, 1, output.length
    ).setValues([output]);

    SpreadsheetApp.flush();

    return {
      ok: true,
      message: 'Đã thêm nguyên liệu mới: ' +
        maNguyenLieu + ' - ' + tenNguyenLieu + '.'
    };
  } finally {
    lock.releaseLock();
  }
}
