// ============================================================
// DMG MASTER DATA - PCN
// File: MasterPCN.gs
// ============================================================

// Dán Spreadsheet ID chứa dữ liệu PCN vào đây.
const SHEET_ID_PCN = '1eYabwzrO_ceaMfsgBkjdHs0tgPJqMimwcX-l6EeniCQ';

const MASTER_PCN_CONFIG = {
  QUY_DOI_SKU: 'QuyDoiSKU',
  QUY_DOI_DON_VI: 'QuyDoiDonVi',
  DINH_LUONG: 'DinhLuong',
  SAN_PHAM: 'SanPham',
  NGUYEN_LIEU: 'NguyenLieuVatTu',
  DANH_MUC: 'DanhMuc'
};

function masterPCN_getSpreadsheet_() {
  if (!SHEET_ID_PCN || SHEET_ID_PCN === 'DÁN_SHEET_ID_PCN_VÀO_ĐÂY') {
    throw new Error('Chưa cấu hình SHEET_ID_PCN trong file MasterPCN.gs.');
  }
  return SpreadsheetApp.openById(SHEET_ID_PCN);
}

function masterPCN_getSheet_(name) {
  const sh = masterPCN_getSpreadsheet_().getSheetByName(name);
  if (!sh) throw new Error('Không tìm thấy sheet: ' + name);
  return sh;
}

function masterPCN_read_(sheetName) {
  const sh = masterPCN_getSheet_(sheetName);
  const values = sh.getDataRange().getDisplayValues();
  if (!values.length) return { headers: [], rows: [] };

  const headers = values[0].map(v => String(v || '').trim());
  const rows = values.slice(1)
    .map((row, i) => {
      const obj = { __rowNumber: i + 2 };
      headers.forEach((h, j) => {
        if (h) obj[h] = row[j] ?? '';
      });
      return obj;
    })
    .filter(row => headers.some(h => String(row[h] || '').trim() !== ''));

  return { headers, rows };
}

function masterPCN_unique_(arr) {
  return [...new Set((arr || []).map(v => String(v || '').trim()).filter(Boolean))];
}

function masterPCN_getDanhMuc_() {
  const ss = masterPCN_getSpreadsheet_();
  const sh = ss.getSheetByName(MASTER_PCN_CONFIG.DANH_MUC);
  if (!sh) return [];

  const data = masterPCN_read_(MASTER_PCN_CONFIG.DANH_MUC);
  return data.rows;
}

function masterPCN_getInitData() {
  const qdSku = masterPCN_read_(MASTER_PCN_CONFIG.QUY_DOI_SKU);
  const qdDv = masterPCN_read_(MASTER_PCN_CONFIG.QUY_DOI_DON_VI);
  const bom = masterPCN_read_(MASTER_PCN_CONFIG.DINH_LUONG);
  const sp = masterPCN_read_(MASTER_PCN_CONFIG.SAN_PHAM);
  const nl = masterPCN_read_(MASTER_PCN_CONFIG.NGUYEN_LIEU);
  const dm = masterPCN_getDanhMuc_();

  const donVi = [];
  dm.forEach(r => {
    Object.keys(r).forEach(k => {
      if (/don.?vi/i.test(k)) donVi.push(r[k]);
    });
  });
  sp.rows.forEach(r => donVi.push(r.donViSKU, r.donViKeHoach));
  nl.rows.forEach(r => donVi.push(r.donViKho, r.donVi));

  const nhomSanPham = masterPCN_unique_(
    sp.rows.map(r => r.nhomSanPham).concat(qdSku.rows.map(r => r.nhomSanPham))
  );

  const loaiNguyenLieu = masterPCN_unique_(
    nl.rows.map(r => r.loaiNguyenLieu).concat(['Nguyen lieu', 'Vat tu'])
  );

  return {
    ok: true,
    quyDoiSKU: qdSku,
    quyDoiDonVi: qdDv,
    dinhLuong: bom,
    sanPham: sp.rows,
    nguyenLieu: nl.rows,
    dropdowns: {
      donViPhoBien: masterPCN_unique_(donVi),
      nhomSanPham,
      loaiNguyenLieu
    }
  };
}

function masterPCN_findHeaderMap_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (!lastCol) return {};
  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    h = String(h || '').trim();
    if (h) map[h] = i + 1;
  });
  return map;
}

function masterPCN_saveRow_(sheetName, record, rowNumber) {
  const sh = masterPCN_getSheet_(sheetName);
  const map = masterPCN_findHeaderMap_(sh);

  if (!Object.keys(map).length) throw new Error('Sheet ' + sheetName + ' chưa có hàng tiêu đề.');

  let targetRow = Number(rowNumber || record.__rowNumber || 0);

  if (!targetRow || targetRow < 2) {
    targetRow = Math.max(sh.getLastRow() + 1, 2);
  }

  Object.keys(record).forEach(key => {
    if (key === '__rowNumber') return;
    if (!map[key]) return;
    sh.getRange(targetRow, map[key]).setValue(record[key] ?? '');
  });

  return targetRow;
}

function masterPCN_deleteRow_(sheetName, rowNumber) {
  const sh = masterPCN_getSheet_(sheetName);
  rowNumber = Number(rowNumber || 0);
  if (rowNumber < 2 || rowNumber > sh.getLastRow()) {
    throw new Error('Dòng dữ liệu không hợp lệ.');
  }
  sh.deleteRow(rowNumber);
  return true;
}

function masterPCN_saveQuyDoiSKU(record) {
  if (!record) throw new Error('Không có dữ liệu.');
  if (!String(record.maQuyDoi || '').trim()) throw new Error('Chưa có Mã quy đổi.');
  if (!String(record.maSanPham || '').trim()) throw new Error('Chưa chọn Mã sản phẩm.');

  masterPCN_saveRow_(
    MASTER_PCN_CONFIG.QUY_DOI_SKU,
    record,
    record.__rowNumber
  );

  return masterPCN_getInitData();
}

function masterPCN_deleteQuyDoiSKU(rowNumber) {
  masterPCN_deleteRow_(MASTER_PCN_CONFIG.QUY_DOI_SKU, rowNumber);
  return masterPCN_getInitData();
}

function masterPCN_saveQuyDoiDonVi(record) {
  if (!record) throw new Error('Không có dữ liệu.');
  if (!String(record.donViNguon || '').trim()) throw new Error('Chưa nhập Đơn vị nguồn.');
  if (!String(record.donViDich || '').trim()) throw new Error('Chưa nhập Đơn vị đích.');
  if (record.heSoQuyDoi === '' || record.heSoQuyDoi == null) throw new Error('Chưa nhập Hệ số quy đổi.');

  masterPCN_saveRow_(
    MASTER_PCN_CONFIG.QUY_DOI_DON_VI,
    record,
    record.__rowNumber
  );

  return masterPCN_getInitData();
}

function masterPCN_deleteQuyDoiDonVi(rowNumber) {
  masterPCN_deleteRow_(MASTER_PCN_CONFIG.QUY_DOI_DON_VI, rowNumber);
  return masterPCN_getInitData();
}

function masterPCN_saveDinhLuongList(records) {
  if (!Array.isArray(records) || !records.length) {
    throw new Error('Chưa có dòng định lượng nào để lưu.');
  }

  records.forEach(record => {
    if (!String(record.maDinhLuong || '').trim()) throw new Error('Thiếu Mã định lượng.');
    if (!String(record.maSanPham || '').trim()) throw new Error('Thiếu Mã sản phẩm.');
    if (!String(record.maNguyenLieu || '').trim()) throw new Error('Thiếu Mã nguyên liệu / vật tư.');
    if (!(Number(record.dinhLuong1SKU) > 0)) throw new Error('Định lượng 1 SKU phải lớn hơn 0.');

    masterPCN_saveRow_(
      MASTER_PCN_CONFIG.DINH_LUONG,
      record,
      record.__rowNumber
    );
  });

  return masterPCN_getInitData();
}

function masterPCN_deleteDinhLuong(rowNumber) {
  masterPCN_deleteRow_(MASTER_PCN_CONFIG.DINH_LUONG, rowNumber);
  return masterPCN_getInitData();
}
