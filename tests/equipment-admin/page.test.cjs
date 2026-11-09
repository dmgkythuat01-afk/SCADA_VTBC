const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
test("new admin composes only current data-entry UI and exact live headers", () => {
  const root = "QuanLyThietBi/admin/",
    html = fs
      .readFileSync(root + "Index.html", "utf8")
      .replace(
        /<\?!=\s*HtmlService.createHtmlOutputFromFile\('([^']+)'\).getContent\(\);\s*\?>/g,
        (_, name) => fs.readFileSync(root + name + ".html", "utf8"),
      );
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))
    new vm.Script(match[1]);
  assert.ok(html.includes("Nhập dữ liệu"));
  assert.ok(html.includes("setFormOptions"));
  assert.ok(!html.includes("equipmentApi"));
  const c = {};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(root + "Schema.js", "utf8"), c);
  assert.equal(vm.runInContext("Object.keys(ADMIN_TABLES).length", c), 6);
  assert.equal(
    vm.runInContext("ADMIN_TABLES.DanhMucThietBi.columns.ThongSoKyThuat", c),
    "Thông số kỹ thuật",
  );
  assert.equal(
    JSON.parse(fs.readFileSync("QuanLyThietBi/.clasp.json", "utf8")).rootDir,
    "admin",
  );
});
