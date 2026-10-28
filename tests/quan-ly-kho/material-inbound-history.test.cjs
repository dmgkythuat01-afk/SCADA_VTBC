const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'../../QuanLyKho');
function setup(){const ctx=vm.createContext({console});for(const name of ['Code.js','LichSuNhapNguyenLieuService.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx);return ctx;}
const headers=['ngayNhap','ngayPheDuyet','nhaCungCap','maNguyenLieu','MaKeToan','tenNguyenLieu','donVi','khoiLuongNhap','LotNo'];
test('inbound history uses receipt date and places accounting code after material code',()=>{
 const ctx=setup();const source={ngayNhap:'2026-10-28 08:00:00',ngayPheDuyet:'2026-10-29 10:00:00',nhaCungCap:'NCC',maNguyenLieu:'NL01',MaKeToan:'00123',tenNguyenLieu:'Nguyên liệu',donVi:'kg',khoiLuongNhap:0,LotNo:'LOT-01'};
 const result=ctx.buildMaterialInboundHistory_({headers,rows:[source,{...source,ngayNhap:'2026-10-29',ngayPheDuyet:'2026-10-28'},{...source,ngayNhap:'',ngayPheDuyet:'2026-10-28'}]},'2026-10-28','2026-10-28');
 a.equal(result.headers.length,10);a.equal(result.rows.length,1);a.equal(result.rows[0]['Tên NCC'],'NCC');a.equal(result.rows[0]['Thời gian tạo'],'2026-10-28 08:00:00');a.equal(result.rows[0]['Thời gian duyệt'],'2026-10-29 10:00:00');a.equal(result.rows[0]['Diễn giải'],'');a.equal(result.rows[0]['Số lượng'],0);a.equal(result.rows[0]['Lot No'],'LOT-01');
 a.equal(result.headers[result.headers.indexOf('Mã NLVT')+1],'Mã kế toán');a.equal(result.rows[0]['Mã kế toán'],'00123');
 a.throws(()=>ctx.buildMaterialInboundHistory_({headers:[],rows:[]},'2026-10-28','2026-10-28'),/thiếu cột/);
});
test('inbound API enforces inventory role and validates date range',()=>{
 const ctx=setup();let checked=false;ctx.requireInventoryRole_=()=>{checked=true;};
 for(const filter of [{fromDate:'2026-10-29',toDate:'2026-10-28'},{fromDate:'2026-02-30',toDate:'2026-03-01'}])a.throws(()=>ctx.getMaterialInboundHistory('token',filter),/Khoảng ngày/);
 a.ok(checked);
});
test('inbound card builds unique material options, filters instantly and exports filtered rows',()=>{
 const html=fs.readFileSync(path.join(root,'LichSuNhapNguyenLieu.html'),'utf8');
 const nodes=new Map();const el=id=>{if(!nodes.has(id))nodes.set(id,{value:'',disabled:false,style:{},options:[],querySelector:()=>null,replaceChildren(...items){this.options=items;},add(item){this.options.push(item);}});return nodes.get(id);};
 let success,fail,rendered,exported;
 const runner={withSuccessHandler(fn){success=fn;return this;},withFailureHandler(fn){fail=fn;return this;},getMaterialInboundHistory(){}};
 const ctx=vm.createContext({Intl,Date,sessionToken:'token',Option:function(text,value){this.text=text;this.value=value;},document:{getElementById:el,addEventListener:(name,fn)=>fn()},google:{script:{run:runner}},showMessage(){},renderGenericReportTable:(id,headers,rows)=>{rendered=rows;},exportRowsToExcel:(...args)=>{exported=args;}});
 vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 a.match(el('materialInboundFrom').value,/^\d{4}-\d{2}-\d{2}$/);a.equal(el('materialInboundFrom').value,el('materialInboundTo').value);
 vm.runInContext('MaterialInboundHistory.load()',ctx);
 const rows=[{'Mã NLVT':'NL01','Tên nguyên vật liệu':'One','Số lượng':2},{'Mã NLVT':'NL02','Tên nguyên vật liệu':'Two','Số lượng':3},{'Mã NLVT':'NL01','Tên nguyên vật liệu':'One','Số lượng':4}];
 success({success:true,headers:['Mã NLVT','Tên nguyên vật liệu','Số lượng'],rows});a.equal(el('materialInboundIngredient').options.length,3);a.equal(el('materialInboundIngredient').value,'');a.equal(rendered.length,3);
 el('materialInboundIngredient').value=el('materialInboundIngredient').options[1].value;vm.runInContext('MaterialInboundHistory.render()',ctx);a.equal(rendered.length,2);
 vm.runInContext('MaterialInboundHistory.download()',ctx);a.equal(exported[2].length,2);
 vm.runInContext('MaterialInboundHistory.load()',ctx);fail({message:'Error'});a.equal(rendered.length,0);a.equal(el('materialInboundExcel').disabled,true);a.equal(el('materialInboundIngredient').options.length,1);
});
