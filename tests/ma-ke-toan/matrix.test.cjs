const {test}=require('node:test'),a=require('node:assert/strict'),{load}=require('./helpers.cjs');
function source(){return {today:'2026-10-22',params:{soTuanGiuChoNguyenLieu:0},headers:{bom:['MaKeToan1','MaKeToan2','MaKeToan3','SuDung0','SuDung1','SuDung2','SuDung3']},materials:[{maNguyenLieu:'N',tenNguyenLieu:'Name',donVi:'kg'}],stocks:['A','B'].map(MaKeToan=>({maNguyenLieu:'N',tenNguyenLieu:'Name',MaKeToan,tonDauTuanQuyDoi:5,doViTinhToan:'kg',trangThai:'Dat'})),plans:[{maSanPham:'P',soLuongSKU:1,ngayDauTuan:'2026-10-19',trangThai:'Da duyet'}],bom:[{maDinhLuong:'BOM',maSanPham:'P',maNguyenLieu:'N',tenNguyenLieu:'Name',MaKeToan:'A',MaKeToan1:'B',SuDung0:true,SuDung1:true,dinhLuong1SKU:20,donViDinhLuong:'kg',trangThai:'Dang dung'}],receipts:[],conversions:[]};}
const build=s=>load(['PhanBoMaKeToan.js','BaoCaoMaKeToanGs.js','BaoCaoMaKeToanViewGs.js']).mktCreateReports_(s,{weeks:4});
test('matrix has one material row across accounting codes and horizontal weeks',()=>{const r=build(source());a.equal(r.matrix.rows.length,1);const row=r.matrix.rows[0];a.equal(row.code,'N');a.equal(row.name,'Name');a.equal(row.weeks['2026|43'].demand,20);a.equal(row.weeks['2026|43'].allocated,10);a.equal(row.proposed,10);a.equal(row.choices.length,2);a.equal(r.matrix.weeks.length,4);});
test('same code different names and same name different codes remain distinct without stock reuse',()=>{const s=source();s.materials.push({...s.materials[0],tenNguyenLieu:'Other'});s.materials.push({...s.materials[0],maNguyenLieu:'N2'});s.bom.push({...s.bom[0],tenNguyenLieu:'Other'});s.bom.push({...s.bom[0],maNguyenLieu:'N2'});const r=build(s);a.equal(r.matrix.rows.length,3);a.equal(r.matrix.rows.find(x=>x.code==='N'&&x.name==='Other').weeks['2026|43'].allocated,0);a.equal(r.matrix.rows.reduce((n,x)=>n+x.weeks['2026|43'].allocated,0),10);});
test('missing source name can only inherit a unique name, not mix ambiguous identities',()=>{const s=source();s.stocks[0].tenNguyenLieu='';a.equal(build(s).matrix.rows.length,1);s.materials.push({...s.materials[0],tenNguyenLieu:'Other'});a.throws(()=>build(s),/tên nguyên liệu/);});
test('live actual stock is grouped by material identity and never added to opening allocation',()=>{
 const s=source();s.actual=[{maNguyenLieu:'N',tenNguyenLieu:'Name',MaKeToan:'A',khoiLuongNhap:100,heSoQuyDoiKho:1,doViTinhToan:'kg'}];
 const row=build(s).matrix.rows[0];a.equal(row.actual,100);a.equal(row.opening,10);a.equal(row.weeks['2026|43'].allocated,10);
});
test('ambiguous display-only actual stock warns without blocking operational allocation',()=>{
 const s=source();s.materials.push({...s.materials[0],tenNguyenLieu:'Other'});
 s.actual=[{maNguyenLieu:'N',MaKeToan:'A',khoiLuongNhap:100,doViTinhToan:'kg'}];
 const r=build(s);a.equal(r.matrix.rows.find(x=>x.name==='Name').weeks['2026|43'].allocated,10);a.ok(r.matrix.rows.every(x=>x.actual===null));a.ok(r.warnings.some(x=>x.includes('tồn thực tế')));
});
test('report uses stock leadtime and legacy planning calendar, and shows cumulative signed shortage',()=>{
 const s=source();s.materials[0].soNgayVeKhoMacDinh=45;s.stocks.forEach(x=>x.soNgayVeKho=30);
 const r=build(s),row=r.matrix.rows[0];a.equal(row.leadtime,30);a.equal(row.orderDate,'2026-09-19');a.equal(row.needDate,'2026-10-19');
 a.equal(row.weeks['2026|43'].closing,-10);a.equal(row.weeks['2026|44'].closing,-10);a.equal(row.weeks['2026|43'].physicalClosing,0);
 a.equal(r.details[0].balances.reduce((n,x)=>n+x.quantity,0),0);
});
test('demand report groups by product and keeps each products own allowed priorities',()=>{
 const s=source();s.plans.push({...s.plans[0],maSanPham:'Q',tenSanPham:'Product Q'});s.bom.push({...s.bom[0],maSanPham:'Q',dinhLuong1SKU:8,MaKeToan:'B',SuDung1:false});
 const r=build(s);a.equal(r.matrix.rows.length,1);a.equal(r.matrix.products.length,2);
 const p=r.matrix.products.find(p=>p.code==='P').materials[0],q=r.matrix.products.find(p=>p.code==='Q').materials[0];
 a.equal(p.weeks['2026|43'].demand,20);a.equal(q.weeks['2026|43'].demand,8);a.equal(p.choices.map(c=>c.code).join(','),'A,B');a.equal(q.choices.map(c=>c.code).join(','),'B');a.equal(q.choices[0].priority,0);
 a.equal(r.matrix.rows[0].weeks['2026|43'].demand,28);
});
test('same product ingredient with differing permission variants remains distinguishable',()=>{
 const s=source();s.bom.push({...s.bom[0],MaKeToan:'B',SuDung1:false,dinhLuong1SKU:7});
 const p=build(s).matrix.products[0];a.equal(p.materials.length,2);a.notEqual(p.materials[0].variant,p.materials[1].variant);
 a.equal(p.materials.reduce((n,m)=>n+m.weeks['2026|43'].demand,0),27);
});
test('product title falls back to BOM name when plan has only product code',()=>{const s=source();s.bom[0].tenSanPham='Product from BOM';a.equal(build(s).matrix.products[0].name,'Product from BOM');});
test('report demand follows forecast year/week and all customers without production approval filter',()=>{
 const s=source();s.plans=[{maSanPham:'P',nam:2026,tuan:43,soLuongSKU:2,soLuongSKUThucHien:999,trangThai:'Draft',ngayDauTuan:'2030-01-07'},{maSanPham:'P',nam:'2026',tuan:'43',soLuongSKU:3,trangThai:''}];
 const r=build(s);a.equal(r.matrix.products.length,1);a.equal(r.matrix.products[0].materials[0].weeks['2026|43'].demand,100);
});
test('display stock conversion warnings are separated from material demand diagnostics',()=>{
 const s=source();s.actual=[{maNguyenLieu:'N',tenNguyenLieu:'Name',MaKeToan:'A',khoiLuongNhap:1,doViTinhToan:'cai'}];
 const r=build(s);a.ok(r.warnings.some(w=>w.includes('tồn thực tế')));a.ok(!r.demandWarnings.some(w=>w.includes('tồn thực tế')));a.equal(r.matrix.products.length,1);
});
test('new product demand matches unchanged legacy forecast report on the same weekly input',()=>{
 const s=source();s.plans=[{maSanPham:'P',nam:2026,tuan:43,soLuongSKU:2,trangThai:'Draft'},{maSanPham:'P',nam:2026,tuan:43,soLuongSKU:3,trangThai:''}];
 class FixedDate extends Date {constructor(...args){super(...(args.length?args:['2026-10-22T12:00:00Z']));}}
 const old=load(['Code.js','BaoCaoGs.js'],{Date:FixedDate});
 const tables={KeHoachBanHang:s.plans,DinhLuong:s.bom,TonKho:s.stocks,NguyenLieuVatTu:s.materials};
 old.getSheetObjects_=name=>tables[name]||[];old.getQuyDoiDonViMap_=()=>({});old.fmtDate_=d=>d.toISOString().slice(0,10);
 const legacy=old.getBaoCaoNhuCauNguyenLieu(4),modern=build(s);
 a.equal(legacy.products.length,modern.matrix.products.length);
 a.equal(legacy.products[0].materials[0].weeks['2026|43'],modern.matrix.products[0].materials[0].weeks['2026|43'].demand);
});
test('prefixed forecast controls are transformed exactly once',()=>{
 const fs=require('node:fs'),path=require('node:path');const ctx=load(['BaoCaoMaKeToanViewGs.js'],{HtmlService:{createHtmlOutputFromFile:f=>({getContent:()=>fs.readFileSync(path.join(__dirname,'../../UocLuongDatHang',f+'.html'),'utf8')})}});
 const markup=ctx.mktLegacyMarkup_();a.ok(markup.includes('id="mkt_forecastCustomerMultiOptions"'));a.ok(!markup.includes('mkt_mkt_'));
});
test('legacy shell keeps forecast controls, isolated IDs and event handlers',()=>{const fs=require('node:fs'),path=require('node:path');const ctx=load(['BaoCaoMaKeToanViewGs.js'],{HtmlService:{createHtmlOutputFromFile:f=>({getContent:()=>fs.readFileSync(path.join(__dirname,'../../UocLuongDatHang',f+'.html'),'utf8')})}});const html=ctx.mktLegacyMarkup_();a.ok(html.includes('mkt_forecastWeekCount'));a.ok(html.includes('mkt_orderRequestDisplayFilter'));a.ok(html.includes('MktLegacy.exportCurrentReportExcel()'));a.ok(!html.includes('id="forecastWeekCount"'));const script=ctx.mktLegacyScript_();new (require('node:vm').Script)(script.replace(/^<script>/,'').replace(/<\/script>$/,''));});
