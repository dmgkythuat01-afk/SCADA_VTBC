const {test}=require('node:test'),a=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),zlib=require('node:zlib');
const {setup}=require('./planned-maintenance-fixture.cjs');
test('printing includes full machine department catalog with only recorded results checked; snapshots survive later edits',()=>{
 const f=setup(),r=f.c.pbdSave_(f.user,f.payload()),originalCount=f.criteria.length;
 f.criteria[1].thamSoCanKiemTra='ĐÃ SỬA';f.criteria.pop();
 const p=f.c.pbdPrintPayload_(f.user,{id:r.maPhieuBaoDuong});a.equal(p.department,'CƠ');a.equal(p.catalogSource,'snapshot');
 const rows=p.devices.flatMap(d=>d.categories.flatMap(g=>g.parameters));a.equal(rows.length,originalCount);a.equal(rows.filter(r=>r.result).length,1);a.equal(rows[0].result,'TỐT');a.equal(rows[1].parameter,'Tham số 2');a.equal(rows[1].result,'');
 a.equal(p.hygiene,'ĐẠT');a.equal(p.operation,'KHÔNG ĐẠT');a.ok(p.signatures.inspection.time);a.equal(p.signatures.production.time,'');
 f.c.pbdReview_({email:'truongca',name:'Trưởng ca'},{id:r.maPhieuBaoDuong,revision:r.phienBan,requestId:'accept',decision:'accept',note:''});a.ok(f.c.pbdPrintPayload_(f.user,{id:r.maPhieuBaoDuong}).signatures.production.time);
});
test('drafts and rejected reports never show production acceptance; legacy print falls back to current full catalog',()=>{
 const f=setup(),r=f.c.pbdSave_(f.user,f.payload({status:'Nháp'}));let p=f.c.pbdPrintPayload_(f.user,{id:r.maPhieuBaoDuong});a.equal(p.signatures.inspection.time,'');a.equal(p.signatures.production.time,'');
 a.throws(()=>f.c.pbdPrintPayload_({...f.user,email:'other'},{id:r.maPhieuBaoDuong}),/không được/);
 const submitted=f.c.pbdSave_(f.user,f.payload({id:r.maPhieuBaoDuong,revision:r.phienBan}));f.c.pbdReview_({email:'truongca',name:'Trưởng ca'},{id:r.maPhieuBaoDuong,revision:submitted.phienBan,requestId:'reject',decision:'reject',note:'Làm lại'});
 f.rows[0].danhMucIn='';p=f.c.pbdPrintPayload_(f.user,{id:r.maPhieuBaoDuong});a.equal(p.catalogSource,'current');a.equal(p.signatures.production.time,'');a.equal(p.devices.length,3);
});
test('two overall assessments and one department required for submission; electrical form label and no cross-department rows',()=>{
 const f=setup();for(const extras of [{hygiene:''},{operation:''},{hygiene:'Sai'}])a.throws(()=>f.c.pbdSave_(f.user,f.payload(extras)),/vệ sinh|hoạt động/);
 f.criteria[1].boPhanDanhGia='Điện';f.criteria[1].key=f.c.pbdKey_(f.criteria[1]);
 const electrical={key:f.criteria[1].key,version:f.criteria[1].version,ketQua:'TỐT'};
 a.throws(()=>f.c.pbdSave_(f.user,f.payload({results:[...f.payload().results,electrical]})),/tách thành hai/);
 const r=f.c.pbdSave_(f.user,f.payload({results:[electrical]})),p=f.c.pbdPrintPayload_(f.user,{id:r.maPhieuBaoDuong});a.equal(p.department,'ĐIỆN');a.equal(p.devices.length,1);a.equal(p.devices[0].code,'TB2');
});
test('large catalog snapshots compress and roundtrip rather than exceeding sheet cell size',()=>{
 const f=setup();f.c.Utilities.gzip=blob=>({getBytes:()=>Array.from(zlib.gzipSync(Buffer.from(blob.bytes)))});f.c.Utilities.ungzip=blob=>({getDataAsString:()=>zlib.gunzipSync(Buffer.from(blob.bytes)).toString('utf8')});
 const rows=Array.from({length:400},(_,i)=>({...f.criteria[0],key:'K'+i,thamSoCanKiemTra:'Tham số '+i})),packed=f.c.pbdPrintCatalogEncode_(rows);a.ok(packed.startsWith('gz:'));a.ok(packed.length<45000);a.equal(f.c.pbdPrintCatalogDecode_(packed).length,400);
});
test('print template contains full checkboxes, two assessments and conditional actual signatures',()=>{
 const f=setup(),r=f.c.pbdSave_(f.user,f.payload()),p=f.c.pbdPrintPayload_(f.user,{id:r.maPhieuBaoDuong}),c={window:{}};vm.createContext(c);const html=fs.readFileSync('MobileQuanLyThietBi/appscript/PlannedMaintenancePrint.html','utf8');vm.runInContext(html.replace(/^<script>\s*/,'').replace(/<\/script>\s*$/,''),c);
 const out=c.window.PlannedMaintenancePrint.html(p);a.match(out,/THIẾT BỊ ĐỊNH KỲ \(CƠ\)/);a.match(out,/BỘ PHẬN KIỂM TRA/);a.match(out,/BỘ PHẬN SẢN XUẤT/);a.match(out,/Đánh giá công tác vệ sinh/);a.match(out,/Đánh giá tình trạng hoạt động/);a.match(out,/Tham số 3/);
 a.equal((out.match(/class="checkbox"/g)||[]).length,13);a.equal((out.match(/class="checkbox"[^>]*>✓/g)||[]).length,3);a.equal((out.match(/Đã ký duyệt/g)||[]).length,0);
});
