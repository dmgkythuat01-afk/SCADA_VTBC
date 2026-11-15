function khbdAutoSource_(){
  const records=pbdGrid_().rows,source=khbdCompletedEvents_(records,khbdClassifyActions_);
  const legacy=records.filter(r=>{const details=pbdParse_(r.chiTiet,[]);return maintenanceNorm_(r.trangThai)==='hoan thanh'&&Array.isArray(details)&&details.some(c=>c&&c.ketQua&&!khbdClassifyActions_(c).length);});
  if(legacy.length)source.warnings.push(legacy.length+' phiếu Hoàn thành còn loại công việc khác Bảo dưỡng/Thay mới; các dòng đó chưa được đưa vào sổ.');
  return {...source,records};
}
function khbdAutoSyncSelection_(user,p,source){
  const selection=khbdSelection_(p),catalog=khbdCatalog_(selection),grid=khbdRead_('SoKeHoachBaoDuong',khbdAutoColumns_()),old=grid.rows.find(r=>r.maSo===selection.id),input=source||khbdAutoSource_();
  const seeds=khbdHistorySeeds_(selection,catalog,input.events,maintenanceToday_()),values=khbdAutoProjection_(selection,catalog,input.events,seeds),fingerprint='auto:'+adminHash_(JSON.stringify([values,catalog.groups,seeds])),changed=!old||old.maThaoTac!==fingerprint||old.nguonDongBo!=='PhieuBaoDuong';
  const now=changed?adminNow_():old.thoiGianCapNhat,revision=Number(old?.phienBan||0)+(changed?1:0);
  const master={maSo:selection.id,loaiBanGhi:'So',nam:String(selection.year),tenXuong:selection.workshop,boPhanDanhGia:selection.department,phienBan:String(revision),noiDungThang:khbdAutoEncode_(values),mocLichSuBanDau:khbdAutoEncode_(seeds),danhMucSo:khbdAutoEncode_(catalog.groups),duLieuThuCongCu:old?.duLieuThuCongCu||((old&&old.nguonDongBo!=='PhieuBaoDuong')?old.noiDungThang||'':'') ,nguoiCapNhat:'Tự động từ PhieuBaoDuong và mốc lịch sử',thoiGianCapNhat:now,maThaoTac:fingerprint,nguonDongBo:'PhieuBaoDuong',trangThaiDong:'Đang dùng'};
  const details=khbdAutoDetailRows_(selection,catalog,values,seeds),ids=new Set(details.map(r=>r.maSo)),obsolete=grid.rows.filter(r=>r.loaiBanGhi==='ChiTiet'&&r.maSoCha===selection.id&&!ids.has(r.maSo)&&r.trangThaiDong!=='Ngừng dùng').map(r=>({maSo:r.maSo,trangThaiDong:'Ngừng dùng'}));
  const writes=khbdAutoPersist_(grid,[master,...details,...obsolete]);
  return {...selection,...catalog,values,revision,updatedBy:master.nguoiCapNhat,updatedAt:now,canWrite:false,automatic:true,warnings:input.warnings,writes};
}
function khbdAutoLoad_(user,p){
  const selection=khbdSelection_(p),catalog=khbdCatalog_(selection),grid=khbdRead_('SoKeHoachBaoDuong',khbdAutoColumns_()),matches=grid.rows.filter(r=>r.maSo===selection.id);
  if(matches.length>1)throw Error('Trùng mã sổ trong SoKeHoachBaoDuong.');
  const row=matches[0];
  return {...selection,...catalog,values:khbdAutoDecode_(row?.noiDungThang,{}),revision:Number(row?.phienBan||0),updatedBy:row?.nguoiCapNhat||'',updatedAt:row?.thoiGianCapNhat||'',canWrite:false,automatic:true,warnings:[],writes:{added:0,updated:0}};
}
function khbdAutoSyncAll_(){
  const source=khbdAutoSource_(),grid=khbdRead_('SoKeHoachBaoDuong',khbdAutoColumns_()),years=new Set([Number(maintenanceToday_().slice(0,4))]);
  grid.rows.filter(r=>r.loaiBanGhi!=='ChiTiet').forEach(r=>{const year=Number(r.nam);if(Number.isInteger(year)&&year>=2000&&year<=2100)years.add(year);});
  source.records.filter(r=>maintenanceNorm_(r.trangThai)==='hoan thanh').forEach(r=>{const year=Number(String(r.ngayThucHien).slice(0,4));if(Number.isInteger(year)&&year>=2000&&year<=2100)years.add(year);});
  readAdminRows_('DanhMucSoKH').forEach(r=>['ngayBaoDuongGanNhat','ngayThayMoiGanNhat'].forEach(k=>{const day=khbdHistoryDate_(r[k]),year=Number(day.slice(0,4));if(day&&day<=maintenanceToday_()&&year>=2000&&year<=2100)years.add(year);}));
  const workshops=readAdminRows_('DanhMucXuong').map(r=>r.tenXuong),results=[];
  [...years].sort().forEach(year=>workshops.forEach(workshop=>['Cơ khí','Điện'].forEach(department=>{const r=khbdAutoSyncSelection_(null,{year,workshop,department},source);results.push({year,workshop,department,...r.writes});})));
  return {books:results,warnings:source.warnings};
}
function khbdAutoAfterRecord_(record){
  if(record.trangThai!=='Hoàn thành')return;
  const year=Number(String(record.ngayThucHien).slice(0,4)),departments=[...new Set(pbdParse_(record.chiTiet,[]).map(c=>c.boPhanDanhGia||record.boPhanDanhGia).filter(Boolean))],source=khbdAutoSource_();
  departments.forEach(department=>{const years=new Set([year]);readAdminRows_('DanhMucSoKH').filter(r=>adminNorm_(r.tenXuong)===adminNorm_(record.tenXuong)&&adminNorm_(r.boPhanDanhGia)===adminNorm_(department)).forEach(r=>['ngayBaoDuongGanNhat','ngayThayMoiGanNhat'].forEach(k=>{const day=khbdHistoryDate_(r[k]),y=Number(day.slice(0,4));if(day&&day<=maintenanceToday_()&&y>=2000&&y<=2100)years.add(y);}));years.forEach(y=>khbdAutoSyncSelection_(null,{year:y,workshop:record.tenXuong,department},source));});
}
function khbdHistorySourceEdited_(event){
  if(!event?.range||event.source?.getId()!==ADMIN_SHEET_ID||event.range.getSheet().getName()!=='DanhMucSoKH'||event.range.getLastRow()<2)return;
  const sheet=event.range.getSheet(),headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0],columns=headers.map((h,i)=>['ngayBaoDuongGanNhat','ngayThayMoiGanNhat'].includes(String(h).trim())?i+1:0).filter(Boolean);
  if(!columns.some(col=>col>=event.range.getColumn()&&col<=event.range.getLastColumn()))return;
  const lock=LockService.getScriptLock();lock.waitLock(30000);try{adminBeginRequest_();mobileWorkResetContext_();return khbdAutoSyncAll_();}finally{lock.releaseLock();}
}
function khbdHistoryInstallEditTrigger_(){const handler='khbdHistorySourceEdited_',found=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===handler);if(!found.length)ScriptApp.newTrigger(handler).forSpreadsheet(ADMIN_SHEET_ID).onEdit().create();return {handler,created:!found.length,periodic:false};}
function khbdAutoRemovePeriodicTrigger_(){
  const triggers=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='dongBoSoKeHoachBaoDuongTuDong_');
  triggers.forEach(t=>ScriptApp.deleteTrigger(t));return {removed:triggers.length,remaining:ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='dongBoSoKeHoachBaoDuongTuDong_').length};
}
