function khbdAutoSource_(){
  const records=pbdGrid_().rows,source=khbdCompletedEvents_(records,khbdClassifyActions_);
  const legacy=records.filter(r=>{const details=pbdParse_(r.chiTiet,[]);return maintenanceNorm_(r.trangThai)==='hoan thanh'&&Array.isArray(details)&&details.some(c=>c&&c.ketQua&&!khbdClassifyActions_(c).length);});
  if(legacy.length)source.warnings.push(legacy.length+' phiếu Hoàn thành còn loại công việc khác Bảo dưỡng/Thay mới; các dòng đó chưa được đưa vào sổ.');
  return {...source,records};
}
function khbdAutoSyncSelection_(user,p,source){
  const selection=khbdSelection_(p),catalog=khbdCatalog_(selection),grid=khbdRead_('SoKeHoachBaoDuong',khbdAutoColumns_()),old=grid.rows.find(r=>r.maSo===selection.id),input=source||khbdAutoSource_();
  const values=khbdAutoProjection_(selection,catalog,input.events),fingerprint='auto:'+adminHash_(JSON.stringify([values,catalog.groups])),changed=!old||old.maThaoTac!==fingerprint||old.nguonDongBo!=='PhieuBaoDuong';
  const now=changed?adminNow_():old.thoiGianCapNhat,revision=Number(old?.phienBan||0)+(changed?1:0);
  const master={maSo:selection.id,loaiBanGhi:'So',nam:String(selection.year),tenXuong:selection.workshop,boPhanDanhGia:selection.department,phienBan:String(revision),noiDungThang:khbdAutoEncode_(values),danhMucSo:khbdAutoEncode_(catalog.groups),duLieuThuCongCu:old?.duLieuThuCongCu||((old&&old.nguonDongBo!=='PhieuBaoDuong')?old.noiDungThang||'':'') ,nguoiCapNhat:'Tự động từ PhieuBaoDuong',thoiGianCapNhat:now,maThaoTac:fingerprint,nguonDongBo:'PhieuBaoDuong',trangThaiDong:'Đang dùng'};
  const details=khbdAutoDetailRows_(selection,catalog,values),ids=new Set(details.map(r=>r.maSo)),obsolete=grid.rows.filter(r=>r.loaiBanGhi==='ChiTiet'&&r.maSoCha===selection.id&&!ids.has(r.maSo)&&r.trangThaiDong!=='Ngừng dùng').map(r=>({maSo:r.maSo,trangThaiDong:'Ngừng dùng'}));
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
  const workshops=readAdminRows_('DanhMucXuong').map(r=>r.tenXuong),results=[];
  [...years].sort().forEach(year=>workshops.forEach(workshop=>['Cơ khí','Điện'].forEach(department=>{const r=khbdAutoSyncSelection_(null,{year,workshop,department},source);results.push({year,workshop,department,...r.writes});})));
  return {books:results,warnings:source.warnings};
}
function khbdAutoAfterRecord_(record){
  if(record.trangThai!=='Hoàn thành')return;
  const year=Number(String(record.ngayThucHien).slice(0,4)),departments=[...new Set(pbdParse_(record.chiTiet,[]).map(c=>c.boPhanDanhGia||record.boPhanDanhGia).filter(Boolean))],source=khbdAutoSource_();
  departments.forEach(department=>khbdAutoSyncSelection_(null,{year,workshop:record.tenXuong,department},source));
}
function khbdAutoRemovePeriodicTrigger_(){
  const triggers=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='dongBoSoKeHoachBaoDuongTuDong_');
  triggers.forEach(t=>ScriptApp.deleteTrigger(t));return {removed:triggers.length,remaining:ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='dongBoSoKeHoachBaoDuongTuDong_').length};
}
