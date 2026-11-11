function maintenanceEscape_(v) {
  return String(v == null ? "" : v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function maintenanceReportData_() {
  const history = maintenanceHistories_(),
    today = maintenanceToday_(),
    devices = readAdminRows_("DanhMucThietBi").map((d) =>
      maintenanceProjection_(d, history, today),
    );
  return {
    today,
    devices: devices
      .filter((d) => ["overdue", "today", "upcoming"].includes(d.trangThai))
      .sort((a, b) => a.soNgayConLai - b.soNgayConLai),
    unconfigured: devices.filter((d) => d.trangThai === "unconfigured").length,
    pending: history.filter((h) => !maintenanceCompleted_(h.hoanThanh)).length,
  };
}
function maintenanceSendReport_() {
  const settings = maintenanceSettings_();
  if (settings.guiEmail !== "true")
    return { skipped: true, reason: "disabled" };
  const emails = String(settings.emailNhanBaoCao || "")
    .split(/[,;\s]+/)
    .filter(Boolean);
  if (!emails.length) return { skipped: true, reason: "no_recipient" };
  if (emails.some((e) => !/^\S+@\S+\.\S+$/.test(e)))
    throw Error("Email báo cáo không hợp lệ.");
  const report = maintenanceReportData_(),
    id = "BD_EMAIL_" + report.today,
    previous = maintenanceRows_("NhatKyThongBaoBaoDuong").find(
      (r) => r.maThongBao === id,
    );
  if (previous && previous.trangThai === "sent")
    return { skipped: true, reason: "already_sent" };
  if (previous && previous.trangThai === "sending")
    return { skipped: true, reason: "delivery_uncertain" };
  const counts = { overdue: 0, today: 0, upcoming: 0 };
  report.devices.forEach((d) => counts[d.trangThai]++);
  const row = {
    ...(previous || {}),
    maThongBao: id,
    ngayBaoCao: report.today,
    trangThai: "sending",
    nguoiNhan: emails.join(","),
    soQuaHan: counts.overdue,
    soDenHan: counts.today,
    soSapDenHan: counts.upcoming,
    noiDungLoi: "",
    thoiGianGui: "",
  };
  const status = {
      overdue: "Quá hạn",
      today: "Đến hạn hôm nay",
      upcoming: "Trong 14 ngày tới",
    },
    escape = maintenanceEscape_,
    cell = (value) => maintenanceEscape_(String(value || "").slice(0, 120)),
    app = ScriptApp.getService().getUrl() || "";
  const body =
    "<h2>DMG · Báo cáo bảo dưỡng " +
    escape(report.today) +
    "</h2><p>Quá hạn: <b>" +
    counts.overdue +
    "</b> · Đến hạn: <b>" +
    counts.today +
    "</b> · Trong 14 ngày tới: <b>" +
    counts.upcoming +
    '</b></p><table border="1" cellpadding="8" cellspacing="0"><tr><th>Xưởng</th><th>Máy</th><th>Thiết bị</th><th>Người quản lý</th><th>Hạn bảo dưỡng</th><th>Trạng thái</th></tr>' +
    report.devices
      .slice(0, 100)
      .map(
        (d) =>
          "<tr><td>" +
          cell(d.tenXuong) +
          "</td><td>" +
          cell(d.tenMay) +
          "</td><td>" +
          cell(d.maThietBi + " · " + (d.tenThietBi || "")) +
          "</td><td>" +
          cell(d.tenNguoiQuanLy) +
          "</td><td>" +
          escape(d.ngayDenHan) +
          "</td><td>" +
          status[d.trangThai] +
          "</td></tr>",
      )
      .join("") +
    "</table><p>Email hiển thị tối đa 100 thiết bị ưu tiên theo hạn. Xem danh sách đầy đủ và tải Excel trong app.</p><p>Thiết bị chưa đủ thông tin tính lịch: " +
    report.unconfigured +
    ". Bản ghi chưa hoàn thành: " +
    report.pending +
    '.</p><p>Thiết bị quá hạn tiếp tục được nhắc cho đến khi có lần bảo dưỡng hoàn thành.</p><p><a href="' +
    escape(app) +
    '">Mở trang quản lý thiết bị</a></p>';
  maintenanceWrite_("NhatKyThongBaoBaoDuong", row);
  let delivered = false;
  try {
    MailApp.sendEmail({
      to: emails.join(","),
      subject:
        "DMG · Bảo dưỡng: " +
        counts.overdue +
        " quá hạn, " +
        counts.upcoming +
        " sắp đến hạn · " +
        report.today,
      body: "Xem báo cáo bảo dưỡng tại " + app,
      htmlBody: body,
    });
    delivered = true;
    row.trangThai = "sent";
    row.thoiGianGui = adminNow_();
    maintenanceWrite_("NhatKyThongBaoBaoDuong", row);
    return { sent: true, counts };
  } catch (error) {
    if (delivered)
      throw Error(
        "Email đã gửi nhưng chưa ghi xong nhật ký. Kiểm tra nhật ký trước khi gửi lại.",
      );
    row.trangThai = "failed";
    row.noiDungLoi = String(error.message || error).slice(0, 2000);
    maintenanceWrite_("NhatKyThongBaoBaoDuong", row);
    throw error;
  }
}
function baoCaoBaoDuongDinhKy_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const day = maintenanceDate_(maintenanceToday_()).getUTCDay();
    if (![1, 5].includes(day))
      return { skipped: true, reason: "not_report_day" };
    if (typeof mobileWorkReconcileIfReady_ === "function") mobileWorkReconcileIfReady_();
    return maintenanceSendReport_();
  } finally {
    lock.releaseLock();
  }
}
