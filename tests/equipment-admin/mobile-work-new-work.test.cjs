const test = require("node:test"),
  a = require("node:assert/strict"),
  { setup } = require("./mobile-work-fixture.cjs");
test("Làm mới keeps its own type/title and full parallel approval flow without advancing maintenance", () => {
  const s = setup(),
    u = s.login("CongNhan"),
    t = s.login("KyThuat"),
    r = s.create(u, "new_work");
  a.equal(r.type, "new_work");
  a.ok(r.title.startsWith("Làm mới — "));
  const d = s.submit(t, s.start(t, r));
  a.deepEqual(JSON.parse(d.checklist), []);
  s.review(s.login("TruongCa"), r, d);
  a.equal(s.tables.Requests[0].status, "awaiting_pgd");
  a.equal(s.history.LichSuSuaChua.length, 0);
  s.approveBoth(r, d);
  a.equal(s.tables.Requests[0].status, "completed");
  a.equal(s.history.LichSuBaoDuong.length, 0);
  a.equal(s.history.LichSuSuaChua.length, 1);
  a.ok(s.history.LichSuSuaChua[0].noiDung.includes("Làm mới"));
  a.ok(s.history.LichSuSuaChua[0].noiDung.includes(r.description));
  a.equal(
    s.api(t, "snapshot").assets.find((a) => a.type === "component").dueDate,
    "2026-10-31",
  );
});
