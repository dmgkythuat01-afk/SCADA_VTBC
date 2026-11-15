const KHBD_AUTO_EXTRA=['loaiBanGhi','maSoCha','tenMay','maThietBi','tenThietBi','danhMucCanKiemTra','congViec','tanSuat',...Array.from({length:12},(_,i)=>'thang'+(i+1)),'danhMucSo','duLieuThuCongCu','nguonDongBo','trangThaiDong','ngayLichSuBanDau','mocLichSuBanDau'];
function khbdAutoColumns_(){return KHBD_COLUMNS.concat(KHBD_AUTO_EXTRA);}
function khbdAutoSetup_(){
  const ss=adminWorkbook_();let sheet=ss.getSheetByName('SoKeHoachBaoDuong');
  if(!sheet)sheet=ss.insertSheet('SoKeHoachBaoDuong');
  const headers=sheet.getLastColumn()?sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(v=>String(v).trim()):[],missing=khbdAutoColumns_().filter(k=>!headers.includes(k));
  if(missing.length){const end=headers.length+missing.length;if(end>sheet.getMaxColumns())sheet.insertColumnsAfter(sheet.getMaxColumns(),end-sheet.getMaxColumns());sheet.getRange(1,headers.length+1,1,missing.length).setValues([missing]).setFontWeight('bold').setBackground('#dcefe6');sheet.setFrozenRows(1);SpreadsheetApp.flush();}
  return {sheet:'SoKeHoachBaoDuong',addedColumns:missing};
}
function khbdAutoEncode_(value){
  const json=JSON.stringify(value);if(json.length<=45000)return json;
  const packed='gz:'+Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(json,'application/json')).getBytes());
  if(packed.length>45000)throw Error('Dữ liệu sổ vượt giới hạn lưu trữ.');return packed;
}
function khbdAutoDecode_(value,fallback){const raw=String(value||'');if(!raw)return fallback;return JSON.parse(raw.startsWith('gz:')?Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(raw.slice(3)))).getDataAsString('UTF-8'):raw);}
function khbdAutoDetailRows_(selection,catalog,values,seeds){
  const rows=[];
  catalog.groups.forEach(g=>g.devices.forEach(d=>{
    const add=(c,a)=>{const key=a?a.key:adminHash_(JSON.stringify([g.machine,d.code,'empty'])),months=a?values[a.key]:Array(12).fill('');rows.push({maSo:'CTKHBD:'+adminHash_(JSON.stringify([selection.id,key])),loaiBanGhi:'ChiTiet',maSoCha:selection.id,nam:String(selection.year),tenXuong:selection.workshop,boPhanDanhGia:selection.department,tenMay:g.machine,maThietBi:d.code,tenThietBi:d.name,danhMucCanKiemTra:c?c.name:'',congViec:a?a.name:'',tanSuat:a?a.frequency:'',ngayLichSuBanDau:a?(seeds?.[a.key]||''):'',noiDungThang:JSON.stringify(months),...Object.fromEntries(months.map((v,i)=>['thang'+(i+1),v])),nguonDongBo:'PhieuBaoDuong',trangThaiDong:'Đang dùng'});};
    if(!d.categories.length)add(null,null);else d.categories.forEach(c=>c.actions.forEach(a=>add(c,a)));
  }));return rows;
}
function khbdAutoPersist_(grid,records){
  const columns=khbdAutoColumns_(),rowsById=new Map();grid.rows.forEach(r=>{if(rowsById.has(r.maSo))throw Error('Trùng mã dòng trong SoKeHoachBaoDuong: '+r.maSo);rowsById.set(r.maSo,r);});
  const matrix=grid.matrix||grid.sheet.getDataRange().getValues(),updates=[],appends=[];
  records.forEach(record=>{
    const old=rowsById.get(record.maSo),fields=Object.keys(record).filter(k=>columns.includes(k));
    if(old&&fields.every(k=>String(old[k]||'')===String(record[k]||'')))return;
    const cells=old?(matrix[old._row-1]||grid.headers.map(()=>'')).slice():grid.headers.map(()=>'');
    fields.forEach(k=>{const value=String(record[k]??'');if(value.length>49000)throw Error('Ô dữ liệu quá dài: '+k);cells[grid.headers.indexOf(k)]=/^[=+\-@]/.test(value)?"'"+value:value;});
    if(old)updates.push({row:old._row,cells});else appends.push(cells);
  });
  const owned=grid.headers.map((key,index)=>columns.includes(key)?index:-1).filter(i=>i>=0);
  const write=(start,rows)=>{for(let i=0;i<owned.length;){let end=i+1;while(end<owned.length&&owned[end]===owned[end-1]+1)end++;grid.sheet.getRange(start,owned[i]+1,rows.length,end-i).setNumberFormat('@').setValues(rows.map(cells=>cells.slice(owned[i],owned[end-1]+1)));i=end;}};
  updates.sort((a,b)=>a.row-b.row);for(let i=0;i<updates.length;){let end=i+1;while(end<updates.length&&updates[end].row===updates[end-1].row+1)end++;write(updates[i].row,updates.slice(i,end).map(r=>r.cells));i=end;}
  if(appends.length){const start=Math.max(2,grid.sheet.getLastRow()+1),needed=start+appends.length-1-grid.sheet.getMaxRows();if(needed>0)grid.sheet.insertRowsAfter(grid.sheet.getMaxRows(),needed);write(start,appends);}
  if(updates.length||appends.length)SpreadsheetApp.flush();return {updated:updates.length,added:appends.length};
}
