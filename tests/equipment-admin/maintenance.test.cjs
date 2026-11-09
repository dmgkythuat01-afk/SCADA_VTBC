const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
function domain() {
  const c = {};
  vm.createContext(c);
  vm.runInContext(
    fs.readFileSync("QuanLyThietBi/admin/MaintenanceDomain.js", "utf8"),
    c,
  );
  return c;
}
test("maintenance identity keeps accents just like catalog keys", () => {
  const c = domain();
  a.notEqual(
    c.maintenanceDeviceKey_({ tenXuong: "A", tenMay: "M", maThietBi: "Bom" }),
    c.maintenanceDeviceKey_({ tenXuong: "A", tenMay: "M", maThietBi: "Bơm" }),
  );
  a.equal(
    c.maintenanceDeviceKey_({
      tenXuong: " XƯỞNG ",
      tenMay: "M",
      maThietBi: "T1",
    }),
    c.maintenanceDeviceKey_({
      tenXuong: "xưởng",
      tenMay: "m",
      maThietBi: "t1",
    }),
  );
});
test("due dates use actual completed maintenance, keep overdue red and include day14", () => {
  const c = domain(),
    device = {
      tenXuong: "A",
      tenMay: "M",
      maThietBi: "T",
      ngayLapDat: "2026-01-31",
      soNgayCanBaoDuong: "30",
      dangSuDung: "Có",
    },
    key = c.maintenanceDeviceKey_(device);
  a.equal(
    c.maintenanceProjection_(device, [], "2026-03-02").ngayDenHan,
    "2026-03-02",
  );
  a.equal(
    c.maintenanceProjection_(device, [], "2026-03-03").trangThai,
    "overdue",
  );
  a.equal(
    c.maintenanceProjection_(device, [], "2026-02-16").trangThai,
    "upcoming",
  );
  const h = [
    {
      ...device,
      loai: "maintenance",
      hoanThanh: "true",
      ngayThucHien: "2026-02-28",
      maHoSo: key,
    },
    {
      ...device,
      loai: "repair",
      hoanThanh: "true",
      ngayThucHien: "2026-03-10",
    },
    {
      ...device,
      loai: "maintenance",
      hoanThanh: "false",
      ngayThucHien: "2026-03-15",
    },
  ];
  a.equal(
    c.maintenanceProjection_(device, h, "2026-03-16").ngayDenHan,
    "2026-03-30",
  );
  a.equal(
    c.maintenanceProjection_(
      { ...device, soNgayCanBaoDuong: "" },
      h,
      "2026-03-16",
    ).trangThai,
    "unconfigured",
  );
});
test("date arithmetic handles leap years, inactive devices and invalid dates", () => {
  const c = domain();
  a.equal(c.maintenanceAddDays_("2028-02-28", 2), "2028-03-01");
  a.throws(() => c.maintenanceAddDays_("2026-02-30", 1));
  a.equal(
    c.maintenanceProjection_({ dangSuDung: "Không" }, [], "2026-11-09")
      .trangThai,
    "inactive",
  );
});
