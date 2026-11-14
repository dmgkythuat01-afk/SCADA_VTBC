const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('plan types are independent options from loaiSoKHDB, preserving sparse rows and deduplicating',()=>{const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('QuanLyThietBi/admin/EquipmentParameters.js','utf8'),c);const values=[['loai','tanSuat','chiTieu','loaiSoKHDB'],['Bảo dưỡng','1 tháng','TỐT','Cả 2'],['','','','Bảo dưỡng'],['','2 năm','','Thay mới'],['','','',' Cả 2 ']];assert.deepEqual(Array.from(c.equipmentSystemParameters_({getDataRange:()=>({getValues:()=>values})}).loaiSoKHDB),['Cả 2','Bảo dưỡng','Thay mới']);});
test('system parameters use independent sparse columns, trim and deduplicate without pairing rows',()=>{
 const c={};vm.createContext(c);const source=fs.readFileSync('QuanLyThietBi/admin/EquipmentParameters.js','utf8');vm.runInContext(source,c);
 const values=[['tanSuat','loai','chiTieu'],['7 ngày','Bảo dưỡng',' TỐT '],['6 tháng','Vệ sinh','CÓ'],['1 năm','',''],[' 7 ngày ','Bảo dưỡng','TỐT']];
 const result=c.equipmentSystemParameters_({getDataRange:()=>({getValues:()=>values})});
 assert.deepEqual(JSON.parse(JSON.stringify(result)),{loai:['Bảo dưỡng','Vệ sinh'],tanSuatThamSo:['7 ngày','6 tháng','1 năm'],chiTieu:['TỐT','CÓ']});
 assert.throws(()=>c.equipmentSystemParameters_({getDataRange:()=>({getValues:()=>[['loai','loai','tanSuat']]})}),/trùng/);
});
test('live device schema no longer requires deleted cycle column and criterion has renamed department plus parameter fields',()=>{
 const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('QuanLyThietBi/admin/Schema.js','utf8'),c);
 assert.ok(!Object.hasOwn(c.adminSpec_('DanhMucThietBi').columns,'soNgayCanBaoDuong'));
 const spec=c.adminSpec_('DanhMucCanKiemTra');for(const key of ['boPhanDanhGia','loai','tanSuatThamSo'])assert.ok(Object.hasOwn(spec.columns,key),key);
 assert.ok(!Object.hasOwn(spec.columns,'loaiDanhGia'));
});
