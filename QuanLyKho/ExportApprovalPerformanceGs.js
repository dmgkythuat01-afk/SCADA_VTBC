/** Per-request stock data only. Never reuse balances across requests. */
function createExportLotLookup_() {
  const sheet = getSheet_(SHEET_KHO_NGUYEN_LIEU);
  ensureKhoHeader_(sheet);
  const values = sheet.getDataRange().getValues();
  const snapshot = {sheet:sheet,values:values,idx:getKhoHeaderIndex_(values[0].map(normalizeText_))};
  const cache = new Map();
  snapshot.getLots = line => {
    const key = exportLotMaterialKey_(line);
    if (!cache.has(key)) cache.set(key,getApprovedStockLotsForExport_(line.maNguyenLieu,line.tenNguyenLieu,line.MaKeToan,snapshot));
    return cache.get(key);
  };
  snapshot.clear = () => cache.clear();
  return snapshot;
}

/** Write only changed cells; merge consecutive columns and rows without touching other cells. */
function writeExportApprovalCells_(sheet, changes, snapshotValues) {
  const rows = new Map(), spans = new Map();
  changes.forEach(change => {
    if (!rows.has(change.row)) rows.set(change.row,new Map());
    rows.get(change.row).set(change.column,change.value);
  });
  Array.from(rows.keys()).sort((a,b) => a-b).forEach(row => {
    const entries = Array.from(rows.get(row)).sort((a,b) => a[0]-b[0]);
    let index = 0;
    while (index < entries.length) {
      const column = entries[index][0], values = [entries[index++][1]];
      while (index < entries.length && entries[index][0] === column+values.length) values.push(entries[index++][1]);
      const key = column+':'+values.length;
      if (!spans.has(key)) spans.set(key,[]);
      spans.get(key).push({row:row,column:column,values:values});
    }
  });
  spans.forEach(parts => {
    let index = 0;
    while (index < parts.length) {
      const first = parts[index++], values = [first.values];
      while (index < parts.length && parts[index].row === first.row+values.length) values.push(parts[index++].values);
      sheet.getRange(first.row,first.column,values.length,first.values.length).setValues(values);
    }
  });
  if (snapshotValues) changes.forEach(change => {snapshotValues[change.row-1][change.column-1] = change.value;});
}
