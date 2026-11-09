// This cache lasts one locked API operation only. Every new operation rereads
// current accounts, catalogue and request rows, including direct Sheet edits.
function mobileWorkSpreadsheet_() {
  const context = mobileWorkGetContext_();
  if (!context.spreadsheet)
    context.spreadsheet = SpreadsheetApp.openById(ADMIN_SHEET_ID);
  return context.spreadsheet;
}
function mobileWorkSheet_(name, optional) {
  const context = mobileWorkGetContext_();
  if (!context.sheets.has(name))
    context.sheets.set(name, mobileWorkSpreadsheet_().getSheetByName(name));
  const sheet = context.sheets.get(name);
  if (!sheet && !optional) throw Error("Không tìm thấy sheet " + name + ".");
  return sheet;
}
function mobileWorkGrid_(name) {
  const context = mobileWorkGetContext_();
  if (!context.grids.has(name)) {
    const sheet = mobileWorkSheet_(name);
    context.grids.set(name, {
      sheet,
      values: sheet.getDataRange().getValues(),
    });
  }
  return context.grids.get(name);
}
function mobileWorkMappedRows_(name, keys) {
  const context = mobileWorkGetContext_();
  if (context.mappedRows.has(name)) return context.mappedRows.get(name);
  const grid = mobileWorkGrid_(name),
    headers = grid.values[0].map((v) => String(v).trim()),
    map = {};
  keys.forEach((key) => {
    const matches = headers
      .map((h, i) => (h === key ? i : -1))
      .filter((i) => i >= 0);
    if (matches.length !== 1)
      throw Error("Thiếu hoặc trùng cột " + key + " trong " + name);
    map[key] = matches[0];
  });
  const rows = grid.values
    .slice(1)
    .map((cells, i) => {
      const row = { _row: i + 2 };
      keys.forEach((key) => {
        const v = cells[map[key]];
        row[key] =
          v instanceof Date
            ? Utilities.formatDate(
                v,
                "Asia/Ho_Chi_Minh",
                ["ngayLapDat", "ngayThucHien", "ngayBaoCao"].includes(key)
                  ? "yyyy-MM-dd"
                  : "yyyy-MM-dd HH:mm:ss",
              )
            : String(v == null ? "" : v);
      });
      return row;
    })
    .filter((row) => keys.some((key) => row[key] !== ""));
  context.mappedRows.set(name, rows);
  return rows;
}
function mobileWorkCatalogRows_(name) {
  return mobileWorkMappedRows_(name, Object.keys(adminSpec_(name).columns));
}
function mobileWorkHistoryRows_(name) {
  return mobileWorkMappedRows_(name, MAINTENANCE_TABLES[name]).filter(
    (r) => r.maLichSu,
  );
}
function mobileWorkHistories_() {
  return [
    ...mobileWorkHistoryRows_("LichSuBaoDuong").map((r) => ({
      ...r,
      loai: "maintenance",
    })),
    ...mobileWorkHistoryRows_("LichSuSuaChua").map((r) => ({
      ...r,
      loai: "repair",
    })),
  ];
}
function mobileWorkSecret_() {
  const context = mobileWorkGetContext_();
  if (!context.secret) context.secret = adminSecret_();
  return context.secret;
}
function mobileWorkFlush_() {
  const context = mobileWorkGetContext_();
  if (context.dirty) {
    SpreadsheetApp.flush();
    context.dirty = false;
  }
}
