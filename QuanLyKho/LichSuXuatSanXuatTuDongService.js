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
  const result = buildAutoProductionExportHistory_(readSheetRowsAsObjects_(exportSheet), readSheetRowsAsObjects_(productSheet), from, to);
  result.slipPeople = {};
  try {
    const plans = Array.from(new Set(result.rows.map(function(row) { return String(row['Số KHSX'] || '').trim(); }).filter(Boolean)));
    if (plans.length) {
      const batch = readAutoSlipColumns_(ss.getSheetByName('ChiTietCanBatch'), ['KeHoachId', 'nguoiCan']);
      const account = readAutoSlipColumns_(ss.getSheetByName('account') || ss.getSheetByName('Account'), ['useName', 'name']);
      result.slipPeople = buildAutoProductionSlipPeople_(batch, account, plans);
    }
  } catch (error) {
    // Bảng lịch sử vẫn sử dụng được nếu dữ liệu tra tên người nhận chưa đầy đủ.
    result.slipWarning = 'Chưa tra được người nhận hàng: ' + error.message;
  }
  return result;
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
    row._slip = {
      accountingCode: text(source.MaKeToan), recipe: text(source.tenBaiLieu),
      lots: text(source.LotNo), manufactured: String(source.ngaySanXuatKho || ''),
      expires: String(source.hanSuDung || ''), voucher: text(source.PhieuXuatId)
    };
    if (!codes.length) warnings.add('Chưa tìm thấy mã sản phẩm cho bài liệu: ' + (text(source.tenBaiLieu) || '(trống)'));
    if (codes.length > 1) warnings.add('Bài liệu khớp nhiều sản phẩm: ' + text(source.tenBaiLieu) + ' → ' + codes.join(', '));
    rows.push(row);
  });
  rows.sort(function(a, b) { return String(b['Thời gian duyệt']).localeCompare(String(a['Thời gian duyệt'])); });
  return {success: true, headers: columns.map(function(column) { return column[0]; }).concat(['Mã sản phẩm']), rows: rows, warnings: Array.from(warnings)};
}

// Chỉ đọc các cột cần thiết; không đọc hay trả mật khẩu tài khoản.
function readAutoSlipColumns_(sheet, fields) {
  if (!sheet) throw new Error('Thiếu sheet tra cứu người cân / tài khoản.');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function(value) { return String(value).trim(); });
  fields.forEach(function(field) {
    if (headers.indexOf(field) < 0) throw new Error(sheet.getName() + ' thiếu cột ' + field);
  });
  const count = Math.max(0, sheet.getLastRow() - 1);
  const rows = Array.from({length: count}, function() { return {}; });
  fields.forEach(function(field) {
    if (!count) return;
    sheet.getRange(2, headers.indexOf(field) + 1, count, 1).getDisplayValues().forEach(function(values, index) {
      rows[index][field] = String(values[0] || '').trim();
    });
  });
  return rows;
}

function buildAutoProductionSlipPeople_(batchRows, accounts, plans) {
  const usernameKey = function(value) { return String(value || '').trim().toLowerCase(); };
  const people = new Map();
  accounts.forEach(function(account) {
    const username = usernameKey(account.useName);
    const name = String(account.name || '').trim();
    if (!username || !name) return;
    if (!people.has(username)) people.set(username, new Set());
    people.get(username).add(name);
  });
  const usersByPlan = new Map();
  batchRows.forEach(function(row) {
    const plan = String(row.KeHoachId || '').trim(), user = usernameKey(row.nguoiCan);
    if (!plan || !user) return;
    if (!usersByPlan.has(plan)) usersByPlan.set(plan, new Set());
    usersByPlan.get(plan).add(user);
  });
  const result = Object.create(null);
  plans.forEach(function(plan) {
    const users = Array.from(usersByPlan.get(plan) || []);
    const names = users.length === 1 ? Array.from(people.get(users[0]) || []) : [];
    const recipient = names.length === 1 ? names[0] : '';
    result[plan] = {recipient: recipient, warning: recipient ? '' : (users.length > 1 ? 'KHSX có nhiều người cân; cần kiểm tra ChiTietCanBatch.' : 'Chưa tìm thấy một tên người nhận hàng từ ChiTietCanBatch và account.')};
  });
  return result;
}
