/* Deployed only to the existing stock API, beside the shared PCN plan core.
 * All entry actions are behind the existing API bearer; browsers never see it. */
function epApiActor_(name,role) {
  const actor=epBoxText_(name),matches=epBoxRead_('account',['useName','role']).rows.filter(r=>epBoxText_(r.useName).toLowerCase()===actor.toLowerCase()&&epBoxText_(r.role).toLowerCase()===role);
  if(matches.length!==1)throw Error('Tài khoản không có quyền thực hiện.');return {useName:epBoxText_(matches[0].useName)};
}
function epApiAction_(action,body) {
  if(action==='epPlanPing')return {success:true};
  if(action==='mutateCombo5Plan'){
    if(!['create','update','cancel'].includes(body.mode))throw Error('Thao tác kế hoạch không hợp lệ.');
    return combo5MutationCore_(epApiActor_(body.actor,'admin'),body.payload,body.mode);
  }
  if(action==='mutateEpMangInPlan'){
    if(!['create','update','cancel'].includes(body.mode))throw Error('Thao tác kế hoạch không hợp lệ.');
    return epBoxMutationCore_(epApiActor_(body.actor,'admin'),body.payload,body.mode);
  }
  const actor=epApiActor_(body.actor,'worker');
  if(action==='exportEpMangInPlan')return epWorkerExportCore_(actor,body.payload);
  if(action==='reportEpMangInPlan')return epWorkerReportCore_(actor,body.payload);
  throw Error('Thao tác ép màng in không hợp lệ.');
}
function epExportDetails_(p,details) {
  const result=details.filter(d=>d.IdEpMangIn===p.IdEpMangIn&&Number(d.phienBan)===Number(p.phienBan));
  if(!result.length)throw Error('Kế hoạch chưa có thùng được PCN chọn.');
  const seen=new Set();result.forEach(d=>{const id=epBoxText_(d.IdThungDungVi).toLowerCase();if(!id||seen.has(id))throw Error('Danh sách thùng bị trùng hoặc thiếu mã.');seen.add(id);});return result;
}
function epExportScanIds_(details,ids) {
  if(!Array.isArray(ids)||ids.length!==details.length)throw Error('Phải quét đủ tất cả thùng của kế hoạch.');
  const allowed=new Map(details.map(d=>[epBoxText_(d.IdThungDungVi).toLowerCase(),d.IdThungDungVi])),seen=new Set();
  return ids.map(v=>{const key=epBoxText_(v).toLowerCase();if(!allowed.has(key)||seen.has(key))throw Error('QR không thuộc kế hoạch hoặc bị quét trùng: '+epBoxText_(v));seen.add(key);return allowed.get(key);});
}
function epExportTime_(v) {
  return Object.prototype.toString.call(v)==='[object Date]'?Utilities.formatDate(v,'Asia/Ho_Chi_Minh','yyyy-MM-dd HH:mm:ss'):epBoxText_(v);
}
function epExportStock_() {
  const raw=new Map(epBoxRead_('KetQuaLapVi',['IdThungDungVi']).rows.map(r=>[epBoxText_(r.IdThungDungVi),r.thoiGianXuat]));
  return epBoxStock_().map(s=>({...s,thoiGianXuat:raw.get(s.IdThungDungVi)||''}));
}
function epWorkerExportCore_(session,payload) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    epBoxSchema_();payload=payload||{};
    const pt=epBoxRead_(SHEET_KE_HOACH_EP_MANG_IN,EP_BOX_PARENT_EXTRA_),dt=epBoxRead_(EP_BOX_DETAIL_SHEET_,EP_BOX_DETAIL_HEADERS_);
    const found=pt.rows.filter(p=>p.IdEpMangIn===epBoxText_(payload.IdEpMangIn));if(found.length!==1)throw Error('Không tìm thấy đúng một kế hoạch ép màng in.');const parent=found[0];
    if(Number(payload.phienBan)!==Number(parent.phienBan))throw Error('Kế hoạch đã thay đổi. Tải lại và quét theo danh sách mới.');
    if(epBoxClosed_(parent))throw Error('Kế hoạch đã hủy hoặc hoàn thành.');
    const details=epExportDetails_(parent,dt.rows),ids=epExportScanIds_(details,payload.scannedIds);
    if(parent.IdXuatEpMangIn)return {success:true,IdXuatEpMangIn:parent.IdXuatEpMangIn,message:'Kế hoạch đã xuất trước đó. Không trừ tồn lần nữa.'};
    if(parent.soLuongViThucHien!==''||parent.nguoiBaoCao||parent.ThoiGianBaoCao)throw Error('Kế hoạch đã có báo cáo, cần PCN kiểm tra trước khi xuất.');
    let intent;
    if(parent.noiDungLenhXuat){intent=JSON.parse(parent.noiDungLenhXuat);if(intent.revision!==Number(parent.phienBan)||intent.plan!==parent.IdEpMangIn||intent.boxes.length!==ids.length||!intent.boxes.every(b=>ids.includes(b.id)))throw Error('Lệnh xuất chưa hoàn tất không khớp kế hoạch.');}
    else {
      const stock=epExportStock_(),holds=epBoxAllReservations_(pt.rows,dt.rows);
      epBoxValidate_(parent.maSanPham,Number(parent.soLuongViKeHoach),ids,stock,new Map([...holds].filter(([id,plan])=>plan!==parent.IdEpMangIn)));
      const now=nowText_();intent={id:'XEMI'+Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyyMMddHHmmssSSS')+'_'+Utilities.getUuid().slice(0,8),plan:parent.IdEpMangIn,revision:Number(parent.phienBan),actor:session.useName,time:now,boxes:ids.map(id=>{const s=stock.find(s=>s.IdThungDungVi===id);return {id,remaining:Number(s.soLuongViDaLap),issued:Number(s.daXuat||0),time:epExportTime_(s.thoiGianXuat),afterTime:epExportTime_(s.thoiGianXuat)||now};})};
      if(intent.boxes.some(b=>!Number.isSafeInteger(b.issued)||b.issued<0||!Number.isSafeInteger(b.issued+b.remaining)))throw Error('Số lượng vỉ không hợp lệ.');
      const raw=JSON.stringify(intent);if(raw.length>45000)throw Error('Kế hoạch quá nhiều thùng để xuất một lượt.');
      epBoxWrite_(pt,parent._row,{noiDungLenhXuat:raw});SpreadsheetApp.flush();
    }
    // Validate the entire recovery batch before touching any stock. Each row must
    // still be exactly its frozen before-state or the expected after-state.
    const stock=epExportStock_();intent.boxes.forEach(b=>{const s=stock.find(s=>s.IdThungDungVi===b.id);if(!s)throw Error('Không tìm thấy thùng '+b.id);const before=Number(s.soLuongViDaLap)===b.remaining&&Number(s.daXuat||0)===b.issued&&epExportTime_(s.thoiGianXuat)===b.time,after=Number(s.soLuongViDaLap)===0&&Number(s.daXuat)===b.issued+b.remaining&&epExportTime_(s.thoiGianXuat)===b.afterTime;if(!before&&!after)throw Error('Tồn thùng '+b.id+' đã thay đổi ngoài lệnh xuất. Cần kiểm tra dữ liệu.');});
    epViApply_(epViPrepare_(getSpreadsheet_(),ids,intent.time));SpreadsheetApp.flush();
    details.forEach(d=>{const b=intent.boxes.find(b=>b.id===d.IdThungDungVi);epBoxWrite_(dt,d._row,{trangThaiXuat:'Đã xuất',soLuongViDaXuat:b.remaining,thoiGianXuat:intent.time,nguoiXuat:intent.actor,IdXuatEpMangIn:intent.id});});SpreadsheetApp.flush();
    epBoxWrite_(pt,parent._row,{IdXuatEpMangIn:intent.id,thoiGianXuatEpMangIn:intent.time,nguoiXuatEpMangIn:intent.actor,trangThai:'Đã xuất'});SpreadsheetApp.flush();
    return {success:true,IdXuatEpMangIn:intent.id,message:'Đã xuất '+ids.length+' thùng, '+intent.boxes.reduce((n,b)=>n+b.remaining,0)+' vỉ. C# ghi sau không trừ tồn lại.'};
  } finally {lock.releaseLock();}
}
function epWorkerReportCore_(session,payload) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const pt=epBoxRead_(SHEET_KE_HOACH_EP_MANG_IN,getKeHoachEpMangInHeaders_()),parent=epBoxParent_(pt.rows,payload&&payload.STT),qty=Number(payload&&payload.soLuongThucHien);
    if(epBoxClosed_(parent))throw Error('Kế hoạch đã hủy hoặc hoàn thành.');
    if(parent.IdEpMangIn&&!parent.IdXuatEpMangIn)throw Error('Phải quét đủ và xác nhận xuất thùng trước khi báo cáo.');
    if(!Number.isSafeInteger(qty)||qty<0)throw Error('Số lượng vỉ thực hiện phải là số nguyên không âm.');
    const note=epBoxText_(payload.ghiChu);if(note.length>10000)throw Error('Ghi chú quá dài.');
    epBoxWrite_(pt,parent._row,{soLuongViThucHien:qty,ghiChu:/^[=+\-@]/.test(note)?"'"+note:note,nguoiBaoCao:session.useName,ThoiGianBaoCao:nowText_(),trangThai:'Đã báo cáo'});
    return {success:true,message:'Đã lưu báo cáo ép màng in.'};
  } finally {lock.releaseLock();}
}
