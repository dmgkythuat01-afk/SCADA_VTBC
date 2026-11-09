function reconcileSchedules_() {
  const completed = rows_("Jobs").filter(
      (j) => j.status === "completed" && j.scheduleId,
    ),
    schedules = rows_("Schedules");
  schedules.forEach((s) => {
    const latest = completed
      .filter((j) => j.scheduleId === s.id)
      .sort((a, b) =>
        String(b.completedAt).localeCompare(String(a.completedAt)),
      )[0];
    if (latest && String(s.updatedAt) < String(latest.completedAt)) {
      s.dueDate = nextDue_(latest.completedDate, s.interval, s.unit);
      s.updatedAt = now_();
      s.revision = Number(s.revision) + 1;
      write_("Schedules", s);
    }
  });
}
function snapshot_(u) {
  return {
    user: u,
    today: today_(),
    assets: rows_("Assets"),
    mobileRequests: rows_("Requests") || [],
    mobileUrl:
      typeof equipmentMobileUrl_ === "function" ? equipmentMobileUrl_() : "",
    managers: rows_("Managers"),
    schedules: rows_("Schedules"),
    jobs: rows_("Jobs"),
    members: members_()
      .filter(enabled_)
      .map((m) => ({
        email: m.email,
        contactEmail: m.contactEmail || "",
        name: m.name,
        role: m.role,
        position: m.position || m.role,
      })),
    settings: u.role === "admin" ? settings_() : {},
    notifications: u.role === "admin" ? rows_("Notifications").slice(-40) : [],
  };
}
function saveAsset_(u, p) {
  admin_(u);
  const old = p.id ? asset_(p.id) : null;
  checkRevision_(old, p);
  const types = ["workshop", "area", "machine", "component"],
    type = old ? old.type : p.type;
  if (!types.includes(type)) throw Error("Loại thiết bị không hợp lệ.");
  const parentId = old ? old.parentId : text_(p.parentId),
    level = types.indexOf(type);
  if (level > 0) {
    const parent = asset_(parentId);
    if (parent.type !== types[level - 1] || !enabled_(parent))
      throw Error("Vị trí cha không hợp lệ.");
  }
  const active = p.active !== false;
  const installationDate = p.installationDate === undefined
    ? (old && old.installationDate) || ""
    : text_(p.installationDate);
  if (installationDate) validDate_(installationDate);
  if (!active) {
    if (
      rows_("Assets").some(
        (a) => a.parentId === (old || {}).id && enabled_(a),
      ) ||
      rows_("Schedules").some(
        (s) => s.componentId === (old || {}).id && enabled_(s),
      ) ||
      rows_("Jobs").some(
        (j) => j.componentId === (old || {}).id && j.status !== "completed",
      )
    )
      throw Error("Cần dừng các mục con/lịch và hoàn thành công việc trước.");
  }
  const item = Object.assign(old || { id: id_() }, {
    type,
    parentId,
    managerId: machineManagerId_(type, old, p),
    name: required_(p.name, "tên", 250),
    code: text_(p.code, 100),
    purpose: text_(p.purpose),
    details: text_(p.details, 8000),
    managingDepartment: p.managingDepartment === undefined
      ? (old && old.managingDepartment) || ""
      : text_(p.managingDepartment, 250),
    installationDate,
    checklist: JSON.stringify(
      (p.checklist || [])
        .map((x) => text_(x, 300))
        .filter(Boolean)
        .slice(0, 100),
    ),
    active,
    updatedAt: now_(),
    updatedBy: u.email,
    revision: Number((old && old.revision) || 0) + 1,
  });
  write_("Assets", item);
  audit_(u, "saveAsset", item.id);
  return item;
}
function saveSchedule_(u, p) {
  admin_(u);
  const old = rows_("Schedules").find((s) => s.id === p.id);
  if (p.id && !old) throw Error("Không tìm thấy lịch.");
  checkRevision_(old, p);
  const component = asset_(p.componentId);
  if (component.type !== "component" || !enabled_(component))
    throw Error("Chọn bộ phận đang sử dụng.");
  nextDue_(p.dueDate, p.interval, p.unit);
  const s = Object.assign(old || { id: id_() }, {
    componentId: component.id,
    name: required_(p.name, "công việc"),
    interval: Number(p.interval),
    unit: p.unit,
    dueDate: p.dueDate,
    assignee: validAssignee_(p.assignee),
    checklist: JSON.stringify(
      (p.checklist || [])
        .map((x) => text_(x, 300))
        .filter(Boolean)
        .slice(0, 100),
    ),
    active: p.active !== false,
    updatedAt: now_(),
    revision: Number((old && old.revision) || 0) + 1,
  });
  write_("Schedules", s);
  audit_(u, "saveSchedule", s.id);
  return s;
}
function validAssignee_(email) {
  const e = text_(email, 250).toLowerCase();
  if (
    e &&
    !members_().some((m) => String(m.email).toLowerCase() === e && enabled_(m))
  )
    throw Error("Người phụ trách không hợp lệ.");
  return e;
}
function openJob_(u, p) {
  const component = asset_(p.componentId);
  if (component.type !== "component" || !enabled_(component))
    throw Error("Chọn bộ phận đang sử dụng.");
  const all = rows_("Jobs");
  if (p.requestId) {
    const previous = all.find((j) => j.requestId === p.requestId);
    if (previous) return previous;
  }
  let schedule = null;
  if (p.scheduleId) {
    schedule = rows_("Schedules").find(
      (s) =>
        s.id === p.scheduleId && s.componentId === component.id && enabled_(s),
    );
    if (!schedule) throw Error("Lịch không hợp lệ.");
    const existing = all.find(
      (j) => j.scheduleId === schedule.id && j.status !== "completed",
    );
    if (existing) return existing;
  }
  const j = {
    id: id_(),
    componentId: component.id,
    scheduleId: schedule ? schedule.id : "",
    type: schedule ? "maintenance" : "repair",
    title: required_(schedule ? schedule.name : p.title, "nội dung"),
    description: text_(p.description, 8000),
    assignee: validAssignee_(
      p.assignee || (schedule && schedule.assignee) || u.email,
    ),
    status: "open",
    openedAt: now_(),
    openedBy: u.email,
    photos: "[]",
    requestId: required_(p.requestId, "mã yêu cầu", 100),
    revision: 1,
  };
  write_("Jobs", j);
  audit_(u, "openJob", j.id);
  return j;
}
function job_(id) {
  const j = rows_("Jobs").find((x) => x.id === id);
  if (!j) throw Error("Không tìm thấy công việc.");
  return j;
}
function canWork_(u, j) {
  if (
    u.role !== "admin" &&
    j.assignee &&
    j.assignee !== u.email &&
    j.openedBy !== u.email
  )
    throw Error("Bạn chưa được giao công việc này.");
}
function assignJob_(u, p) {
  const j = job_(p.id);
  canWork_(u, j);
  checkRevision_(j, p);
  if (j.status === "completed") throw Error("Công việc đã hoàn thành.");
  if (p.assignee && p.assignee !== u.email) admin_(u);
  j.assignee = validAssignee_(p.assignee || u.email);
  j.status = "in_progress";
  j.revision = Number(j.revision) + 1;
  write_("Jobs", j);
  audit_(u, "assignJob", j.id);
  return j;
}
function completeJob_(u, p) {
  const j = job_(p.id);
  canWork_(u, j);
  if (j.status === "completed") {
    if ((j.completionRequestId || j.requestId) === p.requestId) {
      reconcileSchedules_();
      return j;
    }
    throw Error("Công việc đã hoàn thành, không thể ghi lại.");
  }
  checkRevision_(j, p);
  const completed = required_(p.completedDate, "ngày hoàn thành");
  validDate_(completed);
  if (completed > today_() || completed < String(j.openedAt).slice(0, 10))
    throw Error("Ngày hoàn thành phải từ ngày mở việc đến hôm nay.");
  const result = required_(p.result, "kết quả thực hiện", 8000),
    photos = parsed_(j.photos, []);
  if ((p.photoIds || []).some((id) => !photos.some((a) => a.id === id)))
    throw Error("Ảnh không thuộc công việc này.");
  const s = j.scheduleId
    ? rows_("Schedules").find((x) => x.id === j.scheduleId)
    : null;
  if (j.scheduleId && !s) throw Error("Lịch bảo dưỡng không còn tồn tại.");
  if (s) {
    const checks = parsed_(s.checklist, []);
    if (
      checks.length &&
      (!Array.isArray(p.checks) || checks.some((x, i) => p.checks[i] !== true))
    )
      throw Error("Cần xác nhận hết các mục bảo dưỡng.");
  }
  // Persist job first. Reconciliation updates a missed schedule write on next snapshot/report.
  j.status = "completed";
  j.completedDate = completed;
  j.completedAt = now_();
  j.completedBy = u.email;
  j.result = JSON.stringify({ text: result, checks: p.checks || [] });
  j.completionRequestId = required_(p.requestId, "mã yêu cầu", 100);
  j.revision = Number(j.revision) + 1;
  write_("Jobs", j);
  if (s) {
    s.dueDate = nextDue_(completed, s.interval, s.unit);
    s.updatedAt = now_();
    s.revision = Number(s.revision) + 1;
    write_("Schedules", s);
  }
  audit_(u, "completeJob", j.id, {
    completedDate: completed,
    photos: photos.length,
  });
  return j;
}
function saveSettings_(u, p) {
  admin_(u);
  const emails = required_(p.reportEmails, "email nhận báo cáo")
    .split(/[,;\s]+/)
    .filter(Boolean);
  if (emails.some((e) => !/^\S+@\S+\.\S+$/.test(e)))
    throw Error("Email không hợp lệ.");
  setting_("reportEmails", emails.join(","));
  audit_(u, "saveSettings", "reportEmails");
  return settings_();
}
function saveMember_(u, p) {
  admin_(u);
  const useName = required_(
      p.useName || p.email,
      "tên đăng nhập",
      100,
    ).toLowerCase(),
    position = required_(p.role, "chức vụ", 150);
  if (/[\r\n]/.test(useName)) throw Error("Tên đăng nhập không hợp lệ.");
  const all = members_(),
    matches = all.filter((m) => m.email === useName),
    old = matches[0];
  if (matches.length > 1)
    throw Error("Sheet TaiKhoan có tên đăng nhập bị trùng.");
  if (
    old &&
    old.role === "admin" &&
    (authRole_(position) !== "admin" || p.active === false) &&
    all.filter((m) => m.role === "admin" && enabled_(m)).length <= 1
  )
    throw Error("Phải giữ ít nhất một quản trị viên.");
  const contactEmail = optionalEquipmentEmail_(
    p.contactEmail === undefined
      ? (old && old.contactEmail) || ""
      : p.contactEmail,
  );
  if (
    contactEmail &&
    all.some(
      (m) =>
        m.email !== useName &&
        enabled_(m) &&
        String(m.contactEmail || "").toLowerCase() === contactEmail,
    )
  )
    throw Error("Email này đã được gắn với một tài khoản khác.");
  const account = {
    _row: old && old._row,
    useName,
    email: contactEmail,
    passWord: (old && old.passWord) || "",
    role: p.active === false ? "disabled" : position,
    name: required_(p.name, "họ tên", 200),
  };
  if (p.password) setMemberPassword_(account, p.password);
  if (!account.passWord)
    throw Error("Thành viên mới cần mật khẩu tối thiểu 12 ký tự.");
  write_("Account", account);
  audit_(u, "saveAccount", useName);
  return { success: true };
}
