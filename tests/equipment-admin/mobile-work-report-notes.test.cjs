const test = require("node:test"),
  a = require("node:assert/strict"),
  { setup } = require("./mobile-work-fixture.cjs");
test("report improvement and feedback survive draft reopening, submission and approval; changed replay rejects", () => {
  const s = setup(),
    u = s.login("CongNhan"),
    t = s.login("KyThuat"),
    r = s.create(u, "repair"),
    d = s.start(t, r),
    notes = {
      noiDungCaiTien: "Bổ sung tấm chắn\nGia cố giá đỡ",
      yKienDongGop: "Kiểm tra định kỳ vị trí rung",
    };
  const saved = s.api(t, "saveDraft", {
      reportId: d.id,
      revision: d.revision,
      content: "Đã xử lý",
      checks: [],
      actualResults: [],
      ...notes,
    }),
    resumed = s.start(t, s.tables.Requests[0]);
  a.equal(resumed.noiDungCaiTien, notes.noiDungCaiTien);
  a.equal(resumed.yKienDongGop, notes.yKienDongGop);
  const submitted = s.submit(t, saved, notes);
  a.throws(
    () => s.submit(t, saved, { ...notes, yKienDongGop: "Nội dung đã đổi" }),
    /nội dung khác/,
  );
  s.review(s.login("TruongCa"), r, submitted);
  s.approveBoth(r, submitted);
  const final = s.api(u, "snapshot").reports.find((x) => x.id === d.id);
  a.equal(final.noiDungCaiTien, notes.noiDungCaiTien);
  a.equal(final.yKienDongGop, notes.yKienDongGop);
});
test("empty optional notes keep legacy submission fingerprint; excessively long notes never save", () => {
  const s = setup(),
    p = {
      content: "Nội dung",
      performedDate: "2026-11-09",
      checks: [],
      actualResults: [],
    };
  s.c.mobileWorkResetContext_();
  a.equal(
    s.c.mobileWorkSubmissionFingerprint_(p),
    s.c.adminHmac_(
      JSON.stringify(["Nội dung", "2026-11-09", [], []]),
      "secret",
    ),
  );
  const u = s.login("TruongCa"),
    t = s.login("KyThuat"),
    r = s.create(u, "repair"),
    d = s.start(t, r);
  a.throws(
    () =>
      s.api(t, "saveDraft", {
        reportId: d.id,
        revision: d.revision,
        content: "Đã xử lý",
        noiDungCaiTien: "a".repeat(12001),
      }),
    /dài/,
  );
  a.equal(s.tables.ServiceReports[0].revision, d.revision);
});
