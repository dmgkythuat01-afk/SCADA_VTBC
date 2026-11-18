const MATERIAL_CATALOG_LABELS = {
  maNguyenLieu:'Mã nguyên liệu',tenNguyenLieu:'Tên nguyên liệu',MaKeToan:'Mã kế toán',
  nhaCungCap1:'Nhà sản xuất',nhaCungCap2:'Nhà sản xuất 2',nhaCungCap3:'Nhà sản xuất 3',
  loaiNguyenLieu:'Loại nguyên liệu',donViKho:'Đơn vị kho',quyCachDatHang:'Quy cách đặt hàng',
  tonAnToan:'Tồn an toàn',soNgayVeKhoMacDinh:'Số ngày về kho mặc định',nhaCungCapChinh:'Nhà cung cấp chính',
  trangThai:'Trạng thái',ghiChu:'Ghi chú',heSoQuyDoiKho:'Hệ số quy đổi kho',doViTinhToan:'Đơn vị tính toán',nhaCungCapCap:'Nhà cung cấp'
};
function materialCatalogVersion_(headers,cells){
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify([headers,cells]),Utilities.Charset.UTF_8).map(v=>('0'+((v+256)%256).toString(16)).slice(-2)).join('');
}
function materialCatalogGrid_(){
  const sheet=getSheet_('NguyenLieu'),matrix=sheet.getDataRange().getValues(),headers=matrix[0].map(v=>String(v).trim()),seen=new Set();
  headers.filter(Boolean).forEach(k=>{if(seen.has(k)||['_row','_version','__proto__','constructor','prototype'].includes(k))throw Error('NguyenLieu có tên cột trùng hoặc không hợp lệ: '+k);seen.add(k);});
  ['maNguyenLieu','tenNguyenLieu','nhaCungCap1'].forEach(k=>{if(!seen.has(k))throw Error('NguyenLieu thiếu cột '+k);});
  const rows=[];matrix.slice(1).forEach((cells,i)=>{if(!cells.some(v=>v!==''&&v!==null))return;const row={_row:i+2,_version:materialCatalogVersion_(headers,cells)};headers.forEach((k,j)=>{if(k)row[k]=Object.prototype.toString.call(cells[j])==='[object Date]'?formatDateValue_(cells[j]):cells[j]??'';});rows.push(row);});
  return {sheet,matrix,headers,rows};
}
function materialCatalogPayload_(grid,withLookup){
  return {success:true,headers:grid.headers.filter(Boolean),labels:MATERIAL_CATALOG_LABELS,rows:grid.rows,...(withLookup?{activeMaterials:getNguyenLieuList_()}: {})};
}
function getMaterialCatalog(token){requireInventoryRole_(token);return materialCatalogPayload_(materialCatalogGrid_(),false);}
function materialCatalogCurrent_(grid,payload){
  const row=Number(payload.row);if(!Number.isInteger(row)||row<2)throw Error('Dòng nguyên liệu không hợp lệ.');
  const current=grid.rows.find(r=>r._row===row);if(!current||!payload.version||current._version!==payload.version)throw Error('Dữ liệu đã thay đổi. Vui lòng tải lại danh mục trước khi sửa hoặc xóa.');return current;
}
function materialCatalogKey_(row){return JSON.stringify(['maNguyenLieu','MaKeToan','nhaCungCap1'].map(k=>String(row[k]??'').normalize('NFC').trim().toLocaleLowerCase('vi')));}
function saveMaterialCatalog(token,payload){
  requireInventoryRole_(token);payload=payload||{};const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const grid=materialCatalogGrid_(),old=payload.row?materialCatalogCurrent_(grid,payload):null,input=payload.values;
    if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Thiếu dữ liệu nguyên liệu.');
    const values=Object.fromEntries(grid.headers.filter(Boolean).map(k=>[k,old?old[k]:'']));
    Object.keys(input).forEach(k=>{if(!grid.headers.includes(k))throw Error('Cột không hợp lệ: '+k);values[k]=String(input[k]??'').trim();if(values[k].length>49000)throw Error('Nội dung quá dài: '+k);});
    if(!String(values.maNguyenLieu).trim()||!String(values.tenNguyenLieu).trim())throw Error('Vui lòng nhập mã và tên nguyên liệu.');
    ['tonAnToan','soNgayVeKhoMacDinh','heSoQuyDoiKho'].forEach(k=>{if(!grid.headers.includes(k)||String(values[k]).trim()==='')return;const n=Number(values[k]);if(!Number.isFinite(n)||n<0||(k==='heSoQuyDoiKho'&&n===0)||(k==='soNgayVeKhoMacDinh'&&!Number.isInteger(n)))throw Error((MATERIAL_CATALOG_LABELS[k]||k)+' không hợp lệ.');values[k]=n;});
    const key=materialCatalogKey_(values);if((!old||materialCatalogKey_(old)!==key)&&grid.rows.some(r=>(!old||r._row!==old._row)&&materialCatalogKey_(r)===key))throw Error('Đã tồn tại nguyên liệu trùng mã nguyên liệu, mã kế toán và nhà sản xuất.');
    const safe=v=>typeof v==='string'&&/^[=+\-@]/.test(v)?"'"+v:v;
    if(old){grid.headers.forEach((k,j)=>{if(!k||!Object.prototype.hasOwnProperty.call(input,k)||String(old[k]??'')===String(values[k]??''))return;const cell=grid.sheet.getRange(old._row,j+1);if(['maNguyenLieu','MaKeToan'].includes(k))cell.setNumberFormat('@');cell.setValue(safe(values[k]));});}
    else{const row=grid.sheet.getLastRow()+1;if(row>grid.sheet.getMaxRows())grid.sheet.insertRowsAfter(grid.sheet.getMaxRows(),row-grid.sheet.getMaxRows());['maNguyenLieu','MaKeToan'].forEach(k=>{const j=grid.headers.indexOf(k);if(j>=0)grid.sheet.getRange(row,j+1).setNumberFormat('@');});grid.sheet.getRange(row,1,1,grid.headers.length).setValues([grid.headers.map(k=>k?safe(values[k]):'')]);}
    SpreadsheetApp.flush();return materialCatalogPayload_(materialCatalogGrid_(),true);
  }finally{lock.releaseLock();}
}
function deleteMaterialCatalog(token,payload){
  requireInventoryRole_(token);const lock=LockService.getScriptLock();lock.waitLock(30000);try{const grid=materialCatalogGrid_(),row=materialCatalogCurrent_(grid,payload||{});grid.sheet.deleteRow(row._row);SpreadsheetApp.flush();return materialCatalogPayload_(materialCatalogGrid_(),true);}finally{lock.releaseLock();}
}
