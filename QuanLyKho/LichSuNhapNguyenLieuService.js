/** Lịch sử nhập chỉ đọc từ KhoNguyenLieu, lọc theo ngayNhap. */
function getMaterialInboundHistory(token, filter) {
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
  const sheet = getSpreadsheet_().getSheetByName('KhoNguyenLieu');
  if (!sheet) throw new Error('Không tìm thấy sheet KhoNguyenLieu.');
  return buildMaterialInboundHistory_(readSheetRowsAsObjects_(sheet), from, to);
}

function buildMaterialInboundHistory_(data, from, to) {
  const columns = [
    ['Thời gian tạo', 'ngayNhap'], ['Thời gian duyệt', 'ngayPheDuyet'],
    ['Tên NCC', 'nhaCungCap'], ['Diễn giải', ''], ['Mã NLVT', 'maNguyenLieu'],
    ['Mã kế toán', 'MaKeToan'],
    ['Tên nguyên vật liệu', 'tenNguyenLieu'], ['Đvt', 'donVi'],
    ['Số lượng', 'khoiLuongNhap'], ['Lot No', 'LotNo']
  ];
  columns.forEach(function(column) {
    if (column[1] && data.headers.indexOf(column[1]) < 0) throw new Error('KhoNguyenLieu thiếu cột ' + column[1]);
  });
  const rows = data.rows.filter(function(row) {
    const day = extractDateTextForReport_(row.ngayNhap);
    return /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= from && day <= to;
  }).map(function(source) {
    const row = {};
    columns.forEach(function(column) {
      row[column[0]] = column[1] ? (source[column[1]] ?? '') : '';
    });
    row._slip = {receiptDate:extractDateTextForReport_(source.ngayNhap), manufactured:source.ngaySanXuat ?? '', expires:source.hanSuDung ?? ''};
    return row;
  });
  rows.sort(function(a, b) { return String(b['Thời gian tạo']).localeCompare(String(a['Thời gian tạo'])); });
  return {success:true, headers:columns.map(function(column) { return column[0]; }), rows:rows};
}
