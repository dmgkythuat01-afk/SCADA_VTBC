function pbdPlanDate_(value){
  let text=String(value||'').trim();const local=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);if(local)text=local[3]+'-'+local[2]+'-'+local[1];
  try{maintenanceDate_(text);return text;}catch{return '';}
}
function pbdPlanFrequency_(value){return String(value||'').trim().replace(/\s*\/\s*lần\s*$/iu,'').replace(/\s*\/\s*lan\s*$/iu,'').trim();}
function pbdPlanHistory_(items,bookRows,records,today){
  const latest=new Map(),byBookKey=new Map();
  const identity=item=>JSON.stringify([khbdEventIdentity_(item),item.loai==='Thay mới'?'replace':'maintain']);
  items.forEach(item=>byBookKey.set(JSON.stringify([adminNorm_(item.tenXuong),adminNorm_(item.boPhanDanhGia),item.bookActionKey]),identity(item)));
  const add=(key,value,source,record)=>{const day=pbdPlanDate_(value);if(!key||!day||day>today)return;const old=latest.get(key);if(!old||old.day<day||(old.day===day&&source==='PhieuBaoDuong'))latest.set(key,{day,source,record:record||''});};
  bookRows.filter(r=>r.loaiBanGhi==='ChiTiet'&&['Bảo dưỡng','Thay mới'].includes(r.congViec)).forEach(row=>{const key=identity({...row,loai:row.congViec});for(let month=1;month<=12;month++)String(row['thang'+month]||'').split(/[\n,;]+/).forEach(value=>add(key,value,'SoKeHoachBaoDuong'));});
  bookRows.filter(r=>r.loaiBanGhi!=='ChiTiet'&&r.nguonDongBo==='PhieuBaoDuong').forEach(row=>{let values;try{values=khbdAutoDecode_(row.noiDungThang,{});}catch{return;}if(!values||typeof values!=='object'||Array.isArray(values))return;Object.keys(values).forEach(actionKey=>{const key=byBookKey.get(JSON.stringify([adminNorm_(row.tenXuong),adminNorm_(row.boPhanDanhGia),actionKey]));if(!Array.isArray(values[actionKey]))return;values[actionKey].forEach(month=>String(month||'').split(/[\n,;]+/).forEach(day=>add(key,day,'SoKeHoachBaoDuong')));});});
  const completed=khbdCompletedEvents_(records,khbdClassifyActions_);
  completed.events.forEach(event=>add(JSON.stringify([event.identity,event.action]),event.day,'PhieuBaoDuong',event.record));
  return {latest,warnings:completed.warnings};
}
function pbdPlanProjection_(items,bookRows,records,today,initialMode){
  maintenanceDate_(today);const history=pbdPlanHistory_(items,bookRows,records,today);
  const rows=items.map(item=>{
    const action=item.loai==='Thay mới'?'replace':'maintain',last=history.latest.get(JSON.stringify([khbdEventIdentity_(item),action])),installed=initialMode==='installation'?pbdPlanDate_(item.ngayLapDat):'',base=last?.day||(installed&&installed<=today?installed:''),frequency=pbdPlanFrequency_(item.tanSuatApDung);
    let due='';if(base&&pbdCycle_(frequency))try{due=pbdPlanDate_(pbdNext_(base,frequency));}catch{}
    const days=due?Math.round((maintenanceDate_(due)-maintenanceDate_(today))/86400000):null;
    return {...item,ngayGanNhat:last?.day||'',ngayMoc:base,nguonNgay:last?.source||(base?'ngayLapDat':''),maPhieuGanNhat:last?.record||'',ngayDenHan:due,soNgayConLai:days,trangThaiLich:!pbdCycle_(frequency)?'Chưa có tần suất':!due?'Chưa có mốc thực hiện':days<0?'Quá hạn':days===0?'Đến hạn':days<=14?'Sắp đến hạn':'Chưa đến hạn'};
  });
  return {today,rows,warnings:history.warnings,initialMode};
}
function pbdPlanItems_(){
  const devices=readAdminRows_('DanhMucThietBi'),byDevice=new Map(devices.map(d=>[maintenanceDeviceKey_(d),d])),items=[];
  readAdminRows_('DanhMucXuong').forEach(workshop=>['Cơ khí','Điện'].forEach(department=>{
    const catalog=khbdCatalog_({workshop:workshop.tenXuong,department});
    catalog.groups.forEach(group=>group.devices.forEach(device=>{
      const raw=byDevice.get(maintenanceDeviceKey_({tenXuong:workshop.tenXuong,tenMay:group.machine,maThietBi:device.code}));if(!raw||!maintenanceActive_(raw))return;
      device.categories.forEach(category=>category.actions.forEach(action=>items.push({key:adminHash_(JSON.stringify([workshop.tenXuong,department,action.key])),bookActionKey:action.key,tenXuong:workshop.tenXuong,tenMay:group.machine,maThietBi:device.code,tenThietBi:device.name,danhMucCanKiemTra:category.name,boPhanDanhGia:department,loai:action.name,tanSuatApDung:action.frequency,ngayLapDat:raw.ngayLapDat||''})));
    }));
  }));return items;
}
function pbdPlanDue_(records,today){return pbdPlanProjection_(pbdPlanItems_(),khbdRead_('SoKeHoachBaoDuong',khbdAutoColumns_()).rows,records,today,'installation');}
