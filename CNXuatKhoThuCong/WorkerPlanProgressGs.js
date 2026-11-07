/** Shared lock is created in CNXuatKhoThuCong; mobile includes this project as a library. */
function workerPlanSaveLock() { return LockService.getScriptLock(); }
function getWorkerPlanSaveLock_() {
  return typeof WorkerPlanLock !== 'undefined' ? WorkerPlanLock.workerPlanSaveLock() : workerPlanSaveLock();
}
function workerPlanSaveKey_(planId,line) {
  return JSON.stringify([planId,line.STT,line.maNguyenLieu].map(normalizeText_));
}
function getWorkerPlanSavedMap_(planId) {
  const sheet=getPhieuXuatThuCongSheet_(),result=new Map();
  if(sheet.getLastRow()<2)return result;
  const values=sheet.getDataRange().getValues(),headers=values[0].map(normalizeText_);
  const value=(row,key)=>{const index=headers.indexOf(key);return index<0?'':normalizeText_(row[index]);};
  values.slice(1).forEach(row=>{
    const note=value(row,'ghiChu'),legacyPlan=/^\[Theo k\u1ebf ho\u1ea1ch:\s*([^\]]+)\]/.exec(note),legacyStt=/\|\s*STT b\u00e0i li\u1ec7u:\s*([^|]+)/.exec(note);
    const savedPlan=value(row,'KeHoachId')||(legacyPlan?legacyPlan[1].trim():''),stt=value(row,'STTBaiLieu')||(legacyStt?legacyStt[1].trim():'');
    if(savedPlan!==normalizeText_(planId)||!stt||!value(row,'maNguyenLieu')||!value(row,'PhieuXuatThuCongId'))return;
    const key=workerPlanSaveKey_(savedPlan,{STT:stt,maNguyenLieu:value(row,'maNguyenLieu')});
    if(!result.has(key))result.set(key,{phieuId:value(row,'PhieuXuatThuCongId'),nguoiTao:value(row,'nguoiXuatKhoThuCong'),thoiGian:value(row,'thoiGianLuu'),sttPhieu:value(row,'STT'),totalKg:0,quantityValid:true});
    const info=result.get(key),quantity=Number(value(row,'khoiLuongNhap')),unit=value(row,'donVi');
    if(!unit||!isFinite(quantity)||quantity<=0)info.quantityValid=false;
    else {try{info.totalKg+=toKg_(quantity,unit);}catch(error){info.quantityValid=false;}}
  });
  return result;
}
function decorateWorkerPlanProgress_(planId,items,saved) {
  return items.map(line=>{
    const info=saved.get(workerPlanSaveKey_(planId,line));
    if(info&&info.quantityValid)line.khoiLuongXuatThucTe=roundQty_(fromKg_(info.totalKg,line.donViCanXuat));
    return Object.assign(line,{daLuu:!!info,phieuDaLuu:info?info.phieuId:'',nguoiDaLuu:info?info.nguoiTao:'',thoiGianDaLuu:info?info.thoiGian:''});
  });
}
function appendWorkerPlanRows_(sheet,rows) {
  if(!rows.length)return;
  const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(normalizeText_);
  sheet.getRange(sheet.getLastRow()+1,1,rows.length,headers.length).setValues(rows.map(row=>headers.map(key=>row[key]===undefined?'':row[key])));
}
