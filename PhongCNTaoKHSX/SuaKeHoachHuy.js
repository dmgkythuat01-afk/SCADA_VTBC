// Chạy thủ công trong Apps Script để sửa các KHSX bị hủy thiếu dòng bởi bản cũ.
// Hàm private: không gọi được từ google.script.run; chỉ đồng bộ trạng thái, không hoàn kho.
function suaKeHoachHuyThieuDong_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet_(SHEET_KE_HOACH_SAN_XUAT);
    ensureKeHoachHeader_(sheet);
    const values = sheet.getDataRange().getValues();
    const idx = getKeHoachHeaderIndex_(values[0].map(normalizeText_));
    if (idx.trangThai < 0 || idx.daHoanKhoKhiHuy < 0) throw new Error('Thiếu cột trạng thái / hoàn kho.');
    const groups = new Map();
    values.slice(1).forEach((row, index) => {
      const id = normalizeText_(row[idx.Id]);
      if (!id) return;
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push({rowNumber: index + 2, status: normalizeText_(row[idx.trangThai]), flag: normalizeText_(row[idx.daHoanKhoKhiHuy])});
    });
    const result = {updatedPlans: 0, updatedRows: 0, skippedPlans: []};
    groups.forEach((rows, id) => {
      if (!rows.some(row => row.status === 'Hủy kế hoạch')) return;
      const flags = [...new Set(rows.map(row => row.flag).filter(Boolean))];
      // Không tự suy đoán nếu chưa có cờ xác nhận kết quả hủy hoặc cờ mâu thuẫn.
      if (flags.length !== 1 || !['Đã hoàn kho', 'Không cần hoàn kho'].includes(flags[0])) {
        result.skippedPlans.push(id); return;
      }
      let changed = false;
      rows.forEach(row => {
        if (row.status === 'Hủy kế hoạch' && row.flag === flags[0]) return;
        if (idx.daHoanKhoKhiHuy === idx.trangThai + 1) {
          sheet.getRange(row.rowNumber, idx.trangThai + 1, 1, 2).setValues([['Hủy kế hoạch', flags[0]]]);
        } else {
          sheet.getRange(row.rowNumber, idx.daHoanKhoKhiHuy + 1).setValue(flags[0]);
          sheet.getRange(row.rowNumber, idx.trangThai + 1).setValue('Hủy kế hoạch');
        }
        changed = true; result.updatedRows++;
      });
      if (changed) result.updatedPlans++;
    });
    console.log(JSON.stringify(result));
    return result;
  } finally { lock.releaseLock(); }
}
