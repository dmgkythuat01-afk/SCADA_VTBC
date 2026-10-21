const {test}=require('node:test'),a=require('node:assert/strict'),{load}=require('./helpers.cjs');
function fixture(){return {today:'2026-10-21',params:{},headers:{bom:['MaKeToan1','MaKeToan2','MaKeToan3','SuDung0','SuDung1','SuDung2','SuDung3']},materials:[{maNguyenLieu:'NL',donVi:'kg'}],stocks:[{maNguyenLieu:'NL',MaKeToan:'001',tonDauTuanQuyDoi:500,doViTinhToan:'kg',trangThai:'Dat'}],plans:[{maSanPham:'SP',soLuongSKU:100,ngayDauTuan:'2026-10-19',trangThai:'Da duyet'}],bom:[{maDinhLuong:'B1',maSanPham:'SP',maNguyenLieu:'NL',MaKeToan:'001',MaKeToan1:'002',SuDung0:true,SuDung1:'TRUE',SuDung2:false,SuDung3:'',dinhLuong1SKU:2,haoHutPhanTram:5,donViDinhLuong:'kg',trangThai:'Dang dung'}],receipts:[],conversions:[],skuConversions:[]};}
const build=s=>load(['BaoCaoMaKeToanGs.js']).mktBuildInputs(s,{weeks:4});
test('one demand regardless of number of codes; preserves leading zeros',()=>{const r=build(fixture());a.equal(r.demands[0].quantity,210);a.equal(r.demands[0].choices.length,2);a.equal(r.stocks[0].code,'001');});
test('duplicate code best priority, distinct BOM rights retained',()=>{const s=fixture();s.bom[0].MaKeToan1='001';s.bom.push({...s.bom[0],maDinhLuong:'B2',MaKeToan:'003',SuDung1:false});const r=build(s);a.equal(r.demands.length,2);a.equal(r.demands[0].choices.length,1);a.equal(r.demands[0].choices[0].priority,0);a.equal(r.demands[1].choices[0].code,'003');});
test('duplicate BOM ID, missing columns, unknown conversion and negatives rejected',()=>{let s=fixture();s.bom.push({...s.bom[0]});a.throws(()=>build(s),/maDinhLuong/);s=fixture();s.headers.bom=[];a.throws(()=>build(s),/SuDung0/);s=fixture();s.bom[0].donViDinhLuong='g';a.throws(()=>build(s),/quy đổi/);s=fixture();s.stocks[0].tonDauTuanQuyDoi=-1;a.throws(()=>build(s));});
test('disabled choices retain demand, ISO year rollover',()=>{const s=fixture();s.today='2026-12-30';s.plans[0].ngayDauTuan='2026-12-28';s.bom[0].SuDung0=false;s.bom[0].SuDung1=false;const r=build(s);a.equal(r.demands[0].choices.length,0);a.equal(r.weeks[0].year,2026);a.equal(r.weeks[1].year,2027);a.equal(r.weeks[1].week,1);});
module.exports={fixture};
test('stock rows without material code do not abort report; excluded quantity is warned with source row',()=>{
 const s=fixture();s.stocks.push({__rowNumber:17,maNguyenLieu:' ',MaKeToan:'ORPHAN',tonDauTuanQuyDoi:5,doViTinhToan:'kg',trangThai:'Dat'});
 const r=build(s);a.equal(r.stocks.length,1);a.equal(r.demands[0].quantity,210);a.ok(r.warnings.some(w=>w.includes('TonKho')&&w.includes('17')&&w.includes('maNguyenLieu')));
});
test('missing material column is reported as schema error rather than excluding all stock',()=>{
 const s=fixture();s.headers.stocks=['MaKeToan','trangThai'];a.throws(()=>build(s),/TonKho.*maNguyenLieu/);
});
test('receipt inherits stock factor in its source target unit, then converts to canonical unit',()=>{
 const s=fixture();s.materials[0].donVi='g';s.stocks[0].tonDauTuanQuyDoi=1;s.stocks[0].heSoQuyDoiKho=1;s.bom[0].dinhLuong1SKU=0.02;s.bom[0].haoHutPhanTram=0;
 s.stocks.push({...s.stocks[0],MaKeToan:'000',doViTinhToan:'g',tonDauTuanQuyDoi:0});
 s.conversions=[{donViNguon:'kg',donViDich:'g',heSoQuyDoi:1000}];s.receipts=[{maNguyenLieu:'NL',MaKeToan:'001',donVi:'kg',soLuongVeDuKien:1,ngayDuKienVe:'2026-10-21',trangThai:'Dang ve'}];
 const r=build(s);a.equal(r.stocks.find(x=>x.code==='001').quantity,1000);a.equal(r.receipts[0].quantity,1000);a.equal(r.demands[0].quantity,2000);
});
test('receipt input unit changes do not inherit a factor for a different stock input unit',()=>{
 const s=fixture();s.stocks[0].donVi='bao';s.stocks[0].heSoQuyDoiKho=25;
 s.receipts=[{maNguyenLieu:'NL',MaKeToan:'001',donVi:'kg',soLuongVeDuKien:10,ngayDuKienVe:'2026-10-21',trangThai:'Dang ve'}];
 const r=build(s);a.equal(r.receipts[0].quantity,10);
});
test('legacy stock calculation unit keeps safety and order pack meaning',()=>{
 const s=fixture();s.materials[0].donVi='g';s.materials[0].tonAnToan=10;s.materials[0].quyCachDatHang=25;
 s.conversions=[{donViNguon:'kg',donViDich:'g',heSoQuyDoi:1000}];
 const r=build(s);a.equal(r.materialConfig.NL.unit,'kg');a.equal(r.materialConfig.NL.safety,10);a.equal(r.materialConfig.NL.pack,25);
});
test('one BOM code can identify multiple ingredient lines without merging demand',()=>{
 const s=fixture();s.bom.push({...s.bom[0],maNguyenLieu:'NL2',dinhLuong1SKU:3});s.materials.push({maNguyenLieu:'NL2',donVi:'kg'});
 const r=build(s);a.equal(r.demands.length,2);a.equal(r.demands.find(d=>d.material==='NL').quantity,210);a.equal(r.demands.find(d=>d.material==='NL2').quantity,315);
 a.notEqual(r.demands[0].id,r.demands[1].id);
 const reversed=build({...s,bom:[...s.bom].reverse()});a.equal(JSON.stringify(r.demands),JSON.stringify(reversed.demands));
});
test('same BOM ingredient with different permissions keeps separate rights',()=>{
 const s=fixture();s.bom.push({...s.bom[0],MaKeToan:'003',SuDung1:false});const r=build(s);
 a.equal(r.demands.length,2);a.ok(r.demands.some(d=>d.choices.length===1&&d.choices[0].code==='003'));
});
