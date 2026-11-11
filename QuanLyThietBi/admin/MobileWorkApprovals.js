const MOBILE_PGD_FIELDS = {
  quality: "trangThaiPGDChatLuong",
  production: "trangThaiPGDSanXuat",
};
const MOBILE_PGD_PENDING = "Chờ phê duyệt",
  MOBILE_PGD_ACCEPTED = "Đã phê duyệt",
  MOBILE_PGD_REJECTED = "Không phê duyệt";
function mobileWorkPgdBranch_(user) {
  return (
    { pgdchatluong: "quality", pgdsanxuat: "production" }[
      mobileWorkRole_(user.position)
    ] || ""
  );
}
function mobileWorkCanConfirm_(user, request) {
  return mobileWorkCapabilities_(user).shiftLeader;
}
function mobileWorkNotifyRole_(role, id, message, requestId) {
  mobileWorkMembers_()
    .filter((m) => m.active && mobileWorkRole_(m.position) === role)
    .forEach((m) =>
      mobileWorkNotify_(
        id + "_" + adminHash_(m.email).slice(0, 16),
        m.email,
        message,
        requestId,
      ),
    );
}
function mobileWorkNotifyShift_(request, report) {
  mobileWorkNotifyRole_(
    "truongca",
    "REQ_SHIFT_" + report.id,
    "Trưởng ca kiểm tra kết quả: " + request.title,
    request.id,
  );
  mobileWorkNotify_(
    "REQ_REPORT_" + report.id,
    request.createdBy,
    "Kỹ thuật đã báo cáo, đang chờ trưởng ca xác nhận: " + request.title,
    request.id,
  );
}
function mobileWorkNotifyPgd_(request, report) {
  [
    ["quality", "pgdchatluong"],
    ["production", "pgdsanxuat"],
  ].forEach(([branch, role]) => {
    if (request[MOBILE_PGD_FIELDS[branch]] === MOBILE_PGD_PENDING)
      mobileWorkNotifyRole_(
        role,
        "REQ_PGD_" + branch + "_" + report.id,
        "Chờ PGĐ phê duyệt: " + request.title,
        request.id,
      );
  });
}
function mobileWorkPgdApproved_(request) {
  return Object.values(MOBILE_PGD_FIELDS).every(
    (field) => request[field] === MOBILE_PGD_ACCEPTED,
  );
}
function mobileWorkApplyApprovalReview_(review) {
  const r = mobileWorkRequest_(review.requestId),
    d = mobileWorkReport_(review.reportId),
    match = /^(quality|production)_(accept|reject)$/.exec(review.decision),
    branch = match?.[1] || "",
    decision = match?.[2] || review.decision;
  if (r.lastReportId !== d.id)
    throw Error("Báo cáo không còn là kết quả mới nhất của phiếu.");
  if (!["accept", "reject"].includes(decision))
    throw Error("Quyết định phê duyệt không hợp lệ.");
  if (!branch) {
    const target = decision === "accept" ? "awaiting_pgd" : "rework";
    if (!["awaiting_confirmation", target].includes(r.status))
      throw Error("Phiếu không còn chờ trưởng ca xác nhận.");
    if (r.status === "awaiting_confirmation") {
      r.status = target;
      r.confirmedAt = review.createdAt;
      r.confirmedBy = review.createdBy;
      r.updatedAt = review.createdAt;
      r.completedDate = "";
      r.revision = Number(r.revision) + 1;
      Object.values(MOBILE_PGD_FIELDS).forEach(
        (field) => (r[field] = decision === "accept" ? MOBILE_PGD_PENDING : ""),
      );
      mobileWorkWrite_("Requests", r);
    }
    const status = decision === "accept" ? "shift_confirmed" : "rejected";
    if (d.status !== status) {
      d.status = status;
      d.revision = Number(d.revision) + 1;
      mobileWorkWrite_("ServiceReports", d);
    }
    review.calendarResult = decision === "accept" ? "awaiting_pgd" : "rework";
    if (decision === "accept") mobileWorkNotifyPgd_(r, d);
  } else {
    const field = MOBILE_PGD_FIELDS[branch],
      value = decision === "accept" ? MOBILE_PGD_ACCEPTED : MOBILE_PGD_REJECTED;
    if (
      ![
        "awaiting_pgd",
        decision === "accept" ? "completed" : "rework",
      ].includes(r.status)
    )
      throw Error("Phiếu không còn chờ phê duyệt PGĐ.");
    if (r[field] !== value) {
      if (r.status !== "awaiting_pgd" || r[field] !== MOBILE_PGD_PENDING)
        throw Error("Nhánh PGĐ đã được phê duyệt hoặc từ chối.");
      r[field] = value;
      r.updatedAt = review.createdAt;
      r.revision = Number(r.revision) + 1;
      mobileWorkWrite_("Requests", r);
    }
    if (decision === "reject") {
      if (d.status !== "rejected") {
        d.status = "rejected";
        d.revision = Number(d.revision) + 1;
        mobileWorkWrite_("ServiceReports", d);
      }
      if (r.status !== "rework") {
        r.status = "rework";
        r.completedDate = "";
        r.updatedAt = review.createdAt;
        r.revision = Number(r.revision) + 1;
        mobileWorkWrite_("Requests", r);
      }
      review.calendarResult = "rework";
    } else if (mobileWorkPgdApproved_(r)) {
      mobileWorkAppendAdminHistory_(r, d, review);
      if (d.status !== "accepted") {
        d.status = "accepted";
        d.revision = Number(d.revision) + 1;
        mobileWorkWrite_("ServiceReports", d);
      }
      if (r.status !== "completed") {
        r.status = "completed";
        r.completedDate = d.performedDate;
        r.updatedAt = review.createdAt;
        r.revision = Number(r.revision) + 1;
        mobileWorkWrite_("Requests", r);
      }
      review.calendarResult = r.componentId ? "history_saved" : "machine_only";
    } else review.calendarResult = "awaiting_pgd";
  }
  const actor =
      branch === "quality"
        ? "PGĐ Chất lượng"
        : branch === "production"
          ? "PGĐ Sản xuất"
          : "Trưởng ca",
    message =
      decision === "reject"
        ? actor + " yêu cầu khắc phục lại: " + r.title + " — " + review.reason
        : r.status === "completed"
          ? "Đủ hai phê duyệt PGĐ, đã hoàn thành: " + r.title
          : actor + " đã đồng ý: " + r.title;
  [
    ...new Set([d.actualBy, r.createdBy, r.confirmedBy].filter(Boolean)),
  ].forEach((recipient) =>
    mobileWorkNotify_(
      "REQ_REVIEW_" + review.id + "_" + adminHash_(recipient).slice(0, 16),
      recipient,
      message,
      r.id,
    ),
  );
  if (branch && decision === "reject") {
    mobileWorkNotifyRole_(
      "pgdchatluong",
      "REQ_REJECT_Q_" + review.id,
      message,
      r.id,
    );
    mobileWorkNotifyRole_(
      "pgdsanxuat",
      "REQ_REJECT_P_" + review.id,
      message,
      r.id,
    );
  }
  review.processed = true;
  mobileWorkWrite_("ServiceReviews", review);
  return review;
}
function mobileWorkApprovePgd_(user, p) {
  const branch = mobileWorkPgdBranch_(user);
  if (!branch)
    throw Error("Bạn không có quyền ký nhánh PGĐ Chất lượng/Sản xuất.");
  if (!["accept", "reject"].includes(p.decision))
    throw Error("Quyết định phê duyệt không hợp lệ.");
  const r = mobileWorkRequest_(p.requestId),
    key = mobileWorkRequired_(p.reviewKey, "mã phê duyệt", 100),
    decision = branch + "_" + p.decision,
    reason =
      p.decision === "reject"
        ? mobileWorkRequired_(p.reason, "lý do không phê duyệt", 8000)
        : mobileWorkText_(p.reason, 8000),
    prior = mobileWorkRows_("ServiceReviews").find(
      (v) =>
        v.requestId === r.id &&
        v.createdBy === user.email &&
        v.reviewKey === key,
    );
  if (prior) {
    if (
      prior.reportId !== p.reportId ||
      prior.decision !== decision ||
      prior.reason !== reason
    )
      throw Error("Mã phê duyệt đã được dùng cho nội dung khác.");
    if (String(prior.processed) !== "true")
      mobileWorkApplyApprovalReview_(prior);
    return prior;
  }
  if (r.status !== "awaiting_pgd")
    throw Error(
      "Phiếu chưa được trưởng ca xác nhận hoặc không còn chờ phê duyệt PGĐ.",
    );
  if (r.lastReportId !== p.reportId)
    throw Error("Báo cáo đã thay đổi, hãy tải lại trước khi phê duyệt.");
  if (r[MOBILE_PGD_FIELDS[branch]] !== MOBILE_PGD_PENDING)
    throw Error("Nhánh PGĐ này đã được phê duyệt hoặc từ chối.");
  const d = mobileWorkReport_(p.reportId);
  if (d.requestId !== r.id || d.status !== "shift_confirmed")
    throw Error("Báo cáo chưa được trưởng ca xác nhận.");
  // Deliberately independent of the shared request revision: both branches may
  // sign the same report from screens opened before either signature.
  const review = {
    id: mobileWorkDocumentId_(branch === "quality" ? "PDCL" : "PDSX"),
    requestId: r.id,
    reportId: d.id,
    decision,
    reason,
    createdBy: user.email,
    createdByName: user.name,
    createdAt: mobileWorkNow_(),
    reviewKey: key,
    processed: false,
    calendarResult: "",
  };
  mobileWorkWrite_("ServiceReviews", review);
  return mobileWorkApplyApprovalReview_(review);
}
function mobileWorkAddPgdColumns_() {
  const ss = SpreadsheetApp.openById(ADMIN_SHEET_ID),
    before = ss
      .getSheets()
      .map((sheet) => ({
        name: sheet.getName(),
        rows: sheet.getLastRow(),
        width: sheet.getLastColumn(),
        digest: adminHash_(JSON.stringify(sheet.getDataRange().getValues())),
      })),
    sheet = ss.getSheetByName("PhieuYeuCau");
  if (!sheet) throw Error("Không tìm thấy PhieuYeuCau.");
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map((v) => String(v).trim());
  Object.values(MOBILE_PGD_FIELDS).forEach((field) => {
    if (headers.filter((h) => h === field).length > 1)
      throw Error("Trùng cột " + field);
    if (!headers.includes(field)) {
      headers.push(field);
      if (headers.length > sheet.getMaxColumns())
        sheet.insertColumnsAfter(
          sheet.getMaxColumns(),
          headers.length - sheet.getMaxColumns(),
        );
      sheet
        .getRange(1, headers.length)
        .setValue(field)
        .setFontWeight("bold")
        .setBackground("#e0efdf");
    }
  });
  SpreadsheetApp.flush();
  const checks = before.map((item) => {
    const s = ss.getSheetByName(item.name),
      values =
        item.rows && item.width
          ? s.getRange(1, 1, item.rows, item.width).getValues()
          : s.getDataRange().getValues(),
      preserved =
        s.getLastRow() === item.rows &&
        adminHash_(JSON.stringify(values)) === item.digest;
    if (!preserved) throw Error("Dữ liệu đã thay đổi đồng thời ở " + item.name);
    return { sheet: item.name, preserved };
  });
  return {
    success: true,
    columns: Object.values(MOBILE_PGD_FIELDS),
    checks,
    noAccountsChanged: true,
    noEmailSent: true,
  };
}
