// Danh sách nhà sản xuất của đơn hàng theo thuật toán mã kế toán.
function buildDonHangMaKeToanOptions_(name, headers, rows) {
  ['tenNguyenLieu', 'nhaSanXuat', 'MaKeToan'].forEach(field => {
    if (!headers.includes(field)) throw new Error('NguyenLieuVatTu thiếu cột: ' + field);
  });
  const get = (row, field) => String(row[headers.indexOf(field)] == null ? '' : row[headers.indexOf(field)]).trim();
  const manufacturers = new Map();
  rows.forEach(row => {
    if (get(row, 'tenNguyenLieu') !== String(name || '').trim()) return;
    const maker = get(row, 'nhaSanXuat');
    if (!maker) return;
    if (!manufacturers.has(maker)) manufacturers.set(maker, {name: maker, codes: []});
    const code = get(row, 'MaKeToan');
    const codes = manufacturers.get(maker).codes;
    if (code && !codes.includes(code)) codes.push(code);
  });
  return Array.from(manufacturers.values());
}

function getThongTinDonHangMaKeToan(tenNguyenLieu) {
  const result = getThongTinXuatNhapKhauTheoNguyenLieu(tenNguyenLieu);
  const sheet = getSheet_(APP.SHEETS.NGUYEN_LIEU);
  // Dùng giá trị hiển thị để giữ mã kế toán dạng chuỗi, gồm cả số 0 đầu.
  const values = sheet.getDataRange().getDisplayValues();
  result.data.manufacturers = buildDonHangMaKeToanOptions_(tenNguyenLieu,
    values[0].map(value => String(value).trim()), values.slice(1));
  return result;
}
