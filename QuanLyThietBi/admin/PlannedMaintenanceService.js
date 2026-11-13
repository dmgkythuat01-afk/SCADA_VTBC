function pbdPublic_(r) {
  const copy={...r};delete copy._row;delete copy.maChongLap;delete copy.dauVanTay;delete copy.nhatKyLuu;delete copy.danhMucIn;
  copy.chiTiet=pbdParse_(r.chiTiet,[]);copy.danhSachAnh=pbdParse_(r.danhSachAnh,[]);return copy;
}
function pbdSnapshot_(user) {
  const grid=pbdGrid_(),criteria=pbdCriteria_(),today=maintenanceToday_();
  return {today,user,reviewers:pbdReviewers_(),canWrite:mobileWorkCapabilities_(user).technical,criteria:pbdProjection_(criteria,grid.rows,today),records:grid.rows.filter(r=>r.trangThai!=="Nháp" || r.nguoiTao===user.email || mobileWorkCapabilities_(user).admin).map(pbdPublic_).sort((a,b)=>b.thoiGianTao.localeCompare(a.thoiGianTao))};
}
function pbdSave_(user,p) {
  mobileWorkRequireTechnical_(user);
  const grid=pbdGrid_(),request=mobileWorkRequired_(p.requestId,"mã thao tác",100),fingerprint=adminHash_(JSON.stringify([user.email,p.id,p.revision,p.status,p.workshop,p.machine,p.performedDate,p.note,p.results,p.photos,p.reviewerId,p.hygiene,p.operation]));
  const previous=grid.rows.find(r=>r.nguoiTao===user.email && pbdParse_(r.nhatKyLuu,[]).some(o=>o.id===request));
  if(previous){if(pbdParse_(previous.nhatKyLuu,[]).find(o=>o.id===request).fingerprint!==fingerprint)throw Error("Mã thao tác đã dùng cho nội dung khác.");return pbdPublic_(previous);}
  const old=p.id?grid.rows.find(r=>r.maPhieuBaoDuong===p.id):null;
  if(p.id && !old)throw Error("Không tìm thấy phiếu.");
  if(old && (old.nguoiTao!==user.email || !["Nháp","Cần làm lại"].includes(old.trangThai)))throw Error("Chỉ người tạo được sửa phiếu nháp của mình.");
  if(old && Number(old.phienBan)!==Number(p.revision))throw Error("Phiếu đã thay đổi. Hãy mở lại phiếu.");
  const workshop=mobileWorkRequired_(p.workshop,"xưởng",500),machine=mobileWorkRequired_(p.machine,"máy",500),day=mobileWorkRequired_(p.performedDate,"ngày thực hiện",10);
  maintenanceDate_(day);if(day>maintenanceToday_())throw Error("Ngày thực hiện không được ở tương lai.");
  if(!["Nháp","Chờ xác nhận"].includes(p.status))throw Error("Trạng thái phiếu không hợp lệ.");
  if(!Array.isArray(p.results) || !p.results.length || p.results.length>100)throw Error("Hãy chọn kết quả cho ít nhất một tham số; tối đa 100 dòng mỗi phiếu.");
  const criteria=pbdCriteria_(),seen=new Set(),details=p.results.map(item=>{
    if(!item || seen.has(item.key))throw Error("Danh sách có tham số trùng.");seen.add(item.key);
    const c=criteria.find(r=>r.key===item.key && r.tenXuong===workshop && r.tenMay===machine);
    if(!c || c.version!==item.version)throw Error("Danh mục kiểm tra đã thay đổi. Tải lại trước khi lưu.");
    if(!c.options.includes(item.ketQua))throw Error("Kết quả phải chọn đúng chỉ tiêu của tham số.");
    return {...c,ketQua:item.ketQua,ghiChu:adminText_(item.ghiChu,2000)};
  });
  const department=pbdDepartment_(details),hygiene=pbdAssessment_(p.hygiene,p.status!=="Nháp"),operation=pbdAssessment_(p.operation,p.status!=="Nháp");
  const reviewer=pbdReviewer_(p.reviewerId,p.status!=="Nháp");
  const photos=pbdResolvePhotos_(user,p.photos || [],old),now=adminNow_();
  const row={...(old || {}),maPhieuBaoDuong:old?.maPhieuBaoDuong || mobileWorkDocumentId_("PBD"),tenXuong:workshop,tenMay:machine,ngayThucHien:day,trangThai:p.status,
    nguoiTao:old?.nguoiTao || user.email,tenNguoiTao:old?.tenNguoiTao || user.name,nguoiThucHien:user.email,tenNguoiThucHien:user.name,thoiGianTao:old?.thoiGianTao || now,thoiGianCapNhat:now,
    boPhanDanhGia:department,danhGiaVeSinh:hygiene,danhGiaHoatDong:operation,thoiGianGui:p.status==="Chờ xác nhận"?now:(old?.thoiGianGui || ""),danhMucIn:pbdPrintCatalogEncode_(pbdCriteria_(true).filter(c=>c.tenXuong===workshop&&c.tenMay===machine&&maintenanceNorm_(c.boPhanDanhGia)===maintenanceNorm_(department))),
    nguoiXacNhan:reviewer.id,tenNguoiXacNhan:reviewer.name,thoiGianXacNhan:"",noiDungXacNhan:"",nhatKyXacNhan:old?.nhatKyXacNhan || "[]",
    phienBan:String(Number(old?.phienBan || 0)+1),ghiChu:adminText_(p.note,5000),chiTiet:JSON.stringify(details),danhSachAnh:JSON.stringify(photos),maChongLap:request,dauVanTay:fingerprint,nhatKyLuu:JSON.stringify([...pbdParse_(old?.nhatKyLuu,[]),{id:request,fingerprint}])};
  if(row.chiTiet.length>45000)throw Error("Phiếu quá dài. Hãy tách thành nhiều phiếu nhỏ hơn.");
  pbdWrite_(grid,row);return pbdPublic_(row);
}
function plannedMaintenanceApi(token,action,payload) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);mobileWorkResetContext_();
  try {const user=mobileWorkIdentity_(token),p=payload || {};
    if(action==="snapshot")return pbdSnapshot_(user);
    if(action==="save")return pbdSave_(user,p);
    if(action==="review")return pbdReview_(user,p);
    if(action==="upload")return pbdUpload_(user,p);
    if(action==="photo")return pbdPhoto_(user,p);
    if(action==="print")return pbdPrintPayload_(user,p);
    throw Error("Thao tác bảo dưỡng không hợp lệ.");
  }finally{lock.releaseLock();}
}
