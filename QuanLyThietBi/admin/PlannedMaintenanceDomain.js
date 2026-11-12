function pbdKey_(row) {
  return JSON.stringify(["tenXuong","tenMay","maThietBi","danhMucCanKiemTra","thamSoCanKiemTra","boPhanDanhGia","loai","tanSuatThamSo","tanSuatDanhMuc"].map(k=>adminNorm_(row[k])));
}
function pbdCycle_(value) {
  const m=/^(\d+)\s*(ngay|tuan|thang|nam)$/.exec(maintenanceNorm_(value));
  return m && Number(m[1])>0 && Number(m[1])<=10000 ? {n:Number(m[1]),unit:m[2]} : null;
}
function pbdNext_(day, frequency) {
  const c=pbdCycle_(frequency);if(!c)return "";
  const d=maintenanceDate_(day);
  if(c.unit==="ngay" || c.unit==="tuan")return maintenanceAddDays_(day,c.n*(c.unit==="tuan"?7:1));
  const date=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+c.n*(c.unit==="nam"?12:1));
  const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(date,last));return d.toISOString().slice(0,10);
}
function pbdProjection_(criteria, records, today) {
  const last=new Map();
  records.filter(r=>r.trangThai==="Hoàn thành").forEach(r=>{
    pbdParse_(r.chiTiet,[]).forEach(c=>{if(c.ketQua && (!last.has(c.key) || last.get(c.key).ngayThucHien<r.ngayThucHien))last.set(c.key,r);});
  });
  return criteria.map(c=>{
    const h=last.get(c.key),base=h?.ngayThucHien || c.ngayLapDat || "",frequency=c.tanSuatThamSo || c.tanSuatDanhMuc || "";
    let due="";try {if(base)due=pbdNext_(base,frequency);}catch{}
    const days=due?Math.round((maintenanceDate_(due)-maintenanceDate_(today))/86400000):null;
    return {...c,tanSuatApDung:frequency,ngayGanNhat:h?.ngayThucHien || "",nguoiGanNhat:h?.tenNguoiThucHien || "",ngayDenHan:due,soNgayConLai:days,
      trangThaiLich:!pbdCycle_(frequency)?"Chưa có tần suất":!due?"Chưa có mốc thực hiện":days<0?"Quá hạn":days===0?"Đến hạn":days<=14?"Sắp đến hạn":"Chưa đến hạn"};
  });
}
function pbdParse_(value,fallback) {try{return JSON.parse(value || "");}catch{return fallback;}}
