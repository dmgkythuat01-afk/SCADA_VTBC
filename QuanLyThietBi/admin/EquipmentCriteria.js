// The live catalogue uses the new columns only. Fallbacks are for immutable
// report/history JSON created before the column rename, not for sheet headers.
function equipmentCriterionSnapshot_(row) {
  return {
    boPhanDanhGia:String(row.boPhanDanhGia ?? row.loaiDanhGia ?? ""),
    loai:String(row.loai ?? ""),
    tanSuatThamSo:String(row.tanSuatThamSo ?? row.tanSuat ?? ""),
    danhMucCanKiemTra:String(row.danhMucCanKiemTra ?? row.chiTieu ?? ""),
    thamSoCanKiemTra:String(row.thamSoCanKiemTra ?? row.thongSoTieuChuan ?? row.tieuChuan ?? ""),
    chiTieuDanhGia1:String(row.chiTieuDanhGia1 ?? ""),
    chiTieuDanhGia2:String(row.chiTieuDanhGia2 ?? ""),
    chiTieuDanhGia3:String(row.chiTieuDanhGia3 ?? ""),
  };
}
function equipmentCriterionLabel_(row) {
  const c=equipmentCriterionSnapshot_(row);
  return [(c.boPhanDanhGia ? "["+c.boPhanDanhGia+"] " : "")+c.danhMucCanKiemTra,...[c.loai,c.tanSuatThamSo].filter(Boolean),"Tham số: "+(c.thamSoCanKiemTra || "Chưa khai báo"),
    ...[1,2,3].filter(n=>c["chiTieuDanhGia"+n]).map(n=>"Đánh giá "+n+": "+c["chiTieuDanhGia"+n])].join(" · ");
}
function equipmentCriterionHistory_(row,actual,outcome) {
  const c=equipmentCriterionSnapshot_(row);
  return {...c,chiTieu:c.danhMucCanKiemTra,tieuChuan:c.thamSoCanKiemTra,ketQuaThucTe:actual,ketLuan:outcome};
}
