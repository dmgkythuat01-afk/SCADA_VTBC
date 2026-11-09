const test = require("node:test"),
  a = require("node:assert/strict"),
  { setup } = require("./mobile-work-fixture.cjs");
function prepared() {
  const s = setup();
  s.catalog.TaiKhoan.push(
    ...["PGDChatLuong", "PGDSanXuat", "PGDCongNghe"].filter(role=>!s.catalog.TaiKhoan.some(r=>r.chucVu===role)).map((role) => ({
      tenDangNhap: role.toLowerCase(),
      matKhau: "Test-password-2026",
      hoTen: role,
      chucVu: role,
    })),
  );
  const u = s.login("CongNhan"),
    tc = s.login("TruongCa"),
    t = s.login("KyThuat"),
    q = s.login("PGDChatLuong"),
    p = s.login("PGDSanXuat"),
    observer = s.login("PGDCongNghe"),
    r = s.create(u),
    d = s.submit(t, s.start(t, r));
  const approve = (
    token,
    decision = "accept",
    report = d,
    key = token + report.id,
    revision = r.revision,
  ) =>
    s.api(token, "approve", {
      requestId: r.id,
      reportId: report.id,
      decision,
      reason: decision === "reject" ? "Còn lỗi vận hành" : "Đồng ý",
      reviewKey: key,
      revision,
    });
  return { ...s, u, tc, t, q, p, observer, r, d, approve };
}
for (const order of ["quality-first", "production-first"])
  test(
    "parallel deputy approval " +
      order +
      " finalizes only after both, accepts same pre-sign revision",
    () => {
      const s = prepared();
      a.throws(() => s.approve(s.q), /trưởng ca|chờ phê duyệt/i);
      a.throws(() => s.review(s.u, s.r, s.d), /trưởng ca/i);
      s.review(s.tc, s.r, s.d);
      a.equal(s.tables.Requests[0].status, "awaiting_pgd");
      a.equal(s.history.LichSuBaoDuong.length, 0);
      a.equal(s.tables.Requests[0].trangThaiPGDChatLuong, "Chờ phê duyệt");
      a.equal(s.tables.Requests[0].trangThaiPGDSanXuat, "Chờ phê duyệt");
      const first = order === "quality-first" ? s.q : s.p,
        last = order === "quality-first" ? s.p : s.q;
      s.approve(first);
      a.equal(s.tables.Requests[0].status, "awaiting_pgd");
      a.equal(s.history.LichSuBaoDuong.length, 0);
      s.approve(last);
      a.equal(s.tables.Requests[0].status, "completed");
      a.equal(s.history.LichSuBaoDuong.length, 1);
      s.approve(last);
      a.equal(s.history.LichSuBaoDuong.length, 1);
      a.equal(
        s.api(s.t, "snapshot").assets.find((a) => a.type === "component")
          .dueDate,
        "2026-12-09",
      );
      a.ok(s.tables.ServiceReviews.every((r) => r.processed));
    },
  );
test("each deputy signs only own branch; observer can view but cannot sign, work or confirm", () => {
  const s = prepared();
  a.equal(s.api(s.observer, "snapshot").requests.length, 1);
  s.review(s.tc, s.r, s.d);
  a.throws(() => s.approve(s.observer), /quyền|PGĐ/i);
  a.throws(() => s.approve(s.t), /quyền|PGĐ/i);
  a.throws(() => s.review(s.observer, s.r, s.d), /trưởng ca/i);
  s.approve(s.q);
  a.equal(s.tables.Requests[0].trangThaiPGDSanXuat, "Chờ phê duyệt");
  a.throws(() => s.approve(s.q, "reject", s.d, "another-key"), /đã|không còn/i);
  a.equal(s.tables.Requests[0].trangThaiPGDChatLuong, "Đã phê duyệt");
});
test("one rejection returns to technical; fresh report and shift confirmation reset both; stale old signatures rejected", () => {
  const s = prepared();
  s.review(s.tc, s.r, s.d);
  s.approve(s.q);
  s.approve(s.p, "reject");
  a.equal(s.tables.Requests[0].status, "rework");
  a.equal(s.history.LichSuBaoDuong.length, 0);
  const fresh = s.submit(s.t, s.start(s.t, s.tables.Requests[0]));
  a.throws(
    () => s.approve(s.q, "accept", s.d, "stale-old-report"),
    /báo cáo|phiếu|chờ/i,
  );
  s.review(s.tc, s.r, fresh);
  a.equal(s.tables.Requests[0].trangThaiPGDChatLuong, "Chờ phê duyệt");
  a.equal(s.tables.Requests[0].trangThaiPGDSanXuat, "Chờ phê duyệt");
  s.approve(s.p, "accept", fresh);
  a.equal(s.history.LichSuBaoDuong.length, 0);
  s.approve(s.q, "accept", fresh);
  a.equal(s.history.LichSuBaoDuong.length, 1);
  a.equal(s.tables.ServiceReports.length, 2);
});
test("final signing recovers partial completion exactly once; old completed records remain unchanged", () => {
  const s = prepared();
  s.review(s.tc, s.r, s.d);
  s.approve(s.q);
  let blocked = true;
  s.failWrite(
    (n, row) => blocked && n === "Requests" && row.status === "completed",
  );
  a.throws(() => s.approve(s.p), /simulated/);
  a.equal(s.history.LichSuBaoDuong.length, 1);
  blocked = false;
  s.api(s.q, "snapshot");
  a.equal(s.tables.Requests[0].status, "completed");
  a.equal(s.history.LichSuBaoDuong.length, 1);
  s.tables.Requests.push({
    ...s.tables.Requests[0],
    id: "old-completed",
    trangThaiPGDChatLuong: "",
    trangThaiPGDSanXuat: "",
  });
  s.api(s.q, "snapshot");
  a.equal(s.tables.Requests[1].status, "completed");
});
