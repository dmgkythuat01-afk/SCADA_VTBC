/*******************************************************
 * WebApp Ước lượng đặt hàng DMG
 * Sheet DB: Uoc_Luong_Dat_Hang_DMG.xlsx import lên Google Sheet
 * Giao diện: Index.html
 *******************************************************/

const APP = {
  TZ: 'Asia/Ho_Chi_Minh',

  EXTERNAL: {
    KHO_NGUYEN_LIEU_FILE_ID: '1yFlCpC6JzLRmv9hukNw05vYpeYmkhXRcPC-0nCNOjAQ',
    KHO_NGUYEN_LIEU_SHEET: 'KhoNguyenLieu'
  },

  SHEETS: {
    TAI_KHOAN: 'TaiKhoan',
    THAM_SO: 'ThamSo',
    DANH_MUC: 'DanhMuc',
    SAN_PHAM: 'SanPham',
    NGUYEN_LIEU: 'NguyenLieuVatTu',
    QUY_DOI: 'QuyDoiSKU',
    QUY_DOI_DON_VI: 'QuyDoiDonVi',
    DINH_LUONG: 'DinhLuong',
    TON_KHO: 'TonKho',
    KE_HOACH_SX: 'KeHoachBanHang',
    HANG_VE: 'KeHoachHangVe',
    DE_XUAT: 'DeXuatDatHang',
    NGAY_CAP_NHAT_KHO: 'NgayCapNhatKho',
    KHACH_HANG_SAN_PHAM: 'KhachHangVaSanPham',
  },

  INPUT_SHEETS: [
    'SanPham',
    'NguyenLieuVatTu',
    'QuyDoiSKU',
    'QuyDoiDonVi',
    'DinhLuong',
    'TonKho',

    'KhachHangVaSanPham',

    'KeHoachBanHang',
    'KeHoachHangVe'
  ],

  DATE_FIELDS: [
    'ngayDauTuan',
    'ngaySanXuatDuKien',
    'ngaySanXuat',
    'hanSuDung',
    'ngayNhap',
    'ngayPheDuyet',
    'ngayDuKienVe',
    'ngayVe',
    'ngayYeuCauMuaHang',
    'ngayCanDung',
    'ngayCanDat'
  ],

  NUMBER_FIELDS: [
    'nam',
    'tuan',
    'quyCachDatHang',
    'tonAnToan',
    'soNgayVeKhoMacDinh',

    'soTuanGiuChoNguyenLieu',
    'nhuCauSanXuatTuan',
    'nhuCauGiuCho',
    'tonKhaDungSauGiuCho',

    'heSoQuyDoiRaSKU',
    'dinhLuong1SKU',
    'haoHutPhanTram',
    'khoiLuongNhap',
    'tonDauTuanQuyDoi',
    'soNgayVeKho',
    'soLuongKeHoach',
    'soLuongSKU',
    'soLuongThucHien',
    'soLuongSKUThucHien',
    'soLuongVeDuKien',
    'nhuCauTuan',
    'tonDauTuan',
    'hangVeTrongTuan',
    'tonDuKienSauSX',
    'soLuongThieu',
    'soLuongDeXuatDat',
    'quyCachDongGoi',
    'heSoQuyDoi',
    'heSoQuyDoiKho'
  ]
};

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Ước lượng đặt hàng DMG')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function login(username, password) {
  username = String(username || '').trim();
  password = String(password || '').trim();

  const rows = getSheetObjects_(APP.SHEETS.TAI_KHOAN);
  const user = rows.find(r =>
    String(r.tenDangNhap || '').trim().toLowerCase() === username.toLowerCase()
    && String(r.MatKhau || '').trim() === password
  );

  if (!user) {
    return {
      ok: false,
      message: 'Sai tên đăng nhập hoặc mật khẩu.'
    };
  }

  return {
    ok: true,
    user: {
      tenDangNhap: user.tenDangNhap,
      role: user.Role || 'User'
    },
    menu: getMenuConfig_()
  };
}

function getAppInit() {
  ensureQuyDoiDonViSheet_();
  return {
    menu: getMenuConfig_(),
    thamSo: getThamSo_(),
    sheets: APP.INPUT_SHEETS
  };
}

function getMenuConfig_() {
  return [
    { key: 'tongQuan', label: 'Tổng quan 12 tuần', icon: '📊' },
    { key: 'ketQua', label: 'Kết quả cần đặt', icon: '🛒' },
    {
      key: 'khoDauVaoDuKien',
      label: 'Kho đầu vào dự kiến',
      icon: '📋'
    },
    { key: 'SanPham', label: 'Sản phẩm', icon: '📦', sheet: 'SanPham' },
    { key: 'NguyenLieuVatTu', label: 'Nguyên liệu / Vật tư', icon: '🧪', sheet: 'NguyenLieuVatTu' },
    { key: 'QuyDoiSKU', label: 'Quy đổi SKU', icon: '🔁', sheet: 'QuyDoiSKU' },
    { key: 'QuyDoiDonVi', label: 'Quy đổi đơn vị', icon: '⚙️', sheet: 'QuyDoiDonVi' },
    { key: 'DinhLuong', label: 'Định lượng BOM', icon: '⚖️', sheet: 'DinhLuong' },

    {
      key: 'TonKho',
      label: 'Tồn kho',
      icon: '🏭',
      sheet: 'TonKho'
    },

    {
      key: 'KhachHangVaSanPham',
      label: 'Khách hàng và sản phẩm',
      icon: '👥',
      sheet: 'KhachHangVaSanPham'
    },

    {
      key: 'KeHoachBanHang',
      label: 'Kế hoạch bán hàng',
      icon: '📅',
      sheet: 'KeHoachBanHang'
    },

    { key: 'KeHoachHangVe', label: 'Kế hoạch hàng về', icon: '🚚', sheet: 'KeHoachHangVe' }
  ];
}

function getSheetData(sheetName) {
  assertInputSheet_(sheetName);
  ensureQuyDoiDonViSheet_();

  const sh = getSheet_(sheetName);
  const headers = getHeaders_(sh);
  const rows = getSheetObjects_(sheetName).filter(r => !isEmptyObject_(r));

  return {
    sheetName,
    headers,
    rows,
    dropdowns: getDropdownData_(),
    fields: getFieldMeta_(headers)
  };
}

function saveRecord(sheetName, record) {
  assertInputSheet_(sheetName);

  record = record || {};

  const sh = getSheet_(sheetName);
  const headers = getHeaders_(sh);
  const rowNumber = Number(record.__rowNumber || 0);

  /*
   * Khi thêm mới kế hoạch hàng về:
   * ngày về thực tế mặc định bằng ngày dự kiến về.
   *
   * Chỉ áp dụng cho dòng mới.
   * Khi sửa, người dùng được phép thay đổi ngayVe độc lập.
   */
  if (
    sheetName === APP.SHEETS.HANG_VE &&
    !rowNumber &&
    !record.ngayVe &&
    record.ngayDuKienVe
  ) {
    record.ngayVe = record.ngayDuKienVe;
  }

  const values = headers.map(
    h => normalizeForSheet_(h, record[h])
  );

  if (rowNumber && rowNumber > 1) {
    sh.getRange(
      rowNumber,
      1,
      1,
      headers.length
    ).setValues([values]);
  } else {
    sh.appendRow(values);
  }

  SpreadsheetApp.flush();

  return {
    ok: true,
    message: 'Đã lưu dữ liệu.',
    data: getSheetData(sheetName)
  };
}

function saveRecords(sheetName, records) {
  assertInputSheet_(sheetName);

  records = Array.isArray(records) ? records : [];
  if (!records.length) {
    throw new Error('Không có dữ liệu để lưu.');
  }

  const sh = getSheet_(sheetName);
  const headers = getHeaders_(sh);
  const values = records.map(record =>
    headers.map(h => normalizeForSheet_(h, record[h]))
  );

  sh.getRange(sh.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
  SpreadsheetApp.flush();

  return {
    ok: true,
    message: 'Đã lưu ' + values.length + ' dòng dữ liệu.',
    data: getSheetData(sheetName)
  };
}

function saveKeHoachSanXuatForecastRows(records) {
  records = Array.isArray(records) ? records : [];

  if (!records.length) {
    throw new Error('Không có dữ liệu kế hoạch bán hàng để lưu.');
  }

  const sheetName = APP.SHEETS.KE_HOACH_SX;
  const sh = getSheet_(sheetName);
  const headers = getHeaders_(sh);

  const appendValues = [];
  let updatedCount = 0;
  let appendedCount = 0;
  let skippedCount = 0;

  records.forEach(record => {
    record = record || {};

    const rowNumber = Number(record.__rowNumber || 0);
    const soLuongKeHoach = num_(record.soLuongKeHoach);
    const heSoQuyDoiRaSKU = num_(record.heSoQuyDoiRaSKU);

    // Dòng mới hoặc dữ liệu cũ chưa có số lượng thực hiện:
    // mặc định số lượng thực hiện bằng số lượng kế hoạch.
    if (
      record.soLuongThucHien === '' ||
      record.soLuongThucHien === null ||
      record.soLuongThucHien === undefined
    ) {
      record.soLuongThucHien = soLuongKeHoach;
    }

    // SKU kế hoạch luôn được tính lại từ số lượng kế hoạch.
    record.soLuongSKU =
      Math.round(
        soLuongKeHoach * heSoQuyDoiRaSKU * 1000
      ) / 1000;

    // SKU thực hiện luôn được tính lại từ số lượng thực hiện.
    record.soLuongSKUThucHien =
      Math.round(
        num_(record.soLuongThucHien) *
        heSoQuyDoiRaSKU *
        1000
      ) / 1000;

    // Dòng chưa có trong sheet mà số lượng rỗng hoặc = 0 thì bỏ qua, không tạo dòng mới.
    if (!rowNumber && soLuongKeHoach <= 0) {
      skippedCount++;
      return;
    }

    if (!record.maSanPham) {
      throw new Error('Thiếu mã sản phẩm.');
    }

    if (!record.nam || !record.tuan) {
      throw new Error('Thiếu năm hoặc tuần.');
    }

    // ID tự tạo nếu là dòng mới.
    if (!record.idKeHoach) {
      record.idKeHoach =
        makeKeHoachSanXuatId_(
          record.nam,
          record.tuan,
          record.maSanPham,
          record.khachHang
        );
    }

    // Mặc định đã duyệt để được đưa vào tính ước lượng.
    if (!record.trangThai) {
      record.trangThai = 'Da duyet';
    }

    if (!record.nguoiTao) {
      record.nguoiTao = record.__nguoiTao || '';
    }

    if (!record.ngayTao) {
      record.ngayTao = Utilities.formatDate(new Date(), APP.TZ, 'yyyy-MM-dd HH:mm:ss');
    }

    const values = headers.map(h => normalizeForSheet_(h, record[h]));

    if (rowNumber && rowNumber > 1) {
      sh.getRange(rowNumber, 1, 1, headers.length).setValues([values]);
      updatedCount++;
    } else {
      appendValues.push(values);
      appendedCount++;
    }
  });

  if (appendValues.length) {
    sh.getRange(sh.getLastRow() + 1, 1, appendValues.length, headers.length).setValues(appendValues);
  }

  SpreadsheetApp.flush();

  return {
    ok: true,
    message:
      'Đã cập nhật kế hoạch bán hàng. Cập nhật: ' +
      updatedCount +
      ', thêm mới: ' +
      appendedCount +
      ', bỏ qua dòng trống: ' +
      skippedCount +
      '.',
    updatedCount,
    appendedCount,
    skippedCount,
    data: getSheetData(sheetName)
  };
}

function makeKeHoachSanXuatId_(
  nam,
  tuan,
  maSanPham,
  khachHang
) {
  nam =
    String(nam || '').trim();

  tuan =
    String(tuan || '')
      .trim()
      .padStart(2, '0');

  maSanPham =
    String(maSanPham || '').trim();

  let customerCode =
    removeVietnameseMarks_(
      String(khachHang || '')
    )
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

  if (
    !nam ||
    !tuan ||
    !maSanPham
  ) {
    return '';
  }

  return (
    'KH' +
    nam +
    tuan +
    '_' +
    maSanPham +
    (
      customerCode
        ? '_' + customerCode
        : ''
    )
  );
}

function deleteRecord(sheetName, rowNumber) {
  assertInputSheet_(sheetName);

  rowNumber = Number(rowNumber);
  if (!rowNumber || rowNumber <= 1) {
    throw new Error('Dòng xóa không hợp lệ.');
  }

  getSheet_(sheetName).deleteRow(rowNumber);
  SpreadsheetApp.flush();

  return {
    ok: true,
    message: 'Đã xóa dòng.',
    data: getSheetData(sheetName)
  };
}


function importTonKhoFromExcelRows(rows) {
  rows = Array.isArray(rows) ? rows : [];
  if (!rows.length) {
    throw new Error('File Excel không có dữ liệu để nhập.');
  }

  const sh = getSheet_(APP.SHEETS.TON_KHO);
  const headers = getHeaders_(sh);
  const headerIndex = {};
  headers.forEach((h, i) => headerIndex[h] = i);

  ['MaKeToan', 'tenNguyenLieu', 'khoiLuongNhap'].forEach(h => {
    if (!Object.prototype.hasOwnProperty.call(headerIndex, h)) {
      throw new Error('Sheet TonKho thiếu cột bắt buộc: ' + h);
    }
  });

  const uploadMap = {};
  const duplicateKeys = {};
  const skippedUploadRows = [];

  rows.forEach((row, index) => {
    const maKeToan = getImportValue_(row, ['MaKeToan', 'Mã kế toán', 'Ma ke toan', 'ma_ke_toan', 'maKeToan', 'Mã kế toán NL', 'Mã kế toán vật tư']);
    const tenNguyenLieu = getImportValue_(row, ['tenNguyenLieu', 'Tên nguyên liệu', 'Ten nguyen lieu', 'ten_nguyen_lieu', 'Tên nguyên liệu / vật tư', 'tenNguyenLieuVatTu']);
    const khoiLuongNhap = getImportValue_(row, ['khoiLuongNhap', 'Khối lượng nhập', 'Khoi luong nhap', 'khoi_luong_nhap', 'Tồn kho', 'Ton kho', 'Số lượng tồn', 'So luong ton', 'Tồn', 'Ton']);
    const key = makeTonKhoImportKey_(maKeToan, tenNguyenLieu);

    if (!key || khoiLuongNhap === '' || khoiLuongNhap === null || khoiLuongNhap === undefined) {
      skippedUploadRows.push(index + 2);
      return;
    }

    if (uploadMap[key]) duplicateKeys[key] = true;

    uploadMap[key] = {
      MaKeToan: String(maKeToan || '').trim(),
      tenNguyenLieu: String(tenNguyenLieu || '').trim(),
      khoiLuongNhap: parseImportNumber_(khoiLuongNhap),
      sourceRow: index + 2
    };
  });

  if (!Object.keys(uploadMap).length) {
    throw new Error('Không tìm thấy dòng hợp lệ trong file Excel. File cần có MaKeToan, tenNguyenLieu và khoiLuongNhap.');
  }

  const lastRow = sh.getLastRow();
  if (lastRow < 2) {
    throw new Error('Sheet TonKho chưa có dữ liệu để cập nhật.');
  }

  const values = sh.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const updatedDetails = [];
  const matchedKeys = {};

  values.forEach((row, i) => {
    const maKeToan = row[headerIndex.MaKeToan];
    const tenNguyenLieu = row[headerIndex.tenNguyenLieu];
    const key = makeTonKhoImportKey_(maKeToan, tenNguyenLieu);
    const found = uploadMap[key];

    if (!found) return;

    row[headerIndex.khoiLuongNhap] = found.khoiLuongNhap;
    matchedKeys[key] = true;
    updatedDetails.push({
      rowNumber: i + 2,
      MaKeToan: found.MaKeToan,
      tenNguyenLieu: found.tenNguyenLieu,
      khoiLuongNhap: found.khoiLuongNhap
    });
  });

  if (updatedDetails.length) {
    sh.getRange(2, 1, values.length, headers.length).setValues(values);
    SpreadsheetApp.flush();
  }

  const notMatched = Object.keys(uploadMap)
    .filter(key => !matchedKeys[key])
    .map(key => uploadMap[key]);

  return {
    ok: true,
    message: 'Đã cập nhật tồn kho từ file Excel.',
    updatedCount: updatedDetails.length,
    notMatchedCount: notMatched.length,
    skippedUploadRows: skippedUploadRows,
    duplicateCount: Object.keys(duplicateKeys).length,
    notMatchedSample: notMatched.slice(0, 20),
    updatedSample: updatedDetails.slice(0, 20),
    data: getSheetData(APP.SHEETS.TON_KHO)
  };
}

function getImportValue_(row, aliases) {
  const keys = Object.keys(row || {});
  const normalizedMap = {};

  keys.forEach(k => {
    normalizedMap[normalizeImportHeader_(k)] = k;
  });

  for (let i = 0; i < aliases.length; i++) {
    const normalized = normalizeImportHeader_(aliases[i]);
    if (Object.prototype.hasOwnProperty.call(normalizedMap, normalized)) {
      return row[normalizedMap[normalized]];
    }
  }

  return '';
}

function normalizeImportHeader_(value) {
  return removeVietnameseMarks_(String(value || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function makeTonKhoImportKey_(maKeToan, tenNguyenLieu) {
  const ma = normalizeImportText_(maKeToan);
  const ten = normalizeImportText_(tenNguyenLieu);
  if (!ma || !ten) return '';
  return ma + '|' + ten;
}

function normalizeImportText_(value) {
  return removeVietnameseMarks_(String(value || ''))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function removeVietnameseMarks_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function parseImportNumber_(value) {
  if (typeof value === 'number') return value;

  let s = String(value || '').trim();
  if (!s) return 0;

  s = s.replace(/\s/g, '').replace(/[^0-9,\.\-]/g, '');

  const hasComma = s.indexOf(',') >= 0;
  const hasDot = s.indexOf('.') >= 0;

  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    if (/^-?\d{1,3}(,\d{3})+$/.test(s)) {
      s = s.replace(/,/g, '');
    } else {
      s = s.replace(',', '.');
    }
  } else if (hasDot) {
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '');
    }
  }

  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function runTinhToanVaGhiKetQua() {
  const result = tinhToan12Tuan_();
  writeDeXuat_(result.rows);
  return getDashboardData();
}

function getDashboardData() {
  const result = tinhToan12Tuan_();

  const weeks = result.weeks.map(w => {
    const rows = result.rows.filter(r => r.nam === w.nam && r.tuan === w.tuan);
    const canDat = rows.filter(r => Number(r.soLuongDeXuatDat || 0) > 0);
    const gap = canDat.filter(r => r.mucDo === 'Can dat gap');
    const nguyenLieu = canDat.filter(r => r.loaiNguyenLieu === 'Nguyen lieu').length;
    const vatTu = canDat.filter(r => r.loaiNguyenLieu === 'Vat tu').length;
    const earliest = canDat.map(r => r.ngayCanDat).filter(Boolean).sort()[0] || '';

    return {
      nam: w.nam,
      tuan: w.tuan,
      label: 'Tuần ' + w.tuan,
      ngayDauTuan: fmtDate_(w.start),
      ngayCuoiTuan: fmtDate_(w.end),
      tongDong: rows.length,
      soDongCanDat: canDat.length,
      soDongCanDatGap: gap.length,
      soNguyenLieuCanDat: nguyenLieu,
      soVatTuCanDat: vatTu,
      ngayCanDatSomNhat: earliest,
      mucDo: gap.length ? 'Can dat gap' : (canDat.length ? 'Can dat' : 'Du ton'),
      details: canDat.slice(0, 12)
    };
  });

  const allCanDat = result.rows.filter(r => Number(r.soLuongDeXuatDat || 0) > 0);

  return {
    ok: true,
    weeks,
    rows: result.rows,
    summary: {
      soTuan: result.weeks.length,
      tongDongCanDat: allCanDat.length,
      tongDongGap: allCanDat.filter(r => r.mucDo === 'Can dat gap').length,
      nguyenLieuCanDat: allCanDat.filter(r => r.loaiNguyenLieu === 'Nguyen lieu').length,
      vatTuCanDat: allCanDat.filter(r => r.loaiNguyenLieu === 'Vat tu').length,
      soCanhBaoDonVi: (result.warnings || []).length
    },
    warnings: result.warnings || []
  };
}

function getDeXuatDatHang() {
  return getDashboardData();
}

function tinhToan12Tuan_() {
  const params = getThamSo_();
  const today = new Date();

  /*
  * Mã chung cho toàn bộ một lần chạy tính toán.
  *
  * Chỉ tạo một lần để tất cả dòng kết quả
  * có cùng mã thời gian chạy.
  */
  const runId =
    Utilities.formatDate(
      today,
      APP.TZ,
      'yyyyMMddHHmmss'
    ) +
    String(today.getMilliseconds())
      .padStart(3, '0');
    
  /*
  * Số tuần nhìn trước để giữ chỗ nguyên liệu.
  * Nếu sheet ThamSo chưa có thì mặc định là 2 tuần.
  */
  const soTuanGiuChoNguyenLieu = Math.max(
    0,
    Math.floor(
      Number(
        params.soTuanGiuChoNguyenLieu ?? 2
      )
    )
  );

  const soTuan = Math.min(
    12,
    Math.max(
      1,
      Number(params.soTuanUocLuong || 12)
    )
  );

  const buffer =
    Number(
      params.soNgayDuPhongDatHang || 3
    );

  const sttTon =
    String(
      params.trangThaiTonDuocTinh || 'Dat'
    );

  const sttKH =
    String(
      params.trangThaiKeHoachDuocTinh ||
      'Da duyet'
    );

  const sttHangVe =
    String(
      params.trangThaiHangVeDuocTinh ||
      'Dang ve'
    );

  /*
   * TonKho là snapshot đầu tuần hiện tại.
   * Vì vậy tính trực tiếp từ thứ Hai tuần hiện tại.
   */
  const calcWeekStart = getMonday_(today);
  const displayWeekStart = calcWeekStart;
  const ngayBatDauTinh = calcWeekStart;
    /*
  * Tính thêm số tuần giữ chỗ phía sau,
  * nhưng chỉ hiển thị đúng số tuần người dùng yêu cầu.
  */
  const tongSoTuanTinh =
    soTuan +
    soTuanGiuChoNguyenLieu;

  const calcWeeks = [];

  for (let i = 0; i < tongSoTuanTinh; i++) {
    const start = addDays_(
      calcWeekStart,
      i * 7
    );

    calcWeeks.push({
      index: i,
      start,
      end: addDays_(start, 6),
      nam: getISOWeekYear_(start),
      tuan: getISOWeek_(start),
      isVisible:
        i < soTuan
    });
  }

  /*
  * Chỉ đưa số tuần chính ra dashboard.
  * Hai tuần bổ sung chỉ dùng để lấy nhu cầu giữ chỗ.
  */
  const weeks =
    calcWeeks.filter(w =>
      w.isVisible
    );


  const nlList = getSheetObjects_(APP.SHEETS.NGUYEN_LIEU)
    .filter(r => String(r.trangThai || '').trim() !== 'Ngung dung');

  const nlMap = mapBy_(nlList, 'maNguyenLieu');
  const quyDoiDonViMap = getQuyDoiDonViMap_();
  const warnings = [];
  const warningSet = {};

  const tonMap = {};
  const tonDonViTinhToanMap = {};
  const tonHeSoQuyDoiKhoMap = {};

  getSheetObjects_(APP.SHEETS.TON_KHO).forEach(r => {
    if (!r.maNguyenLieu || String(r.trangThai || '').trim() !== sttTon) return;

    const ma = r.maNguyenLieu;

    const heSoQuyDoiKho =
    (
      r.heSoQuyDoiKho === '' ||
      r.heSoQuyDoiKho === null ||
      r.heSoQuyDoiKho === undefined
    )
      ? 1
      : num_(r.heSoQuyDoiKho);

  /*
  * Ưu tiên dùng tồn đầu tuần đã quy đổi.
  *
  * Nếu dữ liệu cũ chưa có tonDauTuanQuyDoi,
  * hệ thống tạm tính theo công thức cũ.
  */
  const tonTinhToan =
    (
      r.tonDauTuanQuyDoi !== '' &&
      r.tonDauTuanQuyDoi !== null &&
      r.tonDauTuanQuyDoi !== undefined
    )
      ? num_(r.tonDauTuanQuyDoi)
      : (
          num_(r.khoiLuongNhap) *
          heSoQuyDoiKho
        );

    tonMap[ma] = (tonMap[ma] || 0) + tonTinhToan;

    const doViTinhToan = cleanDonVi_(r.doViTinhToan || r.donViKho || r.donVi);

    if (doViTinhToan && !tonDonViTinhToanMap[ma]) {
      tonDonViTinhToanMap[ma] = doViTinhToan;
    }

    if (!tonHeSoQuyDoiKhoMap[ma]) {
      tonHeSoQuyDoiKhoMap[ma] = heSoQuyDoiKho;
    }
  });

  const bomBySP = {};
  getSheetObjects_(APP.SHEETS.DINH_LUONG).forEach(r => {
    if (!r.maSanPham || !r.maNguyenLieu || String(r.trangThai || '').trim() !== 'Dang dung') return;
    if (!bomBySP[r.maSanPham]) bomBySP[r.maSanPham] = [];
    bomBySP[r.maSanPham].push(r);
  });

  /*
  * Nhu cầu sản xuất thực tế theo từng tuần.
  * Giá trị này được trừ khỏi runningTon.
  */
  const demand = {};

  /*
  * Ngày sản xuất sớm nhất của nhu cầu tuần.
  */
  const firstNeedDate = {};

  /*
  * Theo dõi sản phẩm tạo ra nhu cầu.
  */
  const demandSources = {};

  getSheetObjects_(APP.SHEETS.KE_HOACH_SX).forEach(kh => {
    if (!kh.maSanPham || String(kh.trangThai || '').trim() !== sttKH) return;

    const ngaySX = toDate_(kh.ngaySanXuatDuKien) || toDate_(kh.ngayDauTuan);
    if (!ngaySX) return;

    // Bỏ qua kế hoạch trước ngày chốt tồn kho.
    if (ngayBatDauTinh && ngaySX < ngayBatDauTinh) return;

    // Quan trọng: index theo calcWeekStart, không theo tuần hiển thị.
    // Nhờ vậy tuần ẩn từ ngày cập nhật kho vẫn được trừ vào tồn.
    const wIndex = weekIndexOf_(ngaySX, calcWeekStart, tongSoTuanTinh);
    if (wIndex < 0) return;

    const soLuongSKU = num_(kh.soLuongSKU) || (num_(kh.soLuongKeHoach) * num_(kh.heSoQuyDoiRaSKU || 1));
    const bomRows = bomBySP[kh.maSanPham] || [];

    bomRows.forEach(bom => {
      const ma = bom.maNguyenLieu;
      const info = nlMap[ma] || {};
      const donViNguon = cleanDonVi_(bom.donViDinhLuong);
      const donViDich = getDonViTinhToan_(ma, info, tonDonViTinhToanMap, donViNguon);

      const heSoDonVi = getHeSoQuyDoiDonVi_(donViNguon, donViDich, quyDoiDonViMap, warnings, warningSet, {
        maSanPham: kh.maSanPham,
        maNguyenLieu: ma,
        tenNguyenLieu: info.tenNguyenLieu || bom.tenNguyenLieu || ma
      });

      const qty = soLuongSKU * num_(bom.dinhLuong1SKU) * heSoDonVi * (1 + num_(bom.haoHutPhanTram) / 100);
      const key = wIndex + '|' + ma;

      demand[key] = (demand[key] || 0) + qty;

      if (!demandSources[key]) {
        demandSources[key] = [];
      }

      demandSources[key].push({
        idKeHoach:
          kh.idKeHoach || '',

        maSanPham:
          kh.maSanPham || '',

        tenSanPham:
          kh.tenSanPham || kh.maSanPham || '',

        namSanXuat:
          Number(
            kh.nam ||
            getISOWeekYear_(ngaySX)
          ),

        tuanSanXuat:
          Number(
            kh.tuan ||
            getISOWeek_(ngaySX)
          ),

        ngaySanXuat:
          fmtDate_(ngaySX),

        maNguyenLieu:
          ma,

        nhuCauNguyenLieu:
          round3_(qty)
      });

      if (!firstNeedDate[key] || ngaySX < firstNeedDate[key]) {
        firstNeedDate[key] = ngaySX;
      }
    });
  });

  const inbound = {};
  getSheetObjects_(APP.SHEETS.HANG_VE).forEach(hv => {
    if (!hv.maNguyenLieu || String(hv.trangThai || '').trim() !== sttHangVe) return;

    const ngayVe = toDate_(hv.ngayDuKienVe);
    if (!ngayVe) return;

    // Bỏ qua hàng về trước ngày chốt tồn kho.
    if (ngayBatDauTinh && ngayVe < ngayBatDauTinh) return;

    // Quan trọng: index theo calcWeekStart, không theo tuần hiển thị.
    const wIndex = weekIndexOf_(ngayVe, calcWeekStart, tongSoTuanTinh);
    if (wIndex < 0) return;

    const ma = hv.maNguyenLieu;

    const heSoQuyDoiKho = (hv.heSoQuyDoiKho === '' || hv.heSoQuyDoiKho === null || hv.heSoQuyDoiKho === undefined)
      ? (tonHeSoQuyDoiKhoMap[ma] || 1)
      : num_(hv.heSoQuyDoiKho);

    // soLuongVeDuKien nhập theo donVi, sau đó quy đổi về doViTinhToan.
    const hangVeTinhToan = num_(hv.soLuongVeDuKien) * heSoQuyDoiKho;

    const key = wIndex + '|' + ma;
    inbound[key] = (inbound[key] || 0) + hangVeTinhToan;
  });

  const allMa = unique_(
    nlList.map(r => r.maNguyenLieu).filter(Boolean)
      .concat(Object.keys(tonMap))
      .concat(Object.keys(demand).map(k => k.split('|')[1]))
      .concat(Object.keys(inbound).map(k => k.split('|')[1]))
  );

  const runningTon = {};
  allMa.forEach(ma => {
    runningTon[ma] = num_(tonMap[ma]);
  });

  const rows = [];

  // Chạy toàn bộ calcWeeks để tồn được trừ/cộng từ ngày cập nhật kho.
  // Nhưng chỉ push rows ra kết quả khi w.isVisible = true.
  calcWeeks.forEach(w => {
    allMa.forEach(ma => {
      const info =
        nlMap[ma] || {};

      /*
      * Key nhu cầu sản xuất của chính tuần đang tính.
      */
      const keySanXuat =
        w.index + '|' + ma;

      /*
      * Danh sách các tuần cần giữ chỗ.
      *
      * Ví dụ:
      * tuần hiện tại = 34
      * soTuanGiuChoNguyenLieu = 2
      *
      * reserveIndexes sẽ gồm:
      * - tuần 35
      * - tuần 36
      *
      * Theo index:
      * w.index = 0
      * → reserveIndexes = [1, 2]
      */
      const reserveIndexes = [];

      for (
        let offset = 1;
        offset <= soTuanGiuChoNguyenLieu;
        offset++
      ) {
        const reserveIndex =
          w.index + offset;

        /*
        * Chỉ lấy những tuần còn nằm
        * trong khoảng tính nội bộ.
        */
        if (
          reserveIndex <
          tongSoTuanTinh
        ) {
          reserveIndexes.push(
            reserveIndex
          );
        }
      }

      const tonDau =
        num_(runningTon[ma]);

      /*
      * Nhu cầu xuất kho thực tế của tuần đang tính.
      */
      const nhuCauSanXuatTuan =
        round3_(
          num_(demand[keySanXuat])
        );

      /*
      * Nhu cầu cần giữ chỗ cho tuần N + 2.
      *
      * Nếu vượt ngoài khoảng forecast
      * thì mặc định bằng 0.
      */
      /*
      * Tổng nhu cầu cần giữ chỗ của tuần N+1 ... N+2.
      */
      let nhuCauGiuCho = 0;

      reserveIndexes.forEach(
        reserveIndex => {
          const keyGiuCho =
            reserveIndex + '|' + ma;

          nhuCauGiuCho +=
            num_(
              demand[keyGiuCho]
            );
        }
      );

      nhuCauGiuCho =
        round3_(
          nhuCauGiuCho
        );

      const hangVe =
        round3_(
          num_(inbound[keySanXuat])
        );

      const tonAnToan =
        num_(info.tonAnToan);

      /*
      * Tồn vật lý dự kiến sau khi sản xuất tuần này.
      *
      * Chỉ trừ nhu cầu sản xuất đúng tuần.
      */
      const tonSau =
        round3_(
          tonDau +
          hangVe -
          nhuCauSanXuatTuan
        );

      /*
      * Tồn có thể sử dụng tự do sau khi giữ lại
      * nguyên liệu cho tuần N + 2.
      *
      * Không dùng giá trị này để cập nhật runningTon.
      */
      const tonKhaDungSauGiuCho =
        round3_(
          tonSau -
          nhuCauGiuCho
        );
 
      /*
      * Chỉ tồn vật lý mới được chuyển sang tuần sau.
      * Không trừ nhu cầu giữ chỗ vào runningTon.
      */
      runningTon[ma] = tonSau;

      // Tuần ẩn chỉ dùng để làm nền tồn kho, không hiển thị ra giao diện.
      if (!w.isVisible) return;

      /*
      * Đánh giá thiếu hàng sau khi:
      * - sản xuất tuần hiện tại;
      * - giữ chỗ cho tuần N + 2;
      * - vẫn đảm bảo tồn an toàn.
      */
      const thieu = Math.max(
        0,
        round3_(
          tonAnToan -
          tonKhaDungSauGiuCho
        )
      );
      const quyCach = num_(info.quyCachDatHang) || 1;
      const deXuat = thieu > 0 ? Math.ceil(thieu / quyCach) * quyCach : 0;
      const lead = num_(info.soNgayVeKhoMacDinh) || 0;

      const ngayCanDungSanXuat =
        firstNeedDate[keySanXuat] ||
        w.start;

      const ngayCanDungGiuChoList =
        reserveIndexes
          .map(
            reserveIndex => {
              const keyGiuCho =
                reserveIndex +
                '|' +
                ma;

              return (
                firstNeedDate[
                  keyGiuCho
                ] ||
                calcWeeks[
                  reserveIndex
                ].start
              );
            }
          )
          .filter(Boolean);

      const ngayCanDungGiuCho =
        ngayCanDungGiuChoList.length
          ? ngayCanDungGiuChoList
              .sort(
                (a, b) => a - b
              )[0]
          : null;
          
      /*
      * Nếu có nhu cầu giữ chỗ thì lấy ngày sản xuất
      * của tuần N + 2 làm ngày cần dùng.
      *
      * Nếu không có nhu cầu giữ chỗ thì dùng ngày
      * sản xuất của tuần hiện tại.
      */
      const ngayCanDung =
        nhuCauGiuCho > 0 &&
        ngayCanDungGiuCho
          ? ngayCanDungGiuCho
          : ngayCanDungSanXuat;
          
      const ngayCanDat = addDays_(ngayCanDung, -lead - buffer);

      const mucDo = deXuat <= 0
        ? 'Du ton'
        : (ngayCanDat <= today
          ? 'Can dat gap'
          : (ngayCanDat <= addDays_(today, 7) ? 'Can dat trong 7 ngay' : 'Can dat'));

      const sourceSanXuat =
        demandSources[keySanXuat] || [];

      let sourceGiuCho = [];

        reserveIndexes.forEach(
          reserveIndex => {
            const keyGiuCho =
              reserveIndex +
              '|' +
              ma;

            sourceGiuCho =
              sourceGiuCho.concat(
                demandSources[
                  keyGiuCho
                ] || []
              );
          }
        );

      const sanPhamSanXuatTuan =
        unique_(
          sourceSanXuat
            .map(item =>
              item.tenSanPham ||
              item.maSanPham
            )
            .filter(Boolean)
        ).join(', ');

      const sanPhamGiuCho =
        unique_(
          sourceGiuCho
            .map(item =>
              item.tenSanPham ||
              item.maSanPham
            )
            .filter(Boolean)
        ).join(', ');

      const dsTuanGiuCho =
        reserveIndexes.map(
          reserveIndex => ({
            tuan:
              calcWeeks[
                reserveIndex
              ].tuan,

            nam:
              calcWeeks[
                reserveIndex
              ].nam
          })
        );

      const tuanGiuCho =
        dsTuanGiuCho
          .map(item =>
            item.tuan
          )
          .join(', ');
          
      rows.push({
        idTinhToan: 
          'DX' +
          runId +
          '_' +
          w.nam +
          String(w.tuan).padStart(2, '0') +
          '_' +
          ma,
        nam: w.nam,
        tuan: w.tuan,
        ngayDauTuan: fmtDate_(w.start),
        maNguyenLieu: ma,
        MaKeToan: info.MaKeToan || '',
        tenNguyenLieu: info.tenNguyenLieu || ma,
        loaiNguyenLieu: info.loaiNguyenLieu || '',
        donVi: getDonViTinhToan_(ma, info, tonDonViTinhToanMap, info.donVi || ''),

        /*
        * Tổng nhu cầu dùng để đánh giá đặt hàng.
        */
        nhuCauTuan:
          round3_(
            nhuCauSanXuatTuan +
            nhuCauGiuCho
          ),

        /*
        * Nhu cầu sản xuất đúng tuần hiện tại.
        */
        nhuCauSanXuatTuan:
          nhuCauSanXuatTuan,

        /*
        * Nhu cầu của tuần N + 2 cần giữ chỗ.
        */
        nhuCauGiuCho:
          nhuCauGiuCho,

        soTuanGiuChoNguyenLieu:
          soTuanGiuChoNguyenLieu,

        tuanGiuCho:
          tuanGiuCho,

        sanPhamSanXuatTuan:
          sanPhamSanXuatTuan,

        sanPhamGiuCho:
          sanPhamGiuCho,

        tonDauTuan:
          round3_(tonDau),

        hangVeTrongTuan:
          hangVe,

        tonAnToan:
          tonAnToan,

        /*
        * Tồn vật lý sau khi sản xuất tuần hiện tại.
        */
        tonDuKienSauSX:
          tonSau,

        /*
        * Tồn có thể sử dụng sau khi giữ chỗ tuần N + 2.
        */
        tonKhaDungSauGiuCho:
          tonKhaDungSauGiuCho,

        soLuongThieu: round3_(thieu),
        quyCachDatHang: quyCach,
        soLuongDeXuatDat: deXuat,
        soNgayVeKho: lead,
        ngayCanDung: fmtDate_(ngayCanDung),
        ngayCanDat: fmtDate_(ngayCanDat),
        mucDo: mucDo,
        ghiChu:
          deXuat > 0
            ? (
                nhuCauGiuCho > 0
                  ? (
                      'Cần đặt để đảm bảo sản xuất tuần ' +
                      w.tuan +
                      '/' +
                      w.nam +
                      ' và giữ chỗ cho ' +
                      tuanGiuCho +
                      '.'
                    )
                  : (
                      'Cần đặt để đảm bảo sản xuất tuần ' +
                      w.tuan +
                      '/' +
                      w.nam +
                      '.'
                    )
              )
            : (
                nhuCauGiuCho > 0
                  ? (
                      'Đủ tồn sau khi giữ chỗ cho ' +
                      tuanGiuCho +
                      '.'
                    )
                  : 'Đủ tồn'
              )
      });
    });
  });

  return { weeks, rows, warnings };
}


function getQuyDoiDonViMap_() {
  ensureQuyDoiDonViSheet_();

  const map = {};
  getSheetObjects_(APP.SHEETS.QUY_DOI_DON_VI).forEach(r => {
    if (!r.donViNguon || !r.donViDich) return;
    if (String(r.trangThai || 'Dang dung').trim() === 'Ngung dung') return;

    const key = normalizeDonVi_(r.donViNguon) + '->' + normalizeDonVi_(r.donViDich);
    map[key] = num_(r.heSoQuyDoi);
  });

  return map;
}

function cleanDonVi_(value) {
  return String(value || '')
    .trim()
    .replace(/\/SKU$/i, '')
    .trim();
}

function getDonViTinhToan_(maNguyenLieu, info, tonDonViTinhToanMap, fallback) {
  return cleanDonVi_(
    tonDonViTinhToanMap[maNguyenLieu]
    || info.doViTinhToan
    || info.donViTinhToan
    || info.donViKho
    || info.donVi
    || fallback
  );
}

function normalizeDonVi_(value) {
  return cleanDonVi_(value).toLowerCase().replace(/\s+/g, '');
}

function getHeSoQuyDoiDonVi_(donViNguon, donViDich, quyDoiMap, warnings, warningSet, context) {
  const src = normalizeDonVi_(donViNguon);
  const dst = normalizeDonVi_(donViDich);

  if (!src || !dst || src === dst) return 1;

  const key = src + '->' + dst;
  if (Object.prototype.hasOwnProperty.call(quyDoiMap, key)) {
    return num_(quyDoiMap[key]);
  }

  const message = 'Thiếu cấu hình quy đổi đơn vị: ' + donViNguon + ' -> ' + donViDich
    + ' (' + (context.maSanPham || '') + ' / ' + (context.maNguyenLieu || '') + ' - ' + (context.tenNguyenLieu || '') + ')';

  if (!warningSet[message]) {
    warningSet[message] = true;
    warnings.push(message);
  }

  // Trả về 1 để hệ thống vẫn hiển thị kết quả tạm, nhưng giao diện sẽ cảnh báo để người dùng bổ sung quy đổi.
  return 1;
}

function ensureQuyDoiDonViSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(APP.SHEETS.QUY_DOI_DON_VI);

  if (sh) return sh;

  sh = ss.insertSheet(APP.SHEETS.QUY_DOI_DON_VI);
  const headers = ['donViNguon', 'donViDich', 'heSoQuyDoi', 'ghiChu', 'trangThai'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);

  const seed = [
    ['kg', 'kg', 1, 'kg sang kg', 'Dang dung'],
    ['g', 'kg', 0.001, 'gram sang kilogram', 'Dang dung'],
    ['kg', 'g', 1000, 'kilogram sang gram', 'Dang dung'],
    ['lit', 'lit', 1, 'lit sang lit', 'Dang dung'],
    ['ml', 'lit', 0.001, 'mililit sang lit', 'Dang dung'],
    ['lit', 'ml', 1000, 'lit sang mililit', 'Dang dung'],
    ['cai', 'cai', 1, 'cai sang cai', 'Dang dung'],
    ['chiec', 'cai', 1, 'chiec sang cai', 'Dang dung'],
    ['tui', 'tui', 1, 'tui sang tui', 'Dang dung'],
    ['thung', 'thung', 1, 'thung sang thung', 'Dang dung'],
    ['cuon', 'cuon', 1, 'cuon sang cuon', 'Dang dung'],
    ['bo', 'bo', 1, 'bo sang bo', 'Dang dung'],
    ['set', 'set', 1, 'set sang set', 'Dang dung'],
    ['can', 'can', 1, 'can sang can', 'Dang dung'],
    ['chai', 'chai', 1, 'chai sang chai', 'Dang dung'],
    ['vi', 'vi', 1, 'vi sang vi', 'Dang dung'],
    ['quyen', 'quyen', 1, 'quyen sang quyen', 'Dang dung']
  ];

  sh.getRange(2, 1, seed.length, headers.length).setValues(seed);
  sh.setFrozenRows(1);
  return sh;
}

function writeDeXuat_(rows) {
  const sh = getSheet_(APP.SHEETS.DE_XUAT);
  const headers = getHeaders_(sh);

  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).clearContent();
  }

  const values = rows.map(r => headers.map(h => normalizeForSheet_(h, r[h])));
  if (values.length) {
    sh.getRange(2, 1, values.length, headers.length).setValues(values);
  }
}

function getDropdownData_() {
  const danhMuc = getDanhMucData_();

  const spRows = getSheetObjects_(APP.SHEETS.SAN_PHAM)
    .filter(r => r.maSanPham);

  const nhomSanPham = unique_(spRows
    .map(r => String(r.nhomSanPham || '').trim())
    .filter(Boolean));

  const nlRows = getSheetObjects_(APP.SHEETS.NGUYEN_LIEU)
    .filter(r => r.maNguyenLieu);

  const tonKhoRows = getSheetObjects_(APP.SHEETS.TON_KHO)
    .filter(r => r.maNguyenLieu);

  const qdRows = getSheetObjects_(APP.SHEETS.QUY_DOI)
    .filter(r => r.maQuyDoi);

  /*
  * Danh sách sản phẩm được phép theo từng khách hàng.
  * Nguồn: sheet KhachHangVaSanPham
  */
  const khachHangSanPhamRows =
    getSheetObjects_(
      APP.SHEETS.KHACH_HANG_SAN_PHAM
    )
    .filter(r =>
      r.khachHang &&
      r.maSanPham
    );

  const sp = spRows.map(r => ({
    value: r.maSanPham,
    label: (r.nhomSanPham ? '[' + r.nhomSanPham + '] ' : '') + r.maSanPham + ' - ' + r.tenSanPham,
    nhomSanPham: r.nhomSanPham || '',
    tenSanPham: r.tenSanPham || ''
  }));

  const nl = nlRows.map(r => ({
    value: r.maNguyenLieu,
    label: r.maNguyenLieu + ' - ' + r.tenNguyenLieu
  }));

  const qd = qdRows.map(r => ({
    value: r.maQuyDoi,
    label: r.maQuyDoi + ' - ' + r.donViKeHoach + ' -> ' + r.heSoQuyDoiRaSKU + ' ' + r.donViSKU
  }));

  return {
    maSanPham: sp,
    nhomSanPham: nhomSanPham,
    sanPhamList: spRows,

    /*
    * Mapping khách hàng - sản phẩm.
    * Dùng cho card Nhập kế hoạch bán hàng.
    */
    khachHangSanPhamList:
      khachHangSanPhamRows,
      
    maNguyenLieu: nl,
    maQuyDoi: qd,
    nguyenLieuList: nlRows,
    tonKhoList: tonKhoRows,
    sanPhamMap: mapBy_(spRows, 'maSanPham'),
    quyDoiMap: mapBy_(qdRows, 'maQuyDoi'),
    donViPhoBien: danhMuc.donViPhoBien || [],
    loaiNguyenLieu: danhMuc.loaiNguyenLieu || ['Nguyen lieu', 'Vat tu'],
    trangThaiSP: danhMuc.trangThaiSanPham || ['Dang dung', 'Ngung dung'],
    trangThaiKeHoach: danhMuc.trangThaiKeHoachSX || ['Nhap', 'Da duyet', 'Huy', 'Hoan thanh'],
    trangThaiTonKho: danhMuc.trangThaiTon || ['Dat', 'Cho kiem', 'Khong dat', 'Giu lai', 'Het han'],
    trangThaiHangVe: danhMuc.trangThaiHangVe || ['Dang ve', 'Da ve', 'Huy'],
    trangThaiDinhLuong: danhMuc.trangThaiDinhLuong || ['Dang dung', 'Ngung dung'],
    khachHang:
    danhMuc.khachHang || []
  };
}

function getDanhMucData_() {
  const rows = getSheetObjects_(APP.SHEETS.DANH_MUC);
  const data = {};

  rows.forEach(row => {
    Object.keys(row).forEach(key => {
      if (key === '__rowNumber') return;
      const value = String(row[key] || '').trim();
      if (!value) return;
      if (!data[key]) data[key] = [];
      if (!data[key].includes(value)) data[key].push(value);
    });
  });

  return data;
}

function getFieldMeta_(headers) {
  return headers.map(h => ({
    name: h,
    label: labelVN_(h),
    type: APP.DATE_FIELDS.includes(h)
      ? 'date'
      : (APP.NUMBER_FIELDS.includes(h) ? 'number' : 'text')
  }));
}

function labelVN_(field) {
  const m = {
    Id: 'ID',
    idKeHoach: 'ID kế hoạch',
    idTinhToan: 'ID tính toán',
    nam: 'Năm',
    tuan: 'Tuần',
    ngayDauTuan: 'Ngày đầu tuần',
    ngayCanDung: 'Ngày cần dùng',
    ngayCanDat: 'Ngày cần đặt',
    ngayTao: 'Ngày tạo',
        ngayCuoiTuan: 'Ngày cuối tuần',
        nguoiTao: 'Người tạo',

    nhomSanPham: 'Nhóm sản phẩm',
    maSanPham: 'Mã sản phẩm',
    MaKeToanTP: 'Mã kế toán TP',
    tenSanPham: 'Tên sản phẩm',
    khachHang: 'Khách hàng',
    donViSKU: 'Đơn vị SKU',

    nhuCauSanXuatTuan:
      'Nhu cầu sản xuất tuần',

    nhuCauGiuCho:
      'Nhu cầu giữ chỗ',

    soTuanGiuChoNguyenLieu:
      'Số tuần giữ chỗ',

    tuanGiuCho:
      'Tuần cần giữ chỗ',

    namGiuCho:
      'Năm giữ chỗ',

    sanPhamSanXuatTuan:
      'Sản phẩm sản xuất tuần',

    sanPhamGiuCho:
      'Sản phẩm được giữ chỗ',

    tonKhaDungSauGiuCho:
      'Tồn khả dụng sau giữ chỗ',

    maNguyenLieu: 'Mã nguyên liệu / vật tư',
    MaKeToan: 'Mã kế toán',
    tenNguyenLieu: 'Tên nguyên liệu / vật tư',
    loaiNguyenLieu: 'Loại',
    donVi: 'Đơn vị',
    donViKho: 'Đơn vị kho',
    donViKeHoach: 'Đơn vị kế hoạch',
    quyCachDatHang: 'Quy cách đặt hàng',
    quyCachDongGoi: 'Quy cách đóng gói',
    tonAnToan: 'Tồn an toàn',
    soNgayVeKhoMacDinh: 'Số ngày về kho mặc định',
    nhaCungCapChinh: 'Nhà cung cấp chính',
    nhaCungCap: 'Nhà cung cấp',
    trangThai: 'Trạng thái',

    maQuyDoi: 'Mã quy đổi',
    heSoQuyDoiRaSKU: 'Hệ số quy đổi ra SKU',
    donViNguon: 'Đơn vị nguồn',
    donViDich: 'Đơn vị đích',
    heSoQuyDoi: 'Hệ số quy đổi',
    soLuongKeHoach: 'Số lượng kế hoạch',
    soLuongSKU: 'Số lượng SKU kế hoạch',
    soLuongThucHien: 'Số lượng thực hiện',
    soLuongSKUThucHien: 'Số lượng SKU thực hiện',
    ngaySanXuatDuKien: 'Ngày sản xuất dự kiến',

    maDinhLuong: 'Mã định lượng',
    dinhLuong1SKU: 'Định lượng 1 SKU',
    donViDinhLuong: 'Đơn vị định lượng',
    haoHutPhanTram: 'Hao hụt %',

    heSoQuyDoiKho: 'Hệ số quy đổi kho',
    doViTinhToan: 'Đơn vị tính toán',

    khoiLuongNhap: 'Khối lượng nhập',
    tonDauTuanQuyDoi: 'Tồn đầu tuần quy đổi',
    LotNo: 'Lot No',
    ngaySanXuat: 'Ngày sản xuất',
    hanSuDung: 'Hạn sử dụng',
    ngayNhap: 'Ngày nhập',
    soNgayVeKho: 'Số ngày về kho',
    nguoiPheDuyetChatLuong: 'Người phê duyệt chất lượng',
    ngayPheDuyet: 'Ngày phê duyệt',
    anhChatLuong: 'Ảnh chất lượng',

    ngayDuKienVe: 'Ngày dự kiến về',
    ngayVe: 'Ngày về thực tế',
    soLuongVeDuKien: 'Số lượng về dự kiến',
    ngayYeuCauMuaHang: 'Ngày yêu cầu mua hàng',
    soYeuCauMuaHang: 'Số yêu cầu mua hàng',

    nhuCauTuan:  'Tổng nhu cầu cảnh báo',
    tonDauTuan: 'Tồn đầu tuần',
    hangVeTrongTuan: 'Hàng về trong tuần',
    tonDuKienSauSX: 'Tồn dự kiến sau sản xuất',
    soLuongThieu: 'Số lượng thiếu',
    soLuongDeXuatDat: 'Số lượng đề xuất đặt',
    mucDo: 'Mức độ',
    ghiChu: 'Ghi chú'
  };

  return m[field] || field;
}

function getNgayCapNhatKho_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(APP.SHEETS.NGAY_CAP_NHAT_KHO);

  // Nếu chưa có sheet thì hệ thống vẫn chạy theo logic cũ.
  if (!sh) return null;

  const headers = getHeaders_(sh);
  const colIndex = headers.indexOf('ngayCapNhatKho');

  if (colIndex < 0) {
    throw new Error('Sheet NgayCapNhatKho thiếu cột: ngayCapNhatKho');
  }

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return null;

  const values = sh.getRange(2, colIndex + 1, lastRow - 1, 1).getValues();

  const dates = values
    .map(row => toDate_(row[0]))
    .filter(Boolean)
    .sort((a, b) => b - a);

  // Lấy ngày cập nhật kho mới nhất.
  return dates[0] || null;
}

function getThamSo_() {
  const obj = {};

  getSheetObjects_(APP.SHEETS.THAM_SO).forEach(r => {
    if (r.thamSo) obj[r.thamSo] = r.giaTri;
  });

  return obj;
}

function getSheet_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh && name === APP.SHEETS.QUY_DOI_DON_VI) return ensureQuyDoiDonViSheet_();
  if (!sh) throw new Error('Không tìm thấy sheet: ' + name);
  return sh;
}

function getHeaders_(sh) {
  const lastCol = sh.getLastColumn();
  const values = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  return values.map(v => String(v || '').trim()).filter(Boolean);
}

function getSheetObjects_(sheetName) {
  const sh = getSheet_(sheetName);
  const headers = getHeaders_(sh);
  const lastRow = sh.getLastRow();

  if (lastRow < 2) return [];

  const values = sh.getRange(2, 1, lastRow - 1, headers.length).getValues();

  return values.map((row, i) => {
    const obj = { __rowNumber: i + 2 };
    headers.forEach((h, c) => {
      obj[h] = formatForClient_(row[c]);
    });
    return obj;
  }).filter(r => !isEmptyObject_(r));
}

function formatForClient_(v) {
  if (v instanceof Date) return fmtDate_(v);
  return v;
}

function normalizeForSheet_(field, v) {
  if (v === undefined || v === null || v === '') return '';

  if (APP.DATE_FIELDS.includes(field)) {
    const d = toDate_(v);
    return d || '';
  }

  if (APP.NUMBER_FIELDS.includes(field)) {
    const n = Number(String(v).replace(/,/g, ''));
    return isNaN(n) ? v : n;
  }

  return v;
}

function toDate_(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400 * 1000));

  const s = String(v).trim();
  if (!s) return null;

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  const parts = s.split(/[\/\-]/).map(Number);
  if (parts.length === 3) {
    if (parts[0] > 1900) return new Date(parts[0], parts[1] - 1, parts[2]);
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }

  return null;
}

function fmtDate_(d) {
  if (!d) return '';
  d = toDate_(d) || d;
  return Utilities.formatDate(d, APP.TZ, 'yyyy-MM-dd');
}

function addDays_(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getMonday_(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function getISOWeek_(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);

  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getISOWeekYear_(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return d.getUTCFullYear();
}

function weekIndexOf_(date, start, maxWeeks) {
  date = toDate_(date);
  if (!date) return -1;

  const diff = Math.floor((getMonday_(date) - start) / (7 * 86400000));
  return diff >= 0 && diff < maxWeeks ? diff : -1;
}

function mapBy_(rows, key) {
  const m = {};
  rows.forEach(r => {
    if (r[key]) m[r[key]] = r;
  });
  return m;
}

function unique_(arr) {
  return Array.from(new Set(arr));
}

function num_(v) {
  if (v === null || v === undefined || v === '') return 0;

  const n = Number(String(v).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function round3_(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000;
}

function isEmptyObject_(obj) {
  return Object.keys(obj)
    .filter(k => k !== '__rowNumber')
    .every(k => obj[k] === '' || obj[k] === null || obj[k] === undefined);
}

function assertInputSheet_(sheetName) {
  if (!APP.INPUT_SHEETS.includes(sheetName)) {
    throw new Error('Sheet không được phép thao tác: ' + sheetName);
  }
}

/**
 * Tạo khóa duy nhất cho một nguyên liệu.
 * Map theo đúng yêu cầu: maNguyenLieu + MaKeToan.
 */
function makeKhoNguyenLieuKey_(maNguyenLieu, maKeToan) {
  const maNL = normalizeKhoKeyText_(maNguyenLieu);
  const maKT = normalizeKhoKeyText_(maKeToan);

  if (!maNL || !maKT) return '';

  return maNL + '|' + maKT;
}

function normalizeKhoKeyText_(value) {
  return removeVietnameseMarks_(String(value || ''))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Đọc toàn bộ dữ liệu KhoNguyenLieu từ file 2.
 */
function getExternalKhoNguyenLieuRows_() {
  const fileId = String(
    APP.EXTERNAL.KHO_NGUYEN_LIEU_FILE_ID || ''
  ).trim();

  const sheetName = String(
    APP.EXTERNAL.KHO_NGUYEN_LIEU_SHEET || 'KhoNguyenLieu'
  ).trim();

  if (!fileId || fileId === 'DÁN_ID_FILE_2_VÀO_ĐÂY') {
    throw new Error(
      'Chưa cấu hình APP.EXTERNAL.KHO_NGUYEN_LIEU_FILE_ID.'
    );
  }

  const ss = SpreadsheetApp.openById(fileId);
  const sh = ss.getSheetByName(sheetName);

  if (!sh) {
    throw new Error(
      'Không tìm thấy sheet "' +
      sheetName +
      '" trong file Kho nguyên liệu.'
    );
  }

  const lastRow = sh.getLastRow();
  const lastColumn = sh.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return [];
  }

  const headers = sh
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(value => String(value || '').trim());

  const requiredHeaders = [
    'maNguyenLieu',
    'MaKeToan',
    'khoiLuongNhap'
  ];

  requiredHeaders.forEach(header => {
    if (!headers.includes(header)) {
      throw new Error(
        'Sheet KhoNguyenLieu thiếu cột bắt buộc: ' + header
      );
    }
  });

  const values = sh
    .getRange(2, 1, lastRow - 1, lastColumn)
    .getValues();

  return values.map((row, rowIndex) => {
    const obj = {
      __rowNumber: rowIndex + 2
    };

    headers.forEach((header, columnIndex) => {
      if (!header) return;
      obj[header] = formatForClient_(row[columnIndex]);
    });

    return obj;
  }).filter(row =>
    row.maNguyenLieu ||
    row.MaKeToan ||
    row.khoiLuongNhap
  );
}

/**
 * Tổng hợp tồn thực tế trong KhoNguyenLieu.
 *
 * Công thức:
 * tồn thực tế =
 * tổng khoiLuongNhap × heSoQuyDoiKho
 *
 * Các LotNo cùng maNguyenLieu + MaKeToan được cộng lại.
 */
function getTonThucTeMap_() {
  const rows = getExternalKhoNguyenLieuRows_();

  const map = {};
  const invalidRows = [];

  rows.forEach(row => {
    const maNguyenLieu = String(
      row.maNguyenLieu || ''
    ).trim();

    const maKeToan = String(
      row.MaKeToan || ''
    ).trim();

    const key = makeKhoNguyenLieuKey_(
      maNguyenLieu,
      maKeToan
    );

    if (!key) {
      invalidRows.push({
        rowNumber: row.__rowNumber,
        maNguyenLieu,
        MaKeToan: maKeToan
      });

      return;
    }

    const heSoQuyDoiKho =
      row.heSoQuyDoiKho === '' ||
      row.heSoQuyDoiKho === null ||
      row.heSoQuyDoiKho === undefined
        ? 1
        : num_(row.heSoQuyDoiKho);

    const khoiLuongNhap =
      num_(row.khoiLuongNhap);

    const khoiLuongTinhToan =
      khoiLuongNhap *
      heSoQuyDoiKho;

    /*
     * Phải tạo map[key] trước khi cộng dữ liệu.
     */
    if (!map[key]) {
      map[key] = {
        key,

        maNguyenLieu,
        MaKeToan: maKeToan,

        tenNguyenLieu:
          String(
            row.tenNguyenLieu || ''
          ).trim(),

        // Tổng theo đơn vị nhập kho
        tongKhoiLuongNhap: 0,

        // Tổng sau khi nhân hệ số quy đổi
        tonThucTe: 0,

        heSoQuyDoiKho:
          heSoQuyDoiKho,

        doViTinhToan:
          String(
            row.doViTinhToan || ''
          ).trim(),

        donVi:
          String(
            row.doViTinhToan ||
            row.donVi ||
            ''
          ).trim(),

        soLot: 0
      };
    }

    /*
     * Sau khi map[key] đã tồn tại mới được cộng.
     */
    map[key].tongKhoiLuongNhap +=
      khoiLuongNhap;

    map[key].tonThucTe +=
      khoiLuongTinhToan;

    map[key].soLot++;
  });

  Object.keys(map).forEach(key => {
    map[key].tongKhoiLuongNhap =
      round3_(
        map[key].tongKhoiLuongNhap
      );

    map[key].tonThucTe =
      round3_(
        map[key].tonThucTe
      );
  });

  return {
    map,
    invalidRows
  };
}

function capNhatTonKhoDauTuan() {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const sourceResult = getTonThucTeMap_();
    const sourceMap = sourceResult.map;

    const sh = getSheet_(APP.SHEETS.TON_KHO);
    const headers = getHeaders_(sh);

    const requiredHeaders = [
      'maNguyenLieu',
      'MaKeToan',
      'khoiLuongNhap',
      'tonDauTuanQuyDoi'
    ];

    requiredHeaders.forEach(header => {
      if (!headers.includes(header)) {
        throw new Error(
          'Sheet TonKho thiếu cột bắt buộc: ' + header
        );
      }
    });

    const headerIndex = {};
    headers.forEach((header, index) => {
      headerIndex[header] = index;
    });

    const lastRow = sh.getLastRow();

    const values = lastRow < 2 ? [] : sh
      .getRange(
        2,
        1,
        lastRow - 1,
        headers.length
      )
      .getValues();

    let updatedCount = 0;
    let addedCount = 0;
    let notFoundCount = 0;
    let invalidTonKhoCount = 0;

    const matchedSourceKeys = {};

    values.forEach(row => {
      const maNguyenLieu =
        row[headerIndex.maNguyenLieu];

      const maKeToan =
        row[headerIndex.MaKeToan];

      const key = makeKhoNguyenLieuKey_(
        maNguyenLieu,
        maKeToan
      );

      if (!key) {
        invalidTonKhoCount++;
        return;
      }

      const source = sourceMap[key];

      if (!source) {
        notFoundCount++;

        // Không tìm thấy trong file 2:
        // giữ nguyên tồn cũ, không đặt về 0.
        return;
      }

      /*
      * Lưu riêng hai giá trị:
      *
      * khoiLuongNhap:
      * số lượng gốc theo đơn vị kho.
      *
      * tonDauTuanQuyDoi:
      * tồn đã quy đổi về doViTinhToan.
      */
      row[headerIndex.khoiLuongNhap] =
        round3_(
          source.tongKhoiLuongNhap
        );

      row[headerIndex.tonDauTuanQuyDoi] =
        round3_(
          source.tonThucTe
        );

      matchedSourceKeys[key] = true;
      updatedCount++;
    });

    // Mỗi cặp mã nguồn đã được cộng các lô trong getTonThucTeMap_.
    // Chỉ tạo dòng cho cặp chưa có; giữ trống cấu hình đặt hàng riêng.
    Object.keys(sourceMap).forEach(key => {
      if (matchedSourceKeys[key]) return;
      const source = sourceMap[key];
      const row = headers.map(() => '');
      const fields = {
        maNguyenLieu: source.maNguyenLieu,
        MaKeToan: source.MaKeToan,
        tenNguyenLieu: source.tenNguyenLieu,
        donVi: source.donVi,
        doViTinhToan: source.doViTinhToan,
        heSoQuyDoiKho: source.heSoQuyDoiKho,
        khoiLuongNhap: round3_(source.tongKhoiLuongNhap),
        tonDauTuanQuyDoi: round3_(source.tonThucTe)
      };
      Object.keys(fields).forEach(field => {
        if (Object.prototype.hasOwnProperty.call(headerIndex, field)) {
          row[headerIndex[field]] = fields[field] === undefined ? '' : fields[field];
        }
      });
      values.push(row);
      matchedSourceKeys[key] = true;
      addedCount++;
    });

    if (updatedCount > 0 || addedCount > 0) {
      sh.getRange(
        2,
        1,
        values.length,
        headers.length
      ).setValues(values);
    }

    const sourceNotMatched = Object.keys(sourceMap)
      .filter(key => !matchedSourceKeys[key])
      .map(key => sourceMap[key]);

    ghiNgayCapNhatTonKho_();

    SpreadsheetApp.flush();

    return {
      ok: true,
      message:
        'Đã cập nhật tồn đầu tuần. ' +
        'Cập nhật: ' + updatedCount +
        ', thêm mới: ' + addedCount +
        ', không tìm thấy ở file 2: ' + notFoundCount +
        ', nguồn không map được vào TonKho: ' +
        sourceNotMatched.length +
        '.',
      updatedCount,
      addedCount,
      notFoundCount,
      invalidTonKhoCount,
      invalidSourceCount:
        sourceResult.invalidRows.length,
      sourceNotMatchedCount:
        sourceNotMatched.length,
      sourceNotMatchedSample:
        sourceNotMatched.slice(0, 20)
    };
  } finally {
    lock.releaseLock();
  }
}

function ghiNgayCapNhatTonKho_() {
  const ss = SpreadsheetApp.getActive();

  let sh = ss.getSheetByName(
    APP.SHEETS.NGAY_CAP_NHAT_KHO
  );

  if (!sh) {
    sh = ss.insertSheet(
      APP.SHEETS.NGAY_CAP_NHAT_KHO
    );

    sh.getRange(1, 1, 1, 3).setValues([[
      'ngayCapNhatKho',
      'nguonCapNhat',
      'thoiGianChay'
    ]]);

    sh.setFrozenRows(1);
  }

  const monday = getMonday_(new Date());

  sh.appendRow([
    monday,
    'KhoNguyenLieu file 2',
    new Date()
  ]);
}

function taoTriggerCapNhatTonKhoDauTuan() {
  const handlerName = 'capNhatTonKhoDauTuan';

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (
      trigger.getHandlerFunction() === handlerName
    ) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger(handlerName)
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(0)
    .nearMinute(0)
    .create();

  return {
    ok: true,
    message:
      'Đã tạo trigger cập nhật tồn kho vào đầu ngày thứ Hai.'
  };
}

function getKhoDauVaoDuKien(soTuanHienThi) {
  soTuanHienThi = Number(
    soTuanHienThi || 4
  );

  const allowedWeeks = [1, 4, 8, 12];

  if (!allowedWeeks.includes(soTuanHienThi)) {
    soTuanHienThi = 4;
  }

  /*
   * Hàm tính toán chính có thể trả tối đa 12 tuần.
   */
  const result = tinhToan12Tuan_();

  const weeks = result.weeks
    .slice(0, soTuanHienThi);

  const tonThucTeResult =
    getTonThucTeMap_();

  const tonThucTeMap =
    tonThucTeResult.map;

  /*
   * Danh sách hiển thị bắt buộc lấy từ TonKho.
   */
  const tonKhoRows = getSheetObjects_(
    APP.SHEETS.TON_KHO
  ).filter(row =>
    row.maNguyenLieu &&
    row.MaKeToan
  );

  /*
   * Kiểm tra trùng maNguyenLieu.
   * Thuật toán hiện tại tính nhu cầu theo maNguyenLieu.
   */
  const maCount = {};

  tonKhoRows.forEach(row => {
    const ma = String(
      row.maNguyenLieu || ''
    ).trim();

    maCount[ma] =
      (maCount[ma] || 0) + 1;
  });

  const duplicateMaNguyenLieu =
    Object.keys(maCount)
      .filter(ma => maCount[ma] > 1);

  const rowsByWeekAndMaterial = {};

  result.rows.forEach(row => {
    const key =
      row.nam +
      '|' +
      row.tuan +
      '|' +
      String(
        row.maNguyenLieu || ''
      ).trim();

    rowsByWeekAndMaterial[key] = row;
  });

  const groups = weeks.map(week => {
    const rows = tonKhoRows.map(tonRow => {
      const maNguyenLieu =
        String(
          tonRow.maNguyenLieu || ''
        ).trim();

      const maKeToan =
        String(
          tonRow.MaKeToan || ''
        ).trim();

      const calcKey =
        week.nam +
        '|' +
        week.tuan +
        '|' +
        maNguyenLieu;

      const calculated =
        rowsByWeekAndMaterial[calcKey] || {};

      const actualKey =
        makeKhoNguyenLieuKey_(
          maNguyenLieu,
          maKeToan
        );

      const actual =
        tonThucTeMap[actualKey] || {};

      return {
        nam: week.nam,
        tuan: week.tuan,
        ngayDauTuan:
          fmtDate_(week.start),
        ngayCuoiTuan:
          fmtDate_(week.end),

        maNguyenLieu,
        MaKeToan: maKeToan,

        tenNguyenLieu:
          tonRow.tenNguyenLieu ||
          calculated.tenNguyenLieu ||
          actual.tenNguyenLieu ||
          maNguyenLieu,

        donVi:
          tonRow.doViTinhToan ||
          calculated.donVi ||
          actual.doViTinhToan ||
          actual.donVi ||
          tonRow.donVi ||
          '',
        tonThucTe:
          round3_(
            num_(actual.tonThucTe)
          ),

        tonDauTuan:
          round3_(
            num_(calculated.tonDauTuan)
          ),

        duKienNhap:
          round3_(
            num_(
              calculated.hangVeTrongTuan
            )
          ),

        /*
        * Xuất kho thực tế dự kiến của tuần.
        */
        duKienXuat:
          round3_(
            num_(
              calculated.nhuCauSanXuatTuan
            )
          ),

        /*
        * Nhu cầu giữ chỗ cho tuần N + 2.
        */
        nhuCauGiuCho:
          round3_(
            num_(
              calculated.nhuCauGiuCho
            )
          ),

        tuanGiuCho:
          calculated.tuanGiuCho ||
          '',

        sanPhamGiuCho:
          calculated.sanPhamGiuCho ||
          '',

        tonKhaDungSauGiuCho:
          round3_(
            num_(
              calculated.tonKhaDungSauGiuCho
            )
          ),
        tonAnToan:
          round3_(
            num_(
              calculated.tonAnToan
            )
          ),

        duKienTonCuoi:
          round3_(
            num_(
              calculated.tonDuKienSauSX
            )
          )
      };
    });

    rows.sort((a, b) =>
      String(
        a.tenNguyenLieu || ''
      ).localeCompare(
        String(
          b.tenNguyenLieu || ''
        ),
        'vi'
      )
    );

    return {
      nam: week.nam,
      tuan: week.tuan,
      ngayDauTuan:
        fmtDate_(week.start),
      ngayCuoiTuan:
        fmtDate_(week.end),
      rows
    };
  });

  return {
    ok: true,
    soTuanHienThi,
    groups,
    warnings: {
      duplicateMaNguyenLieu,
      invalidExternalRows:
        tonThucTeResult.invalidRows.length
    }
  };
}

function testGetKhoDauVaoDuKien() {
  const result = getKhoDauVaoDuKien(4);

  Logger.log(JSON.stringify({
    ok: result.ok,
    soTuanHienThi: result.soTuanHienThi,
    soNhomTuan: result.groups ? result.groups.length : 0,
    soNguyenLieu:
      result.groups &&
      result.groups.length
        ? result.groups[0].rows.length
        : 0,
    warnings: result.warnings
  }, null, 2));
}

function testKetNoiKhoNguyenLieuFile2() {
  const fileId = String(
    APP.EXTERNAL.KHO_NGUYEN_LIEU_FILE_ID || ''
  ).trim();

  const sheetName = String(
    APP.EXTERNAL.KHO_NGUYEN_LIEU_SHEET || ''
  ).trim();

  const ss = SpreadsheetApp.openById(fileId);
  const sh = ss.getSheetByName(sheetName);

  if (!sh) {
    throw new Error(
      'Đã mở được file nhưng không tìm thấy sheet: ' +
      sheetName
    );
  }

  const result = {
    ok: true,
    tenFile: ss.getName(),
    tenSheet: sh.getName(),
    soDong: sh.getLastRow(),
    soCot: sh.getLastColumn()
  };

  Logger.log(JSON.stringify(result, null, 2));

  return result;
}

function testGiuChoNguyenLieu2Tuan() {
  const result =
    tinhToan12Tuan_();

  const rows =
    result.rows
      .filter(row =>
        Number(row.nhuCauSanXuatTuan || 0) > 0 ||
        Number(row.nhuCauGiuCho || 0) > 0
      )
      .map(row => ({
        nam:
          row.nam,

        tuan:
          row.tuan,

        maNguyenLieu:
          row.maNguyenLieu,

        tenNguyenLieu:
          row.tenNguyenLieu,

        nhuCauSanXuatTuan:
          row.nhuCauSanXuatTuan,

        nhuCauGiuCho:
          row.nhuCauGiuCho,

        tuanGiuCho:
          row.tuanGiuCho,

        sanPhamGiuCho:
          row.sanPhamGiuCho,

        tonDauTuan:
          row.tonDauTuan,

        hangVeTrongTuan:
          row.hangVeTrongTuan,

        tonSauSanXuat:
          row.tonDuKienSauSX,

        tonKhaDungSauGiuCho:
          row.tonKhaDungSauGiuCho,

        soLuongDeXuatDat:
          row.soLuongDeXuatDat,

        ngayCanDat:
          row.ngayCanDat,

        ghiChu:
          row.ghiChu
      }));

  Logger.log(
    JSON.stringify(
      rows.slice(0, 200),
      null,
      2
    )
  );

  return rows;
}

/**
 * ==================================================
 * LƯU SẢN PHẨM THEO KHÁCH HÀNG
 * ==================================================
 *
 * Sheet:
 * KhachHangVaSanPham
 *
 * Cột:
 * khachHang
 * nhomSanPham
 * maSanPham
 * MaKeToanTP
 * tenSanPham
 * ==================================================
 */
function saveKhachHangVaSanPhamRows(
  records
) {

  records =
    Array.isArray(records)
      ? records
      : [];


  if (!records.length) {

    throw new Error(
      'Chưa có sản phẩm nào để lưu.'
    );

  }


  const sheetName =
    APP.SHEETS
      .KHACH_HANG_SAN_PHAM;


  const sh =
    getSheet_(
      sheetName
    );


  const headers =
    getHeaders_(
      sh
    );


  const requiredHeaders = [
    'khachHang',
    'nhomSanPham',
    'maSanPham',
    'MaKeToanTP',
    'tenSanPham'
  ];


  requiredHeaders
    .forEach(header => {

      if (
        !headers.includes(
          header
        )
      ) {

        throw new Error(
          'Sheet KhachHangVaSanPham thiếu cột: ' +
          header
        );

      }

    });


  /*
   * ==========================================
   * DỮ LIỆU ĐÃ CÓ
   * ==========================================
   */

  const oldRows =
    getSheetObjects_(
      sheetName
    );


  const existingKeys =
    new Set(
      oldRows.map(row =>
        makeKhachHangSanPhamKey_(
          row.khachHang,
          row.maSanPham
        )
      )
    );


  /*
   * ==========================================
   * KIỂM TRA DỮ LIỆU MỚI
   * ==========================================
   */

  const newKeys =
    new Set();


  const validRecords = [];


  records.forEach(record => {

    const khachHang =
      String(
        record?.khachHang ||
        ''
      ).trim();


    const maSanPham =
      String(
        record?.maSanPham ||
        ''
      ).trim();


    if (
      !khachHang ||
      !maSanPham
    ) {

      throw new Error(
        'Dữ liệu thiếu Khách hàng hoặc Mã sản phẩm.'
      );

    }


    const key =
      makeKhachHangSanPhamKey_(
        khachHang,
        maSanPham
      );


    /*
     * Đã có trên sheet.
     */
    if (
      existingKeys.has(
        key
      )
    ) {

      throw new Error(
        'Sản phẩm "' +
        (
          record.tenSanPham ||
          maSanPham
        ) +
        '" đã được gán cho khách hàng "' +
        khachHang +
        '".'
      );

    }


    /*
     * Trùng ngay trong danh sách chờ.
     */
    if (
      newKeys.has(
        key
      )
    ) {

      throw new Error(
        'Danh sách đang bị trùng sản phẩm "' +
        (
          record.tenSanPham ||
          maSanPham
        ) +
        '" của khách hàng "' +
        khachHang +
        '".'
      );

    }


    newKeys.add(
      key
    );


    validRecords.push({

      khachHang:
        khachHang,

      nhomSanPham:
        String(
          record.nhomSanPham ||
          ''
        ).trim(),

      maSanPham:
        maSanPham,

      MaKeToanTP:
        String(
          record.MaKeToanTP ||
          ''
        ).trim(),

      tenSanPham:
        String(
          record.tenSanPham ||
          ''
        ).trim()

    });

  });


  /*
   * ==========================================
   * GHI SHEET
   * ==========================================
   */

  const values =
    validRecords.map(
      record =>
        headers.map(
          header =>
            record[
              header
            ] ?? ''
        )
    );


  sh
    .getRange(
      sh.getLastRow() + 1,
      1,
      values.length,
      headers.length
    )
    .setValues(
      values
    );


  SpreadsheetApp.flush();


  return {

    ok: true,

    message:
      'Đã lưu ' +
      values.length +
      ' sản phẩm theo khách hàng.',

    data:
      getSheetData(
        sheetName
      )

  };

}


function makeKhachHangSanPhamKey_(
  khachHang,
  maSanPham
) {

  return (
    String(
      khachHang ||
      ''
    )
      .trim()
      .toLowerCase()
    +
    '||'
    +
    String(
      maSanPham ||
      ''
    )
      .trim()
      .toLowerCase()
  );

}
