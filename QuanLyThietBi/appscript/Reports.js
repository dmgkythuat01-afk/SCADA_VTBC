function reportData_() {
  const today = today_(),
    assets = rows_("Assets"),
    schedules = rows_("Schedules").filter(enabled_),
    jobs = rows_("Jobs");
  const path = (id) => {
    const labels = [];
    let a = assets.find((x) => x.id === id),
      guard = 0;
    while (a && guard++ < 5) {
      labels.unshift(a.name);
      a = assets.find((x) => x.id === a.parentId);
    }
    return labels.join(" / ");
  };
  return {
    today,
    overdue: schedules.filter((s) => dueState_(s.dueDate, today) === "overdue"),
    soon: schedules.filter((s) => dueState_(s.dueDate, today) === "soon"),
    ongoing: jobs.filter((j) => j.status !== "completed"),
    completed: jobs.filter(
      (j) =>
        j.status === "completed" &&
        String(j.completedDate) >=
          new Date(validDate_(today).getTime() - 7 * 86400000)
            .toISOString()
            .slice(0, 10),
    ),
    path,
  };
}
function reportHtml_(r) {
  const section = (title, items, isJob) =>
    "<h3>" +
    title +
    " (" +
    items.length +
    ')</h3><table border="1" cellpadding="7" cellspacing="0" style="border-collapse:collapse;width:100%"><tr><th>Vị trí</th><th>Công việc</th><th>Hạn / ngày</th><th>Người phụ trách</th></tr>' +
    items
      .map(
        (x) =>
          "<tr><td>" +
          escape_(r.path(x.componentId)) +
          "</td><td>" +
          escape_(x.name || x.title) +
          "</td><td>" +
          escape_(
            isJob
              ? x.completedDate || String(x.openedAt).slice(0, 10)
              : x.dueDate,
          ) +
          "</td><td>" +
          escape_(x.assignee) +
          "</td></tr>",
      )
      .join("") +
    "</table>";
  return (
    '<div style="font-family:Arial;color:#173b32"><h2>Báo cáo bảo dưỡng thiết bị — ' +
    r.today +
    "</h2>" +
    section("Đến hạn / quá hạn", r.overdue, false) +
    section("Đến hạn trong 14 ngày tới", r.soon, false) +
    section("Công việc chưa hoàn thành", r.ongoing, true) +
    section("Hoàn thành trong 7 ngày qua", r.completed, true) +
    '<p><a href="' +
    escape_(
      settings_().appUrl ||
        "https://script.google.com/macros/s/AKfycbwK1JwWhrazLtOZ7YnPZedvkS71KLvCWCQDY52fvmLVk4505FulJFF_ER7Cz1mkaYguJg/exec",
    ) +
    '">Mở ứng dụng quản lý thiết bị</a></p></div>'
  );
}
function scheduledEquipmentReport_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return sendReport_(false);
  } finally {
    lock.releaseLock();
  }
}
function manualReport_(u) {
  admin_(u);
  return sendReport_(true);
}
function sendReport_(manual) {
  reconcileSchedules_();
  const r = reportData_(),
    config = settings_(),
    emails = String(config.reportEmails || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  if (!emails.length) throw Error("Chưa cấu hình người nhận báo cáo.");
  const logs = rows_("Notifications"),
    failed = [];
  let count = 0;
  const send = (kind, recipient, fn) => {
    const key = r.today + ":" + kind + ":" + recipient;
    if (!manual && logs.some((x) => x.id === key && x.status === "sent"))
      return;
    try {
      fn();
      write_("Notifications", {
        id: manual ? id_() : key,
        date: r.today,
        kind,
        recipient,
        status: "sent",
        message: "",
        sentAt: now_(),
      });
      count++;
    } catch (e) {
      failed.push(recipient + ": " + e.message);
      write_("Notifications", {
        id: id_(),
        date: r.today,
        kind,
        recipient,
        status: "failed",
        message: text_(e.message, 1000),
        sentAt: now_(),
      });
    }
  };
  emails.forEach((email) =>
    send("email", email, () =>
      MailApp.sendEmail({
        to: email,
        subject:
          "[DMG Thiết bị] " +
          r.overdue.length +
          " việc đến/quá hạn — " +
          r.today,
        body:
          "Xem báo cáo: " + (config.appUrl || ScriptApp.getService().getUrl()),
        htmlBody: reportHtml_(r),
      }),
    ),
  );
  return { success: failed.length === 0, sent: count, errors: failed };
}
