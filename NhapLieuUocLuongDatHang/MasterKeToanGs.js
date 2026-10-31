// ============================================================
// DMG MASTER DATA - MODULE KẾ TOÁN / SẢN PHẨM
// ============================================================

// DÁN ID FILE GOOGLE SHEET CHỨA SHEET "SanPham" VÀO ĐÂY.
const sheet_ID_SaPham = '1eYabwzrO_ceaMfsgBkjdHs0tgPJqMimwcX-l6EeniCQ';

const MASTER_KT_CONFIG = {
  SHEET_NAME: 'SanPham',
  HEADERS: [
    'nhomSanPham','maSanPham','MaKeToanTP','tenSanPham',
    'donViSKU','quyCachMacDinh','trangThai','ghiChu'
  ]
};

function masterKT_getSpreadsheet_() {
  const id = String(sheet_ID_SaPham || '').trim();
  if (!id || id === 'DÁN_SHEET_ID_SaPham_VÀO_ĐÂY') {
    throw new Error('Bạn chưa khai báo sheet_ID_SaPham trong MasterKeToanGs.gs.');
  }
  return SpreadsheetApp.openById(id);
}

function masterKT_getSheet_() {
  const sheet = masterKT_getSpreadsheet_().getSheetByName(MASTER_KT_CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('Không tìm thấy sheet "SanPham".');
  return sheet;
}

function masterKT_getHeaderMap_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) return {};
  const headers = sheet.getRange(1,1,1,lastColumn).getDisplayValues()[0];
  const map = {};
  headers.forEach((h,i) => {
    h = String(h || '').trim();
    if (h) map[h] = i + 1;
  });
  return map;
}

function masterKT_validateHeaders_(map) {
  const missing = MASTER_KT_CONFIG.HEADERS.filter(h => !map[h]);
  if (missing.length) throw new Error('Sheet SanPham thiếu cột: ' + missing.join(', '));
}

function masterKT_key_(v) {
  return String(v || '').trim().toUpperCase();
}

function masterKT_getRows_() {
  const sheet = masterKT_getSheet_();
  const map = masterKT_getHeaderMap_(sheet);
  masterKT_validateHeaders_(map);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2,1,lastRow-1,sheet.getLastColumn()).getDisplayValues();
  return values.map((r,i) => {
    const o = {__rowNumber:i+2};
    MASTER_KT_CONFIG.HEADERS.forEach(h => o[h] = r[map[h]-1] ?? '');
    return o;
  }).filter(o => MASTER_KT_CONFIG.HEADERS.some(h => String(o[h] || '').trim()));
}

function masterKT_getData() {
  const rows = masterKT_getRows_();
  const unique = field => [...new Set(rows.map(r => String(r[field] || '').trim()).filter(Boolean))]
    .sort((a,b) => a.localeCompare(b,'vi'));
  return {
    ok:true,
    rows,
    dropdowns:{
      nhomSanPham:unique('nhomSanPham'),
      donViSKU:unique('donViSKU'),
      trangThai:unique('trangThai')
    }
  };
}

function masterKT_saveProduct(record) {
  record = record || {};
  const maSanPham = String(record.maSanPham || '').trim();
  const tenSanPham = String(record.tenSanPham || '').trim();
  if (!maSanPham) throw new Error('Vui lòng nhập Mã sản phẩm.');
  if (!tenSanPham) throw new Error('Vui lòng nhập Tên sản phẩm.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = masterKT_getSheet_();
    const map = masterKT_getHeaderMap_(sheet);
    masterKT_validateHeaders_(map);
    const rowNumber = Number(record.__rowNumber || 0);
    const lastRow = sheet.getLastRow();

    if (lastRow >= 2) {
      const codes = sheet.getRange(2,map.maSanPham,lastRow-1,1).getDisplayValues();
      for (let i=0;i<codes.length;i++) {
        if (masterKT_key_(codes[i][0]) === masterKT_key_(maSanPham) && i+2 !== rowNumber) {
          throw new Error('Mã sản phẩm "' + maSanPham + '" đã tồn tại.');
        }
      }
    }

    const lastColumn = sheet.getLastColumn();
    const isEdit = rowNumber >= 2 && rowNumber <= lastRow;
    const output = isEdit
      ? sheet.getRange(rowNumber,1,1,lastColumn).getValues()[0]
      : new Array(lastColumn).fill('');

    MASTER_KT_CONFIG.HEADERS.forEach(h => output[map[h]-1] = record[h] ?? '');

    if (isEdit) sheet.getRange(rowNumber,1,1,lastColumn).setValues([output]);
    else sheet.getRange(lastRow+1,1,1,lastColumn).setValues([output]);

    SpreadsheetApp.flush();
    return {
      ok:true,
      message:isEdit ? 'Đã cập nhật sản phẩm.' : 'Đã thêm sản phẩm mới.',
      data:masterKT_getData()
    };
  } finally {
    lock.releaseLock();
  }
}

function masterKT_deleteProduct(rowNumber) {
  rowNumber = Number(rowNumber || 0);
  if (rowNumber < 2) throw new Error('Dòng cần xóa không hợp lệ.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = masterKT_getSheet_();
    if (rowNumber > sheet.getLastRow()) throw new Error('Không tìm thấy sản phẩm cần xóa.');
    sheet.deleteRow(rowNumber);
    SpreadsheetApp.flush();
    return {ok:true,message:'Đã xóa sản phẩm.',data:masterKT_getData()};
  } finally {
    lock.releaseLock();
  }
}
