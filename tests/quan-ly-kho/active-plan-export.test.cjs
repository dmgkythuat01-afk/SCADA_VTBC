const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(){
 const plans=[['Id','trangThai'],['ACTIVE','Hoạt động'],['CANCELLED','Hủy kế hoạch'],['PARTIAL','Hoạt động'],['PARTIAL','Hủy kế hoạch'],['BLANK','']];
 const fields=['PhieuXuatId','KeHoachId','trangThaiPheDuyet','maNguyenLieu','tenNguyenLieu','MaKeToan','khoiLuongCanXuat','donViCanXuat'];
 const vouchers=[fields,['PX1','ACTIVE','','NL','Name','001',10,'kg'],['PX2','CANCELLED','','NL','Name','001',10,'kg'],['PX3','PARTIAL','','NL','Name','001',10,'kg'],['PX4','UNKNOWN','','NL','Name','001',10,'kg'],['PX5','BLANK','','NL','Name','001',10,'kg'],['PX6','ACTIVE','Đã phê duyệt','NL','Name','001',10,'kg']];
 const sheet=data=>({getLastRow:()=>data.length,getDataRange:()=>({getValues:()=>data})});let stockCalls=0;
 const ctx=vm.createContext({console});vm.runInContext(fs.readFileSync(path.join(__dirname,'../../QuanLyKho/Code.js'),'utf8'),ctx);
 ctx.getSpreadsheet_=()=>({getSheetByName:name=>name==='KeHoachSanXuat'?sheet(plans):sheet(vouchers)});
 ctx.ensurePhieuXuatHeader_=()=>{};ctx.getPhieuXuatHeaderIndex_=()=>Object.fromEntries(fields.map((field,index)=>[field,index]));
 ctx.buildExportLotPreview_=groups=>groups;
 ctx.getAvailableKgForExport_=()=>{stockCalls++;return 100;};ctx.toKg_=value=>value;ctx.fromKg_=value=>value;ctx.roundQty_=value=>value;ctx.formatDateValue_=value=>value||'';
 return {ctx,plans,get stockCalls(){return stockCalls;}};
}
test('approval list only returns pending exports of explicitly active plans; cancelled ingredient row overrides active rows',()=>{
 const s=setup(),rows=s.ctx.getPendingExportRequests_();
 a.deepEqual(Array.from(rows,row=>row.PhieuXuatId),['PX1']);a.equal(s.stockCalls,0);
});
test('active plan lookup requires ID and status headers',()=>{
 const s=setup();s.plans[0][1]='wrong';a.throws(()=>s.ctx.getPendingExportRequests_(),/trangThai/);a.equal(s.stockCalls,0);
});
