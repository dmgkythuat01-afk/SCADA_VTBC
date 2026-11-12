function pbdUpload_(user,p) {
  mobileWorkRequireTechnical_(user);
  const key=mobileWorkRequired_(p.uploadKey,"mã ảnh",100),cache=CacheService.getScriptCache(),cacheKey="pbd-photo:"+adminHash_(user.email+":"+key),prior=cache.get(cacheKey);
  if(prior)return JSON.parse(prior);
  if(typeof p.dataUrl!=="string" || p.dataUrl.length>4200000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.dataUrl))throw Error("Ảnh phải là JPEG, tối đa 3 MB.");
  const bytes=Utilities.base64Decode(p.dataUrl.split(",")[1]);
  if(bytes.length>3145728 || bytes.length<4 || (bytes[0]&255)!==255 || (bytes[1]&255)!==216 || (bytes[bytes.length-2]&255)!==255 || (bytes[bytes.length-1]&255)!==217)throw Error("Ảnh JPEG không hợp lệ.");
  const folder=PropertiesService.getScriptProperties().getProperty("BAODUONG_PHOTO_FOLDER");if(!folder)throw Error("Chưa có thư mục ảnh bảo dưỡng.");
  const file=DriveApp.getFolderById(folder).createFile(Utilities.newBlob(bytes,"image/jpeg",mobileWorkDocumentId_("ANH")+"_PBD.jpg")),meta={id:file.getId(),name:adminText_(p.name,150) || "Ảnh bảo dưỡng",uploadKey:key};
  cache.put(cacheKey,JSON.stringify(meta),21600);return meta;
}
function pbdResolvePhotos_(user,photos,old) {
  if(!Array.isArray(photos) || photos.length>12)throw Error("Tối đa 12 ảnh mỗi phiếu.");
  const saved=pbdParse_(old?.danhSachAnh,[]),seen=new Set();
  return photos.map(p=>{
    if(!p || seen.has(p.id))throw Error("Ảnh không hợp lệ hoặc bị trùng.");seen.add(p.id);
    const existing=saved.find(a=>a.id===p.id);if(existing)return existing;
    const raw=CacheService.getScriptCache().get("pbd-photo:"+adminHash_(user.email+":"+p.uploadKey)),meta=pbdParse_(raw,null);
    if(!meta || meta.id!==p.id)throw Error("Ảnh chờ lưu đã hết hạn hoặc không thuộc tài khoản này. Chọn lại ảnh.");return meta;
  });
}
function pbdPhoto_(user,p) {
  const record=pbdGrid_().rows.find(r=>r.maPhieuBaoDuong===p.id);if(!record || (record.trangThai==="Nháp" && record.nguoiTao!==user.email && !mobileWorkCapabilities_(user).admin))throw Error("Không được xem ảnh của phiếu này.");
  if(!pbdParse_(record.danhSachAnh,[]).some(a=>a.id===p.fileId))throw Error("Ảnh không thuộc phiếu.");
  const f=DriveApp.getFileById(p.fileId);if(f.getMimeType()!=="image/jpeg" || f.getSize()>3145728)throw Error("Ảnh không hợp lệ.");
  return {dataUrl:"data:image/jpeg;base64,"+Utilities.base64Encode(f.getBlob().getBytes())};
}
