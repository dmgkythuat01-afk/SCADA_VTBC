/** Change only the current balance of one approved stock record. */
function updateCurrentStockQuantity(token,payload){
  const session=requireInventoryRole_(token);payload=payload||{};
  const id=String(payload.Id||'').trim();if(!id)throw Error('Thiếu mã kho cần sửa.');
  function quantity(value){if(value===null||value===undefined||String(value).trim()==='')throw Error('Vui lòng nhập khối lượng.');const n=Number(value);if(!Number.isFinite(n)||n<0||n>Number.MAX_SAFE_INTEGER)throw Error('Khối lượng phải là số từ 0 trở lên.');return n;}
  const next=quantity(payload.quantity),expected=quantity(payload.expectedQuantity),lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const sheet=getSheet_('KhoNguyenLieu'),values=sheet.getDataRange().getValues(),headers=values[0].map(v=>String(v).trim()),index={};
    ['Id','khoiLuongNhap','trangThai'].forEach(k=>{if(headers.filter(h=>h===k).length!==1)throw Error('KhoNguyenLieu thiếu hoặc trùng cột '+k);index[k]=headers.indexOf(k);});
    const matches=[];for(let i=1;i<values.length;i++)if(String(values[i][index.Id]||'').trim()===id)matches.push(i);
    if(!matches.length)throw Error('Không tìm thấy mã kho '+id+'.');if(matches.length!==1)throw Error('Mã kho bị trùng: '+id);
    const rowIndex=matches[0],row=values[rowIndex];if(String(row[index.trangThai]||'').trim().toLowerCase()!=='đã phê duyệt')throw Error('Chỉ sửa khối lượng kho đã phê duyệt.');
    const usage=headers.indexOf('trangThaiNguyenLieu');if(usage>=0&&typeof isUsableNguyenLieuStatus_==='function'&&!isUsableNguyenLieuStatus_(row[usage]))throw Error('Nguyên liệu không còn ở trạng thái sử dụng. Tải lại tồn kho.');
    const current=quantity(row[index.khoiLuongNhap]);if(current!==expected)throw Error('Tồn kho đã thay đổi từ '+expected+' thành '+current+'. Vui lòng tải lại tồn kho trước khi sửa.');
    if(current!==next){sheet.getRange(rowIndex+1,index.khoiLuongNhap+1).setValue(next);SpreadsheetApp.flush();console.info('Sửa khối lượng tồn kho',JSON.stringify({Id:id,before:current,after:next,user:session?.useName||''}));}
    return {success:true,Id:id,quantity:next,message:'Đã cập nhật khối lượng tồn kho.'};
  }finally{lock.releaseLock();}
}
