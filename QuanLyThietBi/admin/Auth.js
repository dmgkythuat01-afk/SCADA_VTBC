function adminSecret_() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty("AUTH_SECRET");
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    p.setProperty("AUTH_SECRET", s);
  }
  return s;
}
function adminHmac_(v, key) {
  return Utilities.computeHmacSha256Signature(String(v), String(key))
    .map((b) => (b & 255).toString(16).padStart(2, "0"))
    .join("");
}
function adminEqual_(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length)
    return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
function isAdminRole_(role) {
  return ["admin", "quản trị", "quản trị viên", "quantri"].includes(
    adminNorm_(role),
  );
}
function checkAdminPassword_(stored, input) {
  if (typeof input !== "string" || !input || input.length > 200) return false;
  const m = /^\$eq\$1\$([a-zA-Z0-9-]+)\$([a-f0-9]{64})$/.exec(stored);
  return m
    ? adminEqual_(m[2], adminHmac_(input, m[1] + adminSecret_()))
    : adminEqual_(
        adminHmac_(stored, adminSecret_()),
        adminHmac_(input, adminSecret_()),
      );
}
function hashAdminPassword_(password) {
  if (password.length < 8 || password.length > 200)
    throw Error("Mật khẩu cần từ 8 đến 200 ký tự.");
  const salt = Utilities.getUuid();
  return "$eq$1$" + salt + "$" + adminHmac_(password, salt + adminSecret_());
}
function adminAuthVersion_(r) {
  return adminHmac_(
    JSON.stringify([r.tenDangNhap, r.matKhau, r.chucVu]),
    adminSecret_(),
  );
}
function adminUser_(row) {
  return {
    username: row.tenDangNhap,
    name: row.hoTen,
    role: row.chucVu,
    employeeId: row.maNhanVien,
  };
}
function loginAdmin(username, password) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const key = adminNorm_(username),
      cache = CacheService.getScriptCache(),
      failKey = "data-admin-fail:" + adminHash_(key),
      attempts = Number(cache.get(failKey) || 0);
    if (attempts >= 5)
      throw Error("Thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.");
    const matches = readAdminRows_("TaiKhoan").filter(
        (r) => adminNorm_(r.tenDangNhap) === key,
      ),
      r = matches.length === 1 ? matches[0] : null;
    if (
      !r ||
      !isAdminRole_(r.chucVu) ||
      !checkAdminPassword_(r.matKhau, password)
    ) {
      cache.put(failKey, String(attempts + 1), 900);
      throw Error(
        "Tài khoản, mật khẩu không đúng hoặc chưa có quyền quản trị.",
      );
    }
    cache.remove(failKey);
    const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
    cache.put(
      "data-admin-session:" + adminHash_(token),
      JSON.stringify({ username: key, version: adminAuthVersion_(r) }),
      21600,
    );
    return { token, user: adminUser_(r) };
  } finally {
    lock.releaseLock();
  }
}
function requireAdminSession_(token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
    throw Error("Phiên đăng nhập đã hết hạn.");
  const raw = CacheService.getScriptCache().get(
    "data-admin-session:" + adminHash_(token),
  );
  if (!raw) throw Error("Phiên đăng nhập đã hết hạn.");
  const session = JSON.parse(raw),
    matches = readAdminRows_("TaiKhoan").filter(
      (r) => adminNorm_(r.tenDangNhap) === session.username,
    ),
    row = matches.length === 1 ? matches[0] : null;
  if (
    !row ||
    !isAdminRole_(row.chucVu) ||
    session.version !== adminAuthVersion_(row)
  )
    throw Error("Phiên đăng nhập đã hết hạn.");
  return adminUser_(row);
}
function logoutAdmin(token) {
  if (typeof token === "string")
    CacheService.getScriptCache().remove(
      "data-admin-session:" + adminHash_(token),
    );
  return { success: true };
}
function doGet() {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("DMG Quản lý thiết bị")
    .addMetaTag(
      "viewport",
      "width=device-width, initial-scale=1, viewport-fit=cover",
    );
}
function adminApi(token, action, payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const user = requireAdminSession_(token),
      p = payload || {};
    if (action === "snapshot") return adminSnapshot_(user);
    if (!["save", "delete"].includes(action))
      throw Error("Thao tác không hợp lệ.");
    const receiptKey =
        "data-admin-write:" +
        adminHash_(user.username + ":" + adminText_(p.requestId, 100)),
      cache = CacheService.getScriptCache(),
      fingerprint = adminHash_(
        JSON.stringify([action, p.table, p._row, p._version, p.values]),
      );
    if (!p.requestId) throw Error("Thiếu mã thao tác.");
    const previous = cache.get(receiptKey);
    if (previous) {
      if (previous !== fingerprint) throw Error("Mã thao tác đã được sử dụng.");
      return adminSnapshot_(user);
    }
    if (action === "save") saveAdminData_(p.table, p);
    else deleteAdminData_(p.table, p);
    cache.put(receiptKey, fingerprint, 21600);
    return adminSnapshot_(user);
  } finally {
    lock.releaseLock();
  }
}
