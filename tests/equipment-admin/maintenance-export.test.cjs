const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
test("Excel export produces a ZIP workbook with text cells instead of executable formulas", () => {
  const source = fs
      .readFileSync("QuanLyThietBi/archive/admin-maintenance-20261111/MaintenanceExport.html", "utf8")
      .replace(/<\/?script>/g, ""),
    c = { window: {}, TextEncoder };
  vm.createContext(c);
  vm.runInContext(source, c);
  const bytes = c.window.MaintenanceExcel.workbook(
    ["Thiết bị", "Kết quả"],
    [["=1+1", "Đạt < 60°C"]],
  );
  const buf = Buffer.from(bytes);
  a.equal(buf.readUInt32LE(0), 0x04034b50);
  a.ok(buf.includes(Buffer.from("xl/worksheets/sheet1.xml")));
  a.ok(buf.includes(Buffer.from("inlineStr")));
  a.ok(buf.includes(Buffer.from("Đạt &lt; 60°C")));
  a.ok(!buf.includes(Buffer.from("<f>")));
});
