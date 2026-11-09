const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
test("new history log writes preserve extra cells and retain row index for status updates", () => {
  const c = {};
  vm.createContext(c);
  for (const n of ["Schema", "MaintenanceStore"])
    vm.runInContext(
      fs.readFileSync("QuanLyThietBi/admin/" + n + ".js", "utf8"),
      c,
    );
  const headers = Array.from(
      vm.runInContext("MAINTENANCE_TABLES.NhatKyThongBaoBaoDuong", c),
    )
      .reverse()
      .concat("ghiChuRieng"),
    data = [headers];
  const sheet = {
    getLastRow: () => data.length,
    getLastColumn: () => headers.length,
    getMaxRows: () => 1000,
    getRange: (r, col, n = 1, width = 1) => ({
      getValues: () =>
        Array.from({ length: n }, (_, i) =>
          Array.from(
            { length: width },
            (_, j) => data[r - 1 + i]?.[col - 1 + j] ?? "",
          ),
        ),
      setNumberFormat() {
        return this;
      },
      setValues(values) {
        for (let i = 0; i < values.length; i++) {
          data[r - 1 + i] ??= [];
          values[i].forEach((v, j) => (data[r - 1 + i][col - 1 + j] = v));
        }
        return this;
      },
    }),
  };
  c.maintenanceTable_ = () => sheet;
  c.SpreadsheetApp = { flush() {} };
  const row = {
    maThongBao: "MAIL_1",
    ngayBaoCao: "2026-11-09",
    trangThai: "sending",
    nguoiNhan: "owner@example.com",
  };
  c.maintenanceWrite_("NhatKyThongBaoBaoDuong", row);
  a.equal(row._row, 2);
  data[1][headers.indexOf("ghiChuRieng")] = "KEEP";
  row.trangThai = "sent";
  c.maintenanceWrite_("NhatKyThongBaoBaoDuong", row);
  a.equal(data.length, 2);
  a.equal(data[1][headers.indexOf("ghiChuRieng")], "KEEP");
  a.equal(c.maintenanceRows_("NhatKyThongBaoBaoDuong")[0].trangThai, "sent");
});
