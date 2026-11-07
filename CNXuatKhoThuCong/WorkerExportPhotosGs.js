/** Photos are captured JPEG data. Drive files retain private/default permissions. */
function validateWorkerExportPhoto_(value) {
  if (typeof value !== 'string' || value.length > 4200000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error('M\u1ed7i nguy\u00ean li\u1ec7u ph\u1ea3i c\u00f3 \u1ea3nh ch\u1ee5p xu\u1ea5t kho h\u1ee3p l\u1ec7.');
  let bytes;
  try {bytes=Utilities.base64Decode(value.split(',')[1]);} catch(error) {throw new Error('D\u1eef li\u1ec7u \u1ea3nh kh\u00f4ng h\u1ee3p l\u1ec7.');}
  if (bytes.length < 4 || bytes.length > 3*1024*1024 || (bytes[0]&255)!==255 || (bytes[1]&255)!==216 || (bytes[2]&255)!==255 || (bytes[bytes.length-2]&255)!==255 || (bytes[bytes.length-1]&255)!==217) throw new Error('\u1ea2nh xu\u1ea5t ph\u1ea3i l\u00e0 JPEG h\u1ee3p l\u1ec7, t\u1ed1i \u0111a 3 MB.');
  return bytes;
}
function workerPlanPhotoKey_(line) {
  return JSON.stringify([line.STT,line.maNguyenLieu,line.MaKeToan].map(normalizeText_));
}
function validateWorkerPlanPhotos_(items, lines) {
  const source=new Map(),result=new Map();
  (items || []).forEach(item=>{const key=workerPlanPhotoKey_(item);if(source.has(key))throw new Error('Tr\u00f9ng d\u00f2ng nguy\u00ean li\u1ec7u khi g\u1eedi \u1ea3nh.');source.set(key,item.anhXuat);});
  lines.forEach(line=>{const key=workerPlanPhotoKey_(line);result.set(key,validateWorkerExportPhoto_(source.get(key)));});
  return result;
}
function saveWorkerExportPhoto_(bytes, userName) {
  const properties=PropertiesService.getScriptProperties();
  let folder,id=properties.getProperty('WORKER_EXPORT_PHOTO_FOLDER');
  if(id){try{folder=DriveApp.getFolderById(id);}catch(error){folder=null;}}
  if(!folder){folder=DriveApp.createFolder('AnhXuatKhoThuCong');properties.setProperty('WORKER_EXPORT_PHOTO_FOLDER',folder.getId());}
  const safe=String(userName || 'worker').replace(/[^a-zA-Z0-9._-]/g,'_');
  const file=folder.createFile(Utilities.newBlob(bytes,'image/jpeg',safe+'_'+Utilities.getUuid()+'.jpg'));
  return file.getUrl();
}

/** Authenticated preview: workers can view only photos on their own voucher rows. */
function getWorkerExportPhoto(token, voucherId, stt) {
  const session=requireWorker_(token);
  const row=getWorkerManualExportHistory_(session,{}).find(row=>normalizeText_(row.PhieuXuatThuCongId)===normalizeText_(voucherId)&&normalizeText_(row.STT)===normalizeText_(stt));
  const match=row && /^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/.exec(row.anhXuat || '');
  if(!match)throw new Error('Kh\u00f4ng t\u00ecm th\u1ea5y \u1ea3nh c\u1ee7a phi\u1ebfu n\u00e0y.');
  const file=DriveApp.getFileById(match[1]);
  if(file.getMimeType()!=='image/jpeg'||file.getSize()>3*1024*1024)throw new Error('\u1ea2nh kh\u00f4ng h\u1ee3p l\u1ec7.');
  return {dataUrl:'data:image/jpeg;base64,'+Utilities.base64Encode(file.getBlob().getBytes())};
}
