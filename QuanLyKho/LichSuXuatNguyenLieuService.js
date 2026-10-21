/** Báo cáo chỉ đọc; các card lịch sử xuất mới được đặt trong module này. */
function getMaterialExportHistory(token, filter) {
  requireInventoryRole_(token);
  filter = filter || {};
  const from = String(filter.fromDate || todayText_());
  const to = String(filter.toDate || todayText_());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    throw new Error("Khoảng ngày không hợp lệ.");
  }
  const ss = getSpreadsheet_();
  let rows = [];
  ["PhieuXuatNguyenLieu", "PhieuXuatThuCong"].forEach(function(source) {
    const sheet = ss.getSheetByName(source);
    if (!sheet) throw new Error("Không tìm thấy sheet: " + source);
    const data = readSheetRowsAsObjects_(sheet);
    if (!data.rows.length) return;
    const manual = source === "PhieuXuatThuCong";
    const statusKey = manual ? "TrangThaiXuatThuCong" : "trangThaiPheDuyet";
    ["thoiGianDuyet", "maNguyenLieu", statusKey].forEach(function(key) {
      if (data.headers.indexOf(key) < 0) throw new Error(source + " thiếu cột " + key);
    });
    data.rows.forEach(function(row) {
      const status = String(row[statusKey] || "").trim().toLowerCase();
      if (manual ? status !== "đã xuất" : !isApprovedReportStatus_(status)) return;
      const day = extractDateTextForReport_(row.thoiGianDuyet);
      if (!day || day < from || day > to) return;
      rows.push({
        "Thời gian duyệt": row.thoiGianDuyet || "",
        "Mã phiếu": row[manual ? "PhieuXuatThuCongId" : "PhieuXuatId"] || "",
        "Mã nguyên liệu": row.maNguyenLieu || "",
        "Tên nguyên liệu": row.tenNguyenLieu || "",
        "Tên bài liệu": row.tenBaiLieu || "",
        "Id kho đã trừ": row.IdKhoDaTru || "",
        "LotNo": row.LotNo || "",
        "Khối lượng xuất": row[manual ? "khoiLuongNhap" : "khoiLuongXuatThucTe"] ?? "",
        "Đơn vị": row[manual ? "donVi" : "donViCanXuat"] || "",
        "Người duyệt": row[manual ? "nguoiDuyet" : "nguoiPheDuyet"] || "",
        "Ghi chú": row.ghiChu || "",
        "Sheet nguồn": source
      });
    });
  });
  rows.sort(function(a, b) { return String(b["Thời gian duyệt"]).localeCompare(String(a["Thời gian duyệt"])); });
  return { success: true, headers: ["Thời gian duyệt", "Mã phiếu", "Mã nguyên liệu", "Tên nguyên liệu", "Tên bài liệu", "Id kho đã trừ", "LotNo", "Khối lượng xuất", "Đơn vị", "Người duyệt", "Ghi chú", "Sheet nguồn"], rows: rows };
}
