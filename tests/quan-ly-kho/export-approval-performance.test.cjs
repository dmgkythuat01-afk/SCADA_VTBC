const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function context(){const c=vm.createContext({console});for(const file of ['Code.js','ExportLotSelectionGs.js','ExportApprovalPerformanceGs.js']){const p=path.join(__dirname,'../../QuanLyKho',file);if(fs.existsSync(p))vm.runInContext(fs.readFileSync(p,'utf8'),c)}return c}
test('one fresh stock snapshot serves many different materials and the next request sees new balances',()=>{
 const c=context(),headers=['Id','maNguyenLieu','tenNguyenLieu','khoiLuongNhap','donVi','LotNo','trangThai','MaKeToan'];
 const data=[headers,...Array.from({length:80},(_,i)=>['LOT'+i,'NL'+i,'Name '+i,100,'kg','L'+i,'Đã phê duyệt','001'])];let reads=0,ensures=0;
 const sheet={getLastRow:()=>data.length,getDataRange:()=>({getValues:()=>{reads++;return data.map(r=>r.slice())}})};
 c.getSheet_=()=>sheet;c.ensureKhoHeader_=()=>{ensures++};c.getKhoHeaderIndex_=h=>Object.fromEntries([...headers,'trangThaiNguyenLieu','quyCachDongGoi','ngaySanXuat','hanSuDung','nhaCungCap','ngayNhap','loaiNguyenLieu','heSoQuyDoiKho','doViTinhToan'].map(k=>[k,h.indexOf(k)]));
 let lookup=c.createExportLotLookup_();
 for(let i=0;i<80;i++){const line={maNguyenLieu:'NL'+i,tenNguyenLieu:'Name '+i,MaKeToan:'001'};a.equal(lookup.getLots(line)[0].qtyKg,100);lookup.getLots(line)}
 a.equal(reads,1);a.equal(ensures,1);data[1][3]=1;
 lookup=c.createExportLotLookup_();a.equal(lookup.getLots({maNguyenLieu:'NL0',tenNguyenLieu:'Name 0',MaKeToan:'001'})[0].qtyKg,1);a.equal(reads,2);
});
test('batch writer updates only selected cells and merges contiguous rows into two calls',()=>{
 const c=context(),data=Array.from({length:51},()=>['keep','keep','keep','FORMULA','keep']);let calls=0;
 const sheet={getRange:(r,col,n,w)=>({setValues:values=>{calls++;a.equal(values.length,n);values.forEach((row,i)=>{a.equal(row.length,w);row.forEach((v,j)=>{data[r-1+i][col-1+j]=v})})}})};
 const changes=[];for(let row=2;row<=51;row++){changes.push({row,column:2,value:row},{row,column:3,value:row+1},{row,column:5,value:'approved'})}
 c.writeExportApprovalCells_(sheet,changes);a.equal(calls,2);a.equal(data[50][1],51);a.equal(data[50][3],'FORMULA');a.equal(data[0][1],'keep');
});

function fullScenario(){
 const c=context();for(const file of ['DuyetPhieuXuatThuCong.js','ManualExportLotSelectionGs.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../QuanLyKho',file),'utf8'),c);
 const kh='Id maNguyenLieu tenNguyenLieu khoiLuongNhap donVi quyCachDongGoi LotNo ngaySanXuat hanSuDung nhaCungCap ngayNhap trangThai nguoiPheDuyetChatLuong ngayPheDuyet anhChatLuong trangThaiNguyenLieu loaiNguyenLieu MaKeToan heSoQuyDoiKho doViTinhToan'.split(' ');
 const ph='PhieuXuatId KeHoachId tenBaiLieu soLuong NgaySanXuat STT maNguyenLieu tenNguyenLieu khoiLuongCanXuat donViCanXuat sttTron canSuDung IdKho khoiLuongKho donViKho quyCachDongGoi LotNo ngaySanXuatKho hanSuDung nhaCungCap ngayNhap nguoiTao ngayTao trangThaiPheDuyet cachXuat nguoiPheDuyet thoiGianDuyet IdKhoDaTru khoiLuongXuatThucTe MaKeToan'.split(' ');
 const mh='PhieuXuatThuCongId STT Id maNguyenLieu tenNguyenLieu khoiLuongNhap donVi TrangThaiXuatThuCong nguoiDuyet thoiGianDuyet IdKhoDaTru MaKeToan LotNo ngaySanXuat hanSuDung'.split(' ');
 const inventory=[kh],production=[ph],manual=[mh];
 for(let i=0;i<50;i++){
  const stock={Id:'LOT'+i,maNguyenLieu:'NL'+i,tenNguyenLieu:'Name '+i,khoiLuongNhap:100,donVi:'kg',LotNo:'L'+i,trangThai:'Đã phê duyệt',trangThaiNguyenLieu:'Sử dụng',MaKeToan:'001'};
  inventory.push(kh.map(h=>stock[h]??''));
  const line={PhieuXuatId:'PX',KeHoachId:'KH',maNguyenLieu:'NL'+i,tenNguyenLieu:'Name '+i,khoiLuongCanXuat:8,donViCanXuat:'kg',MaKeToan:'001',trangThaiPheDuyet:'Chờ phê duyệt'};
  production.push(ph.map(h=>line[h]??''));manual.push(mh.map(h=>({PhieuXuatThuCongId:'M',STT:i+1,Id:stock.Id,maNguyenLieu:stock.maNguyenLieu,tenNguyenLieu:stock.tenNguyenLieu,khoiLuongNhap:8,donVi:'kg',TrangThaiXuatThuCong:'Đã tạo',MaKeToan:'001'}[h]??'')));
 }
 const counts={stockReads:0,writes:0};
 const sheet=(data,isStock)=>({getLastRow:()=>data.length,getLastColumn:()=>data[0].length,getDataRange:()=>({getValues(){if(isStock)counts.stockReads++;return data.map(r=>r.slice())}}),getRange(row,col,n=1,w=1){return {setValue(v){counts.writes++;data[row-1][col-1]=v},setValues(values){counts.writes++;values.forEach((r,i)=>r.forEach((v,j)=>{data[row-1+i][col-1+j]=v}))}}}});
 const kho=sheet(inventory,true),px=sheet(production),m=sheet(manual);c.getSheet_=name=>name==='KhoNguyenLieu'?kho:name==='PhieuXuatThuCong'?m:px;
 c.getSpreadsheet_=()=>({getSheetByName:()=>px});c.getPhieuXuatSheet_=()=>px;c.ensureKhoHeader_=()=>{};c.ensurePhieuXuatHeader_=()=>{};c.getActivePlanIdsForExport_=()=>new Set(['KH']);c.requireInventoryRole_=()=>({useName:'keeper'});c.nowText_=()=> '2026-11-06';c.getNhaCungCapCapByMaKeToanMap_=()=>({});c.manualApprovalGetMaterialInfoByAccountingCodeMap_=()=>({});c.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
 return {c,counts,inventory,production,manual};
}
test('both pending-card APIs read stock once for 50 different materials',()=>{
 const s=fullScenario();a.equal(s.c.getPendingExportRequests_()[0].items.length,50);a.equal(s.counts.stockReads,1);
 s.counts.stockReads=0;a.equal(s.c.getPendingManualExportApprovals('t').phieu[0].items.length,50);a.equal(s.counts.stockReads,1);
});
test('both 50-line approval APIs validate fresh stock once and batch writes, returning updated balances',t=>{
 for(const manual of [false,true]){
  const s=fullScenario(),group=manual?s.c.getPendingManualExportApprovals('t').phieu[0]:s.c.getPendingExportRequests_()[0];
  const body=manual?{phieuXuatThuCongId:'M',items:group.items.map(line=>({rowNumber:line.rowNumber,revision:line.revision,allocations:line.allocations}))}:{phieuXuatId:'PX',items:group.items.map(line=>({...line,khoiLuongXuatThucTe:8}))};
  s.counts.stockReads=0;s.counts.writes=0;
  const result=manual?s.c.approveManualExportVoucher('t',body):s.c.approveExportRequest('t',body);
  t.diagnostic((manual?'Manual':'Production')+': '+s.counts.stockReads+' full stock read, '+s.counts.writes+' write calls for 50 lines');
  a.equal(s.counts.stockReads,1,manual?'manual':'production');a.ok(s.counts.writes<=12,'too many writes: '+s.counts.writes);a.equal(result.tonKho.length,50);a.equal(result.tonKho[0].khoiLuongNhap,92);a.equal(s.inventory[1][3],92);
 }
});
