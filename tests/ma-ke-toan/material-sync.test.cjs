const test=require('node:test');
const a=require('node:assert/strict');
const {load}=require('./helpers.cjs');
test('catalog maps supplier and manufacturer aliases for existing and new materials',()=>{
 const ctx=load(['Code.js','DongBoNguyenLieu.js']);
 const source=['tenNguyenLieu','MaKeToan','nhaCungCapCap','nhaCungCap1','nhaCungCap','nhaSanXuat'];
 const target=['tenNguyenLieu','MaKeToan','nhaCungCap','nhaSanXuat'];
 const result=ctx.buildNguyenLieuSync_(source,[['First','001','Vendor A','Maker A','Wrong','Wrong'],['Second','002','Vendor B','Maker B','Wrong','Wrong']],target,[['First','001','Old vendor','Old maker']]);
 a.deepEqual(Array.from(result.rows[0]),['First','001','Vendor A','Maker A']);
 a.deepEqual(Array.from(result.rows[1]),['Second','002','Vendor B','Maker B']);
 a.equal(result.updatedCount,1);a.equal(result.addedCount,1);
});
test('catalog sync updates shared columns, inserts by name/code, preserves destination dates',()=>{
 const ctx=load(['Code.js','DongBoNguyenLieu.js']);
 const result=ctx.buildNguyenLieuSync_(['maNguyenLieu','tenNguyenLieu','MaKeToan','tonAnToan','nhaCungCap1'],[['NEW','Material','001',20,'Vendor'],['B','Second','002',0,'Other']],['maNguyenLieu','MaKeToan','tenNguyenLieu','tonAnToan','NgayDongCong'],[['OLD','001','Material',5,'KEEP'],['C','003','Unchanged',7,'KEEP2']]);
 a.equal(result.updatedCount,1);a.equal(result.addedCount,1);a.equal(result.rows[0][0],'NEW');a.equal(result.rows[0][3],20);a.equal(result.rows[0][4],'KEEP');a.equal(result.rows[1][4],'KEEP2');a.deepEqual(Array.from(result.rows[2]),['B','002','Second',0,'']);
 const again=ctx.buildNguyenLieuSync_(['tenNguyenLieu','MaKeToan'],[['Material','001'],['Second','002']],['maNguyenLieu','MaKeToan','tenNguyenLieu','tonAnToan','NgayDongCong'],result.rows);a.equal(again.addedCount,0);a.equal(again.rows[0][3],20);
});
test('catalog sync skips missing names/codes and rejects duplicate source identity before writing',()=>{
 const ctx=load(['Code.js','DongBoNguyenLieu.js']);
 const headers=['tenNguyenLieu','MaKeToan'];
 a.equal(ctx.buildNguyenLieuSync_(headers,[['','001'],['Name','']],headers,[]).invalidSourceCount,2);
 a.throws(()=>ctx.buildNguyenLieuSync_(headers,[['Name','001'],['Name','001']],headers,[]),/Trùng/);
});
