const test = require('node:test');
const a = require('node:assert/strict');
const {load} = require('./helpers.cjs');

function setup(initial) {
 const headers=['maNguyenLieu','MaKeToan','tenNguyenLieu','donVi','doViTinhToan','heSoQuyDoiKho','khoiLuongNhap','tonDauTuanQuyDoi','soNgayVeKho'];
 const rows=initial.map(r=>r.slice());
 const sheet={getLastRow:()=>rows.length+1,getRange:(start,col,count,width)=>({getValues:()=>rows.slice(start-2,start-2+count).map(r=>r.slice()),setValues:values=>values.forEach((r,i)=>{rows[start-2+i]=r.slice();})})};
 const ctx=load(['Code.js'],{LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},SpreadsheetApp:{flush(){}}});
 ctx.getSheet_=()=>sheet;ctx.getHeaders_=()=>headers;ctx.ghiNgayCapNhatTonKho_=()=>{};
 ctx.getTonThucTeMap_=()=>({map:{'nl|001':{maNguyenLieu:'NL',MaKeToan:'001',tenNguyenLieu:'Nguyên liệu',donVi:'kg',doViTinhToan:'kg',heSoQuyDoiKho:2,tongKhoiLuongNhap:12,tonThucTe:24}},invalidRows:[{maNguyenLieu:'MISSING'}]});
 return {ctx,rows};
}
test('weekly sync inserts missing material pair and is idempotent',()=>{
 const {ctx,rows}=setup([['OLD','009','Old','kg','kg',1,7,7,30]]);
 let result=ctx.capNhatTonKhoDauTuan();a.equal(result.addedCount,1);a.equal(result.invalidSourceCount,1);a.equal(rows.length,2);
 a.deepEqual(Array.from(rows[1]),['NL','001','Nguyên liệu','kg','kg',2,12,24,'']);a.equal(rows[0][6],7);
 result=ctx.capNhatTonKhoDauTuan();a.equal(result.addedCount,0);a.equal(result.updatedCount,1);a.equal(rows.length,2);
});
test('weekly sync can populate a header-only stock sheet',()=>{
 const {ctx,rows}=setup([]);const result=ctx.capNhatTonKhoDauTuan();a.equal(result.addedCount,1);a.equal(rows.length,1);a.equal(rows[0][7],24);
});
