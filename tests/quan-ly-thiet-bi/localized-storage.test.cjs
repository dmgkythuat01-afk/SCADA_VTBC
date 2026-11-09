const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
function setup(sheets) {
  const c = {};
  vm.createContext(c);
  vm.runInContext(
    fs.readFileSync("QuanLyThietBi/appscript/Store.js", "utf8"),
    c,
  );
  const db = {
    getSheetByName: (name) => sheets.find((s) => s.name === name) || null,
  };
  c.db_ = () => db;
  return c;
}
function sheet(name, data) {
  return {
    name,
    getLastRow: () => data.length,
    getLastColumn: () => data[0].length,
    getRange(r, c, n = 1, m = 1) {
      return {
        getValues: () =>
          Array.from({ length: n }, (_, i) =>
            Array.from(
              { length: m },
              (_, j) => data[r - 1 + i]?.[c - 1 + j] ?? "",
            ),
          ),
        setValue(value) {
          data[r - 1] ??= [];
          data[r - 1][c - 1] = value;
          return this;
        },
        setNumberFormat() {
          return this;
        },
        setValues(values) {
          values.forEach((row, i) => {
            data[r - 1 + i] ??= [];
            row.forEach((v, j) => (data[r - 1 + i][c - 1 + j] = v));
          });
          return this;
        },
      };
    },
  };
}
test("Vietnamese sheet and reordered columns resolve to the same login model", () => {
  const c = setup([
      sheet("TaiKhoan", [
        ["hoTen", "chucVu", "matKhau", "tenDangNhap"],
        ["Dung", "admin", "secret", "vg.dung"],
      ]),
    ]),
    r = c.rows_("Account")[0];
  a.equal(r.useName, "vg.dung");
  a.equal(r.passWord, "secret");
  a.equal(r.name, "Dung");
  a.equal(r.role, "admin");
});
test("legacy English sheet/headers remain readable during migration", () => {
  const c = setup([
    sheet("Account", [
      ["useName", "passWord", "role", "name"],
      ["worker", "123456", "Kỹ thuật", "Dung"],
    ]),
  ]);
  a.equal(c.rows_("Account")[0].useName, "worker");
});
test("writes use Vietnamese headers in their actual order and preserve additional columns", () => {
  const data = [
      ["hoTen", "ghiChuRieng", "tenDangNhap", "matKhau", "chucVu"],
      ["Old", "KEEP", "worker", "old", "Kỹ thuật"],
    ],
    c = setup([sheet("TaiKhoan", data)]);
  c.write_("Account", {
    _row: 2,
    useName: "worker",
    passWord: "new",
    role: "admin",
    name: "New",
  });
  a.deepEqual(data[1], ["New", "KEEP", "worker", "new", "admin", ""]);
});
test("ambiguous old/new sheets or duplicate header aliases fail without writing", () => {
  const c = setup([
    sheet("Account", [["useName", "passWord", "role", "name"]]),
    sheet("TaiKhoan", [["tenDangNhap", "matKhau", "chucVu", "hoTen"]]),
  ]);
  a.throws(() => c.rows_("Account"));
  const d = setup([
    sheet("TaiKhoan", [
      ["tenDangNhap", "useName", "matKhau", "chucVu", "hoTen"],
      ["a", "b", "pw", "admin", "Name"],
    ]),
  ]);
  a.throws(() => d.rows_("Account"));
});
test("asset technical specifications support old/new column names and preserve added fields", () => {
  for (const header of ["chiTiet", "thongSoKyThuat"]) {
    const data = [["maDinhDanh", header, "boPhanQuanLy", "ngayLapDat", "cotRieng"], ["M1", "220V", "Cơ khí", "2026-11-09", "KEEP"]];
    const c = setup([sheet("DanhMucThietBi", data)]);
    const r = c.rows_("Assets")[0];
    a.equal(r.details, "220V");a.equal(r.managingDepartment,"Cơ khí");a.equal(r.installationDate,"2026-11-09");
    c.write_("Assets", {...r, details:"380V"});
    a.equal(data[1][1],"380V");a.equal(data[1][4],"KEEP");
    a.equal(data[0].filter(h=>["chiTiet","thongSoKyThuat"].includes(h)).length,1);
  }
  const c=setup([sheet("DanhMucThietBi",[["maDinhDanh","chiTiet","thongSoKyThuat"],["M1","old","new"]])]);
  a.throws(()=>c.rows_("Assets"));
});
