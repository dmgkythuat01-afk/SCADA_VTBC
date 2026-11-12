const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('opening either pending or completed maintenance record always renders four-column result table',()=>{
 const source=fs.readFileSync('MobileQuanLyThietBi/appscript/PlannedMaintenanceClient.html','utf8');
 const funcs=source.slice(source.indexOf(' function resultTable('),source.indexOf(' function render('));
 for(const status of ['Nháp','Chờ xác nhận','Hoàn thành']) {
  const record={maPhieuBaoDuong:'PBD1',tenXuong:'Xưởng A',tenMay:'Máy A',trangThai:status,ngayThucHien:'2026-11-12',tenNguoiThucHien:'Kỹ thuật',nguoiXacNhan:'ca',tenNguoiXacNhan:'Trưởng ca',chiTiet:[{tenThietBi:'Téc 1',maThietBi:'T1',danhMucCanKiemTra:'Trục khuấy',thamSoCanKiemTra:'Phớt',ketQua:'TỐT'}],danhSachAnh:[]};
  const c={S:{data:{records:[record],user:{email:'ca'}},detail:'PBD1'},esc:v=>String(v??'').replaceAll('<','&lt;'),dates:v=>v};vm.createContext(c);vm.runInContext(funcs,c);
  const html=c.detail();assert.match(html,/<table class="pbd-result-table">/,status);assert.equal((html.match(/scope="col"/g)||[]).length,4,status);assert.match(html,/Phớt/);assert.match(html,/TỐT/);assert.ok(html.indexOf('pbd-document-heading')<html.indexOf('pbd-result-table'));
 }
});
