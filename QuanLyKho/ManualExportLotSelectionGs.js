/** Selectable lots for worker-created manual vouchers. All writes follow fresh validation. */
function manualExportLotRevision_(line) {
  return JSON.stringify([line.PhieuXuatThuCongId, line.rowNumber, line.maNguyenLieu, line.tenNguyenLieu, line.MaKeToan, line.donVi, String(line.khoiLuongNhap)].map(normalizeText_));
}
function buildManualExportLotPreview_(groups) {
  groups.forEach(group => group.items.forEach(line => {
    line.PhieuXuatThuCongId = group.PhieuXuatThuCongId;
    line.PhieuXuatId = group.PhieuXuatThuCongId;
    line.KeHoachId = '';
    line.donViCanXuat = line.donVi;
    line.khoiLuongCanXuat = line.khoiLuongNhap;
    line.khoiLuongXuatThucTe = line.khoiLuongNhap;
  }));
  buildExportLotPreview_(groups);
  groups.forEach(group => {
    group.items.forEach(line => {
      line.revision = manualExportLotRevision_(line);
      line.tonKhoKhaDungKg = line.lotOptions.reduce((sum,lot) => sum+lot.qtyKg,0);
    });
    group.duToanBo = group.items.every(line => line.duSoLuong);
  });
  return groups;
}
function approveManualExportWithLots_(token, payload) {
  const session = requireInventoryRole_(token), lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!payload || typeof payload !== 'object' || !normalizeText_(payload.phieuXuatThuCongId) || !Array.isArray(payload.items) || !payload.items.length) throw new Error('Vui l\u00f2ng t\u1ea3i l\u1ea1i phi\u1ebfu v\u00e0 ch\u1ecdn l\u00f4 xu\u1ea5t.');
    const id = normalizeText_(payload.phieuXuatThuCongId), sheet = getSheet_(SHEET_PHIEU_XUAT_THU_CONG);
    const values = sheet.getDataRange().getValues(), headers = values[0].map(normalizeText_), idx = manualApprovalGetHeaderIndex_(headers);
    const clients = new Map();
    payload.items.forEach(item => {
      const rowNumber = Number(item && item.rowNumber);
      if (!Number.isInteger(rowNumber) || rowNumber < 2 || clients.has(rowNumber)) throw new Error('D\u00f2ng phi\u1ebfu kh\u00f4ng h\u1ee3p l\u1ec7 ho\u1eb7c tr\u00f9ng.');
      clients.set(rowNumber,item);
    });
    const lines = [];
    values.slice(1).forEach((row,offset) => {
      if (normalizeText_(row[idx.PhieuXuatThuCongId]) !== id || !['\u0111\u00e3 t\u1ea1o','da tao'].includes(normalizeText_(row[idx.TrangThaiXuatThuCong]).toLowerCase())) return;
      const rowNumber = offset+2, client = clients.get(rowNumber);
      if (!client) throw new Error('Thi\u1ebfu ph\u00e2n b\u1ed5 l\u00f4 cho d\u00f2ng '+rowNumber+'.');
      const line = {rowNumber, PhieuXuatThuCongId:id, khoiLuongNhap:Number(row[idx.khoiLuongNhap])};
      ['maNguyenLieu','tenNguyenLieu','MaKeToan','donVi'].forEach(field => line[field] = normalizeText_(manualApprovalValue_(row,idx[field])));
      if (client.revision !== manualExportLotRevision_(line)) throw new Error('Th\u00f4ng tin phi\u1ebfu \u0111\u00e3 thay \u0111\u1ed5i. H\u00e3y t\u1ea3i l\u1ea1i phi\u1ebfu.');
      Object.assign(line,{donViCanXuat:line.donVi,khoiLuongCanXuat:line.khoiLuongNhap,khoiLuongXuatThucTe:line.khoiLuongNhap,allocations:client.allocations});
      lines.push(line);
    });
    if (!lines.length || lines.length !== clients.size) throw new Error('Phi\u1ebfu kh\u00f4ng c\u00f2n \u0110\u00e3 t\u1ea1o ho\u1eb7c danh s\u00e1ch d\u00f2ng kh\u00f4ng kh\u1edbp.');
    const prepared = validateExportLotSelections_(lines,line => getApprovedStockLotsForExport_(line.maNguyenLieu,line.tenNguyenLieu,line.MaKeToan));
    const stock = getSheet_(SHEET_KHO_NGUYEN_LIEU), kIdx = getKhoHeaderIndex_(stock.getDataRange().getValues()[0].map(normalizeText_));
    const fields = ['LotNo','ngaySanXuat','hanSuDung','khoiLuongXuatThucTeTheoLotNo','chiTietTruKho'], columns = {};
    fields.forEach(field => {
      let column = headers.indexOf(field)+1;
      if (!column) {column = sheet.getLastColumn()+1;sheet.getRange(1,column).setValue(field);headers.push(field);}
      columns[field] = column;
    });
    prepared.stock.forEach(state => {
      stock.getRange(state.lot.rowNumber,kIdx.khoiLuongNhap+1).setValue(state.remainingNative);
      if (state.remainingNative <= 0.000001) stock.getRange(state.lot.rowNumber,kIdx.trangThai+1).setValue('\u0110\u00e3 xu\u1ea5t h\u1ebft');
    });
    const time = nowText_();
    prepared.lines.forEach(line => {
      ['LotNo','ngaySanXuat','hanSuDung'].forEach(field => sheet.getRange(line.rowNumber,columns[field]).setValue(line.parts.map(part => part.lot[field] || '').join(', ')));
      sheet.getRange(line.rowNumber,columns.khoiLuongXuatThucTeTheoLotNo).setValue(line.parts.map(part => String(part.exportQty)).join(', '));
      sheet.getRange(line.rowNumber,columns.chiTietTruKho).setValue(JSON.stringify(line.parts.map(part => ({IdKho:part.id,khoiLuong:part.nativeQty,donVi:part.unit}))));
      sheet.getRange(line.rowNumber,idx.IdKhoDaTru+1).setValue(line.parts.map(part => part.id).join(', '));
      sheet.getRange(line.rowNumber,idx.nguoiDuyet+1).setValue(session.useName || '');
      sheet.getRange(line.rowNumber,idx.thoiGianDuyet+1).setValue(time);
      sheet.getRange(line.rowNumber,idx.TrangThaiXuatThuCong+1).setValue('\u0110\u00e3 xu\u1ea5t');
    });
    return {success:true,message:'\u0110\u00e3 duy\u1ec7t v\u00e0 tr\u1eeb \u0111\u00fang c\u00e1c l\u00f4 \u0111\u00e3 ch\u1ecdn.',phieu:getPendingManualExportApprovalsInternal_()};
  } finally {lock.releaseLock();}
}
