/**
 * Body mẫu từ C#:
 * {
 *   "clientId": "TRUY_XUAT_01",
 *   "maxRowsPerSheet": 5000,
 *   "onlySheets": ["SanPham"],
 *   "cursors": { "SanPham": 1 },
 *   "snapshotVersions": { "SanPham": 1 }
 * }
 */
function getSqlSyncData_(body) {
  body = body || {};

  const startedAt = new Date();
  const clientId = normalizeText_(body.clientId) || "UNKNOWN_CLIENT";
  const cursors = isPlainObject_(body.cursors) ? body.cursors : {};
  const snapshotVersions = isPlainObject_(body.snapshotVersions)
    ? body.snapshotVersions
    : {};
  const onlySheets = normalizeStringArray_(body.onlySheets);
  const maxRowsPerSheet = normalizeMaxRows_(body.maxRowsPerSheet);
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const resultData = {};
  const warnings = [];

  Object.keys(SQL_SYNC_SHEETS).forEach(function (sheetName) {
    if (onlySheets.length > 0 && onlySheets.indexOf(sheetName) < 0) {
      return;
    }

    const config = SQL_SYNC_SHEETS[sheetName] || {};
    const mode = config.mode === "append" ? "append" : "snapshot";
    const sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      const message = "Không tìm thấy sheet: " + sheetName;
      warnings.push(message);
      resultData[sheetName] = buildSheetError_(sheetName, mode, message);
      return;
    }

    try {
      const cursor = normalizeCursor_(cursors[sheetName]);
      const clientSnapshotVersion = normalizeVersion_(snapshotVersions[sheetName]);

      resultData[sheetName] = readSheetForSqlSync_(
        sheet,
        config,
        cursor,
        maxRowsPerSheet,
        clientSnapshotVersion
      );
    } catch (error) {
      const message = errorMessage_(error);
      warnings.push("Lỗi sheet " + sheetName + ": " + message);
      resultData[sheetName] = buildSheetError_(sheetName, mode, message);
    }
  });

  return {
    success: true,
    action: "getSqlSyncData",
    version: SYNC_API_VERSION,
    clientId: clientId,
    serverTime: nowText_(),
    elapsedMs: new Date().getTime() - startedAt.getTime(),
    maxRowsPerSheet: maxRowsPerSheet,
    warnings: warnings,
    data: resultData
  };
}

function readSheetForSqlSync_(
  sheet,
  config,
  cursor,
  maxRowsPerSheet,
  clientSnapshotVersion
) {
  const sheetName = sheet.getName();
  const mode = config.mode === "append" ? "append" : "snapshot";
  const excludeFields = Array.isArray(config.excludeFields)
    ? config.excludeFields
    : [];

  // Kiểm tra version trước khi đọc header hoặc dữ liệu.
  // Khi version giống nhau, Apps Script không gọi getRange().getValues().
  if (mode === "snapshot") {
    const serverSnapshotVersion = getSnapshotVersion_(sheetName);

    if (
      clientSnapshotVersion > 0 &&
      clientSnapshotVersion === serverSnapshotVersion
    ) {
      return {
        success: true,
        sheetName: sheetName,
        mode: mode,
        unchanged: true,
        snapshotVersion: serverSnapshotVersion,
        headers: [],
        startRow: 0,
        endRow: 0,
        lastSheetRow: 0,
        nextCursor: cursor,
        hasMore: false,
        rowCount: 0,
        rows: [],
        message: "Snapshot không thay đổi."
      };
    }
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const serverSnapshotVersion = mode === "snapshot"
    ? getSnapshotVersion_(sheetName)
    : 0;

  if (lastColumn < 1) {
    return buildEmptySheetResult_(
      sheetName,
      mode,
      [],
      cursor,
      lastRow,
      serverSnapshotVersion
    );
  }

  const rawHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const headers = makeUniqueHeaders_(rawHeaders);
  const includedHeaders = headers.filter(function (header) {
    return header && excludeFields.indexOf(header) < 0;
  });

  if (lastRow < 2) {
    return buildEmptySheetResult_(
      sheetName,
      mode,
      includedHeaders,
      Math.max(cursor, lastRow),
      lastRow,
      serverSnapshotVersion
    );
  }

  const startRow = mode === "append" ? Math.max(2, cursor + 1) : 2;

  if (startRow > lastRow) {
    return {
      success: true,
      sheetName: sheetName,
      mode: mode,
      unchanged: false,
      snapshotVersion: serverSnapshotVersion,
      headers: includedHeaders,
      startRow: startRow,
      endRow: cursor,
      lastSheetRow: lastRow,
      nextCursor: cursor,
      hasMore: false,
      rowCount: 0,
      rows: [],
      message: "Không có dòng mới."
    };
  }

  const availableRows = lastRow - startRow + 1;
  const rowsToRead = Math.min(availableRows, maxRowsPerSheet);
  const endRow = startRow + rowsToRead - 1;
  const values = sheet
    .getRange(startRow, 1, rowsToRead, lastColumn)
    .getValues();
  const rows = [];

  for (let index = 0; index < values.length; index++) {
    const sourceRow = values[index];

    if (isEmptyRow_(sourceRow)) {
      continue;
    }

    const rowObject = {
      _rowNumber: startRow + index
    };

    for (let columnIndex = 0; columnIndex < headers.length; columnIndex++) {
      const header = headers[columnIndex];

      if (!header || excludeFields.indexOf(header) >= 0) {
        continue;
      }

      rowObject[header] = formatJsonValue_(sourceRow[columnIndex]);
    }

    rows.push(rowObject);
  }

  return {
    success: true,
    sheetName: sheetName,
    mode: mode,
    unchanged: false,
    snapshotVersion: serverSnapshotVersion,
    headers: includedHeaders,
    startRow: startRow,
    endRow: endRow,
    lastSheetRow: lastRow,
    nextCursor: mode === "append" ? endRow : lastRow,
    hasMore: endRow < lastRow,
    rowCount: rows.length,
    rows: rows,
    message: "Đọc dữ liệu thành công."
  };
}
