const fs=require('node:fs'),vm=require('node:vm');
const {setup:mobileSetup}=require('./mobile-work-fixture.cjs');
function setup(){
 const f=mobileSetup(),c=f.c;for(const n of ['PlannedMaintenanceDomain','PlannedMaintenanceStore','PlannedMaintenanceService','PlannedMaintenancePhotos','PlannedMaintenanceConfirmation','PlannedMaintenancePrint'])vm.runInContext(fs.readFileSync('QuanLyThietBi/admin/'+n+'.js','utf8'),c);
 const rows=[],criteria=[1,2,3].map(i=>{const row={tenXuong:'A',tenMay:'M',maThietBi:'TB'+i,tenThietBi:'Thiết bị '+i,danhMucCanKiemTra:'Trục',thamSoCanKiemTra:'Tham số '+i,boPhanDanhGia:'Cơ khí',loai:'Kiểm tra',tanSuatThamSo:'1 tháng',tanSuatDanhMuc:'',ngayLapDat:'2026-09-30',options:['TỐT','TRUNG BÌNH','KÉM'],version:'version'+i};row.key=c.pbdKey_(row);return row;});
 c.pbdGrid_=()=>({rows});let writes=0;c.pbdWrite_=(_,row)=>{writes++;const old=rows.findIndex(r=>r.maPhieuBaoDuong===row.maPhieuBaoDuong);if(old<0)rows.push(structuredClone(row));else rows[old]=structuredClone(row);};c.pbdCriteria_=()=>structuredClone(criteria);c.maintenanceToday_=()=> '2026-11-12';
 let seq=0;c.mobileWorkDocumentId_=prefix=>prefix+'12112026123456'+String(++seq).padStart(3,'0');
 const user={email:'worker',name:'Kỹ thuật',position:'KyThuat',role:'technical'};
 const payload=(extra={})=>({requestId:'req-'+(++seq),status:'Chờ xác nhận',reviewerId:'truongca',hygiene:'ĐẠT',operation:'KHÔNG ĐẠT',workshop:'A',machine:'M',performedDate:'2026-11-12',note:'Ghi chú',results:[{key:criteria[0].key,version:criteria[0].version,ketQua:'TỐT',ghiChu:'Đã kiểm tra'}],photos:[],...extra});
 return {...f,c,rows,criteria,user,payload,get writes(){return writes;}};
}

module.exports={setup};
