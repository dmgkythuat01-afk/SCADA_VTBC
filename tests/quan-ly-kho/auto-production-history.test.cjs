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
const headers=['ngayTao','thoiGianDuyet','nguoiTao','cachXuat','KeHoachId','maNguyenLieu','MaKeToan','tenNguyenLieu','donViCanXuat','khoiLuongXuatThucTe','LotNo','tenBaiLieu','trangThaiPheDuyet'];
const products={headers:['tenBaiLieu1','tenBaiLieu2','maSanPham'],rows:[{tenBaiLieu1:'Bài 1',tenBaiLieu2:'Bài 2',maSanPham:'SP01'}]};
function row(extra={}){return {ngayTao:'2026-10-01 09:00:00',thoiGianDuyet:'2026-10-28 10:00:00',nguoiTao:'Nhân viên',cachXuat:'Theo kế hoạch',KeHoachId:'KH01',maNguyenLieu:'NL01',tenNguyenLieu:'Nguyên liệu',donViCanXuat:'kg',khoiLuongXuatThucTe:0,LotNo:'A, B',tenBaiLieu:'Bài 2',trangThaiPheDuyet:'Đã phê duyệt',...extra};}
test('print metadata retains accounting code and aligned lot dates without changing Excel headers',()=>{
 const ctx=setup();const result=ctx.buildAutoProductionExportHistory_({headers,rows:[row({MaKeToan:'0012',ngaySanXuatKho:'2026-01-01, ',hanSuDung:'2027-01-01, 2027-02-01'})]},products,'2026-10-28','2026-10-28');
 a.equal(result.rows[0]._slip.accountingCode,'0012');a.equal(result.rows[0]._slip.recipe,'Bài 2');a.equal(result.rows[0]._slip.manufactured,'2026-01-01, ');a.equal(result.headers.length,12);
 a.equal(result.headers[result.headers.indexOf('Mã NLVT')+1],'Mã kế toán');a.equal(result.rows[0]['Mã kế toán'],'0012');
 a.equal(result.rows[0]._slip.approvalDate,'2026-10-28');
});
test('print recipient resolves the unique batch username and does not select conflicting names',()=>{
 const ctx=setup();const accounts=[{useName:'can1',name:'Người Cân',passWord:'SECRET'},{useName:'can2',name:'Người Khác'}];
 const result=ctx.buildAutoProductionSlipPeople_([{KeHoachId:'KH01',nguoiCan:'can1'},{KeHoachId:'KH01',nguoiCan:'can1'},{KeHoachId:'KH02',nguoiCan:'can1'},{KeHoachId:'KH02',nguoiCan:'can2'}],accounts,['KH01','KH02','KH03']);
 a.equal(result.KH01.recipient,'Người Cân');a.equal(result.KH02.recipient,'');a.ok(result.KH02.warning);a.ok(result.KH03.warning);a.ok(!JSON.stringify(result).includes('SECRET'));
});
test('account lookup reads username and name columns only',()=>{
 const ctx=setup();const reads=[];
 const sheet={getLastColumn:()=>3,getLastRow:()=>2,getName:()=> 'account',getRange:(r,c)=>{reads.push([r,c]);return {getDisplayValues:()=>r===1?[['useName','passWord','name']]:[[c===1?'can1':'Tên người cân']]};}};
 const result=ctx.readAutoSlipColumns_(sheet,['useName','name']);a.equal(result[0].name,'Tên người cân');a.ok(!reads.some(([r,c])=>r===2&&c===2));a.ok(!JSON.stringify(result).includes('passWord'));
});
test('recipient lookup ignores username case and surrounding whitespace',()=>{
 const ctx=setup();
 const result=ctx.buildAutoProductionSlipPeople_([{KeHoachId:'KH01',nguoiCan:' vg.dung '},{KeHoachId:'KH01',nguoiCan:'VG.DUNG'}],[{useName:' Vg.dung ',name:'Nguyễn Văn Dũng'}],['KH01']);
 a.equal(result.KH01.recipient,'Nguyễn Văn Dũng');a.equal(result.KH01.warning,'');
 const conflict=ctx.buildAutoProductionSlipPeople_([{KeHoachId:'KH01',nguoiCan:'vg.dung'}],[{useName:'Vg.dung',name:'Tên A'},{useName:'VG.DUNG',name:'Tên B'}],['KH01']);
 a.equal(conflict.KH01.recipient,'');a.ok(conflict.KH01.warning);
});
test('report filters approval date, maps either recipe field, labels lots and preserves quantity',()=>{
 const ctx=setup();const result=ctx.buildAutoProductionExportHistory_({headers,rows:[row(),row({tenBaiLieu:'Bài 1',LotNo:'C',khoiLuongXuatThucTe:12}),row({thoiGianDuyet:'2026-10-29'}),row({trangThaiPheDuyet:'Chờ duyệt'})]},products,'2026-10-28','2026-10-28');
 a.equal(result.rows.length,2);a.equal(result.headers.length,12);a.equal(result.rows[0]['Mã sản phẩm'],'SP01');a.equal(result.rows[0]['Lot No'],'Lot 1: A; Lot 2: B');a.equal(result.rows[0]['Số lượng'],0);a.equal(result.rows[1]['Lot No'],'C');a.equal(result.rows[1]['Số lượng'],12);
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
 const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{value:'2026-10-28',disabled:false,style:{},options:[],querySelector:()=>null,replaceChildren(...items){this.options=items;},add(item){this.options.push(item);},appendChild(){}});return elements.get(id);};
 let success, failure, request, exported, rendered, slipSelection;
 const runner={withSuccessHandler(fn){success=fn;return this;},withFailureHandler(fn){failure=fn;return this;},getAutoProductionExportHistory(token,range){request={token,range};}};
 const ctx=vm.createContext({Intl,Date,AutoProductionSlip:{setData(...args){slipSelection=args;}},Option:function(text,value){this.text=text;this.value=value;},sessionToken:'token',document:{getElementById:el,addEventListener:(name,fn)=>fn(),createElement:()=>({})},google:{script:{run:runner}},showMessage(){},renderGenericReportTable:(id,heads,rows)=>{rendered=rows;},exportRowsToExcel:(...args)=>{exported=args;}});
 vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 vm.runInContext('AutoProductionExportHistory.load()',ctx);a.equal(request.token,'token');a.equal(request.range.fromDate,el('autoProductionHistoryFrom').value);
 const rows=[{'Số KHSX':'KH01','Số lượng':12,'Lot No':'Lot 1: A; Lot 2: B'},{'Số KHSX':'KH02','Số lượng':3},{'Số KHSX':'KH01','Số lượng':4}];success({success:true,headers:['Số KHSX','Số lượng','Lot No'],rows,warnings:[],slipPeople:{KH01:{recipient:'Người cân'}}});
 a.equal(rendered.length,3);a.equal(el('autoProductionHistoryExcel').disabled,false);
 a.equal(el('autoProductionHistoryPlan').options.length,3);
 el('autoProductionHistoryPlan').value='KH01';vm.runInContext('AutoProductionExportHistory.render()',ctx);a.equal(rendered.length,2);
 a.equal(slipSelection[0],'KH01');a.equal(slipSelection[1].length,2);a.equal(slipSelection[2].recipient,'Người cân');
 vm.runInContext('AutoProductionExportHistory.download()',ctx);a.equal(exported[2].length,2);a.equal(exported[2][0],rows[0]);
 el('autoProductionHistoryPlan').value='';vm.runInContext('AutoProductionExportHistory.render()',ctx);a.equal(rendered.length,3);
 vm.runInContext('AutoProductionExportHistory.load()',ctx);failure({message:'Failed'});a.equal(el('autoProductionHistoryExcel').disabled,true);a.equal(rendered.length,0);
 a.equal(slipSelection[0],'');a.equal(slipSelection[1].length,0);
});
