let mobileWorkContext_ = null;
function mobileWorkResetContext_() {
  mobileWorkContext_ = {
    rows: new Map(),
    catalog: null,
    accounts: null,
    members: null,
    sheets: new Map(),
    grids: new Map(),
    mappedRows: new Map(),
    dirty: false,
  };
}
function mobileWorkGetContext_() {
  if (!mobileWorkContext_) mobileWorkResetContext_();
  return mobileWorkContext_;
}
function mobileWorkText_(value, max) {
  return adminText_(value, max);
}
function mobileWorkRequired_(value, label, max) {
  const text = adminText_(value, max);
  if (!text) throw Error("Vui lòng nhập " + label + ".");
  return text;
}
function mobileWorkEnabled_(row) {
  return row.active !== false && String(row.active) !== "false";
}
function mobileWorkNow_() {
  return new Date().toISOString();
}
function mobileWorkId_() {
  return Utilities.getUuid();
}
function mobileWorkParse_(value, fallback = []) {
  try {
    const parsed = JSON.parse(value || "");
    return Array.isArray(fallback) && !Array.isArray(parsed)
      ? fallback
      : parsed;
  } catch {
    return fallback;
  }
}
function mobileWorkCheckRevision_(row, input) {
  if (Number(row.revision) !== Number(input.revision))
    throw Error("Dữ liệu đã thay đổi. Hãy tải lại trước khi thực hiện.");
}
function mobileWorkMembers_() {
  const context = mobileWorkGetContext_();
  if (context.members) return context.members;
  if (!context.accounts) context.accounts = mobileWorkCatalogRows_("TaiKhoan");
  const secret = mobileWorkSecret_();
  context.members = context.accounts.map((row) => ({
    email: adminNorm_(row.tenDangNhap),
    useName: row.tenDangNhap,
    name: row.hoTen || row.tenDangNhap,
    position: row.chucVu,
    role: isAdminRole_(row.chucVu) ? "admin" : "technical",
    employeeId: row.maNhanVien || "",
    contactEmail: row.email || "",
    active:
      !!row.tenDangNhap &&
      !!row.matKhau &&
      !["disabled", "khóa", "ngừng hoạt động"].includes(adminNorm_(row.chucVu)),
    passWord: row.matKhau,
    authVersion: adminHmac_(
      JSON.stringify([row.tenDangNhap, row.matKhau, row.chucVu]),
      secret,
    ),
  }));
  return context.members;
}
function mobileWorkSafeUser_(member) {
  return {
    email: member.email,
    useName: member.useName,
    name: member.name,
    position: member.position,
    role: member.role,
    employeeId: member.employeeId,
    contactEmail: member.contactEmail,
  };
}
function loginMobile(username, password, withSnapshot) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    mobileWorkResetContext_();
    const key = adminNorm_(username),
      cache = CacheService.getScriptCache(),
      fail = "mobile-work-fail:" + adminHash_(key),
      attempts = Number(cache.get(fail) || 0);
    if (attempts >= 5)
      throw Error("Thử đăng nhập quá nhiều lần. Hãy thử lại sau 15 phút.");
    const matches = mobileWorkMembers_().filter(
        (m) => m.email === key && m.active,
      ),
      member = matches.length === 1 ? matches[0] : null;
    let allowed = false;
    if (member) {
      const c = mobileWorkCapabilities_(member);
      allowed = c.technical || c.requester || !!c.approver || c.viewer;
    }
    if (
      !member ||
      !allowed ||
      !checkAdminPassword_(member.passWord, password)
    ) {
      cache.put(fail, String(attempts + 1), 900);
      throw Error(
        "Tên đăng nhập, mật khẩu không đúng hoặc chức vụ chưa được cấp quyền.",
      );
    }
    cache.remove(fail);
    const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
    cache.put(
      "mobile-work-session:" + adminHash_(token),
      JSON.stringify({ username: key, version: member.authVersion }),
      21600,
    );
    const result = { token, user: mobileWorkSafeUser_(member) };
    if (withSnapshot === true) {
      mobileWorkReconcile_();
      result.snapshot = mobileWorkSnapshot_(result.user);
    }
    return result;
  } finally {
    try {
      mobileWorkFlush_();
    } finally {
      lock.releaseLock();
    }
  }
}
function mobileWorkIdentity_(token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
    throw Error("Phiên đăng nhập đã hết hạn.");
  const raw = CacheService.getScriptCache().get(
    "mobile-work-session:" + adminHash_(token),
  );
  if (!raw) throw Error("Phiên đăng nhập đã hết hạn.");
  const session = JSON.parse(raw),
    matches = mobileWorkMembers_().filter(
      (m) => m.email === session.username && m.active,
    ),
    member = matches.length === 1 ? matches[0] : null;
  if (!member || member.authVersion !== session.version)
    throw Error("Phiên đăng nhập đã hết hạn.");
  mobileWorkRequireAccess_(member);
  return mobileWorkSafeUser_(member);
}
function logoutMobile(token) {
  if (typeof token === "string")
    CacheService.getScriptCache().remove(
      "mobile-work-session:" + adminHash_(token),
    );
  return { success: true };
}
