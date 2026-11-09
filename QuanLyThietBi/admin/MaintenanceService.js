function maintenanceDevice_(key) {
  const matches = readAdminRows_("DanhMucThietBi").filter(
    (d) => maintenanceDeviceKey_(d) === key,
  );
  if (matches.length !== 1)
    throw Error("Không tìm thấy đúng một thiết bị. Hãy tải lại danh mục.");
  return matches[0];
}
function maintenanceCriteria_(device) {
  return readAdminRows_("DanhMucCanKiemTra").filter(
    (r) => maintenanceDeviceKey_(r) === maintenanceDeviceKey_(device),
  );
}
function maintenanceCriteriaVersion_(rows, secret) {
  return adminHmac_(
    JSON.stringify(rows.map((r) => [r.danhMucCanKiemTra, r.thongSoTieuChuan])),
    secret || adminSecret_(),
  );
}
function maintenanceSnapshot_(user) {
  const history = maintenanceHistories_(),
    today = maintenanceToday_(),
    criteria = readAdminRows_("DanhMucCanKiemTra"),
    settings = maintenanceSettings_(),
    secret = adminSecret_(),
    criteriaByDevice = new Map(),
    historyByDevice = new Map();
  criteria.forEach((row) => {
    const key = maintenanceDeviceKey_(row);
    if (!criteriaByDevice.has(key)) criteriaByDevice.set(key, []);
    criteriaByDevice.get(key).push(row);
  });
  history.forEach((row) => {
    const key = row.maHoSo || maintenanceDeviceKey_(row);
    if (!historyByDevice.has(key)) historyByDevice.set(key, []);
    historyByDevice.get(key).push(row);
  });
  return {
    user,
    today,
    updatedAt: adminNow_(),
    workshops: readAdminRows_("DanhMucXuong").map((r) => r.tenXuong),
    machines: readAdminRows_("DanhMucMay").map((r) => ({
      tenXuong: r.tenXuong,
      tenMay: r.tenMay,
    })),
    devices: readAdminRows_("DanhMucThietBi").map((d) => {
      const key = maintenanceDeviceKey_(d),
        checks = criteriaByDevice.get(key) || [];
      return {
        ...maintenanceProjection_(d, historyByDevice.get(key) || [], today),
        criteria: checks,
        criteriaVersion: maintenanceCriteriaVersion_(checks, secret),
      };
    }),
    history: history.sort(
      (a, b) =>
        String(b.ngayThucHien).localeCompare(String(a.ngayThucHien)) ||
        String(b.thoiGianGhiNhan).localeCompare(String(a.thoiGianGhiNhan)),
    ),
    people: readAdminRows_("TaiKhoan")
      .filter(
        (r) =>
          !["disabled", "khóa", "ngừng hoạt động"].includes(
            adminNorm_(r.chucVu),
          ),
      )
      .map((r) => ({
        username: r.tenDangNhap,
        hoTen: r.hoTen,
        maNhanVien: r.maNhanVien,
        chucVu: r.chucVu,
      })),
    settings,
    settingsVersion: adminHmac_(JSON.stringify(settings), secret),
    reports: maintenanceRows_("NhatKyThongBaoBaoDuong").slice(-30).reverse(),
  };
}
function maintenanceRequired_(value, label, max) {
  const text = adminText_(value, max || 10000);
  if (!text) throw Error("Vui lòng nhập " + label + ".");
  return text;
}
function maintenanceRequest_(value) {
  const text = maintenanceRequired_(value, "mã thao tác", 100);
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(text))
    throw Error("Mã thao tác không hợp lệ.");
  return text;
}
function maintenanceHistorySheet_(type) {
  if (!["maintenance", "repair"].includes(type))
    throw Error("Loại công việc không hợp lệ.");
  return type === "maintenance" ? "LichSuBaoDuong" : "LichSuSuaChua";
}
function maintenanceSaveHistory_(user, p) {
  const sheet = maintenanceHistorySheet_(p.type),
    request = maintenanceRequest_(p.requestId),
    id = "LS_" + adminHash_(user.username + ":" + request).slice(0, 32),
    fingerprint = adminHmac_(JSON.stringify(p), adminSecret_()),
    existing = maintenanceHistories_().find((r) => r.maLichSu === id);
  if (existing) {
    if (existing.dauVanTay !== fingerprint)
      throw Error("Mã thao tác đã được dùng cho nội dung khác.");
    return existing;
  }
  const device = maintenanceDevice_(p.deviceKey),
    date = maintenanceRequired_(p.ngayThucHien, "ngày thực hiện");
  maintenanceDate_(date);
  if (date > maintenanceToday_())
    throw Error("Ngày thực hiện không được ở tương lai.");
  if (
    device.ngayLapDat &&
    /^\d{4}-\d{2}-\d{2}$/.test(device.ngayLapDat) &&
    date < device.ngayLapDat
  )
    throw Error("Ngày thực hiện phải từ ngày lắp đặt thiết bị.");
  if (typeof p.hoanThanh !== "boolean")
    throw Error("Vui lòng chọn trạng thái hoàn thành.");
  const people = readAdminRows_("TaiKhoan").filter(
    (r) =>
      adminNorm_(r.tenDangNhap) === adminNorm_(p.nguoiThucHien) &&
      !["disabled", "khóa", "ngừng hoạt động"].includes(adminNorm_(r.chucVu)),
  );
  if (people.length !== 1)
    throw Error("Người thực hiện không còn trong danh mục tài khoản.");
  const source = p.type === "maintenance" ? maintenanceCriteria_(device) : [];
  if (
    p.type === "maintenance" &&
    p.criteriaVersion !== maintenanceCriteriaVersion_(source)
  )
    throw Error(
      "Chỉ tiêu kiểm tra đã thay đổi. Đóng form và tải lại trước khi ghi nhận.",
    );
  if (!Array.isArray(p.checks) || p.checks.length !== source.length)
    throw Error("Danh sách chỉ tiêu kiểm tra không hợp lệ.");
  const checks = source.map((criterion, i) => {
    const value = p.checks[i] || {},
      actual = adminText_(value.ketQuaThucTe, 2000),
      outcome = adminText_(value.ketLuan, 30);
    if (outcome && !["Đạt", "Không đạt"].includes(outcome))
      throw Error("Kết luận kiểm tra không hợp lệ.");
    if (p.hoanThanh && (!actual || outcome !== "Đạt"))
      throw Error(
        "Chỉ tiêu " +
          (i + 1) +
          ": cần ghi kết quả thực tế và xác nhận Đạt trước khi hoàn thành.",
      );
    return {
      chiTieu: criterion.danhMucCanKiemTra,
      tieuChuan: criterion.thongSoTieuChuan,
      ketQuaThucTe: actual,
      ketLuan: outcome,
    };
  });
  const uploads = maintenanceResolvePhotos_(user, p, request);
  const row = {
    maLichSu: id,
    maHoSo: maintenanceDeviceKey_(device),
    tenXuong: device.tenXuong,
    tenMay: device.tenMay,
    maThietBi: device.maThietBi,
    tenThietBi: device.tenThietBi,
    ngayThucHien: date,
    hoanThanh: String(p.hoanThanh),
    nguoiThucHien: people[0].tenDangNhap,
    tenNguoiThucHien: people[0].hoTen,
    moTaLoi:
      p.type === "repair" ? maintenanceRequired_(p.moTaLoi, "mô tả lỗi") : "",
    noiDung: maintenanceRequired_(p.noiDung, "nội dung thực hiện"),
    ketQua: maintenanceRequired_(p.ketQua, "kết quả thực hiện"),
    chiTietKiemTra: JSON.stringify(checks),
    danhSachAnh: JSON.stringify(uploads),
    nguoiGhiNhan: user.username,
    tenNguoiGhiNhan: user.name,
    thoiGianGhiNhan: adminNow_(),
    maYeuCau: request,
    dauVanTay: fingerprint,
  };
  maintenanceWrite_(sheet, row);
  return row;
}
function maintenanceUploadCacheKey_(user, request, key) {
  return "bd-upload:" + adminHash_(user.username + ":" + request + ":" + key);
}
function maintenanceUploadPhoto_(user, p) {
  const request = maintenanceRequest_(p.requestId),
    key = maintenanceRequest_(p.uploadKey);
  maintenanceHistorySheet_(p.type);
  maintenanceDevice_(p.deviceKey);
  const cache = CacheService.getScriptCache(),
    cacheKey = maintenanceUploadCacheKey_(user, request, key),
    old = cache.get(cacheKey);
  if (old) {
    const meta = JSON.parse(old);
    if (meta.deviceKey !== p.deviceKey || meta.type !== p.type)
      throw Error("Ảnh không thuộc lần thực hiện này.");
    return meta;
  }
  if (
    typeof p.dataUrl !== "string" ||
    p.dataUrl.length > 4200000 ||
    !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.dataUrl)
  )
    throw Error("Chỉ nhận ảnh JPEG tối đa 3 MB.");
  const bytes = Utilities.base64Decode(
    p.dataUrl.slice(p.dataUrl.indexOf(",") + 1),
  );
  if (
    bytes.length > 3 * 1024 * 1024 ||
    bytes.length < 4 ||
    (bytes[0] & 255) !== 255 ||
    (bytes[1] & 255) !== 216 ||
    (bytes[2] & 255) !== 255
  )
    throw Error("Dữ liệu ảnh JPEG không hợp lệ.");
  const listKey = "bd-upload-list:" + adminHash_(user.username + ":" + request),
    list = JSON.parse(cache.get(listKey) || "[]");
  if (list.length >= 12) throw Error("Mỗi lần thực hiện tối đa 12 ảnh.");
  const folderId = PropertiesService.getScriptProperties().getProperty(
    "BAODUONG_PHOTO_FOLDER",
  );
  if (!folderId) throw Error("Chưa khởi tạo thư mục ảnh bảo dưỡng.");
  const name =
      adminText_(p.name, 150).replace(/[^a-zA-Z0-9_.-]/g, "_") || "anh.jpg",
    file = DriveApp.getFolderById(folderId).createFile(
      Utilities.newBlob(bytes, "image/jpeg", name),
    ),
    meta = {
      id: file.getId(),
      name,
      deviceKey: p.deviceKey,
      type: p.type,
      uploadKey: key,
    };
  cache.put(cacheKey, JSON.stringify(meta), 21600);
  list.push(key);
  cache.put(listKey, JSON.stringify(list), 21600);
  return meta;
}
function maintenanceResolvePhotos_(user, p, request) {
  if (
    !Array.isArray(p.photoKeys) ||
    p.photoKeys.length > 12 ||
    new Set(p.photoKeys).size !== p.photoKeys.length
  )
    throw Error("Danh sách ảnh không hợp lệ.");
  return p.photoKeys.map((key) => {
    const raw = CacheService.getScriptCache().get(
      maintenanceUploadCacheKey_(user, request, maintenanceRequest_(key)),
    );
    if (!raw) throw Error("Ảnh chờ lưu đã hết hạn. Vui lòng chọn lại ảnh.");
    const meta = JSON.parse(raw);
    if (meta.deviceKey !== p.deviceKey || meta.type !== p.type)
      throw Error("Ảnh không thuộc thiết bị hoặc công việc này.");
    return { id: meta.id, name: meta.name };
  });
}
function maintenanceReadPhoto_(user, p) {
  const row = maintenanceHistories_().find((r) => r.maLichSu === p.historyId);
  if (!row) throw Error("Không tìm thấy lịch sử.");
  let photos;
  try {
    photos = JSON.parse(row.danhSachAnh || "[]");
  } catch {
    photos = [];
  }
  if (!photos.some((a) => a.id === p.fileId))
    throw Error("Ảnh không thuộc bản ghi này.");
  const file = DriveApp.getFileById(p.fileId);
  if (file.getMimeType() !== "image/jpeg" || file.getSize() > 3 * 1024 * 1024)
    throw Error("Ảnh không hợp lệ.");
  return {
    dataUrl:
      "data:image/jpeg;base64," +
      Utilities.base64Encode(file.getBlob().getBytes()),
  };
}
function maintenanceSaveSettings_(user, p) {
  const settings = maintenanceSettings_();
  if (p.version !== adminHmac_(JSON.stringify(settings), adminSecret_()))
    throw Error("Cấu hình vừa thay đổi. Hãy tải lại.");
  const emails = [
    ...new Set(
      adminText_(p.emails, 5000)
        .split(/[,;\s]+/)
        .filter(Boolean)
        .map((s) => s.toLowerCase()),
    ),
  ];
  if (emails.some((e) => !/^\S+@\S+\.\S+$/.test(e)))
    throw Error("Email nhận báo cáo không hợp lệ.");
  if (p.enabled && !emails.length)
    throw Error("Vui lòng nhập email nhận báo cáo.");
  maintenanceSetSetting_("emailNhanBaoCao", emails.join(","));
  maintenanceSetSetting_("guiEmail", p.enabled ? "true" : "false");
  return { success: true };
}
function maintenanceApi(token, action, payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const user = requireAdminSession_(token),
      p = payload || {};
    if (action === "snapshot") return maintenanceSnapshot_(user);
    if (action === "saveHistory") {
      const record = maintenanceSaveHistory_(user, p);
      return { record, snapshot: maintenanceSnapshot_(user) };
    }
    if (action === "uploadPhoto") return maintenanceUploadPhoto_(user, p);
    if (action === "photo") return maintenanceReadPhoto_(user, p);
    if (action === "saveSettings") {
      maintenanceSaveSettings_(user, p);
      return maintenanceSnapshot_(user);
    }
    throw Error("Thao tác bảo dưỡng không hợp lệ.");
  } finally {
    lock.releaseLock();
  }
}
