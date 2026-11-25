function wEpRead_(name,required) {
  const sheet=getSheet_(name),values=sheet.getDataRange().getValues(),headers=values[0].map(v=>String(v).trim());
  (required||[]).forEach(h=>{if(headers.filter(x=>x===h).length!==1)throw Error(name+' thiếu hoặc trùng cột '+h);});
  return values.slice(1).map(row=>Object.fromEntries(headers.filter(Boolean).map(h=>[h,row[headers.indexOf(h)]??'']))).filter(r=>headers.some(h=>h&&r[h]!==''));
}
function wEpClosed_(p){return !!p.thoiGianHuy||/^(Hủy kế hoạch|Hủy|Đã hủy|Hoàn thành|Đã hoàn thành)$/i.test(String(p.trangThai||'').trim());}
function wEpSerialize_(value){if(Object.prototype.toString.call(value)==='[object Date]')return Utilities.formatDate(value,'Asia/Ho_Chi_Minh','dd/MM/yyyy HH:mm:ss');if(Array.isArray(value))return value.map(wEpSerialize_);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).map(k=>[k,wEpSerialize_(value[k])]));return value;}
function wEpPlans_(){
  const parents=wEpRead_('KeHoachEpMangIn',['STT','IdEpMangIn','phienBan']),details=wEpRead_('ChiTietKeHoachEpMangIn',['IdEpMangIn','phienBan','IdThungDungVi']),stock=wEpRead_('KetQuaLapVi',['IdThungDungVi','soLuongViDaLap']);
  const seen=new Set();parents.forEach(p=>{if(p.IdEpMangIn){if(seen.has(p.IdEpMangIn))throw Error('Trùng mã kế hoạch ép màng in.');seen.add(p.IdEpMangIn);}});
  return parents.filter(p=>p.IdEpMangIn&&!wEpClosed_(p)).map(p=>({...p,items:details.filter(d=>d.IdEpMangIn===p.IdEpMangIn&&Number(d.phienBan)===Number(p.phienBan)).map(d=>{const found=stock.filter(s=>s.IdThungDungVi===d.IdThungDungVi);return {...d,tonHienTai:found.length===1?found[0].soLuongViDaLap:null};})})).sort((a,b)=>Number(b.STT)-Number(a.STT));
}
function wEpVisible_(plans){return wEpSerialize_(plans.map(p=>({STT:p.STT,IdEpMangIn:p.IdEpMangIn,phienBan:p.phienBan,maSanPham:p.maSanPham,tenSanPham:p.tenSanPham,soLuongViKeHoach:p.soLuongViKeHoach,trangThai:p.trangThai,IdXuatEpMangIn:p.IdXuatEpMangIn||'',nguoiXuatEpMangIn:p.nguoiXuatEpMangIn||'',thoiGianXuatEpMangIn:p.thoiGianXuatEpMangIn||'',dangXuat:!!p.noiDungLenhXuat&&!p.IdXuatEpMangIn,items:p.items.map(d=>({IdThungDungVi:d.IdThungDungVi,ngaySanXuat:d.ngaySanXuat,viTriKho:d.viTriKho,tonHienTai:d.tonHienTai,soLuongViDaXuat:d.soLuongViDaXuat,trangThaiXuat:d.trangThaiXuat}))})));}
function getWorkerEpExportData(token){requireWorker_(token);return {success:true,plans:wEpVisible_(wEpPlans_())};}
function validateWorkerEpExportQr(token,payload){
  requireWorker_(token);const p=wEpPlans_().find(p=>p.IdEpMangIn===String(payload&&payload.IdEpMangIn||''));
  if(!p||p.IdXuatEpMangIn)throw Error('Kế hoạch không còn chờ xuất. Vui lòng tải lại.');
  if(Number(p.phienBan)!==Number(payload.phienBan))throw Error('Kế hoạch đã thay đổi. Vui lòng tải lại và quét lại.');
  const qr=String(payload.qr||'').trim().toLowerCase(),matches=p.items.filter(d=>String(d.IdThungDungVi).trim().toLowerCase()===qr);
  if(matches.length!==1)throw Error('QR thùng không thuộc danh sách PCN đã chọn cho kế hoạch này.');
  if(!p.noiDungLenhXuat&&(!Number.isSafeInteger(Number(matches[0].tonHienTai))||Number(matches[0].tonHienTai)<=0))throw Error('Thùng không còn tồn. Vui lòng tải lại.');
  return {success:true,matchedId:matches[0].IdThungDungVi};
}
function callEpWorkerApi_(action,payload,actor){
  const properties=PropertiesService.getScriptProperties(),url=properties.getProperty('VTBC_STOCK_API_URL'),key=properties.getProperty('VTBC_STOCK_API_TOKEN');if(!url||!key)throw Error('Chưa cấu hình API tồn vỉ.');
  const response=UrlFetchApp.fetch(url+'?action='+encodeURIComponent(action)+'&token='+encodeURIComponent(key),{method:'post',contentType:'application/json',payload:JSON.stringify({actor,payload}),muteHttpExceptions:true});
  let result;try{result=JSON.parse(response.getContentText());}catch(error){throw Error('Không đọc được phản hồi xuất thùng. Vui lòng thử lại.');}
  if(response.getResponseCode()!==200||!result.success)throw Error(result.message||'Không xử lý được yêu cầu.');return result;
}
function confirmWorkerEpExport(token,payload){const session=requireWorker_(token),result=callEpWorkerApi_('exportEpMangInPlan',payload,session.useName);return {...result,plans:wEpVisible_(wEpPlans_())};}
function saveWorkerEpReportViaApi_(token,payload){const session=requireWorker_(token),result=callEpWorkerApi_('reportEpMangInPlan',payload,session.useName);return {...result,history:getWorkerSimplePlanHistory_(getWorkerEpMangInConfig_())};}
function filterWorkerEpReportPlans_(plans){const rows=wEpRead_('KeHoachEpMangIn',['STT']);return plans.filter(p=>{const found=rows.filter(r=>Number(r.STT)===Number(p.STT));return found.length===1&&!wEpClosed_(found[0])&&(!found[0].IdEpMangIn||!!found[0].IdXuatEpMangIn);});}
