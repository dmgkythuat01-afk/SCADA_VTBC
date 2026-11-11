function mobileWorkTypeLabel_(type) {
  return (
    { repair: "Sửa chữa", maintenance: "Bảo dưỡng", new_work: "Làm mới" }[
      type
    ] || type
  );
}
function mobileWorkRole_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}
function mobileWorkCapabilities_(user) {
  const role = mobileWorkRole_(user.position || user.role);
  const admin = user.role === "admin" || role === "admin";
  return {
    admin,
    shiftLeader: role === "truongca",
    approver: { pgdchatluong: "quality", pgdsanxuat: "production" }[role] || "",
    viewer: role === "pgdcongnghe",
    requester:
      admin || ["truongca", "congnhan", "phongcongnghe"].includes(role),
    technical:
      admin ||
      ["kythuat", "cokhi", "tudonghoa", "technician", "kythuatbaotri"].includes(
        role,
      ),
  };
}
function mobileWorkRequireAccess_(u) {
  const caps = mobileWorkCapabilities_(u);
  if (!caps.requester && !caps.technical && !caps.approver && !caps.viewer)
    throw Error("Chức vụ này chưa được cấp quyền vào trang mobile.");
  return caps;
}
function mobileWorkRequireTechnical_(u) {
  if (!mobileWorkRequireAccess_(u).technical)
    throw Error("Chỉ tài khoản kỹ thuật được nhận và báo cáo công việc.");
}
function mobileWorkCanView_(u, r) {
  const caps = mobileWorkRequireAccess_(u);
  return (
    caps.technical ||
    caps.shiftLeader ||
    caps.approver ||
    caps.viewer ||
    r.createdBy === u.email
  );
}
function mobileWorkRequest_(id) {
  const r = mobileWorkRows_("Requests").find((r) => r.id === id);
  if (!r) throw Error("Không tìm thấy phiếu yêu cầu.");
  return r;
}
function mobileWorkReport_(id) {
  const r = mobileWorkRows_("ServiceReports").find((r) => r.id === id);
  if (!r) throw Error("Không tìm thấy báo cáo.");
  return r;
}
function mobileWorkNotify_(id, recipient, message, requestId) {
  if (mobileWorkRows_("Notifications").some((n) => n.id === id)) return;
  mobileWorkWrite_("Notifications", {
    id,
    date: maintenanceToday_(),
    kind: "app",
    recipient,
    status: "unread",
    message,
    requestId,
    sentAt: mobileWorkNow_(),
  });
}
function mobileWorkAdminUrl_() {
  return "https://script.google.com/macros/s/AKfycbys2ZTXnDl71K_HDVMf1lFGb1oEohD5CeI0N0H1s3qFBLE-0LLhqdinx7_dyYC9hgcs_Q/exec";
}
function mobileWorkUrl_() {
  return "https://script.google.com/macros/s/AKfycbzMajCHwyZ8ohRElBG5SKeE0jbG6orEIHXOUBh_bF611yGq8zLDgCZK-UrsBj8gPQQUhA/exec";
}
function mobileWorkSnapshot_(u) {
  const caps = mobileWorkRequireAccess_(u),
    requests = mobileWorkRows_("Requests").filter((r) =>
      mobileWorkCanView_(u, r),
    ),
    ids = new Set(requests.map((r) => r.id));
  return {
    user: u,
    capabilities: caps,
    today: maintenanceToday_(),
    assets: mobileWorkRows_("Assets"),
    schedules: mobileWorkRows_("Schedules").filter(mobileWorkEnabled_),
    requests,
    reports: mobileWorkRows_("ServiceReports").filter(
      (r) =>
        ids.has(r.requestId) &&
        (!mobileWorkDraft_(r) || r.createdBy === u.email || caps.admin),
    ),
    reviews: mobileWorkRows_("ServiceReviews").filter((r) =>
      ids.has(r.requestId),
    ),
    technicians: mobileWorkMembers_()
      .filter(
        (m) =>
          mobileWorkEnabled_(m) &&
          mobileWorkCapabilities_(m).technical &&
          !mobileWorkCapabilities_(m).admin,
      )
      .map((m) => ({ useName: m.email, name: m.name, position: m.position })),
    notifications: mobileWorkRows_("Notifications")
      .filter((n) => n.kind === "app" && n.recipient === u.email)
      .slice(-100),
    desktopUrl: mobileWorkAdminUrl_(),
  };
}
function mobileWorkCreateRequest_(u, p) {
  const caps = mobileWorkRequireAccess_(u);
  if (!caps.requester) throw Error("Vai trò này không được tạo phiếu yêu cầu.");
  const key = mobileWorkRequired_(p.requestKey, "mã yêu cầu", 100),
    prior = mobileWorkRows_("Requests").find(
      (r) => r.createdBy === u.email && r.requestKey === key,
    );
  if (prior) return prior;
  const requestedCompletion = mobileWorkText_(p.ngayDeNghiHoanThanh, 10);
  if (requestedCompletion) maintenanceDate_(requestedCompletion);
  const all = mobileWorkRows_("Assets"),
    workshop = all.find(
      (a) =>
        a.id === p.workshopId && a.type === "workshop" && mobileWorkEnabled_(a),
    ),
    machine = all.find(
      (a) =>
        a.id === p.machineId && a.type === "machine" && mobileWorkEnabled_(a),
    );
  if (!workshop || !machine || machine.parentId !== workshop.id)
    throw Error("Máy không thuộc xưởng đã chọn.");
  const component = p.componentId
    ? all.find(
        (a) =>
          a.id === p.componentId &&
          a.type === "component" &&
          a.parentId === machine.id &&
          mobileWorkEnabled_(a),
      )
    : null;
  if (p.componentId && !component)
    throw Error("Thiết bị không thuộc máy đã chọn.");
  if (!["repair", "maintenance", "new_work"].includes(p.type))
    throw Error("Loại yêu cầu không hợp lệ.");
  const assignedTo = mobileWorkRequired_(
      p.assignedTo,
      "người được phân công",
      100,
    ).toLowerCase(),
    assignee = mobileWorkMembers_().find(
      (m) =>
        m.email === assignedTo &&
        mobileWorkEnabled_(m) &&
        mobileWorkCapabilities_(m).technical &&
        !mobileWorkCapabilities_(m).admin,
    );
  if (!assignee)
    throw Error(
      "Người được phân công phải thuộc nhóm kỹ thuật đang hoạt động.",
    );
  let schedule = null;
  if (p.scheduleId) {
    schedule = mobileWorkRows_("Schedules").find(
      (s) =>
        s.id === p.scheduleId &&
        s.componentId === component?.id &&
        mobileWorkEnabled_(s),
    );
    if (p.type !== "maintenance" || !schedule)
      throw Error("Lịch bảo dưỡng không phù hợp với thiết bị đã chọn.");
  }
  const r = {
    id: mobileWorkDocumentId_({repair:"SC",new_work:"LM",maintenance:"BD"}[p.type]),
    workshopId: workshop.id,
    workshopName: workshop.name || "",
    machineId: machine.id,
    machineName: machine.name || "",
    componentId: component?.id || "",
    componentName: component?.name || "",
    deviceCode: component?.code || "",
    deviceName: component?.deviceName || "",
    deviceKey:
      component?.deviceKey ||
      maintenanceDeviceKey_({
        tenXuong: workshop.name,
        tenMay: machine.name,
        maThietBi: "",
      }),
    type: p.type,
    title:
      mobileWorkText_(p.title, 250) ||
      mobileWorkTypeLabel_(p.type) + " — " + (component?.name || machine.name),
    description: mobileWorkRequired_(
      p.description,
      "mô tả lỗi/yêu cầu chi tiết",
      12000,
    ),
    assignedTo,
    createdBy: u.email,
    createdByName: u.name,
    createdAt: mobileWorkNow_(),
    createdDate: maintenanceToday_(),
    ngayDeNghiHoanThanh: requestedCompletion,
    status: "new",
    trangThaiPGDChatLuong: "",
    trangThaiPGDSanXuat: "",
    actualBy: "",
    actualByName: "",
    lastReportId: "",
    scheduleId: schedule?.id || "",
    completedDate: "",
    confirmedAt: "",
    confirmedBy: "",
    updatedAt: mobileWorkNow_(),
    revision: 1,
    requestKey: key,
  };
  mobileWorkWrite_("Requests", r);

  mobileWorkNotify_(
    "REQ_NEW_" + r.id,
    assignedTo,
    "Bạn được phân công: " + r.title,
    r.id,
  );
  return r;
}
function mobileWorkClaimRequest_(u, p) {
  mobileWorkRequireTechnical_(u);
  const r = mobileWorkRequest_(p.requestId);
  if (!["new", "in_progress", "rework"].includes(r.status))
    throw Error("Phiếu đang chờ xác nhận hoặc đã hoàn thành.");
  if (r.status === "in_progress" && r.actualBy === u.email) return r;
  mobileWorkCheckRevision_(r, p);
  r.status = "in_progress";
  r.actualBy = u.email;
  r.actualByName = u.name;
  r.updatedAt = mobileWorkNow_();
  r.revision = Number(r.revision) + 1;
  mobileWorkWrite_("Requests", r);

  return r;
}
function mobileWorkStartReport_(u, p) {
  mobileWorkRequireTechnical_(u);
  let r = mobileWorkRequest_(p.requestId);
  if (!["new", "in_progress", "rework"].includes(r.status))
    throw Error("Phiếu không còn ở trạng thái nhận báo cáo.");
  const key = mobileWorkRequired_(p.draftKey, "mã soạn báo cáo", 100),
    all = mobileWorkRows_("ServiceReports"),
    duplicate = all.find(
      (d) =>
        d.requestId === r.id && d.createdBy === u.email && d.draftKey === key,
    );
  if (duplicate) {
    if (
      duplicate.status === "draft" &&
      Number(duplicate.baseRevision) === Number(r.revision)
    )
      return mobileWorkRefreshExistingDraft_(duplicate, r);
    throw Error("Phiếu đã thay đổi. Hãy mở báo cáo mới.");
  }
  mobileWorkCheckRevision_(r, p);
  const own = all.find(
    (d) =>
      d.requestId === r.id &&
      d.createdBy === u.email &&
      d.status === "draft" &&
      Number(d.baseRevision) === Number(r.revision),
  );
  if (own) return mobileWorkRefreshExistingDraft_(own, r);
  if (r.status !== "in_progress")
    r = mobileWorkClaimRequest_(u, { requestId: r.id, revision: r.revision });
  const schedule = r.scheduleId
    ? mobileWorkRows_("Schedules").find((s) => s.id === r.scheduleId)
    : null;
  const d = {
    id: mobileWorkDocumentId_("BC"),
    requestId: r.id,
    ordinal:
      all
        .filter((d) => d.requestId === r.id)
        .reduce((n, d) => Math.max(n, Number(d.ordinal) || 0), 0) + 1,
    status: "draft",
    createdBy: u.email,
    createdByName: u.name,
    actualBy: u.email,
    actualByName: u.name,
    actualRole: u.position || u.role,
    content: "",
    noiDungCaiTien: "",
    yKienDongGop: "",
    performedDate: maintenanceToday_(),
    checks: "[]",
    photos: "[]",
    createdAt: mobileWorkNow_(),
    submittedAt: "",
    revision: 1,
    draftKey: key,
    submitKey: "",
    baseRevision: r.revision,
    scheduleId: r.scheduleId || "",
    scheduleRevision: schedule?.revision || "",
    scheduleDue: schedule?.dueDate || "",
    scheduleInterval: schedule?.interval || "",
    scheduleUnit: schedule?.unit || "",
    checklist: "[]",
    actualResults: "[]",
    criteriaVersion: "",
    criteriaSnapshot: "[]",
    submitFingerprint: "",
  };
  mobileWorkRefreshDraftCriteria_(d, r);
  mobileWorkWrite_("ServiceReports", d);
  return d;
}
function mobileWorkEditableReport_(u, p) {
  const current = mobileWorkReport_(p.reportId);
  if (mobileWorkV2_(mobileWorkRequest_(current.requestId))) return mobileWorkV2Editable_(u, p);
  mobileWorkRequireTechnical_(u);
  const d = mobileWorkReport_(p.reportId),
    r = mobileWorkRequest_(d.requestId);
  if (d.createdBy !== u.email)
    throw Error("Chỉ người đang soạn được sửa báo cáo này.");
  if (
    d.status !== "draft" ||
    r.status !== "in_progress" ||
    Number(d.baseRevision) !== Number(r.revision)
  )
    throw Error("Phiếu đã thay đổi. Hãy tải lại và mở báo cáo mới.");
  return { d, r };
}
function mobileWorkSaveReportDraft_(u, p) {
  const { d } = mobileWorkEditableReport_(u, p);
  mobileWorkCheckRevision_(d, p);
  d.content = mobileWorkText_(p.content, 12000);
  d.noiDungCaiTien = mobileWorkText_(p.noiDungCaiTien, 12000);
  d.yKienDongGop = mobileWorkText_(p.yKienDongGop, 12000);
  if (p.performedDate) {
    maintenanceDate_(p.performedDate);
    d.performedDate = p.performedDate;
  }
  d.checks = JSON.stringify(
    Array.isArray(p.checks) ? p.checks.map((x) => x === true) : [],
  );
  d.actualResults = JSON.stringify(
    Array.isArray(p.actualResults)
      ? p.actualResults.map((v) => mobileWorkText_(v, 2000))
      : [],
  );
  d.revision = Number(d.revision) + 1;
  mobileWorkWrite_("ServiceReports", d);
  return d;
}
function mobileWorkApplySubmission_(d) {
  const r = mobileWorkRequest_(d.requestId);
  if (r.lastReportId === d.id && r.status === "awaiting_confirmation") {
    mobileWorkNotifyShift_(r, d);
    return r;
  }
  if (
    r.status !== "in_progress" ||
    Number(r.revision) !== Number(d.baseRevision)
  )
    throw Error("Phiếu đã thay đổi trước khi gửi báo cáo.");
  r.status = "awaiting_confirmation";
  r.trangThaiPGDChatLuong = "";
  r.trangThaiPGDSanXuat = "";
  r.lastReportId = d.id;
  r.actualBy = d.actualBy;
  r.actualByName = d.actualByName;
  r.updatedAt = d.submittedAt;
  r.revision = Number(r.revision) + 1;
  mobileWorkWrite_("Requests", r);
  mobileWorkNotifyShift_(r, d);
  return r;
}
function mobileWorkSubmitReport_(u, p) {
  mobileWorkRequireTechnical_(u);
  let d = mobileWorkReport_(p.reportId);
  const key = mobileWorkRequired_(p.submitKey, "mã gửi báo cáo", 100),
    fingerprint = mobileWorkSubmissionFingerprint_(p);
  if (d.createdBy !== u.email) throw Error("Báo cáo này do người khác soạn.");
  if (d.status !== "draft") {
    if (d.submitKey === key) {
      if (d.submitFingerprint !== fingerprint)
        throw Error(
          "Báo cáo đã được gửi với nội dung khác. Tải lại để kiểm tra.",
        );
      if (d.status === "submitted") mobileWorkApplySubmission_(d);
      return d;
    }
    throw Error("Báo cáo đã gửi không được sửa lại.");
  }
  const editable = mobileWorkEditableReport_(u, p),
    r = editable.r;
  d = editable.d;
  mobileWorkCheckRevision_(d, p);
  const performed = mobileWorkRequired_(p.performedDate, "ngày thực hiện");
  maintenanceDate_(performed);
  if (
    performed > maintenanceToday_() ||
    performed < (r.createdDate || String(r.createdAt).slice(0, 10))
  )
    throw Error("Ngày thực hiện phải từ ngày tạo phiếu đến hôm nay.");
  mobileWorkValidateReportCriteria_(d, r, p);
  d.ordinal =
    mobileWorkRows_("ServiceReports")
      .filter(
        (x) => x.requestId === r.id && x.id !== d.id && x.status !== "draft",
      )
      .reduce((n, x) => Math.max(n, Number(x.ordinal) || 0), 0) + 1;
  d.content = mobileWorkRequired_(p.content, "nội dung báo cáo", 12000);
  d.noiDungCaiTien = mobileWorkText_(p.noiDungCaiTien, 12000);
  d.yKienDongGop = mobileWorkText_(p.yKienDongGop, 12000);
  d.performedDate = performed;
  d.checks = JSON.stringify(p.checks || []);
  d.actualResults = JSON.stringify(p.actualResults || []);
  d.submitFingerprint = fingerprint;
  d.actualBy = u.email;
  d.actualByName = u.name;
  d.actualRole = u.position || u.role;
  d.submittedAt = mobileWorkNow_();
  d.status = "submitted";
  d.submitKey = key;
  d.revision = Number(d.revision) + 1;
  mobileWorkWrite_("ServiceReports", d);
  mobileWorkApplySubmission_(d);

  return d;
}
function mobileWorkApplyReview_(review) {
  return mobileWorkApplyApprovalReview_(review);
}
function mobileWorkReviewReport_(u, p) {
  mobileWorkRequireAccess_(u);
  const r = mobileWorkRequest_(p.requestId);
  if (!mobileWorkCanConfirm_(u, r))
    throw Error("Chỉ trưởng ca được xác nhận kết quả trước khi trình hai PGĐ.");
  const key = mobileWorkRequired_(p.reviewKey, "mã xác nhận", 100),
    previous = mobileWorkRows_("ServiceReviews").find(
      (v) =>
        v.requestId === r.id && v.createdBy === u.email && v.reviewKey === key,
    );
  if (previous) {
    if (previous.reportId !== p.reportId || previous.decision !== p.decision)
      throw Error("Mã xác nhận đã được dùng cho kết quả khác.");
    if (String(previous.processed) !== "true") mobileWorkApplyReview_(previous);
    return previous;
  }
  if (r.status !== "awaiting_confirmation" || r.lastReportId !== p.reportId)
    throw Error("Phiếu không còn chờ xác nhận báo cáo này.");
  mobileWorkCheckRevision_(r, p);
  const d = mobileWorkReport_(p.reportId);
  if (d.requestId !== r.id || d.status !== "submitted")
    throw Error("Báo cáo chưa gửi hoặc đã được xác nhận.");
  if (!["accept", "reject"].includes(p.decision))
    throw Error("Kết quả xác nhận không hợp lệ.");
  const review = {
    id: mobileWorkDocumentId_("XN"),
    requestId: r.id,
    reportId: d.id,
    decision: p.decision,
    reason:
      p.decision === "reject"
        ? mobileWorkRequired_(p.reason, "lý do cần khắc phục lại", 8000)
        : mobileWorkText_(p.reason, 8000),
    createdBy: u.email,
    createdByName: u.name,
    createdAt: mobileWorkNow_(),
    reviewKey: key,
    processed: false,
    calendarResult: "",
  };
  mobileWorkWrite_("ServiceReviews", review);
  mobileWorkApplyReview_(review);

  return review;
}
function mobileWorkReconcile_() {
  mobileWorkMigrateOpen_();
  mobileWorkRows_("ServiceReports")
    .filter((d) => d.status === "submitted" && !mobileWorkV2_(mobileWorkRequest_(d.requestId)))
    .forEach((d) => {
      const r = mobileWorkRequest_(d.requestId);
      if (r.lastReportId === d.id && r.status === "awaiting_confirmation")
        mobileWorkApplySubmission_(d);
      else if (
        r.status === "in_progress" &&
        Number(r.revision) === Number(d.baseRevision)
      )
        mobileWorkApplySubmission_(d);
    });
  mobileWorkRows_("ServiceReviews")
    .filter((v) => String(v.processed) !== "true" && !mobileWorkV2_(mobileWorkRequest_(v.requestId)))
    .forEach(mobileWorkApplyReview_);
  mobileWorkV2Reconcile_();
}
function mobileWorkMarkNotification_(u, p) {
  const n = mobileWorkRows_("Notifications").find(
    (n) => n.id === p.id && n.kind === "app" && n.recipient === u.email,
  );
  if (!n) throw Error("Không tìm thấy thông báo.");
  n.status = "read";
  mobileWorkWrite_("Notifications", n);
  return { success: true };
}
function mobileWorkApi(token, action, payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    mobileWorkResetContext_();
    const u = mobileWorkIdentity_(token);
    mobileWorkRequireAccess_(u);
    if (action === "changePassword") {
      const result = mobileWorkChangePassword_(u, payload || {});
      logoutMobile(token);
      return result;
    }
    mobileWorkReconcile_();
    const actions = {
      snapshot: mobileWorkSnapshot_,
      printRequest: mobileWorkPrintRequest_,
      create: mobileWorkV2Create_,
      assign: mobileWorkV2Assign_,
      claim: mobileWorkClaimRequest_,
      startReport: mobileWorkStartReport_,
      saveDraft: mobileWorkSaveReportDraft_,
      uploadPhoto: mobileWorkUploadReportPhoto_,
      submitReport: mobileWorkSubmitReport_,
      review: mobileWorkReviewReport_,
      approve: mobileWorkApprovePgd_,
      photo: mobileWorkReadReportPhoto_,
      markRead: mobileWorkMarkNotification_,
    };
    if (!actions[action]) throw Error("Thao tác không hợp lệ.");
    const data = payload || {};
    const request = data.requestId ? mobileWorkRequest_(data.requestId) : data.reportId ? mobileWorkRequest_(mobileWorkReport_(data.reportId).requestId) : null;
    const v2Actions = {startReport:mobileWorkV2Start_,saveDraft:mobileWorkV2Save_,submitReport:mobileWorkV2Submit_,approve:mobileWorkV2Approve_,review:mobileWorkV2Review_};
    if (request && mobileWorkV2_(request) && action === "claim") throw Error("Phiếu cần được người phân công ban đầu chọn người thực hiện.");
    const result = (request && mobileWorkV2_(request) && v2Actions[action] || actions[action])(u, data);
    if (
      payload &&
      payload._withSnapshot === true &&
      [
        "create",
        "assign",
        "claim",
        "startReport",
        "submitReport",
        "review",
        "approve",
        "markRead",
      ].includes(action)
    )
      return { result, snapshot: mobileWorkSnapshot_(u) };
    return result;
  } finally {
    try {
      mobileWorkFlush_();
    } finally {
      lock.releaseLock();
    }
  }
}
