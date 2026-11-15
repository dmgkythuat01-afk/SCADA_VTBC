const KHBD_SOURCE_COLUMNS=['tenXuong','tenMay','maThietBi','tenThietBi','danhMucCanKiemTra','tanSuatThayMoi','tanSuatBaoDuong','boPhanDanhGia','loaiSoKHDB','ngayBaoDuongGanNhat','ngayThayMoiGanNhat'];
const KHBD_COLUMNS=['maSo','nam','tenXuong','boPhanDanhGia','phienBan','noiDungThang','nguoiCapNhat','thoiGianCapNhat','maThaoTac'];
function khbdRead_(name,columns,create) {
  const ss=adminWorkbook_();let sheet=ss.getSheetByName(name);
  if(!sheet&&create){sheet=ss.insertSheet(name);sheet.getRange(1,1,1,columns.length).setValues([columns]).setFontWeight('bold').setBackground('#dcefe6');sheet.setFrozenRows(1);}
  if(!sheet)throw Error('Không tìm thấy sheet '+name);
  const values=sheet.getDataRange().getValues(),headers=values[0].map(v=>String(v).trim());
  columns.forEach(k=>{if(headers.filter(h=>h===k).length!==1)throw Error(name+' thiếu hoặc trùng cột '+k);});
  return {sheet,headers,matrix:values,rows:values.slice(1).map((cells,i)=>Object.assign({_row:i+2},Object.fromEntries(columns.map(k=>[k,['ngayBaoDuongGanNhat','ngayThayMoiGanNhat'].includes(k)?khbdHistoryDate_(cells[headers.indexOf(k)]):String(cells[headers.indexOf(k)]??'').trim()])))).filter(r=>columns.some(k=>r[k]))};
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
      if(!r.danhMucCanKiemTra)return;const key=adminHash_(JSON.stringify([deviceKey,adminNorm_(r.danhMucCanKiemTra)]));
      if(categoryKeys.has(key))throw Error('DanhMucSoKH trùng danh mục: '+d.maThietBi+' / '+r.danhMucCanKiemTra);categoryKeys.add(key);
      const type=maintenanceNorm_(r.loaiSoKHDB||'Cả 2');
      if(!['ca 2','thay moi','bao duong'].includes(type)||(r.loaiSoKHDB&&!configuredTypes.has(type)))throw Error('loaiSoKHDB không hợp lệ hoặc chưa có trong ThamSoHeThong: '+d.maThietBi+' / '+r.danhMucCanKiemTra);
      const actions=[];
      if(type!=='bao duong')actions.push({key:key+':replace',name:'Thay mới',frequency:r.tanSuatThayMoi,historyDate:khbdHistoryDate_(r.ngayThayMoiGanNhat)});
      if(type!=='thay moi')actions.push({key:key+':maintain',name:'Bảo dưỡng',frequency:r.tanSuatBaoDuong,historyDate:khbdHistoryDate_(r.ngayBaoDuongGanNhat)});
      categories.push({key,name:r.danhMucCanKiemTra,loaiSoKHDB:r.loaiSoKHDB||'Cả 2',actions});
    });return {code:d.maThietBi,name:d.tenThietBi,categories};
  })}));
  return {groups,version:adminHash_(JSON.stringify(groups)),sourceCount:source.length};
}
function khbdPayload_(user,p) {return khbdAutoLoad_(user,p);}
function khbdSave_(){throw Error('Sổ tự đồng bộ từ phiếu Hoàn thành, không cho nhập hoặc lưu thủ công.');}
function maintenancePlanBookApi(token,action,payload) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);adminBeginRequest_();mobileWorkResetContext_();
  try{const user=mobileWorkIdentity_(token),p=payload||{};
    if(action==='options')return {workshops:readAdminRows_('DanhMucXuong').map(r=>r.tenXuong).filter(Boolean),machines:readAdminRows_('DanhMucMay').map(r=>({workshop:r.tenXuong,machine:r.tenMay})),year:Number(maintenanceToday_().slice(0,4))};
    if(action==='load')return khbdPayload_(user,p);
    if(action==='save')return khbdSave_(user,p);
    throw Error('Thao tác sổ kế hoạch không hợp lệ.');
  }finally{lock.releaseLock();}
}
