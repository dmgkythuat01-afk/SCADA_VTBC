const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(rows){
 const stock=[['Id','khoiLuongNhap','donVi','trangThai'],['KNL1',0,'kg','Đã xuất hết'],['KNL2',1000,'kg','Đã phê duyệt']];
 const headers=['KeHoachId','trangThaiPheDuyet','IdKhoDaTru','khoiLuongCanXuat','donViCanXuat','khoiLuongXuatThucTe','IdKho','khoiLuongKho','donViKho','chiTietTruKho','khoiLuongXuatThucTeTheoLotNo'];
 const vouchers=[headers,...rows];let writes=0;
 const sheet=data=>({getLastRow:()=>data.length,getDataRange:()=>({getValues:()=>data.map(row=>row.slice())}),getRange(row,col){return {setValue(value){data[row-1][col-1]=value;writes++;}};}});
 const ctx=vm.createContext({console});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../../PhongCNTaoKHSX/Code.js'),'utf8'),ctx);
 const helper=path.join(__dirname,'../../PhongCNTaoKHSX/HoanKhoNhieuLo.js');if(fs.existsSync(helper))vm.runInContext(fs.readFileSync(helper,'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../../PhongCNTaoKHSX/DongBoPhieuHuy.js'),'utf8'),ctx);
 ctx.getSpreadsheet_=()=>({getSheetByName:name=>name==='KhoNguyenLieu'?sheet(stock):name==='PhieuXuatNguyenLieu'?sheet(vouchers):null});
 return {ctx,stock,get writes(){return writes;},run:()=>ctx.hoanKhoKhiHuyKeHoach_('KH1')};
}
const multi=['KH1','Đã phê duyệt','KNL1, KNL2',142.5,'kg',142.5,'KNL1, KNL2','94.25, 13113.350719','kg, kg'];
test('exact ledger restores fractional ton stock without changing the issued kg quantity',()=>{
 const ledger=JSON.stringify([{IdKho:'KNL1',khoiLuong:.0012345,donVi:'tan'}]);
 const s=setup([['KH1','Đã phê duyệt','KNL1',1.2345,'kg',1.2345,'','','',ledger]]);
 s.stock[1][1]=.9987655;s.stock[1][2]='tan';s.run();a.equal(s.stock[1][1],1);
});
test('manual non-FEFO split is restored from the exact ledger rather than inferred FIFO',()=>{
 const ledger=JSON.stringify([{IdKho:'KNL1',khoiLuong:2,donVi:'kg'},{IdKho:'KNL2',khoiLuong:6,donVi:'kg'}]);
 const s=setup([['KH1','Đã phê duyệt','KNL1, KNL2',8,'kg',8,'KNL1, KNL2','5, 20','kg, kg',ledger]]);
 s.run();a.equal(s.stock[1][1],2);a.equal(s.stock[2][1],1006);
});
test('returns user example FIFO amounts 94.25 and 48.25 to their exact original stock IDs',()=>{
 const s=setup([multi]);const result=s.run();
 a.equal(s.stock[1][1],94.25);a.equal(s.stock[2][1],1048.25);a.equal(s.stock[1][3],'Đã phê duyệt');a.equal(result.tongDongHoan,1);
});
test('multi-lot return converts before-stock snapshots in different units and adds repeated stock IDs across voucher rows',()=>{
 const s=setup([['KH1','Đã phê duyệt','KNL1, KNL2',3,'kg',3,'KNL1, KNL2','500, 10','g, kg'],['KH1','Đã phê duyệt','KNL1',1,'kg',1,'','','']]);
 s.run();a.equal(s.stock[1][1],1.5);a.equal(s.stock[2][1],1002.5);
});
test('invalid later voucher snapshot is rejected before any stock is changed',()=>{
 for(const invalid of [
 ['KH1','Đã phê duyệt','KNL1, KNL2',142.5,'kg',142.5,'KNL1','94.25','kg'],
 ['KH1','Đã phê duyệt','KNL1, KNL2',142.5,'kg',142.5,'KNL1, KNL2','1, 2','kg, kg'],
 ['KH1','Đã phê duyệt','KNL1, MISSING',142.5,'kg',142.5,'KNL1, MISSING','94.25, 500','kg, kg']
 ]){
  const s=setup([['KH1','Đã phê duyệt','KNL1',1,'kg',1,'','',''],invalid]);
  a.throws(()=>s.run());a.equal(s.writes,0);a.equal(s.stock[1][1],0);
 }
});
test('full cancellation restores both lots once and marks every ingredient row cancelled',()=>{
 const s=setup([multi]);
 const headers=['Id','tenBaiLieu','soLuong','NgaySanXuat','nguoiTao','ngayTao','khoiLuongMotMe','trangThai','daHoanKhoKhiHuy','tenNguyenLieu','MaKeToan'];
 const data=[headers,['KH1','Recipe',2,'2026-11-03','pcn','2026-11-01',300,'Hoạt động','','LAS','001'],['KH1','Recipe',2,'2026-11-03','pcn','2026-11-01',300,'Hoạt động','','Other','002']];
 s.ctx.requireAdmin_=()=>{};s.ctx.ensureKeHoachHeader_=()=>{};s.ctx.getProductionPlans_=()=>[];
 s.ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
 s.ctx.getSheet_=()=>({getLastRow:()=>data.length,getDataRange:()=>({getValues:()=>data.map(row=>row.slice())}),getRange(row,col){return {setValues(values){values[0].forEach((value,index)=>{data[row-1][col-1+index]=value;});},setValue(value){data[row-1][col-1]=value;}};}});
 s.ctx.updateProductionPlanStatus('token',{id:'KH1',trangThai:'Hủy kế hoạch'});
 a.equal(s.stock[1][1],94.25);a.equal(s.stock[2][1],1048.25);
 data.slice(1).forEach(row=>{a.equal(row[7],'Hủy kế hoạch');a.equal(row[8],'Đã hoàn kho');});
 s.ctx.updateProductionPlanStatus('token',{id:'KH1',trangThai:'Hủy kế hoạch'});
 a.equal(s.stock[1][1],94.25);a.equal(s.stock[2][1],1048.25);
});


test('per-lot actual column takes priority over old ledger and FIFO snapshots',()=>{
 const oldLedger=JSON.stringify([{IdKho:'KNL1',khoiLuong:5,donVi:'kg'},{IdKho:'KNL2',khoiLuong:3,donVi:'kg'}]);
 const s=setup([['KH1','Đã phê duyệt','KNL2, KNL1',8,'kg',8,'KNL2, KNL1','20, 5','kg, kg',oldLedger,'6, 2']]);
 s.run();a.equal(s.stock[1][1],2);a.equal(s.stock[2][1],1006);
});

test('per-lot quantities use export unit and convert to each stock unit',()=>{
 const s=setup([['KH1','Đã phê duyệt','KNL1, KNL2',3000,'g',3000,'','','','','1000, 2000']]);
 s.stock[1][2]='tan';s.run();a.equal(s.stock[1][1],.001);a.equal(s.stock[2][1],1002);
});

test('invalid per-lot actual column never falls back or partly restores stock',()=>{
 for(const value of ['2','2, 7','0, 8','-1, 9','2, x','2, 6,','2, ']){
  const valid=['KH1','Đã phê duyệt','KNL1',1,'kg',1,'','','','','1'];
  const invalid=['KH1','Đã phê duyệt','KNL1, KNL2',8,'kg',8,'KNL1, KNL2','5, 20','kg, kg','',value];
  const s=setup([valid,invalid]);a.throws(()=>s.run());a.equal(s.writes,0);
 }
});
