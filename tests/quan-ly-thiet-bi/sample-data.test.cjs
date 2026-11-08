const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
function setup() {
  const c = {};
  vm.createContext(c);
  for (const name of ["Domain", "Store", "SeedDemo"])
    vm.runInContext(
      fs.readFileSync("QuanLyThietBi/appscript/" + name + ".js", "utf8"),
      c,
    );
  return c;
}
test("sample dataset has linked hierarchy, repair/maintenance states and no fabricated photo/email", () => {
  const c = setup(),
    data = c.equipmentDemoRows_(
      "2026-11-08",
      { admin: "not-a-real-password", technician: "not-a-real-password" },
      "owner@example.com",
      "https://script.google.com/test",
    ),
    ids = new Set(data.Assets.map((x) => x.id)),
    schedules = new Set(data.Schedules.map((x) => x.id));
  a.equal(data.Assets.filter((x) => x.type === "workshop").length, 2);
  a.equal(data.Assets.filter((x) => x.type === "machine").length, 3);
  a.equal(data.Account.length, 2);
  for (const row of data.Assets) if (row.parentId) a.ok(ids.has(row.parentId));
  for (const row of [...data.Schedules, ...data.Jobs])
    a.ok(ids.has(row.componentId));
  for (const row of data.Jobs) {
    if (row.scheduleId) a.ok(schedules.has(row.scheduleId));
    a.equal(row.photos, "[]");
  }
  a.equal(data.Notifications[0].status, "demo");
  a.ok(
    data.Schedules.some(
      (s) => c.dueState_(s.dueDate, "2026-11-08") === "overdue",
    ),
  );
  a.ok(
    data.Schedules.some((s) => c.dueState_(s.dueDate, "2026-11-08") === "soon"),
  );
});
test("sample importer preserves existing records and repeated imports add no duplicate sample rows", () => {
  const c = setup(),
    schema = vm.runInContext("EQUIPMENT_SHEETS", c),
    tables = Object.fromEntries(Object.keys(schema).map((k) => [k, []])),
    p = new Map();
  let folders = 0,
    n = 0;
  tables.Account.push({
    useName: "DEMO.ADMIN",
    passWord: "keep-existing",
    role: "admin",
    name: "Real admin",
  });
  tables.Assets.push({ id: "REAL", name: "Existing machine" });
  c.ensureStore_ = () => {};
  c.rows_ = (name) => structuredClone(tables[name]);
  c.write_ = (name, row) => tables[name].push(structuredClone(row));
  c.props_ = () => ({
    getProperty: (k) => p.get(k),
    setProperty: (k, v) => p.set(k, v),
  });
  c.Session = {
    getEffectiveUser: () => ({ getEmail: () => "owner@example.com" }),
  };
  c.today_ = () => "2026-11-08";
  c.Utilities = { getUuid: () => String(++n).padStart(32, "0") };
  c.DriveApp = { createFolder: () => ({ getId: () => "folder" + ++folders }) };
  c.db_ = () => ({
    getUrl: () => "sheet",
    setActiveSheet() {},
    moveActiveSheet() {},
    getSheetByName: (name) => ({
      getRange: () => ({
        getValues: () => [schema[name]],
        setFontWeight() {
          return this;
        },
        setBackground() {
          return this;
        },
      }),
      setFrozenRows() {},
      autoResizeColumns() {},
    }),
  });
  c.SpreadsheetApp = { flush() {} };
  const one = c.seedEquipmentDemo_();
  a.equal(one.counts.Account, 1);
  a.equal(tables.Account[0].passWord, "keep-existing");
  a.equal(tables.Assets[0].id, "REAL");
  const two = c.seedEquipmentDemo_();
  a.equal(
    Object.values(two.counts).reduce((n, x) => n + x, 0),
    0,
  );
  a.equal(folders, 1);
  a.equal(two.credentials.length, 0);
  a.equal(two.totals.Assets, 15);
  a.equal(two.totals.Account, 2);
});
