const test=require('node:test'),a=require('node:assert/strict');
const {load}=require('./helpers.cjs');
test('PO manufacturer options use every matching catalog row and preserve accounting codes as text',()=>{
 const ctx=load(['DonDatHangMaKeToanGs.js']);
 const result=ctx.buildDonHangMaKeToanOptions_(' Material ',['tenNguyenLieu','nhaSanXuat','MaKeToan'],[
 ['Material','Maker A','001'],['Material','Maker B','002'],['Material','Maker A','001'],
 ['Other','Maker C','003'],['Material','Maker D','004'],['Material','Maker E','005'],['Material','Maker A','009']
 ]);
 a.equal(result.length,4);a.equal(result[0].name,'Maker A');
 a.deepEqual(Array.from(result[0].codes),['001','009']);a.equal(result[3].name,'Maker E');
 a.throws(()=>ctx.buildDonHangMaKeToanOptions_('Material',['tenNguyenLieu'],[]),/nhaSanXuat/);
});
