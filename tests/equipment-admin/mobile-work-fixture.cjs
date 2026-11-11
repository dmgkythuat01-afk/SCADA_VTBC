const fs = require("node:fs"),
  vm = require("node:vm"),
  crypto = require("node:crypto");
function setup({workflow = "legacy"} = {}) {
  const c = { console };
  vm.createContext(c);
  for (const name of [
    "Schema",
    "Auth",
    "Data",
    "MaintenanceDomain",
    "MaintenanceStore",
    "MaintenanceService",
    "MaintenanceReports",
    "MobileWorkIO",
    "MobileWorkStore",
    "MobileWorkAuth",
    "MobileWorkPassword",
    "MobileWorkCatalog",
    "MobileWorkBridge",
    "MobileWorkWorkflow",
    "MobileWorkApprovals",
    "MobileWorkPhotos",
    "MobileWorkPrint",
    "MobileWorkPreapproval",
  ])
    vm.runInContext(
      fs.readFileSync("QuanLyThietBi/admin/" + name + ".js", "utf8"),
      c,
    );
  const catalog = {
    TaiKhoan: [
      "TruongCa",
      "CongNhan",
      "PhongCongNghe",
      "KyThuat",
      "CoKhi",
      "TuDongHoa",
      "admin",
      "PGDChatLuong",
      "PGDSanXuat",
      "PGDCongNghe",
    ].map((role, i) => ({
      tenDangNhap: role.toLowerCase(),
      matKhau: "Test-password-2026",
      hoTen: role + " Người thử",
      chucVu: role,
      maNhanVien: "NV" + i,
      email: role + "@example.com",
    })),
    DanhMucXuong: [{ tenXuong: "Xưởng A" }, { tenXuong: "Xưởng B" }],
    DanhMucMay: [
      { tenXuong: "Xưởng A", tenMay: "Máy đóng gói" },
      { tenXuong: "Xưởng B", tenMay: "Máy trộn" },
    ],
    DanhMucThietBi: [
      {
        tenXuong: "Xưởng A",
        tenMay: "Máy đóng gói",
        maThietBi: "TB01",
        tenThietBi: "Động cơ",
        soLuong: 2,
        donVi: "Cái",
        soNgayCanBaoDuong: "30",
        ngayLapDat: "2026-10-01",
        dangSuDung: "Có",
      },
    ],
    DanhMucCanKiemTra: [
      {
        tenXuong: "Xưởng A",
        tenMay: "Máy đóng gói",
        maThietBi: "TB01",
        danhMucCanKiemTra: "Nhiệt độ",
        thongSoTieuChuan: "<60°C",
      },
    ],
  };
  const tables = {
      Requests: [],
      ServiceReports: [],
      ServiceReviews: [],
      Notifications: [],
    },
    history = {
      LichSuBaoDuong: [],
      LichSuSuaChua: [],
      CauHinhBaoDuong: [],
      NhatKyThongBaoBaoDuong: [],
    },
    cache = new Map(),
    files = new Map();
  let locked = false,
    count = 0,
    fail = null;
  Object.assign(c, {
    adminHash_: (v) =>
      crypto.createHash("sha256").update(String(v)).digest("hex"),
    adminHmac_: (v, k) =>
      crypto.createHmac("sha256", k).update(String(v)).digest("hex"),
    adminSecret_: () => "secret",
    readAdminRows_: (n) => structuredClone(catalog[n] || []),
    mobileWorkCatalogRows_: (n) => structuredClone(catalog[n] || []),
    mobileWorkGrid_: (n) => {
      const rows = catalog[n] || [];
      const headers = [...new Set(rows.flatMap(r => Object.keys(r)))];
      return { values: [headers, ...rows.map(r => headers.map(k => r[k] ?? ""))] };
    },
    mobileWorkHistoryRows_: (n) => structuredClone(history[n] || []),
    SpreadsheetApp: { flush() {} },
    maintenanceRows_: (n) => structuredClone(history[n] || []),
    maintenanceWrite_: (n, r) => {
      const i = history[n].findIndex((x) => x.maLichSu === r.maLichSu);
      if (i < 0) history[n].push(structuredClone(r));
      else history[n][i] = structuredClone(r);
      return r;
    },
    maintenanceToday_: () => "2026-11-09",
    adminNow_: () => "2026-11-09 10:00:00",
    mobileWorkReadTable_: (n) => structuredClone(tables[n]),
    mobileWorkTable_: () => true,
    mobileWorkPersist_: (n, r) => {
      if (fail && fail(n, r)) throw Error("simulated write failure");
      if (!r._row) r._row = tables[n].length + 2;
      const i = tables[n].findIndex((x) => x.id === r.id);
      if (i < 0) tables[n].push(structuredClone(r));
      else tables[n][i] = structuredClone(r);
      return r;
    },
    LockService: {
      getScriptLock: () => ({
        waitLock() {
          if (locked) throw Error("Nested lock");
          locked = true;
        },
        releaseLock() {
          locked = false;
        },
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => cache.get(k) || null,
        put: (k, v) => cache.set(k, v),
        remove: (k) => cache.delete(k),
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => "photos" }),
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      base64Decode: (s) => Array.from(Buffer.from(s, "base64")),
      base64Encode: (bytes) => Buffer.from(bytes).toString("base64"),
      newBlob: (bytes, type, name) => ({ bytes, type, name }),
    },
    DriveApp: {
      getFolderById: () => ({
        createFile: (blob) => {
          const id = "photo" + ++count;
          files.set(id, blob);
          return { getId: () => id };
        },
      }),
      getFileById: (id) => {
        const b = files.get(id);
        if (!b) throw Error("Missing");
        return {
          getMimeType: () => b.type,
          getSize: () => b.bytes.length,
          getBlob: () => ({ getBytes: () => b.bytes }),
        };
      },
    },
  });
  c.mobileWorkMigrationWrite_ = r => c.mobileWorkWrite_("Requests",r);
  // Explicit historical mode keeps the old state-machine regression suites.
  // Production always routes create/migration through the new workflow.
  if (workflow === "legacy") {
    c.mobileWorkV2Create_ = c.mobileWorkCreateRequest_;
    c.mobileWorkMigrateOpen_ = () => ({changed:0});
  }
  const login = (role) => c.loginMobile(role, "Test-password-2026").token,
    api = (token, action, p = {}) => c.mobileWorkApi(token, action, p);
  function create(token, type = "maintenance", device = true) {
    const s = api(token, "snapshot"),
      w = s.assets.find((a) => a.type === "workshop"),
      m = s.assets.find((a) => a.type === "machine" && a.parentId === w.id),
      d = s.assets.find((a) => a.type === "component");
    return api(token, "create", {
      workshopId: w.id,
      machineId: m.id,
      componentId: device ? d.id : "",
      type,
      assignedTo: "kythuat",
      description: "Kiểm tra máy bị rung và nóng",
      requestKey: crypto.randomUUID(),
    });
  }
  function start(token, r) {
    return api(token, "startReport", {
      requestId: r.id,
      revision: r.revision,
      draftKey: crypto.randomUUID(),
    });
  }
  function submit(token, d, overrides = {}) {
    return api(token, "submitReport", {
      reportId: d.id,
      revision: d.revision,
      submitKey: "submit-" + d.id,
      content: "Đã vệ sinh và khắc phục, chạy thử ổn định",
      performedDate: "2026-11-09",
      checks: JSON.parse(d.checklist).map(() => true),
      actualResults: JSON.parse(d.checklist).map(() => "52°C"),
      ...overrides,
    });
  }
  function review(token, r, d, decision = "accept") {
    const fresh = api(token, "snapshot").requests.find((x) => x.id === r.id);
    return api(token, "review", {
      requestId: r.id,
      reportId: d.id,
      revision: fresh?.revision || r.revision,
      reviewKey: "review-" + d.id,
      decision,
      reason: decision === "reject" ? "Máy còn rung, kiểm tra lại" : "",
    });
  }
  function approveBoth(r, d) {
    for (const role of ["PGDChatLuong", "PGDSanXuat"])
      api(login(role), "approve", {
        requestId: r.id,
        reportId: d.id,
        decision: "accept",
        reason: "Đồng ý",
        reviewKey: role + d.id,
      });
  }
  return {
    approveBoth,
    c,
    catalog,
    tables,
    history,
    files,
    cache,
    login,
    api,
    create,
    start,
    submit,
    review,
    failWrite: (f) => (fail = f),
  };
}
module.exports = { setup };
