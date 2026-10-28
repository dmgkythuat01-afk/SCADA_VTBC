/** Card chỉ đọc: phiếu xuất sản xuất tự động, lọc theo thời gian duyệt. */
function getAutoProductionExportHistory(token, filter) {
  requireInventoryRole_(token);
  filter = filter || {};
  const from = String(filter.fromDate || todayText_());
  const to = String(filter.toDate || todayText_());
  function validDay(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return !isNaN(date) && date.toISOString().slice(0, 10) === value;
  }
  if (!validDay(from) || !validDay(to) || from > to) throw new Error('Khoảng ngày không hợp lệ.');
  const ss = getSpreadsheet_();
  const exportSheet = ss.getSheetByName('PhieuXuatNguyenLieu');
  const productSheet = ss.getSheetByName('DanhSachSanPhamVTBC');
  if (!exportSheet) throw new Error('Không tìm thấy sheet PhieuXuatNguyenLieu.');
  if (!productSheet) throw new Error('Không tìm thấy sheet DanhSachSanPhamVTBC.');
  return buildAutoProductionExportHistory_(readSheetRowsAsObjects_(exportSheet), readSheetRowsAsObjects_(productSheet), from, to);
}

function buildAutoProductionExportHistory_(exports, products, from, to) {
  const columns = [
    ['Thời gian tạo', 'ngayTao'], ['Thời gian duyệt', 'thoiGianDuyet'],
    ['Tên nhân viên', 'nguoiTao'], ['Diễn giải', 'cachXuat'], ['Số KHSX', 'KeHoachId'],
    ['Mã NLVT', 'maNguyenLieu'], ['Tên nguyên vật liệu', 'tenNguyenLieu'],
    ['Đvt', 'donViCanXuat'], ['Số lượng', 'khoiLuongXuatThucTe'], ['Lot No', 'LotNo']
  ];
  columns.map(function(column) { return column[1]; }).concat(['tenBaiLieu', 'trangThaiPheDuyet']).forEach(function(field) {
    if (exports.headers.indexOf(field) < 0) throw new Error('PhieuXuatNguyenLieu thiếu cột ' + field);
  });
  ['tenBaiLieu1', 'tenBaiLieu2', 'maSanPham'].forEach(function(field) {
    if (products.headers.indexOf(field) < 0) throw new Error('DanhSachSanPhamVTBC thiếu cột ' + field);
  });
  const productMap = new Map();
  const text = function(value) { return String(value === null || value === undefined ? '' : value).trim(); };
  // Giữ dấu tiếng Việt để không ghép nhầm các bài liệu khác tên.
  const recipeKey = function(value) { return text(value).normalize('NFC').replace(/\s+/g, ' ').toLocaleLowerCase('vi'); };
  products.rows.forEach(function(product) {
    const code = text(product.maSanPham);
    if (!code) return;
    [product.tenBaiLieu1, product.tenBaiLieu2].forEach(function(name) {
      const key = recipeKey(name);
      if (!key) return;
      if (!productMap.has(key)) productMap.set(key, new Set());
      productMap.get(key).add(code);
    });
  });
  const warnings = new Set();
  const rows = [];
  exports.rows.forEach(function(source) {
    if (!isApprovedReportStatus_(source.trangThaiPheDuyet)) return;
    const day = extractDateTextForReport_(source.thoiGianDuyet);
    if (!day || day < from || day > to) return;
    const row = {};
    columns.forEach(function(column) {
      row[column[0]] = source[column[1]] === null || source[column[1]] === undefined ? '' : source[column[1]];
    });
    const lots = text(source.LotNo).split(/\s*,\s*|[\r\n]+/).map(text).filter(Boolean);
    row['Lot No'] = lots.length > 1 ? lots.map(function(lot, index) { return 'Lot ' + (index + 1) + ': ' + lot; }).join('; ') : (lots[0] || '');
    const codes = Array.from(productMap.get(recipeKey(source.tenBaiLieu)) || []).sort();
    row['Mã sản phẩm'] = codes.join(', ');
    if (!codes.length) warnings.add('Chưa tìm thấy mã sản phẩm cho bài liệu: ' + (text(source.tenBaiLieu) || '(trống)'));
    if (codes.length > 1) warnings.add('Bài liệu khớp nhiều sản phẩm: ' + text(source.tenBaiLieu) + ' → ' + codes.join(', '));
    rows.push(row);
  });
  rows.sort(function(a, b) { return String(b['Thời gian duyệt']).localeCompare(String(a['Thời gian duyệt'])); });
  return {success: true, headers: columns.map(function(column) { return column[0]; }).concat(['Mã sản phẩm']), rows: rows, warnings: Array.from(warnings)};
}
