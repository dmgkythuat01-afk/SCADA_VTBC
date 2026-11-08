function equipmentWorkRole_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}
function mobileCapabilities_(user) {
  const role = equipmentWorkRole_(user.position || user.role);
  const admin = user.role === "admin" || role === "admin";
  return {
    admin,
    requester:
      admin || ["truongca", "congnhan", "phongcongnghe"].includes(role),
    technical:
      admin ||
      ["kythuat", "cokhi", "tudonghoa", "technician", "kythuatbaotri"].includes(
        role,
      ),
  };
}
function mobileRequireAccess_(u) {
  const caps = mobileCapabilities_(u);
  if (!caps.requester && !caps.technical)
    throw Error("Chức vụ này chưa được cấp quyền vào trang mobile.");
  return caps;
}
function mobileRequireTechnical_(u) {
  if (!mobileRequireAccess_(u).technical)
    throw Error("Chỉ tài khoản kỹ thuật được nhận và báo cáo công việc.");
}
function mobileCanView_(u, r) {
  const caps = mobileRequireAccess_(u);
  return caps.technical || r.createdBy === u.email;
}
function mobileRequest_(id) {
  const r = rows_("Requests").find((r) => r.id === id);
  if (!r) throw Error("Không tìm thấy phiếu yêu cầu.");
  return r;
}
function mobileReport_(id) {
  const r = rows_("ServiceReports").find((r) => r.id === id);
  if (!r) throw Error("Không tìm thấy báo cáo.");
  return r;
}
function mobileNotify_(id, recipient, message, requestId) {
  if (rows_("Notifications").some((n) => n.id === id)) return;
  write_("Notifications", {
    id,
    date: today_(),
    kind: "app",
    recipient,
    status: "unread",
    message,
    requestId,
    sentAt: now_(),
  });
}
function equipmentBaseUrl_() {
  return (
    (typeof ScriptApp !== "undefined" && ScriptApp.getService().getUrl()) ||
    "https://script.google.com/macros/s/AKfycbxySBhZ2vOCKpWAgPOj8IlsIRCnH0HjkPxbzPr6pF5VsHuyL_RTDmJQfh4dKjCeVfRvKg/exec"
  );
}
function equipmentMobileUrl_() {
  return equipmentBaseUrl_() + "?view=mobile";
}
function mobileSnapshot_(u) {
  const caps = mobileRequireAccess_(u),
    requests = rows_("Requests").filter((r) => mobileCanView_(u, r)),
    ids = new Set(requests.map((r) => r.id));
  return {
    user: u,
    capabilities: caps,
    today: today_(),
    assets: rows_("Assets"),
    schedules: rows_("Schedules").filter(enabled_),
    requests,
    reports: rows_("ServiceReports").filter(
      (r) =>
        ids.has(r.requestId) &&
        (r.status !== "draft" || r.createdBy === u.email || caps.admin),
    ),
    reviews: rows_("ServiceReviews").filter((r) => ids.has(r.requestId)),
    technicians: members_()
      .filter(
        (m) =>
          enabled_(m) &&
          mobileCapabilities_(m).technical &&
          !mobileCapabilities_(m).admin,
      )
      .map((m) => ({ useName: m.email, name: m.name, position: m.position })),
    notifications: rows_("Notifications")
      .filter((n) => n.kind === "app" && n.recipient === u.email)
      .slice(-100),
    desktopUrl: equipmentBaseUrl_(),
  };
}
function mobileCreateRequest_(u, p) {
  const caps = mobileRequireAccess_(u);
  if (!caps.requester) throw Error("Vai trò này không được tạo phiếu yêu cầu.");
  const key = required_(p.requestKey, "mã yêu cầu", 100),
    prior = rows_("Requests").find(
      (r) => r.createdBy === u.email && r.requestKey === key,
    );
  if (prior) return prior;
  const all = rows_("Assets"),
    workshop = all.find(
      (a) => a.id === p.workshopId && a.type === "workshop" && enabled_(a),
    ),
    machine = all.find(
      (a) => a.id === p.machineId && a.type === "machine" && enabled_(a),
    ),
    area =
      machine &&
      all.find(
        (a) => a.id === machine.parentId && a.type === "area" && enabled_(a),
      );
  if (!workshop || !machine || !area || area.parentId !== workshop.id)
    throw Error("Máy không thuộc xưởng đã chọn hoặc đã ngừng sử dụng.");
  const component = p.componentId
    ? all.find(
        (a) =>
          a.id === p.componentId &&
          a.type === "component" &&
          a.parentId === machine.id &&
          enabled_(a),
      )
    : null;
  if (p.componentId && !component)
    throw Error("Bộ phận không thuộc máy đã chọn.");
  if (!["repair", "maintenance"].includes(p.type))
    throw Error("Loại yêu cầu không hợp lệ.");
  const assignedTo = required_(
      p.assignedTo,
      "người được phân công",
      100,
    ).toLowerCase(),
    assignee = members_().find(
      (m) =>
        m.email === assignedTo &&
        enabled_(m) &&
        mobileCapabilities_(m).technical &&
        !mobileCapabilities_(m).admin,
    );
  if (!assignee)
    throw Error(
      "Người được phân công phải thuộc nhóm kỹ thuật đang hoạt động.",
    );
  let schedule = null;
  if (p.scheduleId) {
    schedule = rows_("Schedules").find(
      (s) =>
        s.id === p.scheduleId && s.componentId === component?.id && enabled_(s),
    );
    if (p.type !== "maintenance" || !schedule)
      throw Error("Lịch bảo dưỡng không phù hợp với bộ phận đã chọn.");
  }
  const r = {
    id: id_(),
    workshopId: workshop.id,
    workshopName: workshop.name || "",
    machineId: machine.id,
    machineName: machine.name || "",
    componentId: component?.id || "",
    componentName: component?.name || "",
    type: p.type,
    title:
      text_(p.title, 250) ||
      (p.type === "repair" ? "Sửa chữa — " : "Bảo dưỡng — ") +
        (component?.name || machine.name),
    description: required_(p.description, "mô tả lỗi/yêu cầu chi tiết", 12000),
    assignedTo,
    createdBy: u.email,
    createdByName: u.name,
    createdAt: now_(),
    createdDate: today_(),
    status: "new",
    actualBy: "",
    actualByName: "",
    lastReportId: "",
    scheduleId: schedule?.id || "",
    completedDate: "",
    confirmedAt: "",
    confirmedBy: "",
    updatedAt: now_(),
    revision: 1,
    requestKey: key,
  };
  write_("Requests", r);
  audit_(u, "mobileCreateRequest", r.id);
  mobileNotify_(
    "REQ_NEW_" + r.id,
    assignedTo,
    "Bạn được phân công: " + r.title,
    r.id,
  );
  return r;
}
function mobileClaimRequest_(u, p) {
  mobileRequireTechnical_(u);
  const r = mobileRequest_(p.requestId);
  if (!["new", "in_progress", "rework"].includes(r.status))
    throw Error("Phiếu đang chờ xác nhận hoặc đã hoàn thành.");
  if (r.status === "in_progress" && r.actualBy === u.email) return r;
  checkRevision_(r, p);
  r.status = "in_progress";
  r.actualBy = u.email;
  r.actualByName = u.name;
  r.updatedAt = now_();
  r.revision = Number(r.revision) + 1;
  write_("Requests", r);
  audit_(u, "mobileClaimRequest", r.id);
  return r;
}
function mobileStartReport_(u, p) {
  mobileRequireTechnical_(u);
  let r = mobileRequest_(p.requestId);
  if (!["new", "in_progress", "rework"].includes(r.status))
    throw Error("Phiếu không còn ở trạng thái nhận báo cáo.");
  const key = required_(p.draftKey, "mã soạn báo cáo", 100),
    all = rows_("ServiceReports"),
    duplicate = all.find(
      (d) =>
        d.requestId === r.id && d.createdBy === u.email && d.draftKey === key,
    );
  if (duplicate) {
    if (
      duplicate.status === "draft" &&
      Number(duplicate.baseRevision) === Number(r.revision)
    )
      return duplicate;
    throw Error("Phiếu đã thay đổi. Hãy mở báo cáo mới.");
  }
  checkRevision_(r, p);
  const own = all.find(
    (d) =>
      d.requestId === r.id &&
      d.createdBy === u.email &&
      d.status === "draft" &&
      Number(d.baseRevision) === Number(r.revision),
  );
  if (own) return own;
  if (r.status !== "in_progress")
    r = mobileClaimRequest_(u, { requestId: r.id, revision: r.revision });
  const schedule = r.scheduleId
    ? rows_("Schedules").find((s) => s.id === r.scheduleId)
    : null;
  const d = {
    id: id_(),
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
    performedDate: today_(),
    checks: "[]",
    photos: "[]",
    createdAt: now_(),
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
    checklist: schedule?.checklist || "[]",
  };
  write_("ServiceReports", d);
  return d;
}
function mobileEditableReport_(u, p) {
  mobileRequireTechnical_(u);
  const d = mobileReport_(p.reportId),
    r = mobileRequest_(d.requestId);
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
function mobileSaveReportDraft_(u, p) {
  const { d } = mobileEditableReport_(u, p);
  checkRevision_(d, p);
  d.content = text_(p.content, 12000);
  if (p.performedDate) {
    validDate_(p.performedDate);
    d.performedDate = p.performedDate;
  }
  d.checks = JSON.stringify(
    Array.isArray(p.checks) ? p.checks.map((x) => x === true) : [],
  );
  d.revision = Number(d.revision) + 1;
  write_("ServiceReports", d);
  return d;
}
function mobileApplySubmission_(d) {
  const r = mobileRequest_(d.requestId);
  if (r.lastReportId === d.id && r.status === "awaiting_confirmation") {
    mobileNotify_(
      "REQ_REPORT_" + d.id,
      r.createdBy,
      "Có kết quả chờ bạn xác nhận: " + r.title,
      r.id,
    );
    return r;
  }
  if (
    r.status !== "in_progress" ||
    Number(r.revision) !== Number(d.baseRevision)
  )
    throw Error("Phiếu đã thay đổi trước khi gửi báo cáo.");
  r.status = "awaiting_confirmation";
  r.lastReportId = d.id;
  r.actualBy = d.actualBy;
  r.actualByName = d.actualByName;
  r.updatedAt = d.submittedAt;
  r.revision = Number(r.revision) + 1;
  write_("Requests", r);
  mobileNotify_(
    "REQ_REPORT_" + d.id,
    r.createdBy,
    "Có kết quả chờ bạn xác nhận: " + r.title,
    r.id,
  );
  return r;
}
function mobileSubmitReport_(u, p) {
  mobileRequireTechnical_(u);
  let d = mobileReport_(p.reportId);
  const key = required_(p.submitKey, "mã gửi báo cáo", 100);
  if (d.createdBy !== u.email) throw Error("Báo cáo này do người khác soạn.");
  if (d.status !== "draft") {
    if (d.submitKey === key) {
      if (d.status === "submitted") mobileApplySubmission_(d);
      return d;
    }
    throw Error("Báo cáo đã gửi không được sửa lại.");
  }
  const editable = mobileEditableReport_(u, p),
    r = editable.r;
  d = editable.d;
  checkRevision_(d, p);
  const performed = required_(p.performedDate, "ngày thực hiện");
  validDate_(performed);
  if (
    performed > today_() ||
    performed < (r.createdDate || String(r.createdAt).slice(0, 10))
  )
    throw Error("Ngày thực hiện phải từ ngày tạo phiếu đến hôm nay.");
  const checks = parsed_(d.checklist, []);
  if (
    checks.length &&
    (!Array.isArray(p.checks) || checks.some((x, i) => p.checks[i] !== true))
  )
    throw Error("Cần xác nhận đầy đủ checklist bảo dưỡng.");
  d.ordinal =
    rows_("ServiceReports")
      .filter(
        (x) => x.requestId === r.id && x.id !== d.id && x.status !== "draft",
      )
      .reduce((n, x) => Math.max(n, Number(x.ordinal) || 0), 0) + 1;
  d.content = required_(p.content, "nội dung báo cáo", 12000);
  d.performedDate = performed;
  d.checks = JSON.stringify(p.checks || []);
  d.actualBy = u.email;
  d.actualByName = u.name;
  d.actualRole = u.position || u.role;
  d.submittedAt = now_();
  d.status = "submitted";
  d.submitKey = key;
  d.revision = Number(d.revision) + 1;
  write_("ServiceReports", d);
  mobileApplySubmission_(d);
  audit_(u, "mobileSubmitReport", d.id);
  return d;
}
function mobileCalendarAcceptance_(r, d) {
  if (!d.scheduleId) return "not_linked";
  const s = rows_("Schedules").find((s) => s.id === d.scheduleId);
  if (!s) return "skipped_missing";
  if (s.lastRequestId === r.id) return "applied";
  if (!enabled_(s) || Number(s.revision) !== Number(d.scheduleRevision))
    return "skipped_changed";
  s.dueDate = nextDue_(
    d.performedDate,
    Number(d.scheduleInterval),
    d.scheduleUnit,
  );
  s.lastRequestId = r.id;
  s.updatedAt = now_();
  s.revision = Number(s.revision) + 1;
  write_("Schedules", s);
  return "applied";
}
function mobileApplyReview_(review) {
  const r = mobileRequest_(review.requestId),
    d = mobileReport_(review.reportId);
  if (r.lastReportId !== d.id)
    throw Error("Báo cáo không còn là kết quả mới nhất của phiếu.");
  if (review.decision === "accept") {
    review.calendarResult = mobileCalendarAcceptance_(r, d);
    const jobId = "MOBILE_" + r.id;
    if (!rows_("Jobs").some((j) => j.id === jobId))
      write_("Jobs", {
        id: jobId,
        componentId: r.componentId || r.machineId,
        scheduleId: review.calendarResult === "applied" ? d.scheduleId : "",
        type: r.type,
        title: r.title,
        description: r.description,
        assignee: d.actualBy,
        status: "completed",
        openedAt: r.createdAt,
        openedBy: r.createdBy,
        completedDate: d.performedDate,
        completedAt: review.createdAt,
        completedBy: d.actualBy,
        result: JSON.stringify({
          text: d.content,
          checks: parsed_(d.checks, []),
        }),
        photos: d.photos || "[]",
        requestId: "MOBILE_ACCEPT_" + r.id,
        revision: 1,
        completionRequestId: review.id,
      });
  }
  const target = review.decision === "accept" ? "completed" : "rework";
  if (d.status !== (review.decision === "accept" ? "accepted" : "rejected")) {
    d.status = review.decision === "accept" ? "accepted" : "rejected";
    d.revision = Number(d.revision) + 1;
    write_("ServiceReports", d);
  }
  if (r.status !== target) {
    if (r.status !== "awaiting_confirmation")
      throw Error("Trạng thái phiếu đã thay đổi khi xác nhận.");
    r.status = target;
    r.actualBy = d.actualBy;
    r.actualByName = d.actualByName;
    r.completedDate = review.decision === "accept" ? d.performedDate : "";
    r.confirmedAt = review.createdAt;
    r.confirmedBy = review.createdBy;
    r.updatedAt = review.createdAt;
    r.revision = Number(r.revision) + 1;
    write_("Requests", r);
  }
  mobileNotify_(
    "REQ_REVIEW_" + review.id,
    d.actualBy,
    review.decision === "accept"
      ? "Người yêu cầu đã đồng ý kết quả: " + r.title
      : "Cần khắc phục lại: " + r.title + " — " + review.reason,
    r.id,
  );
  review.processed = true;
  write_("ServiceReviews", review);
  return review;
}
function mobileReviewReport_(u, p) {
  mobileRequireAccess_(u);
  const r = mobileRequest_(p.requestId);
  if (r.createdBy !== u.email)
    throw Error("Chỉ người tạo phiếu được xác nhận kết quả.");
  const key = required_(p.reviewKey, "mã xác nhận", 100),
    previous = rows_("ServiceReviews").find(
      (v) =>
        v.requestId === r.id && v.createdBy === u.email && v.reviewKey === key,
    );
  if (previous) {
    if (previous.reportId !== p.reportId || previous.decision !== p.decision)
      throw Error("Mã xác nhận đã được dùng cho kết quả khác.");
    if (String(previous.processed) !== "true") mobileApplyReview_(previous);
    return previous;
  }
  if (r.status !== "awaiting_confirmation" || r.lastReportId !== p.reportId)
    throw Error("Phiếu không còn chờ xác nhận báo cáo này.");
  checkRevision_(r, p);
  const d = mobileReport_(p.reportId);
  if (d.requestId !== r.id || d.status !== "submitted")
    throw Error("Báo cáo chưa gửi hoặc đã được xác nhận.");
  if (!["accept", "reject"].includes(p.decision))
    throw Error("Kết quả xác nhận không hợp lệ.");
  const review = {
    id: id_(),
    requestId: r.id,
    reportId: d.id,
    decision: p.decision,
    reason:
      p.decision === "reject"
        ? required_(p.reason, "lý do cần khắc phục lại", 8000)
        : text_(p.reason, 8000),
    createdBy: u.email,
    createdByName: u.name,
    createdAt: now_(),
    reviewKey: key,
    processed: false,
    calendarResult: "",
  };
  write_("ServiceReviews", review);
  mobileApplyReview_(review);
  audit_(u, "mobileReviewReport", review.id);
  return review;
}
function reconcileMobileRequests_() {
  rows_("ServiceReports")
    .filter((d) => d.status === "submitted")
    .forEach((d) => {
      const r = mobileRequest_(d.requestId);
      if (
        r.status === "in_progress" &&
        Number(r.revision) === Number(d.baseRevision)
      )
        mobileApplySubmission_(d);
    });
  rows_("ServiceReviews")
    .filter((v) => String(v.processed) !== "true")
    .forEach(mobileApplyReview_);
}
function mobileMarkNotification_(u, p) {
  const n = rows_("Notifications").find(
    (n) => n.id === p.id && n.kind === "app" && n.recipient === u.email,
  );
  if (!n) throw Error("Không tìm thấy thông báo.");
  n.status = "read";
  write_("Notifications", n);
  return { success: true };
}
function mobileApi(token, action, payload) {
  const u = identity_(token);
  mobileRequireAccess_(u);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    reconcileMobileRequests_();
    const actions = {
      snapshot: mobileSnapshot_,
      create: mobileCreateRequest_,
      claim: mobileClaimRequest_,
      startReport: mobileStartReport_,
      saveDraft: mobileSaveReportDraft_,
      uploadPhoto: mobileUploadReportPhoto_,
      submitReport: mobileSubmitReport_,
      review: mobileReviewReport_,
      photo: mobileReadReportPhoto_,
      markRead: mobileMarkNotification_,
    };
    if (!actions[action]) throw Error("Thao tác không hợp lệ.");
    return actions[action](u, payload || {});
  } finally {
    lock.releaseLock();
  }
}
