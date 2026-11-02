// Đọc và kiểm tra trước khi hoàn kho; chỉ ghi trạng thái sau khi hủy KHSX thành công.
function chuanBiDongBoPhieuHuy_(planId) {
  const sheet = getSpreadsheet_().getSheetByName(SHEET_PHIEU_XUAT_NGUYEN_LIEU);
  if (!sheet) return null;
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0].map(normalizeText_);
  const planIndex = headers.indexOf('KeHoachId'), statusIndex = headers.indexOf('trangThaiPheDuyet');
  if (planIndex < 0 || statusIndex < 0) throw new Error('PhieuXuatNguyenLieu thiếu cột KeHoachId hoặc trangThaiPheDuyet.');
  const rows = [];
  values.slice(1).forEach((row, index) => {
    if (normalizeText_(row[planIndex]) === normalizeText_(planId) && normalizeText_(row[statusIndex]) !== 'Hủy kế hoạch') rows.push(index + 2);
  });
  return {sheet, rows, statusColumn: statusIndex + 1};
}

function ghiTrangThaiPhieuHuy_(prepared) {
  if (!prepared) return 0;
  prepared.rows.forEach(row => prepared.sheet.getRange(row, prepared.statusColumn).setValue('Hủy kế hoạch'));
  return prepared.rows.length;
}
