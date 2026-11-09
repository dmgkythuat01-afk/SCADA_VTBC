const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
test("mobile storage maps reordered headers, keeps identifiers as text and preserves extra cells on updates", () => {
  const c = {};
  vm.createContext(c);
  for (const n of [
    "Schema",
    "MobileWorkAuth",
    "MobileWorkIO",
    "MobileWorkStore",
  ])
    vm.runInContext(
      fs.readFileSync("QuanLyThietBi/admin/" + n + ".js", "utf8"),
      c,
    );
  const headers = Array.from(
      vm.runInContext("MOBILE_WORK_SCHEMA.Requests.columns", c),
    )
      .reverse()
      .concat("ghiChuRieng"),
    data = [headers],
    sheet = {
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
        setValues(rows) {
          rows.forEach((row, i) => {
            data[r - 1 + i] ??= [];
            row.forEach((value, j) => (data[r - 1 + i][col - 1 + j] = value));
          });
          return this;
        },
      }),
    };
  let reads = 0,
    opens = 0;
  sheet.getDataRange = () => ({
    getValues: () => {
      reads++;
      return structuredClone(data);
    },
  });
  c.SpreadsheetApp = {
    openById() {
      opens++;
      return { getSheetByName: () => sheet };
    },
    flush() {},
  };
  const row = {
    id: "REQ_001",
    deviceCode: "00123",
    status: "new",
    description: "=untrusted",
  };
  c.mobileWorkPersist_("Requests", row);
  a.equal(row._row, 2);
  a.equal(data[1][headers.indexOf("maThietBi")], "00123");
  a.equal(data[1][headers.indexOf("moTaChiTiet")], "'=untrusted");
  a.equal(reads, 1);
  a.equal(opens, 1);
  data[1][headers.indexOf("ghiChuRieng")] = "KEEP";
  c.mobileWorkResetContext_();
  row.status = "completed";
  c.mobileWorkPersist_("Requests", row);
  a.equal(data.length, 2);
  a.equal(data[1][headers.indexOf("ghiChuRieng")], "KEEP");
  a.equal(c.mobileWorkReadTable_("Requests")[0].status, "completed");
  a.equal(reads, 2);
  a.equal(opens, 2);
  data[1][headers.indexOf("trangThai")] = "external edit";
  c.mobileWorkResetContext_();
  a.equal(c.mobileWorkReadTable_("Requests")[0].status, "external edit");
  headers[0] = "wrong";
  c.mobileWorkResetContext_();
  a.throws(() => c.mobileWorkReadTable_("Requests"), /Thiếu hoặc trùng/);
});
