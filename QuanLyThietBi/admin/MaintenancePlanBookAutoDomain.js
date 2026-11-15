function khbdEventIdentity_(r){return JSON.stringify(['tenXuong','tenMay','maThietBi','danhMucCanKiemTra','boPhanDanhGia'].map(k=>adminNorm_(r[k])));}
function khbdClassifyActions_(detail){const type=maintenanceNorm_(detail.loai);return type==='bao duong'?['maintain']:type==='thay moi'?['replace']:[];}
function khbdCompletedEvents_(records,classify){
  const events=new Map(),warnings=[];
  records.filter(r=>maintenanceNorm_(r.trangThai)==='hoan thanh').forEach(r=>{
    const day=String(r.ngayThucHien||'').trim();
    try{if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('date');maintenanceDate_(day);}catch{warnings.push('Phiếu '+r.maPhieuBaoDuong+' thiếu ngày thực hiện hợp lệ.');return;}
    let details;try{details=JSON.parse(r.chiTiet||'[]');if(!Array.isArray(details))throw Error('details');}catch{warnings.push('Phiếu '+r.maPhieuBaoDuong+' có chi tiết không hợp lệ.');return;}
    details.forEach(c=>{
      if(!c||!String(c.ketQua||'').trim())return;
      const item={tenXuong:c.tenXuong||r.tenXuong,tenMay:c.tenMay||r.tenMay,maThietBi:c.maThietBi,danhMucCanKiemTra:c.danhMucCanKiemTra,boPhanDanhGia:c.boPhanDanhGia||r.boPhanDanhGia};
      if(!item.maThietBi||!item.danhMucCanKiemTra||!item.boPhanDanhGia)return;
      if(adminNorm_(item.tenXuong)!==adminNorm_(r.tenXuong)||adminNorm_(item.tenMay)!==adminNorm_(r.tenMay))return;
      const identity=khbdEventIdentity_(item);
      classify(c).forEach(action=>{if(!['replace','maintain'].includes(action))throw Error('Loại công việc đồng bộ không hợp lệ.');events.set(JSON.stringify([identity,action,day]),{...item,identity,action,day,record:r.maPhieuBaoDuong});});
    });
  });
  return {events:[...events.values()],warnings};
}
function khbdAutoProjection_(selection,catalog,events){
  const values={},matches=new Map();
  catalog.groups.forEach(g=>g.devices.forEach(d=>d.categories.forEach(c=>{
    const identity=khbdEventIdentity_({tenXuong:selection.workshop,tenMay:g.machine,maThietBi:d.code,danhMucCanKiemTra:c.name,boPhanDanhGia:selection.department});
    c.actions.forEach(a=>{values[a.key]=Array(12).fill('');matches.set(JSON.stringify([identity,a.key.endsWith(':replace')?'replace':'maintain']),a.key);});
  })));
  const dates=new Map();
  events.filter(e=>Number(e.day.slice(0,4))===selection.year).forEach(e=>{const key=matches.get(JSON.stringify([e.identity,e.action]));if(!key)return;const month=Number(e.day.slice(5,7))-1,id=JSON.stringify([key,month]);if(!dates.has(id))dates.set(id,new Set());dates.get(id).add(e.day);});
  dates.forEach((days,id)=>{const [key,month]=JSON.parse(id);values[key][month]=[...days].sort().map(day=>day.split('-').reverse().join('/')).join('\n');});
  return values;
}
