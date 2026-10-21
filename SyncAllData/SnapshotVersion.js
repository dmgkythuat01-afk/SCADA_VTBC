/** Lấy phiên bản hiện tại của một sheet snapshot. */
function getSnapshotVersion_(sheetName) {
  const properties = PropertiesService.getScriptProperties();
  const key = SNAPSHOT_VERSION_PREFIX + sheetName;
  const rawValue = properties.getProperty(key);

  if (rawValue === null || rawValue === "") {
    properties.setProperty(key, "1");
    return 1;
  }

  const version = Number(rawValue);

  if (!Number.isFinite(version) || version < 1) {
    properties.setProperty(key, "1");
    return 1;
  }

  return Math.floor(version);
}

/**
 * Gọi hàm này sau khi Apps Script thay đổi dữ liệu của một sheet snapshot.
 * Ví dụ:
 *   sheet.getRange(...).setValues(values);
 *   markSnapshotChanged_("SanPham");
 */
function markSnapshotChanged_(sheetName) {
  const normalizedSheetName = normalizeText_(sheetName);

  if (!normalizedSheetName) {
    return 0;
  }

  const config = SQL_SYNC_SHEETS[normalizedSheetName];

  if (!config || config.mode !== "snapshot") {
    return 0;
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const properties = PropertiesService.getScriptProperties();
    const key = SNAPSHOT_VERSION_PREFIX + normalizedSheetName;
    const current = getSnapshotVersion_(normalizedSheetName);
    const nextVersion = current + 1;

    properties.setProperty(key, String(nextVersion));
    return nextVersion;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Tự chạy khi người dùng sửa trực tiếp trên giao diện Google Sheet.
 * Lưu ý: setValue/setValues/appendRow chạy từ Apps Script không kích hoạt onEdit.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) {
      return;
    }

    const sheet = e.range.getSheet();
    markSnapshotChanged_(sheet.getName());
  } catch (error) {
    console.error("onEdit snapshot version: " + errorMessage_(error));
  }
}

/**
 * Chạy khi người dùng thay đổi cấu trúc sheet như thêm/xóa dòng, cột hoặc sheet.
 * Cần tạo installable trigger nếu muốn sử dụng ổn định:
 * Triggers -> Add Trigger -> onChange -> From spreadsheet -> On change.
 */
function onChange(e) {
  try {
    if (!e) {
      return;
    }

    // Với thay đổi cấu trúc, tăng version toàn bộ snapshot để đảm bảo an toàn.
    Object.keys(SQL_SYNC_SHEETS).forEach(function (sheetName) {
      if (SQL_SYNC_SHEETS[sheetName].mode === "snapshot") {
        markSnapshotChanged_(sheetName);
      }
    });
  } catch (error) {
    console.error("onChange snapshot version: " + errorMessage_(error));
  }
}

/** Tăng version thủ công cho một sheet khi cần. */
function increaseSnapshotVersion(sheetName) {
  return markSnapshotChanged_(sheetName);
}
