const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(rows,returned=false){
 const headers=['Id','tenBaiLieu','trangThai','daHoanKhoKhiHuy','tenNguyenLieu','soLuong','NgaySanXuat','nguoiTao','ngayTao','khoiLuongMotMe','MaKeToan'];
 const data=[headers,...rows.map(row=>[...row,2,'2026-11-03','pcn.mai','2026-11-01',300,'001'])];let refunds=0,unlocked=false;
 const sheet={getLastRow:()=>data.length,getDataRange:()=>({getValues:()=>data.map(row=>row.slice())}),getRange(row,col,count=1,width=1){return {setValues(values){values.forEach((r,i)=>r.forEach((v,j)=>{data[row-1+i][col-1+j]=v;}));},setValue(value){data[row-1][col-1]=value;}};}};
 const ctx=vm.createContext({console,LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){unlocked=true;}})}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../../PhongCNTaoKHSX/Code.js'),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../../PhongCNTaoKHSX/SuaKeHoachHuy.js'),'utf8'),ctx);
 ctx.requireAdmin_=()=>{};ctx.ensureKeHoachHeader_=()=>{};ctx.getSheet_=()=>sheet;ctx.getProductionPlans_=()=>[];
 ctx.hoanKhoKhiHuyKeHoach_=id=>{a.equal(id,'KH1');refunds++;return {daHoanKho:returned,nguon:returned?'PhieuXuatNguyenLieu':'ChuaXuatKho',tongDongHoan:3};};
 return {ctx,data,get refunds(){return refunds;},get unlocked(){return unlocked;},cancel:()=>ctx.updateProductionPlanStatus('token',{id:'KH1',trangThai:'Hủy kế hoạch'})};
}
test('cancelling a plan updates every matching ingredient row including noncontiguous rows and refunds once',()=>{
 const s=setup([['KH1','Recipe','Hoạt động','','A'],['OTHER','Other','Hoạt động','','B'],['KH1','Recipe','Hoạt động','','C'],['KH1','Recipe','Hoạt động','','D']],true);
 s.cancel();for(const index of [1,3,4]){a.equal(s.data[index][2],'Hủy kế hoạch');a.equal(s.data[index][3],'Đã hoàn kho');}
 a.equal(s.data[2][2],'Hoạt động');a.equal(s.data[2][3],'');a.equal(s.refunds,1);a.equal(s.unlocked,true);
 s.cancel();a.equal(s.refunds,1);
});
test('partially cancelled legacy plan is repaired without returning stock twice',()=>{
 for(const flag of ['Không cần hoàn kho','Đã hoàn kho']){
  const s=setup([['KH1','Recipe','Hủy kế hoạch',flag,'A'],['KH1','Recipe','Hoạt động','','C'],['KH1','Recipe','Hoạt động','','D']]);
  s.cancel();s.data.slice(1).forEach(row=>{a.equal(row[2],'Hủy kế hoạch');a.equal(row[3],flag);});a.equal(s.refunds,0);
 }
});
test('cancelled row anywhere prevents reactivation and existing return marker prevents a second refund',()=>{
 const s=setup([['KH1','Recipe','Hoạt động','','A'],['KH1','Recipe','Hủy kế hoạch','Đã hoàn kho','B']]);
 a.throws(()=>s.ctx.updateProductionPlanStatus('token',{id:'KH1',trangThai:'Hoạt động'}),/Không thể/);a.equal(s.refunds,0);
 s.cancel();a.equal(s.refunds,0);a.equal(s.data[1][3],'Đã hoàn kho');
});
test('plans without issued stock mark all rows and missing plans do not call stock return',()=>{
 const s=setup([['KH1','Recipe','Hoạt động','','A'],['KH1','Recipe','Hoạt động','','B']]);
 s.cancel();a.equal(s.refunds,1);s.data.slice(1).forEach(row=>a.equal(row[3],'Không cần hoàn kho'));
 const absent=setup([['OTHER','Recipe','Hoạt động','','A']]);a.throws(()=>absent.cancel(),/Không tìm thấy/);a.equal(absent.refunds,0);
});
test('manual legacy repair normalizes cancelled plans without touching stock or active plans',()=>{
 const s=setup([['KH1','Recipe','Hủy kế hoạch','Không cần hoàn kho','A'],['OTHER','Other','Hoạt động','','B'],['KH1','Recipe','Hoạt động','','C']]);
 const result=s.ctx.suaKeHoachHuyThieuDong_();
 a.equal(s.data[3][2],'Hủy kế hoạch');a.equal(s.data[3][3],'Không cần hoàn kho');a.equal(s.data[2][2],'Hoạt động');
 a.equal(result.updatedRows,1);a.equal(s.refunds,0);a.equal(s.ctx.suaKeHoachHuyThieuDong_().updatedRows,0);
});
test('failed stock return leaves every plan row active and releases the lock',()=>{
 const s=setup([['KH1','Recipe','Hoạt động','','A'],['KH1','Recipe','Hoạt động','','B']]);
 s.ctx.hoanKhoKhiHuyKeHoach_=()=>{throw new Error('Stock return failed');};
 a.throws(()=>s.cancel(),/Stock return failed/);s.data.slice(1).forEach(row=>{a.equal(row[2],'Hoạt động');a.equal(row[3],'');});a.equal(s.unlocked,true);
});
test('conflicting return markers are skipped by repair without any stock movement',()=>{
 const s=setup([['KH1','Recipe','Hủy kế hoạch','Đã hoàn kho','A'],['KH1','Recipe','Hoạt động','Không cần hoàn kho','B']]);
 const result=s.ctx.suaKeHoachHuyThieuDong_();a.equal(result.updatedRows,0);a.deepEqual(Array.from(result.skippedPlans),['KH1']);
 a.throws(()=>s.cancel(),/không đồng nhất/);a.equal(s.refunds,0);
});
