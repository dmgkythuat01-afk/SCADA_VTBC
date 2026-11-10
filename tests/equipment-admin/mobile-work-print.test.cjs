const {test} = require('node:test');
const assert = require('node:assert/strict');
const {setup} = require('./mobile-work-fixture.cjs');
test('print maps account fields without secrets; incomplete signatures remain blank', () => {
  const f=setup(), t=f.login('CongNhan'), r=f.create(t,'new_work');
  Object.assign(f.catalog.TaiKhoan[1], {chucVuTrongCongTy:'Công nhân',phongSanXuat:'Tổ 1'});
  Object.assign(f.catalog.TaiKhoan[3], {phongBan:'Cơ điện',phongSanXuat:'Tổ kỹ thuật'});
  const p=f.api(t,'printRequest',{requestId:r.id});
  assert.equal(p.creator.position,'Công nhân'); assert.equal(p.creator.production,'Tổ 1');
  assert.equal(p.assignee.department,'Cơ điện'); assert.equal(p.request.type,'new_work');
  assert.equal(p.signatures.handover,null); assert.equal(p.report,null);
  assert.ok(!JSON.stringify(p).includes('Test-password'));
  const other=f.login('PhongCongNghe');
  assert.throws(()=>f.api(other,'printRequest',{requestId:r.id}),/không được xem/);
});
test('signatures use actual shift leader and parallel PGD reviews for exact report round', () => {
  const f=setup(), t=f.login('CongNhan'), tech=f.login('CoKhi'), leader=f.login('TruongCa');
  const r=f.create(t), d=f.start(tech,r); f.submit(tech,d,{noiDungCaiTien:'Cải tiến',yKienDongGop:'Đóng góp'});
  f.review(leader,r,d); f.approveBoth(r,d);
  const p=f.api(t,'printRequest',{requestId:r.id});
  assert.equal(p.signatures.receiving.name,'CoKhi Người thử');
  assert.equal(p.signatures.handover.name,'TruongCa Người thử');
  assert.equal(p.signatures.safety.name,'PGDChatLuong Người thử');
  assert.equal(p.signatures.director.name,'PGDSanXuat Người thử');
  assert.equal(p.report.improvement,'Cải tiến');
  assert.throws(()=>f.api(t,'printRequest',{requestId:r.id,reportId:'wrong'}),/báo cáo/);
});
test('draft does not sign and photo links contain no auth tokens', () => {
  const f=setup(), t=f.login('TruongCa'), tech=f.login('KyThuat'), r=f.create(t), d=f.start(tech,r);
  f.tables.ServiceReports[0].photos=JSON.stringify([{id:'photo1',name:'Ảnh'}]);
  const p=f.api(tech,'printRequest',{requestId:r.id,reportId:d.id});
  assert.equal(p.signatures.receiving,null);
  assert.ok(p.photos[0].url.includes('photoId=photo1'));
  assert.ok(!p.photos[0].url.includes(tech));
  assert.throws(()=>f.api(t,'printRequest',{requestId:r.id,reportId:d.id}),/báo cáo/);
});
test('new remediation report never reuses signatures from a previous round', () => {
  const f=setup(), owner=f.login('CongNhan'), tech=f.login('KyThuat'), leader=f.login('TruongCa');
  const r=f.create(owner), first=f.start(tech,r); f.submit(tech,first); f.review(leader,r,first);
  f.api(f.login('PGDChatLuong'),'approve',{requestId:r.id,reportId:first.id,decision:'reject',reason:'Làm lại',reviewKey:'reject-first'});
  const current=f.api(tech,'snapshot').requests.find(x=>x.id===r.id);
  const next=f.start(tech,current); f.submit(tech,next);
  const p=f.api(owner,'printRequest',{requestId:r.id});
  assert.equal(p.report.id,next.id);
  assert.equal(p.signatures.handover,null); assert.equal(p.signatures.safety,null); assert.equal(p.signatures.director,null);
  assert.equal(p.signatures.receiving.name,'KyThuat Người thử');
});
