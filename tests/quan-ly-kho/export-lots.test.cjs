const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(){const ctx=vm.createContext({console});for(const file of ['Code.js','ExportLotSelectionGs.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../QuanLyKho',file),'utf8'),ctx);ctx.createExportLotLookup_=()=>({getLots:line=>ctx.getApprovedStockLotsForExport_(line.maNguyenLieu,line.tenNguyenLieu,line.MaKeToan)});return ctx;}
const lots=[{Id:'EARLY',rowNumber:2,khoiLuongNhap:5,qtyKg:5,donVi:'kg',LotNo:'L1',hanSuDung:'2026-12-01'},{Id:'LATE',rowNumber:3,khoiLuongNhap:20,qtyKg:20,donVi:'kg',LotNo:'L2',hanSuDung:'2027-01-01'}];
const line=(allocations,qty=8)=>({rowNumber:2,PhieuXuatId:'PX',KeHoachId:'KH',maNguyenLieu:'NL',tenNguyenLieu:'Name',MaKeToan:'001',donViCanXuat:'kg',khoiLuongCanXuat:qty,khoiLuongXuatThucTe:qty,allocations});
test('preview defaults to FEFO across multiple lines without reserving the same stock twice',()=>{
 const ctx=setup();ctx.getApprovedStockLotsForExport_=()=>lots;
 const groups=ctx.buildExportLotPreview_([{items:[line([],8),{...line([],8),rowNumber:3}]}]);
 a.deepEqual(Array.from(groups[0].items[0].allocations,x=>[x.id,x.quantity]),[['EARLY',5],['LATE',3]]);
 a.deepEqual(Array.from(groups[0].items[1].allocations,x=>[x.id,x.quantity]),[['LATE',8]]);
 a.equal(groups[0].items[0].lotOptions[1].LotNo,'L2');
});
test('explicit later-lot selection is honored with exact native-unit ledger',()=>{
 const ctx=setup();const result=ctx.validateExportLotSelections_([line([{id:'LATE',quantity:8}])],()=>lots);
 a.equal(result.lines[0].parts[0].id,'LATE');a.equal(result.lines[0].parts[0].nativeQty,8);
 a.equal(result.stock.get('LATE').remainingNative,12);a.equal(result.stock.has('EARLY'),false);
});
test('wrong lot, insufficient total, duplicate selection and shared-lot overdraw fail before writes',()=>{
 const ctx=setup();for(const lines of [
 [line([{id:'WRONG_ACCOUNTING_CODE',quantity:8}])], [line([{id:'LATE',quantity:7}])],
 [line([{id:'LATE',quantity:4},{id:'LATE',quantity:4}])],
 [line([{id:'EARLY',quantity:4}],4),{...line([{id:'EARLY',quantity:4}],4),rowNumber:3}]
 ])a.throws(()=>ctx.validateExportLotSelections_(lines,()=>lots));
});
test('stock unit conversion and snapshots reflect preceding deductions of the same lot',()=>{
 const ctx=setup();const provider=()=>[{...lots[0],donVi:'g',khoiLuongNhap:5000}];
 const result=ctx.validateExportLotSelections_([line([{id:'EARLY',quantity:2}],2),{...line([{id:'EARLY',quantity:1}],1),rowNumber:3}],provider);
 a.equal(result.stock.get('EARLY').remainingNative,2000);a.equal(result.lines[1].parts[0].beforeQty,3000);a.equal(result.lines[1].parts[0].nativeQty,1000);
});
module.exports={setup,lots,line};
test('ton stock retains the exact kg allocation instead of rounding up native deductions',()=>{
 const ctx=setup();const result=ctx.validateExportLotSelections_([line([{id:'T',quantity:1.2345}],1.2345)],()=>[{Id:'T',rowNumber:2,donVi:'tan',khoiLuongNhap:1,qtyKg:1000}]);
 a.equal(result.lines[0].parts[0].nativeQty,.0012345);a.equal(result.stock.get('T').remainingNative,.9987655);
});
