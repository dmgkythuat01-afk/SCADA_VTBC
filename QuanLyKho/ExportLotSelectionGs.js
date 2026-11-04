function exportLotMaterialKey_(line) {
  return JSON.stringify([line.maNguyenLieu,line.tenNguyenLieu,line.MaKeToan].map(value=>normalizeText_(value).toLowerCase()));
}
function exportLotRevision_(line) {
  return JSON.stringify([line.PhieuXuatId,line.KeHoachId,line.maNguyenLieu,line.tenNguyenLieu,line.MaKeToan,line.donViCanXuat].map(normalizeText_));
}
function buildExportLotPreview_(groups) {
  const cache=new Map();
  groups.forEach(group=>{
    const remaining=new Map();
    group.items.forEach(item=>{
      const key=exportLotMaterialKey_(item);
      if(!cache.has(key))cache.set(key,getApprovedStockLotsForExport_(item.maNguyenLieu,item.tenNguyenLieu,item.MaKeToan));
      const lots=cache.get(key);
      item.lotOptions=lots.map(lot=>({Id:lot.Id,LotNo:lot.LotNo,MaKeToan:item.MaKeToan,hanSuDung:lot.hanSuDung,ngayNhap:lot.ngayNhap,donVi:lot.donVi,qtyKg:lot.qtyKg,available:roundQty_(fromKg_(lot.qtyKg,item.donViCanXuat))}));
      let need=toKg_(Number(item.khoiLuongXuatThucTe)>0?Number(item.khoiLuongXuatThucTe):Number(item.khoiLuongCanXuat),item.donViCanXuat);
      item.allocations=[];
      lots.forEach(lot=>{
        if(!remaining.has(lot.Id))remaining.set(lot.Id,lot.qtyKg);
        const taken=Math.min(Math.max(0,need),remaining.get(lot.Id));
        if(taken>0.000001){item.allocations.push({id:lot.Id,quantity:roundQty_(fromKg_(taken,item.donViCanXuat))});remaining.set(lot.Id,remaining.get(lot.Id)-taken);need-=taken;}
      });
      item.revision=exportLotRevision_(item);item.duSoLuong=need<=0.000001;
    });
  });
  return groups;
}
function validateExportLotSelections_(lines,provider) {
  const stock=new Map(),cache=new Map(),prepared=[];
  lines.forEach(line=>{
    const key=exportLotMaterialKey_(line);
    if(!normalizeText_(line.MaKeToan))throw new Error('Phiếu chưa có mã kế toán.');
    if(!cache.has(key))cache.set(key,provider(line));
    const lots=cache.get(key),eligible=new Map();
    lots.forEach(lot=>{if(eligible.has(lot.Id))throw new Error('Trùng Id kho: '+lot.Id);eligible.set(lot.Id,lot);});
    if(!Array.isArray(line.allocations)||!line.allocations.length)throw new Error('Dòng '+line.rowNumber+': chưa chọn lô xuất.');
    if(!isFinite(line.khoiLuongCanXuat)||line.khoiLuongCanXuat<=0||!isFinite(line.khoiLuongXuatThucTe)||line.khoiLuongXuatThucTe<=0)throw new Error('Khối lượng xuất phải lớn hơn 0.');
    const seen=new Set(),parts=[];let totalKg=0;
    line.allocations.forEach(selection=>{
      const id=normalizeText_(selection.id),qty=Number(selection.quantity),lot=eligible.get(id);
      if(!lot)throw new Error('Lô '+id+' không còn đủ điều kiện hoặc không thuộc đúng nguyên liệu + mã kế toán '+line.MaKeToan+'. Hãy tải lại phiếu.');
      if(seen.has(id))throw new Error('Không chọn trùng một lô trong cùng dòng.');seen.add(id);
      if(!isFinite(qty)||qty<=0)throw new Error('Số lượng từng lô phải lớn hơn 0.');
      const kg=toKg_(qty,line.donViCanXuat);totalKg+=kg;
      if(stock.has(id)&&stock.get(id).lot.rowNumber!==lot.rowNumber)throw new Error('Trùng Id kho giữa các dòng kho: '+id);
      if(!stock.has(id))stock.set(id,{lot,remainingNative:Number(lot.khoiLuongNhap)});
      const state=stock.get(id),beforeQty=state.remainingNative;
      const nativeQty=Math.round(fromKg_(kg,lot.donVi)*1e12)/1e12;
      if(nativeQty<=0||nativeQty>beforeQty+0.000001)throw new Error('Lô '+(lot.LotNo||id)+' không đủ tồn cho phân bổ đã chọn. Hãy tải lại phiếu.');
      state.remainingNative=Math.round(Math.max(0,beforeQty-nativeQty)*1e12)/1e12;
      const deducted=Math.round((beforeQty-state.remainingNative)*1e12)/1e12;
      if(Math.abs(toKg_(deducted,lot.donVi)-kg)>0.000001)throw new Error('Số lượng lô không biểu diễn được chính xác trong đơn vị kho.');
      parts.push({id,lot,beforeQty,nativeQty:deducted,unit:lot.donVi,exportQty:qty});
    });
    if(Math.abs(totalKg-toKg_(line.khoiLuongXuatThucTe,line.donViCanXuat))>0.000001)throw new Error('Dòng '+line.rowNumber+': tổng phân bổ lô phải bằng khối lượng thực xuất.');
    prepared.push({...line,parts});
  });
  return {lines:prepared,stock};
}

function approveExportWithLots_(token,payload,whole) {
  const session=requireInventoryRole_(token),lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet=getPhieuXuatSheet_(),values=sheet.getDataRange().getValues();
    const headers=values[0].map(normalizeText_),idx=getPhieuXuatHeaderIndex_(headers);
    const input=whole?(payload&&payload.items):[payload];
    if(!Array.isArray(input)||!input.length)throw new Error('Chưa có dòng phiếu để duyệt.');
    const clients=new Map();input.forEach(item=>{
      const row=Number(item&&item.rowNumber);if(!Number.isInteger(row)||row<2||clients.has(row))throw new Error('Dòng phiếu không hợp lệ hoặc trùng.');clients.set(row,item);
    });
    const active=getActivePlanIdsForExport_(getSpreadsheet_()),lines=[];
    values.slice(1).forEach((row,offset)=>{
      const rowNumber=offset+2;
      const relevant=whole?normalizeText_(row[idx.PhieuXuatId])===normalizeText_(payload.phieuXuatId)&&isPendingExportStatus_(row[idx.trangThaiPheDuyet]):clients.has(rowNumber);
      if(!relevant)return;
      const client=clients.get(rowNumber);if(!client)throw new Error('Thiếu phân bổ cho dòng '+rowNumber+'.');
      if(!isPendingExportStatus_(row[idx.trangThaiPheDuyet]))throw new Error('Dòng phiếu đã được xử lý.');
      const line={rowNumber};['PhieuXuatId','KeHoachId','maNguyenLieu','tenNguyenLieu','MaKeToan','donViCanXuat'].forEach(field=>{line[field]=normalizeText_(row[idx[field]]);});
      if(client.revision!==exportLotRevision_(line))throw new Error('Thông tin phiếu/mã kế toán đã thay đổi. Hãy tải lại phiếu.');
      if(!active.has(line.KeHoachId))throw new Error('Kế hoạch không còn Hoạt động.');
      Object.assign(line,{khoiLuongCanXuat:Number(client.khoiLuongCanXuat),khoiLuongXuatThucTe:Number(client.khoiLuongXuatThucTe),cachXuat:normalizeText_(client.cachXuat),allocations:client.allocations});lines.push(line);
    });
    if(lines.length!==clients.size||!lines.length)throw new Error('Phiếu đã thay đổi hoặc không còn dòng chờ duyệt. Hãy tải lại.');
    const prepared=validateExportLotSelections_(lines,line=>getApprovedStockLotsForExport_(line.maNguyenLieu,line.tenNguyenLieu,line.MaKeToan));
    const kho=getSheet_(SHEET_KHO_NGUYEN_LIEU),kIdx=getKhoHeaderIndex_(kho.getDataRange().getValues()[0].map(normalizeText_));
    let ledgerColumn=headers.indexOf('chiTietTruKho')+1;
    if(!ledgerColumn){ledgerColumn=sheet.getLastColumn()+1;sheet.getRange(1,ledgerColumn).setValue('chiTietTruKho');}
    let perLotColumn=headers.indexOf('khoiLuongXuatThucTeTheoLotNo')+1;
    if(!perLotColumn){perLotColumn=sheet.getLastColumn()+1;sheet.getRange(1,perLotColumn).setValue('khoiLuongXuatThucTeTheoLotNo');}
    const time=nowText_();
    prepared.stock.forEach(state=>{
      kho.getRange(state.lot.rowNumber,kIdx.khoiLuongNhap+1).setValue(state.remainingNative);
      if(state.remainingNative<=0.000001)kho.getRange(state.lot.rowNumber,kIdx.trangThai+1).setValue('Đã xuất hết');
    });
    prepared.lines.forEach(line=>{
      updateExportLineFields_(sheet,idx,line.rowNumber,line.khoiLuongCanXuat,line.khoiLuongXuatThucTe,line.cachXuat,true);
      const ids=line.parts.map(part=>part.id);ids.beforeLots=line.parts.map(part=>({...part.lot,khoiLuongNhap:part.beforeQty}));
      fillExportStockDetails_(sheet,idx,line.rowNumber,ids);
      // Same order as LotNo; quantities use donViCanXuat, matching the total actual issue.
      sheet.getRange(line.rowNumber,perLotColumn).setValue(line.parts.map(part=>String(part.exportQty)).join(", "));
      sheet.getRange(line.rowNumber,ledgerColumn).setValue(JSON.stringify(line.parts.map(part=>({IdKho:part.id,khoiLuong:part.nativeQty,donVi:part.unit}))));
      sheet.getRange(line.rowNumber,idx.trangThaiPheDuyet+1).setValue('Đã phê duyệt');
      sheet.getRange(line.rowNumber,idx.nguoiPheDuyet+1).setValue(session.useName||'');sheet.getRange(line.rowNumber,idx.thoiGianDuyet+1).setValue(time);
    });
    return {success:true,message:'Đã phê duyệt '+lines.length+' dòng và trừ đúng các lô đã chọn.',phieuXuatChoDuyet:getPendingExportRequests_(),tonKho:getApprovedInventoryItems_(),chuaDuyet:getPendingInventoryItems_()};
  }finally{lock.releaseLock();}
}
