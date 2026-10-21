/** Các hàm test không có dấu _ cuối tên nên xuất hiện trong danh sách Run. */
function testPing() {
  Logger.log(JSON.stringify({
    success: true,
    version: SYNC_API_VERSION,
    message: "Apps Script V3 đang chạy.",
    serverTime: nowText_()
  }, null, 2));
}

function testGetSyncConfig() {
  Logger.log(JSON.stringify(getSyncConfig_(), null, 2));
}

function testSnapshotFirstRun() {
  const result = getSqlSyncData_({
    clientId: "TEST_SNAPSHOT_FIRST",
    maxRowsPerSheet: 20000,
    onlySheets: ["SanPham"],
    cursors: { SanPham: 1 },
    snapshotVersions: { SanPham: 0 }
  });

  Logger.log(JSON.stringify(result, null, 2));
}

function testSnapshotUnchanged() {
  const currentVersion = getSnapshotVersion_("SanPham");

  const result = getSqlSyncData_({
    clientId: "TEST_SNAPSHOT_UNCHANGED",
    maxRowsPerSheet: 20000,
    onlySheets: ["SanPham"],
    cursors: { SanPham: 1 },
    snapshotVersions: { SanPham: currentVersion }
  });

  Logger.log(JSON.stringify(result, null, 2));
}

function testAppendNoNewRows() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

  const result = getSqlSyncData_({
    clientId: "TEST_APPEND_NO_NEW_ROWS",
    maxRowsPerSheet: 5000,
    onlySheets: ["EpMangIn", "DongThung"],
    cursors: {
      EpMangIn: getLastRowSafe_(spreadsheet, "EpMangIn"),
      DongThung: getLastRowSafe_(spreadsheet, "DongThung")
    },
    snapshotVersions: {}
  });

  Logger.log(JSON.stringify(result, null, 2));
}

function testIncreaseSnapshotVersion() {
  const before = getSnapshotVersion_("SanPham");
  const after = markSnapshotChanged_("SanPham");

  Logger.log(JSON.stringify({
    sheetName: "SanPham",
    before: before,
    after: after
  }, null, 2));
}

function testShowSnapshotVersions() {
  const result = {};

  Object.keys(SQL_SYNC_SHEETS).forEach(function (sheetName) {
    if (SQL_SYNC_SHEETS[sheetName].mode === "snapshot") {
      result[sheetName] = getSnapshotVersion_(sheetName);
    }
  });

  Logger.log(JSON.stringify(result, null, 2));
}


function testNguyenLieuFullData() {
  const result = getSqlSyncData_({
    clientId: "TEST_NGUYEN_LIEU",
    maxRowsPerSheet: 20000,

    onlySheets: [
      "NguyenLieu"
    ],

    cursors: {
      NguyenLieu: 1
    },

    // 0 = bắt buộc đọc lại toàn bộ snapshot
    snapshotVersions: {
      NguyenLieu: 0
    }
  });

  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );
}

function forceRefreshNguyenLieuSnapshot() {
  const before =
    getSnapshotVersion_(
      "NguyenLieu"
    );

  const after =
    markSnapshotChanged_(
      "NguyenLieu"
    );

  Logger.log(
    JSON.stringify(
      {
        sheetName: "NguyenLieu",
        before: before,
        after: after
      },
      null,
      2
    )
  );
}
