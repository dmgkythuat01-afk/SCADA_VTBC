// Read-only lookup. Each column is its own list; blank cells do not pair rows.
function equipmentSystemParameters_(sheet) {
  sheet=sheet || SpreadsheetApp.openById(ADMIN_SHEET_ID).getSheetByName("ThamSoHeThong");
  if(!sheet)throw Error("Không tìm thấy sheet ThamSoHeThong.");
  const values=sheet.getDataRange().getValues(),headers=(values[0] || []).map(v=>String(v).trim()),result={};
  ["loai","tanSuat"].forEach(key=>{
    const positions=headers.map((h,i)=>h===key?i:-1).filter(i=>i>=0);
    if(positions.length!==1)throw Error("ThamSoHeThong: thiếu hoặc trùng cột "+key+".");
    result[key]=[...new Set(values.slice(1).map(row=>String(row[positions[0]] ?? "").trim()).filter(Boolean))];
  });
  return result;
}
