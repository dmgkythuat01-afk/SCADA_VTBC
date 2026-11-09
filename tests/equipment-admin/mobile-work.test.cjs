const test = require("node:test"),
  a = require("node:assert/strict"),
  { setup } = require("./mobile-work-fixture.cjs");
test("current TaiKhoan authenticates all roles without exposing passwords; current catalogue uses direct workshop-machine-device hierarchy", () => {
  const s = setup();
  for (const role of [
    "TruongCa",
    "CongNhan",
    "PhongCongNghe",
    "KyThuat",
    "CoKhi",
    "TuDongHoa",
    "admin",
  ]) {
    const token = s.login(role),
      data = s.api(token, "snapshot");
    a.equal(data.user.position, role);
    a.ok(!JSON.stringify(data).includes("Test-password"));
    a.equal(data.assets.filter((a) => a.type === "area").length, 0);
    const d = data.assets.find((a) => a.type === "component");
    a.equal(d.name, "Động cơ · TB01");
    a.equal(d.quantity, 2);
    a.equal(
      data.assets.find(
        (a) => a.id === data.assets.find((m) => m.id === d.parentId).parentId,
      ).type,
      "workshop",
    );
  }
  const token = s.login("CongNhan");
  s.catalog.TaiKhoan[1].matKhau = "changed";
  a.throws(() => s.api(token, "snapshot"), /hết hạn/);
});
test("any technician handles a request; rework preserved; only requester accepts; accepted history advances due once", () => {
  const s = setup(),
    requester = s.login("TruongCa"),
    other = s.login("CongNhan"),
    tech = s.login("CoKhi"),
    tech2 = s.login("TuDongHoa"),
    r = s.create(requester),
    d = s.start(tech, r);
  a.equal(s.api(tech, "snapshot").requests.length, 1);
  a.equal(s.api(other, "snapshot").requests.length, 0);
  let submitted = s.submit(tech, d, { actualBy: "spoofed" });
  a.equal(submitted.actualBy, "cokhi");
  a.equal(s.history.LichSuBaoDuong.length, 0);
  a.throws(() => s.review(other, r, submitted), /người tạo/);
  s.review(requester, r, submitted, "reject");
  a.equal(s.tables.Requests[0].status, "rework");
  a.equal(s.history.LichSuBaoDuong.length, 0);
  const d2 = s.start(tech2, s.tables.Requests[0]);
  submitted = s.submit(tech2, d2);
  s.review(requester, r, submitted);
  s.review(requester, r, submitted);
  a.equal(s.tables.Requests[0].status, "completed");
  a.equal(s.history.LichSuBaoDuong.length, 1);
  a.equal(s.history.LichSuBaoDuong[0].nguoiThucHien, "tudonghoa");
  a.equal(
    s.tables.ServiceReports.filter((d) => d.status !== "draft").length,
    2,
  );
  a.equal(
    s.api(tech, "snapshot").assets.find((a) => a.type === "component").dueDate,
    "2026-12-09",
  );
});
test("machine-only and repair histories do not advance device maintenance; same physical asset code in different workshop remains distinct", () => {
  const s = setup(),
    u = s.login("PhongCongNghe"),
    t = s.login("KyThuat");
  for (const [type, device] of [
    ["maintenance", false],
    ["repair", true],
  ]) {
    const r = s.create(u, type, device),
      d = s.submit(t, s.start(t, r));
    s.review(u, r, d);
  }
  a.equal(s.history.LichSuBaoDuong[0].maThietBi, "");
  a.equal(s.history.LichSuSuaChua.length, 1);
  a.equal(
    s.api(t, "snapshot").assets.find((a) => a.type === "component").dueDate,
    "2026-10-31",
  );
  s.catalog.DanhMucThietBi.push({
    ...s.catalog.DanhMucThietBi[0],
    tenXuong: "Xưởng B",
    tenMay: "Máy trộn",
  });
  a.equal(
    s.api(t, "snapshot").assets.filter((a) => a.type === "component").length,
    2,
  );
});
test("changed standards reset draft checks; require fresh criteria and all actual results before submission", () => {
  const s = setup(),
    u = s.login("CongNhan"),
    t = s.login("KyThuat"),
    r = s.create(u);
  let d = s.start(t, r);
  s.catalog.DanhMucCanKiemTra[0].thongSoTieuChuan = "<50°C";
  a.throws(() => s.submit(t, d), /thay đổi/);
  d = s.start(t, s.tables.Requests[0]);
  a.deepEqual(JSON.parse(d.checks), []);
  a.throws(() => s.submit(t, d, { actualResults: [""] }), /kết quả thực tế/);
  a.throws(() => s.submit(t, d, { checks: [false] }), /kết quả thực tế/);
  a.equal(s.tables.ServiceReports[0].status, "draft");
});
test("concurrent drafts first submission wins; changed replay rejects; intermittent accepted-history write recovers exactly once", () => {
  const s = setup(),
    u = s.login("TruongCa"),
    t = s.login("KyThuat"),
    t2 = s.login("CoKhi"),
    r = s.create(u),
    d = s.start(t, r),
    d2 = s.start(t2, s.tables.Requests[0]);
  s.submit(t, d);
  a.throws(() => s.submit(t2, d2), /thay đổi/);
  a.throws(() => s.submit(t, d, { content: "Changed" }), /nội dung khác/);
  let blocked = true;
  s.failWrite(
    (n, row) => n === "Requests" && row.status === "completed" && blocked,
  );
  a.throws(() => s.review(u, r, d), /simulated/);
  a.equal(s.history.LichSuBaoDuong.length, 1);
  blocked = false;
  s.api(u, "snapshot");
  a.equal(s.tables.Requests[0].status, "completed");
  a.equal(s.tables.ServiceReviews[0].processed, true);
  a.equal(s.history.LichSuBaoDuong.length, 1);
});
test("photos remain private for draft; upload replay deduplicates and submitted creator can read report photos", () => {
  const s = setup(),
    u = s.login("TruongCa"),
    t = s.login("KyThuat"),
    t2 = s.login("CoKhi"),
    r = s.create(u);
  let d = s.start(t, r);
  const payload = {
      reportId: d.id,
      revision: d.revision,
      uploadKey: "photo-1",
      dataUrl: "data:image/jpeg;base64,/9j/2Q==",
      name: "Kết quả.jpg",
    },
    p = s.api(t, "uploadPhoto", payload);
  s.api(t, "uploadPhoto", payload);
  a.equal(s.files.size, 1);
  a.throws(
    () => s.api(t2, "photo", { reportId: d.id, id: p.attachment.id }),
    /không được/,
  );
  a.throws(
    () => s.api(u, "photo", { reportId: d.id, id: p.attachment.id }),
    /không được/,
  );
  d = p.report;
  s.submit(t, d);
  a.ok(s.api(u, "photo", { reportId: d.id, id: p.attachment.id }).dataUrl);
  s.review(u, r, d);
  a.equal(JSON.parse(s.history.LichSuBaoDuong[0].danhSachAnh).length, 1);
});
