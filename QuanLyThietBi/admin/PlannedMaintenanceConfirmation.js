function pbdReviewers_() {
  return mobileWorkMembers_().filter(m=>m.active).map(m=>({id:m.email,name:m.name,position:m.position}));
}
function pbdReviewer_(id,required) {
  if(!id && !required)return {id:"",name:""};
  const reviewer=pbdReviewers_().find(m=>m.id===adminNorm_(id));
  if(!reviewer)throw Error("Vui lòng chọn người xác nhận đang hoạt động trong danh sách tài khoản.");
  return reviewer;
}
function pbdReview_(user,p) {
  const grid=pbdGrid_(),record=grid.rows.find(r=>r.maPhieuBaoDuong===p.id);
  if(!record)throw Error("Không tìm thấy phiếu bảo dưỡng.");
  const key="review:"+mobileWorkRequired_(p.requestId,"mã xác nhận",100),fingerprint=adminHash_(JSON.stringify([user.email,p.id,p.revision,p.decision,p.note])),receipts=pbdParse_(record.nhatKyLuu,[]),prior=receipts.find(r=>r.id===key);
  if(prior){if(prior.fingerprint!==fingerprint)throw Error("Mã xác nhận đã dùng cho nội dung khác.");if(record.nguoiXacNhan!==user.email && !pbdParse_(record.nhatKyXacNhan,[]).some(r=>r.id===key&&r.by===user.email))throw Error("Bạn không được xác nhận phiếu này.");return pbdPublic_(record);}
  if(record.nguoiXacNhan!==user.email)throw Error("Chỉ người được chọn xác nhận mới được xử lý phiếu này.");
  if(record.trangThai!=="Chờ xác nhận" || Number(record.phienBan)!==Number(p.revision))throw Error("Phiếu đã thay đổi hoặc đã được xác nhận. Hãy tải lại.");
  if(!["accept","reject"].includes(p.decision))throw Error("Kết quả xác nhận không hợp lệ.");
  const note=adminText_(p.note,5000);if(p.decision==="reject"&&!note)throw Error("Vui lòng nhập lý do không đồng ý.");
  const now=adminNow_(),row={...record,trangThai:p.decision==="accept"?"Hoàn thành":"Cần làm lại",thoiGianXacNhan:now,noiDungXacNhan:note,phienBan:String(Number(record.phienBan)+1),thoiGianCapNhat:now,
    nhatKyLuu:JSON.stringify([...receipts,{id:key,fingerprint}]),nhatKyXacNhan:JSON.stringify([...pbdParse_(record.nhatKyXacNhan,[]),{id:key,by:user.email,name:user.name,at:now,decision:p.decision,note}])};
  pbdWrite_(grid,row);return pbdPublic_(row);
}
