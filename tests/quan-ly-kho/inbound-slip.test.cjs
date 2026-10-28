const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(){
 const nodes=new Map();const el=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',hidden:false,textContent:''});return nodes.get(id);};
 let output='',prints=0;
 const win={document:{open(){},write(html){output=html;},close(){}},focus(){},print(){prints++;}};
 const ctx=vm.createContext({console,Intl,document:{getElementById:el},window:{open:()=>win}});
 for(const file of ['WarehouseSlipForm.html','PhieuNhapNguyenLieuPrint.html'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../QuanLyKho',file),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 return {api:vm.runInContext('MaterialInboundSlip',ctx),el,get output(){return output;},get prints(){return prints;}};
}
const rows=[{'Tên nguyên vật liệu':'Material <A>','Mã kế toán':'00102010','Đvt':'kg','Số lượng':1234.5,'Lot No':'LOT-01',_slip:{manufactured:'2026-01-02',expires:'2027-01-02'}},{'Tên nguyên vật liệu':'Second','Mã kế toán':'002','Đvt':'kg','Số lượng':4,'Lot No':'LOT-02'}];
test('all-materials inbound slip maps real quantity, codes and dates with blank manual columns',()=>{
 const state=setup();state.api.setData('',rows);a.equal(state.el('materialInboundSlipCard').hidden,false);
 const html=state.el('materialInboundSlipPreview').innerHTML;a.ok(html.includes('PHIẾU NHẬP KHO'));a.ok(html.includes('BM-QT.KHO-01.02'));a.ok(html.includes('00102010'));a.ok(html.includes('02/01/2026'));a.ok(html.includes('02/01/2027'));a.ok(html.includes('Material &lt;A&gt;'));a.ok(html.includes('Second'));a.equal((html.match(/1\.234,5/g)||[]).length,1);
 for(const key of ['deliverer','purchaseOrder','referenceType','referenceNumber','referenceDate','referenceIssuer','warehouse','location','documentQty0','convertedQty0','warehouseRow0','date','number'])a.ok(html.includes('data-slip-field="'+key+'"'));
});
test('edited header and table cells are escaped into print and drafts clear on filter change',()=>{
 const state=setup();state.api.setData('',rows);
 for(const [key,value] of Object.entries({deliverer:'Người giao',purchaseOrder:'PO01',warehouse:'Kho A\nNgăn 2',documentQty0:'1234,5',convertedQty0:'2',warehouseRow0:'Kho <B>'}))state.api.edit({target:{dataset:{slipField:key},textContent:value}});
 state.api.refresh();a.ok(state.el('materialInboundSlipPreview').innerHTML.includes('PO01'));
 state.api.print();a.equal(state.prints,1);a.ok(state.output.includes('Người giao'));a.ok(state.output.includes('PO01'));a.ok(state.output.includes('Kho &lt;B&gt;'));a.ok(!state.output.includes('contenteditable='));
 a.ok(state.output.includes('<span class="slip-filled">Kho A\nNgăn 2</span>'));a.ok(state.output.includes('.slip-filled { white-space:pre-wrap;'));
 state.api.setData('second',[rows[1]]);state.api.print();a.ok(!state.output.includes('PO01'));a.ok(!state.output.includes('LOT-01'));
 state.api.setData('',[]);state.api.print();a.equal(state.prints,2);a.equal(state.el('materialInboundSlipCard').hidden,true);
});
test('inbound deliverer defaults to unique suppliers from the selected rows',()=>{
 const state=setup();const selected=[{...rows[0],'Tên NCC':'NCC A'},{...rows[1],'Tên NCC':'NCC B'},{...rows[1],'Tên NCC':'NCC A'}];
 state.api.setData('',selected);state.api.print();a.ok(state.output.includes('NCC A; NCC B'));a.equal((state.output.match(/NCC A/g)||[]).length,1);
 state.api.setData('one',[selected[0]]);state.api.print();a.ok(state.output.includes('NCC A'));a.ok(!state.output.includes('NCC B'));
});
test('inbound slip date comes from receipt dates without duplicating the same day',()=>{
 const state=setup();const selected=[{...rows[0],'Thời gian tạo':'2026-10-28 08:30:00'},{...rows[1],'Thời gian tạo':'2026-10-28 12:00:00'}];
 state.api.setData('',selected);state.api.print();a.ok(state.output.includes('Ngày 28 tháng 10 năm 2026'));a.equal((state.output.match(/Ngày 28 tháng 10 năm 2026/g)||[]).length,1);
 state.api.setData('',[...selected,{...rows[1],'Thời gian tạo':'2026-10-27'}]);state.api.print();a.ok(state.output.includes('Ngày 27 tháng 10 năm 2026'));a.ok(state.output.includes('Ngày 28 tháng 10 năm 2026'));
});
