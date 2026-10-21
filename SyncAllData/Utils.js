function validateToken_(token) {
  if (normalizeText_(token) !== API_TOKEN) {
    throw new Error("Token không hợp lệ.");
  }
}

function getRequestParam_(e, name) {
  if (!e || !e.parameter) return "";
  return normalizeText_(e.parameter[name]);
}

function parseJsonBody_(e) {
  const text = e && e.postData && e.postData.contents
    ? e.postData.contents
    : "{}";

  try {
    return JSON.parse(text || "{}");
  } catch (error) {
    throw new Error("Body JSON không hợp lệ: " + errorMessage_(error));
  }
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonErrorResponse_(error) {
  return jsonResponse_({
    success: false,
    version: SYNC_API_VERSION,
    message: errorMessage_(error),
    serverTime: nowText_()
  });
}

function nowText_() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd HH:mm:ss"
  );
}

function normalizeText_(value) {
  return value === null || value === undefined
    ? ""
    : String(value).trim();
}

function isPlainObject_(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeStringArray_(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map(normalizeText_)
    .filter(function (item) {
      return item !== "";
    });
}

function normalizeMaxRows_(value) {
  let number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    number = DEFAULT_MAX_ROWS_PER_SHEET;
  }

  return Math.min(number, HARD_MAX_ROWS_PER_SHEET);
}

function normalizeCursor_(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 ? number : 1;
}

function normalizeVersion_(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
}

function makeUniqueHeaders_(rawHeaders) {
  const used = {};

  return rawHeaders.map(function (value, index) {
    let header = normalizeText_(value);

    if (!header) {
      header = "Column" + (index + 1);
    }

    if (!used[header]) {
      used[header] = 1;
      return header;
    }

    used[header]++;
    return header + "_" + used[header];
  });
}

function isEmptyRow_(row) {
  return !row || row.every(function (value) {
    if (value instanceof Date) return false;

    return value === null ||
      value === undefined ||
      String(value).trim() === "";
  });
}

function formatJsonValue_(value) {
  if (value === null || value === undefined) return "";

  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd HH:mm:ss"
    );
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return String(value).trim();
}

function buildSheetError_(sheetName, mode, message) {
  return {
    success: false,
    sheetName: sheetName,
    mode: mode,
    unchanged: false,
    snapshotVersion: mode === "snapshot" ? getSnapshotVersion_(sheetName) : 0,
    message: message,
    headers: [],
    startRow: 0,
    endRow: 0,
    lastSheetRow: 0,
    nextCursor: 1,
    hasMore: false,
    rowCount: 0,
    rows: []
  };
}

function buildEmptySheetResult_(
  sheetName,
  mode,
  headers,
  nextCursor,
  lastRow,
  snapshotVersion
) {
  return {
    success: true,
    sheetName: sheetName,
    mode: mode,
    unchanged: false,
    snapshotVersion: snapshotVersion || 0,
    headers: headers,
    startRow: 0,
    endRow: 0,
    lastSheetRow: lastRow,
    nextCursor: nextCursor,
    hasMore: false,
    rowCount: 0,
    rows: [],
    message: "Sheet không có dữ liệu."
  };
}

function errorMessage_(error) {
  return error && error.message ? error.message : String(error);
}

function getLastRowSafe_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  return sheet ? Math.max(1, sheet.getLastRow()) : 1;
}
