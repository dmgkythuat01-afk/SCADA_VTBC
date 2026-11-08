const EQUIPMENT_SHEETS = {
  Assets: [
    "id",
    "type",
    "parentId",
    "name",
    "code",
    "purpose",
    "details",
    "checklist",
    "active",
    "updatedAt",
    "updatedBy",
    "revision",
  ],
  Schedules: [
    "id",
    "componentId",
    "name",
    "interval",
    "unit",
    "dueDate",
    "assignee",
    "checklist",
    "active",
    "updatedAt",
    "revision",
  ],
  Jobs: [
    "id",
    "componentId",
    "scheduleId",
    "type",
    "title",
    "description",
    "assignee",
    "status",
    "openedAt",
    "openedBy",
    "completedDate",
    "completedAt",
    "completedBy",
    "result",
    "photos",
    "requestId",
    "revision",
    "completionRequestId",
  ],
  Members: ["email", "name", "role", "active"],
  Devices: ["id", "email", "token", "updatedAt"],
  Notifications: [
    "id",
    "date",
    "kind",
    "recipient",
    "status",
    "message",
    "sentAt",
  ],
  Audit: ["id", "at", "email", "action", "entity", "details"],
  Settings: ["key", "value"],
};
function props_() {
  return PropertiesService.getScriptProperties();
}
function db_() {
  return SpreadsheetApp.openById(
    "1GyLKh_9gwPeAzTMuowR3OE8eYnSSnoMPMLnWcUYxpoI",
  );
}
function ensureStore_() {
  const ss = db_();
  Object.keys(EQUIPMENT_SHEETS).forEach((name) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, EQUIPMENT_SHEETS[name].length)
        .setValues([EQUIPMENT_SHEETS[name]])
        .setFontWeight("bold")
        .setBackground("#e1f1e9");
      sh.setFrozenRows(1);
    }
  });
}
function rows_(name) {
  const sh = db_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const h = EQUIPMENT_SHEETS[name];
  return sh
    .getRange(2, 1, sh.getLastRow() - 1, h.length)
    .getValues()
    .map((r, i) => {
      const o = { _row: i + 2 };
      h.forEach(
        (k, j) => (o[k] = r[j] instanceof Date ? r[j].toISOString() : r[j]),
      );
      return o;
    })
    .filter((o) => o[h[0]]);
}
function write_(name, obj) {
  const headers = EQUIPMENT_SHEETS[name],
    sh = db_().getSheetByName(name);
  if (sh.getLastColumn() < headers.length)
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  const values = headers.map((k) => (obj[k] === undefined ? "" : obj[k]));
  const range = sh.getRange(
    obj._row || sh.getLastRow() + 1,
    1,
    1,
    headers.length,
  );
  range.setNumberFormat("@");
  range.setValues([
    values.map((v) =>
      typeof v === "string" && /^[=+\-@]/.test(v) ? "'" + v : v,
    ),
  ]);
  return obj;
}
function id_() {
  return Utilities.getUuid();
}
function now_() {
  return new Date().toISOString();
}
function today_() {
  return Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd");
}
function enabled_(r) {
  return String(r.active) !== "false";
}
function audit_(user, action, entity, details) {
  write_("Audit", {
    id: id_(),
    at: now_(),
    email: user.email,
    action,
    entity,
    details: JSON.stringify(details || {}),
  });
}
function settings_() {
  const out = {};
  rows_("Settings").forEach((r) => (out[r.key] = r.value));
  return out;
}
function setting_(key, value) {
  const old = rows_("Settings").find((r) => r.key === key);
  write_("Settings", Object.assign(old || { key }, { value: String(value) }));
}
function parsed_(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch (e) {
    return fallback;
  }
}
function asset_(id) {
  const a = rows_("Assets").find((r) => r.id === id);
  if (!a) throw Error("Không tìm thấy thiết bị.");
  return a;
}
function checkRevision_(old, input) {
  if (old && Number(old.revision) !== Number(input.revision))
    throw Error("Dữ liệu đã thay đổi. Hãy tải lại trước khi lưu.");
}
