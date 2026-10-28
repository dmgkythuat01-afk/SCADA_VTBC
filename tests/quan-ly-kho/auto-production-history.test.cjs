const test=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'../../QuanLyKho');
function setup(){
 const ctx=vm.createContext({console});
 vm.runInContext(fs.readFileSync(path.join(root,'Code.js'),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'LichSuXuatSanXuatTuDongService.js'),'utf8'),ctx);
 return ctx;
}
const headers=['ngayTao','thoiGianDuyet','nguoiTao','cachXuat','KeHoachId','maNguyenLieu','tenNguyenLieu','donViCanXuat','khoiLuongXuatThucTe','LotNo','tenBaiLieu','trangThaiPheDuyet'];
const products={headers:['tenBaiLieu1','tenBaiLieu2','maSanPham'],rows:[{tenBaiLieu1:'Bài 1',tenBaiLieu2:'Bài 2',maSanPham:'SP01'}]};
function row(extra={}){return {ngayTao:'2026-10-01 09:00:00',thoiGianDuyet:'2026-10-28 10:00:00',nguoiTao:'Nhân viên',cachXuat:'Theo kế hoạch',KeHoachId:'KH01',maNguyenLieu:'NL01',tenNguyenLieu:'Nguyên liệu',donViCanXuat:'kg',khoiLuongXuatThucTe:0,LotNo:'A, B',tenBaiLieu:'Bài 2',trangThaiPheDuyet:'Đã phê duyệt',...extra};}
test('report filters approval date, maps either recipe field, labels lots and preserves quantity',()=>{
 const ctx=setup();const result=ctx.buildAutoProductionExportHistory_({headers,rows:[row(),row({tenBaiLieu:'Bài 1',LotNo:'C',khoiLuongXuatThucTe:12}),row({thoiGianDuyet:'2026-10-29'}),row({trangThaiPheDuyet:'Chờ duyệt'})]},products,'2026-10-28','2026-10-28');
 a.equal(result.rows.length,2);a.equal(result.headers.length,11);a.equal(result.rows[0]['Mã sản phẩm'],'SP01');a.equal(result.rows[0]['Lot No'],'Lot 1: A; Lot 2: B');a.equal(result.rows[0]['Số lượng'],0);a.equal(result.rows[1]['Lot No'],'C');a.equal(result.rows[1]['Số lượng'],12);
});
test('unmatched and ambiguous recipes remain visible with explicit warnings',()=>{
 const ctx=setup();const p={...products,rows:[...products.rows,{tenBaiLieu1:'Bài 2',maSanPham:'SP02'}]};
 const result=ctx.buildAutoProductionExportHistory_({headers,rows:[row(),row({tenBaiLieu:'Không có'})]},p,'2026-10-28','2026-10-28');
 a.equal(result.rows.length,2);a.equal(result.rows[0]['Mã sản phẩm'],'SP01, SP02');a.equal(result.rows[1]['Mã sản phẩm'],'');a.equal(result.warnings.length,2);
});
test('API checks role and rejects invalid dates before reading sheets',()=>{
 const ctx=setup();let checked=false;ctx.requireInventoryRole_=()=>{checked=true;};
 a.throws(()=>ctx.getAutoProductionExportHistory('token',{fromDate:'2026-10-29',toDate:'2026-10-28'}),/Khoảng ngày/);a.ok(checked);
 a.throws(()=>ctx.buildAutoProductionExportHistory_({headers:[],rows:[]},products,'2026-10-28','2026-10-28'),/thiếu cột/);
});
test('card loads approval date range and exports the same loaded rows',()=>{
 const html=fs.readFileSync(path.join(root,'LichSuXuatSanXuatTuDong.html'),'utf8');
 const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{value:'2026-10-28',disabled:false,style:{},querySelector:()=>null,replaceChildren(){},appendChild(){}});return elements.get(id);};
 let success, failure, request, exported, rendered;
 const runner={withSuccessHandler(fn){success=fn;return this;},withFailureHandler(fn){failure=fn;return this;},getAutoProductionExportHistory(token,range){request={token,range};}};
 const ctx=vm.createContext({Intl,Date,sessionToken:'token',document:{getElementById:el,addEventListener:(name,fn)=>fn(),createElement:()=>({})},google:{script:{run:runner}},showMessage(){},renderGenericReportTable:(id,heads,rows)=>{rendered=rows;},exportRowsToExcel:(...args)=>{exported=args;}});
 vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 vm.runInContext('AutoProductionExportHistory.load()',ctx);a.equal(request.token,'token');a.equal(request.range.fromDate,el('autoProductionHistoryFrom').value);
 const rows=[{'Số lượng':12,'Lot No':'Lot 1: A; Lot 2: B'}];success({success:true,headers:['Số lượng','Lot No'],rows,warnings:[]});
 a.equal(rendered,rows);a.equal(el('autoProductionHistoryExcel').disabled,false);
 vm.runInContext('AutoProductionExportHistory.download()',ctx);a.equal(exported[2],rows);
 vm.runInContext('AutoProductionExportHistory.load()',ctx);failure({message:'Failed'});a.equal(el('autoProductionHistoryExcel').disabled,true);a.equal(rendered.length,0);
});
