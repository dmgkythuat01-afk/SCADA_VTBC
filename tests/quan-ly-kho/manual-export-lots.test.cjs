const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(){
 const h=['PhieuXuatThuCongId','STT','Id','maNguyenLieu','tenNguyenLieu','khoiLuongNhap','donVi','TrangThaiXuatThuCong','nguoiDuyet','thoiGianDuyet','IdKhoDaTru','MaKeToan','LotNo','ngaySanXuat','hanSuDung'];
 const p=[h,['M1',1,'A','NL','Name',8,'kg','Đã tạo','','','','001','OLD','',''],['M1',2,'B','NL','Name',3,'kg','Đã tạo','','','','001','OLD','','']];
 const stock=[['Id','khoiLuongNhap','trangThai'],['A',5,'Đã phê duyệt'],['B',20,'Đã phê duyệt']];let writes=0;
 const sheet=data=>({getLastRow:()=>data.length,getLastColumn:()=>data[0].length,getDataRange:()=>({getValues:()=>data.map(r=>r.slice())}),getRange(r,c){return {setValue(v){data[r-1][c-1]=v;writes++},setValues(values){values.forEach((row,i)=>row.forEach((v,j)=>{data[r-1+i][c-1+j]=v;writes++}))}}}});
 const c=vm.createContext({console,LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})}});
 for(const f of ['Code.js','ExportLotSelectionGs.js','DuyetPhieuXuatThuCong.js','ManualExportLotSelectionGs.js','ExportApprovalPerformanceGs.js']){const name=path.join(__dirname,'../../QuanLyKho',f);if(fs.existsSync(name))vm.runInContext(fs.readFileSync(name,'utf8'),c)}
 c.requireInventoryRole_=()=>({useName:'keeper'});c.getSheet_=name=>name==='PhieuXuatThuCong'?sheet(p):sheet(stock);c.manualApprovalGetMaterialInfoByAccountingCodeMap_=()=>({});c.getAvailableKgByMaterial_=()=>999;c.nowText_=()=> '2026-11-04 12:00';c.getKhoHeaderIndex_=()=>({khoiLuongNhap:1,trangThai:2});
 c.getApprovedStockLotsForExport_=(code,name,account)=>{a.equal(code,'NL');a.equal(account,'001');return stock.slice(1).map((r,i)=>({Id:r[0],rowNumber:i+2,khoiLuongNhap:r[1],qtyKg:r[1],donVi:'kg',LotNo:'LOT-'+r[0],ngaySanXuat:i?'2026-02-01':'2026-01-01',hanSuDung:i?'2027-02-01':'2027-01-01'}))};
 c.createExportLotLookup_=()=>({sheet:sheet(stock),values:stock,idx:{khoiLuongNhap:1,trangThai:2},getLots:line=>c.getApprovedStockLotsForExport_(line.maNguyenLieu,line.tenNguyenLieu,line.MaKeToan),clear(){}});c.getApprovedInventoryItems_=()=>[];c.getPendingInventoryItems_=()=>[];
 return {c,p,stock,get writes(){return writes}};
}
function payload(s){const groups=s.c.getPendingManualExportApprovals('t').phieu;return {phieuXuatThuCongId:'M1',items:groups[0].items.map(i=>({rowNumber:i.rowNumber,revision:i.revision,allocations:i.allocations}))}}
test('pending manual voucher has selectable lots, fixed accounting code and shared FEFO allocations',()=>{
 const s=setup(),group=s.c.getPendingManualExportApprovals('t').phieu[0];
 a.equal(group.items[0].lotOptions.length,2);a.deepEqual(Array.from(group.items[0].allocations,x=>[x.id,x.quantity]),[['A',5],['B',3]]);a.deepEqual(Array.from(group.items[1].allocations,x=>[x.id,x.quantity]),[['B',3]]);a.equal(group.items[0].MaKeToan,'001');
});
test('manual approval uses selected lots and records matching LotNo amounts and metadata',()=>{
 const s=setup(),body=payload(s);body.items[0].allocations=[{id:'B',quantity:6},{id:'A',quantity:2}];body.items[1].allocations=[{id:'B',quantity:3}];
 s.c.approveManualExportVoucher('t',body);const ix=f=>s.p[0].indexOf(f);
 a.equal(s.stock[1][1],3);a.equal(s.stock[2][1],11);a.equal(s.p[1][ix('LotNo')],'LOT-B, LOT-A');a.equal(s.p[1][ix('IdKhoDaTru')],'B, A');a.equal(s.p[1][ix('khoiLuongXuatThucTeTheoLotNo')],'6, 2');a.equal(s.p[1][ix('TrangThaiXuatThuCong')],'Đã xuất');a.equal(s.p[1][ix('MaKeToan')],'001');a.equal(s.p[1][ix('ngaySanXuat')],'2026-02-01, 2026-01-01');
});
test('invalid, stale or incomplete manual allocations fail before any stock or status write',()=>{
 for(const kind of ['missing','duplicate','revision','wrongLot','overdraw','total','freshStock','account']){
  const s=setup(),body=payload(s);
  if(kind==='missing')body.items.pop();if(kind==='duplicate')body.items.push(body.items[0]);if(kind==='revision')body.items[0].revision='stale';if(kind==='wrongLot')body.items[0].allocations=[{id:'OTHER-CODE',quantity:8}];if(kind==='overdraw')body.items[0].allocations=[{id:'A',quantity:8}];if(kind==='total')body.items[0].allocations=[{id:'B',quantity:7}];if(kind==='freshStock')s.stock[1][1]=1;if(kind==='account')s.p[1][11]='002';
  a.throws(()=>s.c.approveManualExportVoucher('t',body),kind);a.equal(s.writes,0,kind);
 }
});

test('already approved manual voucher cannot deduct stock again',()=>{
 const s=setup(),body=payload(s);s.c.approveManualExportVoucher('t',body);const before=s.stock.map(r=>r.slice()),writes=s.writes;
 a.throws(()=>s.c.approveManualExportVoucher('t',body));a.deepEqual(s.stock,before);a.equal(s.writes,writes);
});

test('manual quantities are saved in export units while stock is deducted in its own unit',()=>{
 const s=setup();s.p[1][6]='g';s.p[1][5]=8000;const body=payload(s);body.items[0].allocations=[{id:'B',quantity:8000}];body.items[1].allocations=[{id:'A',quantity:3}];
 s.c.approveManualExportVoucher('t',body);const ix=f=>s.p[0].indexOf(f);
 a.equal(s.stock[2][1],12);a.equal(s.stock[1][1],2);a.equal(s.p[1][ix('khoiLuongXuatThucTeTheoLotNo')],'8000');
 a.deepEqual(JSON.parse(s.p[1][ix('chiTietTruKho')]),[{IdKho:'B',khoiLuong:8,donVi:'kg'}]);
});
