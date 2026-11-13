const PBD_COLUMNS=["maPhieuBaoDuong","tenXuong","tenMay","ngayThucHien","trangThai","nguoiTao","tenNguoiTao","nguoiThucHien","tenNguoiThucHien","thoiGianTao","thoiGianCapNhat","phienBan","ghiChu","chiTiet","danhSachAnh","maChongLap","dauVanTay","nhatKyLuu","nguoiXacNhan","tenNguoiXacNhan","thoiGianXacNhan","noiDungXacNhan","nhatKyXacNhan","boPhanDanhGia","danhGiaVeSinh","danhGiaHoatDong","danhMucIn","thoiGianGui"];
function pbdSetup_() {
  const ss=SpreadsheetApp.openById(ADMIN_SHEET_ID);let sheet=ss.getSheetByName("PhieuBaoDuong");
  if(!sheet){sheet=ss.insertSheet("PhieuBaoDuong");sheet.getRange(1,1,1,PBD_COLUMNS.length).setValues([PBD_COLUMNS]).setFontWeight("bold").setBackground("#dcefe6");sheet.setFrozenRows(1);}
  const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(v=>String(v).trim()),missing=PBD_COLUMNS.filter(k=>!headers.includes(k));
  if(missing.length){const start=headers.length+1,needed=headers.length+missing.length-sheet.getMaxColumns();if(needed>0)sheet.insertColumnsAfter(sheet.getMaxColumns(),needed);sheet.getRange(1,start,1,missing.length).setValues([missing]).setFontWeight("bold").setBackground("#dcefe6");SpreadsheetApp.flush();}
  pbdGrid_();return {success:true,sheet:"PhieuBaoDuong",columns:PBD_COLUMNS};
}
function pbdGrid_() {
  const sheet=SpreadsheetApp.openById(ADMIN_SHEET_ID).getSheetByName("PhieuBaoDuong");if(!sheet)throw Error("Chưa khởi tạo sheet PhieuBaoDuong.");
  const values=sheet.getDataRange().getValues(),headers=values[0].map(String),map={};
  PBD_COLUMNS.forEach(k=>{const positions=headers.map((h,i)=>h.trim()===k?i:-1).filter(i=>i>=0);if(positions.length!==1)throw Error("PhieuBaoDuong thiếu hoặc trùng cột "+k);map[k]=positions[0];});
  return {sheet,headers,map,rows:values.slice(1).map((cells,i)=>Object.assign({_row:i+2},Object.fromEntries(PBD_COLUMNS.map(k=>[k,String(cells[map[k]]??"")])))).filter(r=>r.maPhieuBaoDuong)};
}
function pbdWrite_(grid,row) {
  const cells=row._row?grid.sheet.getRange(row._row,1,1,grid.headers.length).getValues()[0]:grid.headers.map(()=>"");
  PBD_COLUMNS.forEach(k=>{let v=String(row[k]??"");cells[grid.map[k]]=/^[=+\-@]/.test(v)?"'"+v:v;});
  grid.sheet.getRange(row._row || Math.max(2,grid.sheet.getLastRow()+1),1,1,cells.length).setNumberFormat("@").setValues([cells]);SpreadsheetApp.flush();
}
function pbdCriteria_(includeInactive) {
  const devices=readAdminRows_("DanhMucThietBi").filter(d=>includeInactive || maintenanceActive_(d)),sheet=SpreadsheetApp.openById(ADMIN_SHEET_ID).getSheetByName("DanhMucCanKiemTra"),values=sheet.getDataRange().getValues(),headers=values[0].map(v=>String(v).trim());
  const keys=["tenXuong","tenMay","maThietBi","danhMucCanKiemTra","thamSoCanKiemTra","chiTieuDanhGia1","chiTieuDanhGia2","chiTieuDanhGia3","boPhanDanhGia","loai","tanSuatThamSo"];
  keys.forEach(k=>{if(headers.filter(h=>h===k).length!==1)throw Error("DanhMucCanKiemTra thiếu hoặc trùng cột "+k);});
  const result=[],seen=new Set();
  values.slice(1).forEach(cells=>{
    const row=Object.fromEntries(headers.map((h,i)=>[h,String(cells[i]??"").trim()]));if(!row.maThietBi || !row.danhMucCanKiemTra)return;
    const device=devices.find(d=>maintenanceDeviceKey_(d)===maintenanceDeviceKey_(row));if(!device)return;
    const c={...Object.fromEntries(keys.map(k=>[k,row[k] || ""])),tenThietBi:device.tenThietBi || row.tenThietBi || "",tanSuatDanhMuc:row.tanSuatDanhMuc || "",ngayLapDat:device.ngayLapDat || ""};
    c.options=[...new Set([c.chiTieuDanhGia1,c.chiTieuDanhGia2,c.chiTieuDanhGia3].filter(Boolean))];
    result.push(c);
  });
  const groupKey=c=>JSON.stringify([c.tenXuong,c.tenMay,c.maThietBi,c.danhMucCanKiemTra,c.boPhanDanhGia,c.loai].map(adminNorm_)),cycles=new Map();
  result.filter(c=>c.tanSuatDanhMuc).forEach(c=>{const k=groupKey(c),old=cycles.get(k);if(old && maintenanceNorm_(old)!==maintenanceNorm_(c.tanSuatDanhMuc))throw Error("Tần suất danh mục không thống nhất: "+c.danhMucCanKiemTra);cycles.set(k,c.tanSuatDanhMuc);});
  result.forEach(c=>{c.tanSuatDanhMuc=c.tanSuatDanhMuc || cycles.get(groupKey(c)) || "";c.key=pbdKey_(c);if(seen.has(c.key))throw Error("Trùng tham số bảo dưỡng: "+c.tenThietBi+" / "+c.thamSoCanKiemTra);seen.add(c.key);c.version=adminHash_(JSON.stringify(c));});
  return result;
}
