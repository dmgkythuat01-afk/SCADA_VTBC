// ============================================================
// DMG MASTER DATA
// MASTER PHÒNG BÁN
// ============================================================
//
// Sử dụng:
// - Sheet DanhMuc
// - Sheet KhachHangVaSanPham
//
// DanhMuc cần có:
//   khachHang
//
// KhachHangVaSanPham cần có:
//   khachHang
//   nhomSanPham
//   maSanPham
//   MaKeToanTP
//   tenSanPham
//
// Nguồn danh sách sản phẩm:
// - Tự dò sheet có các cột:
//   nhomSanPham
//   maSanPham
//   MaKeToanTP
//   tenSanPham
//
// ============================================================


// ============================================================
// 1. CẤU HÌNH
// ============================================================

const MASTER_PHONG_BAN_CONFIG = {

  SHEET_DANH_MUC:
    'DanhMuc',

  SHEET_KHACH_HANG_SAN_PHAM:
    'KhachHangVaSanPham'

};


// ============================================================
// 2. HÀM HỖ TRỢ
// ============================================================

function masterPB_getSheet_(sheetName) {

  const ss =
    getMasterSpreadsheet_();

  const sheet =
    ss.getSheetByName(sheetName);

  if (!sheet) {

    throw new Error(
      'Không tìm thấy sheet "' +
      sheetName +
      '".'
    );

  }

  return sheet;
}


// ------------------------------------------------------------
// Chuẩn hóa chuỗi để so sánh
// ------------------------------------------------------------

function masterPB_normalize_(value) {

  return String(value || '')
    .trim()
    .toLowerCase();
}


// ------------------------------------------------------------
// Lấy header map
// ------------------------------------------------------------

function masterPB_getHeaderMap_(sheet) {

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
        String(header || '').trim();

      if (key) {

        map[key] =
          index + 1;

      }

    }
  );

  return map;
}


// ------------------------------------------------------------
// Kiểm tra cột bắt buộc
// ------------------------------------------------------------

function masterPB_requireColumns_(
  headerMap,
  columns,
  sheetName
) {

  const missing =
    columns.filter(
      column =>
        !headerMap[column]
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


// ------------------------------------------------------------
// Đọc sheet thành object
// ------------------------------------------------------------

function masterPB_getObjects_(sheetName) {

  const sheet =
    masterPB_getSheet_(sheetName);

  const lastRow =
    sheet.getLastRow();

  const lastColumn =
    sheet.getLastColumn();

  if (
    lastRow < 2 ||
    lastColumn < 1
  ) {

    return [];

  }

  const values =
    sheet
      .getRange(
        1,
        1,
        lastRow,
        lastColumn
      )
      .getDisplayValues();

  const headers =
    values[0].map(
      value =>
        String(value || '').trim()
    );

  return values
    .slice(1)
    .map(
      (row, rowIndex) => {

        const obj = {

          _row:
            rowIndex + 2

        };

        headers.forEach(
          (header, columnIndex) => {

            if (!header) return;

            obj[header] =
              row[columnIndex];

          }
        );

        return obj;

      }
    )
    .filter(
      obj => {

        return Object.keys(obj)
          .some(
            key =>
              key !== '_row' &&
              String(
                obj[key] || ''
              ).trim() !== ''
          );

      }
    );
}


// ============================================================
// 3. KHỞI TẠO TOÀN BỘ MODULE
// ============================================================

function masterPB_getInitData() {

  return {

    ok: true,

    khachHang:
      masterPB_getKhachHang(),

    sanPham:
      masterPB_getDanhMucSanPham(),

    khachHangSanPham:
      masterPB_getKhachHangSanPham()

  };

}


// ============================================================
// 4. KHÁCH HÀNG - SHEET DANHMUC
// ============================================================

function masterPB_getKhachHang() {

  const sheet =
    masterPB_getSheet_(
      MASTER_PHONG_BAN_CONFIG
        .SHEET_DANH_MUC
    );

  const headerMap =
    masterPB_getHeaderMap_(
      sheet
    );

  masterPB_requireColumns_(
    headerMap,
    ['khachHang'],
    MASTER_PHONG_BAN_CONFIG
      .SHEET_DANH_MUC
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
        headerMap.khachHang,
        lastRow - 1,
        1
      )
      .getDisplayValues()
      .flat();

  const unique = [];

  const seen =
    new Set();

  values.forEach(
    value => {

      const name =
        String(value || '').trim();

      if (!name) return;

      const key =
        masterPB_normalize_(
          name
        );

      if (seen.has(key)) {
        return;
      }

      seen.add(key);

      unique.push(name);

    }
  );

  return unique.sort(
    (a, b) =>
      a.localeCompare(
        b,
        'vi'
      )
  );
}


// ------------------------------------------------------------
// Thêm khách hàng
// ------------------------------------------------------------

function masterPB_addKhachHang(
  khachHang
) {

  khachHang =
    String(
      khachHang || ''
    ).trim();

  if (!khachHang) {

    return {
      ok: false,
      message:
        'Vui lòng nhập tên khách hàng.'
    };

  }

  const sheet =
    masterPB_getSheet_(
      MASTER_PHONG_BAN_CONFIG
        .SHEET_DANH_MUC
    );

  const headerMap =
    masterPB_getHeaderMap_(
      sheet
    );

  masterPB_requireColumns_(
    headerMap,
    ['khachHang'],
    MASTER_PHONG_BAN_CONFIG
      .SHEET_DANH_MUC
  );

  const customers =
    masterPB_getKhachHang();

  const exists =
    customers.some(
      item =>
        masterPB_normalize_(item) ===
        masterPB_normalize_(khachHang)
    );

  if (exists) {

    return {
      ok: false,
      message:
        'Khách hàng này đã tồn tại.'
    };

  }

  // ----------------------------------------------------------
  // Vì DanhMuc có thể có nhiều cột khác,
  // chỉ ghi vào cột khachHang.
  // ----------------------------------------------------------

  const targetRow =
    Math.max(
      sheet.getLastRow() + 1,
      2
    );

  sheet
    .getRange(
      targetRow,
      headerMap.khachHang
    )
    .setValue(
      khachHang
    );

  SpreadsheetApp.flush();

  return {

    ok: true,

    message:
      'Đã thêm khách hàng.',

    khachHang:
      masterPB_getKhachHang()

  };
}


// ------------------------------------------------------------
// Sửa khách hàng
// ------------------------------------------------------------

function masterPB_updateKhachHang(
  oldName,
  newName
) {

  oldName =
    String(
      oldName || ''
    ).trim();

  newName =
    String(
      newName || ''
    ).trim();

  if (
    !oldName ||
    !newName
  ) {

    return {
      ok: false,
      message:
        'Tên khách hàng không hợp lệ.'
    };

  }

  const oldKey =
    masterPB_normalize_(
      oldName
    );

  const newKey =
    masterPB_normalize_(
      newName
    );

  const customers =
    masterPB_getKhachHang();

  const duplicate =
    customers.some(
      item =>
        masterPB_normalize_(item) ===
          newKey &&
        masterPB_normalize_(item) !==
          oldKey
    );

  if (duplicate) {

    return {
      ok: false,
      message:
        'Tên khách hàng mới đã tồn tại.'
    };

  }


  // ==========================================================
  // A. SỬA DANHMUC
  // ==========================================================

  const dmSheet =
    masterPB_getSheet_(
      MASTER_PHONG_BAN_CONFIG
        .SHEET_DANH_MUC
    );

  const dmHeaders =
    masterPB_getHeaderMap_(
      dmSheet
    );

  masterPB_requireColumns_(
    dmHeaders,
    ['khachHang'],
    MASTER_PHONG_BAN_CONFIG
      .SHEET_DANH_MUC
  );

  const dmLastRow =
    dmSheet.getLastRow();

  let updated =
    false;

  if (dmLastRow >= 2) {

    const range =
      dmSheet.getRange(
        2,
        dmHeaders.khachHang,
        dmLastRow - 1,
        1
      );

    const values =
      range.getValues();

    values.forEach(
      row => {

        if (
          masterPB_normalize_(
            row[0]
          ) === oldKey
        ) {

          row[0] =
            newName;

          updated =
            true;

        }

      }
    );

    if (updated) {

      range.setValues(
        values
      );

    }

  }

  if (!updated) {

    return {
      ok: false,
      message:
        'Không tìm thấy khách hàng cần sửa.'
    };

  }


  // ==========================================================
  // B. ĐỒNG BỘ TÊN KHÁCH HÀNG SANG
  //    KhachHangVaSanPham
  // ==========================================================

  const relationSheet =
    masterPB_getSheet_(
      MASTER_PHONG_BAN_CONFIG
        .SHEET_KHACH_HANG_SAN_PHAM
    );

  const relationHeaders =
    masterPB_getHeaderMap_(
      relationSheet
    );

  masterPB_requireColumns_(
    relationHeaders,
    ['khachHang'],
    MASTER_PHONG_BAN_CONFIG
      .SHEET_KHACH_HANG_SAN_PHAM
  );

  const relationLastRow =
    relationSheet.getLastRow();

  if (relationLastRow >= 2) {

    const range =
      relationSheet.getRange(
        2,
        relationHeaders.khachHang,
        relationLastRow - 1,
        1
      );

    const values =
      range.getValues();

    let changed =
      false;

    values.forEach(
      row => {

        if (
          masterPB_normalize_(
            row[0]
          ) === oldKey
        ) {

          row[0] =
            newName;

          changed =
            true;

        }

      }
    );

    if (changed) {

      range.setValues(
        values
      );

    }

  }

  SpreadsheetApp.flush();

  return {

    ok: true,

    message:
      'Đã cập nhật khách hàng.',

    khachHang:
      masterPB_getKhachHang(),

    khachHangSanPham:
      masterPB_getKhachHangSanPham()

  };
}


// ------------------------------------------------------------
// Xóa khách hàng
// ------------------------------------------------------------

function masterPB_deleteKhachHang(
  khachHang
) {

  khachHang =
    String(
      khachHang || ''
    ).trim();

  if (!khachHang) {

    return {
      ok: false,
      message:
        'Khách hàng không hợp lệ.'
    };

  }

  const key =
    masterPB_normalize_(
      khachHang
    );


  // Không cho xóa nếu đang được sử dụng
  // trong KhachHangVaSanPham.

  const relations =
    masterPB_getKhachHangSanPham();

  const isUsed =
    relations.some(
      item =>
        masterPB_normalize_(
          item.khachHang
        ) === key
    );

  if (isUsed) {

    return {

      ok: false,

      message:
        'Không thể xóa "' +
        khachHang +
        '" vì khách hàng đang có sản phẩm trong KhachHangVaSanPham. Hãy xóa các sản phẩm của khách hàng này trước.'

    };

  }

  const sheet =
    masterPB_getSheet_(
      MASTER_PHONG_BAN_CONFIG
        .SHEET_DANH_MUC
    );

  const headerMap =
    masterPB_getHeaderMap_(
      sheet
    );

  masterPB_requireColumns_(
    headerMap,
    ['khachHang'],
    MASTER_PHONG_BAN_CONFIG
      .SHEET_DANH_MUC
  );

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {

    return {
      ok: false,
      message:
        'Không có dữ liệu để xóa.'
    };

  }

  const values =
    sheet
      .getRange(
        2,
        headerMap.khachHang,
        lastRow - 1,
        1
      )
      .getDisplayValues()
      .flat();

  let foundRow =
    0;

  values.some(
    (value, index) => {

      if (
        masterPB_normalize_(
          value
        ) === key
      ) {

        foundRow =
          index + 2;

        return true;

      }

      return false;

    }
  );

  if (!foundRow) {

    return {
      ok: false,
      message:
        'Không tìm thấy khách hàng.'
    };

  }

  // Chỉ xóa nội dung cột khachHang.
  // KHÔNG deleteRow vì DanhMuc có thể có cột danh mục khác.

  sheet
    .getRange(
      foundRow,
      headerMap.khachHang
    )
    .clearContent();

  SpreadsheetApp.flush();

  return {

    ok: true,

    message:
      'Đã xóa khách hàng.',

    khachHang:
      masterPB_getKhachHang()

  };
}


// ============================================================
// 5. DANH MỤC SẢN PHẨM
// ============================================================
//
// Để không bắt buộc tên sheet,
// hàm tìm sheet có đủ 4 header:
//
// nhomSanPham
// maSanPham
// MaKeToanTP
// tenSanPham
//
// Nếu hệ thống của bạn có nhiều sheet cùng cấu trúc,
// có thể đổi sang tên sheet cố định sau.
//
// ============================================================

function masterPB_findProductSheet_() {

  const ss =
    getMasterSpreadsheet_();

  const required = [
    'nhomSanPham',
    'maSanPham',
    'MaKeToanTP',
    'tenSanPham'
  ];

  const excluded = [
    MASTER_PHONG_BAN_CONFIG
      .SHEET_KHACH_HANG_SAN_PHAM
  ];

  const sheets =
    ss.getSheets();

  for (
    let i = 0;
    i < sheets.length;
    i++
  ) {

    const sheet =
      sheets[i];

    if (
      excluded.includes(
        sheet.getName()
      )
    ) {

      continue;

    }

    const headers =
      masterPB_getHeaderMap_(
        sheet
      );

    const ok =
      required.every(
        column =>
          !!headers[column]
      );

    if (ok) {

      return sheet;

    }

  }

  throw new Error(
    'Không tìm thấy sheet danh mục sản phẩm có đủ các cột: ' +
    required.join(', ')
  );
}


// ------------------------------------------------------------
// Lấy sản phẩm
// ------------------------------------------------------------

function masterPB_getDanhMucSanPham() {

  const sheet =
    masterPB_findProductSheet_();

  const headerMap =
    masterPB_getHeaderMap_(
      sheet
    );

  const required = [
    'nhomSanPham',
    'maSanPham',
    'MaKeToanTP',
    'tenSanPham'
  ];

  masterPB_requireColumns_(
    headerMap,
    required,
    sheet.getName()
  );

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {

    return [];

  }

  const lastColumn =
    sheet.getLastColumn();

  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        lastColumn
      )
      .getDisplayValues();

  const result = [];

  const seen =
    new Set();

  values.forEach(
    row => {

      const item = {

        nhomSanPham:
          String(
            row[
              headerMap.nhomSanPham - 1
            ] || ''
          ).trim(),

        maSanPham:
          String(
            row[
              headerMap.maSanPham - 1
            ] || ''
          ).trim(),

        MaKeToanTP:
          String(
            row[
              headerMap.MaKeToanTP - 1
            ] || ''
          ).trim(),

        tenSanPham:
          String(
            row[
              headerMap.tenSanPham - 1
            ] || ''
          ).trim()

      };

      if (!item.tenSanPham) {
        return;
      }

      const key =
        [
          item.nhomSanPham,
          item.maSanPham,
          item.MaKeToanTP,
          item.tenSanPham
        ]
        .map(
          masterPB_normalize_
        )
        .join('|');

      if (seen.has(key)) {
        return;
      }

      seen.add(key);

      result.push(item);

    }
  );

  result.sort(
    (a, b) => {

      const groupCompare =
        a.nhomSanPham.localeCompare(
          b.nhomSanPham,
          'vi'
        );

      if (groupCompare !== 0) {
        return groupCompare;
      }

      return a.tenSanPham.localeCompare(
        b.tenSanPham,
        'vi'
      );

    }
  );

  return result;
}


// ============================================================
// 6. KHÁCH HÀNG & SẢN PHẨM
// ============================================================

function masterPB_getKhachHangSanPham() {

  const sheet =
    masterPB_getSheet_(
      MASTER_PHONG_BAN_CONFIG
        .SHEET_KHACH_HANG_SAN_PHAM
    );

  const headerMap =
    masterPB_getHeaderMap_(
      sheet
    );

  const required = [

    'khachHang',
    'nhomSanPham',
    'maSanPham',
    'MaKeToanTP',
    'tenSanPham'

  ];

  masterPB_requireColumns_(
    headerMap,
    required,
    MASTER_PHONG_BAN_CONFIG
      .SHEET_KHACH_HANG_SAN_PHAM
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

        rowNumber:
          index + 2,

        khachHang:
          String(
            row[
              headerMap.khachHang - 1
            ] || ''
          ).trim(),

        nhomSanPham:
          String(
            row[
              headerMap.nhomSanPham - 1
            ] || ''
          ).trim(),

        maSanPham:
          String(
            row[
              headerMap.maSanPham - 1
            ] || ''
          ).trim(),

        MaKeToanTP:
          String(
            row[
              headerMap.MaKeToanTP - 1
            ] || ''
          ).trim(),

        tenSanPham:
          String(
            row[
              headerMap.tenSanPham - 1
            ] || ''
          ).trim()

      };

      if (
        !item.khachHang &&
        !item.tenSanPham
      ) {

        return;

      }

      result.push(item);

    }
  );

  return result;
}


// ------------------------------------------------------------
// Lưu nhiều dòng
// ------------------------------------------------------------

function masterPB_saveKhachHangSanPham(
  items
) {

  if (
    !Array.isArray(items) ||
    !items.length
  ) {

    return {
      ok: false,
      message:
        'Chưa có sản phẩm nào trong danh sách chờ.'
    };

  }

  const sheet =
    masterPB_getSheet_(
      MASTER_PHONG_BAN_CONFIG
        .SHEET_KHACH_HANG_SAN_PHAM
    );

  const headerMap =
    masterPB_getHeaderMap_(
      sheet
    );

  const required = [

    'khachHang',
    'nhomSanPham',
    'maSanPham',
    'MaKeToanTP',
    'tenSanPham'

  ];

  masterPB_requireColumns_(
    headerMap,
    required,
    MASTER_PHONG_BAN_CONFIG
      .SHEET_KHACH_HANG_SAN_PHAM
  );

  const existing =
    masterPB_getKhachHangSanPham();

  const existingKeys =
    new Set(
      existing.map(
        item =>
          masterPB_normalize_(
            item.khachHang
          ) +
          '|' +
          masterPB_normalize_(
            item.maSanPham
          ) +
          '|' +
          masterPB_normalize_(
            item.MaKeToanTP
          )
      )
    );

  const validItems = [];

  const batchKeys =
    new Set();

  items.forEach(
    item => {

      const clean = {

        khachHang:
          String(
            item.khachHang || ''
          ).trim(),

        nhomSanPham:
          String(
            item.nhomSanPham || ''
          ).trim(),

        maSanPham:
          String(
            item.maSanPham || ''
          ).trim(),

        MaKeToanTP:
          String(
            item.MaKeToanTP || ''
          ).trim(),

        tenSanPham:
          String(
            item.tenSanPham || ''
          ).trim()

      };

      if (
        !clean.khachHang ||
        !clean.tenSanPham
      ) {

        return;

      }

      const key =
        masterPB_normalize_(
          clean.khachHang
        ) +
        '|' +
        masterPB_normalize_(
          clean.maSanPham
        ) +
        '|' +
        masterPB_normalize_(
          clean.MaKeToanTP
        );

      if (
        existingKeys.has(key) ||
        batchKeys.has(key)
      ) {

        return;

      }

      batchKeys.add(key);

      validItems.push(clean);

    }
  );

  if (!validItems.length) {

    return {
      ok: false,
      message:
        'Các sản phẩm đã tồn tại hoặc dữ liệu chưa hợp lệ.'
    };

  }


  // Ghi theo đúng vị trí header
  // để sau này đổi thứ tự cột vẫn chạy.

  const startRow =
    sheet.getLastRow() + 1;

  const lastColumn =
    sheet.getLastColumn();

  const rows =
    validItems.map(
      item => {

        const row =
          new Array(
            lastColumn
          ).fill('');

        required.forEach(
          field => {

            row[
              headerMap[field] - 1
            ] =
              item[field];

          }
        );

        return row;

      }
    );

  sheet
    .getRange(
      startRow,
      1,
      rows.length,
      lastColumn
    )
    .setValues(
      rows
    );

  SpreadsheetApp.flush();

  return {

    ok: true,

    message:
      'Đã lưu ' +
      validItems.length +
      ' sản phẩm cho khách hàng.',

    khachHangSanPham:
      masterPB_getKhachHangSanPham()

  };
}


// ------------------------------------------------------------
// Xóa 1 sản phẩm khỏi khách hàng
// ------------------------------------------------------------

function masterPB_deleteKhachHangSanPham(
  khachHang,
  maSanPham,
  MaKeToanTP
) {

  const sheet =
    masterPB_getSheet_(
      MASTER_PHONG_BAN_CONFIG
        .SHEET_KHACH_HANG_SAN_PHAM
    );

  const data =
    masterPB_getKhachHangSanPham();

  const customerKey =
    masterPB_normalize_(
      khachHang
    );

  const productKey =
    masterPB_normalize_(
      maSanPham
    );

  const accountingKey =
    masterPB_normalize_(
      MaKeToanTP
    );

  const found =
    data.find(
      item =>

        masterPB_normalize_(
          item.khachHang
        ) === customerKey

        &&

        masterPB_normalize_(
          item.maSanPham
        ) === productKey

        &&

        masterPB_normalize_(
          item.MaKeToanTP
        ) === accountingKey

    );

  if (!found) {

    return {
      ok: false,
      message:
        'Không tìm thấy dòng cần xóa.'
    };

  }

  sheet.deleteRow(
    found.rowNumber
  );

  SpreadsheetApp.flush();

  return {

    ok: true,

    message:
      'Đã xóa sản phẩm.',

    khachHangSanPham:
      masterPB_getKhachHangSanPham()

  };
}
