const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(){
 const headers='PhieuXuatId KeHoachId tenBaiLieu soLuong NgaySanXuat STT maNguyenLieu tenNguyenLieu khoiLuongCanXuat donViCanXuat sttTron canSuDung IdKho khoiLuongKho donViKho quyCachDongGoi LotNo ngaySanXuatKho hanSuDung nhaCungCap ngayNhap nguoiTao ngayTao trangThaiPheDuyet cachXuat nguoiPheDuyet thoiGianDuyet IdKhoDaTru khoiLuongXuatThucTe MaKeToan'.split(' ');
 const record={PhieuXuatId:'PX',KeHoachId:'KH',maNguyenLieu:'NL',tenNguyenLieu:'Name',MaKeToan:'001',donViCanXuat:'kg',khoiLuongCanXuat:8,trangThaiPheDuyet:'Chờ phê duyệt'};
 const vouchers=[headers,headers.map(h=>record[h]??''),headers.map(h=>record[h]??'')];
 const inventory=[['Id','khoiLuongNhap','trangThai'],['EARLY',5,'Đã phê duyệt'],['LATE',20,'Đã phê duyệt']];let writes=0;
 function sheet(data){return {getLastRow:()=>data.length,getLastColumn:()=>data[0].length,getDataRange:()=>({getValues:()=>data.map(row=>Array.from({length:data[0].length},(_,i)=>row[i]??''))}),getRange(row,col,count=1,width=1){return {setValue(value){data[row-1][col-1]=value;writes++;},setValues(values){values.forEach((r,i)=>r.forEach((v,j)=>{data[row-1+i][col-1+j]=v;writes++;}));}};}};}
 const phieu=sheet(vouchers),kho=sheet(inventory),ctx=vm.createContext({console,LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})}});
 for(const file of ['Code.js','ExportLotSelectionGs.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../QuanLyKho',file),'utf8'),ctx);
 ctx.requireInventoryRole_=()=>({useName:'kho'});ctx.getPhieuXuatSheet_=()=>phieu;ctx.getSheet_=()=>kho;ctx.getSpreadsheet_=()=>({});ctx.getActivePlanIdsForExport_=()=>new Set(['KH']);ctx.getKhoHeaderIndex_=()=>({Id:0,khoiLuongNhap:1,trangThai:2});ctx.nowText_=()=> '2026-11-02';ctx.getPendingExportRequests_=()=>[];ctx.getApprovedInventoryItems_=()=>[];ctx.getPendingInventoryItems_=()=>[];
 ctx.getApprovedStockLotsForExport_=(code,name,account)=>{a.equal(account,'001');return inventory.slice(1).map((row,i)=>({Id:row[0],rowNumber:i+2,khoiLuongNhap:row[1],qtyKg:row[1],donVi:'kg',LotNo:row[0],hanSuDung:i?'2027-01-01':'2026-12-01'}));};
 const revision=ctx.exportLotRevision_(record);
 const payload={phieuXuatId:'PX',items:[{rowNumber:2,revision,khoiLuongCanXuat:8,khoiLuongXuatThucTe:8,allocations:[{id:'LATE',quantity:8}]},{rowNumber:3,revision,khoiLuongCanXuat:3,khoiLuongXuatThucTe:3,allocations:[{id:'EARLY',quantity:3}]}]};
 return {ctx,vouchers,inventory,headers,payload,get writes(){return writes;}};
}
test('whole approval persists actual amounts, fixed accounting code and exact per-lot ledger',()=>{
 const s=setup();s.ctx.approveExportRequest('token',s.payload);
 a.equal(s.inventory[1][1],2);a.equal(s.inventory[2][1],12);
 const index=field=>s.vouchers[0].indexOf(field);
 a.equal(s.vouchers[1][index('MaKeToan')],'001');a.equal(s.vouchers[1][index('IdKhoDaTru')],'LATE');
 a.deepEqual(JSON.parse(s.vouchers[1][index('chiTietTruKho')]),[{IdKho:'LATE',khoiLuong:8,donVi:'kg'}]);
 a.equal(s.vouchers[2][index('khoiLuongXuatThucTe')],3);a.equal(s.vouchers[2][index('trangThaiPheDuyet')],'Đã phê duyệt');
});
test('single approval honors selection and rejects stale identity or fresh stock shortage before any write',()=>{
 const single=setup();single.ctx.approveExportLine('token',single.payload.items[0]);a.equal(single.inventory[2][1],12);a.equal(single.inventory[1][1],5);
 for(const kind of ['revision','wrongCodeLot','stock','shared']){
  const s=setup();
  if(kind==='revision')s.payload.items[0].revision='changed accounting code';
  if(kind==='wrongCodeLot')s.payload.items[0].allocations[0].id='OTHER_CODE';
  if(kind==='stock')s.inventory[2][1]=2;
  if(kind==='shared'){s.payload.items[1].allocations=[{id:'LATE',quantity:15}];s.payload.items[1].khoiLuongXuatThucTe=15;}
  a.throws(()=>s.ctx.approveExportRequest('token',s.payload));a.equal(s.writes,0);
 }
});
