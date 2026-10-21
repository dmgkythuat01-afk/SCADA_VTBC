/** Web App GET: ping và xem cấu hình đồng bộ. */
function doGet(e) {
  try {
    const action = getRequestParam_(e, "action") || "ping";
    validateToken_(getRequestParam_(e, "token"));

    if (action === "ping") {
      return jsonResponse_({
        success: true,
        action: "ping",
        version: SYNC_API_VERSION,
        message: "Google Sheet SQL Delta Sync API V3 đang hoạt động.",
        serverTime: nowText_()
      });
    }

    if (action === "getSyncConfig") {
      return jsonResponse_(getSyncConfig_());
    }

    return jsonResponse_({
      success: false,
      action: action,
      version: SYNC_API_VERSION,
      message: "Action GET không hợp lệ."
    });
  } catch (error) {
    return jsonErrorResponse_(error);
  }
}

/** Web App POST: C# gọi action=getSqlSyncData. */
function doPost(e) {
  try {
    const action = getRequestParam_(e, "action");
    validateToken_(getRequestParam_(e, "token"));
    const body = parseJsonBody_(e);

    if (action === "getSqlSyncData") {
      return jsonResponse_(getSqlSyncData_(body));
    }

    return jsonResponse_({
      success: false,
      action: action || "",
      version: SYNC_API_VERSION,
      message: "Action POST không hợp lệ."
    });
  } catch (error) {
    return jsonErrorResponse_(error);
  }
}

function getSyncConfig_() {
  const sheets = Object.keys(SQL_SYNC_SHEETS).map(function (sheetName) {
    const cfg = SQL_SYNC_SHEETS[sheetName] || {};
    const mode = cfg.mode === "append" ? "append" : "snapshot";

    return {
      sheetName: sheetName,
      mode: mode,
      snapshotVersion: mode === "snapshot" ? getSnapshotVersion_(sheetName) : 0,
      excludeFields: Array.isArray(cfg.excludeFields) ? cfg.excludeFields : []
    };
  });

  return {
    success: true,
    action: "getSyncConfig",
    version: SYNC_API_VERSION,
    count: sheets.length,
    serverTime: nowText_(),
    sheets: sheets
  };
}
