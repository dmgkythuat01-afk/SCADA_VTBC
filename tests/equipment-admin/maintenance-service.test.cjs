const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  crypto = require("node:crypto");
function setup() {
  const c = { console };
  vm.createContext(c);
  for (const file of [
    "Schema",
    "Auth",
    "Data",
    "MaintenanceDomain",
    "MaintenanceStore",
    "EquipmentCriteria",
    "MaintenanceService",
    "MaintenanceReports",
  ])
    vm.runInContext(
      fs.readFileSync("QuanLyThietBi/admin/" + file + ".js", "utf8"),
      c,
    );
  const catalog = {
      TaiKhoan: [
        { tenDangNhap: "admin", chucVu: "admin", hoTen: "Admin" },
        { tenDangNhap: "tech", chucVu: "KyThuat", hoTen: "Kỹ thuật" },
      ],
      DanhMucThietBi: [
        {
          tenXuong: "Xưởng A",
          tenMay: "Máy A",
          maThietBi: "T1",
          tenThietBi: "Động cơ",
          ngayLapDat: "2026-10-01",
          soNgayCanBaoDuong: "30",
          dangSuDung: "Có",
        },
      ],
      DanhMucCanKiemTra: [
        {
          tenXuong: "Xưởng A",
          tenMay: "Máy A",
          maThietBi: "T1",
          danhMucCanKiemTra: "Nhiệt độ",
          thamSoCanKiemTra: "<60°C",
        },
      ],
    },
    tables = {
      LichSuBaoDuong: [],
      LichSuSuaChua: [],
      CauHinhBaoDuong: [],
      NhatKyThongBaoBaoDuong: [],
    },
    cache = new Map(),
    settings = { emailNhanBaoCao: "owner@example.com", guiEmail: "true" },
    files = new Map();
  let fileCount = 0,
    mailCount = 0,
    failMail = false;
  Object.assign(c, {
    adminHash_: (v) =>
      crypto.createHash("sha256").update(String(v)).digest("hex"),
    adminHmac_: (v, k) =>
      crypto.createHmac("sha256", k).update(String(v)).digest("hex"),
    adminSecret_: () => "secret",
    readAdminRows_: (n) => structuredClone(catalog[n] || []),
    maintenanceRows_: (n) => structuredClone(tables[n]),
    maintenanceWrite_: (n, row) => {
      const key =
          n === "CauHinhBaoDuong"
            ? "tenCauHinh"
            : n === "NhatKyThongBaoBaoDuong"
              ? "maThongBao"
              : "maLichSu",
        i = tables[n].findIndex((r) => r[key] === row[key]);
      if (i < 0) tables[n].push(structuredClone(row));
      else tables[n][i] = structuredClone(row);
      return row;
    },
    maintenanceSettings_: () => ({ ...settings }),
    maintenanceSetSetting_: (k, v) => (settings[k] = v),
    maintenanceToday_: () => "2026-11-09",
    adminNow_: () => "2026-11-09 10:00:00",
    requireAdminSession_: (token) => {
      if (token !== "valid") throw Error("expired");
      return { username: "admin", name: "Admin" };
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => cache.get(k) || null,
        put: (k, v) => cache.set(k, v),
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => "folder" }),
    },
    Utilities: {
      base64Decode: (s) => Array.from(Buffer.from(s, "base64")),
      base64Encode: (bytes) => Buffer.from(bytes).toString("base64"),
      newBlob: (bytes, type, name) => ({ bytes, type, name }),
    },
    DriveApp: {
      getFolderById: () => ({
        createFile: (blob) => {
          const id = "image" + ++fileCount;
          files.set(id, blob);
          return { getId: () => id };
        },
      }),
      getFileById: (id) => {
        const f = files.get(id);
        if (!f) throw Error("missing");
        return {
          getMimeType: () => f.type,
          getSize: () => f.bytes.length,
          getBlob: () => ({ getBytes: () => f.bytes }),
        };
      },
    },
    ScriptApp: {
      getService: () => ({ getUrl: () => "https://example.com/app" }),
    },
    MailApp: {
      sendEmail: (mail) => {
        mailCount++;
        if (failMail) throw Error("mail failed");
        c.lastMail = mail;
      },
    },
  });
  const device = catalog.DanhMucThietBi[0],
    user = { username: "admin", name: "Admin" },
    payload = {
      requestId: "maintenance-0001",
      type: "maintenance",
      deviceKey: c.maintenanceDeviceKey_(device),
      ngayThucHien: "2026-11-05",
      hoanThanh: true,
      nguoiThucHien: "tech",
      noiDung: "Bôi trơn, vệ sinh",
      ketQua: "Ổn định",
      criteriaVersion: c.maintenanceCriteriaVersion_(catalog.DanhMucCanKiemTra),
      checks: [{ ketQuaThucTe: "52°C", ketLuan: "Đạt" }],
      photoKeys: [],
    };
  return {
    c,
    catalog,
    tables,
    cache,
    settings,
    user,
    payload,
    get fileCount() {
      return fileCount;
    },
    get mailCount() {
      return mailCount;
    },
    failMail: (v) => (failMail = v),
  };
}
test("snapshot reads shared signing configuration once for a device list", () => {
  const s = setup();
  let reads = 0;
  s.c.adminSecret_ = () => {
    reads++;
    return "secret";
  };
  s.catalog.DanhMucThietBi = Array.from({ length: 30 }, (_, i) => ({
    ...s.catalog.DanhMucThietBi[0],
    maThietBi: "T" + i,
  }));
  const data = s.c.maintenanceSnapshot_(s.user);
  a.equal(data.devices.length, 30);
  a.equal(reads, 1);
});
test("new assessment columns are versioned and retained in maintenance history",()=>{
 const s=setup(),c=s.catalog.DanhMucCanKiemTra[0];Object.assign(c,{chiTieuDanhGia1:'Mức tốt',chiTieuDanhGia2:'Mức trung bình',chiTieuDanhGia3:'Cần thay'});
 s.payload.criteriaVersion=s.c.maintenanceCriteriaVersion_([c]);
 const row=s.c.maintenanceSaveHistory_(s.user,s.payload),saved=JSON.parse(row.chiTietKiemTra)[0];
 a.equal(saved.thamSoCanKiemTra,c.thamSoCanKiemTra);a.equal(saved.chiTieuDanhGia1,'Mức tốt');a.equal(saved.chiTieuDanhGia3,'Cần thay');
 const previous=s.payload.criteriaVersion;c.chiTieuDanhGia2='Mức cần theo dõi';a.notEqual(s.c.maintenanceCriteriaVersion_([c]),previous);
});
test("completed maintenance advances calendar, unfinished maintenance and repair do not; replay is immutable", () => {
  const s = setup(),
    r = s.c.maintenanceSaveHistory_(s.user, s.payload);
  a.equal(r.tenNguoiThucHien, "Kỹ thuật");
  a.equal(s.c.maintenanceSnapshot_(s.user).devices[0].ngayDenHan, "2026-12-05");
  s.c.maintenanceSaveHistory_(s.user, s.payload);
  a.equal(s.tables.LichSuBaoDuong.length, 1);
  a.throws(() =>
    s.c.maintenanceSaveHistory_(s.user, { ...s.payload, ketQua: "changed" }),
  );
  s.c.maintenanceSaveHistory_(s.user, {
    ...s.payload,
    requestId: "repair-0000001",
    type: "repair",
    ngayThucHien: "2026-11-08",
    moTaLoi: "Rung",
    checks: [],
  });
  s.c.maintenanceSaveHistory_(s.user, {
    ...s.payload,
    requestId: "pending-000001",
    ngayThucHien: "2026-11-09",
    hoanThanh: false,
    checks: [{ ketQuaThucTe: "70°C", ketLuan: "Không đạt" }],
  });
  a.equal(s.c.maintenanceSnapshot_(s.user).devices[0].ngayDenHan, "2026-12-05");
  a.equal(s.c.maintenanceSnapshot_(s.user).history.length, 3);
});
test("stale checklist, unfinished criteria, invalid dates and unauthorized sessions reject before writes", () => {
  const s = setup();
  a.throws(() => s.c.maintenanceApi("bad", "saveHistory", s.payload));
  a.throws(() =>
    s.c.maintenanceSaveHistory_(s.user, {
      ...s.payload,
      checks: [{ ketQuaThucTe: "70", ketLuan: "Không đạt" }],
    }),
  );
  a.throws(() =>
    s.c.maintenanceSaveHistory_(s.user, {
      ...s.payload,
      ngayThucHien: "2026-11-10",
    }),
  );
  a.throws(() =>
    s.c.maintenanceSaveHistory_(s.user, {
      ...s.payload,
      ngayThucHien: "2026-09-01",
    }),
  );
  s.catalog.DanhMucCanKiemTra[0].thamSoCanKiemTra = "<50";
  a.throws(() => s.c.maintenanceSaveHistory_(s.user, s.payload));
  a.equal(s.tables.LichSuBaoDuong.length, 0);
});
test("private photos are scoped to actor/request/device and history membership; uploads deduplicate", () => {
  const s = setup(),
    p = {
      requestId: s.payload.requestId,
      uploadKey: "image-key-0001",
      deviceKey: s.payload.deviceKey,
      type: "maintenance",
      dataUrl: "data:image/jpeg;base64,/9j/4AA=",
      name: "test.jpg",
    };
  const photo = s.c.maintenanceUploadPhoto_(s.user, p);
  s.c.maintenanceUploadPhoto_(s.user, p);
  a.equal(s.fileCount, 1);
  a.throws(() =>
    s.c.maintenanceResolvePhotos_(
      { username: "other" },
      { ...s.payload, photoKeys: [p.uploadKey] },
      p.requestId,
    ),
  );
  a.throws(() =>
    s.c.maintenanceResolvePhotos_(
      s.user,
      { ...s.payload, type: "repair", photoKeys: [p.uploadKey] },
      p.requestId,
    ),
  );
  const row = s.c.maintenanceSaveHistory_(s.user, {
    ...s.payload,
    photoKeys: [p.uploadKey],
  });
  a.ok(
    s.c
      .maintenanceReadPhoto_(s.user, {
        historyId: row.maLichSu,
        fileId: photo.id,
      })
      .dataUrl.startsWith("data:image/jpeg"),
  );
  a.throws(() =>
    s.c.maintenanceReadPhoto_(s.user, {
      historyId: row.maLichSu,
      fileId: "other",
    }),
  );
});
test("weekly mail escapes source text, deduplicates success and retries explicit mail failure", () => {
  const s = setup();
  s.catalog.DanhMucThietBi[0].tenThietBi = "<script>";
  s.failMail(true);
  a.throws(() => s.c.baoCaoBaoDuongDinhKy_());
  a.equal(s.tables.NhatKyThongBaoBaoDuong[0].trangThai, "failed");
  s.failMail(false);
  s.c.baoCaoBaoDuongDinhKy_();
  a.equal(s.tables.NhatKyThongBaoBaoDuong[0].trangThai, "sent");
  a.ok(s.c.lastMail.htmlBody.includes("&lt;script&gt;"));
  const sent = s.mailCount;
  s.c.baoCaoBaoDuongDinhKy_();
  a.equal(s.mailCount, sent);
});
test("mail delivered before a logging failure is not automatically sent a second time", () => {
  const s = setup(),
    write = s.c.maintenanceWrite_;
  s.c.maintenanceWrite_ = (name, row) => {
    if (name === "NhatKyThongBaoBaoDuong" && row.trangThai === "sent")
      throw Error("logging failed");
    return write(name, row);
  };
  a.throws(() => s.c.baoCaoBaoDuongDinhKy_());
  a.equal(s.mailCount, 1);
  a.equal(s.tables.NhatKyThongBaoBaoDuong[0].trangThai, "sending");
  s.c.baoCaoBaoDuongDinhKy_();
  a.equal(s.mailCount, 1);
});
