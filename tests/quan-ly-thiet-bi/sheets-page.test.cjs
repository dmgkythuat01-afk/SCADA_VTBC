const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
test("Apps Script page composes all styles/scripts without Firebase, bridge or PWA dependencies", () => {
  const root = "QuanLyThietBi/appscript/";
  const html = fs
    .readFileSync(root + "Index.html", "utf8")
    .replace(
      /<\?!= HtmlService\.createHtmlOutputFromFile\('([^']+)'\)\.getContent\(\); \?>/g,
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

test("Account source has exactly the requested login columns", () => {
  const c = {};
  vm.createContext(c);
  vm.runInContext(
    fs.readFileSync("QuanLyThietBi/appscript/Store.js", "utf8"),
    c,
  );
  a.deepEqual(Array.from(vm.runInContext("EQUIPMENT_SHEETS.Account", c)), [
    "useName",
    "passWord",
    "role",
    "name",
  ]);
});
