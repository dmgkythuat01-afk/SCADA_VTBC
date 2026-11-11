const {test}=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./mobile-work-fixture.cjs');
const columns=['tenXuong','tenMay','maThietBi','danhMucCanKiemTra','thamSoCanKiemTra','chiTieuDanhGia1','chiTieuDanhGia2','chiTieuDanhGia3'];
test('admin accepts the eight actual headers without the removed standard column',()=>{
 const f=setup(),headers=[...columns].reverse(),sheet={getLastColumn:()=>headers.length,getRange:()=>({getValues:()=>[headers]})};
 const {map}=f.c.adminHeader_('DanhMucCanKiemTra',sheet);
 assert.deepEqual(Object.keys(map).sort(),[...columns].sort());assert.equal(map.thamSoCanKiemTra,3);
});
test('mobile snapshots and draft versions include parameter and all three assessment criteria',()=>{
 const f=setup(),owner=f.login('TruongCa'),worker=f.login('KyThuat'),c=f.catalog.DanhMucCanKiemTra[0];
 delete c.thongSoTieuChuan;Object.assign(c,{thamSoCanKiemTra:'Nhiệt độ vỏ động cơ',chiTieuDanhGia1:'Dưới60°C',chiTieuDanhGia2:'Không rung',chiTieuDanhGia3:'Không ồn'});
 const original=f.c.maintenanceCriteriaVersion_([c]);
 for(const key of columns.slice(4)){const changed={...c,[key]:c[key]+' mới'};assert.notEqual(f.c.maintenanceCriteriaVersion_([changed]),original,key);}
 const r=f.create(owner),d=f.start(worker,r),snapshot=JSON.parse(d.criteriaSnapshot)[0];
 for(const key of columns.slice(4))assert.equal(snapshot[key],c[key]);
 assert.ok(JSON.parse(d.checklist)[0].includes('Không ồn'));
 c.chiTieuDanhGia3='Không có tiếng va đập';assert.throws(()=>f.submit(worker,d),/thay đổi/);
 const current=f.api(worker,'snapshot').requests.find(x=>x.id===r.id),refreshed=f.start(worker,current);
 assert.equal(JSON.parse(refreshed.criteriaSnapshot)[0].chiTieuDanhGia3,c.chiTieuDanhGia3);
 const submitted=f.submit(worker,refreshed);f.review(owner,r,submitted);f.approveBoth(r,submitted);
 const saved=JSON.parse(f.history.LichSuBaoDuong[0].chiTietKiemTra)[0];assert.equal(saved.thamSoCanKiemTra,c.thamSoCanKiemTra);assert.equal(saved.chiTieuDanhGia3,c.chiTieuDanhGia3);
});
test('historical snapshots retain old standards and explicit empty new parameter stays empty',()=>{
 const f=setup();assert.equal(f.c.equipmentCriterionSnapshot_({thongSoTieuChuan:'<60°C'}).thamSoCanKiemTra,'<60°C');
 assert.equal(f.c.equipmentCriterionSnapshot_({tieuChuan:'Cũ'}).thamSoCanKiemTra,'Cũ');
 assert.equal(f.c.equipmentCriterionSnapshot_({thamSoCanKiemTra:'',thongSoTieuChuan:'Cũ'}).thamSoCanKiemTra,'');
});
