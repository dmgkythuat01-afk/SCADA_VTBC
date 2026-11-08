function identity_(token) {
  if (typeof token !== "string" || token.length < 100 || token.length > 10000)
    throw Error("Vui lòng đăng nhập lại.");
  const key =
    props_().getProperty("FIREBASE_API_KEY") ||
    "AIzaSyC3WV90H4_-6HcpORXms5LtwQZuSHav1Y4";
  if (!key) throw Error("Chưa cấu hình Firebase. Chạy setupEquipmentApp.");
  const res = UrlFetchApp.fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" +
      encodeURIComponent(key),
    {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ idToken: token }),
      muteHttpExceptions: true,
    },
  );
  if (res.getResponseCode() !== 200) throw Error("Phiên đăng nhập đã hết hạn.");
  const u = JSON.parse(res.getContentText()).users[0];
  if (!u || !u.emailVerified || u.disabled)
    throw Error("Tài khoản chưa được xác minh.");
  if (
    !rows_("Members").length &&
    String(u.email).toLowerCase() ===
      Session.getEffectiveUser().getEmail().toLowerCase()
  )
    setupEquipmentApp();
  const member = rows_("Members").find(
    (m) =>
      String(m.email).toLowerCase() === String(u.email).toLowerCase() &&
      enabled_(m),
  );
  if (!member) throw Error("Email này chưa được quản trị viên cấp quyền.");
  return {
    email: String(u.email).toLowerCase(),
    name: member.name || u.displayName || u.email,
    role: member.role,
  };
}
function admin_(u) {
  if (u.role !== "admin")
    throw Error("Chỉ quản trị viên được thực hiện thao tác này.");
}
function setupEquipmentApp() {
  ensureStore_();
  const p = props_();
  if (!rows_("Members").length)
    write_("Members", {
      email: Session.getEffectiveUser().getEmail().toLowerCase(),
      name: "Quản trị viên",
      role: "admin",
      active: true,
    });
  if (!settings_().reportEmails)
    setting_("reportEmails", Session.getEffectiveUser().getEmail());
  setting_("appUrl", "https://dmg-quanly-thietbi.web.app");
  let folder = p.getProperty("PHOTO_FOLDER");
  if (!folder)
    p.setProperty(
      "PHOTO_FOLDER",
      DriveApp.createFolder("DMG_AnhBaoTriThietBi").getId(),
    );
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === "scheduledEquipmentReport")
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("scheduledEquipmentReport")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .inTimezone("Asia/Ho_Chi_Minh")
    .create();
  ScriptApp.newTrigger("scheduledEquipmentReport")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.FRIDAY)
    .atHour(8)
    .inTimezone("Asia/Ho_Chi_Minh")
    .create();
  return {
    spreadsheet: db_().getUrl(),
    owner: Session.getEffectiveUser().getEmail(),
  };
}
function doGet(e) {
  const t = HtmlService.createTemplateFromFile("Bridge");
  t.channel = /^[a-f0-9]{64}$/.test(String(e && e.parameter.channel))
    ? e.parameter.channel
    : "";
  return t
    .evaluate()
    .setTitle("DMG Equipment API")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function equipmentApi(token, action, payload) {
  const u = identity_(token),
    p = payload || {};
  if (action === "snapshot") {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      reconcileSchedules_();
      return snapshot_(u);
    } finally {
      lock.releaseLock();
    }
  }
  if (action === "photo") return readPhoto_(u, p);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const actions = {
      saveAsset: saveAsset_,
      saveSchedule: saveSchedule_,
      openJob: openJob_,
      assignJob: assignJob_,
      completeJob: completeJob_,
      uploadPhoto: uploadPhoto_,
      saveSettings: saveSettings_,
      saveMember: saveMember_,
      registerDevice: registerDevice_,
      report: manualReport_,
    };
    if (!actions[action]) throw Error("Thao tác không hợp lệ.");
    return actions[action](u, p);
  } finally {
    lock.releaseLock();
  }
}
