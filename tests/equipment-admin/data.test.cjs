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
    equipmentPlanCategories_: () => [],
    equipmentPlanSelection_: row => {if(!["7 ngày","6 tháng"].includes(row.tanSuatThamSo))throw Error("ThamSoHeThong");return row.tanSuatThamSo;},
    equipmentSystemParameters_: () => ({loai:["Bảo dưỡng","Vệ sinh"],tanSuatThamSo:["7 ngày","6 tháng"]}),
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
      boPhanDanhGia: "Điện",
      loai: "Bảo dưỡng",
      tanSuatThamSo: "7 ngày",
      thamSoCanKiemTra: "< 60°C",
      chiTieuDanhGia1: "Đánh giá 1 ".repeat(60),
      chiTieuDanhGia2: "Không rung",
      chiTieuDanhGia3: "Không rò rỉ",
    },
  });
  assert.equal(tables.DanhMucCanKiemTra.length, 1);
  assert.equal(tables.DanhMucCanKiemTra[0].boPhanDanhGia,"Điện");
  assert.equal(tables.DanhMucCanKiemTra[0].loai,"Bảo dưỡng");assert.equal(tables.DanhMucCanKiemTra[0].tanSuatThamSo,"7 ngày");
  const typeCheck=c.publicAdminRow_("DanhMucCanKiemTra",tables.DanhMucCanKiemTra[0]);
  assert.throws(()=>c.saveAdminData_("DanhMucCanKiemTra",{...typeCheck,values:{boPhanDanhGia:"Khác"}}),/Điện|Cơ khí/);
  assert.throws(()=>c.saveAdminData_("DanhMucCanKiemTra",{...typeCheck,values:{loai:"Tự nhập"}}),/ThamSoHeThong/);
  assert.throws(()=>c.saveAdminData_("DanhMucCanKiemTra",{...typeCheck,values:{tanSuatThamSo:"3 giờ"}}),/ThamSoHeThong/);
  assert.equal(tables.DanhMucCanKiemTra[0].chiTieuDanhGia1,"Đánh giá 1 ".repeat(60).trim());
  const criterion=c.publicAdminRow_("DanhMucCanKiemTra",tables.DanhMucCanKiemTra[0]);
  c.saveAdminData_("DanhMucCanKiemTra",{...criterion,values:{chiTieuDanhGia2:"Không tiếng ồn"}});
  assert.equal(tables.DanhMucCanKiemTra[0].thamSoCanKiemTra,"< 60°C");
  assert.equal(tables.DanhMucCanKiemTra[0].chiTieuDanhGia2,"Không tiếng ồn");
  assert.equal(tables.DanhMucCanKiemTra[0].chiTieuDanhGia3,"Không rò rỉ");
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
test("equipment batch validates every row before one write and rejects intra-batch duplicates", () => {
  const { c, tables } = setup();
  tables.DanhMucXuong.push({ _row: 2, tenXuong: "A" });
  tables.DanhMucMay.push({ _row: 2, tenXuong: "A", tenMay: "M" });
  const first = { tenXuong: "A", tenMay: "M", maThietBi: "T1", tenThietBi: "Động cơ", donVi: "cái", soLuong: "2" };
  let writes = 0;
  c.writeAdminBatch_ = (name, rows) => {
    writes++;
    rows.forEach((r) =>
      tables[name].push({ ...r, _row: tables[name].length + 2 }),
    );
  };
  assert.throws(() =>
    c.saveAdminBatch_("DanhMucThietBi", [
      first,
      { ...first, maThietBi: "T2", soLuong: "-1" },
    ]),
  );
  assert.equal(writes, 0);
  assert.equal(tables.DanhMucThietBi.length, 0);
  assert.throws(() =>
    c.saveAdminBatch_("DanhMucThietBi", [
      first,
      { ...first, maThietBi: " t1 " },
    ]),
  );
  assert.equal(writes, 0);
  c.saveAdminBatch_("DanhMucThietBi", [first, { ...first, maThietBi: "T2" }]);
  assert.equal(writes, 1);
  assert.equal(tables.DanhMucThietBi.length, 2);
  assert.equal(tables.DanhMucThietBi[0].tenThietBi, "Động cơ");
  assert.equal(tables.DanhMucThietBi[0].donVi, "cái");
  const saved = c.publicAdminRow_("DanhMucThietBi", tables.DanhMucThietBi[0]);
  c.saveAdminData_("DanhMucThietBi", {...saved, values:{tenThietBi:"Động cơ chính"}});
  assert.equal(tables.DanhMucThietBi[0].tenThietBi, "Động cơ chính");
  assert.equal(tables.DanhMucThietBi[0].donVi, "cái");
  assert.throws(() => c.saveAdminBatch_("TaiKhoan", [first]));
  assert.throws(() => c.saveAdminBatch_("DanhMucThietBi", []));
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
  tables.DanhMucMay.push({ _row: 2, tenXuong: "A", tenMay: "M" });
  let batchWrites = 0;
  c.writeAdminBatch_ = (name, rows) => {
    batchWrites++;
    rows.forEach((r) =>
      tables[name].push({ ...r, _row: tables[name].length + 2 }),
    );
  };
  const batch = {
    table: "DanhMucThietBi",
    rows: [
      { tenXuong: "A", tenMay: "M", maThietBi: "T1" },
      { tenXuong: "A", tenMay: "M", maThietBi: "T2" },
    ],
    requestId: "batch",
  };
  c.adminApi(login.token, "saveBatch", batch);
  c.adminApi(login.token, "saveBatch", batch);
  assert.equal(batchWrites, 1);
  assert.equal(tables.DanhMucThietBi.length, 2);
  assert.throws(() =>
    c.adminApi(login.token, "saveBatch", { ...batch, rows: [batch.rows[0]] }),
  );
  tables.TaiKhoan[0].chucVu = "KyThuat";
  assert.throws(() => c.adminApi(login.token, "snapshot", {}));
});

test("checklist batch validates all rows before writing and derives equipment names",()=>{
 const {c,tables}=setup();
 tables.DanhMucXuong.push({_row:2,tenXuong:"A"});
 tables.DanhMucMay.push({_row:2,tenXuong:"A",tenMay:"M"});
 tables.DanhMucThietBi.push({_row:2,tenXuong:"A",tenMay:"M",maThietBi:"T1",tenThietBi:"Động cơ"});
 const first={tenXuong:"A",tenMay:"M",maThietBi:"T1",tenThietBi:"Giả",danhMucCanKiemTra:"Nhiệt độ",thamSoCanKiemTra:"60°C",boPhanDanhGia:"Điện",loai:"Bảo dưỡng",tanSuatThamSo:"7 ngày"};
 let writes=0;c.writeAdminBatch_=(name,rows)=>{writes++;tables[name].push(...rows);};
 assert.throws(()=>c.saveAdminBatch_("DanhMucCanKiemTra",[first,{...first,danhMucCanKiemTra:"Rung",maThietBi:"Sai"}]),/Dòng 2/);
 assert.equal(writes,0);
 assert.throws(()=>c.saveAdminBatch_("DanhMucCanKiemTra",[first,{...first}]),/Dòng 2/);assert.equal(writes,0);
 c.saveAdminBatch_("DanhMucCanKiemTra",[first,{...first,danhMucCanKiemTra:"Rung"}]);
 assert.equal(writes,1);assert.equal(tables.DanhMucCanKiemTra.length,2);assert.equal(tables.DanhMucCanKiemTra[0].tenThietBi,"Động cơ");
});

test("checklist duplicates require every form field through parameter to match",()=>{
 const {c,tables}=setup();tables.DanhMucXuong.push({_row:2,tenXuong:"A"});tables.DanhMucMay.push({_row:2,tenXuong:"A",tenMay:"M"});
 tables.DanhMucThietBi.push({_row:2,tenXuong:"A",tenMay:"M",maThietBi:"T1",tenThietBi:"Động cơ"});
 const first={tenXuong:"A",tenMay:"M",maThietBi:"T1",tenThietBi:"Động cơ",danhMucCanKiemTra:"Nhiệt độ",thamSoCanKiemTra:"60°C",boPhanDanhGia:"Điện",loai:"Bảo dưỡng",tanSuatThamSo:"7 ngày"};
 c.saveAdminData_("DanhMucCanKiemTra",{values:first});
 for(const [key,value] of Object.entries({thamSoCanKiemTra:"70°C",boPhanDanhGia:"Cơ khí",loai:"Vệ sinh",tanSuatThamSo:"6 tháng"})) {
  c.saveAdminData_("DanhMucCanKiemTra",{values:{...first,[key]:value}});
 }
 assert.equal(tables.DanhMucCanKiemTra.length,5);
 assert.throws(()=>c.saveAdminData_("DanhMucCanKiemTra",{values:{...first,chiTieuDanhGia1:"Khác"}}),/đã tồn tại/);
 assert.throws(()=>c.saveAdminData_("DanhMucCanKiemTra",{values:{...first,thamSoCanKiemTra:" 60°c "}}),/đã tồn tại/);
 let writes=0;c.writeAdminBatch_=(name,rows)=>{writes++;tables[name].push(...rows);};
 c.saveAdminBatch_("DanhMucCanKiemTra",[{...first,thamSoCanKiemTra:"80°C"},{...first,thamSoCanKiemTra:"90°C"}]);assert.equal(writes,1);
});
