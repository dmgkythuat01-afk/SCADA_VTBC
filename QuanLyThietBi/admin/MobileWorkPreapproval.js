// V2 uses existing columns. The idempotency key prefix persists the workflow
// version after completion; legacy completed records are never migrated.
function mobileWorkV2_(r) {
  return String(r.requestKey || "").startsWith("v2|") || String(r.status).startsWith("v2_");
}
function mobileWorkDraft_(d) {
  return ["draft", "v2_plan_draft", "v2_handover_draft"].includes(d.status);
}
function mobileWorkV2Stage_(d) {
  return String(d.draftKey || "").split("|")[1] || "";
}
function mobileWorkV2Parent_(d) {
  const id = String(d.draftKey || "").split("|")[2];
  const plan = mobileWorkReport_(id);
  if (plan.requestId !== d.requestId || mobileWorkV2Stage_(plan) !== "plan")
    throw Error("Không xác định được biện pháp đã phê duyệt.");
  return plan;
}
function mobileWorkMigrationWrite_(r) {
  const grid=mobileWorkGrid_("PhieuYeuCau"),{map}=mobileWorkHeaders_("Requests",grid.sheet,grid.values[0]);
  if(!r._row || !grid.values[r._row-1])throw Error("Không xác định được dòng phiếu cần chuyển.");
  // Preserve raw Date cells, formulas and extra columns, not just mapped text.
  const cells=grid.values[r._row-1].slice(),fields=["requestKey","status","actualBy","actualByName","lastReportId","confirmedAt","confirmedBy","completedDate","trangThaiPGDChatLuong","trangThaiPGDSanXuat","revision","updatedAt"],changed=new Set(fields.map(k=>map[k]));
  const range=grid.sheet.getRange(r._row,1,1,cells.length),formulas=range.getFormulas()[0];
  formulas.forEach((formula,i)=>{if(formula && !changed.has(i))cells[i]=formula;});
  fields.forEach(k=>{cells[map[k]]=String(r[k] ?? "");});
  range.setValues([cells]);
  grid.values[r._row-1]=cells;
  const context=mobileWorkGetContext_();context.dirty=true;
  if(context.rows.has("Requests")){const rows=context.rows.get("Requests"),i=rows.findIndex(x=>x.id===r.id);if(i>=0)rows[i]=JSON.parse(JSON.stringify(r));}
}
function mobileWorkMigrateOpen_() {
  let changed = 0;
  mobileWorkRows_("Requests").forEach(r => {
    if (r.status === "completed" || mobileWorkV2_(r)) return;
    r.requestKey = "v2|" + (r.requestKey || r.id);
    r.status = "v2_assignment";
    r.actualBy = ""; r.actualByName = ""; r.lastReportId = "";
    r.confirmedAt = ""; r.confirmedBy = ""; r.completedDate = "";
    r.trangThaiPGDChatLuong = ""; r.trangThaiPGDSanXuat = "";
    r.revision = Number(r.revision || 0) + 1; r.updatedAt = mobileWorkNow_();
    mobileWorkMigrationWrite_(r); changed++;
  });
  // Replayed each operation so a failed notification write can recover.
  mobileWorkRows_("Requests").filter(r => r.status === "v2_assignment").forEach(r => {
    mobileWorkNotify_("V2_ASSIGN_" + r.id, r.assignedTo, "Phân công người thực hiện: " + r.title, r.id);
  });
  return { changed };
}
function mobileWorkV2Create_(u, p) {
  const key = mobileWorkRequired_(p.requestKey, "mã yêu cầu", 100);
  const old = mobileWorkRows_("Requests").find(r => r.createdBy === u.email && [key, "v2|" + key].includes(r.requestKey));
  if (old) return old;
  if (!["repair", "new_work"].includes(p.type)) throw Error("Chỉ tạo phiếu Sửa chữa hoặc Làm mới.");
  const r = mobileWorkCreateRequest_(u, p);
  r.requestKey = "v2|" + r.requestKey; r.status = "v2_assignment";
  mobileWorkWrite_("Requests", r);
  return r;
}
function mobileWorkV2Worker_(u, r) {
  if (r.actualBy !== u.email) throw Error("Chỉ người được phân công thực hiện được thao tác phiếu này.");
  mobileWorkRequireTechnical_(u);
}
function mobileWorkV2Prior_(u, p, decision, reportId, reason, keyName) {
  const key = mobileWorkRequired_(p[keyName || "reviewKey"], "mã thao tác", 100);
  const prior = mobileWorkRows_("ServiceReviews").find(v => v.requestId === p.requestId && v.createdBy === u.email && v.reviewKey === key);
  if (prior && (prior.decision !== decision || prior.reportId !== reportId || prior.reason !== reason))
    throw Error("Mã thao tác đã được sử dụng cho nội dung khác.");
  return { key, prior };
}
function mobileWorkV2Event_(u, r, reportId, decision, reason, key) {
  const prefix=decision === "v2_assign" ? "PC" : decision.startsWith("v2_quality_") ? "PDCL" : decision.startsWith("v2_production_") ? "PDSX" : "XN";
  const v = {id:mobileWorkDocumentId_(prefix), requestId:r.id, reportId, decision, reason, createdBy:u.email,
    createdByName:u.name, createdAt:mobileWorkNow_(), reviewKey:key, processed:false, calendarResult:""};
  mobileWorkWrite_("ServiceReviews", v);
  return mobileWorkV2Apply_(v);
}
function mobileWorkV2Assign_(u, p) {
  const r = mobileWorkRequest_(p.requestId), worker = mobileWorkRequired_(p.worker, "người thực hiện", 100).toLowerCase();
  if (u.email !== r.assignedTo) throw Error("Chỉ người được phân công ban đầu được phân công thực hiện.");
  const {key, prior} = mobileWorkV2Prior_(u,p,"v2_assign","",worker,"operationKey");
  if (prior) return prior;
  if (r.status !== "v2_assignment") throw Error("Phiếu không còn chờ phân công.");
  mobileWorkCheckRevision_(r,p);
  const member = mobileWorkMembers_().find(m => m.email === worker && mobileWorkEnabled_(m) && mobileWorkCapabilities_(m).technical && !mobileWorkCapabilities_(m).admin);
  if (!member) throw Error("Người thực hiện phải là tài khoản kỹ thuật đang hoạt động.");
  return mobileWorkV2Event_(u,r,"","v2_assign",worker,key);
}
function mobileWorkV2Start_(u, p) {
  const r = mobileWorkRequest_(p.requestId); mobileWorkV2Worker_(u,r);
  if (!["v2_plan", "v2_ready"].includes(r.status)) throw Error("Phiếu đang chờ phân công/phê duyệt hoặc đã gửi bàn giao.");
  mobileWorkCheckRevision_(r,p);
  const stage = r.status === "v2_plan" ? "plan" : "handover";
  const all = mobileWorkRows_("ServiceReports"), key = mobileWorkRequired_(p.draftKey,"mã soạn báo cáo",100);
  const existing = all.find(d => d.requestId === r.id && d.createdBy === u.email && mobileWorkDraft_(d) && Number(d.baseRevision) === Number(r.revision) && mobileWorkV2Stage_(d) === stage);
  if (existing) return existing;
  let source = stage === "handover" ? mobileWorkReport_(r.lastReportId) : all.filter(d => d.requestId === r.id).sort((a,b)=>Number(b.ordinal)-Number(a.ordinal))[0];
  if (stage === "handover" && (source.status !== "v2_plan_approved" || !mobileWorkPgdApproved_(r))) throw Error("Chưa đủ hai phê duyệt biện pháp.");
  const d = {id:mobileWorkDocumentId_(stage === "plan" ? "BP" : "BG"),requestId:r.id,ordinal:all.filter(d=>d.requestId===r.id).reduce((n,d)=>Math.max(n,Number(d.ordinal)||0),0)+1,
    status:"v2_"+stage+"_draft",createdBy:u.email,createdByName:u.name,actualBy:u.email,actualByName:u.name,actualRole:u.position || u.role,
    content:source?.content || "",noiDungCaiTien:source?.noiDungCaiTien || "",yKienDongGop:"",performedDate:stage === "handover"?maintenanceToday_():"",
    checks:"[]",photos:"[]",createdAt:mobileWorkNow_(),submittedAt:"",revision:1,
    draftKey:"v2|"+stage+"|"+(stage === "handover"?source.id+"|":"")+key,submitKey:"",baseRevision:r.revision,
    scheduleId:r.scheduleId || "",scheduleRevision:"",scheduleDue:"",scheduleInterval:"",scheduleUnit:"",checklist:"[]",actualResults:"[]",criteriaVersion:"",criteriaSnapshot:"[]",submitFingerprint:""};
  mobileWorkWrite_("ServiceReports",d); return d;
}
function mobileWorkV2Editable_(u,p) {
  const d=mobileWorkReport_(p.reportId),r=mobileWorkRequest_(d.requestId); mobileWorkV2Worker_(u,r);
  const stage=mobileWorkV2Stage_(d);
  if (d.createdBy !== u.email || !mobileWorkDraft_(d) || Number(d.baseRevision)!==Number(r.revision) || r.status !== (stage === "plan"?"v2_plan":"v2_ready"))
    throw Error("Phiếu/bản nháp đã thay đổi. Hãy tải lại.");
  return {d,r,stage};
}
function mobileWorkV2Save_(u,p) {
  const {d,r,stage}=mobileWorkV2Editable_(u,p); mobileWorkCheckRevision_(d,p);
  if (stage === "plan") {
    d.content=mobileWorkText_(p.content,12000);d.noiDungCaiTien=mobileWorkText_(p.noiDungCaiTien,12000);
  } else {
    const plan=mobileWorkV2Parent_(d);
    if (plan.status!=="v2_plan_approved" || !mobileWorkPgdApproved_(r)) throw Error("Biện pháp chưa được phê duyệt.");
    if ((p.content && p.content!==plan.content) || (p.noiDungCaiTien && p.noiDungCaiTien!==plan.noiDungCaiTien)) throw Error("Không được sửa biện pháp đã phê duyệt khi bàn giao.");
    d.content=plan.content;d.noiDungCaiTien=plan.noiDungCaiTien;
    d.yKienDongGop=mobileWorkText_(p.yKienDongGop,12000);
    if (p.performedDate) {maintenanceDate_(p.performedDate);d.performedDate=p.performedDate;}
  }
  d.revision=Number(d.revision)+1;mobileWorkWrite_("ServiceReports",d);return d;
}
function mobileWorkV2Submit_(u,p) {
  let d=mobileWorkReport_(p.reportId); const r=mobileWorkRequest_(d.requestId);mobileWorkV2Worker_(u,r);
  const key=mobileWorkRequired_(p.submitKey,"mã gửi phiếu",100), fingerprint=adminHash_(JSON.stringify([p.content || "",p.noiDungCaiTien || "",p.yKienDongGop || "",p.performedDate || ""]));
  if (!mobileWorkDraft_(d)) {
    if (d.createdBy!==u.email || d.submitKey!==key || d.submitFingerprint!==fingerprint) throw Error("Bản gửi đã khóa hoặc nội dung gửi lại khác trước.");
    return d;
  }
  const stage=mobileWorkV2Stage_(d);
  mobileWorkV2Editable_(u,p);mobileWorkCheckRevision_(d,p);
  if (stage==="plan") mobileWorkRequired_(p.content,"biện pháp thi công",12000);
  else {
    if (!mobileWorkParse_(d.photos,[]).length) throw Error("Bàn giao phải có ít nhất một ảnh thi công.");
    const day=mobileWorkRequired_(p.performedDate,"ngày thực hiện",10);maintenanceDate_(day);
    if (day<r.createdDate || day>maintenanceToday_()) throw Error("Ngày thực hiện phải từ ngày tạo phiếu đến hôm nay.");
  }
  d=mobileWorkV2Save_(u,p);
  d.status="v2_"+stage+"_submitted";d.submitKey=key;d.submitFingerprint=fingerprint;d.submittedAt=mobileWorkNow_();d.revision=Number(d.revision)+1;
  mobileWorkWrite_("ServiceReports",d);mobileWorkV2ApplySubmission_(d);return d;
}
function mobileWorkV2ApplySubmission_(d) {
  const r=mobileWorkRequest_(d.requestId),stage=mobileWorkV2Stage_(d),target=stage==="plan"?"v2_pgd":"v2_confirmation";
  if (r.lastReportId!==d.id || r.status!==target) {
    if (r.status!==(stage==="plan"?"v2_plan":"v2_ready") || Number(r.revision)!==Number(d.baseRevision)) throw Error("Phiếu đã thay đổi trước khi gửi.");
    r.lastReportId=d.id;r.status=target;r.updatedAt=d.submittedAt;r.revision=Number(r.revision)+1;
    if(stage==="plan") {r.trangThaiPGDChatLuong=MOBILE_PGD_PENDING;r.trangThaiPGDSanXuat=MOBILE_PGD_PENDING;}
    mobileWorkWrite_("Requests",r);
  }
  if(stage==="plan") mobileWorkNotifyPgd_(r,d);
  else mobileWorkNotify_("V2_HANDOVER_"+d.id,r.createdBy,"Chờ bạn xác nhận bàn giao: "+r.title,r.id);
}
function mobileWorkV2Approve_(u,p) {
  const r=mobileWorkRequest_(p.requestId),branch=mobileWorkPgdBranch_(u);
  if(!branch) throw Error("Bạn không có quyền phê duyệt nhánh PGĐ.");
  if(!["accept","reject"].includes(p.decision)) throw Error("Quyết định không hợp lệ.");
  const reason=p.decision==="reject"?mobileWorkRequired_(p.reason,"lý do không phê duyệt",8000):mobileWorkText_(p.reason,8000);
  const decision="v2_"+branch+"_"+p.decision,{key,prior}=mobileWorkV2Prior_(u,p,decision,p.reportId,reason);
  if(prior)return prior;
  const d=mobileWorkReport_(p.reportId);
  if(r.status!=="v2_pgd" || r.lastReportId!==d.id || d.requestId!==r.id || d.status!=="v2_plan_submitted" || r[MOBILE_PGD_FIELDS[branch]]!==MOBILE_PGD_PENDING) throw Error("Phiếu không còn chờ phê duyệt biện pháp này.");
  return mobileWorkV2Event_(u,r,d.id,decision,reason,key);
}
function mobileWorkV2Review_(u,p) {
  const r=mobileWorkRequest_(p.requestId);
  if(u.email!==r.createdBy)throw Error("Chỉ người tạo phiếu được xác nhận bàn giao.");
  if(!["accept","reject"].includes(p.decision))throw Error("Quyết định không hợp lệ.");
  const reason=p.decision==="reject"?mobileWorkRequired_(p.reason,"lý do cần làm lại",8000):mobileWorkText_(p.reason,8000),decision="v2_handover_"+p.decision;
  const {key,prior}=mobileWorkV2Prior_(u,p,decision,p.reportId,reason);if(prior)return prior;
  const d=mobileWorkReport_(p.reportId);
  if(r.status!=="v2_confirmation" || r.lastReportId!==d.id || d.status!=="v2_handover_submitted" || d.requestId!==r.id)throw Error("Phiếu chưa có bàn giao này hoặc không còn chờ xác nhận.");
  mobileWorkCheckRevision_(r,p);
  return mobileWorkV2Event_(u,r,d.id,decision,reason,key);
}
function mobileWorkV2Apply_(v) {
  const r=mobileWorkRequest_(v.requestId);
  if(v.decision==="v2_assign") {
    if(r.status==="v2_assignment") {
      const m=mobileWorkMembers_().find(m=>m.email===v.reason);
      if(!m)throw Error("Không tìm thấy người thực hiện.");
      r.actualBy=m.email;r.actualByName=m.name;r.status="v2_plan";r.revision=Number(r.revision)+1;r.updatedAt=v.createdAt;mobileWorkWrite_("Requests",r);
    } else if(r.status!=="v2_plan" || r.actualBy!==v.reason)throw Error("Phiếu không còn ở bước phân công.");
    mobileWorkNotify_("V2_ASSIGNED_"+v.id,r.actualBy,"Bạn được giao lập biện pháp: "+r.title,r.id);
  } else {
    const d=mobileWorkReport_(v.reportId),match=/^v2_(quality|production)_(accept|reject)$/.exec(v.decision),accepted=v.decision.endsWith("_accept");
    if(r.lastReportId!==d.id || d.requestId!==r.id)throw Error("Không được áp dụng chữ ký cho vòng phiếu khác.");
    if(match) {
      const field=MOBILE_PGD_FIELDS[match[1]],value=accepted?MOBILE_PGD_ACCEPTED:MOBILE_PGD_REJECTED;
      if(r[field]!==value) {if(r.status!=="v2_pgd" || r[field]!==MOBILE_PGD_PENDING)throw Error("Nhánh duyệt đã thay đổi.");r[field]=value;r.revision=Number(r.revision)+1;r.updatedAt=v.createdAt;mobileWorkWrite_("Requests",r);}
      if(!accepted) {
        d.status="v2_plan_rejected";mobileWorkWrite_("ServiceReports",d);
        if(r.status!=="v2_plan"){r.status="v2_plan";r.revision=Number(r.revision)+1;mobileWorkWrite_("Requests",r);}
      } else if(mobileWorkPgdApproved_(r)) {
        d.status="v2_plan_approved";mobileWorkWrite_("ServiceReports",d);
        if(r.status!=="v2_ready"){r.status="v2_ready";r.revision=Number(r.revision)+1;mobileWorkWrite_("Requests",r);}
      }
    } else if(v.decision.startsWith("v2_handover_")) {
      const plan=mobileWorkV2Parent_(d);
      if(accepted) {
        if(!mobileWorkPgdApproved_(r) || plan.status!=="v2_plan_approved")throw Error("Chưa đủ phê duyệt biện pháp.");
        mobileWorkAppendAdminHistory_(r,d,v);
        d.status="v2_handover_accepted";mobileWorkWrite_("ServiceReports",d);
        if(r.status!=="completed") {r.status="completed";r.confirmedBy=v.createdBy;r.confirmedAt=v.createdAt;r.completedDate=d.performedDate;r.updatedAt=v.createdAt;r.revision=Number(r.revision)+1;mobileWorkWrite_("Requests",r);}
      } else {
        d.status="v2_handover_rejected";mobileWorkWrite_("ServiceReports",d);
        plan.status="v2_plan_revoked";mobileWorkWrite_("ServiceReports",plan);
        if(r.status!=="v2_plan") {r.status="v2_plan";r.trangThaiPGDChatLuong="";r.trangThaiPGDSanXuat="";r.confirmedBy="";r.confirmedAt="";r.revision=Number(r.revision)+1;r.updatedAt=v.createdAt;mobileWorkWrite_("Requests",r);}
      }
    } else throw Error("Thao tác luồng mới không hợp lệ.");
    [r.actualBy,r.createdBy,r.assignedTo].filter(Boolean).forEach(to=>mobileWorkNotify_("V2_REVIEW_"+v.id+"_"+adminHash_(to).slice(0,16),to,
      !accepted?"Phiếu cần trình lại biện pháp cho cả hai PGĐ: "+r.title+" — "+v.reason:r.status==="v2_ready"?"Đủ hai phê duyệt — được phép thi công: "+r.title:r.status==="completed"?"Đã xác nhận bàn giao: "+r.title:"Đã ghi nhận một phê duyệt biện pháp: "+r.title,r.id));
  }
  v.processed=true;v.calendarResult=r.status;mobileWorkWrite_("ServiceReviews",v);return v;
}
function mobileWorkV2Reconcile_() {
  mobileWorkRows_("ServiceReports").filter(d=>["v2_plan_submitted","v2_handover_submitted"].includes(d.status)).forEach(d=>{
    const r=mobileWorkRequest_(d.requestId),source=mobileWorkV2Stage_(d)==="plan"?"v2_plan":"v2_ready",target=source==="v2_plan"?"v2_pgd":"v2_confirmation";
    if((r.status===source && Number(r.revision)===Number(d.baseRevision)) || (r.lastReportId===d.id && r.status===target))mobileWorkV2ApplySubmission_(d);
  });
  mobileWorkRows_("ServiceReviews").filter(v=>String(v.decision).startsWith("v2_") && String(v.processed)!=="true").forEach(mobileWorkV2Apply_);
}
