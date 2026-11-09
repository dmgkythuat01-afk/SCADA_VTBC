const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  crypto = require("node:crypto");
function setup() {
  const c = { console };
  vm.createContext(c);
  for (const name of ["Schema", "Auth", "Data"])
    vm.runInContext(
      fs.readFileSync("QuanLyThietBi/admin/" + name + ".js", "utf8"),
      c,
    );
  const tables = Object.fromEntries(
    [
      "TaiKhoan",
      "DanhMucBoPhan",
      "DanhMucXuong",
      "DanhMucMay",
      "DanhMucThietBi",
      "DanhMucCanKiemTra",
    ].map((k) => [k, []]),
  );
  Object.assign(c, {
    equipmentColumnOrder_: () => [],
    adminSecret_: () => "fixture-secret",
    adminHmac_: (s, k) =>
      crypto.createHmac("sha256", k).update(String(s)).digest("hex"),
    readAdminRows_: (name) => structuredClone(tables[name]),
    adminHash_: (s) =>
      crypto.createHash("sha256").update(String(s)).digest("hex"),
    writeAdminRow_: (name, row, index) => {
      row = { ...row, _row: index || tables[name].length + 2 };
      if (index) tables[name][index - 2] = row;
      else tables[name].push(row);
      return row;
    },
    deleteAdminRow_: (name, index) => tables[name].splice(index - 2, 1),
    adminNow_: () => "2026-11-09 10:00:00",
    checkAdminPassword_: (stored, input) => stored === input,
    hashAdminPassword_: (p) => "HASH:" + p,
  });
  return { c, tables };
}
test("workshop/machine/device/checklist CRUD validates dependencies and duplicate natural keys", () => {
  const { c, tables } = setup();
  c.saveAdminData_("DanhMucXuong", { values: { tenXuong: "Xưởng A" } });
  c.saveAdminData_("DanhMucMay", {
    values: { tenXuong: "Xưởng A", tenMay: "Máy A" },
  });
  assert.throws(() =>
    c.saveAdminData_("DanhMucMay", {
      values: { tenXuong: "Sai", tenMay: "M" },
    }),
  );
  assert.throws(() =>
    c.saveAdminData_("DanhMucMay", {
      values: { tenXuong: "Xưởng A", tenMay: "Máy A" },
    }),
  );
  c.saveAdminData_("DanhMucThietBi", {
    values: {
      tenXuong: "Xưởng A",
      tenMay: "Máy A",
      maThietBi: "TB1",
      dangSuDung: "Có",
      ngayLapDat: "2026-11-09",
      soNgayCanBaoDuong: "30",
    },
  });
  assert.equal(tables.DanhMucThietBi[0].ThoiGianCapNhat, "2026-11-09 10:00:00");
  c.saveAdminData_("DanhMucCanKiemTra", {
    values: {
      tenXuong: "Xưởng A",
      tenMay: "Máy A",
      maThietBi: "TB1",
      danhMucCanKiemTra: "Nhiệt độ",
      thongSoTieuChuan: "< 60°C",
    },
  });
  assert.equal(tables.DanhMucCanKiemTra.length, 1);
  assert.throws(() =>
    c.saveAdminData_("DanhMucThietBi", {
      values: {
        tenXuong: "Xưởng A",
        tenMay: "Máy A",
        maThietBi: "TB2",
        ngayLapDat: "2026-02-30",
      },
    }),
  );
});
test("referenced parent renames/deletes and stale edits are rejected", () => {
  const { c, tables } = setup();
  c.saveAdminData_("DanhMucXuong", { values: { tenXuong: "A" } });
  c.saveAdminData_("DanhMucMay", { values: { tenXuong: "A", tenMay: "M" } });
  const w = c.publicAdminRow_("DanhMucXuong", tables.DanhMucXuong[0]);
  assert.throws(() => c.deleteAdminData_("DanhMucXuong", w));
  assert.throws(() =>
    c.saveAdminData_("DanhMucXuong", { ...w, values: { tenXuong: "B" } }),
  );
  assert.throws(() =>
    c.saveAdminData_("DanhMucXuong", {
      ...w,
      _version: "stale",
      values: { tenXuong: "A" },
    }),
  );
  const m = c.publicAdminRow_("DanhMucMay", tables.DanhMucMay[0]);
  c.deleteAdminData_("DanhMucMay", m);
  c.deleteAdminData_("DanhMucXuong", w);
  assert.equal(tables.DanhMucXuong.length, 0);
});
test("manager ID and name are paired from accounts; department must exist", () => {
  const { c, tables } = setup();
  tables.TaiKhoan.push({
    _row: 2,
    tenDangNhap: "a",
    matKhau: "secret",
    chucVu: "admin",
    maNhanVien: "NV1",
    hoTen: "Nguyễn A",
  });
  c.saveAdminData_("DanhMucBoPhan", {
    values: { maBoPhanQuanLy: "BP1", tenBoPhanQuanLy: "Cơ khí" },
  });
  c.saveAdminData_("DanhMucXuong", { values: { tenXuong: "A" } });
  c.saveAdminData_("DanhMucMay", { values: { tenXuong: "A", tenMay: "M" } });
  c.saveAdminData_("DanhMucThietBi", {
    values: {
      tenXuong: "A",
      tenMay: "M",
      maThietBi: "T",
      maNguoiQuanLy: "NV1",
      tenNguoiQuanLy: "spoof",
      tenBoPhanQuanLy: "Cơ khí",
    },
  });
  assert.equal(tables.DanhMucThietBi[0].tenNguoiQuanLy, "Nguyễn A");
  assert.throws(() =>
    c.saveAdminData_("DanhMucThietBi", {
      values: {
        tenXuong: "A",
        tenMay: "M",
        maThietBi: "T2",
        maNguoiQuanLy: "missing",
      },
    }),
  );
});
test("passwords never leave snapshot; blank edit preserves password and last admin is protected", () => {
  const { c, tables } = setup();
  tables.TaiKhoan.push({
    _row: 2,
    tenDangNhap: "admin",
    matKhau: "secret",
    chucVu: "admin",
    hoTen: "A",
  });
  const r = c.publicAdminRow_("TaiKhoan", tables.TaiKhoan[0]);
  assert.equal(r.matKhau, "");
  assert.ok(!JSON.stringify(r).includes("secret"));
  c.saveAdminData_("TaiKhoan", {
    ...r,
    values: { tenDangNhap: "admin", matKhau: "", chucVu: "admin", hoTen: "B" },
  });
  assert.equal(tables.TaiKhoan[0].matKhau, "secret");
  const updated = c.publicAdminRow_("TaiKhoan", tables.TaiKhoan[0]);
  assert.throws(() => c.deleteAdminData_("TaiKhoan", updated));
  assert.throws(() =>
    c.saveAdminData_("TaiKhoan", {
      ...updated,
      values: { tenDangNhap: "admin", chucVu: "KyThuat", hoTen: "B" },
    }),
  );
});
test("admin API requires active admin session and deduplicates repeated writes", () => {
  const { c, tables } = setup(),
    cache = new Map();
  Object.assign(c, {
    Utilities: { getUuid: () => crypto.randomUUID() },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => cache.get(k) || null,
        put: (k, v) => cache.set(k, v),
        remove: (k) => cache.delete(k),
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  });
  tables.TaiKhoan.push(
    {
      _row: 2,
      tenDangNhap: "Admin",
      matKhau: "secret",
      chucVu: "admin",
      hoTen: "A",
    },
    {
      _row: 3,
      tenDangNhap: "worker",
      matKhau: "secret",
      chucVu: "KyThuat",
      hoTen: "B",
    },
  );
  assert.throws(() => c.adminApi("invalid", "snapshot", {}));
  assert.throws(() => c.loginAdmin("worker", "secret"));
  const login = c.loginAdmin("ADMIN", "secret");
  const p = {
    table: "DanhMucXuong",
    values: { tenXuong: "A" },
    requestId: "one",
  };
  c.adminApi(login.token, "save", p);
  c.adminApi(login.token, "save", p);
  assert.equal(tables.DanhMucXuong.length, 1);
  assert.throws(() =>
    c.adminApi(login.token, "save", { ...p, values: { tenXuong: "B" } }),
  );
  tables.TaiKhoan[0].chucVu = "KyThuat";
  assert.throws(() => c.adminApi(login.token, "snapshot", {}));
});
