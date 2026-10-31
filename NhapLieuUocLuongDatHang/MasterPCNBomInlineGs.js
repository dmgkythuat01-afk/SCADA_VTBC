// Chỉ sửa các lựa chọn mã kế toán / sử dụng trên một dòng BOM có sẵn.
const MASTER_PCN_BOM_FIELDS = ['MaKeToan','MaKeToan1','MaKeToan2','MaKeToan3','SuDung0','SuDung1','SuDung2','SuDung3'];
const MASTER_PCN_BOM_IDENTITY = ['maDinhLuong','maSanPham','maNguyenLieu','tenNguyenLieu'];

function masterPCNBom_codes_(material, rows) {
  const text = value => String(value == null ? '' : value).trim();
  if (!text(material.maNguyenLieu) || !text(material.tenNguyenLieu)) return [];
  return [...new Set(rows.filter(row =>
    text(row.maNguyenLieu) === text(material.maNguyenLieu) &&
    text(row.tenNguyenLieu) === text(material.tenNguyenLieu))
    .map(row => text(row.MaKeToan)).filter(Boolean))];
}

function masterPCNBom_validate_(values, codes) {
  const result = {};
  MASTER_PCN_BOM_FIELDS.forEach(field => {
    if (!values || !Object.prototype.hasOwnProperty.call(values, field)) throw new Error('Thiếu lựa chọn: ' + field);
    const value = String(values[field] == null ? '' : values[field]).trim();
    if (field.startsWith('MaKeToan')) {
      if (value && !codes.includes(value)) throw new Error(field + ': mã không thuộc đúng tên + mã nguyên liệu trong NguyenLieuVatTu.');
      result[field] = value;
    } else {
      if (!['', 'TRUE', 'FALSE'].includes(value.toUpperCase())) throw new Error(field + ': chỉ được chọn Có hoặc Không.');
      result[field] = value === '' ? '' : value.toUpperCase() === 'TRUE';
    }
  });
  return result;
}

function masterPCN_saveBOMAccounting(request) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = masterPCN_getSheet_(MASTER_PCN_CONFIG.DINH_LUONG);
    const rowNumber = Number(request && request.rowNumber);
    if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > sheet.getLastRow()) throw new Error('Dòng BOM không hợp lệ. Hãy tải lại dữ liệu.');
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(value => String(value).trim());
    [...MASTER_PCN_BOM_IDENTITY, ...MASTER_PCN_BOM_FIELDS].forEach(field => {
      if (!headers.includes(field)) throw new Error('DinhLuong thiếu cột: ' + field);
    });
    const cells = sheet.getRange(rowNumber, 1, 1, headers.length).getDisplayValues()[0];
    const row = {__rowNumber: rowNumber};
    headers.forEach((header, index) => { if (header) row[header] = cells[index]; });
    const text = value => String(value == null ? '' : value).trim();
    if (!request.identity || MASTER_PCN_BOM_IDENTITY.some(field => text(request.identity[field]) !== text(row[field]))) {
      throw new Error('Dòng BOM đã thay đổi vị trí hoặc nguyên liệu. Hãy tải lại dữ liệu.');
    }
    if (!request.expected || MASTER_PCN_BOM_FIELDS.some(field => text(request.expected[field]) !== text(row[field]))) {
      throw new Error('Lựa chọn trên dòng này đã được cập nhật. Hãy tải lại dữ liệu trước khi lưu.');
    }
    const catalog = masterPCN_read_(MASTER_PCN_CONFIG.NGUYEN_LIEU);
    const values = masterPCNBom_validate_(request.values, masterPCNBom_codes_(row, catalog.rows));
    MASTER_PCN_BOM_FIELDS.forEach(field => {
      const cell = sheet.getRange(rowNumber, headers.indexOf(field) + 1);
      if (field.startsWith('MaKeToan')) cell.setNumberFormat('@');
      cell.setValue(values[field]);
      row[field] = typeof values[field] === 'boolean' ? String(values[field]).toUpperCase() : values[field];
    });
    SpreadsheetApp.flush();
    return {ok: true, row};
  } finally { lock.releaseLock(); }
}
