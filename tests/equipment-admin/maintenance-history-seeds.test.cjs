const test=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./maintenance-plan-book.test.cjs');
test('configured dates seed exact past months and years, isolated by work type and without repeat dates',()=>{
 const f=fixture();Object.assign(f.source[0],{loaiSoKHDB:'Cả 2',ngayBaoDuongGanNhat:'15/10/2026',ngayThayMoiGanNhat:'2025-07-12'});
 const r=f.c.khbdAutoSyncSelection_(f.user,f.p),a=r.groups[0].devices[0].categories[0].actions;
 assert.equal(r.values[a.find(v=>v.name==='Bảo dưỡng').key][9],'15/10/2026');
 assert.equal(r.values[a.find(v=>v.name==='Thay mới').key].join(''),'');
 const old=f.c.khbdAutoSyncSelection_(f.user,{...f.p,year:2025});assert.equal(old.values[a.find(v=>v.name==='Thay mới').key][6],'12/07/2025');
 assert.equal(f.c.khbdAutoSyncSelection_(f.user,f.p).writes.updated,0);
 const saved=f.stored.find(r=>r.loaiBanGhi==='ChiTiet'&&r.nam==='2026'&&r.congViec==='Bảo dưỡng');assert.equal(saved.ngayLichSuBanDau,'2026-10-15');
});
test('completed same-month record replaces seed while another month keeps historical date',()=>{
 const f=fixture();f.source[0].ngayBaoDuongGanNhat='2026-10-01';
 const details=[{...f.source[0],loai:'Bảo dưỡng',ketQua:'TỐT'}];
 f.completed.push({maPhieuBaoDuong:'PBD1',trangThai:'Hoàn thành',ngayThucHien:'2026-11-12',tenXuong:'X',tenMay:'M1',chiTiet:JSON.stringify(details)});
 let r=f.c.khbdAutoSyncSelection_(f.user,f.p),key=r.groups[0].devices[0].categories[0].actions.find(v=>v.name==='Bảo dưỡng').key;
 assert.equal(r.values[key][9],'01/10/2026');assert.equal(r.values[key][10],'12/11/2026');
 f.completed.push({...f.completed[0],maPhieuBaoDuong:'PBD2',ngayThucHien:'2026-10-20'});r=f.c.khbdAutoSyncSelection_(f.user,f.p);assert.equal(r.values[key][9],'20/10/2026');
 assert.equal(f.stored.find(r=>r.loaiBanGhi==='ChiTiet'&&r.congViec==='Bảo dưỡng').ngayLichSuBanDau,'');
});
test('invalid and future historical dates never fabricate past work',()=>{
 const f=fixture();Object.assign(f.source[0],{ngayBaoDuongGanNhat:'2026-02-30',ngayThayMoiGanNhat:'2027-01-01'});const r=f.c.khbdAutoSyncSelection_(f.user,f.p);assert.ok(Object.values(r.values).every(months=>months.join('')===''));
});
