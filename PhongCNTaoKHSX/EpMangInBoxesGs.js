/* PCN film-print plans. Inventory is read-only here; a committed parent revision
 * activates its container reservations. Older detail revisions remain auditable. */
const EP_BOX_DETAIL_SHEET_ = 'ChiTietKeHoachEpMangIn';
const EP_BOX_PARENT_EXTRA_ = ['IdEpMangIn','phienBan','maYeuCau','thoiGianCapNhat','nguoiCapNhat','lichSuYeuCau','thoiGianHuy','nguoiHuy','IdXuatEpMangIn','thoiGianXuatEpMangIn','nguoiXuatEpMangIn','noiDungLenhXuat'];
const EP_BOX_DETAIL_HEADERS_ = ['IdEpMangIn','STTKeHoach','phienBan','IdThungDungVi','IdLapVi','maSanPham','tenSanPham','ngaySanXuat','viTriKho','soLuongViKhiChon','trangThaiXuat','soLuongViDaXuat','thoiGianXuat','nguoiXuat','daXuatKhiChon','maYeuCau','noiDungYeuCau','IdXuatEpMangIn'];

function epBoxText_(v) { return String(v == null ? '' : v).trim(); }
function epBoxProductionDate_(value) {
  if(Object.prototype.toString.call(value)==='[object Date]')return isNaN(value.getTime())?'':Utilities.formatDate(value,'Asia/Ho_Chi_Minh','yyyy-MM-dd');
  const text=epBoxText_(value);let iso='';
  if(/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(text)){if(!epBoxProductionDate_(text.slice(0,10)))return '';const date=new Date(text);return isNaN(date.getTime())?'':Utilities.formatDate(date,'Asia/Ho_Chi_Minh','yyyy-MM-dd');}
  const yearFirst=text.match(/^(\d{4}-\d{2}-\d{2})(?:$|[ T])/),dayFirst=text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:$|\s)/);
  if(yearFirst)iso=yearFirst[1];else if(dayFirst)iso=dayFirst[3]+'-'+dayFirst[2].padStart(2,'0')+'-'+dayFirst[1].padStart(2,'0');
  if(!iso)return '';const date=new Date(iso+'T00:00:00Z');return !isNaN(date.getTime())&&date.toISOString().slice(0,10)===iso?iso:'';
}
function epBoxAssertFifo_(product,ids,stocks,holds) {
  const selected=new Set(ids.map(epBoxText_)),available=stocks.filter(s=>epBoxText_(s.maSanPham)===product&&Number(s.soLuongViDaLap)>0&&!holds.has(epBoxText_(s.IdThungDungVi))).map(s=>({...s,date:epBoxProductionDate_(s.ngaySanXuat)}));
  const unknown=available.find(s=>!s.date);if(unknown)throw Error('Thùng '+unknown.IdThungDungVi+' thiếu hoặc sai ngày sản xuất. Cần cập nhật ngày trước khi chọn theo thứ tự cũ nhất.');
  const dates=available.filter(s=>selected.has(epBoxText_(s.IdThungDungVi))).map(s=>s.date).sort(),newest=dates[dates.length-1];
  const older=available.filter(s=>s.date<newest&&!selected.has(epBoxText_(s.IdThungDungVi))).sort((a,b)=>a.date.localeCompare(b.date)||String(a.IdThungDungVi).localeCompare(String(b.IdThungDungVi)));
  if(older.length){const first=older[0],display=first.date.slice(8,10)+'/'+first.date.slice(5,7)+'/'+first.date.slice(0,4);throw Error('Còn '+older.filter(s=>s.date===first.date).length+' thùng ngày sản xuất '+display+' chưa được chọn (ví dụ '+first.IdThungDungVi+'). Phải chọn hết ngày cũ trước khi thêm ngày mới.');}
}
function epBoxRequests_(p) { const history=JSON.parse(p.lichSuYeuCau||'[]');if(!Array.isArray(history))throw Error('Lịch sử yêu cầu kế hoạch không hợp lệ.');return history; }
function epBoxClosed_(p) { return !!p.thoiGianHuy||/^(Hủy kế hoạch|Đã hủy|Hủy|Hoàn thành|Đã hoàn thành)$/i.test(epBoxText_(p.trangThai)); }
function epBoxReservations_(parents, details, exceptId) {
  const active=new Map(), holds=new Map();
  parents.forEach(p=>{const id=epBoxText_(p.IdEpMangIn);if(!id)return;if(active.has(id))throw Error('Trùng mã kế hoạch '+id);active.set(id,p);});
  details.forEach(d=>{const id=epBoxText_(d.IdEpMangIn),p=active.get(id);if(!p||id===exceptId||epBoxClosed_(p)||Number(p.phienBan)!==Number(d.phienBan))return;
    const box=epBoxText_(d.IdThungDungVi);if(!box)throw Error('Chi tiết kế hoạch thiếu mã thùng.');
    if(holds.has(box))throw Error('Trùng giữ thùng '+box+' trong kế hoạch.');holds.set(box,id);
  });return holds;
}
function epBoxAllReservations_(parents,details,exceptId) {
  const comboParents=epBoxRead_('KeHoachDongThungCombo5',['IdDongThungCombo5','phienBan','trangThai'],true).rows;
  const comboDetails=epBoxRead_('ChiTietKeHoachDongThungCombo5',['IdDongThungCombo5','phienBan','IdThungDungVi'],true).rows;
  return epBoxReservations_(parents.concat(comboParents.map(p=>({...p,IdEpMangIn:p.IdDongThungCombo5}))),details.concat(comboDetails.map(d=>({...d,IdEpMangIn:d.IdDongThungCombo5}))),exceptId);
}
function epBoxValidate_(product,quantity,ids,stocks,holds) {
  if(!epBoxText_(product))throw Error('Vui lòng chọn sản phẩm.');
  if(!Number.isSafeInteger(quantity)||quantity<=0)throw Error('Số lượng vỉ kế hoạch phải là số nguyên lớn hơn 0.');
  if(!Array.isArray(ids)||!ids.length)throw Error('Vui lòng thêm ít nhất một thùng vào danh sách.');
  const byId=new Map(),seen=new Set();stocks.forEach(s=>{const id=epBoxText_(s.IdThungDungVi);if(byId.has(id))throw Error('Trùng mã thùng '+id);byId.set(id,s);});
  let total=0;const selected=ids.map(value=>{const id=epBoxText_(value);if(seen.has(id))throw Error('Thùng bị chọn trùng: '+id);seen.add(id);
    const s=byId.get(id);if(!s||epBoxText_(s.maSanPham)!==product)throw Error('Thùng '+id+' không thuộc sản phẩm đã chọn hoặc không còn tồn.');
    if(holds.has(id))throw Error('Thùng '+id+' đang được giữ cho kế hoạch '+holds.get(id)+'. Vui lòng tải lại.');
    const qty=Number(s.soLuongViDaLap);if(!Number.isSafeInteger(qty)||qty<=0)throw Error('Thùng '+id+' không còn tồn hợp lệ.');total+=qty;return s;
  });if(!Number.isSafeInteger(total)||quantity>total)throw Error('Số lượng kế hoạch vượt tổng tồn các thùng đã chọn ('+total+' vỉ).');return selected;
}
function epBoxEnsureSheet_(ss,name,required) {
  let sheet=ss.getSheetByName(name);if(!sheet)sheet=ss.insertSheet(name);
  const cols=sheet.getLastColumn(),headers=cols?sheet.getRange(1,1,1,cols).getValues()[0].map(epBoxText_):[];
  headers.filter(Boolean).forEach((h,i,a)=>{if(a.indexOf(h)!==i)throw Error(name+' trùng cột '+h);});
  const missing=required.filter(h=>!headers.includes(h));if(missing.length)sheet.getRange(1,headers.length+1,1,missing.length).setValues([missing]);return sheet;
}
function epBoxSchema_() {
  const ss=getSpreadsheet_();
  epBoxEnsureSheet_(ss,SHEET_KE_HOACH_EP_MANG_IN,getKeHoachEpMangInHeaders_().concat(EP_BOX_PARENT_EXTRA_));
  epBoxEnsureSheet_(ss,EP_BOX_DETAIL_SHEET_,EP_BOX_DETAIL_HEADERS_);
}
function epBoxRead_(name,required,optional) {
  const sheet=getSpreadsheet_().getSheetByName(name);
  if(!sheet){if(optional)return {sheet:null,headers:[],rows:[]};throw Error('Không tìm thấy sheet '+name);}
  const values=sheet.getDataRange().getValues(),headers=(values[0]||[]).map(epBoxText_);
  (required||[]).forEach(h=>{if(headers.filter(x=>x===h).length!==1)throw Error(name+' thiếu hoặc trùng cột '+h);});
  const rows=values.slice(1).map((r,i)=>{const p={_row:i+2};headers.forEach((h,j)=>{if(h)p[h]=r[j] == null ? '' : r[j];});return p;}).filter(r=>headers.some(h=>h&&r[h]!==''));
  return {sheet,headers,rows};
}
function epBoxTables_() {
  return {parents:epBoxRead_(SHEET_KE_HOACH_EP_MANG_IN,getKeHoachEpMangInHeaders_()).rows,details:epBoxRead_(EP_BOX_DETAIL_SHEET_,[],true).rows};
}
function epBoxStock_() {
  return viStockProjection_(viStockRead_('KetQuaLapVi',['IdThungDungVi','IdLapVi','soLuongViDaLap']),viStockRead_('KeHoachLapViVTBC',['IdLapVi','maSanPham','tenSanPham'])).details;
}
function epBoxSerialize_(value) {
  if(Object.prototype.toString.call(value)==='[object Date]')return formatDateTimeValue_(value);
  if(Array.isArray(value))return value.map(epBoxSerialize_);
  if(value&&typeof value==='object'){const result={};Object.keys(value).filter(k=>k!=='_row').forEach(k=>result[k]=epBoxSerialize_(value[k]));return result;}return value;
}
function epBoxPlans_(tables) {
  tables=tables||epBoxTables_();
  return epBoxSerialize_(tables.parents.filter(p=>isWithinLastFiveDays_(p.thoiGianTao)||(p.IdEpMangIn&&!epBoxClosed_(p))).map(p=>({...p,trangThai:p.thoiGianHuy?'Hủy kế hoạch':p.trangThai,soLuongKeHoach:Number(p.soLuongViKeHoach)||0,
    soLuongThucHien:p.soLuongViThucHien===''?'':Number(p.soLuongViThucHien),
    items:tables.details.filter(d=>p.IdEpMangIn&&d.IdEpMangIn===p.IdEpMangIn&&Number(d.phienBan)===Number(p.phienBan))
  })).sort((a,b)=>Number(b.STT)-Number(a.STT)));
}
function getEpMangInBoxData(token) {
  requireAdmin_(token);const tables=epBoxTables_(),holds=epBoxAllReservations_(tables.parents,tables.details);
  return {success:true,plans:epBoxPlans_(tables),boxes:epBoxSerialize_(epBoxStock_().filter(s=>s.soLuongViDaLap>0&&s.maSanPham).map(s=>({...s,ngaySanXuatSort:epBoxProductionDate_(s.ngaySanXuat),giuChoKeHoach:holds.get(epBoxText_(s.IdThungDungVi))||''})).sort((a,b)=>(a.ngaySanXuatSort||'9999').localeCompare(b.ngaySanXuatSort||'9999')||String(a.IdThungDungVi).localeCompare(String(b.IdThungDungVi))))};
}
function epBoxAssertEditable_(parent,details,stocks) {
  if(parent.noiDungLenhXuat||parent.IdXuatEpMangIn)throw Error('Kế hoạch đang xuất hoặc đã xuất, không thể sửa/hủy.');
  if(epBoxClosed_(parent))throw Error('Kế hoạch đã hủy hoặc hoàn thành, không thể sửa/hủy.');
  if(parent.soLuongViThucHien!==''&&parent.soLuongViThucHien!=null||epBoxText_(parent.nguoiBaoCao)||parent.ThoiGianBaoCao)throw Error('Kế hoạch đã có báo cáo thực hiện, không thể sửa/hủy.');
  const selected=details.filter(d=>parent.IdEpMangIn&&d.IdEpMangIn===parent.IdEpMangIn&&Number(d.phienBan)===Number(parent.phienBan));
  selected.forEach(d=>{const stock=stocks.find(s=>epBoxText_(s.IdThungDungVi)===epBoxText_(d.IdThungDungVi));
    if(Number(d.soLuongViDaXuat)>0||epBoxText_(d.thoiGianXuat)||epBoxText_(d.nguoiXuat)||epBoxText_(d.trangThaiXuat)==='Đã xuất'||!stock||Number(stock.daXuat||0)!==Number(d.daXuatKhiChon||0)||Number(stock.soLuongViDaLap)<Number(d.soLuongViKhiChon))throw Error('Thùng '+d.IdThungDungVi+' đã xuất hoặc tồn đã thay đổi; không thể sửa/hủy kế hoạch.');
  });
}
function epBoxParent_(parents,stt) {
  const n=Number(stt);if(!Number.isSafeInteger(n)||n<=0)throw Error('STT kế hoạch không hợp lệ.');
  const rows=parents.filter(p=>Number(p.STT)===n);if(rows.length!==1)throw Error('Không tìm thấy đúng một kế hoạch STT '+n);return rows[0];
}
function epBoxWrite_(table,rowNumber,data) {
  if(rowNumber>table.sheet.getLastRow()){
    table.sheet.getRange(rowNumber,1,1,table.headers.length).setValues([table.headers.map(h=>data[h]??'')]);return;
  }
  // Existing worker writes report columns with another project's lock. Never
  // read/write those cells during PCN edits. Commit the revision group last.
  const groups=[];
  table.headers.forEach((h,i)=>{if(!Object.prototype.hasOwnProperty.call(data,h))return;let group=groups[groups.length-1];if(!group||group.start+group.values.length!==i){group={start:i,values:[],keys:[]};groups.push(group);}group.values.push(data[h]);group.keys.push(h);});
  groups.sort((a,b)=>Number(a.keys.includes('phienBan'))-Number(b.keys.includes('phienBan')));
  const completed=[];
  try {groups.forEach(group=>{const range=table.sheet.getRange(rowNumber,group.start+1,1,group.values.length),before=range.getValues();range.setValues([group.values]);completed.push({range,before});});}
  catch(error){completed.reverse().forEach(g=>{try{g.range.setValues(g.before);}catch(rollbackError){console.error('Cannot restore PCN plan fields: '+rollbackError.message);}});throw error;}
}
function epBoxMutation_(token,payload,mode) {
  const session=requireAdmin_(token);return callEpPlanApi_('mutateEpMangInPlan',{actor:session.useName,mode,payload});
}
function epBoxMutationCore_(session,payload,mode) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    epBoxSchema_();const pt=epBoxRead_(SHEET_KE_HOACH_EP_MANG_IN,getKeHoachEpMangInHeaders_().concat(EP_BOX_PARENT_EXTRA_)),dt=epBoxRead_(EP_BOX_DETAIL_SHEET_,EP_BOX_DETAIL_HEADERS_),stocks=epBoxStock_();
    payload=payload||{};const request=epBoxText_(payload.maYeuCau);
    if(mode!=='cancel'&&!/^[A-Za-z0-9_-]{16,100}$/.test(request))throw Error('Thiếu mã yêu cầu. Vui lòng tải lại trang.');
    const signature=JSON.stringify([mode,mode==='create'?'':Number(payload.STT),epBoxText_(payload.maSanPham),Number(payload.soLuongKeHoach),Array.isArray(payload.items)?payload.items.map(epBoxText_).sort():[]]);
    // Commit request history in the same parent row as its revision. Orphan detail
    // writes never acknowledge a request; retries still work after later edits.
    const replay=mode!=='cancel'&&request&&pt.rows.find(p=>epBoxRequests_(p).some(r=>r.maYeuCau===request));
    if(replay){if(epBoxRequests_(replay).find(r=>r.maYeuCau===request).noiDungYeuCau!==signature)throw Error('Mã yêu cầu đã dùng cho nội dung khác. Vui lòng tải lại.');return {success:true,IdEpMangIn:replay.IdEpMangIn,message:'Kế hoạch đã được lưu.',plans:epBoxPlans_({parents:pt.rows,details:dt.rows})};}
    let parent=mode==='create'?null:epBoxParent_(pt.rows,payload.STT);
    if(parent){
      if(epBoxText_(payload.IdEpMangIn)!==epBoxText_(parent.IdEpMangIn)||Number(payload.phienBan||0)!==Number(parent.phienBan||0))throw Error('Kế hoạch đã thay đổi. Vui lòng tải lại trước khi sửa/hủy.');
      epBoxAssertEditable_(parent,dt.rows,stocks);
    }
    const now=nowText_();
    if(mode==='cancel'){
      epBoxWrite_(pt,parent._row,{trangThai:'Hủy kế hoạch',thoiGianHuy:now,nguoiHuy:session.useName||'',thoiGianCapNhat:now,nguoiCapNhat:session.useName||''});
      return {success:true,message:'Đã hủy kế hoạch và nhả các thùng đang giữ.',plans:epBoxPlans_()};
    }
    const product=epBoxText_(payload.maSanPham),qty=Number(payload.soLuongKeHoach),p=getSimplePlanProductByMa_(product);if(!p)throw Error('Không tìm thấy sản phẩm.');
    const selected=epBoxValidate_(product,qty,payload.items,stocks,epBoxAllReservations_(pt.rows,dt.rows,parent&&parent.IdEpMangIn));
    epBoxAssertFifo_(product,payload.items,stocks,epBoxAllReservations_(pt.rows,dt.rows,parent&&parent.IdEpMangIn));
    const id=parent&&parent.IdEpMangIn||'EMI'+Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyyMMddHHmmssSSS')+'_'+Utilities.getUuid().slice(0,8);
    const stt=parent?Number(parent.STT):Math.max(0,...pt.rows.map(p=>Number(p.STT)||0))+1;
    // Include inactive orphan revisions after a previous failed write when choosing the next revision.
    const revision=Math.max(Number(parent&&parent.phienBan||0),...dt.rows.filter(d=>d.IdEpMangIn===id).map(d=>Number(d.phienBan)||0))+1;
    const rows=selected.map(s=>({IdEpMangIn:id,STTKeHoach:stt,phienBan:revision,IdThungDungVi:s.IdThungDungVi,IdLapVi:s.IdLapVi,maSanPham:p.maSanPham,tenSanPham:p.tenSanPham,ngaySanXuat:s.ngaySanXuat||'',viTriKho:s.viTriKho||s.vitriKho||'',soLuongViKhiChon:s.soLuongViDaLap,trangThaiXuat:'Chờ xuất',soLuongViDaXuat:0,thoiGianXuat:'',nguoiXuat:'',daXuatKhiChon:s.daXuat||0,maYeuCau:request,noiDungYeuCau:signature}));
    dt.sheet.getRange(dt.sheet.getLastRow()+1,1,rows.length,dt.headers.length).setValues(rows.map(r=>dt.headers.map(h=>r[h]??'')));
    SpreadsheetApp.flush();
    // Check again after detail staging. Worker/C# writes are outside this PCN
    // lock; they must not silently convert a stale selection into a new plan.
    const freshStock=epBoxStock_(),freshParents=epBoxRead_(SHEET_KE_HOACH_EP_MANG_IN,getKeHoachEpMangInHeaders_()).rows;
    if(parent)epBoxAssertEditable_(epBoxParent_(freshParents,parent.STT),dt.rows,freshStock);
    epBoxValidate_(product,qty,payload.items,freshStock,epBoxAllReservations_(freshParents,dt.rows,parent&&parent.IdEpMangIn));
    epBoxAssertFifo_(product,payload.items,freshStock,epBoxAllReservations_(freshParents,dt.rows,parent&&parent.IdEpMangIn));
    selected.forEach(old=>{const fresh=freshStock.find(s=>s.IdThungDungVi===old.IdThungDungVi);if(Number(fresh.soLuongViDaLap)!==Number(old.soLuongViDaLap)||Number(fresh.daXuat||0)!==Number(old.daXuat||0))throw Error('Tồn thùng '+old.IdThungDungVi+' đã thay đổi. Vui lòng tải lại.');});
    const history=JSON.stringify((parent?epBoxRequests_(parent):[]).concat([{maYeuCau:request,noiDungYeuCau:signature}]));if(history.length>45000)throw Error('Kế hoạch đã có quá nhiều lần sửa. Vui lòng tạo kế hoạch mới.');
    const changes={STT:stt,maSanPham:p.maSanPham,tenSanPham:p.tenSanPham,soLuongViKeHoach:qty,IdEpMangIn:id,phienBan:revision,maYeuCau:request,thoiGianCapNhat:now,nguoiCapNhat:session.useName||'',lichSuYeuCau:history};
    if(!parent)Object.assign(changes,{thoiGianTao:now,nguoiTao:session.useName||'',trangThai:'Đã tạo',soLuongViThucHien:'',ghiChu:'',nguoiBaoCao:'',ThoiGianBaoCao:''});
    epBoxWrite_(pt,parent?parent._row:pt.sheet.getLastRow()+1,changes);SpreadsheetApp.flush();
    return {success:true,IdEpMangIn:id,message:mode==='create'?'Đã tạo kế hoạch và giữ các thùng đã chọn.':'Đã cập nhật kế hoạch và danh sách thùng.',plans:epBoxPlans_()};
  } finally {lock.releaseLock();}
}
