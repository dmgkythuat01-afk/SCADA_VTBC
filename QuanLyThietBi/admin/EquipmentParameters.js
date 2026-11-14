// Read-only lookup. Each column is its own list; blank cells do not pair rows.
function equipmentSystemParameters_(sheet) {
  sheet=sheet || adminWorkbook_().getSheetByName("ThamSoHeThong");
  if(!sheet)throw Error("Không tìm thấy sheet ThamSoHeThong.");
  const values=sheet.getDataRange().getValues(),headers=(values[0] || []).map(v=>String(v).trim()),result={};
  ["loai","tanSuatThamSo","chiTieu"].forEach(key=>{
    const positions=headers.map((h,i)=>h===(key==="tanSuatThamSo"?"tanSuat":key)?i:-1).filter(i=>i>=0);
    if(positions.length!==1)throw Error("ThamSoHeThong: thiếu hoặc trùng cột "+key+".");
    result[key]=[...new Set(values.slice(1).map(row=>String(row[positions[0]] ?? "").trim()).filter(Boolean))];
  });
  const types=headers.map((h,i)=>h==='loaiSoKHDB'?i:-1).filter(i=>i>=0);
  if(types.length>1)throw Error('ThamSoHeThong: trùng cột loaiSoKHDB.');
  if(types.length)result.loaiSoKHDB=[...new Set(values.slice(1).map(r=>String(r[types[0]]??'').trim()).filter(Boolean))];
  return result;
}
