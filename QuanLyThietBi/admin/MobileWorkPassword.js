function mobileWorkSetPassword_(row, passwordHash) {
  if (!Number.isInteger(row._row) || row._row < 2)
    throw Error("Không xác định được tài khoản để cập nhật.");
  const grid = mobileWorkGrid_("TaiKhoan"),
    headers = grid.values[0].map((value) => String(value).trim()),
    columns = headers
      .map((value, index) => (value === "matKhau" ? index : -1))
      .filter((index) => index >= 0);
  if (columns.length !== 1)
    throw Error("Sheet TaiKhoan: thiếu hoặc trùng cột matKhau.");
  // Update this credential cell only; account identity/role and extra columns stay intact.
  grid.sheet
    .getRange(row._row, columns[0] + 1)
    .setNumberFormat("@")
    .setValue(passwordHash);
  const context = mobileWorkGetContext_();
  context.dirty = true;
  context.grids.delete("TaiKhoan");
  context.mappedRows.delete("TaiKhoan");
  context.accounts = null;
  context.members = null;
}
function mobileWorkChangePassword_(user, input) {
  const current = input.currentPassword,
    next = input.newPassword,
    confirmation = input.confirmPassword;
  if (typeof current !== "string" || !current || current.length > 200)
    throw Error("Vui lòng nhập mật khẩu hiện tại.");
  if (
    typeof next !== "string" ||
    next.length < 8 ||
    next.length > 200 ||
    !next.trim()
  )
    throw Error("Mật khẩu mới cần từ 8 đến 200 ký tự.");
  if (next !== confirmation) throw Error("Nhập lại mật khẩu mới chưa khớp.");
  const cache = CacheService.getScriptCache(),
    failKey = "mobile-password-fail:" + adminHash_(user.email),
    attempts = Number(cache.get(failKey) || 0);
  if (attempts >= 5)
    throw Error(
      "Nhập sai mật khẩu hiện tại quá nhiều lần. Hãy thử lại sau 15 phút.",
    );
  const matches = mobileWorkCatalogRows_("TaiKhoan").filter(
    (row) => adminNorm_(row.tenDangNhap) === user.email,
  );
  if (matches.length !== 1)
    throw Error("Không xác định được đúng tài khoản đang đăng nhập.");
  const row = matches[0];
  if (!checkAdminPassword_(row.matKhau, current)) {
    cache.put(failKey, String(attempts + 1), 900);
    throw Error("Mật khẩu hiện tại không đúng.");
  }
  if (current === next) throw Error("Mật khẩu mới cần khác mật khẩu hiện tại.");
  mobileWorkSetPassword_(row, hashAdminPassword_(next));
  cache.remove(failKey);
  return { success: true, reauthenticate: true };
}
