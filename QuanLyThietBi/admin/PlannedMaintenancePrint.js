function pbdAssessment_(value,required) {
  const text=adminText_(value,30).toLocaleUpperCase("vi");
  if(!text&&!required)return "";
  if(!["ĐẠT","KHÔNG ĐẠT"].includes(text))throw Error("Vui lòng chọn Đạt/Không đạt cho cả vệ sinh và tình trạng hoạt động.");
  return text;
}
function pbdDepartment_(rows) {
  const values=[...new Set(rows.map(c=>maintenanceNorm_(c.boPhanDanhGia)))];
  if(values.length!==1 || !["co khi","dien"].includes(values[0]))throw Error("Một phiếu chỉ được kiểm tra Cơ khí hoặc Điện. Hãy tách thành hai phiếu.");
  return values[0]==="dien"?"Điện":"Cơ khí";
}
function pbdPrintCatalogEncode_(rows) {
  const compact=rows.map(c=>({key:c.key,tenXuong:c.tenXuong,tenMay:c.tenMay,maThietBi:c.maThietBi,tenThietBi:c.tenThietBi,danhMucCanKiemTra:c.danhMucCanKiemTra,thamSoCanKiemTra:c.thamSoCanKiemTra,boPhanDanhGia:c.boPhanDanhGia,loai:c.loai,options:c.options || [c.chiTieuDanhGia1,c.chiTieuDanhGia2,c.chiTieuDanhGia3].filter(Boolean)})),json=JSON.stringify(compact);
  if(json.length<=45000)return json;
  const packed="gz:"+Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(json,"application/json")).getBytes());
  if(packed.length>45000)throw Error("Danh mục của máy quá lớn để lưu bản in. Vui lòng kiểm tra lại danh mục.");return packed;
}
function pbdPrintCatalogDecode_(value) {
  const raw=String(value||"");if(!raw)return null;
  const json=raw.startsWith("gz:")?Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(raw.slice(3)))).getDataAsString("UTF-8"):raw;
  const rows=JSON.parse(json);if(!Array.isArray(rows))throw Error("Snapshot danh mục in không hợp lệ.");return rows;
}
function pbdPrintIdentity_(c) {return JSON.stringify([c.tenXuong,c.tenMay,c.maThietBi,c.danhMucCanKiemTra,c.thamSoCanKiemTra,c.boPhanDanhGia,c.loai].map(adminNorm_));}
function pbdPrintPayload_(user,p) {
  const row=pbdGrid_().rows.find(r=>r.maPhieuBaoDuong===p.id);
  if(!row || (row.trangThai==="Nháp" && row.nguoiTao!==user.email && !mobileWorkCapabilities_(user).admin))throw Error("Bạn không được xem bản in phiếu này.");
  const selected=pbdParse_(row.chiTiet,[]),department=pbdDepartment_(selected),snapshot=pbdPrintCatalogDecode_(row.danhMucIn),source=snapshot || pbdCriteria_(true);
  const catalog=source.filter(c=>c.tenXuong===row.tenXuong && c.tenMay===row.tenMay && maintenanceNorm_(c.boPhanDanhGia)===maintenanceNorm_(department)).map(c=>({...c,ketQua:""}));
  selected.forEach(saved=>{
    let index=catalog.findIndex(c=>c.key===saved.key);
    if(index<0){const candidates=catalog.map((c,i)=>pbdPrintIdentity_(c)===pbdPrintIdentity_(saved)?i:-1).filter(i=>i>=0);if(candidates.length===1 && selected.filter(c=>pbdPrintIdentity_(c)===pbdPrintIdentity_(saved)).length===1)index=candidates[0];}
    const result={...saved,options:saved.options || [saved.chiTieuDanhGia1,saved.chiTieuDanhGia2,saved.chiTieuDanhGia3].filter(Boolean)};
    if(!result.options.includes(saved.ketQua))result.options.push(saved.ketQua);
    if(index>=0)catalog[index]=result;else catalog.push(result);
  });
  const devices=new Map();catalog.forEach(c=>{const k=c.maThietBi;if(!devices.has(k))devices.set(k,{code:k,name:c.tenThietBi || k,categories:new Map()});const d=devices.get(k),category=c.danhMucCanKiemTra;if(!d.categories.has(category))d.categories.set(category,[]);d.categories.get(category).push({parameter:c.thamSoCanKiemTra,options:[...new Set((c.options||[]).filter(Boolean))],result:c.ketQua || ""});});
  const accepted=row.trangThai==="Hoàn thành"&&!!row.thoiGianXacNhan;
  return {id:row.maPhieuBaoDuong,workshop:row.tenXuong,machine:row.tenMay,day:row.ngayThucHien,creator:row.tenNguoiTao || row.nguoiTao,status:row.trangThai,department:department==="Điện"?"ĐIỆN":"CƠ",hygiene:row.danhGiaVeSinh || "",operation:row.danhGiaHoatDong || "",
    catalogSource:snapshot?"snapshot":"current",devices:[...devices.values()].map(d=>({...d,categories:[...d.categories].map(([name,parameters])=>({name,parameters}))})),
    signatures:{inspection:{name:row.tenNguoiTao || row.nguoiTao,time:row.trangThai!=="Nháp"?(row.thoiGianGui || row.thoiGianTao):""},production:{name:row.tenNguoiXacNhan || "",time:accepted?row.thoiGianXacNhan:""}}};
}
