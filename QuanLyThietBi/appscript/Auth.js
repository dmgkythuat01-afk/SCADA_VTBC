// TaiKhoan: tenDangNhap | matKhau | chucVu | hoTen. Store maps internal keys.
function authSecret_() {
  const p = props_();
  let secret = p.getProperty("AUTH_SECRET");
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    p.setProperty("AUTH_SECRET", secret);
  }
  return secret;
}
function authDigest_(value, key) {
  return Utilities.computeHmacSha256Signature(String(value), String(key))
    .map((b) => (b & 255).toString(16).padStart(2, "0"))
    .join("");
}
function authRole_(value) {
  const role = text_(value).toLocaleLowerCase("vi");
  return ["admin", "quản trị", "quản trị viên", "quantri"].includes(role)
    ? "admin"
    : "technician";
}
function accountEnabled_(row) {
  return (
    !!text_(row.useName) &&
    !!text_(row.passWord) &&
    !["disabled", "khóa", "ngừng hoạt động"].includes(
      text_(row.role).toLocaleLowerCase("vi"),
    )
  );
}
function members_() {
  return rows_("Account").map((row) => ({
    _row: row._row,
    useName: row.useName,
    email: text_(row.useName, 100).toLowerCase(),
    name: text_(row.name) || text_(row.useName),
    role: authRole_(row.role),
    position: text_(row.role),
    active: accountEnabled_(row),
    passWord: String(row.passWord || ""),
    authVersion: authDigest_(String(row.passWord || ""), authSecret_()),
  }));
}
function setMemberPassword_(member, password) {
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 200
  )
    throw Error("Mật khẩu mới phải từ 12 đến 200 ký tự.");
  const salt = Utilities.getUuid();
  member.passWord =
    "$eq$1$" + salt + "$" + authDigest_(password, salt + authSecret_());
  member.authVersion = authDigest_(member.passWord, authSecret_());
}
function equalAuth_(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length)
    return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function checkPassword_(stored, password) {
  if (typeof password !== "string" || !password || password.length > 200)
    return false;
  const match = /^\$eq\$1\$([a-zA-Z0-9-]+)\$([a-f0-9]{64})$/.exec(stored);
  if (match)
    return equalAuth_(
      match[2],
      authDigest_(password, match[1] + authSecret_()),
    );
  return equalAuth_(
    authDigest_(stored, authSecret_()),
    authDigest_(password, authSecret_()),
  );
}
function sessionKey_(token) {
  return "eq-session:" + authDigest_(token, authSecret_());
}
function loginEquipment(useName, password) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const key = text_(useName, 100).toLowerCase(),
      cache = CacheService.getScriptCache(),
      attemptKey = "eq-fail:" + authDigest_(key, authSecret_()),
      attempts = Number(cache.get(attemptKey) || 0);
    if (attempts >= 5)
      throw Error("Thử đăng nhập quá nhiều lần. Hãy thử lại sau 15 phút.");
    const matches = members_().filter((m) => m.email === key && enabled_(m)),
      m = matches.length === 1 ? matches[0] : null;
    if (!m || !checkPassword_(m.passWord, password)) {
      cache.put(attemptKey, String(attempts + 1), 900);
      throw Error("Tên đăng nhập hoặc mật khẩu không đúng.");
    }
    cache.remove(attemptKey);
    const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
    cache.put(
      sessionKey_(token),
      JSON.stringify({ email: key, version: m.authVersion }),
      21600,
    );
    return {
      token,
      user: {
        email: key,
        useName: m.useName,
        name: m.name,
        role: m.role,
        position: m.position,
      },
    };
  } finally {
    lock.releaseLock();
  }
}
function identity_(token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
    throw Error("Phiên đăng nhập đã hết hạn.");
  const raw = CacheService.getScriptCache().get(sessionKey_(token));
  if (!raw) throw Error("Phiên đăng nhập đã hết hạn.");
  const session = JSON.parse(raw),
    matches = members_().filter(
      (m) => m.email === session.email && enabled_(m),
    ),
    m = matches.length === 1 ? matches[0] : null;
  if (!m || m.authVersion !== session.version)
    throw Error("Phiên đăng nhập đã hết hạn.");
  return {
    email: m.email,
    useName: m.useName,
    name: m.name,
    role: m.role,
    position: m.position,
  };
}
function logoutEquipment(token) {
  if (typeof token === "string" && /^[a-f0-9]{64}$/.test(token))
    CacheService.getScriptCache().remove(sessionKey_(token));
  return { success: true };
}
function equipmentLoginInfo() {
  return {
    initialized: members_().some((m) => m.role === "admin" && enabled_(m)),
  };
}
function requireSetupOwner_() {
  const owner = Session.getEffectiveUser().getEmail(),
    active = Session.getActiveUser().getEmail();
  if (!owner || !active || owner.toLowerCase() !== active.toLowerCase())
    throw Error("Chỉ chủ project được chạy hàm này trong Apps Script editor.");
}
function resetEquipmentAdminPassword() {
  requireSetupOwner_();
  ensureStore_();
  const old = rows_("Account").find(
      (r) => text_(r.useName).toLowerCase() === "admin",
    ),
    account = Object.assign(old || {}, {
      useName: "admin",
      role: "admin",
      name: "Quản trị viên",
    }),
    password = Utilities.getUuid().replace(/-/g, "").slice(0, 24);
  setMemberPassword_(account, password);
  write_("Account", account);
  console.log("Tên đăng nhập: admin | Mật khẩu khởi tạo: " + password);
  return { useName: "admin", password };
}
function admin_(u) {
  if (u.role !== "admin")
    throw Error("Chỉ quản trị viên được thực hiện thao tác này.");
}
function setupEquipmentApp() {
  requireSetupOwner_();
  ensureStore_();
  const p = props_();
  let credentials = null;
  if (!members_().some((m) => m.role === "admin" && enabled_(m)))
    credentials = resetEquipmentAdminPassword();
  if (!settings_().reportEmails)
    setting_("reportEmails", Session.getEffectiveUser().getEmail());
  setting_("appUrl", ScriptApp.getService().getUrl() || "");
  let folder = p.getProperty("PHOTO_FOLDER");
  if (!folder)
    p.setProperty(
      "PHOTO_FOLDER",
      DriveApp.createFolder("DMG_AnhBaoTriThietBi").getId(),
    );
  ScriptApp.getProjectTriggers()
    .filter((t) =>
      ["scheduledEquipmentReport", "scheduledEquipmentReport_"].includes(
        t.getHandlerFunction(),
      ),
    )
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("scheduledEquipmentReport_")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .inTimezone("Asia/Ho_Chi_Minh")
    .create();
  ScriptApp.newTrigger("scheduledEquipmentReport_")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.FRIDAY)
    .atHour(8)
    .inTimezone("Asia/Ho_Chi_Minh")
    .create();
  return {
    spreadsheet: db_().getUrl(),
    owner: Session.getEffectiveUser().getEmail(),
    appUrl: ScriptApp.getService().getUrl(),
    credentials,
  };
}
function doGet() {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("DMG Qu\u1ea3n l\u00fd thi\u1ebft b\u1ecb")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
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
      report: manualReport_,
    };
    if (!actions[action]) throw Error("Thao tác không hợp lệ.");
    return actions[action](u, p);
  } finally {
    lock.releaseLock();
  }
}
