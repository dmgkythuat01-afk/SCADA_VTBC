const test = require("node:test"),
  a = require("node:assert/strict"),
  { setup } = require("./mobile-work-fixture.cjs");
test("requested completion date persists separately from actual completion through all approval stages", () => {
  const s = setup(),
    u = s.login("CongNhan"),
    t = s.login("KyThuat"),
    sample = s.create(u),
    r = s.api(u, "create", {
      ...sample,
      requestKey: "deadline-test",
      ngayDeNghiHoanThanh: "2026-11-20",
    });
  a.equal(r.ngayDeNghiHoanThanh, "2026-11-20");
  a.equal(r.completedDate, "");
  const d = s.submit(t, s.start(t, r));
  s.review(s.login("TruongCa"), r, d);
  s.approveBoth(r, d);
  const final = s.api(u, "snapshot").requests.find((x) => x.id === r.id);
  a.equal(final.ngayDeNghiHoanThanh, "2026-11-20");
  a.equal(final.completedDate, "2026-11-09");
});
test("deadline is optional for existing requests and rejects invalid dates before creating a row", () => {
  const s = setup(),
    u = s.login("TruongCa"),
    sample = s.create(u);
  a.equal(sample.ngayDeNghiHoanThanh, "");
  const count = s.tables.Requests.length;
  a.throws(
    () =>
      s.api(u, "create", {
        ...sample,
        requestKey: "invalid-deadline",
        ngayDeNghiHoanThanh: "2026-02-30",
      }),
    /Ngày/,
  );
  a.equal(s.tables.Requests.length, count);
});
