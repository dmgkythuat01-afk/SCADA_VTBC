const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
test("Apps Script page composes all styles/scripts without Firebase, bridge or PWA dependencies", () => {
  const root = "QuanLyThietBi/appscript/";
  const html = fs
    .readFileSync(root + "Index.html", "utf8")
    .replace(
      /<\?!=\s*HtmlService\.createHtmlOutputFromFile\('([^']+)'\)\.getContent\(\);\s*\?>/g,
      (_, file) => fs.readFileSync(root + file + ".html", "utf8"),
    );
  const scripts = Array.from(
    html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g),
    (m) => m[1],
  );
  new vm.Script(scripts.join("\n"));
  a.ok(html.includes('id="loginForm"'));
  a.ok(html.includes("google.script.run"));
  a.ok(!/firebase|APP_CONFIG|serviceWorker|apiBridge|vapidKey/.test(html));
  const manifest = JSON.parse(
    fs.readFileSync(root + "appsscript.json", "utf8"),
  );
  a.ok(!manifest.oauthScopes.some((s) => /firebase|external_request/.test(s)));
});

test("TaiKhoan has the requested Vietnamese sheet and column names", () => {
  const c = {};
  vm.createContext(c);
  vm.runInContext(
    fs.readFileSync("QuanLyThietBi/appscript/Store.js", "utf8"),
    c,
  );
  a.equal(vm.runInContext("EQUIPMENT_STORAGE.Account.sheet", c), "TaiKhoan");
  a.deepEqual(
    Array.from(vm.runInContext("EQUIPMENT_STORAGE.Account.columns", c)),
    ["tenDangNhap", "matKhau", "chucVu", "hoTen", "email"],
  );
});

test("machine manager UI and account contact email remain separate", () => {
  const html = fs.readFileSync("QuanLyThietBi/appscript/Index.html", "utf8"),
    client = fs.readFileSync("QuanLyThietBi/appscript/Client.html", "utf8"),
    manager = fs.readFileSync(
      "QuanLyThietBi/appscript/ManagersUi.html",
      "utf8",
    );
  a.ok(html.includes('data-page="managers"'));
  a.ok(client.includes("machineManagerField"));
  a.ok(client.includes("contactEmail"));
  a.ok(
    client.includes('field("Tên đăng nhập", "email", m?.email, "text", true)'),
  );
  a.ok(manager.includes('name="managerId" required'));
});
