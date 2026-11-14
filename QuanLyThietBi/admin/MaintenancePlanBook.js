const KHBD_SOURCE_COLUMNS=['tenXuong','tenMay','maThietBi','tenThietBi','danhMucCanKiemTra','tanSuatThayMoi','tanSuatBaoDuong','boPhanDanhGia','loaiSoKHDB'];
const KHBD_COLUMNS=['maSo','nam','tenXuong','boPhanDanhGia','phienBan','noiDungThang','nguoiCapNhat','thoiGianCapNhat','maThaoTac'];
function khbdRead_(name,columns,create) {
  const ss=SpreadsheetApp.openById(ADMIN_SHEET_ID);let sheet=ss.getSheetByName(name);
  if(!sheet&&create){sheet=ss.insertSheet(name);sheet.getRange(1,1,1,columns.length).setValues([columns]).setFontWeight('bold').setBackground('#dcefe6');sheet.setFrozenRows(1);}
  if(!sheet)throw Error('Không tìm thấy sheet '+name);
  const values=sheet.getDataRange().getValues(),headers=values[0].map(v=>String(v).trim());
  columns.forEach(k=>{if(headers.filter(h=>h===k).length!==1)throw Error(name+' thiếu hoặc trùng cột '+k);});
  return {sheet,headers,rows:values.slice(1).map((cells,i)=>Object.assign({_row:i+2},Object.fromEntries(columns.map(k=>[k,String(cells[headers.indexOf(k)]??'').trim()])))).filter(r=>columns.some(k=>r[k]))};
}
function khbdSelection_(p) {
  const year=Number(p.year),workshop=adminText_(p.workshop,500),department=maintenanceNorm_(p.department)==='co khi'?'Cơ khí':maintenanceNorm_(p.department)==='dien'?'Điện':'';
  if(!Number.isInteger(year)||year<2000||year>2100)throw Error('Năm phải từ 2000 đến 2100.');
  if(!department||!readAdminRows_('DanhMucXuong').some(r=>r.tenXuong===workshop))throw Error('Chọn xưởng và bộ phận đánh giá hợp lệ.');
  return {year,workshop,department,id:adminHash_(JSON.stringify([year,workshop,department]))};
}
function khbdCatalog_(s) {
  const configuredTypes=new Set(khbdRead_('ThamSoHeThong',['loaiSoKHDB']).rows.map(r=>maintenanceNorm_(r.loaiSoKHDB)).filter(Boolean));
  const source=khbdRead_('DanhMucSoKH',KHBD_SOURCE_COLUMNS).rows.filter(r=>r.tenXuong===s.workshop&&maintenanceNorm_(r.boPhanDanhGia)===maintenanceNorm_(s.department)),devices=readAdminRows_('DanhMucThietBi').filter(r=>r.tenXuong===s.workshop),machines=readAdminRows_('DanhMucMay').filter(r=>r.tenXuong===s.workshop).map(r=>r.tenMay);
  devices.forEach(d=>{if(!machines.includes(d.tenMay))machines.push(d.tenMay);});
  const seen=new Set(),groups=machines.map(machine=>({machine,devices:devices.filter(d=>d.tenMay===machine).map(d=>{
    const deviceKey=maintenanceDeviceKey_(d);if(seen.has(deviceKey))throw Error('Trùng thiết bị trong danh mục: '+d.maThietBi);seen.add(deviceKey);
    const categories=[],categoryKeys=new Set();source.filter(r=>maintenanceDeviceKey_(r)===deviceKey).forEach(r=>{
      if(!r.danhMucCanKiemTra)return;const key=adminHash_(JSON.stringify([deviceKey,maintenanceNorm_(r.danhMucCanKiemTra)]));
      if(categoryKeys.has(key))throw Error('DanhMucSoKH trùng danh mục: '+d.maThietBi+' / '+r.danhMucCanKiemTra);categoryKeys.add(key);
      const type=maintenanceNorm_(r.loaiSoKHDB||'Cả 2');
      if(!['ca 2','thay moi','bao duong'].includes(type)||(r.loaiSoKHDB&&!configuredTypes.has(type)))throw Error('loaiSoKHDB không hợp lệ hoặc chưa có trong ThamSoHeThong: '+d.maThietBi+' / '+r.danhMucCanKiemTra);
      const actions=[];
      if(type!=='bao duong')actions.push({key:key+':replace',name:'Thay mới',frequency:r.tanSuatThayMoi});
      if(type!=='thay moi')actions.push({key:key+':maintain',name:'Bảo dưỡng',frequency:r.tanSuatBaoDuong});
      categories.push({key,name:r.danhMucCanKiemTra,loaiSoKHDB:r.loaiSoKHDB||'Cả 2',actions});
    });return {code:d.maThietBi,name:d.tenThietBi,categories};
  })}));
  return {groups,version:adminHash_(JSON.stringify(groups)),sourceCount:source.length};
}
function khbdPayload_(user,p) {
  const selection=khbdSelection_(p),catalog=khbdCatalog_(selection),grid=khbdRead_('SoKeHoachBaoDuong',KHBD_COLUMNS,true),matches=grid.rows.filter(r=>r.maSo===selection.id);
  if(matches.length>1)throw Error('Trùng sổ kế hoạch; cần kiểm tra sheet SoKeHoachBaoDuong.');
  const row=matches[0],values=row?JSON.parse(row.noiDungThang||'{}'):{};
  return {...selection,...catalog,values,revision:Number(row?.phienBan||0),updatedBy:row?.nguoiCapNhat||'',updatedAt:row?.thoiGianCapNhat||'',canWrite:mobileWorkCapabilities_(user).technical};
}
function khbdSave_(user,p) {
  mobileWorkRequireTechnical_(user);const current=khbdPayload_(user,p),request=mobileWorkRequired_(p.requestId,'mã thao tác',100),grid=khbdRead_('SoKeHoachBaoDuong',KHBD_COLUMNS),old=grid.rows.find(r=>r.maSo===current.id);
  if(!p.values||typeof p.values!=='object'||Array.isArray(p.values))throw Error('Nội dung các tháng không hợp lệ.');
  const allowed=new Set(current.groups.flatMap(g=>g.devices.flatMap(d=>d.categories.flatMap(c=>c.actions.map(a=>a.key))))),values={...current.values};
  Object.keys(p.values).forEach(key=>{
    const months=p.values[key];if(!allowed.has(key)){
      if(JSON.stringify(months)!==JSON.stringify(current.values[key]))throw Error('Danh mục đã thay đổi. Tải lại sổ trước khi lưu.');return;
    }
    if(!Array.isArray(months)||months.length!==12||months.some(v=>typeof v!=='string'||v.length>200))throw Error('Mỗi dòng phải có 12 tháng, tối đa 200 ký tự/ô.');
    values[key]=months;
  });
  const json=JSON.stringify(values),fingerprint=adminHash_(json),receipt=old?JSON.parse(old.maThaoTac||'{}'):{};
  if(receipt.id===request&&receipt.user===user.email){if(receipt.fingerprint!==fingerprint)throw Error('Mã thao tác đã dùng cho nội dung khác.');return current;}
  if(current.revision!==Number(p.revision)||current.version!==p.version)throw Error('Sổ hoặc danh mục đã thay đổi. Tải lại trước khi lưu để tránh ghi đè.');
  if(json.length>45000)throw Error('Nội dung sổ vượt giới hạn 45.000 ký tự. Hãy rút gọn các ô tháng.');
  const record={maSo:current.id,nam:String(current.year),tenXuong:current.workshop,boPhanDanhGia:current.department,phienBan:String(current.revision+1),noiDungThang:json,nguoiCapNhat:user.name,thoiGianCapNhat:adminNow_(),maThaoTac:JSON.stringify({id:request,user:user.email,fingerprint})};
  const cells=old?grid.sheet.getRange(old._row,1,1,grid.headers.length).getValues()[0]:grid.headers.map(()=>'');
  KHBD_COLUMNS.forEach(k=>{const v=String(record[k]);cells[grid.headers.indexOf(k)]=/^[=+\-@]/.test(v)?"'"+v:v;});
  grid.sheet.getRange(old?old._row:Math.max(2,grid.sheet.getLastRow()+1),1,1,cells.length).setNumberFormat('@').setValues([cells]);SpreadsheetApp.flush();
  return {...current,values,revision:current.revision+1,updatedBy:record.nguoiCapNhat,updatedAt:record.thoiGianCapNhat};
}
function maintenancePlanBookApi(token,action,payload) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);mobileWorkResetContext_();
  try{const user=mobileWorkIdentity_(token),p=payload||{};
    if(action==='options')return {workshops:readAdminRows_('DanhMucXuong').map(r=>r.tenXuong).filter(Boolean),machines:readAdminRows_('DanhMucMay').map(r=>({workshop:r.tenXuong,machine:r.tenMay})),year:Number(maintenanceToday_().slice(0,4))};
    if(action==='load')return khbdPayload_(user,p);
    if(action==='save')return khbdSave_(user,p);
    throw Error('Thao tác sổ kế hoạch không hợp lệ.');
  }finally{lock.releaseLock();}
}
