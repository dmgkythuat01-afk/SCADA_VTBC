const test=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const file=path.join(__dirname,'../../QuanLyKho/PhieuXuatSanXuatPrint.html');
function setup(){
 const nodes=new Map();const el=id=>{if(!nodes.has(id))nodes.set(id,{value:'',innerHTML:'',hidden:false,textContent:''});return nodes.get(id);};
 let output='',printed=0,load,wordFile;
 // document.open() thực tế xóa listener load đã gắn trên cửa sổ.
 const win={document:{open(){load=undefined;},write(html){output=html;},close(){if(load)load();}},addEventListener:(name,fn)=>{load=fn;},focus(){},print(){printed++;}};
 const ctx=vm.createContext({console,Intl,WarehouseSlipWord:{download:(name,body)=>{wordFile={name,body};}},document:{getElementById:el},window:{open:()=>win}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../../QuanLyKho/WarehouseSlipForm.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 vm.runInContext(fs.readFileSync(file,'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 const api=vm.runInContext('AutoProductionSlip',ctx);
 return {api,el,get output(){return output;},get printed(){return printed;},get wordFile(){return wordFile;}};
}
const rows=[{'Số KHSX':'KH01','Tên nguyên vật liệu':'<img src=x>','Đvt':'kg','Số lượng':12.5,_slip:{accountingCode:'00123',recipe:'Bài A',lots:'LOT-A, LOT-B',manufactured:'2026-01-02, ',expires:'2027-01-02, 2027-02-03'}}];
test('slip renders accounting codes, both quantities, aligned lot dates and handwritten blanks',()=>{
 const {api,el}=setup();api.setData('KH01',rows,{recipient:'Nguyễn Văn A'},'');
 const html=el('autoProductionSlipPreview').innerHTML;
 a.ok(html.includes('PHIẾU XUẤT KHO'));a.ok(html.includes('Nguyễn Văn A'));a.ok(html.includes('00123'));a.ok(!html.includes('<img'));a.ok(html.includes('&lt;img'));a.ok(html.includes('data-slip-field="row0lot1field1"'));a.ok(html.includes('02/01/2026'));a.equal((html.match(/12,5/g)||[]).length,2);
 a.ok(html.includes('Tên kho'));a.ok(html.includes('BM-QT.KHO-01.05'));a.equal(el('autoProductionSlipCard').hidden,false);
 a.equal((html.match(/class="slip-lot-row"/g)||[]).length,2);a.ok(html.includes('colspan="3" class="slip-lot-group"'));
});
test('print uses edited fields, opens print dialog, and clears on all-plans selection',()=>{
 const state=setup();state.api.setData('KH01',rows,{recipient:'Người nhận'},'');
 state.api.edit({target:{dataset:{slipField:'address'},textContent:'Bộ phận A'}});state.api.edit({target:{dataset:{slipField:'location'},textContent:'Xưởng <A>'}});
 state.api.edit({target:{dataset:{slipField:'warehouseRow0'},textContent:'Kho 1'}});state.api.edit({target:{dataset:{slipField:'warehouse'},textContent:'Kho A'}});
 state.api.edit({target:{dataset:{slipField:'row0lot1field1'},textContent:'03/01/2026'}});
 state.api.print();a.equal(state.printed,1);a.ok(state.output.includes('Bộ phận A'));a.ok(state.output.includes('Xưởng &lt;A&gt;'));a.ok(state.output.includes('@page'));a.ok(state.output.includes('table-header-group'));
 a.ok(state.output.includes('onclick="window.print()"'));a.ok(state.output.includes('slip-print-toolbar'));
 a.ok(state.output.includes('Kho 1'));a.ok(state.output.includes('Kho A'));a.ok(!state.output.includes('contenteditable='));
 a.ok(state.output.includes('03/01/2026'));
 state.api.word();a.equal(state.wordFile.name,'phieu-xuat-kho_KH01.docx');a.ok(state.wordFile.body.includes('Kho 1'));a.ok(!state.wordFile.body.includes('contenteditable='));
 state.api.setData('',rows,{},'');a.equal(state.el('autoProductionSlipCard').hidden,true);state.api.print();a.equal(state.printed,1);
});
test('all page scripts parse together with the new print module',()=>{
 const root=path.join(__dirname,'../../QuanLyKho');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<\?!= HtmlService\.createHtmlOutputFromFile\('([^']+)'\)\.getContent\(\); \?>/g,(_,name)=>fs.readFileSync(path.join(root,name+'.html'),'utf8'));
 const scripts=Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g),match=>match[1]);
 a.ok(scripts.some(script=>script.includes('const AutoProductionSlip')));new vm.Script(scripts.join('\n'));
});
test('export slip date uses approval date for the selected plan and ignores empty drafts',()=>{
 const state=setup();state.api.setData('KH01',[{...rows[0],'Thời gian duyệt':'2026-10-28 08:30:00'}],{},'');
 state.api.edit({target:{dataset:{slipField:'date'},textContent:''}});state.api.print();a.ok(state.output.includes('Ngày 28 tháng 10 năm 2026'));
 state.api.setData('KH02',[{...rows[0],_slip:{...rows[0]._slip,approvalDate:'2026-10-27'}}],{},'');state.api.print();a.ok(state.output.includes('Ngày 27 tháng 10 năm 2026'));a.ok(!state.output.includes('Ngày 28 tháng 10 năm 2026'));
});
