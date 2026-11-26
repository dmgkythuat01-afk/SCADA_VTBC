/* Called inside saveEpMangIn_'s existing ScriptLock, before/after appending EpMangIn. */
function epViPrepare_(ss,ids,now) {
  const sheet=ss.getSheetByName('KetQuaLapVi');if(!sheet)throw Error('Không tìm thấy sheet KetQuaLapVi.');
  let range=sheet.getDataRange(),matrix=range.getValues(),headers=matrix[0].map(v=>String(v).trim());
  for(const key of ['IdThungDungVi','soLuongViDaLap'])if(headers.filter(h=>h===key).length!==1)throw Error('KetQuaLapVi thiếu hoặc trùng cột '+key);
  const missing=['daXuat','thoiGianXuat'].filter(k=>!headers.includes(k));
  if(missing.length){const needed=headers.length+missing.length;if(needed>sheet.getMaxColumns())sheet.insertColumnsAfter(sheet.getMaxColumns(),needed-sheet.getMaxColumns());sheet.getRange(1,headers.length+1,1,missing.length).setValues([missing]);range=sheet.getDataRange();matrix=range.getValues();headers=matrix[0].map(v=>String(v).trim());}
  for(const key of ['daXuat','thoiGianXuat'])if(headers.filter(h=>h===key).length!==1)throw Error('KetQuaLapVi trùng cột '+key);
  const idCol=headers.indexOf('IdThungDungVi'),qtyCol=headers.indexOf('soLuongViDaLap'),issuedCol=headers.indexOf('daXuat'),timeCol=headers.indexOf('thoiGianXuat'),formulas=range.getFormulas(),updates=[];
  const qty=(v,id)=>{const n=String(v??'').trim()===''?0:Number(String(v).replace(/,/g,''));if(!Number.isSafeInteger(n)||n<0)throw Error('Số lượng vỉ không hợp lệ của thùng '+id);return n;};
  [...new Set(ids.map(id=>String(id||'').trim()))].forEach(id=>{
    const matches=[];for(let i=1;i<matrix.length;i++)if(String(matrix[i][idCol]||'').trim()===id)matches.push(i);
    if(!id||!matches.length)throw Error('Không tìm thấy thùng '+id+' trong KetQuaLapVi.');if(matches.length!==1)throw Error('Trùng IdThungDungVi trong KetQuaLapVi: '+id);
    const index=matches[0],row=matrix[index],remaining=qty(row[qtyCol],id),issued=qty(row[issuedCol],id);if(!remaining)return;
    const total=remaining+issued;if(!Number.isSafeInteger(total))throw Error('Số lượng vỉ không hợp lệ của thùng '+id);
    const from=Math.min(qtyCol,issuedCol,timeCol),to=Math.max(qtyCol,issuedCol,timeCol),cells=row.slice(from,to+1).map((v,j)=>formulas[index]?.[from+j]||v);
    cells[qtyCol-from]=0;cells[issuedCol-from]=total;cells[timeCol-from]=row[timeCol]||now;
    updates.push({row:index+1,column:from+1,cells});
  });return {sheet,updates};
}
function epViApply_(batch){batch.updates.forEach(u=>batch.sheet.getRange(u.row,u.column,1,u.cells.length).setValues([u.cells]));return {exportedContainers:batch.updates.length};}
function epViLocationUpdates_(sheet,body){
  const matrix=sheet.getDataRange().getValues(),headers=matrix[0].map(v=>String(v).trim()),index={};
  ['IdThungDungVi','IdLapVi','soLuongViDaLap'].forEach(k=>{if(headers.filter(h=>h===k).length!==1)throw Error('KetQuaLapVi thiếu hoặc trùng cột '+k);index[k]=headers.indexOf(k);});
  if(headers.filter(h=>h==='daXuat').length>1)throw Error('KetQuaLapVi trùng cột daXuat');index.daXuat=headers.indexOf('daXuat');
  const locations=headers.map((h,i)=>['vitriKho','viTriKho'].includes(h)?i:-1).filter(i=>i>=0);if(locations.length!==1)throw Error('KetQuaLapVi thiếu hoặc trùng cột vị trí kho');index.vitriKho=locations[0];
  const idLapVi=String(body.IdLapVi||'').trim(),items=body.items,seen=new Set(),updates=[];
  if(!idLapVi||!Array.isArray(items)||!items.length)throw Error('Thiếu kế hoạch hoặc danh sách thùng.');
  const planRows=matrix.slice(1).map((r,i)=>({r,row:i+2})).filter(v=>String(v.r[index.IdLapVi]||'').trim()===idLapVi&&String(v.r[index.IdThungDungVi]||'').trim());
  items.forEach(item=>{
    const id=String(item.IdThungDungVi||'').trim(),matches=planRows.filter(v=>String(v.r[index.IdThungDungVi]).trim()===id),qty=Number(item.soLuongViDaLap);
    if(!id||seen.has(id)||matches.length!==1)throw Error('Mã thùng không hợp lệ hoặc trùng: '+id);seen.add(id);
    if(!Number.isSafeInteger(qty)||qty<0)throw Error('Số lượng vỉ không hợp lệ: '+id);
    const {r,row}=matches[0],current=Number(r[index.soLuongViDaLap]||0),issued=index.daXuat<0?0:Number(r[index.daXuat]||0);
    if(!Number.isSafeInteger(current)||current<0||!Number.isSafeInteger(issued)||issued<0)throw Error('Dữ liệu tồn không hợp lệ: '+id);
    if(issued>0&&qty!==current)throw Error('Thùng '+id+' đã xuất ép màng. Tải lại dữ liệu trước khi lưu.');
    const text=String(item.vitriKho||'').trim();updates.push({row,qty,location:/^[=+\-@]/.test(text)?"'"+text:text});
  });if(items.length!==planRows.length)throw Error('Phải gửi đủ toàn bộ thùng của kế hoạch.');return {sheet,index,updates};
}
function epViSaveLocations_(body){
  const lock=LockService.getScriptLock();lock.waitLock(30000);try{
    const sheet=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('KetQuaLapVi');if(!sheet)throw Error('Không tìm thấy KetQuaLapVi.');
    const batch=epViLocationUpdates_(sheet,body);
    batch.updates.forEach(u=>{sheet.getRange(u.row,batch.index.soLuongViDaLap+1).setValue(u.qty);sheet.getRange(u.row,batch.index.vitriKho+1).setValue(u.location);});
    SpreadsheetApp.flush();return {success:true,updatedRows:batch.updates.length};
  }finally{lock.releaseLock();}
}
