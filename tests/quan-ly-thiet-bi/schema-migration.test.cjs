const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  crypto = require("node:crypto");
function setup(initial, fault = false) {
  let nextId = 0,
    failed = false;
  const sheets = initial.map(([name, data]) => ({
    name,
    id: ++nextId,
    data: structuredClone(data),
  }));
  const wrapped = new Map();
  function wrap(s) {
    if (wrapped.has(s)) return wrapped.get(s);
    const w = {
      getSheetId: () => s.id,
      getName: () => s.name,
      setName: (name) => {
        if (sheets.some((x) => x !== s && x.name === name))
          throw Error("duplicate name");
        s.name = name;
        return w;
      },
      getLastRow: () => s.data.length,
      getDataRange: () => ({
        getValues: () => structuredClone(s.data.length ? s.data : [[""]]),
      }),
      getRange: (r, c, n = 1, m = 1) => ({
        setValues: (values) => {
          if (fault && !failed && values[0][0] === "tenDangNhap") {
            failed = true;
            throw Error("test write failure");
          }
          values.forEach((row, i) => {
            s.data[r - 1 + i] ??= [];
            row.forEach((value, j) => (s.data[r - 1 + i][c - 1 + j] = value));
          });
          return {
            setFontWeight() {
              return this;
            },
            setBackground() {
              return this;
            },
          };
        },
      }),
      setFrozenRows() {},
      clearContents: () => {
        s.data = [];
      },
    };
    wrapped.set(s, w);
    return w;
  }
  const ss = {
    getSheetByName: (name) => {
      const s = sheets.find((s) => s.name === name);
      return s ? wrap(s) : null;
    },
    getSheets: () => sheets.map(wrap),
    setActiveSheet() {},
    moveActiveSheet() {},
    getUrl: () => "sheet",
  };
  const c = {};
  vm.createContext(c);
  for (const name of ["Store", "LocalizeSchema"])
    vm.runInContext(
      fs.readFileSync("QuanLyThietBi/appscript/" + name + ".js", "utf8"),
      c,
    );
  const properties = new Map();
  Object.assign(c, {
    db_: () => ss,
    props_: () => ({ setProperty: (k, v) => properties.set(k, v) }),
    Utilities: {
      DigestAlgorithm: { SHA_256: "sha256" },
      computeDigest: (type, text) =>
        Array.from(crypto.createHash(type).update(text).digest()),
    },
    SpreadsheetApp: { flush() {} },
  });
  return { c, sheets, properties };
}
test("migration changes names/headers only and is idempotent, with metadata backup", () => {
  const s = setup([
      [
        "Account",
        [
          ["useName", "passWord", "role", "name"],
          ["demo.admin", "Secret!", "admin", "Name"],
        ],
      ],
      ["Sheet1", []],
    ]),
    before = JSON.stringify(s.sheets[0].data.slice(1));
  const plan = s.c.migrateEquipmentVietnamese_(false);
  a.equal(plan.dryRun, true);
  a.equal(s.sheets[0].name, "Account");
  const result = s.c.migrateEquipmentVietnamese_(true);
  a.equal(result.checks[0].preserved, true);
  a.equal(s.sheets[0].name, "TaiKhoan");
  a.deepEqual(s.sheets[0].data[0], [
    "tenDangNhap",
    "matKhau",
    "chucVu",
    "hoTen",
  ]);
  a.equal(JSON.stringify(s.sheets[0].data.slice(1)), before);
  a.equal(s.sheets[1].name, "HuongDan");
  a.ok(s.properties.has("SCHEMA_VI_MIGRATION_BACKUP"));
  s.c.migrateEquipmentVietnamese_(true);
  a.equal(JSON.stringify(s.sheets[0].data.slice(1)), before);
});
test("migration preflight rejects conflicts before changing any sheet", () => {
  const s = setup([
    ["Account", [["useName", "passWord", "role", "name"]]],
    ["TaiKhoan", [["tenDangNhap", "matKhau", "chucVu", "hoTen"]]],
  ]);
  a.throws(() => s.c.migrateEquipmentVietnamese_(true));
  a.equal(s.sheets[0].name, "Account");
  a.equal(s.properties.size, 0);
});
test("failed header write restores original sheet names and headers", () => {
  const s = setup(
    [
      [
        "Account",
        [
          ["useName", "passWord", "role", "name"],
          ["a", "pw", "admin", "A"],
        ],
      ],
    ],
    true,
  );
  a.throws(() => s.c.migrateEquipmentVietnamese_(true));
  a.equal(s.sheets[0].name, "Account");
  a.deepEqual(s.sheets[0].data[0], ["useName", "passWord", "role", "name"]);
  a.deepEqual(s.sheets[0].data[1], ["a", "pw", "admin", "A"]);
});
