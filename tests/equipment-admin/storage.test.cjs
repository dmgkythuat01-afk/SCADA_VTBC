const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
test("batch appends all device rows with one range write in physical header order", () => {
  const c = {};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync("QuanLyThietBi/admin/Schema.js", "utf8"), c);
  const headers = Array.from(
    vm.runInContext("Object.keys(ADMIN_TABLES.DanhMucThietBi.columns)", c),
  ).reverse();
  let writes = 0,
    matrix;
  c.adminSheet_ = () => ({
    getLastRow: () => 3,
    getLastColumn: () => headers.length,
    getMaxRows: () => 1000,
    getRange: (r, col, n, width) => ({
      getValues: () => [headers],
      setNumberFormat() {
        return this;
      },
      setValues(values) {
        writes++;
        assert.equal(r, 4);
        assert.equal(n, 2);
        matrix = values;
        return this;
      },
    }),
  });
  c.SpreadsheetApp = { flush() {} };
  c.writeAdminBatch_("DanhMucThietBi", [
    { maThietBi: "T1", ThongSoKyThuat: "=unsafe", soLuong: "0" },
    { maThietBi: "T2", soLuong: "2" },
  ]);
  assert.equal(writes, 1);
  assert.equal(matrix[0][headers.indexOf("soLuong")], "0");
  assert.equal(matrix[1][headers.indexOf("maThietBi")], "T2");
  assert.equal(matrix[0][headers.indexOf("ThongSoKyThuat")], "'=unsafe");
});
test("all six menus receive physical header order even when sheets have no data rows", () => {
  const c = {};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync("QuanLyThietBi/admin/Schema.js", "utf8"), c);
  const schemas = vm.runInContext("ADMIN_TABLES", c);
  c.adminNow_ = () => "";
  c.equipmentSystemParameters_ = () => ({loai:[],tanSuatThamSo:[]});
  c.adminSheet_ = (name) => {
    const headers = Object.keys(schemas[name].columns).reverse();
    return {
      getLastRow: () => 1,
      getLastColumn: () => headers.length,
      getRange: () => ({ getValues: () => [headers] }),
    };
  };
  const snapshot = c.adminSnapshot_({ name: "Admin" });
  for (const name of Object.keys(schemas))
    assert.deepEqual(
      Array.from(snapshot.columnOrders[name]),
      Object.keys(schemas[name].columns).reverse(),
    );
});
test("equipment popup order follows physical sheet headers, including quantity at the end", () => {
  const c = {};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync("QuanLyThietBi/admin/Schema.js", "utf8"), c);
  const keys = Array.from(
    vm.runInContext("Object.keys(ADMIN_TABLES.DanhMucThietBi.columns)", c),
  ).filter((k) => k !== "soLuong");
  keys.push("soLuong");
  c.adminSheet_ = () => ({
    getLastColumn: () => keys.length,
    getRange: () => ({ getValues: () => [keys] }),
  });
  assert.deepEqual(Array.from(c.equipmentColumnOrder_()), keys);
});
test("header-driven real storage adapter reads reordered account cells and preserves extra columns", () => {
  const data = [
      [
        "hoTen",
        "matKhau",
        "maNhanVien",
        "tenDangNhap",
        "email",
        "chucVu",
        "cotRieng",
      ],
      ["An", "secret", "NV1", "demo.admin", "", "admin", "KEEP"],
    ],
    c = {};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync("QuanLyThietBi/admin/Schema.js", "utf8"), c);
  const sheet = {
    getLastRow: () => data.length,
    getLastColumn: () => data[0].length,
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
          for (let j = 0; j < values[i].length; j++)
            data[r - 1 + i][col - 1 + j] = values[i][j];
        }
        return this;
      },
    }),
  };
  c.SpreadsheetApp = {
    openById: () => ({ getSheetByName: () => sheet }),
    flush() {},
  };
  const row = c.readAdminRows_("TaiKhoan")[0];
  assert.equal(row.tenDangNhap, "demo.admin");
  assert.equal(row.matKhau, "secret");
  assert.equal(row.chucVu, "admin");
  c.writeAdminRow_("TaiKhoan", { ...row, hoTen: "Bình" }, row._row);
  assert.equal(data[1][0], "Bình");
  assert.equal(data[1][6], "KEEP");
});
