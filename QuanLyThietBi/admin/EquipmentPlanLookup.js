function equipmentPlanCategories_(sheet) {
  sheet=sheet||SpreadsheetApp.openById(ADMIN_SHEET_ID).getSheetByName('DanhMucSoKH');
  if(!sheet)throw Error('Không tìm thấy sheet DanhMucSoKH.');
  const keys=['tenXuong','tenMay','maThietBi','danhMucCanKiemTra','boPhanDanhGia','tanSuatBaoDuong'],values=sheet.getDataRange().getValues(),headers=(values[0]||[]).map(v=>String(v).trim());
  keys.forEach(k=>{if(headers.filter(h=>h===k).length!==1)throw Error('DanhMucSoKH thiếu hoặc trùng cột '+k);});
  return values.slice(1).map(cells=>Object.fromEntries(keys.map(k=>[k,String(cells[headers.indexOf(k)]??'').trim()]))).filter(r=>r.maThietBi&&r.danhMucCanKiemTra);
}
function equipmentPlanSelection_(row,old,plans) {
  const keys=['tenXuong','tenMay','maThietBi','boPhanDanhGia','danhMucCanKiemTra'],matches=(plans||equipmentPlanCategories_()).filter(r=>adminSame_(r,row,keys));
  if(!matches.length){
    if(old&&!adminChanged_(old,row,keys.concat('tanSuatThamSo')))return row.tanSuatThamSo;
    throw Error('Danh mục cần kiểm tra phải chọn từ DanhMucSoKH của thiết bị và bộ phận đánh giá.');
  }
  const frequencies=[...new Set(matches.map(r=>r.tanSuatBaoDuong))];
  if(frequencies.length!==1||!frequencies[0])throw Error('Kiểm tra tanSuatBaoDuong trong DanhMucSoKH: tần suất đang trống hoặc không thống nhất.');
  if(row.tanSuatThamSo!==frequencies[0])throw Error('Tần suất tham số đã khác DanhMucSoKH. Hãy tải lại dữ liệu và chọn lại danh mục.');
  row.danhMucCanKiemTra=matches[0].danhMucCanKiemTra;
  return frequencies[0];
}
