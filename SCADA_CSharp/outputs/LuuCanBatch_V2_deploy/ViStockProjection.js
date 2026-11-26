function viStockQty_(value) {
  const text=String(value??'').trim(),number=text===''?0:Number(text.replace(/,/g,''));
  if(!Number.isSafeInteger(number)||number<0)throw Error('Số lượng vỉ không hợp lệ: '+text);
  return number;
}
function viStockProjection_(stock,plans) {
  const byPlan=new Map(),totals=new Map(),progress=new Map(),warnings=[];
  plans.forEach(p=>{const id=String(p.IdLapVi||'').trim();if(!id)return;const old=byPlan.get(id);if(old&&['maSanPham','tenSanPham','soLuongViKeHoach'].some(k=>String(old[k]||'')!==String(p[k]||'')))throw Error('Trùng IdLapVi có thông tin khác nhau: '+id);byPlan.set(id,p);});
  byPlan.forEach((p,id)=>progress.set(id,{IdLapVi:id,maSanPham:p.maSanPham||'',tenSanPham:p.tenSanPham||'',keHoach:viStockQty_(p.soLuongViKeHoach),daLap:0,daXuat:0,tonKho:0,trangThai:p.trangThai||''}));
  const seen=new Set(),unknown=new Set();
  const details=stock.map(r=>{
    const id=String(r.IdThungDungVi||'').trim(),planId=String(r.IdLapVi||'').trim();
    if(!id)throw Error('Dòng tồn kho thiếu IdThungDungVi.');if(seen.has(id))throw Error('Trùng IdThungDungVi: '+id);seen.add(id);
    const p=byPlan.get(planId),tonKho=viStockQty_(r.soLuongViDaLap),daXuat=viStockQty_(r.daXuat);
    if(!p&&!unknown.has(planId)){unknown.add(planId);warnings.push('Không tìm thấy kế hoạch '+(planId||'(trống)')+' để tra tên sản phẩm.');}
    const productKey=JSON.stringify(p?[p.maSanPham||'',p.tenSanPham||'']:['Chưa xác định',planId]),name=p?.tenSanPham||'Chưa xác định — '+(planId||'thiếu IdLapVi');
    if(!totals.has(productKey))totals.set(productKey,{productKey,maSanPham:p?.maSanPham||'',tenSanPham:name,tonKho:0,soThungConTon:0});
    const total=totals.get(productKey);total.tonKho+=tonKho;if(tonKho>0)total.soThungConTon++;
    if(!progress.has(planId))progress.set(planId,{IdLapVi:planId,maSanPham:'',tenSanPham:name,keHoach:0,daLap:0,daXuat:0,tonKho:0,trangThai:''});
    const pr=progress.get(planId);pr.daLap+=tonKho+daXuat;pr.daXuat+=daXuat;pr.tonKho+=tonKho;pr.productKey=productKey;
    return {...r,tenSanPham:name,maSanPham:p?.maSanPham||'',productKey,soLuongViDaLap:tonKho,daXuat};
  });
  return {details,totals:[...totals.values()],progress:[...progress.values()].map(r=>({...r,productKey:r.productKey||JSON.stringify([r.maSanPham,r.tenSanPham]),conCanLap:Math.max(0,r.keHoach-r.daLap)})),warnings};
}
function viStockRead_(name,required) {
  const sheet=getSheet_(name),values=sheet.getDataRange().getValues(),headers=values[0].map(v=>String(v).trim());
  required.forEach(k=>{if(headers.filter(h=>h===k).length!==1)throw Error(name+' thiếu hoặc trùng cột '+k);});
  return values.slice(1).filter(row=>row.some(v=>v!==''&&v!==null)).map(row=>Object.fromEntries(headers.filter(Boolean).map(k=>{const v=row[headers.indexOf(k)];return [k,Object.prototype.toString.call(v)==='[object Date]'?Utilities.formatDate(v,'Asia/Ho_Chi_Minh',k==='ngaySanXuat'?'dd/MM/yyyy':'dd/MM/yyyy HH:mm:ss'):v??''];})));
}
function getViStock(token) {
  requireAdmin_(token);
  const stock=viStockRead_('KetQuaLapVi',['IdThungDungVi','IdLapVi','soLuongViDaLap']),plans=viStockRead_('KeHoachLapViVTBC',['IdLapVi','tenSanPham']);
  return {success:true,...viStockProjection_(stock,plans)};
}
