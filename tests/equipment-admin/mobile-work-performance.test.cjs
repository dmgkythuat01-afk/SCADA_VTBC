const test = require("node:test"),
  a = require("node:assert/strict"),
  { setup } = require("./mobile-work-fixture.cjs");
test("snapshot reads signing configuration once and reuses mapped members within one request", () => {
  const s = setup(),
    token = s.login("TruongCa");
  let reads = 0;
  const secret = s.c.adminSecret_;
  s.c.adminSecret_ = () => {
    reads++;
    return secret();
  };
  s.api(token, "snapshot");
  a.ok(reads <= 2, `secret read ${reads} times`);
});
test("login and writes can return fresh authorized snapshots in the same response", () => {
  const s = setup(),
    auth = s.c.loginMobile("truongca", "Test-password-2026", true);
  a.ok(auth.snapshot?.capabilities.requester);
  a.ok(!JSON.stringify(auth).includes("Test-password"));
  const r = s.create(auth.token),
    t = s.login("KyThuat"),
    result = s.api(t, "claim", {
      requestId: r.id,
      revision: r.revision,
      _withSnapshot: true,
    });
  a.equal(result.result.actualBy, "kythuat");
  a.equal(result.snapshot.requests[0].status, "in_progress");
  s.catalog.TaiKhoan[3].chucVu = "disabled";
  a.throws(() => s.api(t, "snapshot"), /hết hạn/);
});
test("table write-through retains read rows without rereading an entire sheet", () => {
  const s = setup();
  let reads = 0;
  const read = s.c.mobileWorkReadTable_;
  s.c.mobileWorkReadTable_ = (n) => {
    reads++;
    return read(n);
  };
  s.c.mobileWorkResetContext_();
  s.c.mobileWorkRows_("Notifications");
  const row = { id: "notice", recipient: "truongca", status: "unread" };
  s.c.mobileWorkWrite_("Notifications", row);
  a.equal(s.c.mobileWorkRows_("Notifications")[0].id, "notice");
  row.status = "read";
  s.c.mobileWorkWrite_("Notifications", row);
  a.equal(s.c.mobileWorkRows_("Notifications")[0].status, "read");
  a.equal(reads, 1);
  s.c.mobileWorkResetContext_();
  a.equal(s.c.mobileWorkRows_("Notifications")[0].status, "read");
  a.equal(reads, 2);
});
