function equipmentPlanCatalogValidate_(row,read) {
  const devices=read('DanhMucThietBi').filter(d=>adminSame_(d,row,['tenXuong','tenMay','maThietBi']));
  if(devices.length!==1)throw Error('Thiết bị không thuộc xưởng/máy đã chọn.');
  row.maThietBi=devices[0].maThietBi;row.tenThietBi=devices[0].tenThietBi||'';
  if(!row.tenThietBi)throw Error('Thiết bị chưa có tên trong DanhMucThietBi.');
  if(!['Điện','Cơ khí'].includes(row.boPhanDanhGia))throw Error('Bộ phận đánh giá chỉ được chọn Điện hoặc Cơ khí.');
  const p=equipmentSystemParameters_();
  if(!['Cả 2','Thay mới','Bảo dưỡng'].includes(row.loaiSoKHDB)||!(p.loaiSoKHDB||[]).includes(row.loaiSoKHDB))throw Error('Loại sổ kế hoạch phải chọn từ ThamSoHeThong.loaiSoKHDB.');
  for(const key of ['tanSuatThayMoi','tanSuatBaoDuong']){
    const required=row.loaiSoKHDB==='Cả 2'||row.loaiSoKHDB===(key==='tanSuatThayMoi'?'Thay mới':'Bảo dưỡng');
    if((required||row[key])&&!p.tanSuatThamSo.includes(row[key]))throw Error((key==='tanSuatThayMoi'?'Tần suất thay mới':'Tần suất bảo dưỡng')+' phải chọn từ ThamSoHeThong.tanSuat.');
  }
}
