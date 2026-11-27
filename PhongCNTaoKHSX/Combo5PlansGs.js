/* Combo-5 carton targets are independent of the source's tray unit. */
const COMBO5_MAIN_SHEET_='KeHoachDongThungCombo5';
const COMBO5_DETAIL_SHEET_='ChiTietKeHoachDongThungCombo5';
const COMBO5_EXTRA_=['IdDongThungCombo5','phienBan','maYeuCau','thoiGianCapNhat','nguoiCapNhat','lichSuYeuCau','thoiGianHuy','nguoiHuy','IdXuatDongThungCombo5','thoiGianXuatCombo5','nguoiXuatCombo5','noiDungLenhXuat'];
function combo5Headers_(){return ['STT','maSanPham','tenSanPham','soLuongThungKeHoach','thoiGianTao','nguoiTao','trangThai','soLuongThungThucHien','ghiChu','nguoiBaoCao','ThoiGianBaoCao'];}
function combo5DetailHeaders_(){return EP_BOX_DETAIL_HEADERS_.map(h=>h==='IdEpMangIn'?'IdDongThungCombo5':h==='IdXuatEpMangIn'?'IdXuatDongThungCombo5':h);}
function combo5Schema_(){const ss=getSpreadsheet_();epBoxEnsureSheet_(ss,COMBO5_MAIN_SHEET_,combo5Headers_().concat(COMBO5_EXTRA_));epBoxEnsureSheet_(ss,COMBO5_DETAIL_SHEET_,combo5DetailHeaders_());}
function combo5Tables_(){return {parents:epBoxRead_(COMBO5_MAIN_SHEET_,combo5Headers_().concat(COMBO5_EXTRA_),true).rows,details:epBoxRead_(COMBO5_DETAIL_SHEET_,combo5DetailHeaders_(),true).rows};}
function combo5Holds_(exceptId){const film=epBoxTables_();return epBoxAllReservations_(film.parents,film.details,exceptId);}
function combo5Plans_(tables){tables=tables||combo5Tables_();return epBoxSerialize_(tables.parents.filter(p=>isWithinLastFiveDays_(p.thoiGianTao)||(p.IdDongThungCombo5&&!epBoxClosed_(p))).map(p=>({...p,trangThai:p.thoiGianHuy?'Hủy kế hoạch':p.trangThai,soLuongKeHoach:Number(p.soLuongThungKeHoach)||0,soLuongThucHien:p.soLuongThungThucHien===''?'':Number(p.soLuongThungThucHien),items:tables.details.filter(d=>d.IdDongThungCombo5===p.IdDongThungCombo5&&Number(d.phienBan)===Number(p.phienBan))})).sort((a,b)=>Number(b.STT)-Number(a.STT)));}
function combo5Validate_(product,qty,ids,stocks,holds){if(!Number.isSafeInteger(qty)||qty<=0)throw Error('Thùng kế hoạch phải là số nguyên lớn hơn 0.');return epBoxValidate_(product,1,ids,stocks,holds);}
function combo5AssertEditable_(p,details,stocks){epBoxAssertEditable_({...p,IdEpMangIn:p.IdDongThungCombo5,IdXuatEpMangIn:p.IdXuatDongThungCombo5,soLuongViThucHien:p.soLuongThungThucHien},details.map(d=>({...d,IdEpMangIn:d.IdDongThungCombo5})),stocks);}
function getCombo5PlanData(token){requireAdmin_(token);const holds=combo5Holds_();return {success:true,plans:combo5Plans_(),boxes:epBoxSerialize_(epBoxStock_().filter(s=>s.soLuongViDaLap>0&&s.maSanPham).map(s=>({...s,ngaySanXuatSort:epBoxProductionDate_(s.ngaySanXuat),giuChoKeHoach:holds.get(epBoxText_(s.IdThungDungVi))||''})).sort((a,b)=>(a.ngaySanXuatSort||'9999').localeCompare(b.ngaySanXuatSort||'9999')||String(a.IdThungDungVi).localeCompare(String(b.IdThungDungVi))))};}
function combo5Mutation_(token,payload,mode){const session=requireAdmin_(token);return callEpPlanApi_('mutateCombo5Plan',{actor:session.useName,payload,mode});}
function createKeHoachCombo5(token,payload){return combo5Mutation_(token,payload,'create');}
function updateKeHoachCombo5(token,payload){return combo5Mutation_(token,payload,'update');}
function cancelKeHoachCombo5(token,payload){return combo5Mutation_(token,payload,'cancel');}
function combo5MutationCore_(session,payload,mode) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    combo5Schema_();const pt=epBoxRead_(COMBO5_MAIN_SHEET_,combo5Headers_().concat(COMBO5_EXTRA_)),dt=epBoxRead_(COMBO5_DETAIL_SHEET_,combo5DetailHeaders_()),stocks=epBoxStock_();
    payload=payload||{};const request=epBoxText_(payload.maYeuCau);
    if(mode!=='cancel'&&!/^[A-Za-z0-9_-]{16,100}$/.test(request))throw Error('Thiếu mã yêu cầu. Vui lòng tải lại trang.');
    const signature=JSON.stringify([mode,mode==='create'?'':Number(payload.STT),epBoxText_(payload.maSanPham),Number(payload.soLuongKeHoach),Array.isArray(payload.items)?payload.items.map(epBoxText_).sort():[]]);
    // Commit request history in the same parent row as its revision. Orphan detail
    // writes never acknowledge a request; retries still work after later edits.
    const replay=mode!=='cancel'&&request&&pt.rows.find(p=>epBoxRequests_(p).some(r=>r.maYeuCau===request));
    if(replay){if(epBoxRequests_(replay).find(r=>r.maYeuCau===request).noiDungYeuCau!==signature)throw Error('Mã yêu cầu đã dùng cho nội dung khác. Vui lòng tải lại.');return {success:true,IdDongThungCombo5:replay.IdDongThungCombo5,message:'Kế hoạch đã được lưu.',plans:combo5Plans_({parents:pt.rows,details:dt.rows})};}
    let parent=mode==='create'?null:epBoxParent_(pt.rows,payload.STT);
    if(parent){
      if(epBoxText_(payload.IdDongThungCombo5)!==epBoxText_(parent.IdDongThungCombo5)||Number(payload.phienBan||0)!==Number(parent.phienBan||0))throw Error('Kế hoạch đã thay đổi. Vui lòng tải lại trước khi sửa/hủy.');
      combo5AssertEditable_(parent,dt.rows,stocks);
    }
    const now=nowText_();
    if(mode==='cancel'){
      epBoxWrite_(pt,parent._row,{trangThai:'Hủy kế hoạch',thoiGianHuy:now,nguoiHuy:session.useName||'',thoiGianCapNhat:now,nguoiCapNhat:session.useName||''});
      return {success:true,message:'Đã hủy kế hoạch và nhả các thùng đang giữ.',plans:combo5Plans_()};
    }
    const product=epBoxText_(payload.maSanPham),qty=Number(payload.soLuongKeHoach),p=getSimplePlanProductByMa_(product);if(!p)throw Error('Không tìm thấy sản phẩm.');
    const selected=combo5Validate_(product,qty,payload.items,stocks,combo5Holds_(parent&&parent.IdDongThungCombo5));
    epBoxAssertFifo_(product,payload.items,stocks,combo5Holds_(parent&&parent.IdDongThungCombo5));
    const id=parent&&parent.IdDongThungCombo5||'DTC5'+Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyyMMddHHmmssSSS')+'_'+Utilities.getUuid().slice(0,8);
    const stt=parent?Number(parent.STT):Math.max(0,...pt.rows.map(p=>Number(p.STT)||0))+1;
    // Include inactive orphan revisions after a previous failed write when choosing the next revision.
    const revision=Math.max(Number(parent&&parent.phienBan||0),...dt.rows.filter(d=>d.IdDongThungCombo5===id).map(d=>Number(d.phienBan)||0))+1;
    const rows=selected.map(s=>({IdDongThungCombo5:id,STTKeHoach:stt,phienBan:revision,IdThungDungVi:s.IdThungDungVi,IdLapVi:s.IdLapVi,maSanPham:p.maSanPham,tenSanPham:p.tenSanPham,ngaySanXuat:s.ngaySanXuat||'',viTriKho:s.viTriKho||s.vitriKho||'',soLuongViKhiChon:s.soLuongViDaLap,trangThaiXuat:'Chờ xuất',soLuongViDaXuat:0,thoiGianXuat:'',nguoiXuat:'',daXuatKhiChon:s.daXuat||0,maYeuCau:request,noiDungYeuCau:signature}));
    dt.sheet.getRange(dt.sheet.getLastRow()+1,1,rows.length,dt.headers.length).setValues(rows.map(r=>dt.headers.map(h=>r[h]??'')));
    SpreadsheetApp.flush();
    // Check again after detail staging. Worker/C# writes are outside this PCN
    // lock; they must not silently convert a stale selection into a new plan.
    const freshStock=epBoxStock_(),freshParents=epBoxRead_(COMBO5_MAIN_SHEET_,combo5Headers_()).rows;
    if(parent)combo5AssertEditable_(epBoxParent_(freshParents,parent.STT),dt.rows,freshStock);
    combo5Validate_(product,qty,payload.items,freshStock,combo5Holds_(parent&&parent.IdDongThungCombo5));
    epBoxAssertFifo_(product,payload.items,freshStock,combo5Holds_(parent&&parent.IdDongThungCombo5));
    selected.forEach(old=>{const fresh=freshStock.find(s=>s.IdThungDungVi===old.IdThungDungVi);if(Number(fresh.soLuongViDaLap)!==Number(old.soLuongViDaLap)||Number(fresh.daXuat||0)!==Number(old.daXuat||0))throw Error('Tồn thùng '+old.IdThungDungVi+' đã thay đổi. Vui lòng tải lại.');});
    const history=JSON.stringify((parent?epBoxRequests_(parent):[]).concat([{maYeuCau:request,noiDungYeuCau:signature}]));if(history.length>45000)throw Error('Kế hoạch đã có quá nhiều lần sửa. Vui lòng tạo kế hoạch mới.');
    const changes={STT:stt,maSanPham:p.maSanPham,tenSanPham:p.tenSanPham,soLuongThungKeHoach:qty,IdDongThungCombo5:id,phienBan:revision,maYeuCau:request,thoiGianCapNhat:now,nguoiCapNhat:session.useName||'',lichSuYeuCau:history};
    if(!parent)Object.assign(changes,{thoiGianTao:now,nguoiTao:session.useName||'',trangThai:'Đã tạo',soLuongThungThucHien:'',ghiChu:'',nguoiBaoCao:'',ThoiGianBaoCao:''});
    epBoxWrite_(pt,parent?parent._row:pt.sheet.getLastRow()+1,changes);SpreadsheetApp.flush();
    return {success:true,IdDongThungCombo5:id,message:mode==='create'?'Đã tạo kế hoạch đóng thùng combo 5 và giữ các thùng nguồn đã chọn.':'Đã cập nhật kế hoạch và danh sách thùng.',plans:combo5Plans_()};
  } finally {lock.releaseLock();}
}
