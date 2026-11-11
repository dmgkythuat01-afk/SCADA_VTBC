// A print projection only: never expose account passwords or change photo sharing.
function mobileWorkPrintRequest_(u, p) {
  const r = mobileWorkRequest_(p.requestId);
  if (!mobileWorkCanView_(u, r)) throw Error("Bạn không được xem phiếu này.");
  const caps = mobileWorkCapabilities_(u);
  const reports = mobileWorkRows_("ServiceReports").filter(d =>
    d.requestId === r.id && (!mobileWorkDraft_(d) || d.createdBy === u.email || caps.admin) && (p.reportId || !mobileWorkV2_(r) || String(d.draftKey || "").startsWith("v2|")));
  const d = p.reportId
    ? reports.find(d => d.id === p.reportId)
    : reports.find(d => d.id === r.lastReportId) || reports.filter(d => !mobileWorkDraft_(d)).sort((a,b) => Number(b.ordinal)-Number(a.ordinal))[0] || null;
  if (p.reportId && !d) throw Error("Không được xem báo cáo này.");
  const values = mobileWorkGrid_("TaiKhoan").values;
  const headers = (values[0] || []).map(x => String(x).trim());
  const profile = (username, fallback) => {
    const row = values.slice(1).find(row => String(row[headers.indexOf("tenDangNhap")] || "").trim().toLowerCase() === String(username || "").trim().toLowerCase());
    const get = key => row && headers.includes(key) ? String(row[headers.indexOf(key)] || "") : "";
    return { name: get("hoTen") || fallback || username || "", position: get("chucVuTrongCongTy"), production: get("phongSanXuat"), department: get("phongBan") };
  };
  const reviews = d ? mobileWorkRows_("ServiceReviews").filter(v => v.requestId === r.id && v.reportId === d.id && String(v.processed) === "true") : [];
  const signature = decision => {
    const v = reviews.filter(v => v.decision === decision).slice(-1)[0];
    return v ? { name: v.createdByName || v.createdBy, time: v.createdAt } : null;
  };
  const submitted = d && d.status !== "draft" && !!d.submittedAt;
  const v2 = d && String(d.draftKey || "").startsWith("v2|");
  const handover = v2 && mobileWorkV2Stage_(d) === "handover";
  const plan = v2 ? handover ? mobileWorkV2Parent_(d) : d : null;
  const v2Signature = (decision, reportId) => {
    const v = mobileWorkRows_("ServiceReviews").filter(v => v.requestId === r.id && v.reportId === reportId && v.decision === decision && String(v.processed) === "true").slice(-1)[0];
    return v ? {name:v.createdByName || v.createdBy,time:v.createdAt} : null;
  };
  return {
    request: { id:r.id, type:r.type, status:r.status, createdAt:r.createdAt, deadline:r.ngayDeNghiHoanThanh || "", description:r.description || "", workshop:r.workshopName || "", machine:r.machineName || "", device:r.deviceName || r.componentName || "" },
    creator: profile(r.createdBy, r.createdByName), assignee: profile(mobileWorkV2_(r) && r.actualBy ? r.actualBy : r.assignedTo),
    report: d ? { id:d.id, ordinal:d.ordinal, status:d.status, content:d.content || "", improvement:d.noiDungCaiTien || "", feedback:d.yKienDongGop || "" } : null,
    signatures: {
      receiving: (v2 ? handover && ["v2_handover_submitted","v2_handover_accepted"].includes(d.status) : submitted) ? { name:d.actualByName || d.actualBy, time:d.createdAt } : null,
      handover: v2 ? v2Signature("v2_handover_accept",d.id) : signature("accept"),
      safety: v2 ? plan.status === "v2_plan_approved" ? v2Signature("v2_quality_accept",plan.id) : null : signature("quality_accept"),
      director: v2 ? plan.status === "v2_plan_approved" ? v2Signature("v2_production_accept",plan.id) : null : signature("production_accept"),
    },
    photos: d ? mobileWorkParse_(d.photos, []).map(photo => ({ id:photo.id, name:photo.name || "Ảnh minh họa", url:mobileWorkUrl_() + "?requestId=" + encodeURIComponent(r.id) + "&reportId=" + encodeURIComponent(d.id) + "&photoId=" + encodeURIComponent(photo.id) })) : [],
  };
}
