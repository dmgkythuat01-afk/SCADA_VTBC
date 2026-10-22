// Đồng bộ danh mục file 2 -> file ứng dụng, khóa tên nguyên liệu + mã kế toán.
function buildNguyenLieuSync_(sourceHeaders, sourceRows, headers, existing) {
  ['tenNguyenLieu', 'MaKeToan'].forEach(field => {
    if (!sourceHeaders.includes(field) || !headers.includes(field)) {
      throw new Error('NguyenLieu / NguyenLieuVatTu thiếu cột: ' + field);
    }
  });
  const rows = existing.map(row => row.slice());
  const nameIndex = headers.indexOf('tenNguyenLieu');
  const codeIndex = headers.indexOf('MaKeToan');
  const sourceName = sourceHeaders.indexOf('tenNguyenLieu');
  const sourceCode = sourceHeaders.indexOf('MaKeToan');
  const shared = headers.map((field, index) => ({index, source: sourceHeaders.indexOf(field)}))
    .filter(column => column.source >= 0);
  const targets = {};
  rows.forEach((row, index) => {
    const key = makeKhoNguyenLieuKey_(row[nameIndex], row[codeIndex]);
    if (key) (targets[key] || (targets[key] = [])).push(index);
  });
  const seen = {};
  let updatedCount = 0, addedCount = 0, invalidSourceCount = 0;
  sourceRows.forEach((source, index) => {
    if (source.every(value => value === '' || value === null)) return;
    const key = makeKhoNguyenLieuKey_(source[sourceName], source[sourceCode]);
    if (!key) { invalidSourceCount++; return; }
    if (seen[key]) throw new Error('Trùng tên nguyên liệu + mã kế toán trong NguyenLieu, dòng ' + (index + 2));
    seen[key] = true;
    let indices = targets[key];
    if (!indices) {
      indices = [rows.length];
      rows.push(headers.map(() => ''));
      addedCount++;
    } else {
      updatedCount += indices.length;
    }
    indices.forEach(rowIndex => shared.forEach(column => {
      rows[rowIndex][column.index] = source[column.source];
    }));
  });
  return {rows, shared, updatedCount, addedCount, invalidSourceCount};
}

function dongBoDanhMucNguyenLieu_() {
  const source = SpreadsheetApp.openById(APP.EXTERNAL.KHO_NGUYEN_LIEU_FILE_ID)
    .getSheetByName('NguyenLieu');
  if (!source) throw new Error('Không tìm thấy sheet NguyenLieu trong file 2.');
  const target = getSheet_(APP.SHEETS.NGUYEN_LIEU);
  const sourceHeaders = getHeaders_(source);
  const headers = getHeaders_(target);
  const oldCount = Math.max(0, target.getLastRow() - 1);
  const sourceRows = source.getLastRow() < 2 ? [] : source.getRange(2, 1, source.getLastRow() - 1, sourceHeaders.length).getValues();
  const existing = oldCount ? target.getRange(2, 1, oldCount, headers.length).getValues() : [];
  const result = buildNguyenLieuSync_(sourceHeaders, sourceRows, headers, existing);
  if (result.rows.length + 1 > target.getMaxRows()) {
    target.insertRowsAfter(target.getMaxRows(), result.rows.length + 1 - target.getMaxRows());
  }
  // Chỉ ghi các cột có ở nguồn để giữ cả giá trị và công thức cột riêng ở đích.
  if (oldCount && result.updatedCount) result.shared.forEach(column => {
    const values = result.rows.slice(0, oldCount).map(row => [row[column.index]]);
    target.getRange(2, column.index + 1, oldCount, 1).setValues(values);
  });
  if (result.addedCount) {
    target.getRange(oldCount + 2, 1, result.addedCount, headers.length)
      .setValues(result.rows.slice(oldCount));
  }
  return {updatedCount: result.updatedCount, addedCount: result.addedCount, invalidSourceCount: result.invalidSourceCount};
}

// Có thể chạy riêng danh mục; lịch đầu tuần gọi hàm nội bộ trong cùng khóa tồn kho.
function capNhatDanhMucNguyenLieu() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const result = dongBoDanhMucNguyenLieu_();
    SpreadsheetApp.flush();
    console.log(JSON.stringify(result));
    return result;
  } finally { lock.releaseLock(); }
}
