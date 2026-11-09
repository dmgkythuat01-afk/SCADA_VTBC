const test = require("node:test"),
  a = require("node:assert/strict"),
  { setup } = require("./mobile-work-fixture.cjs");
test("credential writer updates only the password cell using physical header order", () => {
  const s = setup(),
    writes = [];
  s.c.mobileWorkGrid_ = () => ({
    values: [["hoTen", "chucVu", "matKhau", "tenDangNhap", "ghiChu"]],
    sheet: {
      getRange: (row, column) => ({
        setNumberFormat() {
          return this;
        },
        setValue(value) {
          writes.push({ row, column, value });
          return this;
        },
      }),
    },
  });
  s.c.mobileWorkSetPassword_({ _row: 7 }, "$eq$1$test$hash");
  a.deepEqual(writes, [{ row: 7, column: 3, value: "$eq$1$test$hash" }]);
  a.throws(() => s.c.mobileWorkSetPassword_({ _row: 1 }, "hash"), /tài khoản/);
});
function prepared() {
  const s = setup();
  s.c.mobileWorkSetPassword_ = (row, hash) => {
    s.catalog.TaiKhoan.find((r) => r.tenDangNhap === row.tenDangNhap).matKhau =
      hash;
  };
  return s;
}
test("password change checks old password, hashes only own credential and invalidates all prior sessions", () => {
  const s = prepared(),
    token = s.login("CongNhan"),
    otherSession = s.login("CongNhan"),
    before = structuredClone(s.catalog.TaiKhoan),
    payload = {
      currentPassword: "Test-password-2026",
      newPassword: "New-password-2026!",
      confirmPassword: "New-password-2026!",
      username: "admin",
    };
  a.throws(
    () =>
      s.api(token, "changePassword", { ...payload, currentPassword: "wrong" }),
    /hiện tại/,
  );
  a.deepEqual(s.catalog.TaiKhoan, before);
  a.throws(
    () =>
      s.api(token, "changePassword", {
        ...payload,
        confirmPassword: "mismatch",
      }),
    /khớp/,
  );
  a.throws(
    () =>
      s.api(token, "changePassword", {
        ...payload,
        newPassword: "short",
        confirmPassword: "short",
      }),
    /8/,
  );
  const result = s.api(token, "changePassword", payload);
  a.equal(result.success, true);
  a.equal(result.reauthenticate, true);
  a.ok(s.catalog.TaiKhoan[1].matKhau.startsWith("$eq$1$"));
  a.ok(!JSON.stringify(result).includes(payload.newPassword));
  a.deepEqual(
    { ...s.catalog.TaiKhoan[1], matKhau: before[1].matKhau },
    before[1],
  );
  a.deepEqual(s.catalog.TaiKhoan[6], before[6]);
  a.throws(() => s.api(token, "snapshot"), /hết hạn/);
  a.throws(() => s.api(otherSession, "snapshot"), /hết hạn/);
  a.throws(() => s.login("CongNhan"), /không đúng/);
  a.ok(s.c.loginMobile("congnhan", payload.newPassword).token);
});
test("all authorized roles can change password, including hashed credentials; wrong attempts are limited", () => {
  const s = prepared();
  for (const row of s.catalog.TaiKhoan) {
    const token = s.login(row.tenDangNhap),
      p = {
        currentPassword: "Test-password-2026",
        newPassword: "Changed-password-2026!",
        confirmPassword: "Changed-password-2026!",
      };
    s.api(token, "changePassword", p);
    const token2 = s.c.loginMobile(row.tenDangNhap, p.newPassword).token;
    s.api(token2, "changePassword", {
      currentPassword: p.newPassword,
      newPassword: "Changed-again-2026!",
      confirmPassword: "Changed-again-2026!",
    });
  }
  const t = prepared(),
    token = t.login("KyThuat"),
    p = {
      currentPassword: "wrong",
      newPassword: "Changed-password-2026!",
      confirmPassword: "Changed-password-2026!",
    };
  for (let i = 0; i < 5; i++)
    a.throws(() => t.api(token, "changePassword", p), /hiện tại/);
  a.throws(
    () =>
      t.api(token, "changePassword", {
        ...p,
        currentPassword: "Test-password-2026",
      }),
    /quá nhiều/,
  );
});
