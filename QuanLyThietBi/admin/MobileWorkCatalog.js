function mobileWorkCatalog_() {
  const context = mobileWorkGetContext_();
  if (context.catalog) return context.catalog;
  const assets = [],
    schedules = [],
    ids = new Set(),
    criteria = mobileWorkCatalogRows_("DanhMucCanKiemTra"),
    history = mobileWorkHistories_(),
    today = maintenanceToday_(),
    byCriteria = new Map(),
    byHistory = new Map(),
    secret = mobileWorkSecret_();
  criteria.forEach((c) => {
    const key = maintenanceDeviceKey_(c);
    if (!byCriteria.has(key)) byCriteria.set(key, []);
    byCriteria.get(key).push(c);
  });
  history.forEach((h) => {
    const key = h.maHoSo || maintenanceDeviceKey_(h);
    if (!byHistory.has(key)) byHistory.set(key, []);
    byHistory.get(key).push(h);
  });
  const hash = (type, values) =>
      type +
      "_" +
      adminHash_(JSON.stringify(values.map((v) => adminNorm_(v)))).slice(0, 28),
    workshopId = (name) => hash("X", [name]),
    machineId = (w, m) => hash("M", [w, m]),
    add = (row) => {
      if (ids.has(row.id))
        throw Error(
          "Danh mục có tên xưởng, máy hoặc mã thiết bị bị trùng. Kiểm tra lại Nhập dữ liệu.",
        );
      ids.add(row.id);
      assets.push(row);
    };
  mobileWorkCatalogRows_("DanhMucXuong").forEach((r) =>
    add({
      id: workshopId(r.tenXuong),
      type: "workshop",
      parentId: "",
      name: r.tenXuong,
      active: true,
    }),
  );
  mobileWorkCatalogRows_("DanhMucMay").forEach((r) => {
    const parent = workshopId(r.tenXuong);
    if (!ids.has(parent)) return;
    add({
      id: machineId(r.tenXuong, r.tenMay),
      type: "machine",
      parentId: parent,
      name: r.tenMay,
      active: true,
      workshopName: r.tenXuong,
    });
  });
  mobileWorkCatalogRows_("DanhMucThietBi").forEach((device) => {
    const parent = machineId(device.tenXuong, device.tenMay);
    if (!ids.has(parent)) return;
    const key = maintenanceDeviceKey_(device),
      id = "TB_" + adminHash_(key).slice(0, 28),
      checks = byCriteria.get(key) || [],
      projection = maintenanceProjection_(
        device,
        byHistory.get(key) || [],
        today,
      );
    add({
      id,
      type: "component",
      parentId: parent,
      name: device.tenThietBi
        ? device.tenThietBi + " · " + device.maThietBi
        : device.maThietBi,
      code: device.maThietBi,
      deviceName: device.tenThietBi || "",
      deviceKey: key,
      active: maintenanceActive_(device),
      workshopName: device.tenXuong,
      machineName: device.tenMay,
      criteria: checks,
      criteriaVersion: maintenanceCriteriaVersion_(checks, secret),
      details: device.ThongSoKyThuat || "",
      unit: device.donVi || "",
      quantity: device.soLuong || "",
      dueDate: projection.ngayDenHan,
      interval: device.soNgayCanBaoDuong || "",
    });
    if (
      /^\d+$/.test(String(device.soNgayCanBaoDuong)) &&
      Number(device.soNgayCanBaoDuong) > 0 &&
      Number(device.soNgayCanBaoDuong) <= 36500
    )
      schedules.push({
        id: "BD_" + id,
        componentId: id,
        name: "Bảo dưỡng định kỳ · " + device.soNgayCanBaoDuong + " ngày",
        interval: Number(device.soNgayCanBaoDuong),
        unit: "day",
        dueDate: projection.ngayDenHan,
        active: maintenanceActive_(device),
        revision: 1,
        checklist: JSON.stringify(
          checks.map((c) => c.danhMucCanKiemTra + " · " + c.thongSoTieuChuan),
        ),
      });
  });
  context.catalog = { assets, schedules };
  return context.catalog;
}
function mobileWorkReportCriteria_(request) {
  if (request.type !== "maintenance" || !request.componentId) return [];
  const component = mobileWorkRows_("Assets").find(
    (a) => a.id === request.componentId,
  );
  if (!component) throw Error("Thiết bị không còn trong danh mục.");
  return component.criteria || [];
}
function mobileWorkRefreshDraftCriteria_(draft, request) {
  const source = mobileWorkReportCriteria_(request);
  draft.criteriaSnapshot = JSON.stringify(
    source.map((c) => ({
      danhMucCanKiemTra: c.danhMucCanKiemTra,
      thongSoTieuChuan: c.thongSoTieuChuan,
    })),
  );
  draft.criteriaVersion = maintenanceCriteriaVersion_(
    source,
    mobileWorkSecret_(),
  );
  draft.checklist = JSON.stringify(
    source.map(
      (c) =>
        c.danhMucCanKiemTra +
        " · Tiêu chuẩn: " +
        (c.thongSoTieuChuan || "Chưa khai báo"),
    ),
  );
  draft.checks = "[]";
  draft.actualResults = "[]";
  return draft;
}
function mobileWorkRefreshExistingDraft_(draft, request) {
  const version = maintenanceCriteriaVersion_(
    mobileWorkReportCriteria_(request),
    mobileWorkSecret_(),
  );
  if (draft.criteriaVersion !== version) {
    mobileWorkRefreshDraftCriteria_(draft, request);
    draft.revision = Number(draft.revision) + 1;
    mobileWorkWrite_("ServiceReports", draft);
  }
  return draft;
}
function mobileWorkValidateReportCriteria_(draft, request, p) {
  const source = mobileWorkReportCriteria_(request);
  if (
    draft.criteriaVersion !==
    maintenanceCriteriaVersion_(source, mobileWorkSecret_())
  )
    throw Error(
      "Chỉ tiêu kiểm tra đã thay đổi. Đóng và mở lại báo cáo để cập nhật.",
    );
  if (
    !Array.isArray(p.checks) ||
    !Array.isArray(p.actualResults) ||
    p.checks.length !== source.length ||
    p.actualResults.length !== source.length
  )
    throw Error("Danh sách kết quả kiểm tra không hợp lệ.");
  source.forEach((_, i) => {
    if (p.checks[i] !== true || !mobileWorkText_(p.actualResults[i], 2000))
      throw Error(
        "Cần ghi kết quả thực tế và xác nhận Đạt cho tất cả chỉ tiêu.",
      );
  });
}
function mobileWorkSubmissionFingerprint_(p) {
  const fields = [
      mobileWorkText_(p.content, 12000),
      String(p.performedDate || ""),
      Array.isArray(p.checks) ? p.checks : [],
      Array.isArray(p.actualResults)
        ? p.actualResults.map((v) => mobileWorkText_(v, 2000))
        : [],
    ],
    notes = [
      mobileWorkText_(p.noiDungCaiTien, 12000),
      mobileWorkText_(p.yKienDongGop, 12000),
    ];
  // Empty new fields retain compatibility with signatures of older reports.
  if (notes.some(Boolean)) fields.push(...notes);
  return adminHmac_(JSON.stringify(fields), mobileWorkSecret_());
}
