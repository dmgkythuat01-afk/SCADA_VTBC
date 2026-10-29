const test=require('node:test'),a=require('node:assert/strict');
const {load}=require('./helpers.cjs');
test('PO lookup returns merged payment choices from XuatNhapKhau',()=>{
 const sheets={
  NguyenLieuVatTu:[['tenNguyenLieu','nhaSanXuat','MaKeToan'],['Material','Maker','001']],
  XuatNhapKhau:[['tenNguyenLieu','MaKeToan','phuongThucTTNCC1','phuongThucTTNCC2','phuongThucTTNCC3'],['Material','001','A','B','C'],['Material','002','D','E','F']]
 };
 const ctx=load(['DonDatHangMaKeToanGs.js'],{APP:{SHEETS:{NGUYEN_LIEU:'NguyenLieuVatTu'}},getSheet_:name=>({getDataRange:()=>({getDisplayValues:()=>sheets[name]})}),getThongTinXuatNhapKhauTheoNguyenLieu:()=>({ok:true,data:{tenNguyenLieu:'Material',phuongThucTTNCC1:'A'}})});
 const result=ctx.getThongTinDonHangMaKeToan('Material');
 a.deepEqual(Array.from(result.data.paymentOptions),['A','B','C','D','E','F']);a.equal(result.data.manufacturers[0].codes[0],'001');
});
test('payment choices include all six cells from matching material names across accounting codes',()=>{
 const ctx=load(['DonDatHangMaKeToanGs.js']);
 const headers=['tenNguyenLieu','MaKeToan','phuongThucTTNCC1','phuongThucTTNCC2','phuongThucTTNCC3'];
 const rows=[['Material','001','A','B','C'],['Material','002','D','E','F'],['Other','003','Wrong','',''],[' Material ','004',' A ','','G']];
 a.deepEqual(Array.from(ctx.buildDonHangPaymentOptions_('Material',headers,rows)),['A','B','C','D','E','F','G']);
});
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
