const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {setup:mobileSetup}=require('./mobile-work-fixture.cjs');
function setup(){
 const f=mobileSetup(),c=f.c;for(const n of ['PlannedMaintenanceDomain','PlannedMaintenanceStore','PlannedMaintenanceService','PlannedMaintenancePhotos'])vm.runInContext(fs.readFileSync('QuanLyThietBi/admin/'+n+'.js','utf8'),c);
 const rows=[],criteria=[1,2,3].map(i=>{const row={tenXuong:'A',tenMay:'M',maThietBi:'TB'+i,tenThietBi:'Thiết bị '+i,danhMucCanKiemTra:'Trục',thamSoCanKiemTra:'Tham số '+i,boPhanDanhGia:'Cơ khí',loai:'Kiểm tra',tanSuatThamSo:'1 tháng',tanSuatDanhMuc:'',ngayLapDat:'2026-09-30',options:['TỐT','TRUNG BÌNH','KÉM'],version:'version'+i};row.key=c.pbdKey_(row);return row;});
 c.pbdGrid_=()=>({rows});let writes=0;c.pbdWrite_=(_,row)=>{writes++;const old=rows.findIndex(r=>r.maPhieuBaoDuong===row.maPhieuBaoDuong);if(old<0)rows.push(structuredClone(row));else rows[old]=structuredClone(row);};c.pbdCriteria_=()=>structuredClone(criteria);c.maintenanceToday_=()=> '2026-11-12';
 let seq=0;c.mobileWorkDocumentId_=prefix=>prefix+'12112026123456'+String(++seq).padStart(3,'0');
 const user={email:'worker',name:'Kỹ thuật',position:'KyThuat',role:'technical'};
 const payload=(extra={})=>({requestId:'req-'+(++seq),status:'Hoàn thành',workshop:'A',machine:'M',performedDate:'2026-11-12',note:'Ghi chú',results:[{key:criteria[0].key,version:criteria[0].version,ketQua:'TỐT',ghiChu:'Đã kiểm tra'}],photos:[],...extra});
 return {...f,c,rows,criteria,user,payload,get writes(){return writes;}};
}
test('partial completion saves one of many parameters, PBD ID allocated on save and replay does not write twice',()=>{
 const f=setup(),p=f.payload(),r=f.c.pbdSave_(f.user,p);a.match(r.maPhieuBaoDuong,/^PBD\d{17}$/);a.equal(r.chiTiet.length,1);a.equal(r.chiTiet[0].ketQua,'TỐT');a.equal(f.writes,1);
 a.equal(f.c.pbdSave_(f.user,p).maPhieuBaoDuong,r.maPhieuBaoDuong);a.equal(f.writes,1);a.throws(()=>f.c.pbdSave_(f.user,{...p,note:'Khác'}),/nội dung khác/);
 a.throws(()=>f.c.pbdSave_(f.user,f.payload({id:r.maPhieuBaoDuong,revision:r.phienBan})),/nháp/);
});
test('draft edit keeps same PBD ID, protects creator/revision, retries old creation after update and does not advance dates',()=>{
 const f=setup(),p=f.payload({status:'Nháp'}),r=f.c.pbdSave_(f.user,p);
 let projection=f.c.pbdProjection_(f.criteria,f.rows,'2026-11-12');a.equal(projection[0].ngayGanNhat,'');
 a.throws(()=>f.c.pbdSave_({...f.user,email:'other'},f.payload({id:r.maPhieuBaoDuong,revision:1})),/người tạo/);
 a.throws(()=>f.c.pbdSave_(f.user,f.payload({id:r.maPhieuBaoDuong,revision:0})),/thay đổi/);
 const final=f.c.pbdSave_(f.user,f.payload({id:r.maPhieuBaoDuong,revision:1}));a.equal(final.maPhieuBaoDuong,r.maPhieuBaoDuong);a.equal(f.rows.length,1);
 f.c.pbdSave_(f.user,p);a.equal(f.rows.length,1);a.equal(f.writes,2);
 projection=f.c.pbdProjection_(f.criteria,f.rows,'2026-11-12');a.equal(projection[0].ngayDenHan,'2026-12-12');a.equal(projection[1].ngayGanNhat,'');
});
test('invalid results, stale checklist, mixed machines, duplicate rows, forged photos and future dates reject without writes',()=>{
 const f=setup(),p=f.payload();
 for(const extra of [{results:[]},{results:[{...p.results[0],ketQua:'Sai'}]},{results:[{...p.results[0],version:'stale'}]},{results:[p.results[0],p.results[0]]},{machine:'Sai'},{performedDate:'2026-11-13'},{performedDate:'2026-02-30'},{photos:[{id:'forged',uploadKey:'x'}]}])a.throws(()=>f.c.pbdSave_(f.user,{...p,...extra}));
 a.throws(()=>f.c.pbdSave_({...f.user,position:'CongNhan'},p),/kỹ thuật/);a.equal(f.writes,0);
});
test('calendar frequency uses parameter before category fallback, clamps month/year, unknown baseline stays unknown and overdue remains red',()=>{
 const f=setup(),c=f.c;a.equal(c.pbdNext_('2026-01-31','1 tháng'),'2026-02-28');a.equal(c.pbdNext_('2024-02-29','1 năm'),'2025-02-28');a.equal(c.pbdNext_('2026-11-01','2 tuần'),'2026-11-15');
 const rows=[{...f.criteria[0],tanSuatThamSo:'',tanSuatDanhMuc:'7 ngày'},{...f.criteria[1],ngayLapDat:''},{...f.criteria[2],tanSuatThamSo:'không rõ'}],r=c.pbdProjection_(rows,[],'2026-11-12');
 a.equal(r[0].ngayDenHan,'2026-10-07');a.equal(r[0].trangThaiLich,'Quá hạn');a.equal(r[1].trangThaiLich,'Chưa có mốc thực hiện');a.equal(r[2].trangThaiLich,'Chưa có tần suất');
 const boundary=c.pbdProjection_([{...rows[0],ngayLapDat:'2026-11-19'}],[],'2026-11-12');a.equal(boundary[0].soNgayConLai,14);a.equal(boundary[0].trangThaiLich,'Sắp đến hạn');
});
test('API rejects missing session and snapshot hides other users drafts while preserving completed history',()=>{
 const f=setup();a.throws(()=>f.c.plannedMaintenanceApi('bad','snapshot'),/Phiên/);
 f.c.pbdSave_(f.user,f.payload({status:'Nháp'}));const other={...f.user,email:'second'};f.c.pbdSave_(other,f.payload());
 const snapshot=f.c.pbdSnapshot_(other);a.equal(snapshot.records.length,1);a.equal(snapshot.records[0].trangThai,'Hoàn thành');a.equal(snapshot.records[0].nhatKyLuu,undefined);
});
test('photo save only accepts attachments issued to actor or already in own draft',()=>{
 const f=setup();a.throws(()=>f.c.pbdResolvePhotos_(f.user,[{id:'wrong',uploadKey:'x'}],null),/Ảnh chờ/);
 const saved={danhSachAnh:JSON.stringify([{id:'photo1',name:'Ảnh'}])};a.equal(f.c.pbdResolvePhotos_(f.user,[{id:'photo1'}],saved)[0].id,'photo1');
 a.throws(()=>f.c.pbdResolvePhotos_(f.user,[{id:'photo1'},{id:'photo1'}],saved),/trùng/);
});
test('new client and server modules parse independently',()=>{
 const html=fs.readFileSync('MobileQuanLyThietBi/appscript/PlannedMaintenanceClient.html','utf8');new vm.Script(html.replace(/^<script>\s*/,'').replace(/<\/script>\s*$/,''));
});
test('authenticated technical API saves while requester cannot create maintenance records',()=>{
 const f=setup(),technical=f.login('KyThuat'),requester=f.login('CongNhan');
 a.throws(()=>f.c.plannedMaintenanceApi(requester,'save',f.payload()),/kỹ thuật/);
 const r=f.c.plannedMaintenanceApi(technical,'save',f.payload());a.match(r.maPhieuBaoDuong,/^PBD/);
 a.equal(f.c.plannedMaintenanceApi(requester,'snapshot').records.length,1);
});
test('storage writes one header-mapped row and preserves unrelated extra columns',()=>{
 const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('QuanLyThietBi/admin/PlannedMaintenanceStore.js','utf8'),c);
 const columns=Array.from(vm.runInContext('PBD_COLUMNS',c)),headers=['cotRieng',...columns.slice().reverse()],data=[headers,headers.map(k=>k==='cotRieng'?'KEEP':k==='maPhieuBaoDuong'?'PBD1':'')];let writes=0;
 const sheet={getDataRange:()=>({getValues:()=>data}),getLastRow:()=>data.length,getRange:(r,col,n,width)=>({getValues:()=>[data[r-1].slice(col-1,col-1+width)],setNumberFormat(){return this;},setValues(values){writes++;data[r-1]=values[0];return this;}})};
 c.ADMIN_SHEET_ID='test';c.SpreadsheetApp={openById:()=>({getSheetByName:()=>sheet}),flush(){}};
 const grid=c.pbdGrid_();a.equal(grid.rows[0].maPhieuBaoDuong,'PBD1');c.pbdWrite_(grid,{...grid.rows[0],ghiChu:'Nội dung',chiTiet:'[]'});a.equal(writes,1);a.equal(data[1][0],'KEEP');a.equal(data[1][headers.indexOf('ghiChu')],'Nội dung');
});
test('photo upload retries return same private file and reads require membership in saved record',()=>{
 const f=setup(),p={uploadKey:'photo-key',name:'Ảnh thử',dataUrl:'data:image/jpeg;base64,'+Buffer.from([255,216,255,217]).toString('base64')};
 const meta=f.c.pbdUpload_(f.user,p),again=f.c.pbdUpload_(f.user,p);a.equal(meta.id,again.id);a.equal(f.files.size,1);
 const saved=f.c.pbdSave_(f.user,f.payload({photos:[meta]}));
 a.match(f.c.pbdPhoto_(f.user,{id:saved.maPhieuBaoDuong,fileId:meta.id}).dataUrl,/^data:image\/jpeg;base64,/);
 a.throws(()=>f.c.pbdPhoto_(f.user,{id:saved.maPhieuBaoDuong,fileId:'other'}),/không thuộc/);
 a.throws(()=>f.c.pbdUpload_(f.user,{...p,uploadKey:'invalid',dataUrl:'data:image/jpeg;base64,YQ=='}),/không hợp lệ/);
});
